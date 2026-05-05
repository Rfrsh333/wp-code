import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get the contact log
  const { data: log, error: logError } = await supabaseAdmin
    .from("crm_contact_logs")
    .select("*")
    .eq("id", id)
    .single();

  if (logError || !log) {
    return NextResponse.json({ error: "Log niet gevonden" }, { status: 404 });
  }

  if (log.is_reverted) {
    return NextResponse.json({ error: "Actie is al teruggedraaid" }, { status: 400 });
  }

  if (!log.previous_state) {
    return NextResponse.json({ error: "Geen vorige staat beschikbaar om terug te draaien" }, { status: 400 });
  }

  const previousState = log.previous_state as Record<string, unknown>;

  // Revert the lead to previous state
  const { data: updatedLead, error: updateError } = await supabaseAdmin
    .from("crm_leads")
    .update(previousState)
    .eq("id", log.lead_id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Terugdraaien mislukt" }, { status: 500 });
  }

  // Mark log as reverted
  await supabaseAdmin
    .from("crm_contact_logs")
    .update({
      is_reverted: true,
      reverted_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Create a new log entry for the revert
  await supabaseAdmin
    .from("crm_contact_logs")
    .insert({
      lead_id: log.lead_id,
      type: "notitie",
      notes: `Actie teruggedraaid: ${log.type}`,
    });

  return NextResponse.json(updatedLead);
}
