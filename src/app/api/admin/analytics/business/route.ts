import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized analytics access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Pipeline Metrics
    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, pipeline_stage, created_at, geconverteerd_op, engagement_score");

    const totalLeads = leads?.length || 0;
    const leadsByStage = {
      nieuw: leads?.filter(l => l.pipeline_stage === "nieuw").length || 0,
      benaderd: leads?.filter(l => l.pipeline_stage === "benaderd").length || 0,
      interesse: leads?.filter(l => l.pipeline_stage === "interesse").length || 0,
      offerte: leads?.filter(l => l.pipeline_stage === "offerte").length || 0,
      klant: leads?.filter(l => l.pipeline_stage === "klant").length || 0,
      afgewezen: leads?.filter(l => l.pipeline_stage === "afgewezen").length || 0,
    };

    const convertedLeads = leads?.filter(l => l.pipeline_stage === "klant").length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const avgEngagement = leads?.length
      ? (leads.reduce((sum, l) => sum + (l.engagement_score || 0), 0) / leads.length)
      : 0;

    const recentLeads = leads?.filter(l =>
      new Date(l.created_at) >= thirtyDaysAgo
    ).length || 0;

    // Revenue Metrics (from factuur_regels)
    const { data: factuurRegels } = await supabaseAdmin
      .from("factuur_regels")
      .select("bedrag, created_at");

    const thisMonthRevenue = factuurRegels
      ?.filter(f => new Date(f.created_at) >= startOfMonth)
      .reduce((sum, f) => sum + (f.bedrag || 0), 0) || 0;

    const lastMonthRevenue = factuurRegels
      ?.filter(f => {
        const date = new Date(f.created_at);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      })
      .reduce((sum, f) => sum + (f.bedrag || 0), 0) || 0;

    const revenueTrend = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Operations Metrics (diensten)
    const { data: diensten } = await supabaseAdmin
      .from("diensten")
      .select("id, status, datum, medewerker_id");

    const activeDiensten = diensten?.filter(d =>
      d.status === "gepland" || d.status === "actief"
    ).length || 0;

    const completedDiensten = diensten?.filter(d => d.status === "voltooid").length || 0;
    const assignedDiensten = diensten?.filter(d => d.medewerker_id).length || 0;
    const fillRate = diensten?.length
      ? (assignedDiensten / diensten.length) * 100
      : 0;

    // Medewerker Metrics
    const { data: medewerkers } = await supabaseAdmin
      .from("medewerkers")
      .select("id, status");

    const activeMedewerkers = medewerkers?.filter(m =>
      m.status === "actief" || m.status === "beschikbaar"
    ).length || 0;

    // Kandidaat Pipeline
    const { data: inschrijvingen } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, status, created_at");

    const newApplications = inschrijvingen?.filter(i =>
      new Date(i.created_at) >= thirtyDaysAgo
    ).length || 0;

    const pendingReview = inschrijvingen?.filter(i =>
      i.status === "documenten_ingediend" || i.status === "in_beoordeling"
    ).length || 0;

    const approvedThisMonth = inschrijvingen?.filter(i =>
      i.status === "goedgekeurd" && new Date(i.created_at) >= startOfMonth
    ).length || 0;

    // Engagement Metrics
    const { data: contactmomenten } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("type, richting, resultaat, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const totalContacts = contactmomenten?.length || 0;
    const positiveContacts = contactmomenten?.filter(c => c.resultaat === "positief").length || 0;
    const positiveRate = totalContacts > 0 ? (positiveContacts / totalContacts) * 100 : 0;

    const contactsByChannel = contactmomenten?.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topChannel = contactsByChannel
      ? Object.entries(contactsByChannel).sort(([,a], [,b]) => b - a)[0]?.[0]
      : null;

    // Email Stats (from email_log)
    const { data: emailLog } = await supabaseAdmin
      .from("email_log")
      .select("status, opened_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const emailsSent = emailLog?.length || 0;
    const emailsOpened = emailLog?.filter(e => e.opened_at).length || 0;
    const emailOpenRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;

    // Response Time (avg time from lead creation to first contact)
    const leadsWithContacts = await Promise.all(
      (leads?.slice(0, 50) || []).map(async (lead) => {
        const { data: firstContact } = await supabaseAdmin
          .from("acquisitie_contactmomenten")
          .select("created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (firstContact) {
          const leadDate = new Date(lead.created_at);
          const contactDate = new Date(firstContact.created_at);
          return (contactDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60); // hours
        }
        return null;
      })
    );

    const validResponseTimes = leadsWithContacts.filter(t => t !== null) as number[];
    const avgResponseTime = validResponseTimes.length
      ? validResponseTimes.reduce((sum, t) => sum + t, 0) / validResponseTimes.length
      : 0;

    const metrics = {
      pipeline: {
        total: totalLeads,
        byStage: leadsByStage,
        conversionRate: Math.round(conversionRate * 10) / 10,
        recentLeads,
        avgEngagement: Math.round(avgEngagement),
      },
      revenue: {
        thisMonth: Math.round(thisMonthRevenue * 100) / 100,
        lastMonth: Math.round(lastMonthRevenue * 100) / 100,
        trend: Math.round(revenueTrend * 10) / 10,
        total: Math.round((factuurRegels?.reduce((sum, f) => sum + (f.bedrag || 0), 0) || 0) * 100) / 100,
      },
      operations: {
        activeDiensten,
        completedDiensten,
        fillRate: Math.round(fillRate * 10) / 10,
        activeMedewerkers,
      },
      candidates: {
        newApplications,
        pendingReview,
        approvedThisMonth,
      },
      engagement: {
        totalContacts,
        positiveRate: Math.round(positiveRate * 10) / 10,
        topChannel,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        emailOpenRate: Math.round(emailOpenRate * 10) / 10,
      },
      period: {
        from: thirtyDaysAgo.toISOString(),
        to: now.toISOString(),
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Business analytics error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
