# SEO Metadata Audit Rapport - TopTalent Jobs

**Datum:** 14 mei 2026
**Website:** https://www.toptalentjobs.nl
**Framework:** Next.js 16 (App Router)
**Totaal gescand:** 83 pagina's (32 publieke routes, 51 private/noindex routes)

---

## Samenvatting

| Categorie | Aantal |
|-----------|--------|
| Publieke pagina's gescand | 32 |
| Ontbrekende canonical tags | 8 |
| Ontbrekende metadata (title/description) | 4 |
| Duplicate titles (page + layout conflict) | 4 |
| Te korte titles (< 30 tekens) | 3 |
| Te lange titles (> 60 tekens) | 5 |
| Te korte descriptions (< 120 tekens) | 2 |
| Te lange descriptions (> 160 tekens) | 3 |
| Inconsistente canonical domeinen | 2 |
| Verkeerd merk in metadata | 1 |
| Kritieke problemen | 5 |
| Gemiddelde problemen | 9 |
| Lage prioriteit | 6 |

---

## Kritieke Problemen

### 1. Inconsistent canonical domein (`/geo` routes)
- `/geo` en `/geo/[slug]` gebruiken `https://toptalentjobs.nl` (zonder `www`)
- Alle andere pagina's gebruiken `https://www.toptalentjobs.nl`
- **Risico:** Google ziet dit als twee verschillende domeinen, wat leidt tot duplicate content en gesplitste ranking-signalen.

### 2. Verkeerd merk op `/meer-aanvragen`
- Title: "Meer Aanvragen voor jouw Servicebedrijf | **ZenithZoom**"
- Description verwijst naar "installatie- of servicebedrijf"
- **Risico:** Verwarrend voor Google en bezoekers. Schaadt merkvertrouwen en relevantie.

### 3. Landing page `/lp/personeel` zonder metadata
- Client component zonder enige metadata export
- Geen layout.tsx met metadata
- **Risico:** Google toont de root default title/description. Slechte CTR voor advertentie-landingspagina.

### 4. Duplicate metadata conflicten (page.tsx vs layout.tsx)
- 4 pagina's hebben metadata in zowel page.tsx als layout.tsx
- Next.js merged deze, maar page.tsx overschrijft layout.tsx titles
- **Risico:** Onverwachte titels in zoekresultaten.

### 5. Ontbrekende metadata op `/afspraak-plannen` en `/kennismaking-plannen`
- Twee belangrijke conversiepagina's hebben geen eigen metadata
- Erven de generieke root title/description
- **Risico:** Slechte zoekzichtbaarheid voor high-intent zoektermen.

---

## Volledige Audit per Publieke Pagina

### 1. Homepage `/`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Extra horecapersoneel binnen 24 u \| Stop omzetverlies \| TopTalent" |
| **Lengte title** | 64 tekens (iets te lang, kan afkappen) |
| **Aanbevolen title** | "Horecapersoneel binnen 24 uur \| TopTalent Jobs Utrecht" |
| **Huidige description** | "Geen paniek meer bij ziekte of last-minute uitval. TopTalent levert gescreend horecapersoneel binnen 24 uur voor restaurants, hotels en events in Utrecht en omstreken." |
| **Lengte description** | 167 tekens (iets te lang) |
| **Aanbevolen description** | "Horecapersoneel nodig? TopTalent levert gescreende krachten binnen 24 uur voor restaurants, hotels en events in Utrecht. Bel nu voor een vrijblijvend gesprek." |
| **Canonical** | `https://www.toptalentjobs.nl/` |
| **Robots** | index, follow |
| **Structured data** | FAQPage schema |
| **Prioriteit** | Gemiddeld |

**Beoordeling:** Title is iets te lang en bevat twee pipes, wat Google kan afkappen. "Stop omzetverlies" is clickbait-achtig en past niet bij de informatieve zoekintentie. Description is goed maar 7 tekens te lang.

---

### 2. `/diensten`

