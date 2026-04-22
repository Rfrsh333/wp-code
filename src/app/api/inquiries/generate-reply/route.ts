import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAutoReply, generateAutoReplySubject } from "@/lib/inquiry-auto-reply";
import { captureRouteError } from "@/lib/sentry-utils";

// POST: Genereer een auto-reply preview (stuurt nog niets)
export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized generate-reply attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { inquiry_id } = await request.json();

    if (!inquiry_id) {
      return NextResponse.json({ error: "inquiry_id is vereist" }, { status: 400 });
    }

    // Haal aanvraag op
    const { data: inquiry, error: dbError } = await supabaseAdmin
      .from("personeel_aanvragen")
      .select("id, contactpersoon, bedrijfsnaam, email, type_personeel, aantal_personen, start_datum, eind_datum, opmerkingen, locatie")
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
    const senderName = settingsMap.sender_name || "TopTalent Jobs";

    // Bouw booking URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
    const bookingUrl = `${baseUrl}/afspraak-plannen?ref=${inquiry.id}`;

    // Genereer auto-reply
    const emailBody = generateAutoReply(
      {
        id: inquiry.id,
        contactpersoon: inquiry.contactpersoon,
        bedrijfsnaam: inquiry.bedrijfsnaam,
        email: inquiry.email,
        type_personeel: inquiry.type_personeel || [],
        aantal_personen: inquiry.aantal_personen,
        start_datum: inquiry.start_datum,
        eind_datum: inquiry.eind_datum,
        opmerkingen: inquiry.opmerkingen,
        locatie: inquiry.locatie,
      },
      { senderName, bookingUrl },
    );

    const subject = generateAutoReplySubject();

    return NextResponse.json({
      subject,
      body: emailBody,
      booking_url: bookingUrl,
      sender_name: senderName,
      sender_email: settingsMap.sender_email || "info@toptalentjobs.nl",
      inquiry: {
        id: inquiry.id,
        contactpersoon: inquiry.contactpersoon,
        bedrijfsnaam: inquiry.bedrijfsnaam,
        email: inquiry.email,
        type_personeel: inquiry.type_personeel,
        aantal_personen: inquiry.aantal_personen,
        start_datum: inquiry.start_datum,
        locatie: inquiry.locatie,
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/inquiries/generate-reply", action: "POST" });
    // console.error("Generate reply error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
