import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyKlantReviewReminder } from "@/lib/klant-push-triggers";

/**
 * Review Reminders Cron
 *
 * Stuurt push notificaties naar klanten om beoordelingen achter te laten
 * voor diensten die gisteren zijn afgerond.
 *
 * POST /api/cron/review-reminders
 * Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let sent = 0;
  let skipped = 0;

  try {
    // Gisteren
    const gisteren = new Date();
    gisteren.setDate(gisteren.getDate() - 1);
    const gisterenStr = gisteren.toISOString().split("T")[0];

    // Haal afgeronde diensten van gisteren op met geaccepteerde aanmeldingen
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        medewerker_id,
        medewerker:medewerkers(naam),
        dienst:diensten!inner(id, datum, klant_id, functie, locatie)
      `)
      .eq("dienst.datum", gisterenStr)
      .eq("status", "geaccepteerd")
      .limit(200);

    if (!aanmeldingen?.length) {
      return NextResponse.json({
        success: true,
        message: "Geen diensten van gisteren",
        metrics: { sent: 0, skipped: 0, duration_ms: Date.now() - startTime },
      });
    }

    // Haal al beoordeelde combinaties op
    const { data: beoordeeld } = await supabaseAdmin
      .from("beoordelingen")
      .select("dienst_id, medewerker_id")
      .limit(1000);

    const beoordeeldSet = new Set(
      (beoordeeld || []).map((b) => `${b.dienst_id}-${b.medewerker_id}`)
    );

    // Groepeer per klant om niet te spammen
    const klantNotificaties = new Map<string, { medewerkerNaam: string; datum: string }>();

    for (const a of aanmeldingen) {
      const medewerker = Array.isArray(a.medewerker) ? a.medewerker[0] : a.medewerker;
      const dienst = Array.isArray(a.dienst) ? a.dienst[0] : a.dienst;

      if (!dienst?.klant_id || !medewerker?.naam) {
        skipped++;
        continue;
      }

      // Skip als al beoordeeld
      if (beoordeeldSet.has(`${dienst.id}-${a.medewerker_id}`)) {
        skipped++;
        continue;
      }

      // Maximaal 1 push per klant
      if (!klantNotificaties.has(dienst.klant_id)) {
        const formattedDate = new Date(dienst.datum).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
        });
        klantNotificaties.set(dienst.klant_id, {
          medewerkerNaam: medewerker.naam,
          datum: formattedDate,
        });
      }
    }

    // Stuur push per klant
    for (const [klantId, info] of klantNotificaties) {
      try {
        await notifyKlantReviewReminder(klantId, info.medewerkerNaam, info.datum);
        sent++;
      } catch {
        // Silently skip failed notifications
      }
    }
  } catch (error) {
    console.error("[CRON review-reminders] Onverwachte fout:", error);
    return NextResponse.json({ error: "Onverwachte fout" }, { status: 500 });
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    metrics: { sent, skipped, duration_ms: duration },
  });
}