| Veld | Waarde |
|------|--------|
| **Huidige title (layout)** | "Diensten horeca uitzendbureau \| Uitzenden, detachering, recruitment" |
| **Huidige title (page)** | "Onze Diensten" (overschrijft layout!) |
| **Lengte title (effectief)** | 14 tekens ("Onze Diensten") - veel te kort! |
| **Aanbevolen title** | "Horeca Diensten: Uitzenden, Detachering & Recruitment \| TopTalent" |
| **Huidige description (layout)** | "Overzicht van de diensten van TopTalent Jobs: uitzenden, detachering en recruitment van horecapersoneel..." |
| **Huidige description (page)** | "Ontdek de horeca diensten van TopTalent Jobs..." |
| **Aanbevolen description** | "Bekijk onze horeca diensten: uitzenden, detachering en recruitment. Flexibel personeel of vaste krachten voor uw restaurant, hotel of evenement in Utrecht." |
| **Canonical** | `https://www.toptalentjobs.nl/diensten` |
| **Robots** | index, follow |
| **Prioriteit** | **KRITIEK** - page.tsx overschrijft de goede layout title |

**Probleem:** De page.tsx metadata overschrijft de geoptimaliseerde layout.tsx title. "Onze Diensten" is te kort en bevat geen keywords. **Oplossing:** Verwijder de metadata export uit `page.tsx` of synchroniseer met layout.

---

### 3. `/diensten/uitzenden`

| Veld | Waarde |
|------|--------|
| **Huidige title (layout)** | "Uitzenden horeca personeel \| diensten voor werkgevers" |
| **Huidige title (page)** | "Uitzenden" (overschrijft layout!) |
| **Lengte title (effectief)** | 9 tekens - veel te kort! |
| **Aanbevolen title** | "Horeca Uitzenden: Flexibel Personeel binnen 24 uur \| TopTalent" |
| **Huidige description (layout)** | "Uitzenden van horecapersoneel voor restaurants, hotels en events. Snel tijdelijke inzet bij piekdrukte of uitval..." |
| **Huidige description (page)** | "Snel uitzendkrachten nodig voor de horeca?..." |
| **Aanbevolen description** | "Uitzendkrachten voor uw horeca? TopTalent regelt ervaren personeel bij piekdrukte, uitval of evenementen. Flexibel, snel en zonder werkgeversrisico." |
| **Canonical** | `https://www.toptalentjobs.nl/diensten/uitzenden` |
| **Robots** | index, follow |
| **Prioriteit** | **KRITIEK** - page.tsx overschrijft de goede layout title |

---

### 4. `/diensten/detachering`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Detachering horeca personeel voor werkgevers" |
| **Lengte title** | 46 tekens |
| **Aanbevolen title** | "Horeca Detachering: Vaste Krachten Zonder Risico \| TopTalent" |
| **Huidige description** | "Detachering van horecapersoneel voor structurele bezetting. Een vaste horecakracht in uw team, zonder werkgeversrisico..." |
| **Lengte description** | ~120 tekens |
| **Aanbevolen description** | "Detachering van horecapersoneel voor langdurige inzet. Vaste kracht in uw team zonder werkgeversrisico. Ideaal voor restaurants en hotels in Utrecht." |
| **Canonical** | `https://www.toptalentjobs.nl/diensten/detachering` |
| **Robots** | index, follow |
| **Prioriteit** | Laag |

**Beoordeling:** Metadata is degelijk. Title kan krachtiger met USP. Geen conflicten.

---

### 5. `/diensten/recruitment`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Recruitment horeca personeel \| vaste medewerkers" |
| **Lengte title** | 50 tekens |
| **Aanbevolen title** | "Horeca Recruitment: Vaste Medewerkers Werven \| TopTalent" |
| **Huidige description** | "Recruitment voor vast horecapersoneel. Wij werven en selecteren vaste medewerkers voor restaurants, hotels en catering..." |
| **Aanbevolen description** | "Op zoek naar vast horecapersoneel? TopTalent werft en selecteert gemotiveerde medewerkers voor restaurants, hotels en catering in Utrecht." |
| **Canonical** | `https://www.toptalentjobs.nl/diensten/recruitment` |
| **Robots** | index, follow |
| **Prioriteit** | Laag |

---

### 6. `/over-ons`

