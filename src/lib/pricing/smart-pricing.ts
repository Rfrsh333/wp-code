import { supabaseAdmin } from "@/lib/supabase";

// Basistarieven per functie (uitzend tarieven voor klanten)
const BASIS_TARIEVEN: Record<string, number> = {
  bediening: 27.0,
  bar: 27.0,
  keuken: 28.0,
  afwas: 25.0,
  gastheer: 27.5,
  runner: 25.5,
};

interface PricingRule {
  id: string;
  naam: string;
  type: string;
  conditie: Record<string, unknown>;
  waarde: number;
  actief: boolean;
  prioriteit: number;
}

interface PricingInput {
  functie: string;
  datum: string; // ISO date string
  urenPerWeek?: number;
  loyaltyTier?: string;
  isLastMinute?: boolean;
}

interface PricingResult {
  basistarieven: number;
  eindtarief: number;
  toegepaste_rules: { naam: string; waarde: number; effect: string }[];
  bespaar_suggestie?: string;
}

// Nederlandse feestdagen (vaste data)
function isFeestdag(date: Date): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // Nieuwjaarsdag, Koningsdag, Bevrijdingsdag, Kerst
  return (
    (m === 1 && d === 1) ||
    (m === 4 && d === 27) ||
    (m === 5 && d === 5) ||
    (m === 12 && d === 25) ||
    (m === 12 && d === 26)
  );
}

function dagNaam(date: Date): string {
  const dagen = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  return dagen[date.getDay()];
}

function matchesConditie(rule: PricingRule, input: PricingInput, date: Date): boolean {
  const c = rule.conditie;

  // Dag check
  if (c.dag && Array.isArray(c.dag)) {
    if (!c.dag.includes(dagNaam(date))) return false;
  }

  // Feestdag check
  if (c.feestdag === true) {
    if (!isFeestdag(date)) return false;
  }

  // Last-minute check
  if (c.last_minute === true) {
    if (!input.isLastMinute) return false;
  }

  // Maand check (piekmaanden)
  if (c.maand && Array.isArray(c.maand)) {
    if (!c.maand.includes(date.getMonth() + 1)) return false;
  }

  // Volume check
  if (typeof c.min_uren_week === "number") {
    if (!input.urenPerWeek || input.urenPerWeek < (c.min_uren_week as number)) return false;
  }

  // Loyalty tier check
  if (c.loyalty_tier) {
    if (!input.loyaltyTier || input.loyaltyTier !== c.loyalty_tier) return false;
  }

  // Functie check
  if (c.functie && Array.isArray(c.functie)) {
    if (!c.functie.includes(input.functie.toLowerCase())) return false;
  }

  return true;
}

let cachedRules: PricingRule[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getRules(): Promise<PricingRule[]> {
  if (cachedRules && Date.now() - cacheTime < CACHE_TTL) return cachedRules;

  const { data } = await supabaseAdmin
    .from("pricing_rules")
    .select("*")
    .eq("actief", true)
    .order("prioriteit", { ascending: true });

  cachedRules = (data as PricingRule[]) || [];
  cacheTime = Date.now();
  return cachedRules;
}

export async function calculatePrice(input: PricingInput): Promise<PricingResult> {
  const functie = input.functie.toLowerCase();
  const basistarieven = BASIS_TARIEVEN[functie] || BASIS_TARIEVEN.bediening;
  const date = new Date(input.datum);
  const rules = await getRules();

  let multiplier = 1.0;
  const toegepaste_rules: { naam: string; waarde: number; effect: string }[] = [];

  for (const rule of rules) {
    if (matchesConditie(rule, input, date)) {
      multiplier *= rule.waarde;
      const pct = Math.round((rule.waarde - 1) * 100);
      toegepaste_rules.push({
        naam: rule.naam,
        waarde: rule.waarde,
        effect: pct >= 0 ? `+${pct}%` : `${pct}%`,
      });
    }
  }

  const eindtarief = Math.round(basistarieven * multiplier * 100) / 100;

  // Bespaar suggestie genereren
  let bespaar_suggestie: string | undefined;
  const dag = date.getDay();
  if (dag === 0 || dag === 6) {
    bespaar_suggestie = "Boek op een doordeweekse dag en bespaar tot 10% op het uurtarief";
  } else if (!input.urenPerWeek || input.urenPerWeek < 20) {
    bespaar_suggestie = "Bij meer dan 20 uur per week krijgt u 5% volume korting";
  }

  return { basistarieven, eindtarief, toegepaste_rules, bespaar_suggestie };
}

export async function getAllPricingOverview(): Promise<{
  rules: PricingRule[];
  tarieven: { functie: string; basis: number; weekend: number; feestdag: number; piek: number }[];
}> {
  const rules = await getRules();

  // Bereken tarieven per functie met de standaard multipliers
  const weekendRule = rules.find(r => r.conditie.dag && (r.conditie.dag as string[]).includes("za"));
  const feestdagRule = rules.find(r => r.conditie.feestdag === true);
  const piekRule = rules.find(r => r.conditie.maand);

  const weekendMult = weekendRule?.waarde || 1.10;
  const feestdagMult = feestdagRule?.waarde || 1.25;
  const piekMult = piekRule?.waarde || 1.10;

  const tarieven = Object.entries(BASIS_TARIEVEN).map(([functie, basis]) => ({
    functie,
    basis,
    weekend: Math.round(basis * weekendMult * 100) / 100,
    feestdag: Math.round(basis * feestdagMult * 100) / 100,
    piek: Math.round(basis * piekMult * 100) / 100,
  }));

  return { rules, tarieven };
}

export function invalidatePricingCache() {
  cachedRules = null;
  cacheTime = 0;
}
