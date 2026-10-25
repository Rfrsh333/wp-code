import { nlDatum, nlVandaag } from "@/lib/nl-tijd";
import { plusWerkdagen } from "@/lib/uitbetaling/regels";

/**
 * Termijn voor een ID-check die een mens moet bekijken (handmatige Didit-uitslag of een gevraagde
 * videocall): uiterlijk 2 werkdagen na binnenkomst (besluit Rachid 25-10-2026, DPIA O11). Werkdag =
 * ma t/m vr zonder Nederlandse feestdag. Pure regels, getest in tests/unit/id-check-termijn.spec.ts.
 */
export const ID_BEOORDELING_WERKDAGEN = 2;

/** Laatste dag (YYYY-MM-DD, NL) waarop een check die op `aangemaaktOp` binnenkwam bekeken moet zijn. */
export function idBeoordelingUiterlijk(aangemaaktOp: string): string | null {
  const moment = new Date(aangemaaktOp);
  if (Number.isNaN(moment.getTime())) return null;
  return plusWerkdagen(nlDatum(moment), ID_BEOORDELING_WERKDAGEN);
}

/** Is de termijn voorbij? Op de laatste dag zelf nog niet. */
export function idBeoordelingTeLaat(aangemaaktOp: string, vandaag: string = nlVandaag()): boolean {
  const uiterlijk = idBeoordelingUiterlijk(aangemaaktOp);
  return uiterlijk !== null && vandaag > uiterlijk;
}