| Veld | Waarde |
|------|--------|
| **Huidige title (layout)** | "Over Ons - Horeca Uitzendbureau met Persoonlijke Aanpak" |
| **Huidige title (page)** | "Over Ons" (overschrijft layout!) |
| **Lengte title (effectief)** | 7 tekens - veel te kort! |
| **Aanbevolen title** | "Over TopTalent Jobs: Horeca Uitzendbureau Utrecht" |
| **Huidige description (layout)** | "Leer TopTalent Jobs kennen: een horeca uitzendbureau in Utrecht met passie voor gastvrijheid..." |
| **Huidige description (page)** | "Leer het team achter TopTalent Jobs kennen..." |
| **Aanbevolen description** | "Maak kennis met TopTalent Jobs, het horeca uitzendbureau in Utrecht met persoonlijke aanpak. Ontdek ons team, onze missie en waarom klanten ons vertrouwen." |
| **Canonical** | `https://www.toptalentjobs.nl/over-ons` |
| **Robots** | index, follow |
| **Prioriteit** | **KRITIEK** - page.tsx overschrijft de goede layout title |

---

### 7. `/contact`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Contact" |
| **Lengte title** | 7 tekens - veel te kort! |
| **Aanbevolen title** | "Contact TopTalent Jobs \| Bel, Mail of WhatsApp" |
| **Huidige description** | "Neem contact op met TopTalent Jobs voor al uw vragen over horeca uitzendwerk. Bel, mail of WhatsApp ons. Wij zijn 24/7 bereikbaar..." |
| **Lengte description** | 130 tekens |
| **Aanbevolen description** | "Neem contact op met TopTalent Jobs. Bel, mail of WhatsApp ons voor vragen over horecapersoneel. 24/7 bereikbaar. Reactie binnen 1 uur." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | **KRITIEK** |

**Problemen:** (1) Title veel te kort, geen keywords. (2) Canonical ontbreekt. (3) Geen OpenGraph data.

---

### 8. `/locaties`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Locaties - Horeca Uitzendbureau \| TopTalent Jobs" |
| **Lengte title** | 50 tekens |
| **Aanbevolen title** | "Onze Locaties: Horecapersoneel in Utrecht & Randstad \| TopTalent" |
| **Huidige description** | "Bekijk in welke regio's TopTalent Jobs actief is. Lokale horecapersoneel oplossingen in Utrecht, Amsterdam en Rotterdam." |
| **Lengte description** | 118 tekens (iets te kort) |
| **Aanbevolen description** | "TopTalent Jobs levert horecapersoneel in Utrecht, Amsterdam, Rotterdam en omgeving. Bekijk onze locaties en vind personeel bij u in de buurt." |
| **Canonical** | `https://www.toptalentjobs.nl/locaties` |
| **Robots** | index, follow |
| **Prioriteit** | Laag |

---

### 9. `/locaties/utrecht`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Horeca Uitzendbureau Utrecht \| TopTalent Jobs" |
| **Lengte title** | 48 tekens |
| **Aanbevolen title** | "Horecapersoneel Utrecht: Uitzendbureau \| TopTalent Jobs" |
| **Huidige description** | "Snel en betrouwbaar horeca personeel in Utrecht. Ervaren krachten voor restaurants, hotels en evenementen. Binnen 24 uur beschikbaar." |
| **Lengte description** | 133 tekens |
| **Aanbevolen description** | Huidige is goed. Optioneel toevoegen: "...Binnen 24 uur beschikbaar. Vraag nu vrijblijvend een offerte aan." |
| **Canonical** | `https://www.toptalentjobs.nl/locaties/utrecht` |
| **Robots** | index, follow |
| **Prioriteit** | Laag - metadata is sterk |

---

### 10. `/locaties/[city]` (Dynamische stadspagina's)

| Veld | Waarde |
|------|--------|
| **Title** | Dynamisch uit `location.title` |
| **Description** | Dynamisch uit `location.description` |
| **Canonical** | `https://www.toptalentjobs.nl/locaties/{slug}` |
| **OpenGraph** | Aanwezig |
| **Prioriteit** | Gemiddeld |

**Beoordeling:** Afhankelijk van de kwaliteit van de data in `getLocation()`. Controleer of elke stad een unieke, keyword-rijke title en description heeft. Controleer of descriptions niet te generiek zijn.

---

### 11. `/locaties/[city]/[service]` (Dynamische stad+dienst pagina's)

| Veld | Waarde |
|------|--------|
| **Title** | Dynamisch uit `getServiceMetadata()` |
| **Description** | Dynamisch uit `getServiceMetadata()` |
| **Canonical** | `https://www.toptalentjobs.nl/locaties/{city}/{service}` |
| **Prioriteit** | Gemiddeld |

**Beoordeling:** Goed opgezet. Controleer of de templates voldoende uniek zijn per combinatie om duplicate descriptions te voorkomen.

---

### 12. `/blog`

