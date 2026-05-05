import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const now = new Date().toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all non-archived leads
  const { data: leads } = await supabaseAdmin
    .from("crm_leads")
    .select("status, outreach_status, next_best_channel, next_followup_at")
    .is("archived_at", null);

  // Get today's contact logs
  const { data: todayLogs } = await supabaseAdmin
    .from("crm_contact_logs")
    .select("type")
    .gte("created_at", todayISO);

  // Get overdue and upcoming followups
  const { count: followupsDue } = await supabaseAdmin
    .from("crm_followups")
    .select("*", { count: "exact", head: true })
    .eq("status", "gepland")
    .lte("scheduled_at", weekFromNow);

  const { count: followupsOverdue } = await supabaseAdmin
    .from("crm_followups")
    .select("*", { count: "exact", head: true })
    .eq("status", "gepland")
    .lt("scheduled_at", now);

  const allLeads = leads || [];
  const logs = todayLogs || [];

  const total = allLeads.length;
  const nieuw = allLeads.filter(l => l.status === "nieuw").length;
  const inGesprek = allLeads.filter(l => l.status === "in_gesprek").length;
  const gewonnen = allLeads.filter(l => l.outreach_status === "converted").length;
  const verloren = allLeads.filter(l => l.outreach_status === "not_interested").length;
  const replied = allLeads.filter(l => l.outreach_status === "replied").length;
  const interested = allLeads.filter(l => l.outreach_status === "interested").length;

  const callsToday = logs.filter(l => ["gebeld", "geen_gehoor", "voicemail", "gesproken"].includes(l.type)).length;
  const emailsToday = logs.filter(l => ["email", "instantly_sent"].includes(l.type)).length;
  const instagramToday = logs.filter(l => l.type === "dm_instagram").length;
  const facebookToday = logs.filter(l => l.type === "dm_facebook").length;
  const gesprekkenToday = logs.filter(l => l.type === "gesproken").length;

  const conversionRate = total > 0 ? Math.round((gewonnen / total) * 100) : 0;

  // "Vandaag doen" items
  const todoPhone = allLeads.filter(l => l.next_best_channel === "phone").length;
  const todoFollowup = allLeads.filter(l => {
    if (!l.next_followup_at) return false;
    return l.next_followup_at <= now;
  }).length;
  const todoReplied = allLeads.filter(l => l.outreach_status === "replied").length;

  return NextResponse.json({
    stats: {
      total,
      nieuw,
      in_gesprek: inGesprek,
      gewonnen,
      verloren,
      followups_due: followupsDue || 0,
      followups_overdue: followupsOverdue || 0,
      contacted_today: callsToday + emailsToday + instagramToday + facebookToday,
      conversion_rate: conversionRate,
      calls_today: callsToday,
      emails_today: emailsToday,
      instagram_dms_today: instagramToday,
      facebook_dms_today: facebookToday,
      gesprekken_today: gesprekkenToday,
      replies_total: replied,
      interested_total: interested,
      converted_total: gewonnen,
    },
    todo: {
      phone: todoPhone,
      followup_overdue: todoFollowup,
      replied: todoReplied,
    },
  });
}
