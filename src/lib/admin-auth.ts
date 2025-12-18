// Admin authenticatie helpers

/**
 * Checkt of een email adres een admin is
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Haalt de lijst van admin emails op
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
}