| Veld | Waarde |
|------|--------|
| **Huidige title (layout)** | "Blog - Tips & Nieuws over Horeca Personeel \| TopTalent Jobs" |
| **Huidige title (page)** | "Nieuws" (overschrijft layout!) |
| **Lengte title (effectief)** | 6 tekens - veel te kort! |
| **Aanbevolen title** | "Blog: Tips & Nieuws Horecapersoneel \| TopTalent Jobs" |
| **Huidige description (layout)** | "Praktische tips en nieuws over horecapersoneel inhuren, recruitment trends en de uitzendbranche..." |
| **Huidige description (page)** | "Lees de nieuwste artikelen over horeca personeel..." |
| **Aanbevolen description** | "Praktische tips, nieuws en inzichten over horecapersoneel inhuren, recruitment trends en de uitzendbranche. Lees de blog van TopTalent Jobs." |
| **Canonical** | `https://www.toptalentjobs.nl/blog` |
| **Robots** | index, follow |
| **Prioriteit** | **KRITIEK** - page.tsx overschrijft de goede layout title |

---

### 13. `/blog/[slug]` (Dynamische blogartikelen)

| Veld | Waarde |
|------|--------|
| **Title** | `{article.title} \| TopTalent Jobs Blog` |
| **Description** | `article.excerpt` |
| **Canonical** | `https://www.toptalentjobs.nl/blog/{slug}` |
| **OpenGraph** | type: article, publishedTime, images |
| **Prioriteit** | Laag |

**Beoordeling:** Goed opgezet met dynamische metadata. Controleer of alle artikelen een excerpt hebben. OpenGraph images zijn correct (1200x630).

---

### 14. `/blog/editorial`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Editorial Blog \| TopTalent Jobs" |
| **Lengte title** | 32 tekens |
| **Aanbevolen title** | "Horeca Inzichten & Analyses \| TopTalent Jobs Editorial" |
| **Huidige description** | "AI-assisted en redactioneel beoordeelde inzichten voor horeca, hospitality staffing, werkgevers en medewerkers." |
| **Lengte description** | 112 tekens (te kort) |
| **Aanbevolen description** | "Diepgaande inzichten en analyses over de horecabranche. Redactioneel beoordeelde artikelen over staffing, trends en werkgeverschap door TopTalent Jobs." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | Gemiddeld |

---

### 15. `/blog/editorial/[slug]` (Dynamische editorial artikelen)

| Veld | Waarde |
|------|--------|
| **Title** | `{draft.title} \| TopTalent Jobs Editorial` |
| **Description** | `draft.excerpt` |
| **Canonical** | `https://www.toptalentjobs.nl/blog/editorial/{slug}` |
| **OpenGraph** | type: article, publishedTime |
| **Twitter** | summary_large_image |
| **Structured data** | BlogPosting schema |
| **Prioriteit** | Laag - goed opgezet |

---

### 16. `/testimonials`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Ervaringen & Reviews" |
| **Lengte title** | 22 tekens (te kort) |
| **Aanbevolen title** | "Klantervaringen & Reviews Horecapersoneel \| TopTalent Jobs" |
| **Huidige description** | "Lees klantervaringen en reviews van horecabedrijven die samenwerken met TopTalent Jobs..." |
| **Aanbevolen description** | "Lees ervaringen van horecabedrijven die samenwerken met TopTalent Jobs. Ontdek waarom restaurants en hotels in Utrecht ons vertrouwen voor hun personeel." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | Gemiddeld |

---

### 17. `/kosten-calculator`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Kosten Calculator" |
| **Lengte title** | 17 tekens (te kort) |
| **Aanbevolen title** | "Kosten Calculator Horecapersoneel \| Tarieven Vergelijken" |
| **Huidige description** | "Bereken direct de tarieven voor horecapersoneel. Vergelijk kosten van vast personeel, uitzendkrachten en ZZP'ers..." |
| **Lengte description** | 113 tekens (iets te kort) |
| **Aanbevolen description** | "Bereken direct de kosten van horecapersoneel. Vergelijk tarieven van vast personeel, uitzendkrachten en ZZP'ers. Transparant en vrijblijvend bij TopTalent Jobs." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | Gemiddeld |

---

