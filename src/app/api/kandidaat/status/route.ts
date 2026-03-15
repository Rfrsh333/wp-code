import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { createHash } from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

function renderEmailLayout(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#F27501 0%,#d96800 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#fff;">TopTalent</div>
          </div>
          <div style="padding:36px 28px;line-height:1.6;">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

// Generate a secure token based on kandidaat email and a secret
function generateToken(email: string, kandidaatId: string): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET;
  if (!secret) throw new Error("[SECURITY] KANDIDAAT_TOKEN_SECRET environment variable is required");
  const data = `${email}:${kandidaatId}:${secret}`;
  return createHash("sha256").update(data).digest("hex").substring(0, 32);
}

function validateToken(token: string, email: string, kandidaatId: string): boolean {
  return token === generateToken(email, kandidaatId);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    // Fetch all kandidaten (we'll validate the token against them)
    const { data: kandidaten, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, email, voornaam, achternaam, onboarding_status, documenten_compleet, inzetbaar_op, goedgekeurd_op, created_at, onboarding_checklist");

    if (fetchError || !kandidaten) {
      return NextResponse.json({ error: "Fout bij ophalen data" }, { status: 500 });
    }

    // Find kandidaat with matching token
    const kandidaat = kandidaten.find((k) => validateToken(token, k.email, k.id));

    if (!kandidaat) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Fetch kandidaat documenten
    const { data: documenten } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("id, document_type, review_status, uploaded_at")
      .eq("inschrijving_id", kandidaat.id)
      .order("uploaded_at", { ascending: false });

    return NextResponse.json({
      kandidaat: {
        voornaam: kandidaat.voornaam,
        achternaam: kandidaat.achternaam,
        email: kandidaat.email,
        onboarding_status: kandidaat.onboarding_status || "nieuw",
        documenten_compleet: kandidaat.documenten_compleet || false,
        inzetbaar_op: kandidaat.inzetbaar_op,
        goedgekeurd_op: kandidaat.goedgekeurd_op,
        created_at: kandidaat.created_at,
        onboarding_checklist: kandidaat.onboarding_checklist || {},
      },
      documenten: documenten?.map((doc) => ({
        id: doc.id,
        document_type: doc.document_type,
        review_status: doc.review_status,
        uploaded_at: doc.uploaded_at,
      })) || [],
    });
  } catch (error) {
    console.error("Kandidaat status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST endpoint to generate and send a status link via email
export async function POST(request: NextRequest) {
  try {
    // KRITIEK: Verify admin before generating status tokens
    const { isAdmin, email } = await verifyAdmin(request);
    if (!isAdmin) {
      console.warn(`[SECURITY] Unauthorized kandidaat status token generation attempt by: ${email || 'unknown'}`);
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const { kandidaat_id, send_email = false } = await request.json();

    if (!kandidaat_id) {
      return NextResponse.json({ error: "Kandidaat ID vereist" }, { status: 400 });
    }

    // Fetch kandidaat
    const { data: kandidaat, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, email, voornaam, achternaam, onboarding_status")
      .eq("id", kandidaat_id)
      .maybeSingle();

    if (fetchError || !kandidaat) {
      return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
    }

    // Generate token
    const token = generateToken(kandidaat.email, kandidaat.id);
    const statusUrl = `${getBaseUrl()}/kandidaat/status?token=${token}`;
    const firstName = kandidaat.voornaam || kandidaat.email.split('@')[0];

    // Send email if requested
    if (send_email) {
      try {
        await resend.emails.send({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [kandidaat.email],
          replyTo: "info@toptalentjobs.nl",
          subject: "Je onboarding status bij TopTalent",
          html: renderEmailLayout(`
            <p style="font-size:32px;margin:0 0 16px;">📋</p>
            <h1 style="margin:0 0 16px;color:#F27501;font-size:28px;">Hey ${firstName}, bekijk je status</h1>
            <p>Je hebt een statuslink aangevraagd voor je onboarding bij TopTalent. Klik op de knop hieronder om je actuele status te bekijken.</p>
            <div style="background:#fff7f1;border:1px solid #f8d4b4;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;"><strong>In je overzicht zie je:</strong></p>
              <ul style="margin:0;padding-left:20px;">
                <li>Je huidige onboarding status</li>
                <li>Welke documenten al zijn geüpload</li>
                <li>Eventuele openstaande acties</li>
                <li>Je inzetbaarheidsdatum</li>
              </ul>
            </div>
            <p style="text-align:center;margin:32px 0;">
              <a href="${statusUrl}" style="display:inline-block;background:#0B2447;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">
                Bekijk mijn status
              </a>
            </p>
            <p style="font-size:14px;color:#666;">Deze link blijft geldig gedurende je onboarding proces.</p>
            <p style="font-size:13px;word-break:break-all;color:#999;margin-top:24px;">${statusUrl}</p>
          `),
        });

        return NextResponse.json({
          success: true,
          statusUrl,
          message: "Status link verzonden naar " + kandidaat.email,
          email_sent: true,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Still return the link even if email fails
        return NextResponse.json({
          success: true,
          statusUrl,
          message: "Link gegenereerd maar email verzenden mislukt",
          email_sent: false,
          email_error: emailError instanceof Error ? emailError.message : "Unknown error",
        });
      }
    }

    // If no email requested, just return the link
    return NextResponse.json({
      success: true,
      statusUrl,
      message: "Status link gegenereerd",
      email_sent: false,
    });
  } catch (error) {
    console.error("Generate status link error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
