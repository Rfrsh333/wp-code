import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  SFEER_CATEGORIEEN,
  fotoUitUrl,
  fotoVoorDienst,
  isEigenUpload,
  kiesDienstAfbeelding,
  opslagPadVanUpload,
  sfeerCategorieVoorFunctie,
  sfeerfotoCatalogus,
  sfeerfotoIdUitUrl,
  sfeerfotoOpId,
  siteOrigin,
  standaardFotoVoor,
  webFotoSrc,
} from "../../src/lib/sfeerfotos";
import {
  AFBEELDING_MAX_BYTES,
  VERCEL_MAX_BODY_BYTES,
  controleerAfbeelding,
  controleerVerzoekGrootte,
  herkenAfbeelding,
} from "../../src/lib/afbeelding-upload";

const SITE = "https://www.toptalentjobs.nl";
const SUPABASE = "https://nntxpyoyrpquzghsnwxj.supabase.co";
const KLANT = "0f3c2a1e-1111-4222-8333-944455556666";
const ANDERE_KLANT = "9a8b7c6d-1111-4222-8333-944455556666";
const upload = (map: string, klant = KLANT, naam = "a1b2c3d4e5f60718.jpg") =>
  `${SUPABASE}/storage/v1/object/public/dienst-afbeeldingen/${map}/${klant}/${naam}`;

test.describe("catalogus", () => {
  test("23 foto's, unieke ids, elke categorie minstens 2, absolute URL's", () => {
    const fotos = sfeerfotoCatalogus(SITE);
    expect(fotos).toHaveLength(23);
    expect(new Set(fotos.map((f) => f.id)).size).toBe(23);
    for (const c of SFEER_CATEGORIEEN) {
      expect(fotos.filter((f) => f.categorie === c.id).length, c.id).toBeGreaterThanOrEqual(2);
    }
    for (const f of fotos) {
      expect(f.groot).toBe(`${SITE}/images/sfeer/groot/${f.id}.jpg`);
      expect(f.klein).toBe(`${SITE}/images/sfeer/klein/${f.id}.jpg`);
      expect(f.label.length).toBeGreaterThan(3);
      expect(f.id.startsWith(`${f.categorie}-`)).toBe(true);
    }
  });

  test("elke foto staat in public/images/sfeer (groot en klein) en in bronnen.json", () => {
    const map = path.join(__dirname, "../../public/images/sfeer");
    const bronnen = JSON.parse(fs.readFileSync(path.join(map, "bronnen.json"), "utf8")) as { id: string; categorie: string }[];
    const catalogus = sfeerfotoCatalogus(SITE);
    expect(new Set(bronnen.map((b) => b.id))).toEqual(new Set(catalogus.map((f) => f.id)));
    for (const f of catalogus) {
      expect(fs.existsSync(path.join(map, "groot", `${f.id}.jpg`)), f.id).toBe(true);
      expect(fs.existsSync(path.join(map, "klein", `${f.id}.jpg`)), f.id).toBe(true);
      expect(bronnen.find((b) => b.id === f.id)?.categorie).toBe(f.categorie);
    }
  });

  test("siteOrigin: env-waarde met pad of slash wordt de origin; ongeldig valt terug op productie", () => {
    expect(siteOrigin("https://www.toptalentjobs.nl/")).toBe(SITE);
    expect(siteOrigin("http://localhost:3000/x")).toBe("http://localhost:3000");
    expect(siteOrigin("https://www.toptalentjobs.n# Google Calendar")).toBe(SITE);
    expect(siteOrigin("geen url")).toBe(SITE);
    expect(sfeerfotoOpId("bar-1", "http://localhost:3000")?.klein).toBe("http://localhost:3000/images/sfeer/klein/bar-1.jpg");
  });

  test("sfeerfotoOpId: alleen bekende ids", () => {
    expect(sfeerfotoOpId("keuken-2", SITE)?.categorie).toBe("keuken");
    expect(sfeerfotoOpId(" keuken-2 ", SITE)?.id).toBe("keuken-2");
    expect(sfeerfotoOpId("keuken-9", SITE)).toBeNull();
    expect(sfeerfotoOpId(42, SITE)).toBeNull();
    expect(sfeerfotoOpId(null, SITE)).toBeNull();
  });
});

