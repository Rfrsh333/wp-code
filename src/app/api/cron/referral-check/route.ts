import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CRON] Referral check gestart");

  // Haal pending referrals op die een referred persoon hebben
  const { data: pendingReferrals } = await supabaseAdmin
    .from("referrals")
    .select("id, referrer_type, referred_id, referred_email, referred_naam")
    .eq("status", "pending")
    .not("referred_id", "is", null);

  if (!pendingReferrals || pendingReferrals.length === 0) {
    return NextResponse.json({ message: "Geen pending referrals", qualified: 0 });
  }

  let qualified = 0;

  for (const referral of pendingReferrals) {
    let isQualified = false;

    if (referral.referrer_type === "medewerker") {
      // Medewerker referral: check of referred persoon eerste dienst heeft voltooid
      // Zoek medewerker via email
      const { data: medewerker } = await supabaseAdmin
        .from("medewerkers")
        .select("id")
        .eq("email", referral.referred_email)
        .limit(1)
        .single();

      if (medewerker) {
        // Check of ze minstens 1 goedgekeurde uren registratie hebben
        const { count } = await supabaseAdmin
          .from("uren_registraties")
          .select("id", { count: "exact", head: true })
          .eq("medewerker_id", medewerker.id)
          .eq("status", "goedgekeurd");

        if (count && count > 0) isQualified = true;
      }
    } else if (referral.referrer_type === "klant") {
      // Klant referral: check of referred klant eerste dienst heeft geboekt
      // Zoek klant via email
      const { data: klant } = await supabaseAdmin
        .from("klanten")
        .select("id")
        .eq("email", referral.referred_email)
        .limit(1)
        .single();

      if (klant) {
        const { count } = await supabaseAdmin
          .from("diensten")
          .select("id", { count: "exact", head: true })
          .eq("klant_id", klant.id);

        if (count && count > 0) isQualified = true;
      }
    }

    if (isQualified) {
      await supabaseAdmin
        .from("referrals")
        .update({ status: "qualified", qualified_at: new Date().toISOString() })
        .eq("id", referral.id);

      qualified++;
      console.log(`[CRON] Referral ${referral.id} gekwalificeerd: ${referral.referred_naam}`);
    }
  }

  console.log(`[CRON] Referral check voltooid: ${qualified} gekwalificeerd`);

  return NextResponse.json({ success: true, qualified, checked: pendingReferrals.length });
}