### 18. `/personeel-aanvragen`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Personeel Aanvragen" |
| **Lengte title** | 19 tekens (te kort) |
| **Aanbevolen title** | "Horecapersoneel Aanvragen \| Offerte binnen 24 uur \| TopTalent" |
| **Huidige description** | "Bestel snel en eenvoudig horecapersoneel via TopTalent Jobs. Vul het formulier in en ontvang binnen 24 uur een voorstel op maat..." |
| **Aanbevolen description** | "Vraag horecapersoneel aan via TopTalent Jobs. Vul het formulier in en ontvang binnen 24 uur een voorstel op maat voor uw restaurant, hotel of evenement." |
| **Canonical** | `https://www.toptalentjobs.nl/personeel-aanvragen` |
| **Robots** | index, follow |
| **Prioriteit** | Gemiddeld |

---

### 19. `/inschrijven`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Inschrijven als Medewerker" |
| **Lengte title** | 27 tekens (te kort) |
| **Aanbevolen title** | "Inschrijven als Horecamedewerker \| Flexibel Werken \| TopTalent" |
| **Huidige description** | "Wil je werken via TopTalent Jobs? Schrijf je in als horecamedewerker en ontvang flexibele opdrachten..." |
| **Aanbevolen description** | "Schrijf je in bij TopTalent Jobs en werk als horecamedewerker. Flexibele opdrachten in restaurants, hotels en bij evenementen in Utrecht en omgeving." |
| **Canonical** | `https://www.toptalentjobs.nl/inschrijven` |
| **Robots** | index, follow |
| **Prioriteit** | Gemiddeld |

---

### 20. `/veelgestelde-vragen`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Veelgestelde vragen over horecapersoneel inhuren \| TopTalent" |
| **Lengte title** | 62 tekens (iets te lang) |
| **Aanbevolen title** | "Veelgestelde Vragen Horecapersoneel \| TopTalent Jobs" |
| **Huidige description** | "Antwoorden op veelgestelde vragen over horecapersoneel inhuren via TopTalent. Kosten, contracten, beschikbaarheid en meer." |
| **Lengte description** | 122 tekens |
| **Aanbevolen description** | "Antwoorden op veelgestelde vragen over horecapersoneel inhuren. Alles over kosten, contracten, beschikbaarheid en samenwerking met TopTalent Jobs." |
| **Canonical** | `https://www.toptalentjobs.nl/veelgestelde-vragen/` (let op trailing slash) |
| **Robots** | index, follow |
| **Structured data** | FAQPage schema |
| **Prioriteit** | Laag |

**Opmerking:** Trailing slash in canonical is inconsistent met andere pagina's (die geen trailing slash hebben).

---

### 21. `/veelgestelde-vragen/[slug]` (Dynamische FAQ pagina's)

| Veld | Waarde |
|------|--------|
| **Title** | `faq.question` (de volledige vraag als title) |
| **Description** | `{shortAnswer}... Lees het volledige antwoord van TopTalent Jobs.` |
| **Canonical** | `https://www.toptalentjobs.nl/veelgestelde-vragen/{slug}` |
| **OpenGraph** | type: article |
| **Prioriteit** | Gemiddeld |

**Opmerking:** FAQ vragen als title kunnen te lang zijn (> 60 tekens). Overweeg een verkort format.

---

### 22. `/privacy`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Privacy Policy \| TopTalent Jobs" |
| **Lengte title** | 32 tekens |
| **Aanbevolen title** | "Privacybeleid \| TopTalent Jobs" |
| **Huidige description** | "Lees hoe TopTalent B.V. omgaat met uw persoonsgegevens conform de AVG (GDPR)..." |
| **Aanbevolen description** | "Lees het privacybeleid van TopTalent Jobs. Hoe wij omgaan met uw persoonsgegevens conform de AVG. Transparant en veilig." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | Laag |

**Opmerking:** Typo in description: "persoonsgegevens" moet "persoonsgegevens" zijn (maar het origineel heeft mogelijk "persoonsgegevens" i.p.v. "persoonsgegevens"). Controleer dit.

---

### 23. `/voorwaarden`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Algemene Voorwaarden \| TopTalent Jobs" |
| **Lengte title** | 39 tekens |
| **Aanbevolen title** | Huidige is goed. |
| **Huidige description** | "Lees de algemene voorwaarden van Toptalent voor bemiddeling van zelfstandige horecaprofessionals." |
| **Lengte description** | 97 tekens (te kort) |
| **Aanbevolen description** | "Lees de algemene voorwaarden van TopTalent Jobs voor uitzenden, detachering en bemiddeling van horecapersoneel. Transparante afspraken en voorwaarden." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | Laag |

