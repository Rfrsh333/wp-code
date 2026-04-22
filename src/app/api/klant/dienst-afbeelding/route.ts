import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";
import crypto from "crypto";
import { captureRouteError } from "@/lib/sentry-utils";

const MAX_FILE_SIZE = 500 * 1024; // 500KB (client comprimeert al tot ~200KB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("klant_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const klant = await verifyKlantSession(session.value);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    // Valideer bestandstype
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPG, PNG of WebP afbeeldingen zijn toegestaan" },
        { status: 400 }
      );
    }

    // Valideer bestandsgrootte
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Afbeelding is te groot (max 500KB)" },
        { status: 400 }
      );
    }

    // Genereer unieke bestandsnaam
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `diensten/${klant.id}/${hash}.${ext}`;

    // Upload naar Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("dienst-afbeeldingen")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      captureRouteError(uploadError, { route: "/api/klant/dienst-afbeelding", action: "POST" });
      // console.error("[DIENST-AFBEELDING] Upload error:", uploadError);

      // Als bucket niet bestaat, maak het aan
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        await supabaseAdmin.storage.createBucket("dienst-afbeeldingen", {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_TYPES,
        });

        // Probeer opnieuw
        const { error: retryError } = await supabaseAdmin.storage
          .from("dienst-afbeeldingen")
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (retryError) {
          captureRouteError(retryError, { route: "/api/klant/dienst-afbeelding", action: "POST" });
          // console.error("[DIENST-AFBEELDING] Retry upload error:", retryError);
          return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Upload mislukt" }, { status: 500 });
      }
    }

    // Haal publieke URL op
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("dienst-afbeeldingen")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/dienst-afbeelding", action: "POST" });
    // console.error("[DIENST-AFBEELDING] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
