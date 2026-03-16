# MASTER PROMPT: Diensten Systeem Volledig Fixen (Kritiek)

## CONTEXT
TopTalent Jobs is een uitzendbureau platform (Next.js 16 + Supabase + TypeScript + Tailwind).
Het belangrijkste probleem: wanneer een klant een dienst aanmaakt via het klant portaal, is deze niet (correct) zichtbaar in het medewerker portaal. In het admin portaal is hij wél zichtbaar. Dit is een van de kernfuncties van het platform en moet 100% werken.

## WAT AL IS GEFIXED (NIET OPNIEUW DOEN)
De volgende fixes zijn AL doorgevoerd en moeten BEHOUDEN blijven:
1. ✅ `src/app/api/klant/aanvraag/route.ts` - functie niet meer hardcoded "horeca", plekken_totaal/beschikbaar toegevoegd, functie_id lookup
2. ✅ `src/app/api/medewerker/diensten/route.ts` - Fallback query als join tabellen niet bestaan, backwards compatibility filter verwijderd
3. ✅ `src/app/api/admin/diensten/route.ts` - Status filter en standaard datum filter toegevoegd
4. ✅ `src/app/klant/uren/KlantUrenClient.tsx` - Hardcoded "horeca" verwijderd uit form state
5. ✅ SQL migratie gedraaid: dienst_categorieen, dienst_functies, dienst_tags tabellen bestaan nu + seed data

## WAT NOG MOET WORDEN GEFIXED

### FASE 1: Fix `/api/medewerker/shifts/beschikbaar/route.ts` (KRITIEK)
**Probleem:** Er zijn TWEE API routes die diensten tonen aan medewerkers:
1. `/api/medewerker/diensten` → Gebruikt door `MedewerkerDienstenClient.tsx` (al gefixed)
2. `/api/medewerker/shifts/beschikbaar` → Gebruikt door `OntdekkenClient.tsx` (NOG NIET GEFIXED)

De tweede route op `src/app/api/medewerker/shifts/beschikbaar/route.ts` heeft deze problemen:
- Doet een JOIN naar `klanten` tabel via `klant:klanten!klant_id` — dit kan falen als klant_id null is of als de klant niet in de klanten tabel staat
- Geen fallback als de join faalt
- Geen error handling voor query errors (de hele response faalt als 1 join faalt)

**Fix:**
```typescript
// Huidige query (regel 20-45):
const { data: diensten, error } = await supabaseAdmin
  .from("diensten")
  .select(`
    id, datum, start_tijd, eind_tijd, locatie, omschrijving, notities, uurtarief,
    aantal_nodig, functie, klant_naam, klant_id,
    klant:klanten!klant_id (id, bedrijfsnaam, bedrijf_foto_url)
  `)
  .gte("datum", vandaag)
  .eq("status", "open")
  .order("datum", { ascending: true })
  .order("start_tijd", { ascending: true })
  .limit(50);

// Verbeterde query: maak de klant join optioneel met left join (standaard in Supabase)
// en voeg error handling toe:
const { data: diensten, error } = await supabaseAdmin
  .from("diensten")
  .select(`
    id, datum, start_tijd, eind_tijd, locatie, notities, uurtarief,
    aantal_nodig, plekken_totaal, plekken_beschikbaar, functie, klant_naam, klant_id, status,
    klant:klanten!left(id, bedrijfsnaam, bedrijf_foto_url)
  `)
  .in("status", ["open", "vol"])
  .gte("datum", vandaag)
  .order("datum", { ascending: true })
  .order("start_tijd", { ascending: true })
  .limit(50);

// Als de join query faalt, fallback naar simpele query:
if (error) {
  console.warn("[SHIFTS BESCHIKBAAR] Join query failed, using fallback:", error);
  const { data: fallbackDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, locatie, notities, uurtarief, aantal_nodig, plekken_totaal, plekken_beschikbaar, functie, klant_naam, klant_id, status")
    .in("status", ["open", "vol"])
    .gte("datum", vandaag)
    .order("datum", { ascending: true })
    .limit(50);
  diensten = fallbackDiensten;
}
```

