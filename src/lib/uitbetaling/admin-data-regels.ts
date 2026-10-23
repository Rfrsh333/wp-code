/**
 * Geld-velden in de generieke admin-route /api/admin/data (puur, getest in
 * tests/unit/uitbetaling-regels.spec.ts).
 *
 * Een klantfactuur op 'betaald' zetten of uren goedkeuren (goedgekeurd_at) maakt uren uitbetaalbaar
 * (stap 6 "Geld"). Via de generieke route mag dat alleen met een geld-rol (owner/finance), net als
 * via api/facturen/[id]/betaald. Wordt een factuur via deze route op 'betaald' gezet, dan vullen we
 * betaald_op (moment van markeren), zodat "betaald op" overal hetzelfde betekent.
 */
export function geldVeldenAdminData(
  table: string,
  data: Record<string, unknown> | null | undefined,
): { vereistGeldRol: boolean; data: Record<string, unknown> | null; optioneel: string[] } {
  if (!data || typeof data !== "object") return { vereistGeldRol: false, data: null, optioneel: [] };

  if (table === "facturen") {
    const raaktBetaald = data.status === "betaald" || "betaald_op" in data;
    if (data.status === "betaald" && !data.betaald_op) {
      return { vereistGeldRol: true, data: { ...data, betaald_op: new Date().toISOString() }, optioneel: ["betaald_op"] };
    }
    return { vereistGeldRol: raaktBetaald, data: null, optioneel: [] };
  }

  if (table === "uren_registraties") {
    return { vereistGeldRol: "goedgekeurd_at" in data, data: null, optioneel: [] };
  }

  return { vereistGeldRol: false, data: null, optioneel: [] };
}
