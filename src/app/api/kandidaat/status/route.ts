import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";

// Generate a secure token based on kandidaat email and a secret
function generateToken(email: string, kandidaatId: string): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET || "fallback-secret-change-in-production";
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
      .select("*");

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
      .select("*")
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
    const { kandidaat_id } = await request.json();

    if (!kandidaat_id) {
      return NextResponse.json({ error: "Kandidaat ID vereist" }, { status: 400 });
    }

    // Fetch kandidaat
    const { data: kandidaat, error: fetchError } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, email, voornaam, achternaam")
      .eq("id", kandidaat_id)
      .single();

    if (fetchError || !kandidaat) {
      return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
    }

    // Generate token
    const token = generateToken(kandidaat.email, kandidaat.id);
    const statusUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toptalentjobs.nl'}/kandidaat/status?token=${token}`;

    // TODO: Send email with status link (optional - can be done manually for now)
    // For now, just return the link so admin can copy it

    return NextResponse.json({
      success: true,
      statusUrl,
      message: "Status link gegenereerd",
    });
  } catch (error) {
    console.error("Generate status link error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