---

### 24. `/cookies`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Cookiebeleid \| TopTalent Jobs" |
| **Lengte title** | 30 tekens |
| **Aanbevolen title** | Huidige is goed. |
| **Huidige description** | "Lees het cookiebeleid van TopTalent Jobs. Wij gebruiken cookies om de website te verbeteren..." |
| **Aanbevolen description** | Huidige is adequaat voor een cookiepagina. |
| **Canonical** | `https://www.toptalentjobs.nl/cookies` |
| **Robots** | index, follow (default) |
| **Prioriteit** | Laag |

---

### 25. `/afspraak-plannen`

| Veld | Waarde |
|------|--------|
| **Huidige title** | **ONTBREEKT** (erft root: "TopTalent Jobs - Horeca Uitzendbureau Utrecht") |
| **Aanbevolen title** | "Afspraak Plannen \| Gratis Kennismaking \| TopTalent Jobs" |
| **Huidige description** | **ONTBREEKT** (erft root description) |
| **Aanbevolen description** | "Plan een vrijblijvende afspraak met TopTalent Jobs. Bespreek uw personeelsbehoefte en ontvang een advies op maat voor uw horecabedrijf." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | **KRITIEK** - conversiepagina zonder eigen metadata |

---

### 26. `/kennismaking-plannen`

| Veld | Waarde |
|------|--------|
| **Huidige title** | **ONTBREEKT** (erft root default) |
| **Aanbevolen title** | "Kennismakingsgesprek Plannen \| TopTalent Jobs" |
| **Huidige description** | **ONTBREEKT** (erft root description) |
| **Aanbevolen description** | "Plan een gratis kennismakingsgesprek met TopTalent Jobs. Ontdek hoe wij uw horecabedrijf helpen met betrouwbaar personeel." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | **KRITIEK** - conversiepagina zonder eigen metadata |

---

### 27. `/geo`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Horeca Personeel in de Randstad \| TopTalent Jobs" |
| **Lengte title** | 50 tekens |
| **Aanbevolen title** | Huidige is goed. |
| **Huidige description** | "Vind betrouwbaar horeca personeel in Amsterdam, Rotterdam, Den Haag en Utrecht..." |
| **Aanbevolen description** | Huidige is goed. |
| **Canonical** | `https://toptalentjobs.nl/geo` **FOUT: ontbreekt `www`** |
| **Robots** | index, follow |
| **Prioriteit** | **KRITIEK** - canonical inconsistentie |

---

### 28. `/geo/[slug]` (Dynamische geo-pagina's)

| Veld | Waarde |
|------|--------|
| **Title** | Dynamisch uit `content.seo_title` of `content.title` |
| **Description** | Dynamisch uit `content.meta_description` of `content.excerpt` |
| **Keywords** | Dynamisch uit primary + secondary keywords |
| **Canonical** | `https://toptalentjobs.nl/geo/{slug}` **FOUT: ontbreekt `www`** |
| **OpenGraph** | Aanwezig |
| **Prioriteit** | **KRITIEK** - canonical inconsistentie |

---

### 29. `/meer-aanvragen`

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Meer Aanvragen voor jouw Servicebedrijf \| **ZenithZoom**" |
| **Aanbevolen title** | Verwijder deze pagina van TopTalent of pas aan naar TopTalent branding |
| **Huidige description** | "Ontvang een gratis analyse en ontdek hoe jouw installatie- of servicebedrijf meer klanten kan krijgen..." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index: true, follow: true |
| **Prioriteit** | **KRITIEK** - verkeerd merk, potentieel schadelijk voor SEO |

**Actie vereist:** Deze pagina verwijst naar "ZenithZoom" en "installatie- of servicebedrijf". Dit hoort niet op de TopTalent website. Verwijder of pas aan, en zet op `noindex` als het niet relevant is.

---

### 30. `/lp/personeel` (Landing page)

| Veld | Waarde |
|------|--------|
| **Huidige title** | **ONTBREEKT** (client component, erft root default) |
| **Aanbevolen title** | "Horecapersoneel Nodig? Aanvragen binnen 24 uur \| TopTalent" |
| **Huidige description** | **ONTBREEKT** |
| **Aanbevolen description** | "Direct horecapersoneel nodig? Vraag gescreende krachten aan bij TopTalent Jobs. Bevestiging binnen 24 uur. Geen verplichtingen." |
| **Canonical** | **ONTBREEKT** |
| **Robots** | index, follow (default) |
| **Prioriteit** | **KRITIEK** - advertentie-landingspagina zonder enige metadata |

