# Image Optimization Audit - TopTalent Jobs

**Datum:** 2026-05-14
**Project:** toptalent-wordpress-html (Next.js)
**Totaal geanalyseerd:** 60 afbeeldingen (public/) + 66 image-elementen (src/)

---

## Samenvatting Grootste Problemen

| # | Probleem | Impact | Prioriteit |
|---|----------|--------|------------|
| 1 | 5 hero PNG's van 1.5-1.8MB zonder WebP fallback in code | LCP +2-4s op 3G | KRITIEK |
| 2 | Header logo mist `priority` prop | LCP vertraging | KRITIEK |
| 3 | 23 afbeeldingen >100KB zonder WebP versie | Bandbreedte verspilling | HOOG |
| 4 | 52 van 60 Image-componenten missen `sizes` attribuut | Geen responsive srcset | HOOG |
| 5 | 11 blog-afbeeldingen (147-211KB JPG) niet geoptimaliseerd | Langzame blogpagina's | HOOG |
| 6 | 0 AVIF-versies aanwezig (terwijl config AVIF ondersteunt) | Gemiste 30-50% extra besparing | GEMIDDELD |
| 7 | Locatie-variant afbeeldingen zijn duplicaten (275-308KB) | ~3.5MB onnodige data | GEMIDDELD |

**Geschatte totale besparing:** ~25-35MB bandbreedte per pageview-sessie

---

## 1. LCP-Image Analyse (Kritiek)

### Huidige LCP-kandidaten

**Hero Image - barista.png (226KB)**
- Bestand: `src/components/Hero/Hero.tsx:165`
- Status: Heeft `priority` prop (goed)
- Probleem: Geen `sizes` attribuut, vast op 240x320

```tsx
// HUIDIGE CODE (Hero.tsx:165)
<Image
  src="/images/barista.png"
  alt="Barista aan het werk met inzetbaar horecapersoneel via ons uitzendbureau"
  width={240}
  height={320}
  className={styles.heroImage}
  priority
/>

// VERBETERDE CODE
<Image
  src="/images/barista.png"
  alt="Barista aan het werk met inzetbaar horecapersoneel via ons uitzendbureau"
  width={240}
  height={320}
  sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 240px"
  className={styles.heroImage}
  priority
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F/PQAJhAN4kHOxjAAAAABJRU5ErkJggg=="
/>
```

**Header Logo - logo.png (31KB)**
- Bestand: `src/components/Header.tsx:122`
- Status: MIST `priority` prop
- Impact: Logo is altijd boven de vouw, vertraagt LCP

```tsx
// HUIDIGE CODE (Header.tsx:122)
<Image
  src="/logo.png"
  alt="TopTalent Jobs"
  width={288}
  height={144}
  className="h-34 w-auto"
/>

// VERBETERDE CODE
<Image
  src="/logo.png"
  alt="TopTalent Jobs"
  width={288}
  height={144}
  className="h-34 w-auto"
  priority
/>
```

**Powder Splash - decoratief (224KB)**
- Bestand: `src/components/Hero/Hero.tsx:154`
- Status: Geen `priority`, leeg alt (correct voor decoratief)
- Advies: Verwijder of verlaag kwaliteit, dit is een decoratief element dat 224KB kost

---

## 2. Te Grote Afbeeldingen (>100KB)

### Categorie A: Hero Images (KRITIEK - 1.5-1.8MB elk!)

| Bestand | Formaat | Grootte | WebP versie? | WebP grootte | Besparing |
|---------|---------|---------|--------------|--------------|-----------|
| locatie-eindhoven-hero.png | PNG | 1.8MB | Ja | 250KB | 86% |
| locatie-utrecht-hero.png | PNG | 1.7MB | Ja | 270KB | 84% |
| locatie-den-haag-hero.png | PNG | 1.7MB | Ja | 435KB | 75% |
| locatie-amsterdam-hero.png | PNG | 1.6MB | Ja | 290KB | 82% |
| locatie-rotterdam-hero.png | PNG | 1.5MB | Ja | 138KB | 91% |

WebP-versies bestaan al maar worden niet consistent gebruikt in de code. Gebruik `<picture>` of de PremiumImage component.

