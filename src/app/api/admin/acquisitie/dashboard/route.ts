import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// Gemiddelde maandelijkse contractwaarde per branche (in euro's)
const BRANCHE_WAARDEN: Record<string, number> = {
  restaurant: 3500,
  cafe: 2000,
  hotel: 5000,
  catering: 4000,
  events: 3000,
  bar: 1800,
  fastfood: 2500,
  bezorging: 2000,
  default: 3000,
};

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized dashboard access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") || "maand";
  const vanDatum = searchParams.get("van");
  const totDatum = searchParams.get("tot");

  // Bereken datum range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);

  if (vanDatum && totDatum) {
    startDate = new Date(vanDatum);
    endDate = new Date(totDatum);
  } else {
    switch (periode) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "kwartaal":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "jaar":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "maand":
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
  }

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  try {
    // === 1. FUNNEL DATA ===
    const { data: allLeads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, pipeline_stage, branche, stad, ai_score, created_at, geconverteerd_op, updated_at")
      .limit(2000);

    const stages = ["nieuw", "benaderd", "interesse", "offerte", "klant", "afgewezen"];
    const funnelData = stages.map((stage) => ({
      stage,
      count: allLeads?.filter((l) => l.pipeline_stage === stage).length || 0,
    }));

    // Conversiepercentages: van elke stage naar de volgende
    const conversionStages = ["nieuw", "benaderd", "interesse", "offerte", "klant"];
    const conversions = conversionStages.slice(0, -1).map((stage, i) => {
      const current = funnelData.find((f) => f.stage === stage)?.count || 0;
      const next = funnelData.find((f) => f.stage === conversionStages[i + 1])?.count || 0;
      // Tel ook alle stages die VERDER zijn dan de volgende stage
      const passedThrough = conversionStages.slice(i + 1).reduce(
        (sum, s) => sum + (funnelData.find((f) => f.stage === s)?.count || 0),
        0
      );
      const total = current + passedThrough;
      return {
        van: stage,
        naar: conversionStages[i + 1],
        percentage: total > 0 ? Math.round((passedThrough / total) * 100) : 0,
      };
    });

    // === 2. REVENUE FORECAST ===
    const offertLeads = allLeads?.filter((l) => l.pipeline_stage === "offerte") || [];
    const revenueForecast = offertLeads.reduce((total, lead) => {
      const branche = (lead.branche || "").toLowerCase();
      const waarde = BRANCHE_WAARDEN[branche] || BRANCHE_WAARDEN.default;
      return total + waarde;
    }, 0);

    // Revenue per branche voor offerte leads
    const revenuePerBranche: Record<string, { count: number; waarde: number }> = {};
    offertLeads.forEach((lead) => {
      const branche = lead.branche || "onbekend";
      if (!revenuePerBranche[branche]) revenuePerBranche[branche] = { count: 0, waarde: 0 };
      revenuePerBranche[branche].count++;
      revenuePerBranche[branche].waarde += BRANCHE_WAARDEN[branche.toLowerCase()] || BRANCHE_WAARDEN.default;
    });

    // Gewonnen klanten waarde
    const klantLeads = allLeads?.filter((l) => l.pipeline_stage === "klant") || [];
    const gerealiseerdeOmzet = klantLeads.reduce((total, lead) => {
      const branche = (lead.branche || "").toLowerCase();
      return total + (BRANCHE_WAARDEN[branche] || BRANCHE_WAARDEN.default);
    }, 0);

    // === 3. ACTIVITEITEN IN PERIODE ===
    const { data: contactmomenten } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("id, type, richting, resultaat, created_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: true })
      .limit(2000);

    // Groepeer per week
    const activiteitenPerWeek: Record<string, { week: string; emails: number; telefoon: number; whatsapp: number; bezoek: number }> = {};
    contactmomenten?.forEach((c) => {
      const date = new Date(c.created_at);
      // Week key: maandag van de week
      const dayOfWeek = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekKey = monday.toISOString().split("T")[0];

      if (!activiteitenPerWeek[weekKey]) {
        activiteitenPerWeek[weekKey] = { week: weekKey, emails: 0, telefoon: 0, whatsapp: 0, bezoek: 0 };
      }

      const type = c.type as keyof typeof activiteitenPerWeek[string];
      if (type === "emails" || type === "telefoon" || type === "whatsapp" || type === "bezoek") {
        activiteitenPerWeek[weekKey][type]++;
      } else if (c.type === "email") {
        activiteitenPerWeek[weekKey].emails++;
      }
    });

    const activiteitenChart = Object.values(activiteitenPerWeek).sort((a, b) => a.week.localeCompare(b.week));

    // === 4. RESPONSE RATES ===
    const uitgaandEmails = contactmomenten?.filter((c) => c.type === "email" && c.richting === "uitgaand").length || 0;
    const inkomendReacties = contactmomenten?.filter((c) => c.richting === "inkomend").length || 0;
    const positieveReacties = contactmomenten?.filter((c) => c.resultaat === "positief").length || 0;

    // Response rate per branche
    const { data: leadsMetBranche } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, branche, pipeline_stage, emails_verzonden_count")
      .limit(2000);

    const brancheStats: Record<string, { benaderd: number; reactie: number; klant: number }> = {};
    leadsMetBranche?.forEach((lead) => {
      const branche = lead.branche || "onbekend";
      if (!brancheStats[branche]) brancheStats[branche] = { benaderd: 0, reactie: 0, klant: 0 };
      if (lead.emails_verzonden_count && lead.emails_verzonden_count > 0) brancheStats[branche].benaderd++;
      if (["interesse", "offerte", "klant"].includes(lead.pipeline_stage)) brancheStats[branche].reactie++;
      if (lead.pipeline_stage === "klant") brancheStats[branche].klant++;
    });

    // === 5. BEST PERFORMING ===
    // Top branches met hoogste conversie
    const topBranches = Object.entries(brancheStats)
      .map(([branche, stats]) => ({
        branche,
        ...stats,
        conversieRate: stats.benaderd > 0 ? Math.round((stats.klant / stats.benaderd) * 100) : 0,
        reactieRate: stats.benaderd > 0 ? Math.round((stats.reactie / stats.benaderd) * 100) : 0,
      }))
      .sort((a, b) => b.conversieRate - a.conversieRate)
      .slice(0, 5);

    // Top steden
    const stadStats: Record<string, { totaal: number; klant: number }> = {};
    allLeads?.forEach((lead) => {
      const stad = lead.stad || "onbekend";
      if (!stadStats[stad]) stadStats[stad] = { totaal: 0, klant: 0 };
      stadStats[stad].totaal++;
      if (lead.pipeline_stage === "klant") stadStats[stad].klant++;
    });

    const topSteden = Object.entries(stadStats)
      .map(([stad, stats]) => ({
        stad,
        ...stats,
        conversieRate: stats.totaal > 0 ? Math.round((stats.klant / stats.totaal) * 100) : 0,
      }))
      .sort((a, b) => b.totaal - a.totaal)
      .slice(0, 5);

    // Beste dag/tijd voor outreach
    const dagStats: Record<number, { dag: number; contacten: number; positief: number }> = {};
    const uurStats: Record<number, { uur: number; contacten: number; positief: number }> = {};
    contactmomenten?.forEach((c) => {
      if (c.richting !== "uitgaand") return;
      const date = new Date(c.created_at);
      const dag = date.getDay();
      const uur = date.getHours();

      if (!dagStats[dag]) dagStats[dag] = { dag, contacten: 0, positief: 0 };
      dagStats[dag].contacten++;
      if (c.resultaat === "positief") dagStats[dag].positief++;

      if (!uurStats[uur]) uurStats[uur] = { uur, contacten: 0, positief: 0 };
      uurStats[uur].contacten++;
      if (c.resultaat === "positief") uurStats[uur].positief++;
    });

    const dagNamen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    const besteDagen = Object.values(dagStats)
      .map((d) => ({ ...d, dagNaam: dagNamen[d.dag], successRate: d.contacten > 0 ? Math.round((d.positief / d.contacten) * 100) : 0 }))
      .sort((a, b) => b.successRate - a.successRate);

    const besteUren = Object.values(uurStats)
      .filter((u) => u.contacten >= 2)
      .map((u) => ({ ...u, successRate: u.contacten > 0 ? Math.round((u.positief / u.contacten) * 100) : 0 }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    // === 6. PIPELINE VELOCITY ===
    // Gemiddeld aantal dagen in elke stage (gebaseerd op leads die doorstroomden)
    // We berekenen dit op basis van alle leads met contactmomenten
    const { data: allContactmomenten } = await supabaseAdmin
      .from("acquisitie_contactmomenten")
      .select("lead_id, created_at")
      .order("created_at", { ascending: true })
      .limit(5000);

    // Per lead: eerste en laatste contactmoment als proxy voor stage duur
    const leadTimelines: Record<string, Date[]> = {};
    allContactmomenten?.forEach((c) => {
      if (!leadTimelines[c.lead_id]) leadTimelines[c.lead_id] = [];
      leadTimelines[c.lead_id].push(new Date(c.created_at));
    });

    // Gemiddelde totale doorlooptijd voor geconverteerde leads
    const geconverteerdeLeads = allLeads?.filter((l) => l.geconverteerd_op) || [];
    const doorlooptijden = geconverteerdeLeads.map((l) => {
      const start = new Date(l.created_at);
      const end = new Date(l.geconverteerd_op!);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    const gemDoorlooptijd = doorlooptijden.length > 0
      ? Math.round(doorlooptijden.reduce((a, b) => a + b, 0) / doorlooptijden.length)
      : 0;

    // Leads aangemaakt in periode
    const nieuwInPeriode = allLeads?.filter((l) => {
      const created = new Date(l.created_at);
      return created >= startDate && created <= endDate;
    }).length || 0;

    // === 7. CAMPAGNE STATS ===
    const { data: campagnes } = await supabaseAdmin
      .from("acquisitie_campagnes")
      .select("id, naam, status, emails_sent, emails_opened, emails_clicked, emails_replied")
      .order("created_at", { ascending: false })
      .limit(10);

    const campagneStats = campagnes?.map((c) => ({
      naam: c.naam,
      status: c.status,
      verzonden: c.emails_sent || 0,
      geopend: c.emails_opened || 0,
      geklikt: c.emails_clicked || 0,
      beantwoord: c.emails_replied || 0,
      openRate: c.emails_sent > 0 ? Math.round(((c.emails_opened || 0) / c.emails_sent) * 100) : 0,
      replyRate: c.emails_sent > 0 ? Math.round(((c.emails_replied || 0) / c.emails_sent) * 100) : 0,
    })) || [];

    // === RESPONSE ===
    return NextResponse.json({
      periode: { van: startISO, tot: endISO, type: periode },
      funnel: {
        stages: funnelData,
        conversions,
        totaalLeads: allLeads?.length || 0,
        afgewezen: funnelData.find((f) => f.stage === "afgewezen")?.count || 0,
      },
      revenue: {
        forecast: revenueForecast,
        gerealiseerd: gerealiseerdeOmzet,
        perBranche: revenuePerBranche,
        brancheWaarden: BRANCHE_WAARDEN,
        offertLeads: offertLeads.length,
        klantLeads: klantLeads.length,
      },
      activiteiten: {
        chart: activiteitenChart,
        totaal: contactmomenten?.length || 0,
        emails: contactmomenten?.filter((c) => c.type === "email").length || 0,
        telefoon: contactmomenten?.filter((c) => c.type === "telefoon").length || 0,
        whatsapp: contactmomenten?.filter((c) => c.type === "whatsapp").length || 0,
        bezoek: contactmomenten?.filter((c) => c.type === "bezoek").length || 0,
      },
      responseRates: {
        uitgaandEmails,
        inkomendReacties,
        positieveReacties,
        responseRate: uitgaandEmails > 0 ? Math.round((inkomendReacties / uitgaandEmails) * 100) : 0,
        positiefRate: uitgaandEmails > 0 ? Math.round((positieveReacties / uitgaandEmails) * 100) : 0,
      },
      bestPerforming: {
        topBranches,
        topSteden,
        besteDagen,
        besteUren,
      },
      velocity: {
        gemDoorlooptijdDagen: gemDoorlooptijd,
        geconverteerdeLeads: geconverteerdeLeads.length,
        nieuwInPeriode,
      },
      campagnes: campagneStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Dashboard data ophalen mislukt" }, { status: 500 });
  }
}
