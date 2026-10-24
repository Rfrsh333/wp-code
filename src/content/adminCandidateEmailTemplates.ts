// Geen template "we missen nog je ID" meer (juridisch advies 24-10-2026): kandidaten uploaden geen
// ID-bewijs; het ID wordt later in het medewerkerportaal gecontroleerd, zonder kopie. Ontbreekt er
// een ander document, gebruik dan "Documentenverzoek opnieuw".
export type AdminCandidateTemplateKey =
  | "follow_up_tomorrow"
  | "approved_update";

export const adminCandidateEmailTemplates: Record<
  AdminCandidateTemplateKey,
  {
    subject: string;
    heading: string;
    intro: string;
    cardTitle?: string;
    cardItems?: string[];
    bodyAfterCard?: string;
    ctaLabel?: string;
    outro?: string;
    ctaUrlType?: "status" | "upload";
  }
> = {
  follow_up_tomorrow: {
    subject: "{voornaam}, we bellen je morgen even",
    heading: "Kleine heads-up ☎️",
    intro: "We nemen morgen even contact met je op om je onboarding af te ronden en de volgende stap te bespreken.",
    bodyAfterCard: "Je kunt hieronder ook zelf je status volgen:",
    ctaLabel: "Bekijk je status",
    outro: "Zorg dat je telefoon een beetje in de buurt is. We houden het kort en duidelijk.",
    ctaUrlType: "status",
  },
  approved_update: {
    subject: "{voornaam}, je profiel staat er goed voor",
    heading: "Goed nieuws {voornaam} 🙌",
    intro: "Je profiel ziet er goed uit. We zitten in de laatste checks en laten je snel weten wanneer je volledig inzetbaar bent.",
    bodyAfterCard: "Hier kun je je status live volgen:",
    ctaLabel: "Status bekijken",
    outro: "Nog heel even geduld. We zijn er bijna.",
    ctaUrlType: "status",
  },
};
