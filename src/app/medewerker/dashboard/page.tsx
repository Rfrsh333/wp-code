import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedewerkerDashboard from "./MedewerkerDashboard";
import { verifyMedewerkerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export default async function MedewerkerDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");

  if (!session) {
    redirect("/medewerker/login");
  }

  const medewerker = await verifyMedewerkerSession(session.value);

  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token - forcing re-login");
    redirect("/medewerker/login");
  }

  // Fetch profile data from database
  const { data: profileData } = await supabaseAdmin
    .from("medewerkers")
    .select("telefoon, geboortedatum, stad, bsn_geverifieerd, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban")
    .eq("id", medewerker.id)
    .single();

  const medewerkerData = {
    ...medewerker,
    functie: Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie || ""],
    profile_photo_url: null, // Fresh signed URL will be fetched via API
    telefoon: profileData?.telefoon || null,
    geboortedatum: profileData?.geboortedatum || null,
    stad: profileData?.stad || null,
    bsn_geverifieerd: profileData?.bsn_geverifieerd || false,
    factuur_adres: profileData?.factuur_adres || null,
    factuur_postcode: profileData?.factuur_postcode || null,
    factuur_stad: profileData?.factuur_stad || null,
    btw_nummer: profileData?.btw_nummer || null,
    iban: profileData?.iban || null,
  };

  return <MedewerkerDashboard medewerker={medewerkerData} />;
}
