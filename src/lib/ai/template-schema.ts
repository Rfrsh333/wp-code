import { z } from "zod";

/** AI geeft soms een array terug waar een string verwacht wordt — flatten naar string */
const coerceString = z.preprocess(
  (val) => (Array.isArray(val) ? val.join("\n") : val),
  z.string(),
);

const sectionSchema = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()).min(1),
  subsections: z.array(z.object({
    heading: z.string(),
    paragraphs: z.array(z.string()).min(1),
  })).default([]),
  highlight: z.object({
    title: z.string(),
    content: coerceString,
    variant: z.enum(["info", "tip", "warning", "definition"]).default("info"),
  }).optional(),
  checklistTitle: z.string().optional(),
  checklistItems: z.array(z.string()).optional(),
  quoteText: z.string().optional(),
  comparisonHeaders: z.tuple([z.string(), z.string(), z.string()]).optional(),
  comparisonRows: z.array(z.object({
    feature: z.string(),
    optionA: z.string(),
    optionB: z.string(),
  })).optional(),
  tableHeaders: z.array(z.string()).optional(),
  tableRows: z.array(z.array(z.string())).optional(),
});

export const templateDraftSchema = z.object({
  title: z.string().min(10),
  slug: z.string().min(3),
  excerpt: z.string().min(30),
  seoTitle: z.string().catch(""),
  metaDescription: z.string().catch(""),
  introText: z.string().min(50),
  contextHighlight: z.object({
    title: z.string(),
    content: coerceString,
  }),
  sections: z.array(sectionSchema).min(3),
  stats: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).default([]),
  keyTakeaways: z.array(z.string()).min(3).catch([]),
  actionSteps: z.array(z.string()).default([]).catch([]),
  factCheckFlags: z.array(z.string()).default([]),
  imagePromptSuggestion: z.string().catch("Professionele foto gerelateerd aan het onderwerp."),
  visualDirection: z.string().catch("Editorial fotografie stijl."),
  impactSummary: z.string().catch("Geen impactsamenvatting beschikbaar."),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;
export type TemplateSection = z.infer<typeof sectionSchema>;
