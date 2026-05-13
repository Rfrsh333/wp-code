type SupportedContactType =
  | "email"
  | "telefoon"
  | "whatsapp"
  | "bezoek"
  | "instagram_dm"
  | "linkedin_dm"
  | "facebook_dm"
  | "meeting";

type ContactResultaat =
  | "positief"
  | "neutraal"
  | "negatief"
  | "geen_antwoord"
  | "voicemail"
  | null
  | undefined;

interface FollowUpLeadContext {
  telefoon?: string | null;
  email?: string | null;
  instagram_handle?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  pipeline_stage?: string | null;
}

interface FollowUpInput {
  type: SupportedContactType;
  richting: "uitgaand" | "inkomend";
  resultaat?: ContactResultaat;
  lead: FollowUpLeadContext;
}

export interface FollowUpPlan {
  nextAction: string;
  nextDate: string;
  reason: string;
  priority: "hoog" | "normaal" | "laag";
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function preferredFallbackChannel(lead: FollowUpLeadContext): string {
  if (lead.telefoon) return "Bellen";
  if (lead.instagram_handle) return "Instagram DM sturen";
  if (lead.linkedin_url) return "LinkedIn DM sturen";
  if (lead.facebook_url) return "Facebook DM sturen";
  if (lead.email) return "Follow-up email sturen";
  return "Lead handmatig beoordelen";
}

export function determineFollowUpPlan(input: FollowUpInput): FollowUpPlan | null {
  const { type, richting, resultaat, lead } = input;

  if (richting === "inkomend" && resultaat === "negatief") {
    return {
      nextAction: "Parkeer 30 dagen",
      nextDate: addDays(30),
      reason: "Negatieve reactie ontvangen; zet de lead tijdelijk on hold.",
      priority: "laag",
    };
  }

  if (richting === "inkomend" && resultaat === "positief") {
    return {
      nextAction: lead.telefoon ? "Bellen voor afspraak" : "Meeting inplannen",
      nextDate: addDays(1),
      reason: "Positieve reactie ontvangen; opvolgen terwijl de intentie warm is.",
      priority: "hoog",
    };
  }

  if (type === "email" && richting === "uitgaand") {
    return {
      nextAction: lead.telefoon ? "Bel opvolging na email" : preferredFallbackChannel(lead),
      nextDate: addDays(3),
      reason: "Email verstuurd zonder directe reactie; plan een vervolgactie na 3 dagen.",
      priority: "normaal",
    };
  }

  if (type === "telefoon" && (resultaat === "geen_antwoord" || resultaat === "voicemail")) {
    return {
      nextAction: lead.telefoon
        ? "WhatsApp follow-up sturen"
        : lead.instagram_handle
          ? "Instagram DM sturen"
          : lead.email
            ? "Korte follow-up email sturen"
            : "Bel opnieuw",
      nextDate: addDays(1),
      reason: "Geen contact gekregen via telefoon; probeer morgen een lichter kanaal.",
      priority: "hoog",
    };
  }

  if ((type === "instagram_dm" || type === "linkedin_dm" || type === "facebook_dm" || type === "whatsapp") && richting === "uitgaand") {
    return {
      nextAction: lead.telefoon ? "Bel follow-up" : lead.email ? "Follow-up email sturen" : "Stuur tweede DM",
      nextDate: addDays(2),
      reason: "DM verstuurd; controleer binnen 2 dagen of een ander kanaal beter converteert.",
      priority: "normaal",
    };
  }

  if (type === "meeting" && richting === "uitgaand") {
    return {
      nextAction: "Stuur recap of offerte",
      nextDate: addDays(1),
      reason: "Na een meeting wil je snel samenvatten en de deal vooruit trekken.",
      priority: "hoog",
    };
  }

  if (type === "bezoek" && richting === "uitgaand") {
    return {
      nextAction: lead.email ? "Stuur recap email" : "Bel na bezoek",
      nextDate: addDays(1),
      reason: "Na fysiek contact is snelle schriftelijke opvolging het sterkst.",
      priority: "hoog",
    };
  }

  return null;
}
