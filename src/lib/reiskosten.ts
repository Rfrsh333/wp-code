export const MEDEWERKER_REISKOSTEN_PER_KM = 0.21;
export const KLANT_REISKOSTEN_PER_KM = 0.23;

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function sanitizeKilometers(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return roundCurrency(parsed);
}

export function calculateMedewerkerReiskosten(km: number | string | null | undefined) {
  return roundCurrency(sanitizeKilometers(km) * MEDEWERKER_REISKOSTEN_PER_KM);
}

export function calculateKlantReiskosten(km: number | string | null | undefined) {
  return roundCurrency(sanitizeKilometers(km) * KLANT_REISKOSTEN_PER_KM);
}
