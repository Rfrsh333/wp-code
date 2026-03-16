import { z } from "zod";

// ============================================================
// Shared helpers
// ============================================================

const uuid = z.string().uuid();
const optionalUuid = z.string().uuid().optional();
const optionalString = z.string().max(5000).optional();
const requiredString = z.string().min(1).max(5000);

export function validateAdminBody<T>(schema: z.ZodType<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
  }
  return { success: true, data: result.data };
}

// ============================================================
// 1. admin/diensten
// ============================================================

const dienstData = z.object({
  klant_naam: z.string().max(255).optional(),
  klant_id: z.string().optional(),
  functie: z.string().max(100).optional(),
  datum: z.string().max(20).optional(),
  start_tijd: z.string().max(10).optional(),
  eind_tijd: z.string().max(10).optional(),
  aantal_nodig: z.number().int().min(1).max(100).optional(),
  plekken_totaal: z.number().int().min(0).optional(),
  plekken_beschikbaar: z.number().int().min(0).optional(),
  locatie: z.string().max(500).optional(),
  uurtarief: z.number().min(0).optional().nullable(),
  status: z.string().max(50).optional(),
  is_spoeddienst: z.boolean().optional(),
  notities: z.string().max(5000).optional().nullable(),
  spoeddienst_token: z.string().max(100).optional().nullable(),
  spoeddienst_whatsapp_tekst: z.string().max(2000).optional().nullable(),
}).passthrough();

export const dienstenPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: dienstData, id: optionalString, dienst_id: optionalString }),
  z.object({ action: z.literal("update"), id: uuid, data: dienstData, dienst_id: optionalString }),
  z.object({ action: z.literal("delete"), id: uuid, data: z.any().optional(), dienst_id: optionalString }),
  z.object({ action: z.literal("get_aanmeldingen"), dienst_id: uuid, id: optionalString, data: z.any().optional() }),
  z.object({ action: z.literal("update_aanmelding"), id: uuid, data: z.object({ status: requiredString }).passthrough(), dienst_id: optionalString }),
  z.object({ action: z.literal("get_spoeddienst_responses"), dienst_id: uuid, id: optionalString, data: z.any().optional() }),
  z.object({ action: z.literal("update_spoeddienst_response"), id: uuid, data: z.object({ status: requiredString }).passthrough(), dienst_id: optionalString }),
  z.object({ action: z.literal("regenerate_whatsapp"), id: uuid, data: z.any().optional(), dienst_id: optionalString }),
]);

// ============================================================
// 2. admin/medewerkers
// ============================================================

export const medewerkersPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_password"), id: uuid, data: z.any().optional() }),
  z.object({
    action: z.literal("create"),
    id: optionalString,
    data: z.object({
      naam: z.string().max(255).optional(),
      voornaam: z.string().max(100).optional(),
      achternaam: z.string().max(100).optional(),
      email: z.string().email().max(255).optional(),
      telefoon: z.string().max(20).optional(),
      telefoonnummer: z.string().max(20).optional(),
      wachtwoord: z.string().min(8).max(255).optional(),
      status: z.string().max(50).optional(),
      functie: z.array(z.string().max(100)).optional(),
    }).passthrough(),
  }),
  z.object({
    action: z.literal("update"),
    id: uuid,
    data: z.object({
      naam: z.string().max(255).optional(),
      voornaam: z.string().max(100).optional(),
      achternaam: z.string().max(100).optional(),
      email: z.string().email().max(255).optional(),
      telefoon: z.string().max(20).optional(),
      telefoonnummer: z.string().max(20).optional(),
      wachtwoord: z.string().min(8).max(255).optional(),
      status: z.string().max(50).optional(),
      functie: z.array(z.string().max(100)).optional(),
    }).passthrough(),
  }),
  z.object({
    action: z.literal("update_scores"),
    id: uuid,
    data: z.object({
      admin_score_aanwezigheid: z.number().min(1).max(5),
      admin_score_vaardigheden: z.number().min(1).max(5),
    }),
  }),
  z.object({
    action: z.literal("review_document"),
    id: optionalString,
    data: z.object({
      document_id: uuid,
      review_status: z.enum(["goedgekeurd", "afgekeurd"]),
      review_opmerking: z.string().max(2000).optional(),
    }),
  }),
  z.object({ action: z.literal("delete"), id: uuid, data: z.any().optional() }),
]);

// ============================================================
// 3. admin/matching
// ============================================================

export const matchingPostSchema = z.object({
  dienst_id: uuid,
  medewerker_ids: z.array(uuid).min(1).max(200),
});

// ============================================================
// 4. admin/tickets
// ============================================================

