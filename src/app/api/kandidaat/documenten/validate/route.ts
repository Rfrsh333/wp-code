import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";

function generateUploadToken(kandidaatId: string, expiryDays = 7): string {
  const secret = process.env.KANDIDAAT_TOKEN_SECRET || "fallback-secret";
  const expiryDate = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
  const data = `${kandidaatId}:${expiryDate}:${secret}`;
  return createHash("sha256").update(data).digest("hex").substring(0, 32);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    // Find kandidaat with matching token
    const { data: kandidaten } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, voornaam, achternaam, uitbetalingswijze");

    if (!kandidaten) {
      return NextResponse.json({ error: "Geen kandidaten gevonden" }, { status: 500 });
    }

    let matchedKandidaat = null;
    for (const k of kandidaten) {
      const expectedToken = generateUploadToken(k.id);
      if (token === expectedToken) {
        matchedKandidaat = k;
        break;
      }
    }

    if (!matchedKandidaat) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Fetch already uploaded documents
    const { data: documents } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("document_type, file_name, file_size")
      .eq("inschrijving_id", matchedKandidaat.id);

    return NextResponse.json({
      kandidaat: {
        voornaam: matchedKandidaat.voornaam,
        achternaam: matchedKandidaat.achternaam,
        uitbetalingswijze: matchedKandidaat.uitbetalingswijze,
      },
      uploaded_documents: documents || [],
    });
  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
