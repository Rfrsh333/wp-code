import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized contract-templates access by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type");

  let query = supabaseAdmin
    .from("contract_templates")
    .select("id, naam, slug, beschrijving, type, inhoud, versie, actief, created_at, updated_at")
    .eq("actief", true)
    .order("naam", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    captureRouteError(error, { route: "/api/admin/contract-templates", action: "GET" });
    // console.error("[CONTRACT-TEMPLATES] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
