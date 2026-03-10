export type AdminCandidateTemplateKey =
  | "missing_id"
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
  missing_id: {
    subject: "{voornaam}, we missen nog je ID",
    heading: "Hey {voornaam}, nog 1 dingetje 👀",
    intro: "Je bent al lekker op weg, maar we missen nog je ID. Zodra die binnen is kunnen we sneller door.",
    cardTitle: "Upload nog even:",
    cardItems: ["Een geldig identiteitsbewijs", "Gewoon een duidelijke foto is prima"],
    bodyAfterCard: "Gebruik hieronder direct je uploadlink:",
    ctaLabel: "ID uploaden",
    outro: "Als iets niet lukt, app of mail ons gewoon even.",
    ctaUrlType: "upload",
  },
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
