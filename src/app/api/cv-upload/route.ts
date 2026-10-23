import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP, formRateLimit } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { captureRouteError } from "@/lib/sentry-utils";

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

    const file = formData.get("file");

    if (!(file instanceof File)) {
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
      captureRouteError(error, { route: "/api/cv-upload", action: "POST" });
      // console.error("CV upload error:", error);
      return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
    }

    // Alleen het pad teruggeven: dat wordt bij de afspraak opgeslagen en de
    // admin vraagt bij openen een vers gesigneerde URL op. Een signed URL van
    // 5 minuten (zoals vroeger) was al verlopen voordat iemand hem opende.
    return NextResponse.json({ path });
  } catch (error) {
    captureRouteError(error, { route: "/api/cv-upload", action: "POST" });
    // console.error("CV upload error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
