// ============================================================================
// Arbeidstijdenwet + Alcoholwet + CAO Compliance Validaties
// ============================================================================

// Nederlandse feestdagen (vaste data + berekende Pasen-gerelateerde)
function getFeestdagen(jaar: number): string[] {
  // Vaste feestdagen
  const vast = [
    `${jaar}-01-01`, // Nieuwjaarsdag
    `${jaar}-04-27`, // Koningsdag
    `${jaar}-05-05`, // Bevrijdingsdag
    `${jaar}-12-25`, // Eerste Kerstdag
    `${jaar}-12-26`, // Tweede Kerstdag
  ];

  // Pasen berekenen (Gauss algoritme)
  const a = jaar % 19;
  const b = Math.floor(jaar / 100);
  const c = jaar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;

  const pasen = new Date(jaar, maand - 1, dag);
  const goedVrijdag = new Date(pasen);
  goedVrijdag.setDate(pasen.getDate() - 2);
  const tweedePaasdag = new Date(pasen);
  tweedePaasdag.setDate(pasen.getDate() + 1);
  const hemelvaartsdag = new Date(pasen);
  hemelvaartsdag.setDate(pasen.getDate() + 39);
  const tweedePinksterdag = new Date(pasen);
  tweedePinksterdag.setDate(pasen.getDate() + 50);

  const format = (d: Date) => d.toISOString().split("T")[0];

  return [
    ...vast,
    format(goedVrijdag),
    format(pasen),
    format(tweedePaasdag),
    format(hemelvaartsdag),
    format(tweedePinksterdag),
  ];
}

export function isFeestdag(datum: string): boolean {
  const jaar = new Date(datum).getFullYear();
  return getFeestdagen(jaar).includes(datum);
}

// ============================================================================
// C-10: Toeslagberekening (avond/nacht/weekend/feestdag)
// ============================================================================

export type ToeslagType = "avond" | "nacht" | "weekend" | "feestdag" | "geen";

export interface ToeslagBerekening {
  type: ToeslagType;
  percentage: number;
  reden: string;
}

export function berekenToeslag(
  datum: string,
  startTijd: string,
  eindTijd: string,
): ToeslagBerekening {
  const startUur = parseInt(startTijd.split(":")[0]);
  const eindUur = parseInt(eindTijd.split(":")[0]);
  const dag = new Date(datum + "T00:00:00").getDay(); // 0=zo, 6=za

  // Feestdag: hoogste toeslag
  if (isFeestdag(datum)) {
    return { type: "feestdag", percentage: 100, reden: `Feestdagtoeslag (${datum})` };
  }

  // Nachtwerk (00:00-06:00 of na 00:00)
  if (startUur >= 0 && startUur < 6) {
    return { type: "nacht", percentage: 50, reden: "Nachttoeslag (00:00-06:00)" };
  }
  if (eindUur >= 0 && eindUur < 6) {
    return { type: "nacht", percentage: 50, reden: "Nachttoeslag (eind na middernacht)" };
  }

  // Weekend (zaterdag/zondag)
  if (dag === 0) {
    return { type: "weekend", percentage: 50, reden: "Zondagtoeslag" };
  }
  if (dag === 6) {
    return { type: "weekend", percentage: 25, reden: "Zaterdagtoeslag" };
  }

  // Avondwerk (na 20:00)
  if (startUur >= 20 || eindUur >= 22) {
    return { type: "avond", percentage: 25, reden: "Avondtoeslag (na 20:00)" };
  }

  return { type: "geen", percentage: 0, reden: "" };
}

// ============================================================================
// C-11 + C-12: Leeftijdsvalidatie (Alcoholwet + Arbeidstijdenwet)
// ============================================================================

export interface LeeftijdsValidatie {
  toegestaan: boolean;
  reden?: string;
}

function berekenLeeftijd(geboortedatum: string, peilDatum: string): number {
  const geboorte = new Date(geboortedatum);
  const peil = new Date(peilDatum);
  let leeftijd = peil.getFullYear() - geboorte.getFullYear();
  const m = peil.getMonth() - geboorte.getMonth();
  if (m < 0 || (m === 0 && peil.getDate() < geboorte.getDate())) {
    leeftijd--;
  }
  return leeftijd;
}

export function valideerLeeftijdVoorDienst(
  geboortedatum: string,
  dienstDatum: string,
  functie: string,
  startTijd: string,
  eindTijd: string,
): LeeftijdsValidatie {
  const leeftijd = berekenLeeftijd(geboortedatum, dienstDatum);

  // C-11: Alcoholwet - bar/tap functies alleen >= 18
  const barFuncties = ["bar", "bartender", "barista", "tap"];
  if (barFuncties.includes(functie.toLowerCase()) && leeftijd < 18) {
    return {
      toegestaan: false,
      reden: `Medewerker is ${leeftijd} jaar. Bar/tap-functies zijn alleen toegestaan voor 18+ (Alcoholwet).`,
    };
  }

  // C-12: Nachtwerk-verbod voor < 18 jaar (na 23:00 of voor 06:00)
  if (leeftijd < 18) {
    const startUur = parseInt(startTijd.split(":")[0]);
    const eindUur = parseInt(eindTijd.split(":")[0]);
    const eindMin = parseInt(eindTijd.split(":")[1] || "0");

    if (eindUur >= 23 || (eindUur === 0 && eindMin > 0) || (startUur >= 0 && startUur < 6)) {
      return {
        toegestaan: false,
        reden: `Medewerker is ${leeftijd} jaar. Werken na 23:00 of voor 06:00 is verboden voor minderjarigen (Arbeidstijdenwet art. 5:3).`,
      };
    }
  }

  return { toegestaan: true };
}

