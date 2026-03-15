import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "KL-";
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyKlantSession } = await import("@/lib/session");
  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Haal bestaande referral code op of maak nieuwe
  let { data: existing } = await supabaseAdmin
    .from("referrals")
    .select("referral_code")
    .eq("referrer_type", "klant")
    .eq("referrer_id", klant.id)
    .limit(1);

  let referralCode: string;
  if (existing && existing.length > 0) {
    referralCode = existing[0].referral_code;
  } else {
    referralCode = generateCode();
    await supabaseAdmin.from("referrals").insert({
      referrer_type: "klant",
      referrer_id: klant.id,
      referral_code: referralCode,
      status: "pending",
      reward_type: "korting",
      reward_amount: 100,
    });
  }

  // Haal alle referrals op
  const { data: referrals } = await supabaseAdmin
    .from("referrals")
    .select("id, referral_code, status, reward_amount, referred_naam, created_at")
    .eq("referrer_type", "klant")
    .eq("referrer_id", klant.id)
    .order("created_at", { ascending: false });

  const allReferrals = referrals || [];
  const referred = allReferrals.filter(r => r.referred_naam);
  const rewarded = allReferrals.filter(r => r.status === "rewarded");
  const totaalKorting = rewarded.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: `https://www.toptalentjobs.nl/personeel-aanvragen?ref=${referralCode}`,
    stats: {
      totaal_verwezen: referred.length,
      qualified: allReferrals.filter(r => r.status === "qualified" || r.status === "rewarded").length,
      totaal_korting: totaalKorting,
    },
    referrals: referred.map(r => ({
      naam: r.referred_naam,
      status: r.status,
      reward_amount: r.reward_amount,
      created_at: r.created_at,
    })),
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
