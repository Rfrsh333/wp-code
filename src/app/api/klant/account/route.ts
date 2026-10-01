import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { schoonProfielUpdate } from "@/lib/klant-portaal-regels";
import { captureRouteError } from "@/lib/sentry-utils";
import { isBearerRequest, zetKlantSessie } from "@/lib/klant-sessie-cookie";

const VELDEN_VOL = "id, bedrijfsnaam, contactpersoon, email, telefoon, adres, postcode, stad, kvk_nummer, btw_nummer";
const VELDEN_BASIS = "id, bedrijfsnaam, contactpersoon, email, telefoon";

/** Bedrijfsgegevens van de ingelogde klant (Instellingen-tab). */
export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let res = await supabaseAdmin.from("klanten").select(VELDEN_VOL).eq("id", klant.id).maybeSingle();
  // Adres-/KvK-kolommen komen uit supabase-migration-nl-compliance.sql; zonder die kolommen basisvelden.
  if (res.error?.code === "42703") {
    res = await supabaseAdmin.from("klanten").select(VELDEN_BASIS).eq("id", klant.id).maybeSingle();
  }
  if (res.error || !res.data) {
    if (res.error) captureRouteError(res.error, { route: "/api/klant/account", action: "GET" });
    return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
  }

  return NextResponse.json({ account: res.data });
}

/** Wijzig bedrijfsgegevens; alleen whitelist-velden (nooit status, e-mail, wachtwoord of id). */
export async function PATCH(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  const parsed = schoonProfielUpdate(body as Record<string, unknown>);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("klanten")
    .update(parsed.update)
    .eq("id", klant.id)
    .select("id, bedrijfsnaam, contactpersoon, email")
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      return NextResponse.json({ error: "Adres- en KvK-gegevens kunnen nog niet worden opgeslagen. Neem contact op met TopTalent." }, { status: 409 });
    }
    captureRouteError(error, { route: "/api/klant/account", action: "PATCH" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });

  // Contactpersoon staat in de sessie (begroeting, header): sessie vernieuwen bij een wijziging.
  let token: string | undefined;
  if ("contactpersoon" in parsed.update && data.contactpersoon !== klant.contactpersoon) {
    token = await zetKlantSessie(data, request);
  }

  return NextResponse.json({ success: true, ...(token && isBearerRequest(request) ? { token } : {}) });
}
