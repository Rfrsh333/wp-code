import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { buildDocumentVerlooptHtml } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dertigDagenVoorruit = new Date();
    dertigDagenVoorruit.setDate(dertigDagenVoorruit.getDate() + 30);
    const targetDate = dertigDagenVoorruit.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const zevenDagenGeleden = new Date();
    zevenDagenGeleden.setDate(zevenDagenGeleden.getDate() - 7);
    const deduplicatieDatum = zevenDagenGeleden.toISOString();

    let sent = 0;
    const geemaildeMedewerkers = new Set<string>();

    // 1. Medewerker documenten (ID-bewijs, werkvergunning, etc.)
    const { data: documenten } = await supabaseAdmin
      .from("medewerker_documenten")
      .select("id, document_type, expiry_date, medewerker_id, uploaded_at, medewerkers(naam, email)")
      .not("expiry_date", "is", null)
      .gte("expiry_date", today)
      .lte("expiry_date", targetDate);

    for (const doc of documenten || []) {
      const medewerker = Array.isArray(doc.medewerkers) ? doc.medewerkers[0] : doc.medewerkers;
      if (!medewerker?.email) continue;

      // Deduplicatie: skip als medewerker al gemaild is voor dit document type
      const dedupeKey = `${doc.medewerker_id}_doc_${doc.document_type}`;
      if (geemaildeMedewerkers.has(dedupeKey)) continue;

      try {
        await sendEmail({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [medewerker.email],
          subject: `Document verloopt binnenkort: ${doc.document_type}`,
          html: buildDocumentVerlooptHtml({
            naam: medewerker.naam,
            documentType: doc.document_type,
            verloopDatum: new Date(doc.expiry_date).toLocaleDateString("nl-NL", {
              day: "numeric", month: "long", year: "numeric",
            }),
          }),
        });
        sent++;
        geemaildeMedewerkers.add(dedupeKey);
      } catch (err) {
        console.error(`Failed to send expiry email for doc ${doc.id}:`, err);
      }
    }

    // 2. Certificeringen (VSH, BHV, etc.)
    const { data: certificeringen } = await supabaseAdmin
      .from("certificeringen")
      .select("id, naam, verloopt_op, medewerker_id, medewerkers(naam, email)")
      .not("verloopt_op", "is", null)
      .gte("verloopt_op", today)
      .lte("verloopt_op", targetDate);

    for (const cert of certificeringen || []) {
      const medewerker = Array.isArray(cert.medewerkers) ? cert.medewerkers[0] : cert.medewerkers;
      if (!medewerker?.email) continue;

      const dedupeKey = `${cert.medewerker_id}_cert_${cert.naam}`;
      if (geemaildeMedewerkers.has(dedupeKey)) continue;

      try {
        await sendEmail({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [medewerker.email],
          subject: `Certificering verloopt binnenkort: ${cert.naam}`,
          html: buildDocumentVerlooptHtml({
            naam: medewerker.naam,
            documentType: `Certificering: ${cert.naam}`,
            verloopDatum: new Date(cert.verloopt_op).toLocaleDateString("nl-NL", {
              day: "numeric", month: "long", year: "numeric",
            }),
          }),
        });
        sent++;
        geemaildeMedewerkers.add(dedupeKey);
      } catch (err) {
        console.error(`Failed to send expiry email for cert ${cert.id}:`, err);
      }
    }

    // 3. Werkvergunningen (medewerkers.werkvergunning_geldig_tot)
    const { data: werkvergunningen } = await supabaseAdmin
      .from("medewerkers")
      .select("id, naam, email, werkvergunning_geldig_tot")
      .not("werkvergunning_geldig_tot", "is", null)
      .gte("werkvergunning_geldig_tot", today)
      .lte("werkvergunning_geldig_tot", targetDate);

    for (const mw of werkvergunningen || []) {
      if (!mw.email) continue;

      const dedupeKey = `${mw.id}_werkvergunning`;
      if (geemaildeMedewerkers.has(dedupeKey)) continue;

      try {
        await sendEmail({
          from: "TopTalent <info@toptalentjobs.nl>",
          to: [mw.email],
          subject: "Werkvergunning verloopt binnenkort",
          html: buildDocumentVerlooptHtml({
            naam: mw.naam,
            documentType: "Werkvergunning",
            verloopDatum: new Date(mw.werkvergunning_geldig_tot).toLocaleDateString("nl-NL", {
              day: "numeric", month: "long", year: "numeric",
            }),
          }),
        });
        sent++;
        geemaildeMedewerkers.add(dedupeKey);
      } catch (err) {
        console.error(`Failed to send werkvergunning expiry email for ${mw.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: (documenten?.length || 0) + (certificeringen?.length || 0) + (werkvergunningen?.length || 0),
      sent,
    });
  } catch (error) {
    console.error("Document expiry cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
