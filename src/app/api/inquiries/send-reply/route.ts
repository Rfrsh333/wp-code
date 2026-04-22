import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildAutoReplyEmailHtml } from "@/lib/email-templates";

// POST: Verstuur de (eventueel aangepaste) reply via Resend
export async function POST(request: NextRequest) {
  const { isAdmin, email: adminEmail } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized send-reply attempt by: ${adminEmail || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { inquiry_id, email_body, subject } = await request.json();

    if (!inquiry_id || !email_body) {
      return NextResponse.json({ error: "inquiry_id en email_body zijn vereist" }, { status: 400 });
    }

    // Haal aanvraag op
    const { data: inquiry, error: dbError } = await supabaseAdmin
      .from("personeel_aanvragen")
      .select("id, email")
      .eq("id", inquiry_id)
      .single();

    if (dbError || !inquiry) {
      return NextResponse.json({ error: "Aanvraag niet gevonden" }, { status: 404 });
    }

    // Haal instellingen op
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value")
      .in("key", ["sender_name", "sender_email"]);

    const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));
    const senderEmail = settingsMap.sender_email || "info@toptalentjobs.nl";
    const senderName = settingsMap.sender_name || "TopTalent Jobs";

    // Bouw HTML email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
    const bookingUrl = `${baseUrl}/afspraak-plannen?ref=${inquiry.id}`;
    const htmlContent = buildAutoReplyEmailHtml(email_body, bookingUrl);

    const { data: emailData, error: emailError } = await sendEmail({
      from: `${senderName} <${senderEmail}>`,
      to: [inquiry.email],
      subject: subject || "Reactie op je aanvraag — TopTalent Jobs",
      html: htmlContent,
    });

    if (emailError) {
      console.error("Send reply email error:", emailError);
      return NextResponse.json({ error: "Email versturen mislukt" }, { status: 500 });
    }

    // Update aanvraag status
    await supabaseAdmin
      .from("personeel_aanvragen")
      .update({
        replied_at: new Date().toISOString(),
        reply_email_id: emailData?.id || null,
        status: "in_behandeling",
      })
      .eq("id", inquiry_id);

    return NextResponse.json({
      success: true,
      message: `Email verstuurd naar ${inquiry.email}`,
      email_id: emailData?.id,
    });
  } catch (error) {
    console.error("Send reply error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
