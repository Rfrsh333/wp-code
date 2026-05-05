# AVG / EU AI-Act Compliance Audit — Hoofdrapport
## TopTalent B.V. | 22 april 2026

**Versie:** 1.0
**Status:** Inventarisatie + gap-analyse (geen juridisch advies)
**Uitvoerder:** Geautomatiseerde code-analyse
**Scope:** Next.js applicatie (toptalent-wordpress-html), alle API-routes, database-schema's, externe integraties

---

## Executive Summary

TopTalent B.V. opereert een recruitment-platform met **12 AI-agents** (waaronder kandidaat-screening), **12 externe verwerkers**, en verwerkt persoonsgegevens van kandidaten, medewerkers, klanten en leads. De privacydocumentatie is **uitgebreid en van goede kwaliteit**, maar er zijn **kritieke discrepanties** tussen wat gedocumenteerd is en wat technisch gebeurt.

### Rode draad:
1. **De AI-screening agent kwalificeert waarschijnlijk als high-risk onder de EU AI-Act** — compliance-deadline is 2 augustus 2026 (15 maanden)
2. **PII wordt niet-geanonimiseerd naar OpenAI, Telegram en Sentry gestuurd** — dit zijn de drie urgentste technische fixes
3. **De privacyverklaring stelt dat geen geautomatiseerde besluitvorming plaatsvindt** — dit is feitelijk onjuist en moet onmiddellijk gecorrigeerd worden
4. **Toestemming wordt niet opgeslagen in de database** — niet aantoonbaar bij controle

---

## Deelrapporten

| Document | Locatie |
|----------|---------|
| Data-inventaris (Art. 30) | [`avg/data-inventaris.md`](avg/data-inventaris.md) |
| Verwerkers-register (Art. 28) | [`avg/verwerkers-register.md`](avg/verwerkers-register.md) |
| AI-Act classificatie | [`avg/ai-act-classificatie.md`](avg/ai-act-classificatie.md) |
| Informatieplicht & rechten | [`avg/informatieplicht-en-rechten.md`](avg/informatieplicht-en-rechten.md) |
| DPIA-scope (Art. 35) | [`avg/dpia-scope.md`](avg/dpia-scope.md) |

---

## Actielijst — gerangschikt op urgentie

### CRITICAL — Onmiddellijke actie vereist (1-2 weken)

| # | Actie | Reden | Verantwoordelijk |
|---|-------|-------|------------------|
| C1 | **Zet Sentry `sendDefaultPii: false`** en voeg `beforeSend` PII-filter toe | Alle PII wordt automatisch naar Sentry gestuurd inclusief lokale variabelen | Ontwikkelaar |
| C2 | **Verwijder PII uit alle Telegram-alerts** — alleen ID's of generieke berichten | Namen, emails, telefoonnummers in onbeveiligd kanaal zonder DPA | Ontwikkelaar |
| C3 | **Corrigeer privacyverklaring** — verwijder claim "geen geautomatiseerde besluitvorming"; vermeld AI-screening | Feitelijk onjuiste informatie = schending Art. 13 AVG | Juridisch + ontwikkelaar |
| C4 | **Sla toestemming op in database** — voeg `toestemming_timestamp`, `consent_version`, `consent_ip` toe aan `inschrijvingen` | Toestemming niet aantoonbaar = schending Art. 7 AVG | Ontwikkelaar |
| C5 | **Anonimiseer PII vóór verzending naar OpenAI** — vervang naam door "Kandidaat #ID", verwijder leeftijd | Volledige naam + leeftijd naar VS-verwerker zonder noodzaak | Ontwikkelaar |

### HIGH — Korte termijn (2-4 weken)

