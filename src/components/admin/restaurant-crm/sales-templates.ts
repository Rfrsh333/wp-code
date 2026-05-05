export const CALL_SCRIPTS = {
  opening: `Hoi, je spreekt met Rachid van Toptalent.\nIk bel heel kort: wij helpen restaurants met ervaren horecapersoneel, ook last-minute.\nMag ik vragen hoe jullie het nu oplossen als iemand ziek is of niet komt opdagen?`,
  aanbod: `Wat wij doen is simpel: wij kunnen jullie als back-up helpen met ervaren bediening, keuken of eventmedewerkers. Zonder vaste verplichting.`,
  interesse: `Ja precies, dat hoor ik vaker. Wij kunnen vaak binnen 24 uur iemand regelen voor bediening, keuken of events.\nZal ik je kort wat info sturen, zodat je ons achter de hand hebt voor drukke momenten?`,
  followup_vragen: [
    "Gebeurt dat vaak in drukke periodes of vooral in het weekend?",
    "Wat doen jullie dan meestal? Zelf meedraaien, gasten weigeren, of iemand uit netwerk bellen?",
    "Hebben jullie nu een vaste back-up voor dit soort momenten?",
  ],
};

export const CLOSING_SCRIPTS = {
  lage_commitment: `Zal ik jullie op onze back-up lijst zetten, zodat je ons kunt appen of bellen zodra je iemand nodig hebt?`,
  testdienst: `Zullen we het gewoon laagdrempelig houden?\nIk stuur je onze info, en als je een keer iemand tekortkomt, kun je ons testen met één dienst.`,
  followup: `Wanneer is het handig dat ik je kort terugbel?`,
  beslisser: `Wie gaat hier normaal gesproken over bij jullie?`,
  whatsapp: `Zal ik je onze gegevens via WhatsApp sturen, zodat je ons direct hebt als er iemand uitvalt?`,
};

export const BEZWAAR_REACTIES: Record<string, string> = {
  "We hebben al genoeg personeel": "Dat is mooi! Maar wat als er iemand ziek wordt of er een drukke periode aankomt? Wij zijn er als back-up, zonder verplichting.",
  "Te duur": "Ik snap het. Maar als je het vergelijkt met omzetverlies door een lege dienst of gasten die je niet kunt bedienen, is het juist een investering. Plus: je betaalt alleen als je ons nodig hebt.",
  "We lossen het zelf op": "Dat hoor ik vaker. Maar hoeveel tijd kost dat? En lukt het altijd? Wij zijn er voor die momenten dat het niet lukt.",
  "Geen budget": "We werken zonder vast contract. Je kunt ons proberen met één dienst en kijken of het bevalt. Geen risico.",
  "Ik moet het overleggen": "Helemaal goed. Zal ik je alvast onze info sturen, zodat je het kunt delen? En wanneer kan ik even terugbellen?",
};

export const DM_TEMPLATES = {
  after_call: {
    name: "Na geen gehoor",
    context: "Gebruik na een mislukte belpoging",
    body: `Hey, ik probeerde jullie net kort te bellen.\n\nSnelle vraag: hoe lossen jullie het nu op als iemand last-minute uitvalt in de bediening of keuken?`,
  },
  direct: {
    name: "Direct",
    context: "Eerste benadering zonder eerdere poging",
    body: `Hey! Wij helpen restaurants in {{city}} met ervaren horecapersoneel, ook last-minute.\n\nHebben jullie soms moeite om diensten gevuld te krijgen?`,
  },
  soft: {
    name: "Soft approach",
    context: "Vriendelijk en laagdrempelig",
    body: `Hey, korte vraag\n\nWerken jullie met een vaste pool voor extra horecapersoneel, of regelen jullie dat meestal ad hoc?`,
  },
  urgency: {
    name: "Spoed/urgentie",
    context: "Bij urgente bezetting of seizoensdrukte",
    body: `Hey! Als er deze week iemand uitvalt in de bediening of keuken, hebben jullie dan al een back-up?\n\nWij kunnen vaak snel schakelen in {{city}}.`,
  },
  after_email: {
    name: "Follow-up na e-mail",
    context: "Na eerder een cold email gestuurd",
    body: `Hey, ik heb jullie net kort een mail gestuurd over flexibel horecapersoneel.\n\nMag ik vragen wie hierover gaat bij jullie?`,
  },
};