// ============================================================================
// C-13: VSH-certificering check bij bar-functies
// ============================================================================

export function valideerVSHVoorFunctie(
  functie: string,
  heeftVSH: boolean,
): LeeftijdsValidatie {
  const barFuncties = ["bar", "bartender", "barista", "tap"];
  if (barFuncties.includes(functie.toLowerCase()) && !heeftVSH) {
    return {
      toegestaan: false,
      reden: "Bar/tap-functies vereisen een Verklaring Sociale Hygiëne (VSH). Medewerker heeft geen geldig VSH-certificaat.",
    };
  }
  return { toegestaan: true };
}

// ============================================================================
// C-14: Maximale werktijd-validatie
// ============================================================================

export interface WerktijdValidatie {
  geldig: boolean;
  waarschuwing?: string;
}

export function valideerDienstDuur(
  startTijd: string,
  eindTijd: string,
  pauzeMinuten: number = 0,
): WerktijdValidatie {
  const [startU, startM] = startTijd.split(":").map(Number);
  const [eindU, eindM] = eindTijd.split(":").map(Number);

  let dienstMinuten = (eindU * 60 + eindM) - (startU * 60 + startM);
  if (dienstMinuten <= 0) dienstMinuten += 24 * 60; // Over middernacht

  const nettoMinuten = dienstMinuten - pauzeMinuten;
  const nettoUren = nettoMinuten / 60;

  // Max 12 uur per dienst
  if (nettoUren > 12) {
    return {
      geldig: false,
      waarschuwing: `Dienst duurt ${nettoUren.toFixed(1)} uur netto. Maximum is 12 uur per dienst (Arbeidstijdenwet).`,
    };
  }

  return { geldig: true };
}

export function valideerWeekuren(
  totaalUrenDezeWeek: number,
  extraUren: number,
): WerktijdValidatie {
  const nieuwTotaal = totaalUrenDezeWeek + extraUren;

  // Max 60 uur per week
  if (nieuwTotaal > 60) {
    return {
      geldig: false,
      waarschuwing: `Totaal ${nieuwTotaal.toFixed(1)} uur deze week. Maximum is 60 uur per week (Arbeidstijdenwet).`,
    };
  }

  // Waarschuwing bij > 48 uur (gemiddelde over 16 weken)
  if (nieuwTotaal > 48) {
    return {
      geldig: true,
      waarschuwing: `${nieuwTotaal.toFixed(1)} uur deze week. Let op: gemiddeld max 48 uur per week over 16 weken.`,
    };
  }

  return { geldig: true };
}

// ============================================================================
// C-15: Pauze-validatie
// ============================================================================

export function valideerPauze(
  startTijd: string,
  eindTijd: string,
  pauzeMinuten: number,
): WerktijdValidatie {
  const [startU, startM] = startTijd.split(":").map(Number);
  const [eindU, eindM] = eindTijd.split(":").map(Number);

  let dienstMinuten = (eindU * 60 + eindM) - (startU * 60 + startM);
  if (dienstMinuten <= 0) dienstMinuten += 24 * 60;

  const dienstUren = dienstMinuten / 60;

  // > 5,5 uur = minimaal 30 minuten pauze
  if (dienstUren > 5.5 && pauzeMinuten < 30) {
    return {
      geldig: false,
      waarschuwing: `Bij een dienst van ${dienstUren.toFixed(1)} uur is minimaal 30 minuten pauze verplicht (Arbeidstijdenwet). Huidige pauze: ${pauzeMinuten} minuten.`,
    };
  }

  // > 10 uur = minimaal 45 minuten pauze
  if (dienstUren > 10 && pauzeMinuten < 45) {
    return {
      geldig: false,
      waarschuwing: `Bij een dienst van ${dienstUren.toFixed(1)} uur is minimaal 45 minuten pauze verplicht. Huidige pauze: ${pauzeMinuten} minuten.`,
    };
  }

  return { geldig: true };
}

// ============================================================================
// C-23: Verlopen ID-bewijs blokkering
// ============================================================================

export function isIDBewilsVerlopen(verloopdatum: string | null): boolean {
  if (!verloopdatum) return false;
  return new Date(verloopdatum) < new Date();
}

// ============================================================================
// C-18: ID-retentiebeleid (5 jaar na uitdienst)
// ============================================================================

export function berekenBewaarTot(datumUitDienst: string): string {
  const datum = new Date(datumUitDienst);
  datum.setFullYear(datum.getFullYear() + 5);
  return datum.toISOString().split("T")[0];
}