### Categorie B: Dienst-variant afbeeldingen (GEEN WebP)

| Bestand | Grootte | WebP versie? |
|---------|---------|--------------|
| locatie-amsterdam-uitzenden.png | 308KB | NEE |
| locatie-rotterdam-uitzenden.png | 308KB | NEE |
| locatie-utrecht-uitzenden.png | 308KB | NEE |
| locatie-amsterdam-detachering.png | 275KB | NEE |
| locatie-rotterdam-detachering.png | 275KB | NEE |
| locatie-utrecht-detachering.png | 275KB | NEE |

**Fix:** Voeg deze toe aan `scripts/optimize-regio-images.js`:

```javascript
// Toevoegen aan optimize-regio-images.js
const dienstVarianten = [
  'locatie-amsterdam-uitzenden.png',
  'locatie-rotterdam-uitzenden.png',
  'locatie-utrecht-uitzenden.png',
  'locatie-amsterdam-detachering.png',
  'locatie-rotterdam-detachering.png',
  'locatie-utrecht-detachering.png',
];

for (const file of dienstVarianten) {
  const input = path.join(imageDir, file);
  const outputWebp = path.join(imageDir, file.replace('.png', '.webp'));

  await sharp(input)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toFile(outputWebp);
}
```

### Categorie C: Blog-afbeeldingen (GEEN WebP)

| Bestand | Grootte |
|---------|---------|
| blog-horecapersoneel-inhuren.jpg | 211KB |
| blog-restaurant-openen.jpg | 211KB |
| blog-horecamedewerker-zonder-ervaring.jpg | 183KB |
| blog-evenementenpersoneel.jpg | 182KB |
| blog-cao-horeca.jpg | 182KB |
| blog-seizoenspersoneel.jpg | 181KB |
| blog-personeelstekort.jpg | 181KB |
| blog-werken-als-uitzendkracht.jpg | 170KB |
| blog-personeelsplanning.jpg | 165KB |
| blog-meest-gevraagde-functies.jpg | 165KB |
| blog-detachering-vs-uitzenden.jpg | 147KB |

**Fix:** Maak een optimize-blog-images.js script:

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imageDir = path.join(__dirname, '../public/images');

async function optimizeBlogImages() {
  const blogImages = fs.readdirSync(imageDir)
    .filter(f => f.startsWith('blog-') && (f.endsWith('.jpg') || f.endsWith('.jpeg')));

  for (const file of blogImages) {
    const input = path.join(imageDir, file);
    const outputWebp = path.join(imageDir, file.replace(/\.jpe?g$/, '.webp'));
    const outputAvif = path.join(imageDir, file.replace(/\.jpe?g$/, '.avif'));

    const originalSize = fs.statSync(input).size;

    // WebP versie
    await sharp(input)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputWebp);

    // AVIF versie (beste compressie)
    await sharp(input)
      .resize({ width: 1200, withoutEnlargement: true })
      .avif({ quality: 65, effort: 6 })
      .toFile(outputAvif);

    const webpSize = fs.statSync(outputWebp).size;
    const avifSize = fs.statSync(outputAvif).size;

    console.log(`${file}: ${(originalSize/1024).toFixed(0)}KB -> WebP ${(webpSize/1024).toFixed(0)}KB (${((1-webpSize/originalSize)*100).toFixed(0)}%) | AVIF ${(avifSize/1024).toFixed(0)}KB (${((1-avifSize/originalSize)*100).toFixed(0)}%)`);
  }
}

optimizeBlogImages();
```

---

## 3. Ontbrekende Width/Height & Lazy Loading

### HTML `<img>` tags zonder dimensies

**`src/app/verify/[token]/page.tsx:89`** - Profielfoto zonder width/height:
```tsx
// HUIDIGE CODE
<img
  src={medewerker.profile_photo_url}
  alt={medewerker.naam}
  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white/30"
/>

// VERBETERDE CODE - Gebruik Next.js Image
import Image from 'next/image';

<Image
  src={medewerker.profile_photo_url}
  alt={medewerker.naam}
  width={96}
  height={96}
  className="rounded-full object-cover mx-auto border-4 border-white/30"
  unoptimized
