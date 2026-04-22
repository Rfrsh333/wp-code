import { Resend } from "resend";

// ── Singleton Resend client ──────────────────────────────────────────
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is niet geconfigureerd");
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ── Types ────────────────────────────────────────────────────────────
export interface EmailOptions {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
  /** "marketing" adds List-Unsubscribe headers */
  type?: "transactional" | "marketing";
  /** When true, checks suppression list before sending */
  checkSuppression?: boolean;
  /** Optional: used for email_log */
  kandidaatId?: string;
  /** Optional: used for email_log */
  emailType?: string;
}

export interface EmailResult {
  data: { id: string } | null;
  error: { message: string; name: string } | null;
  suppressed?: boolean;
}

// ── Plain-text generation ────────────────────────────────────────────
export function stripHtml(html: string): string {
  return html
    // Replace <br>, <br/>, <br /> with newlines
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace closing block tags with double newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|td|th)>/gi, "\n\n")
    // Replace <li> with bullet points
    .replace(/<li[^>]*>/gi, "- ")
    // Replace <a href="url">text</a> with text (url)
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rarr;/g, "->")
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, "\n\n")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

// ── Suppression check ────────────────────────────────────────────────
async function isSuppressed(email: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/lib/supabase");

  // Check inschrijvingen table for email_bounced flag
  const { data: kandidaat } = await supabaseAdmin
    .from("inschrijvingen")
    .select("email_bounced")
    .eq("email", email)
    .eq("email_bounced", true)
    .limit(1)
    .maybeSingle();

  if (kandidaat) return true;

  // Check acquisitie_leads for "email-bounced" tag
  const { data: lead } = await supabaseAdmin
    .from("acquisitie_leads")
    .select("id")
    .eq("email", email)
    .contains("tags", ["email-bounced"])
    .limit(1)
    .maybeSingle();

  return !!lead;
}

// ── Email logging ────────────────────────────────────────────────────
async function logEmailSend(
  options: EmailOptions,
  resendEmailId: string | null,
  status: "sent" | "suppressed" | "failed",
  errorMessage?: string
) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    await supabaseAdmin.from("email_log").insert({
      kandidaat_id: options.kandidaatId || null,
      email_type: options.emailType || options.type || "transactional",
      recipient: options.to[0],
      subject: options.subject,
      sent_at: new Date().toISOString(),
      status,
      resend_email_id: resendEmailId,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("[email-service] logEmailSend error:", err);
  }
}

// ── Retry helper ─────────────────────────────────────────────────────
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main send function ───────────────────────────────────────────────
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // 1. Suppression check
  if (options.checkSuppression) {
    const suppressed = await isSuppressed(options.to[0]);
    if (suppressed) {
      console.log(`[email-service] Suppressed: ${options.to[0]} (bounced)`);
      await logEmailSend(options, null, "suppressed");
      return { data: null, error: null, suppressed: true };
    }
  }

  // 2. Build payload
  const payload: Parameters<Resend["emails"]["send"]>[0] = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: stripHtml(options.html),
    ...(options.replyTo && { replyTo: options.replyTo }),
    ...(options.attachments && { attachments: options.attachments }),
  };

  // 3. Marketing headers
  if (options.type === "marketing") {
    (payload as unknown as Record<string, unknown>).headers = {
      "List-Unsubscribe": "<mailto:unsubscribe@toptalentjobs.nl?subject=unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  // 4. Send with 1 retry (2s backoff)
  let lastError: { message: string; name: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await getResend().emails.send(payload);

      if (result.error) {
        lastError = result.error;
        if (attempt === 0) {
          console.warn(`[email-service] Attempt 1 failed for ${options.to[0]}, retrying in 2s:`, result.error);
          await wait(2000);
          continue;
        }
      } else {
        await logEmailSend(options, result.data?.id ?? null, "sent");
        return { data: result.data, error: null };
      }
    } catch (err) {
      lastError = { message: err instanceof Error ? err.message : String(err), name: "SendError" };
      if (attempt === 0) {
        console.warn(`[email-service] Attempt 1 threw for ${options.to[0]}, retrying in 2s:`, err);
        await wait(2000);
        continue;
      }
    }
  }

  // Both attempts failed
  console.error(`[email-service] Failed after 2 attempts for ${options.to[0]}:`, lastError);
  await logEmailSend(options, null, "failed", lastError?.message);
  return { data: null, error: lastError };
}
