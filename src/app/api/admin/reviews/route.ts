import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateReviewResponse } from "@/lib/agents/review-response";

// GET /api/admin/reviews - Alle reviews + stats
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from("google_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (reviewsError) {
      console.error("Reviews query error:", reviewsError);
      return NextResponse.json({ error: reviewsError.message }, { status: 500 });
    }

    const allReviews = reviews || [];
    const totaal = allReviews.length;
    const gemiddelde = totaal > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + (r.score || 0), 0) / totaal) * 10) / 10
      : 0;

    // Reviews deze maand vs vorige maand
    const nu = new Date();
    const dezeMaand = allReviews.filter(r => {
      const d = new Date(r.review_datum || r.created_at);
      return d.getMonth() === nu.getMonth() && d.getFullYear() === nu.getFullYear();
    });
    const vorigeMaand = allReviews.filter(r => {
      const d = new Date(r.review_datum || r.created_at);
      const vm = new Date(nu.getFullYear(), nu.getMonth() - 1);
      return d.getMonth() === vm.getMonth() && d.getFullYear() === vm.getFullYear();
    });

    const gemDezeMaand = dezeMaand.length > 0
      ? Math.round((dezeMaand.reduce((s, r) => s + (r.score || 0), 0) / dezeMaand.length) * 10) / 10
      : 0;
    const gemVorigeMaand = vorigeMaand.length > 0
      ? Math.round((vorigeMaand.reduce((s, r) => s + (r.score || 0), 0) / vorigeMaand.length) * 10) / 10
      : 0;

    // Review requests stats
    const { count: verzondenCount } = await supabaseAdmin
      .from("diensten")
      .select("id", { count: "exact", head: true })
      .eq("review_request_sent", true);

    return NextResponse.json({
      reviews: allReviews,
      stats: {
        totaal,
        gemiddelde,
        deze_maand: dezeMaand.length,
        gem_deze_maand: gemDezeMaand,
        gem_vorige_maand: gemVorigeMaand,
        trend: gemDezeMaand - gemVorigeMaand,
        review_requests_verzonden: verzondenCount || 0,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json({ error: "Fout bij ophalen reviews" }, { status: 500 });
  }
}

// POST /api/admin/reviews - Review toevoegen, AI antwoord genereren, antwoord opslaan
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add") {
      const { reviewer_naam, score, tekst, review_datum } = body;
      if (!reviewer_naam || !score) {
        return NextResponse.json({ error: "reviewer_naam en score zijn verplicht" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("google_reviews")
        .insert({
          reviewer_naam,
          score: parseInt(score),
          tekst: tekst || null,
          review_datum: review_datum || new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ review: data });
    }

    if (action === "generate_response") {
      const { review_id, reviewer_naam, score, tekst } = body;
      if (!tekst) {
        return NextResponse.json({ error: "Review tekst is nodig voor AI antwoord" }, { status: 400 });
      }

      const aiAntwoord = await generateReviewResponse({
        reviewerNaam: reviewer_naam || "Klant",
        score: parseInt(score),
        tekst,
      });

      // Sla AI antwoord op
      if (review_id) {
        await supabaseAdmin
          .from("google_reviews")
          .update({ ai_antwoord: aiAntwoord })
          .eq("id", review_id);
      }

      return NextResponse.json({ antwoord: aiAntwoord });
    }

    if (action === "save_response") {
      const { review_id, antwoord } = body;
      if (!review_id || !antwoord) {
        return NextResponse.json({ error: "review_id en antwoord zijn verplicht" }, { status: 400 });
      }

      await supabaseAdmin
        .from("google_reviews")
        .update({
          antwoord,
          antwoord_datum: new Date().toISOString().split("T")[0],
        })
        .eq("id", review_id);

      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const { review_id, reviewer_naam, score, tekst, review_datum } = body;
      if (!review_id) return NextResponse.json({ error: "review_id verplicht" }, { status: 400 });
      const updates: Record<string, unknown> = {};
      if (reviewer_naam !== undefined) updates.reviewer_naam = reviewer_naam;
      if (score !== undefined) updates.score = parseInt(score);
      if (tekst !== undefined) updates.tekst = tekst;
      if (review_datum !== undefined) updates.review_datum = review_datum;
      await supabaseAdmin.from("google_reviews").update(updates).eq("id", review_id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { review_id } = body;
      if (!review_id) return NextResponse.json({ error: "review_id verplicht" }, { status: 400 });
      await supabaseAdmin.from("google_reviews").delete().eq("id", review_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (error) {
    console.error("Reviews POST error:", error);
    return NextResponse.json({ error: "Fout bij verwerken" }, { status: 500 });
  }
}
