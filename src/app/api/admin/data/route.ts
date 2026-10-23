import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { verwerkInzetbaar, type InzetbaarResultaat } from "@/lib/kandidaat-inzetbaar";
import { dataPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { captureRouteError } from "@/lib/sentry-utils";
import { schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";
import { geldVeldenAdminData } from "@/lib/uitbetaling/admin-data-regels";

// KRITIEK: Whitelist van toegestane tables om SQL injection te voorkomen
const ALLOWED_TABLES = [
  "calculator_leads",
  "contact_berichten",
  "personeel_aanvragen",
  "inschrijvingen",
  "leads",
  "klanten",
  "diensten",
  "dienst_aanmeldingen",
  "uren_registraties",
  "facturen",
  "factuur_regels",
  "kandidaat_contactmomenten",
  "kandidaat_taken",
  "acquisitie_leads",
  "acquisitie_contactmomenten",
  "acquisitie_campagnes",
  "acquisitie_campagne_leads",
  "acquisitie_sales_reps",
  "acquisitie_concurrenten",
  "acquisitie_win_loss",
  "acquisitie_prediction_log",
  "acquisitie_segmenten",
  "acquisitie_tag_definities",
  "acquisitie_kosten",
  "acquisitie_deals",
  "offertes",
  "referrals",
  "pricing_rules",
  "google_reviews",
  "content_posts",
  "availability_slots",
  "bookings",
  "admin_settings",
  "event_types",
  "availability_schedules",
  "availability_overrides",
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

/** Bulk "inzetbaar": per kandidaat account + documenten + mail; zo blijft het binnen maxDuration. */
const MAX_BULK_INZETBAAR = 10;

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized data access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table");

  if (!table) {
    return NextResponse.json({ error: "Table required" }, { status: 400 });
  }

  // KRITIEK: Check table whitelist
  if (!isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to access non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  // admin_settings heeft geen created_at kolom
  const TABLES_WITHOUT_CREATED_AT = ["admin_settings", "availability_schedules"];
  let query = supabaseAdmin.from(table).select("*");
  if (!TABLES_WITHOUT_CREATED_AT.includes(table)) {
    query = query.order("created_at", { ascending: false });
  }
  const { data, error } = await query.limit(500);

  if (error) {
    captureRouteError(error, { route: "/api/admin/data", action: "GET" });
    // console.error(`[DATA] Error fetching ${table}:`, error.message);
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  return NextResponse.json({ data }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized data mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const rawBody = await request.json();
  const validation = validateAdminBody(dataPostSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { action, table, id, ids, data } = rawBody;

  // KRITIEK: Check table whitelist
  if (!table || !isAllowedTable(table)) {
    console.warn(`[SECURITY] Attempt to mutate non-whitelisted table: ${table} by ${email}`);
    return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
  }

  if ((action === "delete" || action === "delete_many") && !hasRequiredAdminRole(role, ["owner", "operations"])) {
    return NextResponse.json(
      { error: "Onvoldoende rechten om records te verwijderen" },
      { status: 403 }
    );
  }

  if (action === "update" && !hasRequiredAdminRole(role, ["owner", "operations", "recruiter"])) {
    return NextResponse.json(
      { error: "Onvoldoende rechten om records bij te werken" },
      { status: 403 }
    );
  }

  // Stap 6 "Geld": een klantfactuur op betaald zetten of uren goedkeuren maakt uren uitbetaalbaar.
  // Dat mag via deze generieke route alleen met een geld-rol, en "betaald" krijgt altijd betaald_op.
  const geld = geldVeldenAdminData(table, action === "update" || action === "bulk_update" ? data : undefined);
  if (geld.vereistGeldRol && !hasRequiredAdminRole(role, ["owner", "finance"])) {
    return NextResponse.json({ error: "Onvoldoende rechten — finance vereist" }, { status: 403 });
  }
  // Alleen bij "factuur op betaald" anders schrijven (met betaald_op, weggelaten zolang die kolom
  // nog niet bestaat); alle andere updates gaan precies zoals voorheen.
  const metBetaaldOp = geld.data && geld.optioneel.length > 0 ? geld.data : null;

  let generatedMedewerkerLinks = 0;
  const inzetbaarResultaten: InzetbaarResultaat[] = [];

  if (action === "update") {
    const { error: updateError } = metBetaaldOp
      ? await schrijfMetKolomFallback(metBetaaldOp, geld.optioneel, (rij) => supabaseAdmin.from(table).update(rij).eq("id", id))
      : await supabaseAdmin.from(table).update(data).eq("id", id);
    if (updateError) {
      captureRouteError(updateError, { route: "/api/admin/data", action: "POST" });
      // console.error(`[DATA] Update error on ${table}:`, updateError.message, { id, data });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar"
    ) {
      // Account + activatiemail (of welkomstmail bij een bestaand account): lib/kandidaat-inzetbaar.
      const resultaat = await verwerkInzetbaar(id);
      inzetbaarResultaten.push(resultaat);
      if (resultaat.nieuwAccount) generatedMedewerkerLinks = 1;
    }

    // Send rejection email when status changes to afgewezen
    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "afgewezen"
    ) {
      const { data: kandidaat } = await supabaseAdmin
        .from("inschrijvingen")
        .select("id, voornaam, achternaam, email, uitbetalingswijze")
        .eq("id", id)
        .single();

      if (kandidaat?.email) {
        const { sendAfwijzingsmail, logEmail } = await import("@/lib/candidate-onboarding");
        try {
          const emailResult = await sendAfwijzingsmail(kandidaat);
          if (emailResult.data?.id) {
            await logEmail(kandidaat.id, "custom", kandidaat.email, `Afwijzingsmail`, emailResult.data.id);
          }
        } catch (emailError) {
          captureRouteError(emailError, { route: "/api/admin/data", action: "POST" });
          // console.error("Failed to send rejection email:", emailError);
        }
      }
    }
  }
  if (action === "delete") {
    const { error: deleteError } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (deleteError) {
      captureRouteError(deleteError, { route: "/api/admin/data", action: "POST" });
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }
  if (action === "delete_many") {
    const { error: deleteManyError } = await supabaseAdmin.from(table).delete().in("id", data.ids);
    if (deleteManyError) {
      captureRouteError(deleteManyError, { route: "/api/admin/data", action: "POST" });
      return NextResponse.json({ error: deleteManyError.message }, { status: 500 });
    }
  }
  if (action === "bulk_update") {
    if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
      return NextResponse.json({ error: "Onvoldoende rechten voor bulk update" }, { status: 403 });
    }
    // Inzetbaar maakt per kandidaat een account aan, kopieert documenten en stuurt een mail;
    // dat moet binnen de tijdslimiet van de functie blijven.
    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar" &&
      Array.isArray(ids) &&
      ids.length > MAX_BULK_INZETBAAR
    ) {
      return NextResponse.json(
        { error: `Zet maximaal ${MAX_BULK_INZETBAAR} kandidaten tegelijk op inzetbaar.` },
        { status: 400 },
      );
    }
    const { error: bulkError } = metBetaaldOp
      ? await schrijfMetKolomFallback(metBetaaldOp, geld.optioneel, (rij) => supabaseAdmin.from(table).update(rij).in("id", ids))
      : await supabaseAdmin.from(table).update(data).in("id", ids);
    if (bulkError) {
      captureRouteError(bulkError, { route: "/api/admin/data", action: "POST" });
      // console.error(`[DATA] Bulk update error on ${table}:`, bulkError.message, { ids, data });
      return NextResponse.json({ error: bulkError.message }, { status: 500 });
    }

    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar" &&
      Array.isArray(ids) &&
      ids.length > 0
    ) {
      for (const kandidaatId of ids as string[]) {
        const resultaat = await verwerkInzetbaar(kandidaatId);
        inzetbaarResultaten.push(resultaat);
        if (resultaat.nieuwAccount) generatedMedewerkerLinks += 1;
      }
    }
  }
  if (action === "insert") {
    if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
      return NextResponse.json({ error: "Onvoldoende rechten voor insert" }, { status: 403 });
    }
    await supabaseAdmin.from(table).insert(data);
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: `admin_data_${action}`,
    targetTable: table,
    targetId: id || null,
    summary: `${action} uitgevoerd op ${table}`,
    metadata: {
      ids: ids || null,
      changedFields: data ? Object.keys(data) : [],
      generatedMedewerkerLinks,
    },
  });

  // Inzetbaar: laat de admin zien als het account of de mail niet lukte (B8), in plaats van
  // stil "gelukt" te melden.
  const accountFouten = inzetbaarResultaten.filter((r) => r.accountFout);
  if (accountFouten.length > 0) {
    return NextResponse.json(
      {
        error: `Status is bijgewerkt, maar ${accountFouten.length === 1 ? "het medewerkeraccount kon" : `${accountFouten.length} medewerkeraccounts konden`} niet worden aangemaakt. Probeer het opnieuw.`,
        inzetbaar: inzetbaarResultaten,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    success: true,
    ...(inzetbaarResultaten.length > 0
      ? {
          inzetbaar: inzetbaarResultaten,
          mailMislukt: inzetbaarResultaten.filter((r) => r.mailMislukt).length,
          waarschuwingen: inzetbaarResultaten.map((r) => r.waarschuwing).filter((w): w is string => !!w),
        }
      : {}),
  });
}
