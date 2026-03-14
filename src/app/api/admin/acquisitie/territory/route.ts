import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized territory access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  // Lijst van sales reps met stats
  if (view === "reps" || !view) {
    const { data: reps, error } = await supabaseAdmin
      .from("acquisitie_sales_reps")
      .select("id, naam, email, telefoon, regios, branches, max_leads, kleur, actief, actieve_leads_count, gewonnen_leads_count, conversie_rate")
      .order("naam");

    if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });

    // Herbereken actieve leads per rep
    for (const rep of reps || []) {
      const { count } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id)
        .not("pipeline_stage", "in", '("klant","afgewezen")');

      const { count: gewonnen } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id)
        .eq("pipeline_stage", "klant");

      const { count: totaalAssigned } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id);

      rep.actieve_leads_count = count || 0;
      rep.gewonnen_leads_count = gewonnen || 0;
      rep.conversie_rate = (totaalAssigned || 0) > 0
        ? Math.round(((gewonnen || 0) / (totaalAssigned || 1)) * 100)
        : 0;

      // Update in DB
      await supabaseAdmin
        .from("acquisitie_sales_reps")
        .update({
          actieve_leads_count: rep.actieve_leads_count,
          gewonnen_leads_count: rep.gewonnen_leads_count,
          conversie_rate: rep.conversie_rate,
        })
        .eq("id", rep.id);
    }

    return NextResponse.json({ data: reps });
  }

  // Leads per rep (voor kaart/route planning)
  if (view === "rep_leads") {
    const repId = searchParams.get("rep_id");
    if (!repId) return NextResponse.json({ error: "rep_id vereist" }, { status: 400 });

    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, contactpersoon, adres, stad, telefoon, pipeline_stage, ai_score, volgende_actie_datum")
      .eq("assigned_to", repId)
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .order("ai_score", { ascending: false, nullsFirst: false });

    return NextResponse.json({ data: leads });
  }

  // Ongeassignde leads
  if (view === "unassigned") {
    const { data: leads } = await supabaseAdmin
      .from("acquisitie_leads")
      .select("id, bedrijfsnaam, stad, branche, ai_score, pipeline_stage")
      .is("assigned_to", null)
      .not("pipeline_stage", "in", '("klant","afgewezen")')
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(100);

    return NextResponse.json({ data: leads });
  }

  return NextResponse.json({ error: "Onbekende view" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized territory write by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // CRUD sales rep
    if (action === "create_rep") {
      const { naam, email: repEmail, telefoon, regios, branches, max_leads, kleur } = body;
      if (!naam) return NextResponse.json({ error: "Naam is vereist" }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from("acquisitie_sales_reps")
        .insert({ naam, email: repEmail, telefoon, regios: regios || [], branches: branches || [], max_leads: max_leads || 50, kleur: kleur || "#F27501" })
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    if (action === "update_rep") {
      const { id, ...updateData } = body;
      if (!id) return NextResponse.json({ error: "id is vereist" }, { status: 400 });
      delete updateData.action;

      const { error } = await supabaseAdmin
        .from("acquisitie_sales_reps")
        .update(updateData)
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_rep") {
      const { id } = body;
      // Unassign alle leads eerst
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ assigned_to: null })
        .eq("assigned_to", id);

      const { error } = await supabaseAdmin
        .from("acquisitie_sales_reps")
        .delete()
        .eq("id", id);

      if (error) return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Handmatig toewijzen
    if (action === "assign") {
      const { lead_id, rep_id } = body;
      if (!lead_id) return NextResponse.json({ error: "lead_id vereist" }, { status: 400 });

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ assigned_to: rep_id || null })
        .eq("id", lead_id);

      return NextResponse.json({ success: true });
    }

    // Bulk assign
    if (action === "bulk_assign") {
      const { lead_ids, rep_id } = body;
      if (!lead_ids?.length) return NextResponse.json({ error: "lead_ids vereist" }, { status: 400 });

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ assigned_to: rep_id || null })
        .in("id", lead_ids);

      return NextResponse.json({ success: true, count: lead_ids.length });
    }

    // Auto-assign: verdeel ongeassignde leads over reps
    if (action === "auto_assign") {
      const { data: reps } = await supabaseAdmin
        .from("acquisitie_sales_reps")
        .select("id, regios, branches, conversie_rate, max_leads")
        .eq("actief", true)
        .order("conversie_rate", { ascending: false });

      if (!reps?.length) {
        return NextResponse.json({ error: "Geen actieve sales reps" }, { status: 400 });
      }

      const { data: unassigned } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, stad, branche, ai_score")
        .is("assigned_to", null)
        .not("pipeline_stage", "in", '("klant","afgewezen")')
        .order("ai_score", { ascending: false, nullsFirst: false });

      if (!unassigned?.length) {
        return NextResponse.json({ success: true, assigned: 0, message: "Geen ongeassignde leads" });
      }

      // Herbereken beschikbare capaciteit per rep
      const repCapacity = new Map<string, number>();
      for (const rep of reps) {
        const { count } = await supabaseAdmin
          .from("acquisitie_leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", rep.id)
          .not("pipeline_stage", "in", '("klant","afgewezen")');

        repCapacity.set(rep.id, (rep.max_leads || 50) - (count || 0));
      }

      let assignedCount = 0;

      for (const lead of unassigned) {
        // Score elke rep voor deze lead
        let bestRep: string | null = null;
        let bestScore = -1;

        for (const rep of reps) {
          const capacity = repCapacity.get(rep.id) || 0;
          if (capacity <= 0) continue;

          let score = 0;

          // Regio match: +40 punten
          const leadStad = (lead.stad || "").toLowerCase();
          if (rep.regios?.some((r: string) => leadStad.includes(r.toLowerCase()))) {
            score += 40;
          }

          // Branche match: +30 punten
          const leadBranche = (lead.branche || "").toLowerCase();
          if (rep.branches?.some((b: string) => leadBranche.includes(b.toLowerCase()))) {
            score += 30;
          }

          // Conversie rate bonus: hogere conversie = betere leads
          if (lead.ai_score && lead.ai_score > 70) {
            score += (rep.conversie_rate || 0) * 0.5; // Beste reps krijgen beste leads
          }

          // Capaciteit bonus: reps met meer ruimte krijgen voorkeur
          score += Math.min(capacity, 20);

          if (score > bestScore) {
            bestScore = score;
            bestRep = rep.id;
          }
        }

        // Als geen match op regio/branche, verdeel round-robin op capaciteit
        if (!bestRep) {
          const sortedByCapacity = reps
            .filter((r) => (repCapacity.get(r.id) || 0) > 0)
            .sort((a, b) => (repCapacity.get(b.id) || 0) - (repCapacity.get(a.id) || 0));

          if (sortedByCapacity.length > 0) {
            bestRep = sortedByCapacity[0].id;
          }
        }

        if (bestRep) {
          await supabaseAdmin
            .from("acquisitie_leads")
            .update({ assigned_to: bestRep })
            .eq("id", lead.id);

          repCapacity.set(bestRep, (repCapacity.get(bestRep) || 0) - 1);
          assignedCount++;
        }
      }

      return NextResponse.json({ success: true, assigned: assignedCount, total: unassigned.length });
    }

    // Route optimalisatie: sorteer adressen voor bezoekroute
    if (action === "optimize_route") {
      const { lead_ids } = body;
      if (!lead_ids?.length) return NextResponse.json({ error: "lead_ids vereist" }, { status: 400 });

      const { data: leads } = await supabaseAdmin
        .from("acquisitie_leads")
        .select("id, bedrijfsnaam, adres, stad, contactpersoon, telefoon, pipeline_stage")
        .in("id", lead_ids);

      if (!leads?.length) return NextResponse.json({ error: "Geen leads gevonden" }, { status: 404 });

      // Sorteer op stad (simpele clustering) als Google Maps API niet beschikbaar
      const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

      if (googleMapsKey && leads.length >= 2) {
        // Gebruik Google Maps Distance Matrix voor optimale volgorde
        try {
          const addresses = leads
            .map((l) => `${l.adres || ""}, ${l.stad || ""}`.trim())
            .filter((a) => a.length > 2);

          if (addresses.length >= 2) {
            const origins = addresses.join("|");
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(origins)}&key=${googleMapsKey}&language=nl`;

            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();

              // Nearest-neighbor route optimalisatie
              const n = leads.length;
              const visited = new Set<number>();
              const route: number[] = [0];
              visited.add(0);

              for (let step = 1; step < n; step++) {
                const current = route[route.length - 1];
                let nearestIdx = -1;
                let nearestDist = Infinity;

                for (let j = 0; j < n; j++) {
                  if (visited.has(j)) continue;
                  const element = data.rows?.[current]?.elements?.[j];
                  const dist = element?.distance?.value || Infinity;
                  if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = j;
                  }
                }

                if (nearestIdx >= 0) {
                  route.push(nearestIdx);
                  visited.add(nearestIdx);
                }
              }

              const optimized = route.map((idx) => ({
                ...leads[idx],
                adres_volledig: addresses[idx] || "",
              }));

              // Google Maps route URL
              const waypoints = optimized.map((l) => l.adres_volledig).filter(Boolean);
              const mapsUrl = waypoints.length >= 2
                ? `https://www.google.com/maps/dir/${waypoints.map((w) => encodeURIComponent(w)).join("/")}`
                : null;

              return NextResponse.json({
                data: optimized,
                maps_url: mapsUrl,
                optimized: true,
              });
            }
          }
        } catch (err) {
          console.error("Route optimization error:", err);
        }
      }

      // Fallback: sorteer op stad + straat
      const sorted = leads.sort((a, b) => {
        const stadA = (a.stad || "").toLowerCase();
        const stadB = (b.stad || "").toLowerCase();
        if (stadA !== stadB) return stadA.localeCompare(stadB);
        return (a.adres || "").localeCompare(b.adres || "");
      });

      const waypoints = sorted
        .map((l) => `${l.adres || ""}, ${l.stad || ""}`.trim())
        .filter((a) => a.length > 2);

      const mapsUrl = waypoints.length >= 2
        ? `https://www.google.com/maps/dir/${waypoints.map((w) => encodeURIComponent(w)).join("/")}`
        : null;

      return NextResponse.json({
        data: sorted,
        maps_url: mapsUrl,
        optimized: false,
        message: googleMapsKey ? undefined : "Route gesorteerd op stad (Google Maps API niet geconfigureerd voor optimalisatie)",
      });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Territory error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