test.describe("functie → categorie", () => {
  test("prod-functienamen (23-10-2026)", () => {
    expect(sfeerCategorieVoorFunctie("barista")).toBe("barista");
    expect(sfeerCategorieVoorFunctie("bediening")).toBe("bediening");
    expect(sfeerCategorieVoorFunctie("catering")).toBe("catering");
    expect(sfeerCategorieVoorFunctie("sitecrew - hospitality")).toBe("catering");
    expect(sfeerCategorieVoorFunctie("schoonmaak")).toBe("schoonmaak");
  });

  test("functiegroepen uit de push-regels", () => {
    for (const f of ["bar", "bartender", "bartending", "barmedewerker", "barkeeper"]) expect(sfeerCategorieVoorFunctie(f), f).toBe("bar");
    for (const f of ["keuken", "kok", "hulpkok", "keukenhulp", "zelfstandig werkend kok", "sous-chef"]) expect(sfeerCategorieVoorFunctie(f), f).toBe("keuken");
    for (const f of ["afwas", "afwasser", "spoelkeuken medewerker", "afwas / spoelkeuken"]) expect(sfeerCategorieVoorFunctie(f), f).toBe("afwas");
    for (const f of ["ober", "runner", "gastvrouw", "gastheer / gastvrouw", "host(ess)", "bedieningsmedewerker"]) expect(sfeerCategorieVoorFunctie(f), f).toBe("bediening");
  });

  test("barista gaat vóór de groepen bar/bediening; events naar catering", () => {
    expect(sfeerCategorieVoorFunctie("Barista ")).toBe("barista");
    expect(sfeerCategorieVoorFunctie("koffiebar medewerker")).toBe("barista");
    expect(sfeerCategorieVoorFunctie("event staff")).toBe("catering");
    expect(sfeerCategorieVoorFunctie("evenement medewerker")).toBe("catering");
    expect(sfeerCategorieVoorFunctie("Housekeeping")).toBe("schoonmaak");
  });

  test("losse woorden en samengestelde namen", () => {
    expect(sfeerCategorieVoorFunctie("Keukenmedewerker")).toBe("keuken");
    expect(sfeerCategorieVoorFunctie("spoelkeukenmedewerker")).toBe("afwas");
    expect(sfeerCategorieVoorFunctie("Medewerker   BEDIENING")).toBe("bediening");
    expect(sfeerCategorieVoorFunctie("bediening, bar")).toBe("bediening");
    expect(sfeerCategorieVoorFunctie("bar medewerker")).toBe("bar");
  });

  test("onbekend of leeg: algemeen", () => {
    for (const f of [null, undefined, "", "   ", "receptie", "hospitality"]) expect(sfeerCategorieVoorFunctie(f), String(f)).toBe("algemeen");
  });
});

test.describe("standaardFotoVoor", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);

  test("deterministisch op de dienst-id en altijd uit de juiste categorie", () => {
    for (const id of ids) {
      const a = standaardFotoVoor("bediening", id, SITE);
      expect(standaardFotoVoor("bediening", id, SITE).id).toBe(a.id);
      expect(a.categorie).toBe("bediening");
    }
  });

  test("verdeelt diensten over de foto's van de categorie", () => {
    for (const functie of ["bediening", "keuken", "barista", "schoonmaak", null]) {
      const gekozen = new Set(ids.map((id) => standaardFotoVoor(functie, id, SITE).id));
      const totaal = sfeerfotoCatalogus(SITE).filter((f) => f.categorie === sfeerCategorieVoorFunctie(functie)).length;
      expect(gekozen.size, String(functie)).toBe(totaal);
    }
  });

  test("zonder sleutel de eerste foto", () => {
    expect(standaardFotoVoor("bar", null, SITE).id).toBe("bar-1");
    expect(standaardFotoVoor("onbekend", "", SITE).id).toBe("algemeen-1");
  });
});

test.describe("fotoVoorDienst: dienst → bedrijf → standaard", () => {
  const dienst = { id: "11111111-2222-4333-8444-555555555555", functie: "keuken" };

  test("eigen upload bij de dienst: groot = klein, bron dienst", () => {
    const url = upload("diensten");
    expect(fotoVoorDienst({ ...dienst, afbeelding_url: url }, upload("bedrijven"), SITE)).toEqual({ groot: url, klein: url, bron: "dienst" });
  });

  test("standaardfoto gekozen bij de dienst: kleine versie erbij", () => {
    const foto = fotoVoorDienst({ ...dienst, afbeelding_url: `${SITE}/images/sfeer/groot/bar-2.jpg` }, null, SITE);
    expect(foto).toEqual({ groot: `${SITE}/images/sfeer/groot/bar-2.jpg`, klein: `${SITE}/images/sfeer/klein/bar-2.jpg`, bron: "dienst" });
  });

  test("geen dienstfoto: bedrijfsfoto (upload of catalogus)", () => {
    expect(fotoVoorDienst(dienst, upload("bedrijven"), SITE)).toEqual({ groot: upload("bedrijven"), klein: upload("bedrijven"), bron: "bedrijf" });
    expect(fotoVoorDienst({ ...dienst, afbeelding_url: "" }, `${SITE}/images/sfeer/groot/algemeen-3.jpg`, SITE)).toMatchObject({
      klein: `${SITE}/images/sfeer/klein/algemeen-3.jpg`,
      bron: "bedrijf",
    });
  });

  test("niets ingesteld: standaardfoto bij de functie", () => {
    const foto = fotoVoorDienst({ ...dienst, afbeelding_url: null }, null, SITE);
    expect(foto.bron).toBe("standaard");
    expect(foto.groot).toBe(standaardFotoVoor("keuken", dienst.id, SITE).groot);
    expect(foto.klein).toMatch(/\/images\/sfeer\/klein\/keuken-\d\.jpg$/);
  });

  test("onbruikbare waarde telt niet als foto", () => {
    expect(fotoVoorDienst({ ...dienst, afbeelding_url: "javascript:alert(1)" }, "geen url", SITE).bron).toBe("standaard");
    expect(fotoUitUrl("data:image/png;base64,AAAA", "bedrijf", SITE)).toBeNull();
  });
});

