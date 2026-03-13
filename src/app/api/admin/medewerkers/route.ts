import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import bcrypt from "bcryptjs";

function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin before allowing access
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("medewerkers")
    .select("*")
    .order("naam");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sanitized = (data || []).map((medewerker) => ({
    ...medewerker,
    heeft_wachtwoord: Boolean(medewerker.wachtwoord),
    wachtwoord: undefined,
  }));

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "admin_medewerkers_list",
    targetTable: "medewerkers",
    summary: "Medewerkerslijst bekeken",
    metadata: { count: sanitized.length },
  });

  return NextResponse.json({ data: sanitized });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin before allowing any mutations
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, data } = await request.json();

  if (action === "reset_password") {
    if (!id) {
      return NextResponse.json({ error: "Medewerker id ontbreekt" }, { status: 400 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({ wachtwoord: hashedPassword })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_reset_password",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Tijdelijk medewerker wachtwoord gegenereerd",
    });

    return NextResponse.json({ success: true, temporaryPassword });
  }

  if (action === "create" || action === "update") {
    const payload: Record<string, unknown> = { ...data };
    if (data.wachtwoord) {
      if (data.wachtwoord.length < 8) {
        return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens bevatten" }, { status: 400 });
      }
      payload.wachtwoord = await bcrypt.hash(data.wachtwoord, 10);
    } else {
      delete payload.wachtwoord;
    }

    if (action === "create") {
      const { error } = await supabaseAdmin.from("medewerkers").insert(payload);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin.from("medewerkers").update(payload).eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: action === "create" ? "admin_medewerker_create" : "admin_medewerker_update",
      targetTable: "medewerkers",
      targetId: id || null,
      summary: action === "create" ? "Medewerker aangemaakt" : "Medewerker bijgewerkt",
      metadata: {
        email: data?.email || null,
        status: data?.status || null,
        functieCount: Array.isArray(data?.functie) ? data.functie.length : 0,
      },
    });
  }

  if (action === "update_scores") {
    if (!id) {
      return NextResponse.json({ error: "Medewerker id ontbreekt" }, { status: 400 });
    }

    const { admin_score_aanwezigheid, admin_score_vaardigheden } = data || {};

    const isValidScore = (s: unknown) => typeof s === "number" && s >= 1 && s <= 5;
    if (!isValidScore(admin_score_aanwezigheid) || !isValidScore(admin_score_vaardigheden)) {
      return NextResponse.json({ error: "Scores moeten tussen 1 en 5 liggen" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        admin_score_aanwezigheid,
        admin_score_vaardigheden,
        admin_score_updated_at: new Date().toISOString(),
        admin_score_updated_by: email,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_update_scores",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Admin scores bijgewerkt",
      metadata: { admin_score_aanwezigheid, admin_score_vaardigheden },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "review_document") {
    const { document_id, review_status, review_opmerking } = data || {};

    if (!document_id || !["goedgekeurd", "afgekeurd"].includes(review_status)) {
      return NextResponse.json({ error: "Document ID en geldige review_status zijn verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerker_documenten")
      .update({
        review_status,
        review_opmerking: review_opmerking || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_document_review",
      targetTable: "medewerker_documenten",
      targetId: document_id,
      summary: `Document ${review_status}`,
      metadata: { review_status, review_opmerking },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    const { error } = await supabaseAdmin.from("medewerkers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_delete",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Medewerker verwijderd",
    });
  }

  return NextResponse.json({ success: true });
}
