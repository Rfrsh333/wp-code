import { NextResponse } from "next/server";
import { SFEER_CATEGORIEEN, sfeerfotoCatalogus } from "@/lib/sfeerfotos";

/**
 * Catalogus van de standaardfoto's (openbaar, geen sessie): de werkgever kiest er een bij een
 * aanvraag (`sfeerfoto_id`) of als bedrijfsfoto (PUT /api/klant/bedrijfsfoto). Absolute URL's.
 * Cachebaar: de catalogus verandert alleen met een deploy (next.config.ts zet hier geen no-store).
 */
export function GET() {
  return NextResponse.json(
    { fotos: sfeerfotoCatalogus(), categorieen: SFEER_CATEGORIEEN },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
