import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import {
  sendIntakeBevestiging,
  sendDocumentenVerzoek,
  sendWelkomstmail,
  logEmail,
} from "@/lib/candidate-onboarding";

interface OnboardingRequest {
  kandidaat_id: string;
  action: "bevestiging" | "documenten_opvragen" | "inzetbaar";
  force_resend?: boolean; // Bypass 24h idempotency check
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, email: adminEmail, role } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: OnboardingRequest = await request.json();
    const { kandidaat_id, action, force_resend } = body;

    if (!kandidaat_id || !action) {
      return NextResponse.json({ error: "Kandidaat ID en action vereist" }, { status: 400 });
    }

    // Fetch kandidaat
    const { data: kandidaat, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, voornaam, achternaam, email, uitbetalingswijze")
      .eq("id", kandidaat_id)
      .single();

    if (fetchError || !kandidaat) {
      return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
    }

    // Check if email was already sent recently (idempotency - prevent duplicates within 24h)
    // Skip check if force_resend is true (e.g., admin explicitly resending expired link)
    if (!force_resend) {
      const { data: recentEmail } = await supabaseAdmin
        .from("email_log")
        .select("id")
        .eq("kandidaat_id", kandidaat_id)
        .eq("email_type", action)
        .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (recentEmail) {
        return NextResponse.json({
          message: "Email al verzonden in afgelopen 24 uur",
          skip: true,
        });
      }
    }

    // Send appropriate email based on action
    let emailResult;
    let subject = "";

    switch (action) {
      case "bevestiging":
        emailResult = await sendIntakeBevestiging(kandidaat);
        subject = `Hey ${kandidaat.voornaam}! 👋 Je inschrijving is binnen`;
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ intake_bevestiging_verstuurd_op: new Date().toISOString() })
          .eq("id", kandidaat_id);
        break;

      case "documenten_opvragen":
        emailResult = await sendDocumentenVerzoek(kandidaat);
        subject = `${kandidaat.voornaam}, we hebben je documenten nodig! 📄`;
        await supabaseAdmin
          .from("inschrijvingen")
          .update({
            documenten_verzoek_verstuurd_op: new Date().toISOString(),
            documenten_reminder_verstuurd_op: null,
          })
          .eq("id", kandidaat_id);
        break;

      case "inzetbaar":
        emailResult = await sendWelkomstmail(kandidaat);
        subject = `🎉 ${kandidaat.voornaam}, je bent inzetbaar!`;
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ welkom_mail_verstuurd_op: new Date().toISOString() })
          .eq("id", kandidaat_id);
        break;

      default:
        return NextResponse.json({ error: "Ongeldige action" }, { status: 400 });
    }

    if (emailResult.error) {
      console.error("Email send error:", emailResult.error);
      return NextResponse.json({ error: "Email verzenden mislukt" }, { status: 500 });
    }

    // Log email met Resend email ID voor tracking
    await logEmail(kandidaat_id, action, kandidaat.email, subject, emailResult.data?.id);

    // Log admin action
    console.log(`[ONBOARDING EMAIL] Admin ${adminEmail} triggered ${action} email for kandidaat ${kandidaat.voornaam} ${kandidaat.achternaam}`);
    await logAuditEvent({
      actorEmail: adminEmail,
      actorRole: role,
      action: `send_${action}_email`,
      targetTable: "inschrijvingen",
      targetId: kandidaat_id,
      summary: `${action} mail verstuurd naar ${kandidaat.email}`,
      metadata: {
        recipient: kandidaat.email,
        emailId: emailResult.data?.id || null,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      recipient: kandidaat.email,
      email_id: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Onboarding email error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
