import { test, expect } from "@playwright/test";
import { normaliseerAiPrioriteit, normaliseerTicketAnalyse } from "../../src/lib/ticket-analyse";

test.describe("ticket-analyse", () => {
  test("ai_priority: hoofdletters, spaties en NL-synoniemen", () => {
    expect(normaliseerAiPrioriteit("High")).toBe("high");
    expect(normaliseerAiPrioriteit(" LOW ")).toBe("low");
    expect(normaliseerAiPrioriteit("hoog")).toBe("high");
    expect(normaliseerAiPrioriteit("gemiddeld")).toBe("medium");
  });

  test("ai_priority: onbekend of geen string → medium", () => {
    expect(normaliseerAiPrioriteit("critical")).toBe("medium");
    expect(normaliseerAiPrioriteit(null)).toBe("medium");
    expect(normaliseerAiPrioriteit(3)).toBe("medium");
  });

  test("analyse: categorie ingekort, spam alleen bij true, faq-id moet uuid zijn", () => {
    const a = normaliseerTicketAnalyse({
      priority: "Medium",
      category: "x".repeat(150),
      is_spam: "false",
      similar_existing_question: "faq-12",
      reasoning: "  Omdat.  ",
    });
    expect(a.priority).toBe("medium");
    expect(a.category).toHaveLength(100);
    expect(a.is_spam).toBe(false);
    expect(a.similar_existing_question).toBeNull();
    expect(a.reasoning).toBe("Omdat.");
    expect(normaliseerTicketAnalyse("onzin").priority).toBe("medium");
  });
});
