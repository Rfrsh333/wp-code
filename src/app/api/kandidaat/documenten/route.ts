import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 🚀 Optimized: O(1) token validation via database lookup
async function validateUploadToken(token: string): Promise<{ valid: boolean; kandidaatId?: string }> {
  // Direct database lookup - super fast!
  const { data: kandidaat } = await supabaseAdmin
    .from("inschrijvingen")
    .select("id, onboarding_portal_token_expires_at")
    .eq("onboarding_portal_token", token)
    .single();

  if (!kandidaat) {
    return { valid: false };
  }

  // Check if token is expired
  const expiresAt = new Date(kandidaat.onboarding_portal_token_expires_at);
  if (expiresAt < new Date()) {
    return { valid: false };
  }

  return { valid: true, kandidaatId: kandidaat.id };
}

// GET: Validate token and return kandidaat info + uploaded docs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    const validation = await validateUploadToken(token);

    if (!validation.valid || !validation.kandidaatId) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Fetch kandidaat info
    const { data: kandidaat } = await supabaseAdmin
      .from("inschrijvingen")
      .select("voornaam, achternaam, uitbetalingswijze")
      .eq("id", validation.kandidaatId)
      .single();

    // Fetch already uploaded documents
    const { data: documents } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("document_type, file_name, file_size")
      .eq("inschrijving_id", validation.kandidaatId);

    return NextResponse.json({
      kandidaat,
      uploaded_documents: documents || [],
    });
  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Upload document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;
    const documentType = formData.get("document_type") as string || "overig";

    // Validate token
    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    const validation = await validateUploadToken(token);

    if (!validation.valid || !validation.kandidaatId) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "Geen bestand geselecteerd" }, { status: 400 });
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Alleen PDF, JPG of PNG bestanden toegestaan" }, { status: 400 });
    }

    // File size validation (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Bestand te groot (max 10MB)" }, { status: 400 });
    }

    // Rate limiting check - max 20 uploads per kandidaat total
    const { data: existingDocs, error: countError } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("id", { count: 'exact' })
      .eq("inschrijving_id", validation.kandidaatId);

    if (countError) {
      console.error("Count error:", countError);
    }

    if (existingDocs && existingDocs.length >= 20) {
      return NextResponse.json({ error: "Maximum aantal uploads bereikt" }, { status: 429 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${validation.kandidaatId}/${documentType}_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('kandidaat-documenten')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('kandidaat-documenten')
      .getPublicUrl(fileName);

    // Save to database
    const { error: dbError } = await supabaseAdmin
      .from("kandidaat_documenten")
      .insert({
        inschrijving_id: validation.kandidaatId,
        document_type: documentType,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_url: urlData.publicUrl,
        review_status: "in_review",
        uploaded_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to cleanup uploaded file
      await supabaseAdmin.storage.from('kandidaat-documenten').remove([fileName]);
      return NextResponse.json({ error: "Database fout" }, { status: 500 });
    }

    // Update kandidaat status if this was first upload
    if (!existingDocs || existingDocs.length === 0) {
      await supabaseAdmin
        .from("inschrijvingen")
        .update({
          onboarding_status: "wacht_op_kandidaat", // Waiting for admin review
          laatste_contact_op: new Date().toISOString(),
        })
        .eq("id", validation.kandidaatId);
    }

    return NextResponse.json({
      success: true,
      document_type: documentType,
      file_name: file.name,
      file_size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
