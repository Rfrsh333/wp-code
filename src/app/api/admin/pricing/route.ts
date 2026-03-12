import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllPricingOverview, invalidatePricingCache } from "@/lib/pricing/smart-pricing";

// GET /api/admin/pricing - Pricing overzicht + rules
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const overview = await getAllPricingOverview();

    // Haal marge data op (laatste 30 diensten)
    const { data: diensten } = await supabaseAdmin
      .from("diensten")
      .select("id, functie, datum, uurtarief, created_at")
      .order("datum", { ascending: false })
      .limit(100);

    return NextResponse.json({
      ...overview,
      recente_diensten: diensten || [],
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Admin pricing error:", error);
    return NextResponse.json({ error: "Fout bij ophalen pricing data" }, { status: 500 });
  }
}

// POST /api/admin/pricing - Rule toevoegen/updaten
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const { action, rule_id, ...ruleData } = body;

    if (action === "toggle") {
      const { data: current } = await supabaseAdmin
        .from("pricing_rules")
        .select("actief")
        .eq("id", rule_id)
        .single();

      if (!current) return NextResponse.json({ error: "Rule niet gevonden" }, { status: 404 });

      await supabaseAdmin
        .from("pricing_rules")
        .update({ actief: !current.actief })
        .eq("id", rule_id);

      invalidatePricingCache();
      return NextResponse.json({ success: true });
    }

    if (action === "create") {
      const { naam, type, conditie, waarde, prioriteit } = ruleData;
      if (!naam || !type || !conditie || waarde == null) {
        return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
      }

      await supabaseAdmin.from("pricing_rules").insert({
        naam,
        type,
        conditie,
        waarde: parseFloat(waarde),
        prioriteit: prioriteit || 0,
      });

      invalidatePricingCache();
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      if (!rule_id) return NextResponse.json({ error: "rule_id verplicht" }, { status: 400 });

      const updateData: Record<string, unknown> = {};
      if (ruleData.naam) updateData.naam = ruleData.naam;
      if (ruleData.waarde != null) updateData.waarde = parseFloat(ruleData.waarde);
      if (ruleData.conditie) updateData.conditie = ruleData.conditie;
      if (ruleData.prioriteit != null) updateData.prioriteit = ruleData.prioriteit;

      await supabaseAdmin.from("pricing_rules").update(updateData).eq("id", rule_id);

      invalidatePricingCache();
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      if (!rule_id) return NextResponse.json({ error: "rule_id verplicht" }, { status: 400 });
      await supabaseAdmin.from("pricing_rules").delete().eq("id", rule_id);
      invalidatePricingCache();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Admin pricing POST error:", error);
    return NextResponse.json({ error: "Fout bij updaten pricing" }, { status: 500 });
  }
}
