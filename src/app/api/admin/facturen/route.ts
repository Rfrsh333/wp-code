import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return !!user;
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: facturen }, { data: klanten }] = await Promise.all([
    supabaseAdmin.from("facturen").select("*, klant:klanten(bedrijfsnaam, email)").order("created_at", { ascending: false }),
    supabaseAdmin.from("klanten").select("id, bedrijfsnaam").eq("status", "actief"),
  ]);

  return NextResponse.json({ facturen, klanten });
}
