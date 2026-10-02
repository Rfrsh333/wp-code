import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { KANDIDAAT_UPLOAD_TYPES } from "@/lib/kandidaat-documenten";

// 🚀 Optimized: O(1) token validation via database lookup
async function validateUploadToken(token: string): Promise<{ valid: boolean; kandidaatId?: string }> {
  // Direct database lookup - super fast!
  const { data: kandidaat } = await supabaseAdmin
    .from("inschrijvingen")
    .select("id, onboarding_portal_token_expires_at")
    .eq("onboarding_portal_token", token)
    .maybeSingle();

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
      .maybeSingle();

    if (!kandidaat) {
      return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
    }

    // Fetch already uploaded documents
    const { data: documents } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("type, bestandsnaam, bestand_grootte")
      .eq("inschrijving_id", validation.kandidaatId);

    return NextResponse.json({
      kandidaat,
      // Live kolommen → veldnamen die de uploadpagina verwacht
      uploaded_documents: (documents || []).map((doc) => ({
        document_type: doc.type,
        file_name: doc.bestandsnaam,
        file_size: doc.bestand_grootte ?? 0,
      })),
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/kandidaat/documenten", action: "GET" });
    // console.error("Validate token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Upload document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file");
    // Alleen bekende types: de waarde komt ook in het opslagpad terecht.
    const gevraagdType = String(formData.get("document_type") || formData.get("type") || "overig");
    const documentType = (KANDIDAAT_UPLOAD_TYPES as readonly string[]).includes(gevraagdType)
      ? gevraagdType
      : "overig";

    // Validate token
    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    const validation = await validateUploadToken(token);

    if (!validation.valid || !validation.kandidaatId) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Validate file
    if (!(file instanceof File)) {
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
      captureRouteError(countError, { route: "/api/kandidaat/documenten", action: "POST" });
      // console.error("Count error:", countError);
    }

    if (existingDocs && existingDocs.length >= 20) {
      return NextResponse.json({ error: "Maximum aantal uploads bereikt" }, { status: 429 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    // Extensie uit het (al gecontroleerde) mime-type, niet uit de bestandsnaam.
    const fileExt = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
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
      captureRouteError(uploadError, { route: "/api/kandidaat/documenten", action: "POST" });
      // console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
    }

    // Save to database (bestand_pad wordt gebruikt om op aanvraag een signed URL
    // te maken). Kolomnamen volgen de live tabel; zie lib/kandidaat-documenten.
    const { error: dbError } = await supabaseAdmin
      .from("kandidaat_documenten")
      .insert({
        inschrijving_id: validation.kandidaatId,
        type: documentType,
        bestandsnaam: file.name.slice(0, 255),
        bestand_pad: fileName,
        mime_type: file.type,
        bestand_grootte: file.size,
        status: "ontvangen",
        uploaded_at: new Date().toISOString(),
      });

    if (dbError) {
      captureRouteError(dbError, { route: "/api/kandidaat/documenten", action: "POST" });
      // console.error("Database error:", dbError);
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

    // Send confirmation email on first document upload
    if (!existingDocs || existingDocs.length === 0) {
      try {
        const { data: kandidaatInfo } = await supabaseAdmin
          .from("inschrijvingen")
          .select("voornaam, email")
          .eq("id", validation.kandidaatId)
          .maybeSingle();

        if (kandidaatInfo?.email) {
          const { sendEmail } = await import("@/lib/email-service");
          await sendEmail({
            from: "TopTalent <info@toptalentjobs.nl>",
            to: [kandidaatInfo.email],
            subject: "Documenten ontvangen - TopTalent Jobs",
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">TopTalent</h1>
              </div>
              <div style="padding: 30px;">
                <p>Beste ${kandidaatInfo.voornaam},</p>
                <p>We hebben uw document(en) goed ontvangen. Ons team zal deze zo snel mogelijk beoordelen.</p>
                <p>U ontvangt bericht zodra alles is goedgekeurd.</p>
                <p style="color: #666; margin-top: 20px;">Met vriendelijke groet,<br><strong style="color: #F27501;">TopTalent Jobs</strong></p>
              </div>
            </div>`,
          });
        }
      } catch (emailError) {
        captureRouteError(emailError, { route: "/api/kandidaat/documenten", action: "POST" });
        // console.error("Failed to send document confirmation email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      document_type: documentType,
      file_name: file.name,
      file_size: file.size,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/kandidaat/documenten", action: "POST" });
    // console.error("Upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
