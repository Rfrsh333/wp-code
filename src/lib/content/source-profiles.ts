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
    sourceType: "rss",
    sourceUrl: "https://www.khn.nl",
    rssUrl: "https://news.google.com/rss/search?q=site:khn.nl&hl=nl&gl=NL&ceid=NL:nl",
    categoryFocus: ["horeca_nieuws", "wetgeving", "ondernemen"],
    region: "nl",
    trustLevel: "verified",
    fetchFrequency: "daily",
    ruleProfile: "regulation_priority",
  },
  {
    name: "NU.nl Economie",
    sourceType: "rss",
    sourceUrl: "https://www.nu.nl/economie",
    rssUrl: "https://www.nu.nl/rss/Economie",
    categoryFocus: ["wetgeving", "arbeidsmarkt", "horeca_nieuws"],
    region: "nl",
    trustLevel: "verified",
    fetchFrequency: "daily",
    ruleProfile: "regulation_priority",
  },
  {
    name: "Misset Horeca",
    sourceType: "rss",
    sourceUrl: "https://www.missethoreca.nl",
    rssUrl: "https://www.missethoreca.nl/rss",
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
  {
    name: "NOS Economie",
    sourceType: "rss",
    sourceUrl: "https://nos.nl/economie",
    rssUrl: "https://feeds.nos.nl/nosnieuwseconomie",
    categoryFocus: ["arbeidsmarkt", "wetgeving", "horeca_nieuws"],
    region: "nl",
    trustLevel: "verified",
    fetchFrequency: "daily",
    ruleProfile: "staffing_market_watch",
  },
  {
    name: "RTL Nieuws",
    sourceType: "rss",
    sourceUrl: "https://www.rtl.nl",
    rssUrl: "https://www.rtlnieuws.nl/rss.xml",
    categoryFocus: ["arbeidsmarkt", "horeca_nieuws", "wetgeving"],
    region: "nl",
    trustLevel: "high",
    fetchFrequency: "daily",
    ruleProfile: "staffing_market_watch",
  },
];
