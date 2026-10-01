import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession, getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * POST - Push subscription opslaan
 * DELETE - Push subscription verwijderen
 */

/**
 * Medewerker eerst (cookie óf Bearer, met statuscheck en sessie-intrekking), daarna klant.
 * Voorheen werd alleen de JWT gecontroleerd, waardoor een gedeactiveerd account nog
 * pushabonnementen kon registreren.
 */
async function getAuthenticatedUser(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (medewerker) return { id: medewerker.id, type: "medewerker" as const };

  const klant = await getKlantSession(request);
  if (klant) return { id: klant.id, type: "klant" as const };

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Ongeldige subscription data" }, { status: 400 });
    }

    // Upsert: als endpoint al bestaat voor deze user, update de keys
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          user_type: user.type,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      captureRouteError(error, { route: "/api/push-subscription", action: "POST" });
      // console.error("[Push Sub] Opslaan mislukt:", error);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureRouteError(err, { route: "/api/push-subscription", action: "POST" });
    // console.error("[Push Sub] POST error:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("user_type", user.type)
      .eq("endpoint", endpoint);

    if (error) {
      captureRouteError(error, { route: "/api/push-subscription", action: "DELETE" });
      // console.error("[Push Sub] Verwijderen mislukt:", error);
      return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureRouteError(err, { route: "/api/push-subscription", action: "DELETE" });
    // console.error("[Push Sub] DELETE error:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
