import { haalDemoIds } from "@/lib/demo";
import { isDemoMedewerkerId } from "@/lib/demo-regels";
import { isDiditActief, isDiditActiefVoor } from "@/lib/id-check/config";

/**
 * Staat de ID-controle via Didit aan voor deze werknemer? Los van config.ts omdat dit de database
 * nodig heeft (demo-ids, kort gecachet). Zonder vlag of sleutels: meteen false, zonder query.
 */
export async function isDiditActiefVoorMedewerker(medewerkerId: string): Promise<boolean> {
  if (!isDiditActief()) return false;
  if (isDiditActiefVoor(false)) return true;
  return isDiditActiefVoor(isDemoMedewerkerId(await haalDemoIds(), medewerkerId));
}
