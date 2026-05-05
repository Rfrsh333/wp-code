# Fase 4 — Inplanning-blockers check

**Datum:** 2026-04-22

---

## Vraag: Kan een medewerker met verlopen documenten worden ingepland?

### Antwoord: GEDEELTELIJK — alleen auto-matching blokkeert, handmatige toewijzing NIET

---

## Matching-flow analyse

### Stap 1: Auto-matching (via MatchingTab)
**Bestand:** `src/lib/matching.ts:226-238`

```typescript
// C-23: Haal verlopen ID-bewijzen op voor blokkering
const { data: verlopenDocs } = await supabaseAdmin
  .from("medewerker_documenten")
  .select("medewerker_id, expiry_date")
  .eq("document_type", "id_bewijs")
  .lt("expiry_date", new Date().toISOString().split("T")[0]);

const verlopenIDSet = new Set((verlopenDocs || []).map((d) => d.medewerker_id));

// Filter verlopen ID-bewijzen UIT
const matches = medewerkers
  .filter((m) => !alAangemeldIds.has(m.id))
  .filter((m) => !verlopenIDSet.has(m.id))  // <-- BLOCKER
```

**Wat werkt:**
- Medewerkers met verlopen `id_bewijs` worden gefilterd uit auto-matching
- Compliance-blokkade (C-11/C-12) voor leeftijd + alcoholwet + nachtwerk

**Wat NIET gecontroleerd wordt in matching:**
| Check | Status | Impact |
|-------|--------|--------|
| Verlopen ID-bewijs | GEBLOKKEERD | Goed |
| Verlopen werkvergunning | **NIET GECONTROLEERD** | CRITICAL — boete EUR 8k |
| Verlopen VOG | **NIET GECONTROLEERD** | HIGH — inlener-eis |
| Verlopen BHV-certificaat | **NIET GECONTROLEERD** | MEDIUM — Arbo-risico |
| Verlopen certificeringen | **NIET GECONTROLEERD** | MEDIUM |
| VSH voor bar-functies | **CODE BESTAAT maar NIET AANGEROEPEN** | HIGH — Drank- en Horecawet |
| Leeftijd <18 + bar | GEBLOKKEERD (C-11) | Goed |
| Leeftijd <18 + nachtwerk | GEBLOKKEERD (C-12) | Goed |

### Stap 2: Medewerker zelf-aanmelding (via shifts/beschikbaar)
**Bestand:** `src/app/api/medewerker/diensten/route.ts` (POST, action="aanmelden")

**GEEN document-checks.** Medewerker kan zich aanmelden voor elke dienst waarvoor plekken beschikbaar zijn, ongeacht documentstatus.

### Stap 3: Handmatige toewijzing (via PlanningTab)
**Bestand:** `src/components/admin/PlanningTab.tsx:170-180`

```typescript
const beschikbareMedewerkers = medewerkers.filter(m => {
  if (!selectedDienst) return false;
  const passendefunctie = m.functie?.includes(selectedDienst.functie);
  if (!passendefunctie) return false;
  const reedsToegewezen = aanmeldingen.some(
    a => a.medewerker_id === m.id && a.status === "geaccepteerd"
  );
  return !reedsToegewezen;
});
```

**GEEN document-checks.** Admin ziet alle medewerkers met passende functie, ook als hun ID verlopen is.

### Stap 4: Acceptatie door medewerker
**Bestand:** `src/app/api/medewerker/diensten/accept/route.ts`

**GEEN document-checks.** Status wordt direct naar "bevestigd" gezet.

---

## Compliance-blokkades die WEL werken

| Check | Locatie | Hoe | Ernst bij falen |
|-------|---------|-----|-----------------|
| **C-11: Alcoholwet** | `arbeidstijden.ts:138-145` | Leeftijd <18 + bar/tap → geblokkeerd | Boete |
| **C-12: Nachtwerk <18** | `arbeidstijden.ts:147-159` | Leeftijd <18 + na 23:00 → geblokkeerd | Boete |
| **C-14: Max dienst 12u** | `arbeidstijden.ts:191-214` | Netto uren >12 → melding | Boete |
| **C-15: Pauze-validatie** | `arbeidstijden.ts:245-275` | >5.5u zonder 30min pauze → melding | Boete |
| **C-23: Verlopen ID** | `matching.ts:226-238` | Verlopen id_bewijs → niet in matching | Boete |

## Compliance-blokkades die ONTBREKEN

| Check | Waar zou het moeten? | Ernst |
|-------|----------------------|-------|
| **Werkvergunning verlopen** | `matching.ts` filter + PlanningTab + zelf-aanmelding | **CRITICAL** — WAV-boete EUR 8k |
| **VSH niet geldig bij bar** | `matching.ts` calculateMatchScore | **HIGH** — Drank- en Horecawet |
| **Blokkade bij zelf-aanmelding** | `/api/medewerker/diensten` POST | **HIGH** — bypass auto-matching |
| **Blokkade bij handmatige toewijzing** | PlanningTab filter | **HIGH** — admin-bypass |
| **Blokkade bij acceptatie** | `/api/medewerker/diensten/accept` POST | **MEDIUM** — laatste vangnet |

---

## Horeca-specifieke checks

### Minderjarigen + alcohol-bediening
- **Status:** GEIMPLEMENTEERD (C-11)
- Medewerkers <18 kunnen niet worden gematcht op bar/bartender/barista/tap functies
- Check zit in `valideerLeeftijdVoorDienst()` die wordt aangeroepen in `calculateMatchScore()`

### Minderjarigen + nachtwerk
- **Status:** GEIMPLEMENTEERD (C-12)
- Medewerkers <18 kunnen niet werken na 23:00 of voor 06:00
- Check zit in `valideerLeeftijdVoorDienst()`

### VSH/SVH-vereiste bij bar-functies
- **Status:** CODE BESTAAT, NIET AANGEROEPEN
- Functie `valideerVSHVoorFunctie()` bestaat in `arbeidstijden.ts:168-180`
- Wordt NERGENS aangeroepen in de matching-flow
- **Risico:** Medewerker zonder SVH kan worden ingezet op bar-functie

---

## Samenvatting risico's

| Ernst | Gap | Scenario |
|-------|-----|----------|
| **CRITICAL** | Werkvergunning niet gecheckt bij inplanning | Niet-EU medewerker met verlopen TWV wordt ingepland → inspectie SZW → boete EUR 8.000+ |
| **HIGH** | Zelf-aanmelding zonder document-check | Medewerker met verlopen ID meldt zich aan voor dienst → werkt zonder geldig ID |
| **HIGH** | Handmatige toewijzing zonder document-check | Admin plant medewerker in via PlanningTab zonder te zien dat ID verlopen is |
| **HIGH** | VSH-check niet actief | Medewerker zonder SVH bedient bar → overtreding Drank- en Horecawet |
| **MEDIUM** | Acceptatie zonder document-check | Laatste vangnet ontbreekt |
