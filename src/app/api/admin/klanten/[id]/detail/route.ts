import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Klant basis data
  const { data: klant, error } = await supabaseAdmin
    .from("klanten")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !klant) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  // Alle diensten van deze klant (afgelopen 12 maanden)
  const eenJaarGeleden = new Date();
  eenJaarGeleden.setFullYear(eenJaarGeleden.getFullYear() - 1);

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, functie, locatie, start_tijd, eind_tijd, aantal_nodig, status")
    .eq("klant_id", id)
    .gte("datum", eenJaarGeleden.toISOString().split("T")[0])
    .order("datum", { ascending: false })
    .limit(200);

  // Groepeer per maand voor grafiek
  const maandData: Record<string, { aantal: number; functies: Record<string, number> }> = {};

  // Initialiseer alle 12 maanden
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    maandData[key] = { aantal: 0, functies: {} };
  }

  (diensten || []).forEach(d => {
    const maand = d.datum?.substring(0, 7);
    if (maand && maandData[maand]) {
      maandData[maand].aantal += 1;
      const functie = d.functie || "overig";
      maandData[maand].functies[functie] = (maandData[maand].functies[functie] || 0) + 1;
    }
  });

  const maandGrafiek = Object.entries(maandData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([maand, data]) => ({
      maand,
      aantal: data.aantal,
      functies: data.functies,
    }));

  // Seizoenspatroon: vergelijk met vorig jaar
  const nu = new Date();
  const huidigeMaand = nu.getMonth() + 1;
  const huidigeMaandKey = `${nu.getFullYear()}-${String(huidigeMaand).padStart(2, "0")}`;
  const vorigJaarKey = `${nu.getFullYear() - 1}-${String(huidigeMaand).padStart(2, "0")}`;

  // Haal vorig jaar data op voor seizoenspatroon
  const { data: vorigJaarDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, functie")
    .eq("klant_id", id)
    .gte("datum", `${nu.getFullYear() - 1}-${String(huidigeMaand).padStart(2, "0")}-01`)
    .lt("datum", `${nu.getFullYear() - 1}-${String(huidigeMaand + 1).padStart(2, "0")}-01`);

  const dezeMaandAantal = maandData[huidigeMaandKey]?.aantal || 0;
  const vorigJaarAantal = vorigJaarDiensten?.length || 0;

  // Forecast: gemiddelde van afgelopen 3 maanden + seizoenscorrectie
  const laatste3 = maandGrafiek.slice(-3);
  const gem3Maanden = laatste3.reduce((sum, m) => sum + m.aantal, 0) / 3;

  // Tel functies over laatste 3 maanden voor forecast
  const functieTelling: Record<string, number> = {};
  laatste3.forEach(m => {
    Object.entries(m.functies).forEach(([f, n]) => {
      functieTelling[f] = (functieTelling[f] || 0) + n;
    });
  });
  const forecastFuncties = Object.entries(functieTelling)
    .map(([functie, totaal]) => ({ functie, verwacht: Math.round(totaal / 3) }))
    .sort((a, b) => b.verwacht - a.verwacht);

  // Beoordelingen die deze klant heeft gegeven
  const { data: beoordelingen } = await supabaseAdmin
    .from("beoordelingen")
    .select("score, opmerking, created_at, medewerker_id")
    .eq("klant_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    klant,
    diensten: diensten || [],
    maandGrafiek,
    seizoen: {
      huidige_maand: dezeMaandAantal,
      vorig_jaar_zelfde_maand: vorigJaarAantal,
      verschil_percentage: vorigJaarAantal > 0
        ? Math.round(((dezeMaandAantal - vorigJaarAantal) / vorigJaarAantal) * 100)
        : null,
    },
    forecast: {
      verwacht_komende_maand: Math.round(gem3Maanden),
      per_functie: forecastFuncties,
    },
    beoordelingen: beoordelingen || [],
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