/>
```

### Afbeeldingen die lazy loading nodig hebben (onder de vouw)

De volgende componenten laden afbeeldingen die bijna altijd onder de vouw zijn, maar missen expliciete `loading="lazy"`:

| Component | Bestand | Advies |
|-----------|---------|--------|
| Blog cards | `src/app/blog/page.tsx` | `loading="lazy"` toevoegen |
| Dienst images | `src/app/diensten/page.tsx` | Eerste 3 `priority`, rest `loading="lazy"` |
| Locatie images | Locatiepagina's | Hero = `priority`, rest = `loading="lazy"` |
| Profielfoto's | Medewerker/Klant portaal | `loading="lazy"` toevoegen |
| ShiftCard images | `src/components/medewerker/ShiftCard.tsx` | `loading="lazy"` toevoegen |

Next.js Image laadt standaard lazy, maar het expliciet toevoegen van `loading="eager"` of `priority` voor boven-de-vouw elementen is belangrijk.

---

## 4. Alt-tekst Verbeteringen

### Ontbrekende of slechte alt-teksten

| Bestand | Huidige alt | Verbeterd alt |
|---------|-------------|---------------|
| `Hero.tsx:156` | `""` (leeg) | OK - decoratief met `aria-hidden="true"` |
| `Footer.tsx` | Controleer | `"TopTalent Jobs - Uitzendbureau voor horeca en evenementen"` |
| `PortalSidebar.tsx` | Controleer | `"TopTalent Jobs logo"` |
| `InstallBanner.tsx` | Controleer | `"Installeer TopTalent app"` |
| Profielfoto's | Dynamisch | Gebruik `alt={`Profielfoto van ${naam}`}` |

### Best practices voor alt-teksten

```tsx
// GOED - Beschrijvend
<Image alt="Barista aan het werk met inzetbaar horecapersoneel" ... />

// GOED - Decoratief
<Image alt="" aria-hidden="true" ... />

// SLECHT - Bestandsnaam
<Image alt="barista.png" ... />

// SLECHT - Te generiek
<Image alt="afbeelding" ... />
```

---

## 5. Responsive Images - `sizes` Attribuut

### Probleem: 52 van 60 Image-componenten missen `sizes`

Zonder `sizes` stuurt Next.js de volledige viewport-breedte afbeelding, zelfs als het element maar 200px breed is.

### Concrete fixes per component

**Blog overzichtspagina (`src/app/blog/page.tsx`):**
```tsx
// Blog card thumbnail
<Image
  src={post.image}
  alt={post.title}
  width={400}
  height={250}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="object-cover"
/>
```

**Dienstenpagina (`src/app/diensten/page.tsx`):**
```tsx
// Dienst card image
<Image
  src="/images/dienst-uitzenden.webp"
  alt="Uitzenden - TopTalent Jobs"
  width={600}
  height={400}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
/>
```

**Sidebar logo's (`src/components/navigation/Sidebar.tsx`):**
```tsx
<Image
  src="/logo.png"
  alt="TopTalent Jobs"
  width={144}
  height={72}
  sizes="144px"
/>
```

**Medewerker profiel (`src/components/medewerker/ProfielPage.tsx`):**
```tsx
<Image
  src={profilePhoto}
  alt={`Profielfoto van ${naam}`}
  width={96}
  height={96}
  sizes="96px"
  className="rounded-full"
  unoptimized
