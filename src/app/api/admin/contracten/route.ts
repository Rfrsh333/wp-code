import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { contractenPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { createHash } from "crypto";

// Contract nummer generator: TT-2026-0001
async function generateContractNummer(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from("contracten")
    .select("id", { count: "exact", head: true })
    .like("contract_nummer", `TT-${year}-%`);

  const nummer = (count || 0) + 1;
  return `TT-${year}-${nummer.toString().padStart(4, "0")}`;
}

// Onderteken token generator
function generateOndertokenToken(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 32);
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized contracten access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const medewerker_id = request.nextUrl.searchParams.get("medewerker_id");
  const zoekterm = request.nextUrl.searchParams.get("zoekterm");

  let query = supabaseAdmin
    .from("contracten")
    .select(`
      id, contract_nummer, type, titel, status, startdatum, einddatum,
      verzonden_at, ondertekend_medewerker_at, ondertekend_admin_at,
      created_at, updated_at, aangemaakt_door, notities,
      medewerker:medewerkers(id, naam, voornaam, achternaam, email, telefoon),
      klant:klanten(id, bedrijfsnaam, contactpersoon),
      template:contract_templates(id, naam, type)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  }
  if (medewerker_id) {
    query = query.eq("medewerker_id", medewerker_id);
  }
  if (zoekterm) {
    // Sanitize LIKE wildcards and PostgREST special chars to prevent filter injection
    const sanitized = zoekterm.replace(/%/g, "").replace(/_/g, "").replace(/[(),."']/g, "");
    if (sanitized.length >= 2) {
      query = query.or(`titel.ilike.%${sanitized}%,contract_nummer.ilike.%${sanitized}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[CONTRACTEN] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized contracten mutation by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rawBody = await request.json();
    const validation = validateAdminBody(contractenPostSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { action } = rawBody;

    if (action === "create") {
      const { data: contractData } = rawBody;
      const contractNummer = await generateContractNummer();

      const payload = {
        ...contractData,
        contract_nummer: contractNummer,
        aangemaakt_door: email,
        status: "concept",
      };

      const { data, error } = await supabaseAdmin
        .from("contracten")
        .insert(payload)
        .select("id, contract_nummer")
        .single();

      if (error) {
        console.error("[CONTRACTEN] Insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Sla versie 1 op
      await supabaseAdmin.from("contract_versies").insert({
        contract_id: data.id,
        versie_nummer: 1,
        contract_data: contractData.contract_data || {},
        gewijzigd_door: email,
        wijziging_reden: "Contract aangemaakt",
      });

      return NextResponse.json({ data });
    }

    if (action === "update") {
      const { id, data: contractData } = rawBody;

      // Haal huidige versie op
      const { data: current } = await supabaseAdmin
        .from("contract_versies")
        .select("versie_nummer")
        .eq("contract_id", id)
        .order("versie_nummer", { ascending: false })
        .limit(1)
        .single();

      const { error } = await supabaseAdmin
        .from("contracten")
        .update(contractData)
        .eq("id", id);

      if (error) {
        console.error("[CONTRACTEN] Update error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Nieuwe versie opslaan als contract_data gewijzigd is
      if (contractData.contract_data) {
        await supabaseAdmin.from("contract_versies").insert({
          contract_id: id,
          versie_nummer: (current?.versie_nummer || 0) + 1,
          contract_data: contractData.contract_data,
          gewijzigd_door: email,
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
        return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
      }
      const { id } = rawBody;
      const { error } = await supabaseAdmin
        .from("contracten")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[CONTRACTEN] Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "verzend") {
      const { id } = rawBody;
      const token = generateOndertokenToken();
      const verlooptAt = new Date();
      verlooptAt.setDate(verlooptAt.getDate() + 7); // 7 dagen geldig

      const { error } = await supabaseAdmin
        .from("contracten")
        .update({
          status: "verzonden",
          onderteken_token: token,
          onderteken_token_verloopt_at: verlooptAt.toISOString(),
          verzonden_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("[CONTRACTEN] Verzend error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Haal contract + medewerker op voor email
      const { data: contract } = await supabaseAdmin
        .from("contracten")
        .select(`
          id, contract_nummer, titel, type,
          medewerker:medewerkers(naam, email)
        `)
        .eq("id", id)
        .single();

      const medewerker = Array.isArray(contract?.medewerker)
        ? contract?.medewerker[0]
        : contract?.medewerker;

      if (contract && medewerker?.email) {
        // Email verzenden via Resend
        try {
          const { sendEmail } = await import("@/lib/email-service");
          const { buildContractOndertekeningEmailHtml } = await import("@/lib/email-templates");

          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
          const ondertekeningUrl = `${baseUrl}/contract/ondertekenen/${token}`;

          await sendEmail({
            from: "TopTalent Jobs <info@toptalentjobs.nl>",
            to: [medewerker.email],
            subject: `Contract ter ondertekening: ${contract.titel}`,
            html: buildContractOndertekeningEmailHtml({
              medewerkerNaam: medewerker.naam,
              contractTitel: contract.titel,
              contractNummer: contract.contract_nummer,
              ondertekeningUrl,
            }),
          });
        } catch (emailErr) {
          console.error("[CONTRACTEN] Email send failed:", emailErr);
          // Niet fataal - contract is al verzonden
        }
      }

      return NextResponse.json({ success: true, token });
    }

    if (action === "teken_admin") {
      if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
        return NextResponse.json({ error: "Onvoldoende rechten voor ondertekening" }, { status: 403 });
      }
      const { id, handtekening_data, ondertekenaar_naam } = rawBody;

      // Hash de handtekening voor integriteit
      const hash = createHash("sha256").update(handtekening_data).digest("hex");

      // Sla ondertekening op
      const { error: signError } = await supabaseAdmin
        .from("contract_ondertekeningen")
        .insert({
          contract_id: id,
          ondertekenaar_type: "admin",
          ondertekenaar_naam: ondertekenaar_naam,
          ondertekenaar_email: email,
          handtekening_data: handtekening_data,
          handtekening_hash: hash,
        });

      if (signError) {
        console.error("[CONTRACTEN] Admin sign error:", signError);
        return NextResponse.json({ error: signError.message }, { status: 400 });
      }

      // Check of medewerker ook al getekend heeft
      const { data: medewerkerSign } = await supabaseAdmin
        .from("contract_ondertekeningen")
        .select("id")
        .eq("contract_id", id)
        .eq("ondertekenaar_type", "medewerker")
        .maybeSingle();

      const newStatus = medewerkerSign ? "actief" : "ondertekend_admin";

      await supabaseAdmin
        .from("contracten")
        .update({
          status: newStatus,
          ondertekend_admin_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({ success: true, status: newStatus });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[CONTRACTEN] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
