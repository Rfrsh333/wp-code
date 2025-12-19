import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { signMedewerkerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const magicToken = request.nextUrl.searchParams.get("token");

  if (!magicToken) {
    return NextResponse.redirect(new URL("/medewerker/login?error=invalid", request.url));
  }

  const { data: medewerker, error } = await supabase
    .from("medewerkers")
    .select("id, naam, email, functie")
    .eq("magic_token", magicToken)
    .gt("magic_token_expires_at", new Date().toISOString())
    .single();

  if (error || !medewerker) {
    return NextResponse.redirect(new URL("/medewerker/login?error=expired", request.url));
  }

  const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await supabase
    .from("medewerkers")
    .update({
      magic_token: null,
      magic_token_expires_at: null,
      laatste_login: new Date().toISOString(),
    })
    .eq("id", medewerker.id);

  const sessionToken = await signMedewerkerSession({
    id: medewerker.id,
    naam: medewerker.naam,
    email: medewerker.email,
    functie: medewerker.functie,
  });

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("medewerker_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });

  return NextResponse.redirect(new URL("/medewerker/diensten", request.url));
}
