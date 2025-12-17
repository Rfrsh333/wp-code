import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/medewerker/login?error=invalid", request.url));
  }

  const { data: medewerker, error } = await supabase
    .from("medewerkers")
    .select("id, naam, email, functie")
    .eq("magic_token", token)
    .gt("magic_token_expires_at", new Date().toISOString())
    .single();

  if (error || !medewerker) {
    return NextResponse.redirect(new URL("/medewerker/login?error=expired", request.url));
  }

  // Create session token
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabase
    .from("medewerkers")
    .update({
      magic_token: null,
      magic_token_expires_at: null,
      laatste_login: new Date().toISOString(),
    })
    .eq("id", medewerker.id);

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("medewerker_session", JSON.stringify({
    id: medewerker.id,
    naam: medewerker.naam,
    email: medewerker.email,
    functie: medewerker.functie,
    token: sessionToken,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });

  return NextResponse.redirect(new URL("/medewerker/diensten", request.url));
}
