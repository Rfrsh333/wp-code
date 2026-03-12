import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MW-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("medewerker_session");
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const medewerker = await verifyMedewerkerSession(sessionCookie.value);
  if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Haal bestaande referral code op of maak nieuwe
  let { data: existing } = await supabaseAdmin
    .from("referrals")
    .select("referral_code")
    .eq("referrer_type", "medewerker")
    .eq("referrer_id", medewerker.id)
    .limit(1);

  let referralCode: string;
  if (existing && existing.length > 0) {
    referralCode = existing[0].referral_code;
  } else {
    referralCode = generateCode();
    await supabaseAdmin.from("referrals").insert({
      referrer_type: "medewerker",
      referrer_id: medewerker.id,
      referral_code: referralCode,
      status: "pending",
      reward_type: "bonus",
      reward_amount: 50,
    });
  }

  // Haal alle referrals op voor stats
  const { data: referrals } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .eq("referrer_type", "medewerker")
    .eq("referrer_id", medewerker.id)
    .order("created_at", { ascending: false });

  const allReferrals = referrals || [];
  const qualified = allReferrals.filter(r => r.status === "qualified" || r.status === "rewarded");
  const rewarded = allReferrals.filter(r => r.status === "rewarded");
  const totaalVerdiend = rewarded.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

  // Haal referred personen op (die daadwerkelijk ingeschreven zijn)
  const referred = allReferrals.filter(r => r.referred_naam);

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: `https://www.toptalentjobs.nl/inschrijven?ref=${referralCode}`,
    stats: {
      totaal_verwezen: referred.length,
      qualified: qualified.length,
      rewarded: rewarded.length,
      totaal_verdiend: totaalVerdiend,
    },
    referrals: referred.map(r => ({
      naam: r.referred_naam,
      status: r.status,
      reward_amount: r.reward_amount,
      created_at: r.created_at,
      qualified_at: r.qualified_at,
    })),
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
