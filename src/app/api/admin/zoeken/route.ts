import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized search access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() || "";

  if (q.length < 2) return NextResponse.json({ medewerkers: [], diensten: [], klanten: [] });

  if (q.length > 100) return NextResponse.json({ error: "Zoekopdracht te lang (max 100 tekens)" }, { status: 400 });

  // Sanitize LIKE wildcards
  const sanitizedQ = q.replace(/%/g, '').replace(/_/g, '');
  if (sanitizedQ.length < 2) return NextResponse.json({ medewerkers: [], diensten: [], klanten: [] });

  const [{ data: medewerkers }, { data: diensten }, { data: klanten }] = await Promise.all([
    supabaseAdmin.from("medewerkers").select("id, naam, email, telefoon, functie, status").or(`naam.ilike.%${sanitizedQ}%,email.ilike.%${sanitizedQ}%`).limit(5),
    supabaseAdmin.from("diensten").select("id, klant_naam, locatie, datum, functie, status").or(`klant_naam.ilike.%${sanitizedQ}%,locatie.ilike.%${sanitizedQ}%`).limit(5),
    supabaseAdmin.from("klanten").select("id, bedrijfsnaam, contactpersoon, email").or(`bedrijfsnaam.ilike.%${sanitizedQ}%,contactpersoon.ilike.%${sanitizedQ}%`).limit(5),
  ]);

  return NextResponse.json({ medewerkers: medewerkers || [], diensten: diensten || [], klanten: klanten || [] });
}
