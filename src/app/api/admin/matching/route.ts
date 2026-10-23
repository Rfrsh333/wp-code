import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { findMatchesForDienst, inviteMedewerkersForDienst } from "@/lib/matching";
import { matchingPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { captureRouteError } from "@/lib/sentry-utils";
import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds } from "@/lib/demo";

/**
 * Demo-accounts (lib/demo.ts): bij een dienst van een echte klant nooit demo-medewerkers
 * voorstellen of uitnodigen, bij een dienst van een demo-klant alleen demo-medewerkers.
 * Gefilterd in de route (niet in lib/matching) om botsingen met PR #12 te voorkomen.
 */
async function wereldVanDienst(dienstId: string): Promise<{ demo: boolean; demoMedewerkers: ReadonlySet<string> }> {
  const [ids, { data: dienst }] = await Promise.all([
    haalDemoIds(),
    supabaseAdmin.from("diensten").select("klant_id").eq("id", dienstId).maybeSingle(),
  ]);
  const klantId = (dienst as { klant_id?: string | null } | null)?.klant_id ?? null;
  return { demo: !!klantId && ids.klanten.has(klantId), demoMedewerkers: ids.medewerkers };
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized matching access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const dienstId = request.nextUrl.searchParams.get("dienst_id");
  if (!dienstId) {
    return NextResponse.json({ error: "dienst_id is vereist" }, { status: 400 });
  }

  try {
    const [result, wereld] = await Promise.all([findMatchesForDienst(dienstId), wereldVanDienst(dienstId)]);
    const matches = result.matches.filter((m) => wereld.demoMedewerkers.has(m.medewerker.id) === wereld.demo);
    return NextResponse.json({ ...result, matches });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/matching", action: "GET" });
    // console.error("Matching error:", error);
    return NextResponse.json(
      { error: "Matching mislukt" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized matching invite attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rawBody = await request.json();
    const validation = validateAdminBody(matchingPostSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { dienst_id, medewerker_ids } = validation.data;

    const wereld = await wereldVanDienst(dienst_id);
    const toegestaan = medewerker_ids.filter((id) => wereld.demoMedewerkers.has(id) === wereld.demo);
    const result = await inviteMedewerkersForDienst(dienst_id, toegestaan);
    if (toegestaan.length < medewerker_ids.length) {
      result.errors.push(`${medewerker_ids.length - toegestaan.length} medewerker(s) overgeslagen: demo-accounts en echte diensten blijven gescheiden`);
    }
    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/matching", action: "POST" });
    // console.error("Invite error:", error);
    return NextResponse.json({ error: "Uitnodigen mislukt" }, { status: 500 });
  }
}
