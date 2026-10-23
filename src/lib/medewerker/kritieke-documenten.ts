import { supabaseAdmin } from "@/lib/supabase";
import { KRITIEKE_DOCUMENTEN } from "@/lib/medewerker/dienst-regels";

export type KritiekDocument = {
  medewerker_id: string;
  document_type: string;
  expiry_date: string | null;
  uploaded_at: string | null;
  review_status?: string | null;
};

/**
 * ID-bewijzen, werkvergunningen en verblijfsvergunningen (alle versies) van deze medewerkers,
 * met reviewstatus. Gedeeld door `meldAan` en de admin-matching, zodat beide dezelfde
 * verloopregel toepassen (B10). Zonder kolom `review_status` (42703) zonder die kolom verder.
 */
export async function haalKritiekeDocumenten(medewerkerIds: string[]): Promise<Map<string, KritiekDocument[]>> {
  const perMedewerker = new Map<string, KritiekDocument[]>();
  if (medewerkerIds.length === 0) return perMedewerker;

  const query = (kolommen: string) =>
    supabaseAdmin
      .from("medewerker_documenten")
      .select(kolommen)
      .in("medewerker_id", medewerkerIds)
      .in("document_type", [...KRITIEKE_DOCUMENTEN])
      .order("uploaded_at", { ascending: false })
      .limit(1000);

  let { data, error } = await query("medewerker_id, document_type, expiry_date, uploaded_at, review_status");
  if (error?.code === "42703") ({ data, error } = await query("medewerker_id, document_type, expiry_date, uploaded_at"));

  for (const doc of ((data ?? []) as unknown as KritiekDocument[])) {
    const lijst = perMedewerker.get(doc.medewerker_id) ?? [];
    lijst.push(doc);
    perMedewerker.set(doc.medewerker_id, lijst);
  }
  return perMedewerker;
}
