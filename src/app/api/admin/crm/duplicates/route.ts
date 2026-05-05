import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { findDuplicates } from "@/lib/duplicate-detection";

// POST: Find duplicates for a lead or set of fields
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lead_id, email, phone, website, google_maps_url, company_name, city, instagram_url, facebook_url } = body;

  // If lead_id is provided, fetch the lead first
  if (lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("crm_leads")
      .select("email, phone, website, google_maps_url, company_name, city, instagram_url, facebook_url")
      .eq("id", lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
    }

    const duplicates = await findDuplicates({
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      google_maps_url: lead.google_maps_url,
      company_name: lead.company_name,
      city: lead.city,
      instagram_url: lead.instagram_url,
      facebook_url: lead.facebook_url,
      excludeLeadId: lead_id,
    });

    return NextResponse.json({ duplicates });
  }

  // Otherwise use provided fields
  const duplicates = await findDuplicates({
    email,
    phone,
    website,
    google_maps_url,
    company_name,
    city,
    instagram_url,
    facebook_url,
  });

  return NextResponse.json({ duplicates });
}
