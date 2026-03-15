import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (type === "vervangingen") {
    const { data: vervangingen } = await supabaseAdmin
      .from("dienst_vervangingen")
      .select("id, dienst_id, status, created_at, vervalt_op, medewerker:medewerkers!originele_medewerker_id(naam), dienst:diensten(datum, start_tijd, eind_tijd, locatie, functie, klant_naam)")
      .in("status", ["open", "aangeboden", "geaccepteerd"])
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ vervangingen: vervangingen || [] });
  }

  const { data: boetes } = await supabaseAdmin
    .from("boetes")
    .select("*, medewerker:medewerkers(naam, email), dienst:diensten(datum, locatie, functie, klant_naam)")
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ boetes: boetes || [] });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, medewerker_id, dienst_id, boete_id } = await request.json();

  if (action === "register_no_show") {
    if (!medewerker_id) {
      return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });
    }

    // Maak boete aan
    const { data: boete, error: boeteError } = await supabaseAdmin
      .from("boetes")
      .insert({
        medewerker_id,
        dienst_id: dienst_id || null,
        bedrag: 50.00,
        reden: "No-show",
        status: "openstaand",
      })
      .select("id")
      .single();

    if (boeteError) {
      return NextResponse.json({ error: "Kon boete niet aanmaken" }, { status: 500 });
    }

    // Pauzeer account
    await supabaseAdmin
      .from("medewerkers")
      .update({ status: "gepauzeerd" })
      .eq("id", medewerker_id);

    // Increment no_show_count
    const { data: mwData } = await supabaseAdmin
      .from("medewerkers")
      .select("no_show_count")
      .eq("id", medewerker_id)
      .single();

    await supabaseAdmin
      .from("medewerkers")
      .update({ no_show_count: (mwData?.no_show_count || 0) + 1 })
      .eq("id", medewerker_id);

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "register_no_show",
      targetTable: "boetes",
      targetId: boete?.id,
      summary: `No-show boete (€50) geregistreerd en account gepauzeerd`,
      metadata: { medewerker_id, dienst_id },
    });

    return NextResponse.json({ success: true, boete_id: boete?.id });
  }

  if (action === "mark_paid") {
    if (!boete_id) return NextResponse.json({ error: "boete_id is verplicht" }, { status: 400 });

    await supabaseAdmin
      .from("boetes")
      .update({ status: "betaald", afgehandeld_at: new Date().toISOString(), afgehandeld_door: email })
      .eq("id", boete_id);

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "mark_boete_paid",
      targetTable: "boetes",
      targetId: boete_id,
      summary: `Boete als betaald gemarkeerd`,
    });

    return NextResponse.json({ success: true });
  }

  if (action === "withdraw" || action === "kwijtschelden") {
    if (!boete_id) return NextResponse.json({ error: "boete_id is verplicht" }, { status: 400 });

    // Haal medewerker_id op voor account heractivering bij kwijtschelding
    const { data: boeteData } = await supabaseAdmin
      .from("boetes")
      .select("medewerker_id")
      .eq("id", boete_id)
      .single();

    await supabaseAdmin
      .from("boetes")
      .update({ status: "ingetrokken", afgehandeld_at: new Date().toISOString(), afgehandeld_door: email })
      .eq("id", boete_id);

    // Bij kwijtschelding: heractiveer account direct als geen andere openstaande boetes
    if (action === "kwijtschelden" && boeteData) {
      const { count } = await supabaseAdmin
        .from("boetes")
        .select("id", { count: "exact", head: true })
        .eq("medewerker_id", boeteData.medewerker_id)
        .eq("status", "openstaand");

      if (!count || count === 0) {
        await supabaseAdmin
          .from("medewerkers")
          .update({ status: "actief" })
          .eq("id", boeteData.medewerker_id)
          .eq("status", "gepauzeerd");
      }
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: action === "kwijtschelden" ? "kwijtschelden_boete" : "withdraw_boete",
      targetTable: "boetes",
      targetId: boete_id,
      summary: action === "kwijtschelden" ? `Boete kwijtgescholden + account heractiveerd` : `Boete ingetrokken`,
    });

    return NextResponse.json({ success: true });
  }

  if (action === "unpause_account") {
    if (!medewerker_id) return NextResponse.json({ error: "medewerker_id is verplicht" }, { status: 400 });

    // Check geen openstaande boetes
    const { count } = await supabaseAdmin
      .from("boetes")
      .select("id", { count: "exact", head: true })
      .eq("medewerker_id", medewerker_id)
      .eq("status", "openstaand");

    if (count && count > 0) {
      return NextResponse.json({ error: `Medewerker heeft nog ${count} openstaande boete(s). Handel deze eerst af.` }, { status: 400 });
    }

    await supabaseAdmin
      .from("medewerkers")
      .update({ status: "actief" })
      .eq("id", medewerker_id);

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "unpause_account",
      targetTable: "medewerkers",
      targetId: medewerker_id,
      summary: `Account weer geactiveerd`,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
