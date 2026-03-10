import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  sendIntakeBevestiging,
  sendDocumentenVerzoek,
  sendWelkomstmail,
  logEmail,
  generateOnboardingPortalToken,
} from "@/lib/candidate-onboarding";
import { ensureMedewerkerFromCandidate } from "@/lib/candidate-to-medewerker";

type OnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";

interface EmailActionRequest {
  kandidaat_id: string;
  action: "bevestiging" | "documenten_opvragen" | "inzetbaar";
}

interface StatusUpdateRequest {
  id: string;
  onboardingStatus: OnboardingStatus;
}

function isStatusUpdateRequest(body: unknown): body is StatusUpdateRequest {
  return Boolean(
    body &&
      typeof body === "object" &&
      "id" in body &&
      "onboardingStatus" in body
  );
}

function isEmailActionRequest(body: unknown): body is EmailActionRequest {
  return Boolean(
    body &&
      typeof body === "object" &&
      "kandidaat_id" in body &&
      "action" in body
  );
}

async function fetchKandidaat(id: string) {
  const { data, error } = await supabaseAdmin
    .from("inschrijvingen")
    .select(`
      id,
      voornaam,
      tussenvoegsel,
      achternaam,
      email,
      telefoon,
      uitbetalingswijze,
      gewenste_functies,
      interne_notitie,
      medewerker_id,
      onboarding_portal_token,
      onboarding_portal_token_expires_at,
      onboarding_status,
      goedgekeurd_op,
      inzetbaar_op
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized onboarding action by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (isStatusUpdateRequest(body)) {
      const { id, onboardingStatus } = body;
      const kandidaat = await fetchKandidaat(id);

      if (!kandidaat) {
        return NextResponse.json({ error: "Inschrijving niet gevonden" }, { status: 404 });
      }

      const payload: Record<string, string | boolean | null> = {
        onboarding_status: onboardingStatus,
      };

      if (onboardingStatus === "goedgekeurd" && !kandidaat.goedgekeurd_op) {
        payload.goedgekeurd_op = new Date().toISOString();
      }

      if (onboardingStatus === "inzetbaar") {
        payload.documenten_compleet = true;
        if (!kandidaat.inzetbaar_op) {
          payload.inzetbaar_op = new Date().toISOString();
        }

        if (!kandidaat.medewerker_id) {
          const medewerkerId = await ensureMedewerkerFromCandidate({
            id: kandidaat.id,
            voornaam: kandidaat.voornaam,
            tussenvoegsel: kandidaat.tussenvoegsel,
            achternaam: kandidaat.achternaam,
            email: kandidaat.email,
            telefoon: kandidaat.telefoon,
            gewenste_functies: kandidaat.gewenste_functies,
            interne_notitie: kandidaat.interne_notitie,
          });
          payload.medewerker_id = medewerkerId;
        }
      }

      let portalToken = kandidaat.onboarding_portal_token;
      if (onboardingStatus === "documenten_opvragen") {
        portalToken = kandidaat.onboarding_portal_token || generateOnboardingPortalToken();
        payload.onboarding_portal_token = portalToken;
        payload.onboarding_portal_token_expires_at = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
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
          await sendDocumentenVerzoek(
            {
              id: kandidaat.id,
              voornaam: kandidaat.voornaam,
              achternaam: kandidaat.achternaam,
              email: kandidaat.email,
              uitbetalingswijze: kandidaat.uitbetalingswijze,
            },
            portalToken
          );
          await logEmail(id, "documenten_opvragen", kandidaat.email, `${kandidaat.voornaam}, we hebben je documenten nodig! 📄`);
          await supabaseAdmin
            .from("inschrijvingen")
            .update({ documenten_verzoek_verstuurd_op: new Date().toISOString() })
            .eq("id", id);
        }

        if (onboardingStatus === "inzetbaar") {
          await sendWelkomstmail({
            id: kandidaat.id,
            voornaam: kandidaat.voornaam,
            achternaam: kandidaat.achternaam,
            email: kandidaat.email,
            uitbetalingswijze: kandidaat.uitbetalingswijze,
          });
          await logEmail(id, "inzetbaar", kandidaat.email, `🎉 ${kandidaat.voornaam}, je bent inzetbaar!`);
          await supabaseAdmin
            .from("inschrijvingen")
            .update({ welkom_mail_verstuurd_op: new Date().toISOString() })
            .eq("id", id);
        }
      } catch (mailError) {
        console.error("Automatische onboarding mail mislukt:", mailError);
      }

      return NextResponse.json({ success: true, data: payload });
    }

    if (isEmailActionRequest(body)) {
      const { kandidaat_id, action } = body;
      const kandidaat = await fetchKandidaat(kandidaat_id);

      if (!kandidaat) {
        return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
      }

      const { data: recentEmail } = await supabaseAdmin
        .from("email_log")
        .select("*")
        .eq("kandidaat_id", kandidaat_id)
        .eq("email_type", action)
        .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (recentEmail) {
        return NextResponse.json({
          message: "Email al verzonden in afgelopen 24 uur",
          skip: true,
        });
      }

      let subject = "";

      switch (action) {
        case "bevestiging":
          await sendIntakeBevestiging({
            id: kandidaat.id,
            voornaam: kandidaat.voornaam,
            achternaam: kandidaat.achternaam,
            email: kandidaat.email,
            uitbetalingswijze: kandidaat.uitbetalingswijze,
          });
          subject = `Hey ${kandidaat.voornaam}! 👋 Je inschrijving is binnen`;
          await supabaseAdmin
            .from("inschrijvingen")
            .update({ intake_bevestiging_verstuurd_op: new Date().toISOString() })
            .eq("id", kandidaat_id);
          break;

        case "documenten_opvragen": {
          const portalToken = kandidaat.onboarding_portal_token || generateOnboardingPortalToken();
          await supabaseAdmin
            .from("inschrijvingen")
            .update({
              onboarding_portal_token: portalToken,
              onboarding_portal_token_expires_at: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              documenten_verzoek_verstuurd_op: new Date().toISOString(),
            })
            .eq("id", kandidaat_id);

          await sendDocumentenVerzoek(
            {
              id: kandidaat.id,
              voornaam: kandidaat.voornaam,
              achternaam: kandidaat.achternaam,
              email: kandidaat.email,
              uitbetalingswijze: kandidaat.uitbetalingswijze,
            },
            portalToken
          );
          subject = `${kandidaat.voornaam}, we hebben je documenten nodig! 📄`;
          break;
        }

        case "inzetbaar":
          await sendWelkomstmail({
            id: kandidaat.id,
            voornaam: kandidaat.voornaam,
            achternaam: kandidaat.achternaam,
            email: kandidaat.email,
            uitbetalingswijze: kandidaat.uitbetalingswijze,
          });
          subject = `🎉 ${kandidaat.voornaam}, je bent inzetbaar!`;
          await supabaseAdmin
            .from("inschrijvingen")
            .update({ welkom_mail_verstuurd_op: new Date().toISOString() })
            .eq("id", kandidaat_id);
          break;
      }

      await logEmail(kandidaat_id, action, kandidaat.email, subject);

      return NextResponse.json({
        success: true,
        action,
        recipient: kandidaat.email,
      });
    }

    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
