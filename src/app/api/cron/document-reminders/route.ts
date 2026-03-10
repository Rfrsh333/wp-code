import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendDocumentenReminder, logEmail } from "@/lib/candidate-onboarding";

/**
 * Cron Job: Automatische Document Upload Herinneringen
 *
 * Draait dagelijks om kandidaten te herinneren hun documenten te uploaden.
 *
 * Logic:
 * 1. Vind kandidaten met status "documenten_opvragen"
 * 2. Filter: documenten_verzoek_verstuurd_op > 3 dagen geleden
 * 3. Filter: geen reminder verstuurd, of laatste reminder > 3 dagen geleden
 * 4. Verstuur friendly reminder met upload link
 * 5. Update documenten_reminder_verstuurd_op timestamp
 *
 * Setup in Vercel/deployment platform:
 * - URL: https://yourdomain.com/api/cron/document-reminders
 * - Schedule: Daily at 10:00 AM
 * - Cron: 0 10 * * * (elke dag om 10:00)
 *
 * Security:
 * - Add CRON_SECRET to .env.local
 * - Pass as Authorization header: Bearer CRON_SECRET
 */

export async function GET(request: NextRequest) {
  try {
    // Security: Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[SECURITY] Unauthorized cron access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Document reminders job started");

    // Vind kandidaten die reminder nodig hebben
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const { data: kandidaten, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select(`
        id,
        voornaam,
        achternaam,
        email,
        uitbetalingswijze,
        onboarding_status,
        onboarding_portal_token,
        documenten_verzoek_verstuurd_op,
        documenten_reminder_verstuurd_op
      `)
      .eq("onboarding_status", "documenten_opvragen")
      .lt("documenten_verzoek_verstuurd_op", threeDaysAgo.toISOString())
      .or(`documenten_reminder_verstuurd_op.is.null,documenten_reminder_verstuurd_op.lt.${threeDaysAgo.toISOString()}`);

    if (fetchError) {
      console.error("[CRON] Fetch error:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!kandidaten || kandidaten.length === 0) {
      console.log("[CRON] No kandidaten need reminders");
      return NextResponse.json({
        success: true,
        message: "No reminders needed",
        count: 0,
      });
    }

    console.log(`[CRON] Found ${kandidaten.length} kandidaten needing reminders`);

    // Verstuur reminders met rate limiting (max 10 per run)
    const maxReminders = 10;
    const toRemind = kandidaten.slice(0, maxReminders);
    const results = [];

    for (const kandidaat of toRemind) {
      try {
        // Check if kandidaat has valid token, otherwise skip
        if (!kandidaat.onboarding_portal_token) {
          console.warn(`[CRON] Kandidaat ${kandidaat.id} has no upload token, skipping`);
          results.push({
            kandidaat_id: kandidaat.id,
            status: "skipped",
            reason: "no_token",
          });
          continue;
        }

        // Send reminder email
        const emailResult = await sendDocumentenReminder(
          {
            id: kandidaat.id,
            voornaam: kandidaat.voornaam,
            achternaam: kandidaat.achternaam,
            email: kandidaat.email,
            uitbetalingswijze: kandidaat.uitbetalingswijze,
          },
          kandidaat.onboarding_portal_token
        );

        if (emailResult.error) {
          console.error(`[CRON] Email error for ${kandidaat.email}:`, emailResult.error);
          results.push({
            kandidaat_id: kandidaat.id,
            status: "failed",
            error: emailResult.error.message,
          });
          continue;
        }

        // Log email
        await logEmail(
          kandidaat.id,
          "documenten_reminder",
          kandidaat.email,
          `${kandidaat.voornaam}, vergeet je documenten niet! 📄`,
          emailResult.data?.id
        );

        // Update reminder timestamp
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ documenten_reminder_verstuurd_op: new Date().toISOString() })
          .eq("id", kandidaat.id);

        console.log(`[CRON] ✅ Reminder sent to ${kandidaat.email}`);

        results.push({
          kandidaat_id: kandidaat.id,
          status: "sent",
          email: kandidaat.email,
        });

        // Rate limiting: wait 1 second between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[CRON] Error processing kandidaat ${kandidaat.id}:`, error);
        results.push({
          kandidaat_id: kandidaat.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.status === "sent").length;
    const failedCount = results.filter(r => r.status === "failed" || r.status === "error").length;

    console.log(`[CRON] Document reminders job completed: ${successCount} sent, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      total_kandidaten: kandidaten.length,
      processed: toRemind.length,
      sent: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("[CRON] Document reminders error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
