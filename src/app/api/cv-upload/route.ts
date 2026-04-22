import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP, formRateLimit } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`cv-upload:${clientIP}`, formRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Te veel uploads. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const formData = await request.formData();

    const recaptchaToken = formData.get("recaptchaToken") as string;
    if (!recaptchaToken) {
      return NextResponse.json({ error: "reCAPTCHA verificatie vereist" }, { status: 400 });
    }
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      return NextResponse.json({ error: recaptchaResult.error || "Spam detectie mislukt" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand gevonden" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Alleen PDF, DOC en DOCX bestanden zijn toegestaan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Bestand is te groot (max 5MB)" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `cv/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from("kandidaat-documenten")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("CV upload error:", error);
      return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("kandidaat-documenten")
      .createSignedUrl(path, 300); // 5 min expiry

    if (signedUrlError) {
      return NextResponse.json({ url: null, path });
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, path });
  } catch (error) {
    console.error("CV upload error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