/>
```

---

## 6. Afbeeldingen Boven de Vouw (GEEN lazy loading)

Deze afbeeldingen moeten `priority` hebben:

| Component | Bestand | Huidige status | Actie |
|-----------|---------|----------------|-------|
| Hero barista | `Hero.tsx:165` | `priority` | OK |
| Header logo | `Header.tsx:122` | Geen priority | **Toevoegen** |
| Diensten hero's | `diensten/*/page.tsx` | `priority` | OK |
| Locatie hero's | Locatiepagina's | Controleren | **Toevoegen** |
| MarketingShell logo | `MarketingShell.tsx` | Geen priority | **Toevoegen** |
| AdminShell logo | `AdminShell.tsx` | Geen priority | **Toevoegen** |

---

## 7. CSS Background Images

### Gevonden (2 instanties - beide acceptabel)

1. **`globals.css:342`** - QR-patroon (CSS gradient, geen afbeelding)
2. **`MarqueeBanner.module.css:47`** - SVG data-URI noise overlay (~200 bytes inline)

Geen problematische CSS background-images gevonden. Dit is goed.

---

## 8. Next.js Image Configuratie Review

### Huidige configuratie (`next.config.ts:70-82`)

```typescript
images: {
  formats: ['image/avif', 'image/webp'],        // GOED
  deviceSizes: [640, 750, 828, 1080, 1200, 1920], // GOED
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // GOED
  minimumCacheTTL: 60 * 60 * 24 * 30,            // 30 dagen - GOED
  remotePatterns: [{
    protocol: 'https',
    hostname: 'nntxpyoyrpquzghsnwxj.supabase.co',
    pathname: '/storage/v1/object/**',
  }],
}
```

**Status:** Configuratie is solide. AVIF+WebP formaten, goede device sizes, lange cache TTL.

**Aanbeveling:** Voeg `dangerouslyAllowSVG: true` toe als SVG's via de Image component geladen worden, anders niet nodig.

---

## 9. PremiumImage Component

### Bestand: `src/components/PremiumImage/PremiumImage.tsx`

Goede custom wrapper die `<picture>` met WebP fallback implementeert. Wordt echter niet breed gebruikt.

**Aanbeveling:** Gebruik PremiumImage voor alle marketing-pagina afbeeldingen (diensten, locaties, blog) om automatisch WebP fallback te krijgen.

---

## 10. Prioriteitenlijst (Actieplan)

### Prioriteit 1 - KRITIEK (Direct uitvoeren)

- [ ] **Header logo `priority` toevoegen** - `src/components/Header.tsx:122`
- [ ] **Navigation logo's `priority` toevoegen** - `MarketingShell.tsx`, `AdminShell.tsx`
- [ ] **WebP versies genereren voor 6 locatie-variant afbeeldingen** - Run optimize script
- [ ] **WebP/AVIF versies genereren voor 11 blog-afbeeldingen** - Nieuw script

### Prioriteit 2 - HOOG (Binnen een week)

- [ ] **`sizes` attribuut toevoegen aan 52 Image-componenten** - Zie sectie 5
- [ ] **`<img>` tags vervangen door `<Image>`** in verify pagina
- [ ] **powder-splash.png optimaliseren** (224KB voor een decoratief element)
- [ ] **optimize-images.js uitbreiden** met blog + locatie-varianten

### Prioriteit 3 - GEMIDDELD (Binnen twee weken)

- [ ] **AVIF-versies genereren** voor alle statische afbeeldingen
- [ ] **PremiumImage component breder inzetten** op marketing-pagina's
- [ ] **Blur placeholders toevoegen** aan hero en dienst-images
- [ ] **Alt-teksten verbeteren** waar nodig (footer, sidebar, portaal)

### Prioriteit 4 - LAAG (Wanneer mogelijk)

- [ ] **Locatie-variant afbeeldingen dedupliceren** (uitzenden/detachering per stad zijn identiek)
- [ ] **Automatische WebP/AVIF pipeline** in CI/CD
- [ ] **Image CDN overwegen** (Cloudinary/Imgix) voor dynamische resizing

---

## Geschatte Impact

| Maatregel | Bandbreedte besparing | LCP verbetering |
|-----------|----------------------|-----------------|
| Hero WebP in code gebruiken | ~6MB per locatiepagina | -1 tot -3 seconden |
| Blog WebP/AVIF genereren | ~1.2MB per blogpagina | -0.5 tot -1 seconde |
| Header logo priority | 0 (al geladen) | -200 tot -500ms |
| sizes attribuut toevoegen | 30-60% per image | -100 tot -300ms |
| Locatie-varianten WebP | ~1.5MB per locatiepagina | -0.5 tot -1 seconde |

---

*Rapport gegenereerd op basis van volledige codebase scan van 60 publieke afbeeldingen en 66 image-elementen in 39 bronbestanden.*
