import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // Verify medewerker session
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Fetch all open shifts with company info
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select(`
        id,
        company_id,
        title,
        description,
        location,
        start_at,
        end_at,
        wage,
        seats,
        status,
        company:companies(name, logo_url)
      `)
      .eq("status", "open")
      .order("start_at", { ascending: true });

    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
      return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
    }

    // Fetch medewerker's applications
    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select(`
        id,
        shift_id,
        status,
        applied_at,
        shift:shifts(
          id,
          title,
          description,
          location,
          start_at,
          end_at,
          wage,
          seats,
          status,
          company:companies(name, logo_url)
        )
      `)
      .eq("candidate_id", medewerker.id)
      .order("applied_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    // Mark shifts that medewerker has already applied to
    const appliedShiftIds = new Set(applications?.map((app: any) => app.shift_id) || []);
    const shiftsWithStatus = (shifts || []).map((shift: any) => ({
      ...shift,
      has_applied: appliedShiftIds.has(shift.id),
      application_status: applications?.find((app: any) => app.shift_id === shift.id)?.status,
    }));

    return NextResponse.json({
      shifts: shiftsWithStatus,
      applications: applications || [],
    });
  } catch (error) {
    console.error("GET /api/medewerker/shifts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify medewerker session
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { action, shift_id, cover_text, application_id } = body;

    // Bescherming: voorkom wijzigingen aan gefactureerde records
    if (["uren_indienen", "accept_adjustment", "reject_adjustment"].includes(action)) {
      if (!shift_id && !application_id) {
        return NextResponse.json({ error: "shift_id of application_id is vereist" }, { status: 400 });
      }

      const lookupId = shift_id || application_id;
      const lookupColumn = shift_id ? "shift_id" : "id";

      const { data: record } = await supabase
        .from("applications")
        .select("id, status")
        .eq(lookupColumn, lookupId)
        .eq("candidate_id", medewerker.id)
        .single();

      if (record && record.status === "gefactureerd") {
        return NextResponse.json(
          { error: "Gefactureerde uren kunnen niet meer worden gewijzigd" },
          { status: 409 }
        );
      }
    }

    // Apply to shift
    if (action === "apply") {
      if (!shift_id || !cover_text) {
        return NextResponse.json(
          { error: "shift_id and cover_text are required" },
          { status: 400 }
        );
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("shift_id", shift_id)
        .eq("candidate_id", medewerker.id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Je hebt al gesolliciteerd op deze shift" },
          { status: 400 }
        );
      }

      // Create application
      const { data: application, error: createError } = await supabase
        .from("applications")
        .insert({
          shift_id,
          candidate_id: medewerker.id,
          cover_text,
          status: "pending",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating application:", createError);
        return NextResponse.json(
          { error: "Sollicitatie mislukt. Probeer het opnieuw." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, application });
    }

    // Withdraw application
    if (action === "withdraw") {
      if (!application_id) {
        return NextResponse.json({ error: "application_id is required" }, { status: 400 });
      }

      // Verify ownership
      const { data: app } = await supabase
        .from("applications")
        .select("candidate_id, status")
        .eq("id", application_id)
        .single();

      if (!app || app.candidate_id !== medewerker.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      if (app.status !== "pending") {
        return NextResponse.json(
          { error: "Alleen openstaande sollicitaties kunnen worden ingetrokken" },
          { status: 400 }
        );
      }

      // Delete application
      const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .eq("id", application_id);

      if (deleteError) {
        console.error("Error withdrawing application:", deleteError);
        return NextResponse.json({ error: "Intrekken mislukt" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/medewerker/shifts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
