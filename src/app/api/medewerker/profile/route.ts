import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profiel } = await supabaseAdmin
      .from("medewerkers")
      .select("stad, geboortedatum, bsn_geverifieerd, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban, telefoon, badge, gemiddelde_score, aantal_beoordelingen, totaal_diensten, streak_count, profile_photo_path")
      .eq("id", medewerker.id)
      .single();

    // Calculate stats from dienst_aanmeldingen + uren_registraties
    const { count: totalDiensten } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("*", { count: "exact", head: true })
      .eq("medewerker_id", medewerker.id)
      .eq("status", "geaccepteerd");

    const { count: completedDiensten } = await supabaseAdmin
      .from("uren_registraties")
      .select("*", { count: "exact", head: true })
      .eq("medewerker_id", medewerker.id)
      .eq("status", "goedgekeurd");

    const opkomst = totalDiensten && totalDiensten > 0
      ? Math.round(((completedDiensten || 0) / totalDiensten) * 100)
      : 0;

    // Get average rating from beoordelingen
    const { data: beoordelingen } = await supabaseAdmin
      .from("beoordelingen")
      .select("score")
      .eq("medewerker_id", medewerker.id);

    const scores = beoordelingen?.map(b => b.score).filter(Boolean) || [];
    const avgRating = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Generate fresh signed URL if photo exists
    let profilePhotoUrl: string | null = null;
    if (profiel?.profile_photo_path) {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from("medewerker-photos")
        .createSignedUrl(profiel.profile_photo_path as string, 365 * 24 * 60 * 60);

      if (signedUrlData?.signedUrl) {
        profilePhotoUrl = signedUrlData.signedUrl;
      }
    }

    return NextResponse.json({
      profiel: profiel || {},
      stats: {
        opkomst_percentage: opkomst,
        op_tijd_percentage: opkomst > 0 ? Math.min(opkomst + 2, 100) : 0,
        rating: avgRating,
      },
      profile_photo_url: profilePhotoUrl,
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = ["stad", "geboortedatum", "factuur_adres", "factuur_postcode", "factuur_stad", "btw_nummer", "iban"];
    const updateData: Record<string, string | null> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field] || null;
      }
    }

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update(updateData)
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Alleen JPG en PNG bestanden zijn toegestaan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Bestand mag maximaal 5MB zijn" }, { status: 400 });
    }

    // Check for existing photo and remove it
    const { data: existing } = await supabaseAdmin
      .from("medewerkers")
      .select("profile_photo_path")
      .eq("id", medewerker.id)
      .single();

    if (existing?.profile_photo_path) {
      await supabaseAdmin.storage
        .from("medewerker-photos")
        .remove([existing.profile_photo_path]);
    }

    // Upload new photo
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filePath = `${medewerker.id}/profile.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("medewerker-photos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Upload mislukt: " + uploadError.message }, { status: 500 });
    }

    // Generate signed URL (expires in 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("medewerker-photos")
      .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year in seconds

    if (signedUrlError || !signedUrlData) {
      return NextResponse.json({ error: "Kon geen URL genereren" }, { status: 500 });
    }

    // Update medewerker record
    const { error: updateError } = await supabaseAdmin
      .from("medewerkers")
      .update({
        profile_photo_url: signedUrlData.signedUrl,
        profile_photo_path: filePath,
      })
      .eq("id", medewerker.id);

    if (updateError) {
      return NextResponse.json({ error: "Database update mislukt" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile_photo_url: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get current photo path
    const { data: existing } = await supabaseAdmin
      .from("medewerkers")
      .select("profile_photo_path")
      .eq("id", medewerker.id)
      .single();

    if (existing?.profile_photo_path) {
      await supabaseAdmin.storage
        .from("medewerker-photos")
        .remove([existing.profile_photo_path]);
    }

    // Clear fields
    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        profile_photo_url: null,
        profile_photo_path: null,
      })
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Database update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile photo delete error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
