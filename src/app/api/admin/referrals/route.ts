import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Haal alle referrals op met referred data
  const { data: referrals } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const all = referrals || [];
  const withReferred = all.filter(r => r.referred_naam);
  const pending = withReferred.filter(r => r.status === "pending");
  const qualified = withReferred.filter(r => r.status === "qualified");
  const rewarded = withReferred.filter(r => r.status === "rewarded");
  const totaalUitbetaald = rewarded.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

  // Conversie rate
  const conversieRate = all.length > 0 ? Math.round((withReferred.length / all.length) * 100) : 0;

  // Top referrers - groepeer per referrer
  const referrerMap = new Map<string, { type: string; id: string; count: number; qualified: number; rewarded: number }>();
  for (const r of withReferred) {
    const key = `${r.referrer_type}-${r.referrer_id}`;
    const existing = referrerMap.get(key) || { type: r.referrer_type, id: r.referrer_id, count: 0, qualified: 0, rewarded: 0 };
    existing.count++;
    if (r.status === "qualified" || r.status === "rewarded") existing.qualified++;
    if (r.status === "rewarded") existing.rewarded++;
    referrerMap.set(key, existing);
  }

  // Haal namen op voor top referrers
  const topReferrers = Array.from(referrerMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const medewerkerIds = topReferrers.filter(r => r.type === "medewerker").map(r => r.id);
  const klantIds = topReferrers.filter(r => r.type === "klant").map(r => r.id);

  const { data: medewerkers } = medewerkerIds.length > 0
    ? await supabaseAdmin.from("medewerkers").select("id, naam").in("id", medewerkerIds)
    : { data: [] };

  const { data: klanten } = klantIds.length > 0
    ? await supabaseAdmin.from("klanten").select("id, bedrijfsnaam").in("id", klantIds)
    : { data: [] };

  const naamMap = new Map<string, string>();
  (medewerkers || []).forEach(m => naamMap.set(m.id, m.naam));
  (klanten || []).forEach(k => naamMap.set(k.id, k.bedrijfsnaam));

  return NextResponse.json({
    stats: {
      totaal_referrals: withReferred.length,
      pending: pending.length,
      qualified: qualified.length,
      rewarded: rewarded.length,
      totaal_uitbetaald: totaalUitbetaald,
      conversie_rate: conversieRate,
    },
    top_referrers: topReferrers.map(r => ({
      naam: naamMap.get(r.id) || "Onbekend",
      type: r.type,
      count: r.count,
      qualified: r.qualified,
    })),
    recente_referrals: withReferred.slice(0, 20).map(r => ({
      id: r.id,
      referrer_type: r.referrer_type,
      referred_naam: r.referred_naam,
      referred_email: r.referred_email,
      status: r.status,
      reward_amount: r.reward_amount,
      reward_type: r.reward_type,
      created_at: r.created_at,
      qualified_at: r.qualified_at,
    })),
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, referral_id } = await request.json();

  if (action === "mark_rewarded") {
    const { error } = await supabaseAdmin
      .from("referrals")
      .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
      .eq("id", referral_id);

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
