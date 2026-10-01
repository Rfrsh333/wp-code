import { supabaseAdmin } from "@/lib/supabase";
import {
  KLANT_NAW_BASIS,
  KLANT_NAW_VOL,
  maakKlantSnapshot,
  type FactuurKlantSnapshot,
  type KlantNawBron,
} from "@/lib/factuur-klant-snapshot";

/** Huidige klantgegevens als snapshot; zonder adres/KvK-kolommen alleen de basisvelden. */
export async function haalKlantSnapshot(klantId: string): Promise<FactuurKlantSnapshot | null> {
  let res = await supabaseAdmin.from("klanten").select(KLANT_NAW_VOL).eq("id", klantId).maybeSingle();
  if (res.error?.code === "42703") {
    res = await supabaseAdmin.from("klanten").select(KLANT_NAW_BASIS).eq("id", klantId).maybeSingle();
  }
  if (res.error || !res.data) return null;
  return maakKlantSnapshot(res.data as KlantNawBron);
}
