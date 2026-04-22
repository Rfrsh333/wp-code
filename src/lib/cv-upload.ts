import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload een CV naar Supabase Storage bucket `kandidaat-documenten`
 * @returns public URL van het geüploade bestand
 */
export async function uploadCV(file: File, prefix?: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Alleen PDF, DOC en DOCX bestanden zijn toegestaan");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("Bestand is te groot (max 5MB)");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `cv/${prefix ? prefix + "_" : ""}${timestamp}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from("kandidaat-documenten")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`CV upload mislukt: ${error.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from("kandidaat-documenten")
    .createSignedUrl(path, 300); // 5 min expiry

  if (signedUrlError) {
    // Return the path so it can be used to generate a signed URL later
    return path;
  }

  return signedUrlData.signedUrl;
}
