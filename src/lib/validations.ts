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
  geboortedatum: z.string().optional(),
  woonplaats: z.string().max(100).optional(),
  ervaring: z.string().max(5000).optional(),
  beschikbaarheid: z.any().optional(),
  functie_voorkeur: z.array(z.string()).optional(),
  uitbetalingswijze: z.string().max(50).optional(),
  recaptchaToken: z.string().optional(),
  leadSource: z.string().max(100).optional(),
  campaignName: z.string().max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export const beschikbaarheidSchema = z.object({
  beschikbaarheid: z.record(z.string(), z.array(z.string())),
  beschikbaar_vanaf: z.string().min(1, "Datum is verplicht"),
  max_uren_per_week: z.number().min(1).max(60),
});

export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e: { message: string }) => e.message).join(", ");
}