En in de map functie (regel 69-111), gebruik `plekken_beschikbaar` en `plekken_totaal` als die beschikbaar zijn:
```typescript
const plekkenBeschikbaar = d.plekken_beschikbaar ?? d.aantal_nodig ?? 1;
const plekkenTotaal = d.plekken_totaal ?? d.aantal_nodig ?? 1;
```

### FASE 2: Fix `OntdekkenClient.tsx` — Shift interface alignment
**Bestand:** `src/app/medewerker/shifts/OntdekkenClient.tsx`

Het `Shift` interface verwacht `plekken_beschikbaar` en `plekken_totaal` maar de API geeft die niet mee als ze null zijn in de database. Zorg dat de interface optioneel is en fallback naar `aantal_nodig`:
```typescript
interface Shift {
  id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  omschrijving?: string;
  uurtarief: number;
  plekken_beschikbaar: number;
  plekken_totaal: number;
  klant: {
    bedrijfsnaam: string;
    bedrijf_foto_url?: string;
    rating?: number;
  };
  tags?: string[];
  is_speciaal?: boolean;
}
```
Dit interface hoeft NIET te veranderen als de API de juiste data stuurt na Fase 1.

### FASE 3: Sync `MedewerkerDienstenClient.tsx` met API response
**Bestand:** `src/app/medewerker/diensten/MedewerkerDienstenClient.tsx`

Het `Dienst` interface mist velden die de API nu meestuurt (categorie_id, functie_id, categorie_naam, functie_naam, computed_tags). Voeg toe:
```typescript
interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  uurtarief: number | null;
  status: string;
  notities: string | null;
  aantal_nodig?: number;
  categorie_id?: string;
  functie_id?: string;
  vereiste_taal?: string | null;
  categorie_naam?: string | null;
  functie_naam?: string | null;
  computed_tags?: string[];
  aangemeld?: boolean;
  aanmelding_id?: string;
  aanmelding_status?: string;
  check_in_at?: string | null;
  uren_status?: string;
}
```

### FASE 4: Maak een publiek `/api/dienst-filters` endpoint ook bruikbaar voor medewerkers
**Bestand:** `src/app/api/dienst-filters/route.ts`

Dit endpoint bestaat al en is publiek (geen auth). Het wordt gebruikt door de klant aanvraag form. Maar de MEDEWERKER diensten pagina gebruikt dit endpoint NIET voor filters.

**Fix:** Voeg filter UI toe aan `MedewerkerDienstenClient.tsx` die dit endpoint aanroept:
```typescript
// Voeg dit toe boven in MedewerkerDienstenClient:
const [filters, setFilters] = useState({
  categorie: '',
  functie_filter: '',
  taal: '' as string,
});
const [filterOptions, setFilterOptions] = useState<any>(null);

useEffect(() => {
  fetch('/api/dienst-filters')
    .then(res => res.json())
    .then(data => setFilterOptions(data))
    .catch(() => {}); // Silently fail if tables don't exist
}, []);

// In fetchData, voeg filter params toe:
const fetchData = async () => {
  setIsLoading(true);
  const params = new URLSearchParams();
  if (filters.categorie) params.set('categorie', filters.categorie);
  if (filters.functie_filter) params.set('functie_filter', filters.functie_filter);
  if (filters.taal) params.set('taal', filters.taal);
  const res = await fetch(`/api/medewerker/diensten?${params.toString()}`);
  const data = await res.json();
  setDiensten(data.diensten || []);
  setAanpassingen(data.aanpassingen || []);
  setIsLoading(false);
};
```

Voeg een simpel filter dropdown/accordion UI toe boven de diensten lijst in de "beschikbaar" tab:
- Categorie dropdown (uit filterOptions.categorieen)
- Functie dropdown (gefilterd per geselecteerde categorie)
- Taal filter (Nederlands / Engels / Beide)
- Reset filters knop

### FASE 5: Consistentie check — plekken_beschikbaar verlagen bij aanmelding
**Bestand:** `src/app/api/medewerker/diensten/route.ts` (POST handler, action "aanmelden")

Momenteel wordt bij aanmelding `dienst_aanmeldingen` aangemaakt maar `plekken_beschikbaar` op de dienst wordt NIET verlaagd. Dit zorgt ervoor dat de "Ontdekken" pagina een incorrect aantal beschikbare plekken toont.

