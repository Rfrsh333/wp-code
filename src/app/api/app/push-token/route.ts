import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession, getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

// Registreert het Expo-pushtoken van de native app (APNs/FCM via Expo).
// Werkt voor beide rollen; de rol volgt uit het Bearer-token.

const schema = z.object({
  expo_token: z.string().regex(/^(Exponent|Expo)PushToken\[[^\]]+\]$/),
  platform: z.enum(["ios", "android"]),
});

async function huidigeGebruiker(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (medewerker) return { id: medewerker.id, type: "medewerker" as const };
  const klant = await getKlantSession(request);
  if (klant) return { id: klant.id, type: "klant" as const };
  return null;
}

export async function POST(request: NextRequest) {
  const gebruiker = await huidigeGebruiker(request);
  if (!gebruiker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig pushtoken" }, { status: 400 });

  // Eén toestel = één token. Was het token van iemand anders (gedeeld toestel), dan verhuist het.
  await supabaseAdmin.from("push_subscriptions").delete().eq("expo_token", parsed.data.expo_token);
  const { error } = await supabaseAdmin.from("push_subscriptions").insert({
    user_id: gebruiker.id,
    user_type: gebruiker.type,
    platform: parsed.data.platform,
    expo_token: parsed.data.expo_token,
  });

  if (error) {
    // 42703/PGRST204: migratie 20261001_portaal_sessies.sql nog niet gedraaid.
    captureRouteError(error, { route: "/api/app/push-token", action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const gebruiker = await huidigeGebruiker(request);
  if (!gebruiker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = new URL(request.url).searchParams.get("expo_token");
  if (!token) return NextResponse.json({ error: "expo_token ontbreekt" }, { status: 400 });

  await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("expo_token", token)
    .eq("user_id", gebruiker.id);
  return NextResponse.json({ success: true });
}
