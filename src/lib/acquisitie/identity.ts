function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned || null;
}

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) {
    return digits.replace(/[^\d]/g, "");
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return `31${digits.slice(1)}`;
  }

  return digits.replace(/[^\d]/g, "");
}

export function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;

  try {
    const withProtocol = value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] || null;
  }
}

function normalizeHandle(value?: string | null): string | null {
  if (!value) return null;

  return stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^https?:\/\/(www\.)?facebook\.com\//, "")
    .replace(/[/?#].*$/, "") || null;
}

export function normalizeInstagramHandle(value?: string | null): string | null {
  return normalizeHandle(value);
}

export function normalizeFacebookHandle(value?: string | null): string | null {
  return normalizeHandle(value);
}

export function normalizeLinkedinUrl(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  const withProtocol = cleaned.startsWith("http://") || cleaned.startsWith("https://")
    ? cleaned
    : `https://${cleaned}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes("linkedin.com")) return cleaned.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    return `linkedin.com${path}`.toLowerCase();
  } catch {
    return cleaned.toLowerCase();
  }
}

export function normalizeCompanyName(value?: string | null): string | null {
  if (!value) return null;

  const normalized = stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(bv|b\.v|vof|v\.o\.f|cv|holding|groep|restaurant|horeca)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

export interface LeadIdentityInput {
  email?: string | null;
  telefoon?: string | null;
  website?: string | null;
  instagram_handle?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  bedrijfsnaam?: string | null;
}

export interface LeadIdentityFields {
  normalized_email: string | null;
  normalized_phone: string | null;
  website_domain: string | null;
  instagram_handle: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  normalized_bedrijfsnaam: string | null;
}

export function buildLeadIdentityFields(input: LeadIdentityInput): LeadIdentityFields {
  return {
    normalized_email: normalizeEmail(input.email),
    normalized_phone: normalizePhone(input.telefoon),
    website_domain: normalizeDomain(input.website),
    instagram_handle: normalizeInstagramHandle(input.instagram_handle),
    linkedin_url: normalizeLinkedinUrl(input.linkedin_url),
    facebook_url: normalizeFacebookHandle(input.facebook_url),
    normalized_bedrijfsnaam: normalizeCompanyName(input.bedrijfsnaam),
  };
}
