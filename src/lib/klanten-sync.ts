import { supabaseAdmin } from "@/lib/supabase";

type DienstKlantInput = {
  klant_naam?: string | null;
  klant_email?: string | null;
  klant_telefoon?: string | null;
};

function normalizeString(value?: string | null) {
  return value?.trim() || null;
}

export async function ensureKlantForDienst(input: DienstKlantInput) {
  const bedrijfsnaam = normalizeString(input.klant_naam);
  const email = normalizeString(input.klant_email)?.toLowerCase() || null;

  if (!bedrijfsnaam) {
    return null;
  }

  const { data: existingKlant } = await supabaseAdmin
    .from("klanten")
    .select("id, email, status")
    .ilike("bedrijfsnaam", bedrijfsnaam)
    .limit(1)
    .maybeSingle();

  if (existingKlant) {
    const updates: Record<string, string> = {};

    if (email && !existingKlant.email) {
      updates.email = email;
    }

    if (existingKlant.status !== "actief") {
      updates.status = "actief";
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("klanten").update(updates).eq("id", existingKlant.id);
    }

    return existingKlant.id as string;
  }

  const insertData: Record<string, string> = {
    bedrijfsnaam,
    contactpersoon: bedrijfsnaam,
    status: "actief",
  };
  if (email) {
    insertData.email = email;
  }

  const { data: createdKlant, error } = await supabaseAdmin
    .from("klanten")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return createdKlant.id as string;
}

export async function syncDienstenKlantIds() {
  const { data: diensten, error } = await supabaseAdmin
    .from("diensten")
    .select("id, klant_id, klant_naam, klant_email, klant_telefoon")
    .is("klant_id", null)
    .not("klant_naam", "is", null);

  if (error || !diensten?.length) {
    return;
  }

  for (const dienst of diensten) {
    const klantId = await ensureKlantForDienst(dienst);
    if (!klantId) {
      continue;
    }

    await supabaseAdmin.from("diensten").update({ klant_id: klantId }).eq("id", dienst.id);
  }
}
