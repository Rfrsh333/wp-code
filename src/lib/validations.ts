import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres").max(255),
  wachtwoord: z.string().min(1, "Wachtwoord is verplicht").max(255),
});

export const contactSchema = z.object({
  naam: z.string().min(1, "Naam is verplicht").max(100),
  email: z.string().email("Ongeldig e-mailadres").max(255),
  telefoon: z.string().max(20).optional().or(z.literal("")),
  onderwerp: z.string().min(1, "Onderwerp is verplicht").max(100),
  bericht: z.string().min(1, "Bericht is verplicht").max(5000),
  recaptchaToken: z.string().optional(),
  leadSource: z.string().max(100).optional(),
  campaignName: z.string().max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export const inschrijvenSchema = z.object({
  voornaam: z.string().min(1, "Voornaam is verplicht").max(100),
  achternaam: z.string().min(1, "Achternaam is verplicht").max(100),
  email: z.string().email("Ongeldig e-mailadres").max(255),
  telefoon: z.string().min(1, "Telefoonnummer is verplicht").max(20),
  geboortedatum: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Geboortedatum moet in YYYY-MM-DD formaat zijn"
  ).refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, "Geboortedatum mag niet in de toekomst liggen").refine((val) => {
    const age = Math.floor((Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 16;
  }, "Je moet minimaal 16 jaar oud zijn").optional(),
  woonplaats: z.string().max(100).optional(),
  ervaring: z.string().max(5000).optional(),
  beschikbaarheid: z.union([
    z.string().max(500),
    z.record(z.string(), z.array(z.string())),
  ]).optional(),
  functie_voorkeur: z.array(z.string()).optional(),
  uitbetalingswijze: z.string().max(50).optional(),
  recaptchaToken: z.string().optional(),
  leadSource: z.string().max(100).optional(),
  campaignName: z.string().max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export const personeelAanvraagSchema = z.object({
  bedrijfsnaam: z.string().min(1, "Bedrijfsnaam is verplicht").max(200),
  contactpersoon: z.string().min(1, "Contactpersoon is verplicht").max(200),
  email: z.string().email("Ongeldig e-mailadres").max(255),
  telefoon: z.string().min(1, "Telefoonnummer is verplicht").max(20),
  typePersoneel: z.array(z.string().max(100)).min(1, "Selecteer minimaal 1 type personeel"),
  aantalPersonen: z.string().max(10),
  contractType: z.array(z.string().max(50)),
  gewenstUurtarief: z.string().max(10).optional().or(z.literal("")),
  startDatum: z.string().min(1, "Startdatum is verplicht").max(20),
  eindDatum: z.string().max(20).optional().or(z.literal("")),
  werkdagen: z.array(z.string().max(20)),
  werktijden: z.string().max(100),
  locatie: z.string().max(500),
  opmerkingen: z.string().max(5000).optional().or(z.literal("")),
  recaptchaToken: z.string().optional(),
  leadSource: z.string().max(100).optional(),
  campaignName: z.string().max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  referralCode: z.string().max(100).optional(),
});

export const beschikbaarheidSchema = z.object({
  beschikbaarheid: z.record(z.string(), z.array(z.string())),
  beschikbaar_vanaf: z.string().min(1, "Datum is verplicht"),
  max_uren_per_week: z.number().min(1).max(60),
});

export const kandidaatBookingSchema = z.object({
  naam: z.string().min(2, "Naam moet minimaal 2 tekens zijn").max(100),
  email: z.string().email("Ongeldig e-mailadres").max(255),
  telefoon: z.string().max(20).optional().or(z.literal("")),
  notities: z.string().max(500).optional().or(z.literal("")),
  recaptchaToken: z.string().optional(),
});


export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e: { message: string }) => e.message).join(", ");
}
