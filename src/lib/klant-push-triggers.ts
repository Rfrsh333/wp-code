import { sendPushToUser } from "@/lib/push-notifications";

/**
 * Klant push notificatie triggers
 * Wordt aangeroepen vanuit relevante API routes
 */

/** Trigger: Nieuwe medewerker toegewezen aan een dienst */
export async function notifyKlantMedewerkerAssigned(
  klantId: string,
  medewerkerNaam: string,
  dienstFunctie: string,
  dienstDatum: string
) {
  return sendPushToUser(klantId, "klant", {
    title: "Medewerker toegewezen",
    body: `${medewerkerNaam} is toegewezen als ${dienstFunctie} op ${dienstDatum}`,
    url: "/klant/uren?tab=diensten",
    tag: "medewerker-assigned",
  });
}

/** Trigger: Dienst bevestigd (status gewijzigd naar bevestigd/actief) */
export async function notifyKlantDienstBevestigd(
  klantId: string,
  dienstFunctie: string,
  dienstDatum: string,
  aantalMedewerkers: number
) {
  return sendPushToUser(klantId, "klant", {
    title: "Dienst bevestigd",
    body: `Uw dienst ${dienstFunctie} op ${dienstDatum} is bevestigd met ${aantalMedewerkers} medewerker${aantalMedewerkers !== 1 ? "s" : ""}`,
    url: "/klant/uren?tab=diensten",
    tag: "dienst-confirmed",
  });
}

/** Trigger: Status wijziging van een dienst */
export async function notifyKlantDienstStatusChange(
  klantId: string,
  dienstFunctie: string,
  dienstDatum: string,
  nieuweStatus: string
) {
  const statusLabels: Record<string, string> = {
    geannuleerd: "geannuleerd",
    voltooid: "voltooid",
    actief: "actief",
    open: "open gezet",
  };

  return sendPushToUser(klantId, "klant", {
    title: "Dienst status gewijzigd",
    body: `Uw dienst ${dienstFunctie} op ${dienstDatum} is ${statusLabels[nieuweStatus] || nieuweStatus}`,
    url: "/klant/uren?tab=diensten",
    tag: "dienst-status-change",
  });
}

/** Trigger: Herinnering om een beoordeling achter te laten */
export async function notifyKlantReviewReminder(
  klantId: string,
  medewerkerNaam: string,
  dienstDatum: string
) {
  return sendPushToUser(klantId, "klant", {
    title: "Beoordeling achterlaten",
    body: `Hoe was ${medewerkerNaam} op ${dienstDatum}? Laat een beoordeling achter!`,
    url: "/klant/uren?tab=beoordelingen",
    tag: "review-reminder",
    actions: [{ action: "review", title: "Beoordelen" }],
  });
}

/** Trigger: Uren ingediend door medewerker — klant moet goedkeuren */
export async function notifyKlantUrenIngediend(
  klantId: string,
  medewerkerNaam: string,
  aantalUren: number
) {
  return sendPushToUser(klantId, "klant", {
    title: "Uren ter goedkeuring",
    body: `${medewerkerNaam} heeft ${aantalUren.toFixed(1)} uur ingediend ter goedkeuring`,
    url: "/klant/uren?tab=uren",
    tag: "uren-submitted",
  });
}

/** Trigger: Factuur beschikbaar */
export async function notifyKlantNieuweFactuur(
  klantId: string,
  bedrag: number,
  factuurNummer?: string
) {
  return sendPushToUser(klantId, "klant", {
    title: "Nieuwe factuur",
    body: `Factuur ${factuurNummer ? `#${factuurNummer} ` : ""}van €${bedrag.toFixed(2)} is beschikbaar`,
    url: "/klant/uren?tab=facturen",
    tag: "new-invoice",
  });
}
