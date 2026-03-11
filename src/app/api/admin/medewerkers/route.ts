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