**Fix:** Na succesvolle aanmelding, verlaag `plekken_beschikbaar`:
```typescript
if (action === "aanmelden") {
  // ... bestaande code ...

  await supabaseAdmin.from("dienst_aanmeldingen").insert({
    dienst_id,
    medewerker_id: medewerker.id,
    status: "aangemeld",
  });

  // ✅ NIEUW: Verlaag plekken_beschikbaar
  const { data: dienstInfo } = await supabaseAdmin
    .from("diensten")
    .select("plekken_beschikbaar")
    .eq("id", dienst_id)
    .single();

  if (dienstInfo && dienstInfo.plekken_beschikbaar !== null && dienstInfo.plekken_beschikbaar > 0) {
    await supabaseAdmin
      .from("diensten")
      .update({ plekken_beschikbaar: dienstInfo.plekken_beschikbaar - 1 })
      .eq("id", dienst_id);
  }
}
```

En bij afmelding, verhoog `plekken_beschikbaar`:
```typescript
if (action === "afmelden") {
  await supabaseAdmin.from("dienst_aanmeldingen").delete()
    .eq("dienst_id", dienst_id)
    .eq("medewerker_id", medewerker.id);

  // ✅ NIEUW: Verhoog plekken_beschikbaar
  const { data: dienstInfo } = await supabaseAdmin
    .from("diensten")
    .select("plekken_beschikbaar, plekken_totaal")
    .eq("id", dienst_id)
    .single();

  if (dienstInfo && dienstInfo.plekken_beschikbaar !== null && dienstInfo.plekken_totaal !== null) {
    const nieuwBeschikbaar = Math.min(dienstInfo.plekken_beschikbaar + 1, dienstInfo.plekken_totaal);
    await supabaseAdmin
      .from("diensten")
      .update({ plekken_beschikbaar: nieuwBeschikbaar })
      .eq("id", dienst_id);
  }
}
```

### FASE 6: Admin diensten tabel — toon klant-aangemaakte diensten duidelijk
**Bestand:** In de admin diensten tab component (zoek het component dat `AdminDashboard.tsx` of een diensten tab component is)

Voeg een visuele indicator toe zodat de admin kan zien welke diensten door klanten zijn aangemaakt vs door admin:
- Als `klant_id` niet null is → toon een klein badge "Klant aanvraag" in een andere kleur
- Dit helpt de admin om te zien welke diensten van klanten komen

### FASE 7: End-to-end test en build verificatie

**Test scenario's (handmatig controleren):**
1. Log in als klant → Maak een nieuwe dienst aan met functie "Bediening", 3 personen, datum morgen
2. Log in als medewerker → Ga naar "Diensten" tab → De klant-dienst moet zichtbaar zijn
3. Log in als medewerker → Ga naar "Ontdekken" pagina → De klant-dienst moet zichtbaar zijn als shift
4. Log in als admin → Ga naar "Diensten" tab → De klant-dienst moet zichtbaar zijn (met "Klant aanvraag" badge)
5. Als medewerker → Meld je aan voor de dienst → plekken_beschikbaar moet met 1 afnemen
6. Als medewerker → Meld je af → plekken_beschikbaar moet met 1 toenemen

**Build check:**
```bash
npm run build
```
Er mogen GEEN TypeScript errors of build errors zijn.

## VOLGORDE VAN UITVOERING
1. FASE 1 (Kritiek): Fix shifts/beschikbaar API
2. FASE 3: Sync Dienst interface
3. FASE 5: plekken_beschikbaar sync bij aan/afmelding
4. FASE 4: Filter UI voor medewerker (optioneel maar gewenst)
5. FASE 6: Admin badge (optioneel maar handig)
6. FASE 2: Interface check (automatisch als Fase 1 correct is)
7. FASE 7: Build verificatie (ALTIJD ALS LAATSTE)

## BELANGRIJK
- Verander NIETS aan de al gefixte bestanden (zie "WAT AL IS GEFIXED" sectie) tenzij je een BUG vindt
- Test na elke fase of bestaande functionaliteit nog werkt
- Gebruik `Record<string, unknown>` in plaats van `any` waar mogelijk
- Voeg console.log/warn toe voor debugging bij errors
- Alle API routes moeten graceful falen (nooit een 500 zonder error log)
- Draai `npm run build` als allerlaatste stap
