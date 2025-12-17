import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("medewerker_session");
  return NextResponse.redirect(new URL("/medewerker/login", process.env.NEXT_PUBLIC_SITE_URL || "https://toptalentjobs.nl"));
}