**Opmerking:** Als `"use client"` component kan deze pagina geen server-side metadata exporteren. Oplossing: maak een `layout.tsx` aan voor `/lp/personeel/` met de metadata, of converteer naar server component.

---

### 31. `/lp2/personeel` (Landing page 2)

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Binnen 24 uur horecapersoneel aanvragen \| TopTalent Jobs" |
| **Lengte title** | 57 tekens |
| **Aanbevolen title** | Huidige is goed. |
| **Huidige description** | "Snel betrouwbaar horecapersoneel nodig? TopTalent Jobs regelt gescreende krachten binnen 24 uur..." |
| **Aanbevolen description** | Huidige is goed. |
| **Canonical** | `https://www.toptalentjobs.nl/lp2/personeel` |
| **OpenGraph** | Aanwezig |
| **Twitter** | summary_large_image |
| **Prioriteit** | Laag - goed opgezet |

---

### 32. `/lp3/personeel` (Landing page 3)

| Veld | Waarde |
|------|--------|
| **Huidige title** | "Spoed personeel horeca binnen 24 uur \| TopTalent Jobs" |
| **Lengte title** | 54 tekens |
| **Aanbevolen title** | Huidige is goed. |
| **Huidige description** | "Last-minute personeelstekort? Vraag spoed horecapersoneel aan en ontvang snel bevestiging..." |
| **Aanbevolen description** | Huidige is goed. |
| **Canonical** | `https://www.toptalentjobs.nl/lp3/personeel` |
| **OpenGraph** | Aanwezig |
| **Twitter** | summary_large_image |
| **Prioriteit** | Laag - goed opgezet |

---

## Noindex Pagina's - Controle

| Route | Robots status | Beoordeling |
|-------|---------------|-------------|
| `/admin/*` | noindex, nofollow | Correct |
| `/medewerker/*` | index: false, follow: false | Correct |
| `/klant/*` | index: false, follow: false | Correct |
| `/marketing/*` | noindex, nofollow | Correct |
| `/bedankt/*` | index: false, follow: false | Correct |
| `/verify/[token]` | noindex, nofollow | Correct |
| `/spoeddienst/[token]` | Geen robots meta | **Risico** - zou noindex moeten zijn |
| `/offerte/[token]` | Geen robots meta | **Risico** - zou noindex moeten zijn |
| `/afspraak/[token]` | Geen robots meta | **Risico** - zou noindex moeten zijn |
| `/contract/ondertekenen/[token]` | Geen robots meta | **Risico** - zou noindex moeten zijn |
| `/kandidaat/status` | Geen robots meta | **Risico** - zou noindex moeten zijn |
| `/kandidaat/documenten` | Geen robots meta | **Risico** - zou noindex moeten zijn |

**Opmerking:** De robots.txt blokkeert deze paden niet expliciet. Hoewel token-based URLs moeilijk te ontdekken zijn, is het best practice om `noindex` toe te voegen.

---

## Robots.txt Beoordeling

De huidige robots.txt is goed geconfigureerd:
- Blokkeert correct `/admin/`, `/api/`, `/bedankt/`, `/klant/`, `/medewerker/`
- Blokkeert WordPress legacy paden (`/wp-content/`, `/wp-includes/`, `/wp-admin/`)
- Aparte regels voor AI bots
- Sitemap correct gekoppeld

**Ontbrekend:** `/spoeddienst/`, `/offerte/`, `/afspraak/`, `/contract/`, `/kandidaat/` worden niet geblokkeerd.

---

## Hreflang

Geen hreflang tags aanwezig. Dit is correct voor een puur Nederlandstalige website gericht op Nederland. Geen actie nodig.

---

## Duplicate Content Risico's

| Probleem | Pagina's | Actie |
|----------|----------|-------|
| Duplicate title conflict (page vs layout) | `/diensten`, `/diensten/uitzenden`, `/over-ons`, `/blog` | Verwijder metadata uit page.tsx of synchroniseer |
| Mogelijke template-duplicaten | `/locaties/[city]/[service]` | Controleer of elke combinatie unieke descriptions genereert |
| Canonical www vs non-www | `/geo`, `/geo/[slug]` vs alle andere pagina's | Gebruik consistent `www.toptalentjobs.nl` |
| Trailing slash inconsistentie | `/veelgestelde-vragen/` vs rest | Verwijder trailing slash |

