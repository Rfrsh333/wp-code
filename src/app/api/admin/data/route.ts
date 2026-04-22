import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { ensureMedewerkerFromCandidate } from "@/lib/candidate-to-medewerker";
import { sendMedewerkerActivationEmail } from "@/lib/medewerker-activation";
import { dataPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { captureRouteError } from "@/lib/sentry-utils";

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

  if ((action === "delete" || action === "delete_many") && !hasRequiredAdminRole(role, ["owner"])) {
    return NextResponse.json(
      { error: "Alleen owners mogen records verwijderen" },
      { status: 403 }
    );
  }

  let generatedMedewerkerLinks = 0;

  if (action === "update") {
    const { error: updateError } = await supabaseAdmin.from(table).update(data).eq("id", id);
    if (updateError) {
      captureRouteError(updateError, { route: "/api/admin/data", action: "POST" });
      // console.error(`[DATA] Update error on ${table}:`, updateError.message, { id, data });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (
      table === "inschrijvingen" &&
      data?.onboarding_status === "inzetbaar"
    ) {
      const { data: candidate } = await supabaseAdmin
        .from("inschrijvingen")
        .select("id, voornaam, tussenvoegsel, achternaam, email, telefoon, gewenste_functies, interne_notitie, medewerker_id")
        .eq("id", id)
        .single();

      if (candidate && !candidate.medewerker_id) {
        const medewerkerId = await ensureMedewerkerFromCandidate(candidate);
        await supabaseAdmin.from("inschrijvingen").update({ medewerker_id: medewerkerId }).eq("id", id);
        const { data: medewerker } = await supabaseAdmin
          .from("medewerkers")
          .select("id, naam, email")
          .eq("id", medewerkerId)
          .single();

        if (medewerker?.email) {
          await sendMedewerkerActivationEmail(medewerker);
        }
        generatedMedewerkerLinks = 1;
      }
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
    await supabaseAdmin.from(table).delete().eq("id", id);
  }
  if (action === "delete_many") {
    await supabaseAdmin.from(table).delete().in("id", data.ids);
  }
  if (action === "bulk_update") {
    if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
      return NextResponse.json({ error: "Onvoldoende rechten voor bulk update" }, { status: 403 });
    }
    const { error: bulkError } = await supabaseAdmin.from(table).update(data).in("id", ids);
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
      const { data: candidates } = await supabaseAdmin
        .from("inschrijvingen")
        .select("id, voornaam, tussenvoegsel, achternaam, email, telefoon, gewenste_functies, interne_notitie, medewerker_id")
        .in("id", ids);

      for (const candidate of candidates || []) {
        if (candidate.medewerker_id) continue;

        const medewerkerId = await ensureMedewerkerFromCandidate(candidate);
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ medewerker_id: medewerkerId })
          .eq("id", candidate.id);
        const { data: medewerker } = await supabaseAdmin
          .from("medewerkers")
          .select("id, naam, email")
          .eq("id", medewerkerId)
          .single();

        if (medewerker?.email) {
          await sendMedewerkerActivationEmail(medewerker);
        }
        generatedMedewerkerLinks += 1;
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

  return NextResponse.json({ success: true });
}
