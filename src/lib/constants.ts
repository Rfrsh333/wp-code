/**
 * Central constants for company contact info and URLs.
 * Use these instead of hardcoding values throughout the codebase.
 */

export const COMPANY_PHONE = process.env.CONTACT_PHONE_NUMBER || "+31 6 49 71 37 66";
export const COMPANY_EMAIL = "info@toptalentjobs.nl";
export const COMPANY_INVOICE_EMAIL = "facturen@toptalentjobs.nl";
export const COMPANY_NOREPLY_EMAIL = "noreply@toptalentjobs.nl";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
export const COMPANY_NAME = "TopTalent Jobs";
