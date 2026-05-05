import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const lead_list_id = url.get("lead_list_id") || "";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const now = new Date().toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all non-archived leads
  let leadsQuery = supabaseAdmin
    .from("crm_leads")
    .select("id, status, outreach_status, next_best_channel, next_followup_at, instantly_email_status")
    .is("archived_at", null);

  if (lead_list_id) leadsQuery = leadsQuery.eq("lead_list_id", lead_list_id);

  const { data: leads } = await leadsQuery;

  // Get lead IDs for filtering contact logs / followups when filtered by list
  const leadIds = lead_list_id && leads ? leads.map(l => l.id) : null;

  // Get today's contact logs
  let todayLogsQuery = supabaseAdmin
    .from("crm_contact_logs")
    .select("type")
    .gte("created_at", todayISO);

  if (leadIds) todayLogsQuery = todayLogsQuery.in("lead_id", leadIds);

  const { data: todayLogs } = await todayLogsQuery;

  // Get overdue and upcoming followups
  let followupsDueQuery = supabaseAdmin
    .from("crm_followups")
    .select("*", { count: "exact", head: true })
    .eq("status", "gepland")
    .lte("scheduled_at", weekFromNow);

  if (leadIds) followupsDueQuery = followupsDueQuery.in("lead_id", leadIds);

  const { count: followupsDue } = await followupsDueQuery;

  let followupsOverdueQuery = supabaseAdmin
    .from("crm_followups")
    .select("*", { count: "exact", head: true })
    .eq("status", "gepland")
    .lt("scheduled_at", now);

  if (leadIds) followupsOverdueQuery = followupsOverdueQuery.in("lead_id", leadIds);

  const { count: followupsOverdue } = await followupsOverdueQuery;

  // Hot leads: replied or interested, with full lead data
  let hotLeadsQuery = supabaseAdmin
    .from("crm_leads")
    .select("*")
    .is("archived_at", null)
    .in("outreach_status", ["replied", "interested"])
    .order("updated_at", { ascending: false })
    .limit(10);

  if (lead_list_id) hotLeadsQuery = hotLeadsQuery.eq("lead_list_id", lead_list_id);

  const { data: hotLeads } = await hotLeadsQuery;

  // Action: phone leads
  let actionPhoneQuery = supabaseAdmin
    .from("crm_leads")
    .select("*")
    .is("archived_at", null)
    .eq("next_best_channel", "phone")
    .not("outreach_status", "in", "(not_interested,converted)")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (lead_list_id) actionPhoneQuery = actionPhoneQuery.eq("lead_list_id", lead_list_id);

  const { data: actionPhone } = await actionPhoneQuery;

  // Action: overdue followups with lead data
  let overdueQuery = supabaseAdmin
    .from("crm_leads")
    .select("*")
    .is("archived_at", null)
    .lt("next_followup_at", now)
    .not("next_followup_at", "is", null)
    .order("next_followup_at", { ascending: true })
    .limit(10);

  if (lead_list_id) overdueQuery = overdueQuery.eq("lead_list_id", lead_list_id);

  const { data: overdueFollowupLeads } = await overdueQuery;

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
  const interestToday = logs.filter(l => l.type === "geïnteresseerd").length;
  const appointmentsToday = logs.filter(l => l.type === "afspraak_gepland").length;

  const conversionRate = total > 0 ? Math.round((gewonnen / total) * 100) : 0;

  // Instantly email stats
  const instantlySent = allLeads.filter(l => l.instantly_email_status && l.instantly_email_status !== "not_sent").length;
  const instantlyOpened = allLeads.filter(l => ["opened", "clicked", "replied"].includes(l.instantly_email_status || "")).length;
  const instantlyReplied = allLeads.filter(l => l.instantly_email_status === "replied").length;
  const instantlyBounced = allLeads.filter(l => l.instantly_email_status === "bounced").length;

  // Campaign stats
  const { count: activeCampaigns } = await supabaseAdmin
    .from("crm_instantly_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", 1);

  const emailRepliesToday = logs.filter(l => l.type === "instantly_replied").length;

  const openedNotCalled = allLeads.filter(l =>
    l.instantly_email_status === "opened" && l.next_best_channel === "phone"
  ).length;

  const { count: unmatchedInstantly } = await supabaseAdmin
    .from("crm_unmatched_instantly_leads")
    .select("*", { count: "exact", head: true })
    .eq("resolution", "pending");

  const { count: possibleDuplicates } = await supabaseAdmin
    .from("crm_leads")
    .select("*", { count: "exact", head: true })
    .eq("is_possible_duplicate", true)
    .is("archived_at", null);

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
      interest_today: interestToday,
      appointments_today: appointmentsToday,
      instantly_sent: instantlySent,
      instantly_opened: instantlyOpened,
      instantly_replied: instantlyReplied,
      instantly_bounced: instantlyBounced,
      active_campaigns: activeCampaigns || 0,
      email_replies_today: emailRepliesToday,
      opened_not_called: openedNotCalled,
      unmatched_instantly: unmatchedInstantly || 0,
      possible_duplicates: possibleDuplicates || 0,
    },
    todo: {
      phone: todoPhone,
      followup_overdue: todoFollowup,
      replied: todoReplied,
    },
    hot_leads: hotLeads || [],
    action_phone: actionPhone || [],
    action_followup_overdue: overdueFollowupLeads || [],
  });
}
