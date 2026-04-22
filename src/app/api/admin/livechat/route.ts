import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: conversations, error } = await supabaseAdmin
    .from("chatbot_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    captureRouteError(error, { route: "/api/admin/livechat", action: "GET" });
    // console.error("[LIVECHAT] Fetch error:", error);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations || [] });
}
