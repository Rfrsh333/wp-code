import type { FetchFrequency, SourceTrustLevel, SourceType } from "@/lib/content/types";

export interface SeedSourceProfile {
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  rssUrl: string | null;
  categoryFocus: string[];
  region: string;
  trustLevel: SourceTrustLevel;
  fetchFrequency: FetchFrequency;
  ruleProfile: string;
}

export const seedSourceProfiles: SeedSourceProfile[] = [
  {
    name: "Koninklijke Horeca Nederland",
    sourceType: "scrape",
    sourceUrl: "https://www.khn.nl",
    rssUrl: null,
    categoryFocus: ["horeca_nieuws", "wetgeving", "ondernemen"],
    region: "nl",
    trustLevel: "verified",
    fetchFrequency: "daily",
    ruleProfile: "regulation_priority",
  },
  {
    name: "Rijksoverheid Ondernemen",
    sourceType: "rss",
    sourceUrl: "https://www.rijksoverheid.nl/onderwerpen/ondernemen",
    rssUrl: null,
    categoryFocus: ["wetgeving", "compliance", "subsidies"],
    region: "nl",
    trustLevel: "verified",
    fetchFrequency: "daily",
    ruleProfile: "regulation_priority",
  },
  {
    name: "Misset Horeca",
    sourceType: "rss",
    sourceUrl: "https://www.missethoreca.nl",
    rssUrl: "https://cms.missethoreca.nl/rss_feed/nieuws/",
    categoryFocus: ["horeca_nieuws", "hospitality_trends", "operations"],
    region: "nl",
    trustLevel: "high",
    fetchFrequency: "daily",
    ruleProfile: "staffing_market_watch",
  },
  {
    name: "Google News - Horeca Nederland",
    sourceType: "rss",
    sourceUrl: "https://news.google.com",
    rssUrl: "https://news.google.com/rss/search?q=horeca+personeel+OR+horeca+cao+OR+horeca+vergunning+OR+hospitality+staffing&hl=nl&gl=NL&ceid=NL:nl",
    categoryFocus: ["horeca_nieuws", "arbeidsmarkt", "wetgeving"],
    region: "nl",
    trustLevel: "medium",
    fetchFrequency: "daily",
    ruleProfile: "staffing_market_watch",
  },
];
