import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabase";
import { OffertePDF } from "@/lib/pdf/offerte-pdf";
import crypto from "crypto";

// ============================================================================
// Offerte PDF Generation API
// ============================================================================
//
// POST /api/offerte
// Body: { aanvraagId: string }
//
// Generates a PDF offerte for a personeel aanvraag and returns it.
// Also stores the offerte in the database for tracking.

export async function POST(request: NextRequest) {
  try {
    const { aanvraagId } = await request.json();

    if (!aanvraagId) {
      return NextResponse.json(
        { error: "Aanvraag ID ontbreekt" },
        { status: 400 }
      );
    }

    // Fetch the personeel aanvraag from database
    const { data: aanvraag, error: dbError } = await supabase
      .from("personeel_aanvragen")
      .select("*")
      .eq("id", aanvraagId)
      .single();

    if (dbError || !aanvraag) {
      return NextResponse.json(
        { error: "Aanvraag niet gevonden" },
        { status: 404 }
      );
    }

    // Generate offerte nummer
    const year = new Date().getFullYear();
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const offerteNummer = `OFF-${year}-${randomPart}`;

    // Set validity period (14 days)
    const offerteDatum = new Date();
    const geldigTot = new Date();
    geldigTot.setDate(geldigTot.getDate() + 14);

    // Prepare data for PDF
    const offerteData = {
      bedrijfsnaam: aanvraag.bedrijfsnaam,
      contactpersoon: aanvraag.contactpersoon,
      email: aanvraag.email,
      telefoon: aanvraag.telefoon,
      locatie: aanvraag.locatie,
      typePersoneel: aanvraag.type_personeel || [],
      aantalPersonen: aanvraag.aantal_personen,
      contractType: aanvraag.contract_type || ["uitzendkracht"],
      gewenstUurtarief: aanvraag.gewenst_uurtarief || undefined,
      startDatum: aanvraag.start_datum,
      eindDatum: aanvraag.eind_datum || undefined,
      werkdagen: aanvraag.werkdagen || [],
      werktijden: aanvraag.werktijden,
      offerteNummer,
      offerteDatum,
      geldigTot,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      OffertePDF({ data: offerteData })
    );

    // Store offerte record in database (optional - for tracking)
    try {
      await supabase.from("offertes").insert({
        offerte_nummer: offerteNummer,
        aanvraag_id: aanvraagId,
        bedrijfsnaam: aanvraag.bedrijfsnaam,
        contactpersoon: aanvraag.contactpersoon,
        email: aanvraag.email,
        geldig_tot: geldigTot.toISOString(),
        status: "verzonden",
      });
    } catch {
      // Table might not exist yet, that's okay
      console.log("Offertes table not yet created");
    }

    // Create filename
    const filename = `offerte-${aanvraag.bedrijfsnaam
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}-${offerteNummer}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Offerte generation error:", error);
    return NextResponse.json(
      { error: "Fout bij genereren van offerte" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Generate offerte by aanvraag ID (for n8n webhook)
// ============================================================================
//
// GET /api/offerte?aanvraagId=xxx
//
// Used by n8n to automatically generate offertes after a new aanvraag

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aanvraagId = searchParams.get("aanvraagId");

    if (!aanvraagId) {
      return NextResponse.json(
        { error: "Aanvraag ID ontbreekt" },
        { status: 400 }
      );
    }

    // Fetch the personeel aanvraag from database
    const { data: aanvraag, error: dbError } = await supabase
      .from("personeel_aanvragen")
      .select("*")
      .eq("id", aanvraagId)
      .single();

    if (dbError || !aanvraag) {
      return NextResponse.json(
        { error: "Aanvraag niet gevonden" },
        { status: 404 }
      );
    }

    // Generate offerte nummer
    const year = new Date().getFullYear();
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    const offerteNummer = `OFF-${year}-${randomPart}`;

    // Set validity period (14 days)
    const offerteDatum = new Date();
    const geldigTot = new Date();
    geldigTot.setDate(geldigTot.getDate() + 14);

    // Prepare data for PDF
    const offerteData = {
      bedrijfsnaam: aanvraag.bedrijfsnaam,
      contactpersoon: aanvraag.contactpersoon,
      email: aanvraag.email,
      telefoon: aanvraag.telefoon,
      locatie: aanvraag.locatie,
      typePersoneel: aanvraag.type_personeel || [],
      aantalPersonen: aanvraag.aantal_personen,
      contractType: aanvraag.contract_type || ["uitzendkracht"],
      gewenstUurtarief: aanvraag.gewenst_uurtarief || undefined,
      startDatum: aanvraag.start_datum,
      eindDatum: aanvraag.eind_datum || undefined,
      werkdagen: aanvraag.werkdagen || [],
      werktijden: aanvraag.werktijden,
      offerteNummer,
      offerteDatum,
      geldigTot,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      OffertePDF({ data: offerteData })
    );

    // Create filename
    const filename = `offerte-${aanvraag.bedrijfsnaam
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}-${offerteNummer}.pdf`;

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Offerte generation error:", error);
    return NextResponse.json(
      { error: "Fout bij genereren van offerte" },
      { status: 500 }
    );
  }
}