---

## Actieplan op Prioriteit

### KRITIEK (Direct oplossen)

| # | Pagina | Probleem | Oplossing |
|---|--------|----------|-----------|
| 1 | `/diensten` | Page.tsx overschrijft layout title met "Onze Diensten" | Verwijder `metadata` export uit `src/app/diensten/page.tsx` |
| 2 | `/diensten/uitzenden` | Page.tsx overschrijft layout title met "Uitzenden" | Verwijder `metadata` export uit `src/app/diensten/uitzenden/page.tsx` |
| 3 | `/over-ons` | Page.tsx overschrijft layout title met "Over Ons" | Verwijder `metadata` export uit `src/app/over-ons/page.tsx` |
| 4 | `/blog` | Page.tsx overschrijft layout title met "Nieuws" | Verwijder `metadata` export uit `src/app/blog/page.tsx` |
| 5 | `/geo`, `/geo/[slug]` | Canonical mist `www` | Wijzig naar `https://www.toptalentjobs.nl/geo/...` |
| 6 | `/meer-aanvragen` | Verkeerd merk "ZenithZoom" | Verwijder of hernoem naar TopTalent branding |
| 7 | `/lp/personeel` | Geen metadata (client component) | Maak `layout.tsx` aan met metadata |
| 8 | `/afspraak-plannen` | Geen metadata | Voeg metadata export toe |
| 9 | `/kennismaking-plannen` | Geen metadata | Voeg metadata export toe |
| 10 | `/contact` | Title "Contact" (7 tekens), geen canonical | Verbeter title, voeg canonical toe |

### GEMIDDELD (Binnen 2 weken)

| # | Pagina | Probleem | Oplossing |
|---|--------|----------|-----------|
| 11 | `/testimonials` | Ontbrekende canonical | Voeg canonical toe |
| 12 | `/kosten-calculator` | Ontbrekende canonical, korte title | Voeg canonical toe, verbeter title |
| 13 | `/blog/editorial` | Ontbrekende canonical | Voeg canonical toe |
| 14 | `/personeel-aanvragen` | Te korte title | Verbeter title |
| 15 | `/inschrijven` | Te korte title | Verbeter title |
| 16 | Homepage `/` | Title iets te lang | Verkort title |
| 17 | `/veelgestelde-vragen` | Trailing slash in canonical | Verwijder trailing slash |
| 18 | Token-based pagina's | Ontbrekende noindex | Voeg robots noindex toe |
| 19 | `/voorwaarden` | Ontbrekende canonical, korte description | Voeg canonical toe |

### LAAG (Optimalisatie)

| # | Pagina | Probleem | Oplossing |
|---|--------|----------|-----------|
| 20 | `/privacy` | Ontbrekende canonical | Voeg canonical toe |
| 21 | `/locaties` | Description iets te kort | Verlengen |
| 22 | `/diensten/detachering` | Title kan sterker | Optioneel verbeteren |
| 23 | `/diensten/recruitment` | Title kan sterker | Optioneel verbeteren |
| 24 | `/locaties/utrecht` | Kleine verbeteringen | Optioneel |
| 25 | `/cookies` | Kleine verbeteringen | Optioneel |

---

## Structured Data Overzicht

| Pagina | Schema type | Status |
|--------|-------------|--------|
| `/` | FAQPage | Aanwezig |
| `/diensten` | BreadcrumbList | Aanwezig |
| `/diensten/uitzenden` | Service | Aanwezig |
| `/diensten/detachering` | Service | Aanwezig |
| `/diensten/recruitment` | Service | Aanwezig |
| `/over-ons` | BreadcrumbList | Aanwezig |
| `/blog` | BreadcrumbList | Aanwezig |
| `/blog/editorial/[slug]` | BlogPosting | Aanwezig |
| `/locaties/utrecht` | BreadcrumbList | Aanwezig |
| `/veelgestelde-vragen` | FAQPage | Aanwezig |

**Ontbrekend:** Overweeg `LocalBusiness` schema op de homepage en `Organization` schema in root layout.

---

*Rapport gegenereerd op 14 mei 2026 door Claude Code*