| # | Actie | Reden |
|---|-------|-------|
| H1 | **Verifieer en onderteken DPA's** met alle verwerkers (Supabase, OpenAI, Resend, Sentry, Vercel, Upstash, LinkedIn) | Art. 28 AVG — verwerkersovereenkomsten verplicht |
| H2 | **Documenteer Transfer Impact Assessment (TIA)** voor VS-transfers (OpenAI, Resend, Vercel, Google) | Art. 46 AVG — doorgifte-waarborgen |
| H3 | **Informeer kandidaten over AI-gebruik** — in registratieflow en/of bevestigingsmail | Art. 13.2.f AVG + Art. 13 AI-Act |
| H4 | **Start DPIA** voor AI-screening flow | Art. 35 AVG — verplicht bij profilering met significante gevolgen |
| H5 | **Update privacyverklaring** — voeg OpenAI, Telegram, Sentry toe als ontvangers | Art. 13.1.e AVG |
| H6 | **Implementeer data subject request flow** — minimaal formulier + intern process | Art. 15-22 AVG — rechten van betrokkenen |
| H7 | **Formaliseer menselijk toezicht bij AI-screening** — verplichte review, log afwijkingen | Art. 14 AI-Act + Art. 22 AVG |
| H8 | **AI-geletterdheid training voor admins** | Art. 4 AI-Act — al verplicht sinds 2 feb 2025 |

### MEDIUM — Middellange termijn (1-3 maanden)

| # | Actie | Reden |
|---|-------|-------|
| M1 | Gate Vercel Analytics achter cookie-consent OF documenteer als functioneel | ePrivacy-richtlijn |
| M2 | Implementeer automatische dataverwijdering na bewaartermijnen (cron-job) | Art. 5.1.e AVG — opslagbeperking |
| M3 | Test AI-screening op discriminatie-bias (leeftijd, geslacht, afkomst) | Art. 10 AI-Act + Wet gelijke behandeling |
| M4 | Stel technische documentatie op voor AI-screening (Art. 11 AI-Act) | Verplicht voor high-risk systemen |
| M5 | Implementeer uitgebreide AI-logging (prompt, model, versie, initiator) | Art. 12 AI-Act |
| M6 | Maak cookie-consent granulair (analytics vs. marketing apart) | Best practice AP |
| M7 | Definieer bewaartermijn voor AI-screeningdata | Art. 5.1.e AVG |
| M8 | Verifieer Supabase datacenter-locatie (EU vs. VS) | Art. 44-49 AVG |
| M9 | Verifieer Sentry en Upstash regio-instellingen | Art. 44-49 AVG |
| M10 | Beoordeel of lead-scoring agent ook high-risk is (als het leidt tot uitsluiting) | AI-Act Annex III |

### LOW — Lange termijn (3-6 maanden)

| # | Actie | Reden |
|---|-------|-------|
| L1 | Implementeer data-export (dataportabiliteit) voor betrokkenen | Art. 20 AVG |
| L2 | Bouw "verwijder account" functionaliteit in portalen | Art. 17 AVG |
| L3 | Voer interne conformiteitsbeoordeling uit (AI-Act Art. 43 + Annex VI) | Deadline: 2 aug 2026 |
| L4 | Registreer AI-systeem in EU-database (Art. 49 AI-Act) | Verplicht voor high-risk |
| L5 | Implementeer consent-verlooptijd (12 maanden hernieuwing) | Best practice |
| L6 | Overweeg FG-aanstelling | `LEGAL_REVIEW_REQUIRED` |

---

## LEGAL_REVIEW_REQUIRED — Vragen voor jurist