export const ticketsPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_status"),
    id: uuid,
    data: z.object({ status: z.string().min(1).max(50) }),
  }),
  z.object({
    action: z.literal("link_faq"),
    id: uuid,
    data: z.object({ faq_id: uuid }),
  }),
  z.object({
    action: z.literal("answer_as_faq"),
    id: uuid,
    data: z.object({
      question: z.string().min(1).max(1000),
      answer: z.string().min(1).max(10000),
      category: z.string().max(100).optional(),
      publish: z.boolean().optional(),
    }),
  }),
  z.object({ action: z.literal("stats"), id: z.any().optional(), data: z.any().optional() }),
]);

// ============================================================
// 5. admin/bulk-email
// ============================================================

export const bulkEmailPostSchema = z.object({
  kandidaat_ids: z.array(uuid).min(1).max(50),
  template: z.enum(["onboarding_update", "document_request", "approved", "custom"]),
  customSubject: z.string().max(500).optional(),
  customMessage: z.string().max(10000).optional(),
});

// ============================================================
// 6. admin/faq
// ============================================================

const faqItem = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(10000),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  priority: z.number().int().min(0).optional(),
});

export const faqPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), id: z.any().optional(), data: faqItem }),
  z.object({
    action: z.literal("update"),
    id: uuid,
    data: z.object({
      question: z.string().min(1).max(1000).optional(),
      answer: z.string().min(1).max(10000).optional(),
      category: z.string().max(100).optional(),
      subcategory: z.string().max(100).optional().nullable(),
      status: z.string().max(50).optional(),
      slug: z.string().max(100).optional(),
      priority: z.number().int().min(0).optional(),
    }),
  }),
  z.object({ action: z.literal("delete"), id: uuid, data: z.any().optional() }),
  z.object({ action: z.literal("bulk_create"), id: z.any().optional(), data: z.array(faqItem).min(1).max(100) }),
]);

// ============================================================
// 7. admin/aanbiedingen
// ============================================================

export const aanbiedingenPostSchema = z.object({
  dienst_id: uuid,
  medewerker_ids: z.array(uuid).min(1).max(200),
  notitie: z.string().max(2000).optional().nullable(),
});

// ============================================================
// 8. admin/boetes
// ============================================================

export const boetesPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register_no_show"),
    medewerker_id: uuid,
    dienst_id: optionalUuid.nullable(),
    boete_id: z.any().optional(),
  }),
  z.object({ action: z.literal("mark_paid"), boete_id: uuid, medewerker_id: z.any().optional(), dienst_id: z.any().optional() }),
  z.object({ action: z.literal("withdraw"), boete_id: uuid, medewerker_id: z.any().optional(), dienst_id: z.any().optional() }),
  z.object({ action: z.literal("kwijtschelden"), boete_id: uuid, medewerker_id: z.any().optional(), dienst_id: z.any().optional() }),
  z.object({ action: z.literal("unpause_account"), medewerker_id: uuid, boete_id: z.any().optional(), dienst_id: z.any().optional() }),
]);

// ============================================================
// 9. admin/berichten
// ============================================================

export const berichtenPostSchema = z.union([
  z.object({
    action: z.literal("save_template"),
    naam: z.string().min(1).max(255),
    inhoud: z.string().min(1).max(10000),
    onderwerp: z.string().max(500).optional().nullable(),
    categorie: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("bulk_send"),
    aan_ids: z.array(uuid).min(1).max(500),
    inhoud: z.string().min(1).max(10000),
    onderwerp: z.string().max(500).optional().nullable(),
  }),
  // Single send (no action field)
  z.object({
    aan_id: uuid,
    inhoud: z.string().min(1).max(10000),
    onderwerp: z.string().max(500).optional().nullable(),
    action: z.undefined().optional(),
  }),
]);

// ============================================================
// 10. admin/content
// ============================================================

export const contentPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    type: z.enum(["blog", "linkedin"]),
    subtype: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: uuid,
    titel: z.string().max(500).optional(),
    inhoud: z.string().max(50000).optional(),
    meta_description: z.string().max(500).optional(),
    keywords: z.array(z.string().max(100)).optional().nullable(),
    status: z.string().max(50).optional(),
  }),
  z.object({ action: z.literal("publish"), id: uuid }),
  z.object({ action: z.literal("delete"), id: uuid }),
]);

// ============================================================
// 11. admin/data
// ============================================================

const ALLOWED_TABLES = [
  "calculator_leads", "contact_berichten", "personeel_aanvragen", "inschrijvingen",
  "leads", "klanten", "diensten", "dienst_aanmeldingen", "uren_registraties",
  "facturen", "factuur_regels", "kandidaat_contactmomenten", "kandidaat_taken",
  "acquisitie_leads", "acquisitie_contactmomenten", "acquisitie_campagnes",
  "acquisitie_campagne_leads", "acquisitie_sales_reps", "acquisitie_concurrenten",
  "acquisitie_win_loss", "acquisitie_prediction_log", "acquisitie_segmenten",
  "acquisitie_tag_definities", "acquisitie_kosten", "acquisitie_deals",
  "offertes", "referrals", "pricing_rules", "google_reviews", "content_posts",
  "availability_slots", "bookings", "admin_settings", "event_types",
  "availability_schedules", "availability_overrides",
] as const;

