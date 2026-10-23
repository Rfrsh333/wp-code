import { escapeHtml } from "@/lib/sanitize";

/**
 * Interne meldingsmail aan TopTalent (info@), in dezelfde opmaak als de mail bij een nieuwe
 * personeelsaanvraag (api/personeel-aanvragen). Alle waarden worden ge-escaped.
 * Puur (geen imports met side effects), los testbaar.
 */

export type MeldingRegel = readonly [label: string, waarde: string | number | null | undefined];
export type MeldingSectie = { kop: string; regels: readonly MeldingRegel[] };

export function adminMeldingMailHtml(input: {
  titel: string;
  intro?: string;
  secties: readonly MeldingSectie[];
  knop?: { tekst: string; url: string };
  voet: string;
}): string {
  const secties = input.secties
    .map((sectie) => {
      const regels = sectie.regels
        .filter(([, waarde]) => waarde !== null && waarde !== undefined && String(waarde).trim() !== "")
        .map(
          ([label, waarde]) => `
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%; vertical-align: top;">${escapeHtml(label)}:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(waarde)}</td>
              </tr>`,
        )
        .join("");
      return `
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              ${escapeHtml(sectie.kop)}
            </h2>
            <table style="width: 100%; border-collapse: collapse;">${regels}
            </table>
          </div>`;
    })
    .join("");

  const knop = input.knop
    ? `
          <div style="text-align: center; margin: 10px 0 0;">
            <a href="${input.knop.url.replace(/["'<>\s]/g, (c) => encodeURIComponent(c))}" style="display: inline-block; background: #F27501; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ${escapeHtml(input.knop.tekst)}
            </a>
          </div>`
    : "";

  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${escapeHtml(input.titel)}</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${input.intro ? `<p style="color: #333; line-height: 1.6; margin-top: 0;">${escapeHtml(input.intro)}</p>` : ""}${secties}${knop}
        </div>
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">${escapeHtml(input.voet)}</p>
        </div>
      </div>
    `;
}