test.describe("catalogus-URL herkennen", () => {
  test("relatief, eigen site (www en zonder), groot en klein", () => {
    expect(sfeerfotoIdUitUrl("/images/sfeer/klein/afwas-3.jpg", SITE)).toBe("afwas-3");
    expect(sfeerfotoIdUitUrl(`${SITE}/images/sfeer/groot/afwas-3.jpg`, SITE)).toBe("afwas-3");
    expect(sfeerfotoIdUitUrl("https://toptalentjobs.nl/images/sfeer/groot/afwas-3.jpg", SITE)).toBe("afwas-3");
    expect(sfeerfotoIdUitUrl("http://localhost:3000/images/sfeer/groot/bar-1.jpg", "http://localhost:3000")).toBe("bar-1");
  });

  test("andere host, onbekend id of ander pad: geen catalogusfoto", () => {
    expect(sfeerfotoIdUitUrl("https://evil.example/images/sfeer/groot/bar-1.jpg", SITE)).toBeNull();
    expect(sfeerfotoIdUitUrl("//evil.example/images/sfeer/groot/bar-1.jpg", SITE)).toBeNull();
    expect(sfeerfotoIdUitUrl("/images/sfeer/groot/bar-7.jpg", SITE)).toBeNull();
    expect(sfeerfotoIdUitUrl("/images/sfeer/groot/../bar-1.jpg", SITE)).toBeNull();
    expect(sfeerfotoIdUitUrl("/images/sfeer/middel/bar-1.jpg", SITE)).toBeNull();
    expect(sfeerfotoIdUitUrl(undefined, SITE)).toBeNull();
  });
});

test.describe("kiesDienstAfbeelding (POST /api/klant/aanvraag)", () => {
  const opties = { klantId: KLANT, supabaseUrl: SUPABASE, basis: SITE };

  test("sfeerfoto_id uit de catalogus → URL van de grote versie", () => {
    expect(kiesDienstAfbeelding({ sfeerfoto_id: "barista-2" }, opties)).toEqual({ url: `${SITE}/images/sfeer/groot/barista-2.jpg`, waarschuwing: null });
  });

  test("onbekende sfeerfoto_id: geen foto, wel een waarschuwing (aanvraag gaat door)", () => {
    const r = kiesDienstAfbeelding({ sfeerfoto_id: "barista-9", afbeelding_url: upload("diensten") }, opties);
    expect(r.url).toBeNull();
    expect(r.waarschuwing).toContain("bedrijfsfoto");
  });

  test("afbeelding_url uit de catalogus (ook de kleine) → grote versie", () => {
    expect(kiesDienstAfbeelding({ afbeelding_url: "/images/sfeer/klein/catering-2.jpg" }, opties).url).toBe(`${SITE}/images/sfeer/groot/catering-2.jpg`);
  });

  test("eigen upload van deze klant: ja; van een andere klant of host: nee", () => {
    expect(kiesDienstAfbeelding({ afbeelding_url: upload("diensten") }, opties)).toEqual({ url: upload("diensten"), waarschuwing: null });
    expect(kiesDienstAfbeelding({ afbeelding_url: upload("diensten", ANDERE_KLANT) }, opties).url).toBeNull();
    expect(kiesDienstAfbeelding({ afbeelding_url: upload("bedrijven") }, opties).url).toBeNull();
    const vreemd = `https://evil.example/storage/v1/object/public/dienst-afbeeldingen/diensten/${KLANT}/a1b2.jpg`;
    expect(kiesDienstAfbeelding({ afbeelding_url: vreemd }, opties).url).toBeNull();
  });

  test("niets meegestuurd: null zonder waarschuwing (bedrijfsfoto of standaard)", () => {
    expect(kiesDienstAfbeelding({}, opties)).toEqual({ url: null, waarschuwing: null });
    expect(kiesDienstAfbeelding({ sfeerfoto_id: "", afbeelding_url: "  " }, opties)).toEqual({ url: null, waarschuwing: null });
  });
});

