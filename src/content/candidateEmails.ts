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
  // Zelfde verzoek, maar automatisch verstuurd door de autopilot (B3): zonder "je profiel ziet
  // er goed uit", want er heeft nog niemand naar gekeken.
  documentenAutomatisch: {
    subject: "{voornaam}, de volgende stap: je documenten 📄",
    heading: "Hey {voornaam}, de volgende stap!",
    intro:
      "Bedankt voor je inschrijving! Om je aanmelding verder te brengen hebben we een paar documenten van je nodig. Dit duurt maar 2 minuten. 😊",
    cardTitle: "Dit hebben we nodig:",
    bodyAfterCard: "Upload je documenten hier:",
    ctaLabel: "📤 Upload documenten (2 min)",
    outro:
      "🔒 Deze link is beveiligd en 7 dagen geldig.<br>Daarna bekijken we je inschrijving en documenten en hoor je van ons.",
  },
  documentenReminder: {
    subject: "{voornaam}, vergeet je documenten niet! 📄",
    heading: "Hey {voornaam}, nog heel eventjes!",
    intro:
      "We hebben een paar dagen geleden je documenten aangevraagd, maar we zien dat je ze nog niet hebt geüpload. Geen stress, we snappen dat het druk kan zijn. 😊",
    cardTitle: "Upload deze nog even:",
    bodyAfterCard: "Gebruik hieronder direct je beveiligde uploadlink:",
    ctaLabel: "📤 Upload documenten",
    outro:
      "Duurt echt maar 2 minuutjes. Gewoon een foto maken met je telefoon is helemaal prima. 🙌",
  },
  // Alleen voor wie al een (geactiveerd) account heeft; een nieuw account krijgt bij
  // "inzetbaar" de activatiemail, die dezelfde boodschap heeft (B15: één consistente mail).
  welkom: {
    subject: "🎉 {voornaam}, je bent inzetbaar!",
    heading: "Yes {voornaam}, je bent inzetbaar!",
    intro:
      "Je bent goedgekeurd en klaar voor inzet. Log in op TopTalent Hub met je account en reageer op de open diensten.",
    cardTitle: "Wat nu?",
    cardItems: [
      "Log in op TopTalent Hub",
      "Maak je profiel compleet",
      "Reageer op een dienst die bij je past",
    ],
    bodyAfterCard: "Wachtwoord kwijt? Kies op de inlogpagina voor 'Wachtwoord vergeten'.",
    ctaLabel: "Inloggen",
    outro: "Vragen? We zijn er! Bel, app of mail ons. 💬",
  },
  // B16: de mail "Documenten ontvangen" belooft bericht zodra alles is goedgekeurd.
  documentenGoedgekeurd: {
    subject: "{voornaam}, je documenten zijn goedgekeurd ✅",
    heading: "Top {voornaam}, je documenten zijn goedgekeurd!",
    intro: "We hebben je documenten bekeken en alles is in orde.",
    cardTitle: "Wat nu?",
    cardItems: [
      "We ronden je inschrijving af",
      "Zodra je account klaarstaat, krijg je een mail om je wachtwoord in te stellen",
      "Daarna log je in en kun je reageren op diensten",
    ],
    bodyAfterCard: "Je kunt je status altijd volgen via onderstaande link:",
    ctaLabel: "📊 Bekijk je status",
    outro: "Vragen? Gewoon appen of mailen, we helpen je graag! 💬",
  },
  afwijzing: {
    subject: "{voornaam}, update over je aanmelding bij TopTalent",
    heading: "Beste {voornaam},",
    intro:
      "Bedankt voor je interesse in TopTalent Jobs. Na zorgvuldige overweging hebben we helaas besloten om op dit moment niet verder te gaan met je aanmelding.",
    bodyAfterCard: "Dit betekent niet dat er in de toekomst geen mogelijkheden zijn. Je bent altijd welkom om je opnieuw in te schrijven.",
    outro: "We wensen je veel succes! Heb je vragen? Neem gerust contact met ons op.",
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
