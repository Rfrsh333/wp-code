import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { formRateLimit } from "@/lib/rate-limit-redis";

const leadSchema = z.object({
  naam: z
    .string()
    .min(1, "Naam is verplicht")
    .max(100)
    .transform((v) => v.trim()),
  bedrijfsnaam: z
    .string()
    .min(1, "Bedrijfsnaam is verplicht")
    .max(200)
    .transform((v) => v.trim()),
  email: z
    .string()
    .min(1, "E-mail is verplicht")
    .email("Vul een geldig emailadres in")
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
  telefoon: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
  bericht: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimit = await checkRedisRateLimit(
      `lead:post:${ip}`,
      formRateLimit
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het later opnieuw." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Ongeldige invoer" },
        { status: 400 }
      );
    }

    const { naam, bedrijfsnaam, email, telefoon, bericht } = result.data;

    const { error: dbError } = await supabaseAdmin.from("leads").insert({
      naam,
      bedrijf: bedrijfsnaam,
      email,
      telefoon,
      notities: bericht,
      platform: "website",
      bron_naam: "meer-aanvragen",
      status: "nieuw",
    });

    if (dbError) {
      console.error("Lead insert error:", dbError);
      return NextResponse.json(
        { error: "Er ging iets mis. Probeer het later opnieuw." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
