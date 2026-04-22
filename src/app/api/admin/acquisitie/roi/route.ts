import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized ROI access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const periode = searchParams.get("periode") || "kwartaal"; // maand, kwartaal, jaar, custom
  const van = searchParams.get("van");
  const tot = searchParams.get("tot");

  // Bereken periode
  const now = new Date();
  let periodeStart: string;
  let periodeEind: string = now.toISOString().split("T")[0];

  if (van && tot) {
    periodeStart = van;
    periodeEind = tot;
  } else if (periode === "maand") {
    periodeStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  } else if (periode === "jaar") {
    periodeStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  } else {
    // kwartaal
    const q = Math.floor(now.getMonth() / 3) * 3;
    periodeStart = new Date(now.getFullYear(), q, 1).toISOString().split("T")[0];
  }

  // Dashboard
  if (view === "dashboard" || !view) {
    // Kosten in periode
    const { data: kosten } = await supabaseAdmin
      .from("acquisitie_kosten")
      .select("*")
      .gte("periode_start", periodeStart)
      .lte("periode_start", periodeEind)
      .limit(500);

    // Deals in periode
    const { data: deals } = await supabaseAdmin
      .from("acquisitie_deals")
      .select("*")
      .gte("gesloten_op", periodeStart)
      .lte("gesloten_op", periodeEind)
      .limit(500);

    // Totalen
    const totaleKosten = (kosten || []).reduce((sum, k) => sum + Number(k.bedrag), 0);
    const totaleOpbrengsten = (deals || []).reduce((sum, d) => sum + Number(d.totale_waarde || d.deal_waarde * (d.contract_duur_maanden || 12)), 0);
    const maandOpbrengsten = (deals || []).reduce((sum, d) => sum + Number(d.deal_waarde), 0);
    const aantalDeals = (deals || []).length;
    const roi = totaleKosten > 0 ? Math.round(((totaleOpbrengsten - totaleKosten) / totaleKosten) * 100) : 0;
    const cac = aantalDeals > 0 ? Math.round(totaleKosten / aantalDeals) : 0; // Cost per acquisition

    // Per kanaal
    const kanaalStats: Record<string, { kosten: number; deals: number; opbrengsten: number }> = {};
    for (const k of kosten || []) {
      const ch = k.kanaal || "overig";
      if (!kanaalStats[ch]) kanaalStats[ch] = { kosten: 0, deals: 0, opbrengsten: 0 };
      kanaalStats[ch].kosten += Number(k.bedrag);
    }
    for (const d of deals || []) {
      const ch = d.kanaal || "overig";
      if (!kanaalStats[ch]) kanaalStats[ch] = { kosten: 0, deals: 0, opbrengsten: 0 };
      kanaalStats[ch].deals++;
      kanaalStats[ch].opbrengsten += Number(d.totale_waarde || d.deal_waarde * (d.contract_duur_maanden || 12));
    }

    const perKanaal = Object.entries(kanaalStats).map(([kanaal, stats]) => ({
      kanaal,
      ...stats,
      roi: stats.kosten > 0 ? Math.round(((stats.opbrengsten - stats.kosten) / stats.kosten) * 100) : stats.opbrengsten > 0 ? 999 : 0,
      cac: stats.deals > 0 ? Math.round(stats.kosten / stats.deals) : 0,
    })).sort((a, b) => b.roi - a.roi);

    // Per sales rep
    const repStats: Record<string, { naam: string; deals: number; opbrengsten: number; kosten: number }> = {};
    for (const d of deals || []) {
      if (!d.sales_rep_id) continue;
      if (!repStats[d.sales_rep_id]) repStats[d.sales_rep_id] = { naam: "", deals: 0, opbrengsten: 0, kosten: 0 };
      repStats[d.sales_rep_id].deals++;
      repStats[d.sales_rep_id].opbrengsten += Number(d.totale_waarde || d.deal_waarde * (d.contract_duur_maanden || 12));
    }
    for (const k of kosten || []) {
      if (!k.sales_rep_id) continue;
      if (!repStats[k.sales_rep_id]) repStats[k.sales_rep_id] = { naam: "", deals: 0, opbrengsten: 0, kosten: 0 };
      repStats[k.sales_rep_id].kosten += Number(k.bedrag);
    }

    // Get rep names
    const repIds = Object.keys(repStats);
    if (repIds.length > 0) {
      const { data: reps } = await supabaseAdmin
        .from("acquisitie_sales_reps")
        .select("id, naam")
        .in("id", repIds);
      for (const r of reps || []) {
        if (repStats[r.id]) repStats[r.id].naam = r.naam;
      }
    }

    const perRep = Object.entries(repStats).map(([id, stats]) => ({
      id,
      ...stats,
      roi: stats.kosten > 0 ? Math.round(((stats.opbrengsten - stats.kosten) / stats.kosten) * 100) : 0,
    })).sort((a, b) => b.opbrengsten - a.opbrengsten);

    // Per categorie kosten
    const perCategorie: Record<string, number> = {};
    for (const k of kosten || []) {
      perCategorie[k.categorie] = (perCategorie[k.categorie] || 0) + Number(k.bedrag);
    }

    // Maandelijkse trend (laatste 6 maanden)
    const trend: { maand: string; kosten: number; opbrengsten: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const maandStart = d.toISOString().split("T")[0];
      const maandEind = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const maandLabel = d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });

      const mk = (kosten || [])
        .filter((k) => k.periode_start >= maandStart && k.periode_start <= maandEind)
        .reduce((s, k) => s + Number(k.bedrag), 0);
      const mo = (deals || [])
        .filter((dd) => dd.gesloten_op >= maandStart && dd.gesloten_op <= maandEind)
        .reduce((s, dd) => s + Number(dd.deal_waarde), 0);

      trend.push({ maand: maandLabel, kosten: mk, opbrengsten: mo });
    }

    // Pipeline waarde (verwacht)
    const { data: pipelineLeads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("predicted_deal_value, predicted_conversion_pct")
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .not("predicted_deal_value", "is", null)
      .limit(1000);

    const pipelineWaarde = (pipelineLeads || []).reduce((sum, l) =>
      sum + (Number(l.predicted_deal_value) * ((l.predicted_conversion_pct || 10) / 100)), 0);

    return NextResponse.json({
      data: {
        periode: { start: periodeStart, eind: periodeEind },
        totaleKosten: Math.round(totaleKosten),
        totaleOpbrengsten: Math.round(totaleOpbrengsten),
        maandOpbrengsten: Math.round(maandOpbrengsten),
        aantalDeals,
        roi,
        cac,
        pipelineWaarde: Math.round(pipelineWaarde),
        perKanaal,
        perRep,
        perCategorie: Object.entries(perCategorie).map(([cat, bedrag]) => ({ categorie: cat, bedrag: Math.round(bedrag) })).sort((a, b) => b.bedrag - a.bedrag),
        trend,
        recenteDeals: (deals || []).slice(0, 5),
        recenteKosten: (kosten || []).slice(0, 5),
      },
    });
  }

  // Kosten lijst
  if (view === "kosten") {
    const { data, error } = await supabaseAdmin
      .from("acquisitie_kosten")
      .select("*")
      .order("periode_start", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Deals lijst
  if (view === "deals") {
    const { data, error } = await supabaseAdmin
      .from("acquisitie_deals")
      .select("*, acquisitie_leads(bedrijfsnaam, branche, stad), acquisitie_sales_reps(naam)")
      .order("gesloten_op", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Onbekende view" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized ROI write by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Kosten CRUD
    if (action === "add_kosten") {
      const { categorie, omschrijving, bedrag, periode_start, periode_eind, is_maandelijks, kanaal, campagne_id, sales_rep_id, notities } = body;
      if (!categorie || !omschrijving || !bedrag || !periode_start) {
        return NextResponse.json({ error: "categorie, omschrijving, bedrag en periode_start vereist" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("acquisitie_kosten")
        .insert({
          categorie,
          omschrijving,
          bedrag: parseFloat(bedrag),
          periode_start,
          periode_eind: periode_eind || null,
          is_maandelijks: is_maandelijks || false,
          kanaal: kanaal || null,
          campagne_id: campagne_id || null,
          sales_rep_id: sales_rep_id || null,
          notities: notities || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "delete_kosten") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_kosten")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Deal CRUD
    if (action === "add_deal") {
      const { lead_id, bedrijfsnaam, deal_waarde, deal_type, contract_duur_maanden, kanaal, campagne_id, sales_rep_id, gesloten_op, notities } = body;
      if (!bedrijfsnaam || !deal_waarde) {
        return NextResponse.json({ error: "bedrijfsnaam en deal_waarde vereist" }, { status: 400 });
      }

      const duur = contract_duur_maanden || 12;
      const waarde = parseFloat(deal_waarde);

      const { data, error } = await supabaseAdmin
        .from("acquisitie_deals")
        .insert({
          lead_id: lead_id || null,
          bedrijfsnaam,
          deal_waarde: waarde,
          deal_type: deal_type || "nieuw",
          contract_duur_maanden: duur,
          totale_waarde: waarde * duur,
          kanaal: kanaal || null,
          campagne_id: campagne_id || null,
          sales_rep_id: sales_rep_id || null,
          gesloten_op: gesloten_op || new Date().toISOString().split("T")[0],
          notities: notities || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });

      // Update lead stage als gekoppeld
      if (lead_id) {
        await supabaseAdmin
          .from("acquisitie_leads")
          .update({ pipeline_stage: "klant", geconverteerd_op: new Date().toISOString() })
          .eq("id", lead_id);
      }

      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "delete_deal") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id vereist" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("acquisitie_deals")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/acquisitie/roi", action: "POST" });
    // console.error("ROI error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
