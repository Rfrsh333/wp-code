import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { linkedinTemplateActionSchema, formatZodErrors } from "@/lib/validations";

// GET /api/admin/linkedin/templates — list templates
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const categorie = searchParams.get("categorie");
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabaseAdmin
      .from("linkedin_templates")
      .select("*")
      .order("categorie")
      .order("gebruik_count", { ascending: false });

    if (categorie) query = query.eq("categorie", categorie);
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by categorie
    const grouped: Record<string, typeof data> = {};
    for (const t of data || []) {
      if (!grouped[t.categorie]) grouped[t.categorie] = [];
      grouped[t.categorie].push(t);
    }

    return NextResponse.json({ templates: data || [], grouped });
  } catch (error) {
    console.error("[LinkedIn Templates] GET error:", error);
    return NextResponse.json({ error: "Fout bij ophalen" }, { status: 500 });
  }
}

// POST /api/admin/linkedin/templates — CRUD actions
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = linkedinTemplateActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;

    switch (data.action) {
      case "create": {
        const { action: _, ...templateData } = data;
        const { data: template, error } = await supabaseAdmin
          .from("linkedin_templates")
          .insert(templateData)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ template });
      }

      case "update": {
        const { action: _, id, ...updateData } = data;
        const { error } = await supabaseAdmin
          .from("linkedin_templates")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case "delete": {
        const { error } = await supabaseAdmin
          .from("linkedin_templates")
          .delete()
          .eq("id", data.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
    }
  } catch (error) {
    console.error("[LinkedIn Templates] POST error:", error);
    return NextResponse.json({ error: "Fout bij verwerken" }, { status: 500 });
  }
}
