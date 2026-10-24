import { haalDemoIds } from "@/lib/demo";
import { isDemoMedewerkerId } from "@/lib/demo-regels";
import { isDiditActief, isDiditActiefVoor } from "@/lib/id-check/config";
import { haalLaatsteIdCheck } from "@/lib/id-check/db";
import { idVervalActie, kopieNodig, type IdVervalActie } from "@/lib/id-check/controlerecord";

/**
 * Staat de ID-controle via Didit aan voor deze werknemer? Los van config.ts omdat dit de database
 * nodig heeft (demo-ids, kort gecachet). Zonder vlag of sleutels: meteen false, zonder query.
 */
export async function isDiditActiefVoorMedewerker(medewerkerId: string): Promise<boolean> {
  if (!isDiditActief()) return false;
  if (isDiditActiefVoor(false)) return true;
  return isDiditActiefVoor(isDemoMedewerkerId(await haalDemoIds(), medewerkerId));
}

/**
 * Wat deze werknemer moet doen als zijn ID-bewijs (bijna) verloopt (vervalmail, melding bij
 * aanmelden): opnieuw laten controleren (Didit of videocall) of een nieuw ID-bewijs uploaden
 * (functie uit, of kopie nodig volgens de Wav). Zonder Didit: meteen "upload", zonder query. Lukt het
 * opzoeken niet, dan wat voor de meeste werknemers geldt (Didit aan: opnieuw controleren).
 */
export async function idVervalActieVoorMedewerker(medewerkerId: string): Promise<IdVervalActie> {
  if (!isDiditActief()) return "upload";
  try {
    const diditActief = await isDiditActiefVoorMedewerker(medewerkerId);
    if (!diditActief) return "upload";
    const laatste = await haalLaatsteIdCheck(medewerkerId).catch(() => null);
    return idVervalActie({ diditActief, kopieNodig: kopieNodig(laatste) });
  } catch {
    return isDiditActiefVoor(false) ? "id_controle" : "upload";
  }
}
