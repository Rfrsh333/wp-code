import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { kandidaatWorkflowPostSchema, kandidaatWorkflowPatchSchema, validateAdminBody } from "@/lib/validations-admin";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const inschrijvingId = searchParams.get("inschrijvingId");

  if (!inschrijvingId) {
    return NextResponse.json({ error: "inschrijvingId is verplicht" }, { status: 400 });
  }

  const [contactsResult, tasksResult, emailsResult] = await Promise.all([
    supabaseAdmin
      .from("kandidaat_contactmomenten")
      .select("id, inschrijving_id, contact_type, summary, created_by, created_at")
      .eq("inschrijving_id", inschrijvingId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("kandidaat_taken")
      .select("id, inschrijving_id, title, note, due_at, completed_at, created_by, created_at")
      .eq("inschrijving_id", inschrijvingId)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("due_at", { ascending: true, nullsFirst: true }),
    supabaseAdmin
      .from("email_log")
      .select("id, email_type, recipient, subject, sent_at, delivered_at, bounced_at, opened_at, clicked_at, status")
      .eq("kandidaat_id", inschrijvingId)
      .order("sent_at", { ascending: false })
      .limit(25),
  ]);

  return NextResponse.json({
    contacts: contactsResult.data || [],
    tasks: tasksResult.data || [],
    emails: emailsResult.data || [],
    requestedBy: email,
  });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const validation = validateAdminBody(kandidaatWorkflowPostSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { type, inschrijvingId } = body;

  if (type === "contact") {
    const { contactType, summary } = body;
    if (!contactType || !summary) {
      return NextResponse.json({ error: "contactType en summary zijn verplicht" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("kandidaat_contactmomenten")
      .insert({
        inschrijving_id: inschrijvingId,
        contact_type: contactType,
        summary,
        created_by: email || null,
      })
      .select("id, inschrijving_id, contact_type, summary, created_by, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Contactmoment opslaan mislukt" }, { status: 500 });
    }

    await supabaseAdmin
      .from("inschrijvingen")
      .update({ laatste_contact_op: new Date().toISOString() })
      .eq("id", inschrijvingId);

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "create_contactmoment",
      targetTable: "kandidaat_contactmomenten",
      targetId: data.id,
      summary: `Contactmoment toegevoegd: ${contactType}`,
      metadata: { inschrijvingId },
    });

    return NextResponse.json({ success: true, data });
  }

  if (type === "task") {
    const { title, note, dueAt } = body;
    if (!title) {
      return NextResponse.json({ error: "title is verplicht" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("kandidaat_taken")
      .insert({
        inschrijving_id: inschrijvingId,
        title,
        note: note || null,
        due_at: dueAt || null,
        created_by: email || null,
      })
      .select("id, inschrijving_id, title, note, due_at, completed_at, created_by, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Taak opslaan mislukt" }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "create_candidate_task",
      targetTable: "kandidaat_taken",
      targetId: data.id,
      summary: `Taak toegevoegd: ${title}`,
      metadata: { inschrijvingId, dueAt: dueAt || null },
    });

    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ error: "Ongeldig type" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const validation = validateAdminBody(kandidaatWorkflowPatchSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { taskId, completed, title, note, dueAt } = body;

  const updates: Record<string, string | null> = {};
  if (typeof completed === "boolean") {
    updates.completed_at = completed ? new Date().toISOString() : null;
  }
  if (typeof title === "string") {
    updates.title = title;
  }
  if (typeof note === "string") {
    updates.note = note || null;
  }
  if (typeof dueAt === "string" || dueAt === null) {
    updates.due_at = dueAt || null;
  }

  const { data, error } = await supabaseAdmin
    .from("kandidaat_taken")
    .update(updates)
    .eq("id", taskId)
    .select("id, inschrijving_id, title, note, due_at, completed_at, created_by, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Taak bijwerken mislukt" }, { status: 500 });
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "update_candidate_task",
    targetTable: "kandidaat_taken",
    targetId: taskId,
    summary: completed === true ? "Taak afgerond" : "Taak bijgewerkt",
    metadata: { completed: completed ?? null },
  });

  return NextResponse.json({ success: true, data });
}