test.describe("eigen uploads in de bucket", () => {
  test("pad van een bedrijfsfoto, alleen van deze klant en met een gewone bestandsnaam", () => {
    const o = { klantId: KLANT, map: "bedrijven" as const, supabaseUrl: SUPABASE };
    expect(opslagPadVanUpload(upload("bedrijven"), o)).toBe(`bedrijven/${KLANT}/a1b2c3d4e5f60718.jpg`);
    expect(opslagPadVanUpload(upload("bedrijven", ANDERE_KLANT), o)).toBeNull();
    expect(opslagPadVanUpload(upload("bedrijven", KLANT, "..%2F..%2Fx.jpg"), o)).toBeNull();
    expect(opslagPadVanUpload(upload("bedrijven", KLANT, "x.gif"), o)).toBeNull();
    expect(opslagPadVanUpload(upload("bedrijven").replace("https:", "http:"), o)).toBeNull();
    expect(isEigenUpload(upload("bedrijven"), { ...o, supabaseUrl: null })).toBe(false);
  });
});

test.describe("webFotoSrc (portaal, next/image)", () => {
  test("catalogusfoto relatief en geoptimaliseerd; Supabase-upload via de optimizer; rest ongeoptimaliseerd", () => {
    expect(webFotoSrc(`${SITE}/images/sfeer/groot/bar-1.jpg`, "klein")).toEqual({ src: "/images/sfeer/klein/bar-1.jpg", unoptimized: false });
    expect(webFotoSrc(upload("diensten"))).toEqual({ src: upload("diensten"), unoptimized: false });
    expect(webFotoSrc("https://cdn.example/foto.jpg")).toEqual({ src: "https://cdn.example/foto.jpg", unoptimized: true });
    const anderProject = "https://ander.supabase.co/storage/v1/object/public/dienst-afbeeldingen/x.jpg";
    expect(webFotoSrc(anderProject)).toEqual({ src: anderProject, unoptimized: true });
  });
});

test.describe("uploadvalidatie (dienstfoto en bedrijfsfoto)", () => {
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
  const HTML = new Uint8Array(Buffer.from("<html><script>"));

  test("herkent JPEG, PNG en WebP aan de eerste bytes", () => {
    expect(herkenAfbeelding(JPEG)).toBe("image/jpeg");
    expect(herkenAfbeelding(PNG)).toBe("image/png");
    expect(herkenAfbeelding(WEBP)).toBe("image/webp");
    expect(herkenAfbeelding(HTML)).toBeNull();
    expect(herkenAfbeelding(new Uint8Array())).toBeNull();
  });

  test("type, grootte (500 KB, de grens van dienst-afbeelding) en inhoud", () => {
    expect(controleerAfbeelding({ type: "image/jpeg", size: 1000 }, JPEG)).toEqual({ ok: true, type: "image/jpeg", ext: "jpg" });
    expect(controleerAfbeelding({ type: "image/png", size: 1000 }, JPEG)).toMatchObject({ ok: true, ext: "jpg" });
    expect(controleerAfbeelding({ type: "image/gif", size: 1000 }, JPEG)).toMatchObject({ ok: false, status: 400 });
    expect(controleerAfbeelding({ type: "image/jpeg", size: AFBEELDING_MAX_BYTES + 1 }, JPEG)).toMatchObject({ ok: false, status: 400 });
    expect(controleerAfbeelding({ type: "image/jpeg", size: AFBEELDING_MAX_BYTES }, JPEG).ok).toBe(true);
    expect(controleerAfbeelding({ type: "image/jpeg", size: 100 }, HTML)).toMatchObject({ ok: false, status: 400 });
    expect(AFBEELDING_MAX_BYTES).toBe(500 * 1024);
  });

  test("Vercel-grens van ~4,5 MB op Content-Length", () => {
    expect(controleerVerzoekGrootte(String(VERCEL_MAX_BODY_BYTES + 1))).toMatchObject({ ok: false, status: 413 });
    expect(controleerVerzoekGrootte(String(VERCEL_MAX_BODY_BYTES))).toBeNull();
    expect(controleerVerzoekGrootte(null)).toBeNull();
    expect(controleerVerzoekGrootte("abc")).toBeNull();
  });
});
