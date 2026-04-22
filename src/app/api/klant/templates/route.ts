import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return await verifyKlantSession(session.value);
}

// GET - Haal alle templates op
export async function GET() {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: templates, error } = await supabaseAdmin
    .from("dienst_templates")
    .select("*")
    .eq("klant_id", klant.id)
    .order("laatst_gebruikt_op", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "GET" });
    // console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
}

// POST - Maak nieuwe template
export async function POST(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    naam,
    beschrijving,
    functie,
    aantal_nodig,
    locatie,
    duur_uren,
    uurtarief,
    favoriet_medewerker_ids,
    notities,
  } = body;

  // Validatie
  if (!naam || !functie || !locatie || !aantal_nodig) {
    return NextResponse.json(
      { error: "Naam, functie, locatie en aantal_nodig zijn verplicht" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("dienst_templates")
    .insert({
      klant_id: klant.id,
      naam,
      beschrijving: beschrijving || null,
      functie,
      aantal_nodig,
      locatie,
      duur_uren: duur_uren || null,
      uurtarief: uurtarief || null,
      favoriet_medewerker_ids: favoriet_medewerker_ids || [],
      notities: notities || null,
    })
    .select()
    .single();

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "POST" });
    // console.error("Error creating template:", error);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true, template: data });
}

// PATCH - Update template of increment gebruik
export async function PATCH(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { template_id, increment_gebruik, ...updates } = body;

  if (!template_id) {
    return NextResponse.json({ error: "template_id is verplicht" }, { status: 400 });
  }

  // Als increment_gebruik, update stats
  if (increment_gebruik) {
    const { error } = await supabaseAdmin
      .from("dienst_templates")
      .update({
        aantal_keer_gebruikt: supabaseAdmin.rpc("increment", { row_id: template_id }),
        laatst_gebruikt_op: new Date().toISOString(),
      })
      .eq("id", template_id)
      .eq("klant_id", klant.id);

    if (error) {
      captureRouteError(error, { route: "/api/klant/templates", action: "PATCH" });
      // console.error("Error updating template usage:", error);
      return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // Anders, update velden
  const { error } = await supabaseAdmin
    .from("dienst_templates")
    .update(updates)
    .eq("id", template_id)
    .eq("klant_id", klant.id);

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "PATCH" });
    // console.error("Error updating template:", error);
    return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Verwijder template
export async function DELETE(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { template_id } = await request.json();

  if (!template_id) {
    return NextResponse.json({ error: "template_id is verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("dienst_templates")
    .delete()
    .eq("id", template_id)
    .eq("klant_id", klant.id);

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "DELETE" });
    // console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
