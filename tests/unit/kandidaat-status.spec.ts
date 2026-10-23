import { test, expect } from "@playwright/test";
import { kandidaatStatusTekst, type KandidaatOnboardingStatus } from "../../src/lib/kandidaat-status";

const ctx = { uploadLink: true, accountGeactiveerd: false };

test.describe("kandidaat-statuspagina (B14)", () => {
  test("documenten nodig: de kandidaat is aan zet en krijgt de uploadknop", () => {
    const t = kandidaatStatusTekst("documenten_opvragen", ctx);
    expect(t.aanZet).toBe("jij");
    expect(t.beschrijving).toContain("Upload");
    expect(t.beschrijving).not.toContain("nemen contact");
  });

  test("verlopen uploadlink: eerlijk zeggen hoe je een nieuwe krijgt", () => {
    expect(kandidaatStatusTekst("documenten_opvragen", { ...ctx, uploadLink: false }).beschrijving).toContain("verlopen");
  });

  test("documenten ontvangen: TopTalent is aan zet, niet de kandidaat", () => {
    const t = kandidaatStatusTekst("wacht_op_kandidaat", ctx);
    expect(t.aanZet).toBe("TopTalent");
    expect(t.beschrijving).not.toContain("jouw reactie");
  });

  test("inzetbaar: verwijst naar wachtwoord instellen of inloggen", () => {
    expect(kandidaatStatusTekst("inzetbaar", ctx).beschrijving).toContain("wachtwoord");
    expect(kandidaatStatusTekst("inzetbaar", { ...ctx, accountGeactiveerd: true }).beschrijving).toContain("Log in");
  });

  test("elke status heeft een tekst, ook een onbekende", () => {
    const alle: KandidaatOnboardingStatus[] = ["nieuw", "in_beoordeling", "documenten_opvragen", "wacht_op_kandidaat", "goedgekeurd", "inzetbaar", "afgewezen"];
    for (const s of alle) expect(kandidaatStatusTekst(s, ctx).label.length).toBeGreaterThan(0);
    expect(kandidaatStatusTekst("iets_nieuws" as KandidaatOnboardingStatus, ctx).label).toBe("Ontvangen");
  });
});