| # | Vraag | Context |
|---|-------|---------|
| LR1 | **Kwalificeert de kandidaat-screening als high-risk AI-systeem onder Annex III punt 4(a)?** | Systeem screent sollicitanten met OpenAI; scoort 1-10; admin neemt eindbeslissing |
| LR2 | **Is Art. 22 AVG (geautomatiseerde besluitvorming) van toepassing?** | AI-score beïnvloedt selectie substantieel, ook al drukt admin op de knop |
| LR3 | **Is gerechtvaardigd belang voldoende grondslag voor AI-screening, of is expliciete toestemming vereist?** | Huidige grondslag niet expliciet gedocumenteerd |
| LR4 | **Is een FG (Functionaris Gegevensbescherming) verplicht?** | AI-screening op schaal + profilering van kandidaten |
| LR5 | **Kwalificeert een digitale handtekening (PNG) als biometrisch gegeven (Art. 9)?** | Handtekening opgeslagen als base64 PNG met SHA-256 hash |
| LR6 | **Is reCAPTCHA v3 "technisch noodzakelijk" (geen consent vereist)?** | Laadt op formulierpagina's zonder expliciete consent |
| LR7 | **Mag Vercel Analytics zonder consent als "strikt noodzakelijk"?** | Vercel claimt cookieloos, maar stuurt data naar VS |
| LR8 | **Is de huidige Telegram-integratie een datalek (Art. 33)?** | PII structureel naar platform zonder DPA |
| LR9 | **Zijn de bestaande bewaartermijnen in de privacyverklaring juridisch correct?** | Afgewezen kandidaten 4 weken, pool 2 jaar, dienstverband 2 jaar na einde |
| LR10 | **Is de lead-acquisitie (scraping van LinkedIn/Facebook) AVG-conform?** | Leads verzameld van platforms zonder directe toestemming betrokkene |
| LR11 | **Moet TopTalent zich registreren als "gebruiksverantwoordelijke" (deployer) onder de AI-Act?** | TopTalent gebruikt OpenAI als dienst maar configureert de prompts |
| LR12 | **Zijn Standard Contractual Clauses (SCC's) voldoende voor de OpenAI-transfer, of zijn aanvullende maatregelen nodig?** | Post-Schrems II: SCC's alleen zijn mogelijk onvoldoende |

---

## One-pager samenvatting

### TOP-3 Juridische risico's

1. **AI-screening zonder transparantie of conformiteit** — Privacyverklaring ontkent AI-gebruik; kandidaten niet geïnformeerd; geen DPIA; geen AI-Act compliance. Risico: AP-boete + AI-Act boete (tot 3% jaaromzet).

2. **PII naar Telegram zonder DPA** — Structurele overdracht van namen, emails en telefoonnummers naar platform zonder verwerkersovereenkomst. Risico: kwalificeert mogelijk als onbeveiligd datalek (Art. 33).

3. **Toestemming niet aantoonbaar** — Consent-checkbox wordt gevalideerd maar niet opgeslagen. Bij AP-controle niet bewijsbaar dat toestemming is verkregen (Art. 7).

### TOP-3 Quick wins

1. **Sentry `sendDefaultPii: false`** — Eén regel code wijzigen in twee bestanden. Stopt onmiddellijk PII-lekkage naar error tracking.

2. **Verwijder PII uit Telegram-berichten** — Vervang namen/emails door "Nieuwe inschrijving ontvangen — bekijk in dashboard". ~10 bestanden aanpassen.

3. **Sla toestemming op** — Voeg `toestemming_timestamp` toe aan insert-payload in registratie-API. Eén migratiebestand + één API-wijziging.

### TOP-3 Vragen voor jurist

1. Is de AI-screening high-risk onder de AI-Act? (Waarschijnlijk ja, maar juridische bevestiging nodig)
2. Is Art. 22 AVG van toepassing ondanks menselijke eindbeslissing?
3. Is de Telegram-PII-overdracht meldingsplichtig als datalek bij de AP?

---

## Methodologie

- **Read-only analyse** van productie-codebase (geen wijzigingen aangebracht)
- 48 Supabase-migratiebestanden geanalyseerd
- 197 API-routes geïnventariseerd
- 12 AI-agents volledig gelezen en beoordeeld
- Privacyverklaring, voorwaarden, cookie-banner volledig geaudit
- Externe verwerkers geïdentificeerd op basis van code-imports en environment variables
- **Geen PII letterlijk opgenomen** in dit rapport

## Disclaimer

Dit rapport is een technische inventarisatie en gap-analyse op basis van code-analyse. Het is **geen juridisch advies**. Alle conclusies over juridische kwalificatie zijn gemarkeerd met `LEGAL_REVIEW_REQUIRED` en moeten worden beoordeeld door een gekwalificeerd jurist met expertise in AVG en EU AI-Act.
