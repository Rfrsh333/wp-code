export interface CandidateEmailCopy {
  subject: string;
  heading: string;
  intro: string;
  cardTitle?: string;
  cardItems?: string[];
  bodyAfterCard?: string;
  ctaLabel?: string;
  outro?: string;
}

export const candidateEmailCopy = {
  bevestiging: {
    subject: "Hey {voornaam}! 👋 Je inschrijving is binnen",
    heading: "Hey {voornaam}, welkom bij TopTalent!",
    intro:
      "Top dat je je hebt ingeschreven! We hebben je gegevens binnen en gaan er zo mee aan de slag.",
    cardTitle: "Wat gebeurt er nu?",
    cardItems: [
      "We checken je profiel (duurt meestal 1-2 werkdagen)",
      "Als we nog wat nodig hebben, hoor je van ons",
      "Zodra je goedgekeurd bent, gaan we matches voor je zoeken! 🎯",
    ],
    bodyAfterCard: "Je kunt je status altijd live volgen via onderstaande link:",
    ctaLabel: "📊 Bekijk je status",
    outro: "Vragen? Gewoon appen of mailen, we helpen je graag! 💬",
  },
  documenten: {
    subject: "{voornaam}, we hebben je documenten nodig! 📄",
    heading: "Goed nieuws {voornaam}! 🎉",
    intro:
      "Je profiel ziet er goed uit! Om verder te gaan hebben we alleen nog een paar documenten nodig. Geen zorgen, dit duurt maar 2 minuten. 😊",
    cardTitle: "Dit hebben we nodig:",
    bodyAfterCard: "Upload je documenten hier:",
    ctaLabel: "📤 Upload documenten (2 min)",
    outro:
      "🔒 Deze link is beveiligd en 7 dagen geldig.<br>Nadat we alles hebben, ben je zo goedgekeurd! 🚀",
  },
  welkom: {
    subject: "🎉 {voornaam}, je bent inzetbaar!",
    heading: "Yes {voornaam}, je bent inzetbaar!",
    intro:
      "Je bent officieel goedgekeurd en klaar voor inzet. Vanaf nu kunnen we je matchen met gave opdrachten in de horeca!",
    cardTitle: "Wat nu?",
    cardItems: [
      "📞 Bellen we je of sturen een berichtje",
      "📅 Matchen we je met een leuke opdracht",
      "💰 Regel je snel je eerste shift!",
    ],
    bodyAfterCard: "Houd je telefoon in de gaten - je eerste match kan zomaar binnenkomen! 📱",
    ctaLabel: "🚀 Bekijk je profiel",
    outro: "Let's go! 🔥<br><br>Vragen? We zijn er! Bel, app of mail ons. 💬",
  },
} as const;

export function applyCandidateEmailVars(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  );
}

export function getDocumentChecklist(isZZP: boolean) {
  return [
    "📸 <strong>Geldig identiteitsbewijs</strong> (paspoort of ID-kaart)",
    "📝 <strong>CV</strong> (mag kort, gewoon je ervaring)",
    ...(isZZP ? ["🏢 <strong>KVK uittreksel</strong> (niet ouder dan 3 maanden)"] : []),
  ];
}
