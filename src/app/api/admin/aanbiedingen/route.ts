import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendShiftAanbiedingEmail } from "@/lib/notifications";
import { aanbiedingenPostSchema, validateAdminBody } from "@/lib/validations-admin";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized aanbiedingen access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dienst_id = searchParams.get("dienst_id");

  let query = supabaseAdmin
    .from("dienst_aanbiedingen")
    .select("id, dienst_id, medewerker_id, status, notitie, verlopen_at, aangeboden_at")
    .order("aangeboden_at", { ascending: false })
    .limit(500);

  if (dienst_id) {
    query = query.eq("dienst_id", dienst_id);
  }

  const { data } = await query;

  return NextResponse.json({ aanbiedingen: data || [] });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized aanbiedingen mutation by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rawBody = await request.json();
  const validation = validateAdminBody(aanbiedingenPostSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { dienst_id, medewerker_ids, notitie } = validation.data;

  const verlopen_at = new Date();
  verlopen_at.setHours(verlopen_at.getHours() + 48); // 48 uur om te reageren

  const records = medewerker_ids.map((medewerker_id: string) => ({
    dienst_id,
    medewerker_id,
    status: "aangeboden",
    notitie: notitie || null,
    verlopen_at: verlopen_at.toISOString(),
  }));

  const { error } = await supabaseAdmin.from("dienst_aanbiedingen").insert(records);

  if (error) {
    console.error("Error creating aanbiedingen:", error);
    return NextResponse.json({ error: "Kon aanbiedingen niet aanmaken" }, { status: 500 });
  }

  // Send email notifications to medewerkers
  try {
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("klant_naam, locatie, datum, start_tijd, eind_tijd, functie")
      .eq("id", dienst_id)
      .single();

    if (dienst) {
      const { data: medewerkersList } = await supabaseAdmin
        .from("medewerkers")
        .select("id, naam, email, notificatie_voorkeuren")
        .in("id", medewerker_ids);

      for (const m of medewerkersList || []) {
        if (m.email && m.notificatie_voorkeuren?.shift_aanbiedingen !== false) {
          await sendShiftAanbiedingEmail({
            medewerkerNaam: m.naam,
            medewerkerEmail: m.email,
            functie: dienst.functie,
            klantNaam: dienst.klant_naam,
            datum: dienst.datum,
            startTijd: dienst.start_tijd,
            eindTijd: dienst.eind_tijd,
            locatie: dienst.locatie,
            notitie,
          }).catch((e) => console.error(`Email to ${m.email} failed:`, e));
        }
      }
    }
  } catch (emailError) {
    console.error("Error sending aanbieding emails:", emailError);
  }

  return NextResponse.json({ success: true, count: records.length });
}
