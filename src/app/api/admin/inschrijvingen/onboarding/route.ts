import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  generateOnboardingPortalToken,
  sendCandidateDocumentsRequest,
  sendCandidateWelcomeEmail,
} from "@/lib/candidate-onboarding";

type OnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized onboarding status update by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { id, onboardingStatus } = (await request.json()) as {
    id?: string;
    onboardingStatus?: OnboardingStatus;
  };

  if (!id || !onboardingStatus) {
    return NextResponse.json({ error: "id en onboardingStatus zijn verplicht" }, { status: 400 });
  }

  const { data: inschrijving, error: fetchError } = await supabaseAdmin
    .from("inschrijvingen")
    .select("id, voornaam, achternaam, email, onboarding_portal_token, onboarding_portal_token_expires_at, goedgekeurd_op, inzetbaar_op")
    .eq("id", id)
    .single();

  if (fetchError || !inschrijving) {
    return NextResponse.json({ error: "Inschrijving niet gevonden" }, { status: 404 });
  }

  const payload: Record<string, string | boolean | null> = {
    onboarding_status: onboardingStatus,
  };

  if (onboardingStatus === "goedgekeurd" && !inschrijving.goedgekeurd_op) {
    payload.goedgekeurd_op = new Date().toISOString();
  }

  if (onboardingStatus === "inzetbaar") {
    payload.documenten_compleet = true;
    if (!inschrijving.inzetbaar_op) {
      payload.inzetbaar_op = new Date().toISOString();
    }
  }

  let portalToken = inschrijving.onboarding_portal_token;

  if (onboardingStatus === "documenten_opvragen") {
    portalToken = generateOnboardingPortalToken();
    payload.onboarding_portal_token = portalToken;
    payload.onboarding_portal_token_expires_at = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  if (onboardingStatus === "inzetbaar") {
    // timestamp wordt pas gezet nadat de mail succesvol verstuurd is
  }

  const { error: updateError } = await supabaseAdmin
    .from("inschrijvingen")
    .update(payload)
    .eq("id", id);

  if (updateError) {
    console.error("Onboarding status update mislukt:", updateError);
    return NextResponse.json({ error: "Onboarding status kon niet worden bijgewerkt" }, { status: 500 });
  }

  try {
    if (onboardingStatus === "documenten_opvragen" && portalToken) {
      await sendCandidateDocumentsRequest({
        voornaam: inschrijving.voornaam,
        email: inschrijving.email,
        portalToken,
      });
      await supabaseAdmin
        .from("inschrijvingen")
        .update({ documenten_verzoek_verstuurd_op: new Date().toISOString() })
        .eq("id", id);
    }

    if (onboardingStatus === "inzetbaar") {
      await sendCandidateWelcomeEmail({
        voornaam: inschrijving.voornaam,
        email: inschrijving.email,
      });
      await supabaseAdmin
        .from("inschrijvingen")
        .update({ welkom_mail_verstuurd_op: new Date().toISOString() })
        .eq("id", id);
    }
  } catch (emailError) {
    console.error("Onboarding mail mislukt:", emailError);
  }

  return NextResponse.json({ success: true, data: payload });
}
