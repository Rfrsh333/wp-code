import type { AnalysisCategory, AudienceType } from "@/lib/content/types";

export const editorialThemes = [
  "personeelstekort",
  "hospitality_staffing_trends",
  "zzp_regels",
  "minimumloon_cao_loondienst",
  "vergunningen",
  "brandveiligheid_verbouwing_terrasregels",
  "hotels_hospitality_operations",
  "werkgeversrisicos_arbeidsrecht",
  "medewerker_updates",
] as const;

export const ruleProfilePresets = {
  regulation_priority: {
    priorityThreshold: 90,
    defaultTags: ["regelgeving", "menselijke_review_verplicht"],
  },
  staffing_market_watch: {
    priorityThreshold: 75,
    defaultTags: ["arbeidsmarkt", "staffing"],
  },
  worker_updates: {
    priorityThreshold: 65,
    defaultTags: ["medewerker_nieuws"],
  },
} as const;

export const defaultCategoryAudienceMap: Partial<Record<AnalysisCategory, AudienceType>> = {
  horeca_nieuws: "ondernemers",
  hospitality_trends: "hotel_operators",
  arbeidsmarkt: "werkgevers",
  recruitment: "uitzendbureaus",
  wetgeving: "ondernemers",
  vergunningen: "ondernemers",
  compliance: "werkgevers",
  operations: "hotel_operators",
  hr: "werkgevers",
  hotel_nieuws: "hotel_operators",
};

export const contentIntelligenceFeatureFlag = "CONTENT_INTELLIGENCE_ENABLED";
