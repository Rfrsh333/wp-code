import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-service";
import { isAdminEmail } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

function renderAdminResetEmail(actionLink: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#F27501 0%,#d96800 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#fff;">TopTalent</div>
          </div>
          <div style="padding:36px 28px;line-height:1.6;">
            <p style="font-size:32px;margin:0 0 16px;">🔐</p>
            <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Stel een nieuw admin wachtwoord in</h1>
            <p>Er is een verzoek gedaan om het wachtwoord van uw adminaccount opnieuw in te stellen. Via de knop hieronder kiest u direct een nieuw wachtwoord.</p>
            <p style="text-align:center;margin:32px 0;">
              <a href="${actionLink}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
                Nieuw wachtwoord instellen
              </a>
            </p>
            <p style="font-size:14px;color:#666;">Deze link is beperkt geldig. Heeft u dit niet aangevraagd? Dan kunt u deze mail negeren.</p>
            <p style="font-size:13px;word-break:break-all;color:#666;">${actionLink}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`admin-password-reset:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "E-mail is verplicht" }, { status: 400 });
    }

    if (isAdminEmail(normalizedEmail)) {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: `${getBaseUrl()}/admin/wachtwoord-reset`,
        },
      });

      if (error) {
        console.error("Admin password reset link generation error:", error);
      } else {
        const actionLink = data.properties?.action_link;

        if (actionLink) {
          const mailResult = await sendEmail({
            from: "TopTalent <info@toptalentjobs.nl>",
            to: [normalizedEmail],
            replyTo: "info@toptalentjobs.nl",
            subject: "Stel een nieuw admin wachtwoord in",
            html: renderAdminResetEmail(actionLink),
          });

          if (mailResult.error) {
            console.error("Admin password reset email send error:", mailResult.error);
          }
        } else {
          console.error("Admin password reset link missing action_link", data);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Als dit e-mailadres bij een adminaccount hoort, is er een resetmail verstuurd.",
    });
  } catch (error) {
    console.error("Admin password reset request error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het versturen van de resetmail" }, { status: 500 });
  }
}
