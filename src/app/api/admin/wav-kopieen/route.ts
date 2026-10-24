import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalWavKopieen, openWavKopie, WavKopieFout } from "@/lib/id-check/wav-kopieen";
import { leesOpenVerzoek, WAV_KOPIE_ROLLEN } from "@/lib/id-check/wav-kopieen-overzicht";

/**
 * Wav-kopieën van het ID en werk- of verblijfsvergunningen (werknemers van buiten de EER/Zwitserland,
 * Wet arbeid vreemdelingen): van verwijderde accounts (id_wav_kopieen, bewaarde_documenten) en van
 * bestaande accounts (medewerker_documenten). Alleen owner en operations. Alleen lezen: opruimen gaat
 * via de retentie-cron na bewaar_tot.
 *
 * GET  → 200 { migratie, ontbrekend, items: WavKopieItem[] }
 *        ontbrekend = migraties die nog niet gedraaid zijn (dan ontbreken de stukken uit die tabel).
 * POST { actie: "open", bron: "bewaard" | "bewaard_document" | "medewerker", id }
 *      → 200 { url } (5 minuten geldig; komt in de audit-log)
 *      → 400 invoer · 403 rol · 404 niet (meer) gevonden of geen Wav-kopie · 502 opslag · 503 migratie ontbreekt
 */

const GEEN_CACHE = { "Cache-Control": "private, no-store" };

async function wavKopieToegang(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return { fout: NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 }) };
  if (!hasRequiredAdminRole(role, WAV_KOPIE_ROLLEN)) {
    return { fout: NextResponse.json({ error: "Alleen de eigenaar of operations kan Wav-kopieën inzien" }, { status: 403 }) };
  }
  return { email: email ?? "admin", role };
}

function foutAntwoord(fout: unknown, actie: string) {
  if (fout instanceof WavKopieFout) return NextResponse.json({ error: fout.message }, { status: fout.status, headers: GEEN_CACHE });
  captureRouteError(fout, { route: "/api/admin/wav-kopieen", action: actie });
  return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500, headers: GEEN_CACHE });
}

export async function GET(request: NextRequest) {
  const t = await wavKopieToegang(request);
  if ("fout" in t) return t.fout;
  try {
    const { migratie, ontbrekend, items } = await haalWavKopieen();
    return NextResponse.json({ migratie, ontbrekend, items }, { headers: GEEN_CACHE });
  } catch (fout) {
    return foutAntwoord(fout, "GET");
  }
}

export async function POST(request: NextRequest) {
  const t = await wavKopieToegang(request);
  if ("fout" in t) return t.fout;
  const verzoek = leesOpenVerzoek(await request.json().catch(() => null));
  if (!verzoek) return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  try {
    const url = await openWavKopie({ ...verzoek, door: t.email, rol: t.role });
    return NextResponse.json({ url }, { headers: GEEN_CACHE });
  } catch (fout) {
    return foutAntwoord(fout, "OPEN");
  }
}
