import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import crypto from "crypto";
import { captureRouteError } from "@/lib/sentry-utils";
import { AFBEELDING_MAX_BYTES, AFBEELDING_TYPES, leesAfbeeldingUitVerzoek } from "@/lib/afbeelding-upload";

// 500KB (client comprimeert al tot ~200KB); type, inhoud en de Vercel-grens: lib/afbeelding-upload.
const MAX_FILE_SIZE = AFBEELDING_MAX_BYTES;
const ALLOWED_TYPES = [...AFBEELDING_TYPES];

export async function POST(request: NextRequest) {
  try {
    const klant = await getKlantSession(request);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Type (ook de eerste bytes), grootte en de Vercel-grens van ~4,5 MB.
    const bestand = await leesAfbeeldingUitVerzoek(request);
    if (!bestand.ok) {
      return NextResponse.json({ error: bestand.error }, { status: bestand.status });
    }
    const { buffer, ext } = bestand;
    const file = { type: bestand.type };

    // Genereer unieke bestandsnaam
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `diensten/${klant.id}/${hash}.${ext}`;

    // Upload naar Supabase Storage

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
