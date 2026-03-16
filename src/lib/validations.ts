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

export const kandidaatBookingSchema = z.object({
  naam: z.string().min(2, "Naam moet minimaal 2 tekens zijn").max(100),
  email: z.string().email("Ongeldig e-mailadres").max(255),
  telefoon: z.string().max(20).optional().or(z.literal("")),
  notities: z.string().max(500).optional().or(z.literal("")),
  recaptchaToken: z.string().optional(),
});

// ============================================================
// LinkedIn Post + Template schemas
// ============================================================

const linkedInPostStatuses = ["draft", "approved", "scheduled", "publishing", "published", "failed"] as const;
const linkedInPostTypes = ["text", "link", "image", "article"] as const;
const linkedInTemplateCategories = ["mijlpaal", "tip", "case_study", "seizoen", "vacature", "nieuws", "engagement", "behind_the_scenes"] as const;

export const linkedinPostActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().min(1).max(3000),
    post_type: z.enum(linkedInPostTypes).optional().default("text"),
    link_url: z.string().url().optional(),
    image_url: z.string().url().optional(),
    hashtags: z.array(z.string()).optional(),
    scheduled_for: z.string().optional(),
    template_id: z.string().uuid().optional(),
    content_post_id: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().uuid(),
    content: z.string().min(1).max(3000).optional(),
    post_type: z.enum(linkedInPostTypes).optional(),
    link_url: z.string().url().nullable().optional(),
    image_url: z.string().url().nullable().optional(),
    hashtags: z.array(z.string()).optional(),
    scheduled_for: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("approve"), id: z.string().uuid() }),
  z.object({
    action: z.literal("schedule"),
    id: z.string().uuid(),
    scheduled_for: z.string().min(1),
  }),
  z.object({ action: z.literal("publish_now"), id: z.string().uuid() }),
  z.object({ action: z.literal("retry"), id: z.string().uuid() }),
  z.object({
    action: z.literal("generate"),
    categorie: z.enum(linkedInTemplateCategories).optional(),
    template_id: z.string().uuid().optional(),
    context: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("generate_from_blog"),
    content_post_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("generate_batch"),
    count: z.number().int().min(1).max(10).default(5),
    categorie: z.enum(linkedInTemplateCategories).optional(),
  }),
  z.object({
    action: z.literal("bulk_approve"),
    ids: z.array(z.string().uuid()).min(1).max(20),
  }),
  z.object({
    action: z.literal("bulk_delete"),
    ids: z.array(z.string().uuid()).min(1).max(20),
  }),
]);

export const linkedinTemplateActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    naam: z.string().min(1).max(100),
    categorie: z.enum(linkedInTemplateCategories),
    template: z.string().min(1).max(5000),
    variabelen: z.array(z.string()).optional().default([]),
    voorbeeld: z.string().max(5000).nullable().optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().uuid(),
    naam: z.string().min(1).max(100).optional(),
    categorie: z.enum(linkedInTemplateCategories).optional(),
    template: z.string().min(1).max(5000).optional(),
    variabelen: z.array(z.string()).optional(),
    voorbeeld: z.string().max(5000).nullable().optional(),
    is_active: z.boolean().optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);

export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e: { message: string }) => e.message).join(", ");
}
