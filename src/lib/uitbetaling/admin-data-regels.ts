/**
 * Geld-velden in de generieke admin-route /api/admin/data (puur, getest in
 * tests/unit/uitbetaling-regels.spec.ts).
 *
 * Wat bepaalt of uren uitbetaalbaar zijn (stap 6 "Geld"): de status en goedkeuring van de uren, de
 * koppeling uren ↔ klantfactuur (factuur_regels) en de status van de klantfactuur. Wie die via de
 * generieke route wil wijzigen of invoegen, heeft een geld-rol nodig (owner/finance), net als bij
 * api/facturen/[id]/betaald. Wordt een factuur via een update op 'betaald' gezet, dan vullen we
 * betaald_op (moment van markeren), zodat "betaald op" overal hetzelfde betekent.
 */

const GELD_VELDEN: Record<string, readonly string[]> = {
  facturen: ["status", "betaald_op"],
  uren_registraties: ["status", "goedgekeurd_at"],
  factuur_regels: ["uren_registratie_id", "factuur_id"],
};

function raaktGeld(table: string, rij: unknown): boolean {
  const velden = GELD_VELDEN[table];
  if (!velden || !rij || typeof rij !== "object") return false;
  return velden.some((v) => v in (rij as Record<string, unknown>));
}

export function geldVeldenAdminData(
  table: string,
  data: unknown,
  action: string = "update",
): { vereistGeldRol: boolean; data: Record<string, unknown> | null; optioneel: string[] } {
  if (!data || typeof data !== "object") return { vereistGeldRol: false, data: null, optioneel: [] };
  const rijen = Array.isArray(data) ? data : [data];
  const vereistGeldRol = rijen.some((r) => raaktGeld(table, r));

  // Alleen bij een (bulk-)update van één object: 'betaald' krijgt betaald_op als die ontbreekt.
  if ((action === "update" || action === "bulk_update") && !Array.isArray(data) && table === "facturen") {
    const rij = data as Record<string, unknown>;
    if (rij.status === "betaald" && !rij.betaald_op) {
      return { vereistGeldRol: true, data: { ...rij, betaald_op: new Date().toISOString() }, optioneel: ["betaald_op"] };
    }
  }
  return { vereistGeldRol, data: null, optioneel: [] };
}
