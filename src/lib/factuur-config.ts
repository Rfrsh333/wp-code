export function getFactuurConfig() {
  return {
    bedrijfsnaam: process.env.FACTUUR_BEDRIJFSNAAM || "TopTalent Jobs",
    adres: process.env.FACTUUR_ADRES || "Kanaalstraat 15",
    postcodeStad: process.env.FACTUUR_POSTCODE_STAD || "3531 CJ Utrecht",
    kvk: process.env.FACTUUR_KVK || "73401161",
    btw: process.env.FACTUUR_BTW || "NL002387654B82",
    waadi: process.env.FACTUUR_WAADI || "WAADI-NUMMER-INVULLEN",
    loonbelastingnummer: process.env.FACTUUR_LOONBELASTINGNUMMER || "LOONHEFFINGEN-NUMMER-INVULLEN",
    iban: process.env.FACTUUR_IBAN || "NL00 BANK 0000 0000 00",
    tenaamstelling: process.env.FACTUUR_TENAAMSTELLING || "TopTalent Jobs",
    email: process.env.FACTUUR_EMAIL || "facturen@toptalentjobs.nl",
    paymentTermDays: Number(process.env.FACTUUR_BETAALTERMIJN_DAGEN || "14"),
  };
}

export function calculateVat(subtotaal: number, percentage: number) {
  return Math.round(subtotaal * (percentage / 100) * 100) / 100;
}

