/**
 * HTML sanitization utilities for email templates and user-facing output.
 * Prevents XSS / HTML injection when interpolating user input into HTML strings.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const ESCAPE_RE = /[&<>"'/]/g;

/**
 * Escape a string for safe inclusion in HTML.
 * Returns empty string for nullish / non-string values.
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch] || ch);
}

/**
 * Escape a string for safe use inside an HTML attribute value (already quoted).
 * Same as escapeHtml but kept as an alias for readability.
 */
export const escapeAttr = escapeHtml;
