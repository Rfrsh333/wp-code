import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { CalculatorPDF } from "@/lib/pdf/calculator-pdf";
import type { CalculatorInputs, Resultaten, VergelijkingType, FunctieType, ErvaringType, InzetType } from "@/lib/calculator/types";

// ============================================================================
// PDF Generation API
// ============================================================================
//
// GET /api/calculator/pdf?token=xxx
//
// Validates the token, generates the PDF, and streams it to the browser.
// Tokens expire after 24 hours for security.

export async function GET(request: NextRequest) {
  try {
    // Get token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token ontbreekt" },
        { status: 400 }
      );
    }

    // Validate token format (64 character hex string)
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { error: "Ongeldig token formaat" },
        { status: 400 }
      );
    }

    // Look up lead by token
    const { data: lead, error: dbError } = await supabase
      .from("calculator_leads")
      .select("*")
      .eq("pdf_token", token)
      .single();

    if (dbError || !lead) {
      return NextResponse.json(
        { error: "Token niet gevonden of verlopen" },
        { status: 404 }
      );
    }

    // Check if token has expired
    const expiresAt = new Date(lead.pdf_token_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token is verlopen. Vraag een nieuwe berekening aan." },
        { status: 410 }
      );
    }

    // Reconstruct inputs from database
    const inputs: CalculatorInputs = {
      functie: lead.functie as FunctieType,
      aantalMedewerkers: lead.aantal_medewerkers,
      ervaring: lead.ervaring as ErvaringType,
      urenPerDienst: lead.uren_per_dienst,
      dagenPerWeek: lead.dagen_per_week,
      inzetType: lead.inzet_type as InzetType,
      vergelijkingen: lead.vergelijkingen as VergelijkingType[],
    };

    // Resultaten from database (stored as JSONB)
    const resultaten: Resultaten = lead.resultaten;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      CalculatorPDF({
        lead: {
          naam: lead.naam,
          bedrijfsnaam: lead.bedrijfsnaam,
          email: lead.email,
        },
        inputs,
        resultaten,
        createdAt: new Date(lead.created_at),
      })
    );

    // Update download status
    await supabase
      .from("calculator_leads")
      .update({
        pdf_downloaded: true,
        pdf_downloaded_at: new Date().toISOString(),
      })
      .eq("pdf_token", token);

    // Create filename
    const filename = `kostenoverzicht-${lead.bedrijfsnaam
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF as stream
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
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Fout bij genereren van PDF" },
      { status: 500 }
    );
  }
}
