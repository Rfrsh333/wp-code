import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateBattleCard, analyzeCompetitiveLandscape, generateWinLossLearnings } from "@/lib/agents/competitive-intel";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized competitive access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  // Dashboard stats
  if (view === "dashboard") {
    const [
      { data: concurrenten },
      { data: winLoss },
      { count: totalLeads },
      { count: gewonnen },
      { count: verloren },
    ] = await Promise.all([
      supabaseAdmin.from("acquisitie_concurrenten").select("id, naam, type, regios, branches, prijsindicatie, actief").eq("actief", true).order("naam"),
      supabaseAdmin.from("acquisitie_win_loss").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("acquisitie_win_loss").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("acquisitie_win_loss").select("id", { count: "exact", head: true }).eq("resultaat", "gewonnen"),
      supabaseAdmin.from("acquisitie_win_loss").select("id", { count: "exact", head: true }).eq("resultaat", "verloren"),
    ]);

    // Win rate
    const total = (gewonnen || 0) + (verloren || 0);
    const winRate = total > 0 ? Math.round(((gewonnen || 0) / total) * 100) : 0;

    // Top redenen verloren
    const verlorenRecords = (winLoss || []).filter((r) => r.resultaat === "verloren");
    const redenCounts: Record<string, number> = {};
    for (const r of verlorenRecords) {
      if (r.reden) redenCounts[r.reden] = (redenCounts[r.reden] || 0) + 1;
    }
    const topRedenVerloren = Object.entries(redenCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reden, count]) => ({ reden, count }));

    // Per concurrent win/loss
    const perConcurrent: Record<string, { gewonnen: number; verloren: number }> = {};
    for (const r of winLoss || []) {
      if (!r.concurrent_id) continue;
      if (!perConcurrent[r.concurrent_id]) perConcurrent[r.concurrent_id] = { gewonnen: 0, verloren: 0 };
      if (r.resultaat === "gewonnen") perConcurrent[r.concurrent_id].gewonnen++;
      if (r.resultaat === "verloren") perConcurrent[r.concurrent_id].verloren++;
    }

    const concurrentStats = (concurrenten || []).map((c) => ({
      ...c,
      gewonnen: perConcurrent[c.id]?.gewonnen || 0,
      verloren: perConcurrent[c.id]?.verloren || 0,
      winRate: (perConcurrent[c.id]?.gewonnen || 0) + (perConcurrent[c.id]?.verloren || 0) > 0
        ? Math.round((perConcurrent[c.id]!.gewonnen / ((perConcurrent[c.id]?.gewonnen || 0) + (perConcurrent[c.id]?.verloren || 0))) * 100)
        : null,
    }));

    // Deal waarde
    const gewonnenWaarde = (winLoss || [])
      .filter((r) => r.resultaat === "gewonnen" && r.deal_waarde)
      .reduce((sum, r) => sum + Number(r.deal_waarde), 0);
    const verlorenWaarde = (winLoss || [])
      .filter((r) => r.resultaat === "verloren" && r.deal_waarde)
      .reduce((sum, r) => sum + Number(r.deal_waarde), 0);

    return NextResponse.json({
      data: {
        winRate,
        totalDeals: totalLeads || 0,
        gewonnen: gewonnen || 0,
        verloren: verloren || 0,
        gewonnenWaarde,
        verlorenWaarde,
        topRedenVerloren,
        concurrentStats,
        recentWinLoss: (winLoss || []).slice(0, 10),
      },
    });
  }

  // Concurrenten lijst
  if (view === "concurrenten" || !view) {
    const { data, error } = await supabaseAdmin
      .from("acquisitie_concurrenten")
      .select("*")
      .order("naam")
      .limit(500);

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Win/Loss lijst
  if (view === "win_loss") {
    const concurrentId = searchParams.get("concurrent_id");
    let query = supabaseAdmin
      .from("acquisitie_win_loss")
      .select("*, acquisitie_leads(bedrijfsnaam, branche, stad), acquisitie_concurrenten(naam)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (concurrentId) query = query.eq("concurrent_id", concurrentId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ data });
  }

  // AI analyse voor specifieke lead
  if (view === "lead_analysis") {
    const leadId = searchParams.get("lead_id");
    if (!leadId) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

    const { data: lead } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("bedrijfsnaam, branche, stad, pain_points, concurrent_info, enrichment_data")
      .eq("id", leadId)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });

    const { data: concurrenten } = await supabaseAdmin
      .from("acquisitie_concurrenten")
      .select("*")
      .eq("actief", true)
      .limit(100);

    const analysis = await analyzeCompetitiveLandscape(
      {
        ...lead,
        grootte: lead.enrichment_data?.grootte_indicatie || null,
      },
      concurrenten || []
    );

    return NextResponse.json({ data: analysis });
  }

  // Win/Loss learnings (AI)
  if (view === "learnings") {
    const { data: records } = await supabaseAdmin
      .from("acquisitie_win_loss")
      .select("resultaat, reden, reden_detail, branche, acquisitie_concurrenten(naam)")
      .order("created_at", { ascending: false })
      .limit(50);

    const formatted = (records || []).map((r) => ({
      resultaat: r.resultaat,
      reden: r.reden,
      reden_detail: r.reden_detail,
      branche: r.branche,
      concurrent_naam: (r.acquisitie_concurrenten as unknown as { naam: string } | null)?.naam,
    }));

    const learnings = await generateWinLossLearnings(formatted);
    return NextResponse.json({ data: learnings });
  }

  return NextResponse.json({ error: "Onbekende view" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized competitive write by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // CRUD concurrent
    if (action === "create_concurrent") {
      const { naam, website, type, regios, branches, sterke_punten, zwakke_punten, prijsindicatie, usps, onze_voordelen, notities } = body;
      if (!naam) return NextResponse.json({ error: "Naam is vereist" }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from("acquisitie_concurrenten")
        .insert({
          naam,
          website: website || null,
          type: type || "uitzendbureau",
          regios: regios || [],
          branches: branches || [],
          sterke_punten: sterke_punten || [],
          zwakke_punten: zwakke_punten || [],
          prijsindicatie: prijsindicatie || null,
          usps: usps || null,
          onze_voordelen: onze_voordelen || null,
          notities: notities || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "update_concurrent") {
      const { id, ...updateData } = body;
      if (!id) return NextResponse.json({ error: "id is vereist" }, { status: 400 });
      delete updateData.action;

      const { error } = await supabaseAdmin
        .from("acquisitie_concurrenten")
        .update(updateData)
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_concurrent") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id is vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_concurrenten")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Battle card genereren
    if (action === "generate_battle_card") {
      const { concurrent_id } = body;
      if (!concurrent_id) return NextResponse.json({ error: "concurrent_id vereist" }, { status: 400 });

      const { data: concurrent } = await supabaseAdmin
        .from("acquisitie_concurrenten")
        .select("*")
        .eq("id", concurrent_id)
        .single();

      if (!concurrent) return NextResponse.json({ error: "Concurrent niet gevonden" }, { status: 404 });

      const battleCard = await generateBattleCard(concurrent);

      await supabaseAdmin
        .from("acquisitie_concurrenten")
        .update({ battle_card: battleCard })
        .eq("id", concurrent_id);

      return NextResponse.json({ data: battleCard });
    }

    // Win/Loss registreren
    if (action === "register_win_loss") {
      const { lead_id, concurrent_id, resultaat, reden, reden_detail, deal_waarde, contactpersoon_feedback, learnings } = body;
      if (!resultaat) return NextResponse.json({ error: "resultaat vereist" }, { status: 400 });

      // Haal lead branche/stad op
      let branche = body.branche || null;
      let stad = body.stad || null;
      if (lead_id && (!branche || !stad)) {
        const { data: lead } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("branche, stad")
          .eq("id", lead_id)
          .single();
        if (lead) {
          branche = branche || lead.branche;
          stad = stad || lead.stad;
        }
      }

      const { data, error } = await supabaseAdmin
        .from("acquisitie_win_loss")
        .insert({
          lead_id: lead_id || null,
          concurrent_id: concurrent_id || null,
          resultaat,
          reden: reden || null,
          reden_detail: reden_detail || null,
          deal_waarde: deal_waarde || null,
          branche,
          stad,
          contactpersoon_feedback: contactpersoon_feedback || null,
          learnings: learnings || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });

      // Update lead stage als gewonnen/verloren
      if (lead_id && resultaat === "gewonnen") {
        await supabaseAdmin
          .from("acquisitie_leads")
          .update({ pipeline_stage: "klant" })
          .eq("id", lead_id);
      }
      if (lead_id && resultaat === "verloren") {
        await supabaseAdmin
          .from("acquisitie_leads")
          .update({ pipeline_stage: "afgewezen" })
          .eq("id", lead_id);
      }

      return NextResponse.json({ data }, { status: 201 });
    }

    // Concurrent info op lead opslaan
    if (action === "update_lead_competitor_info") {
      const { lead_id, concurrent_info } = body;
      if (!lead_id) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_leads")
        .update({ concurrent_info })
        .eq("id", lead_id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Competitive error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
