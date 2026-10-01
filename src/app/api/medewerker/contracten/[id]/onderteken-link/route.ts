import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

/** Statussen waarin de medewerker nog moet tekenen (gelijk aan /api/contract/ondertekenen). */
const TE_ONDERTEKENEN = ["verzonden", "bekeken", "ondertekend_admin"];

/**
 * GET — geeft de ondertekenpagina voor een EIGEN contract terug.
 *
 * De knop 'Ondertekenen' linkte naar /api/contract/ondertekenen?contract_id=…, maar die route
 * kent alleen het token-mechanisme (de link uit de e-mail) en gaf altijd 'Ongeldige link'.
 * Hier zoekt de ingelogde medewerker het bestaande token van zijn eigen contract op; het
 * ondertekenen zelf blijft via de bestaande tokenpagina lopen.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: contract, error } = await supabaseAdmin
      .from("contracten")
      .select("id, status, onderteken_token, onderteken_token_verloopt_at")
      .eq("id", id)
      .eq("medewerker_id", medewerker.id)
      .maybeSingle();

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/contracten/[id]/onderteken-link", action: "GET" });
      return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
    }
    if (!contract) return NextResponse.json({ error: "Contract niet gevonden" }, { status: 404 });

    if (!TE_ONDERTEKENEN.includes(contract.status)) {
      return NextResponse.json({ error: "Dit contract hoeft niet (meer) door jou ondertekend te worden" }, { status: 400 });
    }

    const verlopen =
      !!contract.onderteken_token_verloopt_at && new Date(contract.onderteken_token_verloopt_at) < new Date();
    if (!contract.onderteken_token || verlopen) {
      return NextResponse.json(
        { error: "De ondertekenlink is verlopen. Stuur TopTalent een bericht, dan krijg je een nieuwe." },
        { status: 410 },
      );
    }

    return NextResponse.json(
      { url: `/contract/ondertekenen/${encodeURIComponent(contract.onderteken_token)}` },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/contracten/[id]/onderteken-link", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
