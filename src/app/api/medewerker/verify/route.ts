import { NextRequest, NextResponse } from "next/server";

/**
 * Compatibiliteitsredirect naar de veilige activatieflow.
 *
 * Deze route mintte voorheen op basis van de activatie-`magic_token` een volledige
 * 7-daagse medewerkerssessie ZONDER dat er ooit een wachtwoord werd ingesteld — feitelijk
 * een wachtwoordloze login die bij interceptie van de activatielink tot account-takeover
 * kon leiden. De legitieme activatie verloopt via `/medewerker/activeren` (waar de
 * medewerker zélf een wachtwoord instelt); niets in de codebase verwijst nog naar deze route.
 *
 * We minten hier daarom geen sessie meer, maar sturen eventuele (oude) links door naar de
 * activatiepagina zodat de gebruiker alsnog netjes een wachtwoord instelt.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/medewerker/login?error=invalid", request.url));
  }

  return NextResponse.redirect(
    new URL(`/medewerker/activeren?token=${encodeURIComponent(token)}`, request.url),
  );
}
