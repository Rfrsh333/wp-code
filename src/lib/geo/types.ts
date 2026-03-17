/**
 * GEO Agent Types — Generative Engine Optimization
 */

export type GeoContentType = "city_page" | "faq_cluster" | "service_guide" | "authority_article";
export type GeoStatus = "concept" | "review" | "gepubliceerd" | "gearchiveerd";
export type GeoStad = "amsterdam" | "rotterdam" | "den-haag" | "utrecht";

export const GEO_STEDEN: Record<GeoStad, { naam: string; regio: string }> = {
  amsterdam: { naam: "Amsterdam", regio: "Noord-Holland" },
  rotterdam: { naam: "Rotterdam", regio: "Zuid-Holland" },
  "den-haag": { naam: "Den Haag", regio: "Zuid-Holland" },
  utrecht: { naam: "Utrecht", regio: "Utrecht" },
};

export const GEO_CONTENT_TYPES: Record<GeoContentType, { label: string; beschrijving: string }> = {
  city_page: {
    label: "Stadspagina",
    beschrijving: "Uitgebreide landingspagina voor horeca uitzendwerk in een specifieke stad",
  },
  faq_cluster: {
    label: "FAQ Cluster",
    beschrijving: "Veelgestelde vragen cluster rond een specifiek thema per stad",
  },
  service_guide: {
    label: "Dienstgids",
    beschrijving: "Gedetailleerde gids over een specifieke dienst (uitzenden/detachering/recruitment)",
  },
  authority_article: {
    label: "Autoriteitsartikel",
    beschrijving: "Diepgaand artikel dat TopTalent positioneert als expert in horeca staffing",
  },
};

export interface GeoContent {
  id: string;
  created_at: string;
  updated_at: string;
  content_type: GeoContentType;
  stad: string;
  slug: string;
  taal: string;
  title: string;
  meta_description: string | null;
  seo_title: string | null;
  canonical_url: string | null;
  body_markdown: string;
  excerpt: string | null;
  structured_data: any[];
  faq_items: FaqItem[];
  bronnen: Bron[];
  statistieken: Statistiek[];
  status: GeoStatus;
  review_notities: string | null;
  gepubliceerd_op: string | null;
  gegenereerd_door: string;
  primary_keywords: string[];
  secondary_keywords: string[];
  versie: number;
  vorige_versie_id: string | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Bron {
  title: string;
  url: string;
  type: "officieel" | "onderzoek" | "nieuwsbron" | "intern";
}

export interface Statistiek {
  stat: string;
  bron: string;
  jaar: number;
}

export interface GeoGenerationRequest {
  content_type: GeoContentType;
  stad: GeoStad;
  focus_keywords?: string[];
  extra_context?: string;
}

export interface GeoGenerationResult {
  content: Omit<GeoContent, "id" | "created_at" | "updated_at" | "status" | "gepubliceerd_op" | "versie" | "vorige_versie_id">;
  tokens_gebruikt: number;
  model: string;
  duur_ms: number;
}

export interface GeoLogEntry {
  id: string;
  created_at: string;
  content_id: string | null;
  actie: string;
  details: any;
  tokens_gebruikt: number;
  model: string;
  duur_ms: number;
}
