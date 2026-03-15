import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendNieuwBerichtEmail } from "@/lib/notifications";
import { berichtenPostSchema, validateAdminBody } from "@/lib/validations-admin";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized berichten access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  // Return templates if requested
  if (request.nextUrl.searchParams.get("templates") === "true") {
    const { data: templates } = await supabaseAdmin
      .from("bericht_templates")
      .select("id, naam, onderwerp, inhoud, categorie, created_at")
      .order("naam", { ascending: true })
      .limit(100);
    return NextResponse.json({ templates: templates || [] });
  }

  const { data } = await supabaseAdmin
    .from("berichten")
    .select("id, van_type, van_id, aan_type, aan_id, onderwerp, inhoud, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return NextResponse.json({ berichten: data || [] });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const validation = validateAdminBody(berichtenPostSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Save template
  if (body.action === "save_template") {
    const { naam, onderwerp, inhoud, categorie } = body;
    if (!naam || !inhoud) {
      return NextResponse.json({ error: "Naam en inhoud zijn verplicht" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("bericht_templates").insert({
      naam, onderwerp: onderwerp || null, inhoud, categorie: categorie || "algemeen",
    });
    if (error) return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Bulk send
  if (body.action === "bulk_send") {
    const { aan_ids, onderwerp, inhoud } = body;
    if (!aan_ids?.length || !inhoud?.trim()) {
      return NextResponse.json({ error: "Ontvangers en bericht zijn verplicht" }, { status: 400 });
    }

    const berichten = aan_ids.map((id: string) => ({
      van_type: "admin",
      van_id: email || "admin",
      aan_type: "medewerker",
      aan_id: id,
      onderwerp: onderwerp || null,
      inhoud: inhoud.trim(),
    }));

    const { error } = await supabaseAdmin.from("berichten").insert(berichten);
    if (error) {
      console.error("Bulk send error:", error);
      return NextResponse.json({ error: "Bulk versturen mislukt" }, { status: 500 });
    }

    // Send email notifications in batches
    const { data: medewerkerEmails } = await supabaseAdmin
      .from("medewerkers")
      .select("id, naam, email, notificatie_voorkeuren")
      .in("id", aan_ids);

    for (const m of medewerkerEmails || []) {
      if (m.email && m.notificatie_voorkeuren?.berichten !== false) {
        try {
          await sendNieuwBerichtEmail({
            ontvangerNaam: m.naam,
            ontvangerEmail: m.email,
            afzender: "TopTalent Admin",
            onderwerp: onderwerp || null,
            inhoud: inhoud.trim(),
          });
        } catch (err) {
          console.error(`Bulk email failed for ${m.id}:`, err);
        }
      }
    }

    return NextResponse.json({ success: true, sent: aan_ids.length });
  }

  // Single send (original)
  const { aan_id, onderwerp, inhoud } = body;
  if (!aan_id || !inhoud?.trim()) {
    return NextResponse.json({ error: "Medewerker en bericht zijn verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("berichten").insert({
    van_type: "admin",
    van_id: email || "admin",
    aan_type: "medewerker",
    aan_id,
    onderwerp: onderwerp || null,
    inhoud: inhoud.trim(),
  });

  if (error) {
    console.error("Error creating bericht:", error);
    return NextResponse.json({ error: "Kon bericht niet versturen" }, { status: 500 });
  }

  // Send email notification
  try {
    const { data: medewerker } = await supabaseAdmin
      .from("medewerkers")
      .select("naam, email, notificatie_voorkeuren")
      .eq("id", aan_id)
      .single();

    if (medewerker?.email && medewerker?.notificatie_voorkeuren?.berichten !== false) {
      await sendNieuwBerichtEmail({
        ontvangerNaam: medewerker.naam,
        ontvangerEmail: medewerker.email,
        afzender: "TopTalent Admin",
        onderwerp: onderwerp || null,
        inhoud: inhoud.trim(),
      });
    }
  } catch (emailError) {
    console.error("Error sending bericht notification:", emailError);
  }

  return NextResponse.json({ success: true });
}