const allowedTableEnum = z.enum(ALLOWED_TABLES);

export const dataPostSchema = z.object({
  action: z.enum(["update", "delete", "delete_many", "bulk_update", "insert"]),
  table: allowedTableEnum,
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// 12. admin/kandidaat-workflow
// ============================================================

export const kandidaatWorkflowPostSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("contact"),
    inschrijvingId: uuid,
    contactType: z.string().min(1).max(100),
    summary: z.string().min(1).max(5000),
  }),
  z.object({
    type: z.literal("task"),
    inschrijvingId: uuid,
    title: z.string().min(1).max(500),
    note: z.string().max(5000).optional().nullable(),
    dueAt: z.string().max(50).optional().nullable(),
  }),
]);

export const kandidaatWorkflowPatchSchema = z.object({
  taskId: uuid,
  completed: z.boolean().optional(),
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(5000).optional().nullable(),
  dueAt: z.string().max(50).optional().nullable(),
});

// ============================================================
// 13. admin/reviews
// ============================================================

export const reviewsPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    reviewer_naam: z.string().min(1).max(255),
    score: z.union([z.number().int().min(1).max(5), z.string().regex(/^[1-5]$/)]),
    tekst: z.string().max(5000).optional().nullable(),
    review_datum: z.string().max(20).optional(),
  }),
  z.object({
    action: z.literal("generate_response"),
    review_id: z.string().optional(),
    reviewer_naam: z.string().max(255).optional(),
    score: z.union([z.number().int().min(1).max(5), z.string().regex(/^[1-5]$/)]),
    tekst: z.string().min(1).max(5000),
  }),
  z.object({
    action: z.literal("save_response"),
    review_id: uuid,
    antwoord: z.string().min(1).max(10000),
  }),
  z.object({
    action: z.literal("update"),
    review_id: uuid,
    reviewer_naam: z.string().max(255).optional(),
    score: z.union([z.number().int().min(1).max(5), z.string().regex(/^[1-5]$/)]).optional(),
    tekst: z.string().max(5000).optional(),
    review_datum: z.string().max(20).optional(),
  }),
  z.object({ action: z.literal("delete"), review_id: uuid }),
]);

// ============================================================
// 14. admin/kandidaat-documenten (PATCH only - POST uses FormData)
// ============================================================

export const kandidaatDocumentenPatchSchema = z.object({
  id: uuid,
  status: z.string().max(50).optional(),
  notitie: z.string().max(5000).optional().nullable(),
});

// ============================================================
// 15. admin/acquisitie/campagnes
// ============================================================

export const campagnesPostSchema = z.union([
  z.object({ action: z.literal("update"), id: uuid }).passthrough(),
  z.object({ action: z.literal("delete"), id: uuid }),
  z.object({ action: z.literal("send"), id: uuid }),
  z.object({ action: z.literal("add_leads"), id: uuid, lead_ids: z.array(uuid).min(1).max(500) }),
  z.object({ action: z.literal("get_leads"), id: uuid }),
  // Create (no action field)
  z.object({
    naam: z.string().min(1).max(500),
    action: z.undefined().optional(),
    id: z.undefined().optional(),
  }).passthrough(),
]);

// ============================================================
// 16. admin/verify
// ============================================================

export const verifyPostSchema = z.object({
  session: z.object({
    access_token: z.string().min(1).max(10000),
  }),
});

// ============================================================
// 17. admin/contracten
// ============================================================

const contractData = z.object({
  template_id: uuid.optional(),
  medewerker_id: uuid.optional(),
  klant_id: uuid.optional(),
  type: z.enum(["arbeidsovereenkomst", "uitzendovereenkomst", "oproepovereenkomst", "freelance", "stage", "custom"]).optional(),
  titel: z.string().max(255).optional(),
  contract_data: z.record(z.string(), z.unknown()).optional(),
  startdatum: z.string().max(20).optional(),
  einddatum: z.string().max(20).optional(),
  notities: z.string().max(5000).optional(),
  status: z.enum(["concept", "verzonden", "bekeken", "ondertekend_medewerker", "ondertekend_admin", "actief", "verlopen", "opgezegd", "geannuleerd"]).optional(),
}).passthrough();

export const contractenPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: contractData }),
  z.object({ action: z.literal("update"), id: uuid, data: contractData }),
  z.object({ action: z.literal("delete"), id: uuid }),
  z.object({ action: z.literal("verzend"), id: uuid }),
  z.object({ action: z.literal("teken_admin"), id: uuid, handtekening_data: requiredString, ondertekenaar_naam: requiredString }),
]);
