import { supabaseAdmin } from "@/lib/supabase";

/**
 * Waar staat de vaste weekbeschikbaarheid van een medewerker?
 *
 * Oorspronkelijk alleen in `inschrijvingen` (gekoppeld op e-mailadres). Medewerkers die de admin
 * rechtstreeks aanmaakt hebben geen inschrijving; voor hen staat het rooster op `medewerkers`
 * zelf (migratie 20261006_medewerker_beschikbaarheid.sql). Wie een inschrijving heeft, blijft
 * daar lezen en schrijven, zodat admin-schermen en de onboarding hetzelfde blijven zien.
 */

export type BeschikbaarheidVelden = {
  beschikbaarheid: unknown;
  beschikbaar_vanaf: string | null;
  max_uren_per_week: number | null;
};

export type Bron =
  | { soort: "inschrijving"; id: string; velden: BeschikbaarheidVelden }
  | { soort: "medewerker"; velden: BeschikbaarheidVelden }
  /** Geen inschrijving en de kolommen op medewerkers bestaan nog niet (migratie niet gedraaid). */
  | { soort: "geen" };

const VELDEN = "beschikbaarheid, beschikbaar_vanaf, max_uren_per_week";
const LEEG: BeschikbaarheidVelden = { beschikbaarheid: null, beschikbaar_vanaf: null, max_uren_per_week: null };

/** `ilike` zonder jokertekens: een e-mailadres met _ of % mag niet op andere adressen matchen. */
export function exactIlike(waarde: string): string {
  return waarde.replace(/[\\%_]/g, (t) => `\\${t}`);
}

export async function zoekBron(medewerker: { id: string; email: string }): Promise<{ bron: Bron; error: unknown }> {
  // 1. Inschrijving die expliciet aan deze medewerker gekoppeld is, anders op e-mailadres
  //    (hoofdletterongevoelig: inschrijvingen bewaren het adres zoals het is ingetypt).
  const gekoppeld = await supabaseAdmin
    .from("inschrijvingen")
    .select(`id, ${VELDEN}`)
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (gekoppeld.error) return { bron: { soort: "geen" }, error: gekoppeld.error };
  let inschrijving = gekoppeld.data?.[0];

  if (!inschrijving && medewerker.email) {
    const opMail = await supabaseAdmin
      .from("inschrijvingen")
      .select(`id, ${VELDEN}`)
      .ilike("email", exactIlike(medewerker.email.trim()))
      .order("created_at", { ascending: false })
      .limit(1);
    if (opMail.error) return { bron: { soort: "geen" }, error: opMail.error };
    inschrijving = opMail.data?.[0];
  }

  if (inschrijving) {
    const { id, ...velden } = inschrijving as BeschikbaarheidVelden & { id: string };
    return { bron: { soort: "inschrijving", id, velden }, error: null };
  }

  // 2. Geen inschrijving: het rooster staat op de medewerker zelf.
  const eigen = await supabaseAdmin.from("medewerkers").select(VELDEN).eq("id", medewerker.id).maybeSingle();
  if (eigen.error?.code === "42703") return { bron: { soort: "geen" }, error: null };
  if (eigen.error) return { bron: { soort: "geen" }, error: eigen.error };
  return { bron: { soort: "medewerker", velden: (eigen.data as BeschikbaarheidVelden | null) ?? LEEG }, error: null };
}

export async function schrijfBron(
  bron: Exclude<Bron, { soort: "geen" }>,
  medewerkerId: string,
  update: Partial<BeschikbaarheidVelden>,
): Promise<{ error: { code?: string; message?: string } | null }> {
  if (bron.soort === "inschrijving") {
    const { error } = await supabaseAdmin.from("inschrijvingen").update(update).eq("id", bron.id);
    return { error };
  }
  const { error } = await supabaseAdmin.from("medewerkers").update(update).eq("id", medewerkerId);
  return { error };
}

/**
 * Beschikbaarheid voor een lijst medewerkers (matching): inschrijving op e-mailadres
 * (hoofdletterongevoelig) of medewerker_id, anders het rooster op de medewerker zelf.
 */
export async function beschikbaarheidPerMedewerker(
  medewerkers: { id: string; email: string | null }[],
): Promise<Map<string, BeschikbaarheidVelden>> {
  const uit = new Map<string, BeschikbaarheidVelden>();
  if (medewerkers.length === 0) return uit;

  const emails = medewerkers.map((m) => m.email).filter((e): e is string => !!e);
  const [opMail, opId] = await Promise.all([
    emails.length > 0
      ? supabaseAdmin.from("inschrijvingen").select(`email, medewerker_id, ${VELDEN}`).in("email", emails)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from("inschrijvingen").select(`email, medewerker_id, ${VELDEN}`).in("medewerker_id", medewerkers.map((m) => m.id)),
  ]);
  const inschrijvingen = [...(opMail.data ?? []), ...(opId.data ?? [])];

  const perMail = new Map<string, BeschikbaarheidVelden>();
  const perId = new Map<string, BeschikbaarheidVelden>();
  for (const i of (inschrijvingen ?? []) as (BeschikbaarheidVelden & { email: string | null; medewerker_id: string | null })[]) {
    const { email, medewerker_id, ...velden } = i;
    if (medewerker_id) perId.set(medewerker_id, velden);
    if (email) perMail.set(email.trim().toLowerCase(), velden);
  }

  const zonder: string[] = [];
  for (const m of medewerkers) {
    const v = perId.get(m.id) ?? (m.email ? perMail.get(m.email.trim().toLowerCase()) : undefined);
    if (v) uit.set(m.id, v);
    else zonder.push(m.id);
  }

  if (zonder.length > 0) {
    const { data: eigen, error } = await supabaseAdmin.from("medewerkers").select(`id, ${VELDEN}`).in("id", zonder);
    if (!error) {
      for (const e of (eigen ?? []) as (BeschikbaarheidVelden & { id: string })[]) {
        const { id, ...velden } = e;
        if (velden.beschikbaarheid != null || velden.beschikbaar_vanaf != null) uit.set(id, velden);
      }
    }
  }
  return uit;
}
