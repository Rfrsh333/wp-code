/**
 * Teksten van de kandidaat-statuspagina (pure regels, getest in tests/unit/kandidaat-status.spec.ts).
 *
 * B14: "Documenten nodig" zei "we nemen contact met je op" zonder uploadlink, "Wacht op reactie"
 * zei "we wachten op jouw reactie" terwijl TopTalent de documenten moest beoordelen, en bij
 * "inzetbaar" stond geen link naar activeren of inloggen. Elke status zegt nu wie aan zet is en
 * wat de volgende stap is.
 */

export type KandidaatOnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";

export type AanZet = "jij" | "TopTalent" | "niemand";

export type StatusTekst = { label: string; beschrijving: string; aanZet: AanZet };

export function kandidaatStatusTekst(
  status: KandidaatOnboardingStatus,
  context: { uploadLink: boolean; accountGeactiveerd: boolean },
): StatusTekst {
  switch (status) {
    default:
    // Onbekende status (bv. een nieuwe waarde in de database): toon de beginstand.
    // falls through
    case "nieuw":
      return {
        label: "Ontvangen",
        beschrijving: "Je inschrijving is binnen. We bekijken je gegevens en nemen contact met je op.",
        aanZet: "TopTalent",
      };
    case "in_beoordeling":
      return {
        label: "In beoordeling",
        beschrijving: "We beoordelen je inschrijving en ervaring. Je hoort van ons.",
        aanZet: "TopTalent",
      };
    case "documenten_opvragen":
      return context.uploadLink
        ? {
            label: "Documenten nodig",
            beschrijving: "We hebben nog een paar documenten van je nodig. Upload ze via de knop hieronder.",
            aanZet: "jij",
          }
        : {
            label: "Documenten nodig",
            beschrijving:
              "We hebben nog een paar documenten van je nodig, maar je uploadlink is verlopen. Mail of bel ons, dan sturen we je een nieuwe link.",
            aanZet: "jij",
          };
    case "wacht_op_kandidaat":
      return {
        label: "Documenten in beoordeling",
        beschrijving: "We hebben je documenten ontvangen en bekijken ze nu. Je krijgt een mail zodra alles is goedgekeurd.",
        aanZet: "TopTalent",
      };
    case "goedgekeurd":
      return {
        label: "Goedgekeurd",
        beschrijving: "Je documenten zijn goedgekeurd. We zetten je account klaar; je krijgt een mail om je wachtwoord in te stellen.",
        aanZet: "TopTalent",
      };
    case "inzetbaar":
      return context.accountGeactiveerd
        ? {
            label: "Inzetbaar",
            beschrijving: "Je bent inzetbaar! Log in op TopTalent Hub en reageer op open diensten.",
            aanZet: "jij",
          }
        : {
            label: "Inzetbaar",
            beschrijving:
              "Je bent inzetbaar! Je hebt een mail gekregen om je wachtwoord in te stellen. Daarna log je in en kun je reageren op diensten.",
            aanZet: "jij",
          };
    case "afgewezen":
      return {
        label: "Afgewezen",
        beschrijving: "Helaas kunnen we je op dit moment niet plaatsen. Je kunt je later opnieuw inschrijven.",
        aanZet: "niemand",
      };
  }
}
