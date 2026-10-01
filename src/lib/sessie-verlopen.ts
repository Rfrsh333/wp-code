/**
 * Wanneer betekent een 401 "je sessie is verlopen" in een portaal? Pure regels (los getest);
 * de browserkant staat in components/shared/SessieVerlopenBewaker.tsx.
 */

export type Portaal = "medewerker" | "klant";

/** API-routes waar 401 iets anders betekent (bv. fout wachtwoord) of geen sessie nodig is. */
const API_UITZONDERINGEN = ["login", "logout", "wachtwoord-reset", "activeren", "register", "verify"];

/** Pagina's zonder sessie: daar nooit doorsturen (voorkomt lussen). */
const OPENBARE_PAGINAS = ["login", "wachtwoord-vergeten", "wachtwoord-reset", "activeren", "registreren"];

function pad(url: string, origin: string): string | null {
  try {
    const u = new URL(url, origin);
    return u.origin === origin ? u.pathname : null;
  } catch {
    return null;
  }
}

/** Is dit een sessie-401 van het eigen portaal-API, terwijl de gebruiker op een beveiligde pagina staat? */
export function isSessieVerlopen(input: {
  portaal: Portaal;
  status: number;
  url: string;
  origin: string;
  paginaPad: string;
}): boolean {
  if (input.status !== 401) return false;
  const api = pad(input.url, input.origin);
  const prefix = `/api/${input.portaal}/`;
  if (!api || !api.startsWith(prefix)) return false;
  const eersteDeel = api.slice(prefix.length).split("/")[0];
  if (API_UITZONDERINGEN.includes(eersteDeel)) return false;

  const paginaPrefix = `/${input.portaal}/`;
  const pagina = input.paginaPad.endsWith("/") ? input.paginaPad : `${input.paginaPad}/`;
  if (!pagina.startsWith(paginaPrefix)) return false;
  const paginaDeel = pagina.slice(paginaPrefix.length).split("/")[0];
  return !OPENBARE_PAGINAS.includes(paginaDeel);
}
