import { supabaseAdmin } from "@/lib/supabase";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";

/**
 * Zet `diensten.plekken_beschikbaar` opnieuw op basis van de werkelijke aanmeldingen.
 * Idempotent: veilig om na élke statuswijziging aan te roepen, ook naast de DB-trigger
 * uit migratie 20261001_portaal_sessies.sql. Vervangt alle losse +1/-1-updates.
 */
export async function herberekenPlekken(dienstId: string): Promise<void> {
  const rpc = await supabaseAdmin.rpc("herbereken_plekken", { p_dienst_id: dienstId });
  if (!rpc.error) return;

  // Fallback zolang de migratie nog niet gedraaid is.
  const { data: dienst } = await supabaseAdmin
    .from("diensten")
    .select("plekken_totaal, aantal_nodig")
    .eq("id", dienstId)
    .maybeSingle();
  if (!dienst) return;

  const { count } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id", { count: "exact", head: true })
    .eq("dienst_id", dienstId)
    .in("status", [...INGEPLAND_STATUSSEN]);

  const totaal = dienst.plekken_totaal ?? dienst.aantal_nodig ?? 1;
  await supabaseAdmin
    .from("diensten")
    .update({ plekken_beschikbaar: Math.max(0, totaal - (count ?? 0)) })
    .eq("id", dienstId);
}
