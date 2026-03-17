import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyMedewerkerSession, verifyKlantSession } from "@/lib/session";

/**
 * POST - Push subscription opslaan
 * DELETE - Push subscription verwijderen
 */

async function getAuthenticatedUser(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  // Probeer medewerker session
  const medewerkerSession = cookieStore.get("medewerker_session");
  if (medewerkerSession) {
    const medewerker = await verifyMedewerkerSession(medewerkerSession.value);
    if (medewerker) return { id: medewerker.id, type: "medewerker" as const };
  }

  // Probeer klant session
  const klantSession = cookieStore.get("klant_session");
  if (klantSession) {
    const klant = await verifyKlantSession(klantSession.value);
    if (klant) return { id: klant.id, type: "klant" as const };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthenticatedUser(cookieStore);
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
      console.error("[Push Sub] Opslaan mislukt:", error);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Push Sub] POST error:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthenticatedUser(cookieStore);
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
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[Push Sub] Verwijderen mislukt:", error);
      return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Push Sub] DELETE error:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
