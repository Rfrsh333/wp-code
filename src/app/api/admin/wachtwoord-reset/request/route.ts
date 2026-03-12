import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.toptalentjobs.nl";
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`admin-password-reset:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail is verplicht" }, { status: 400 });
    }

    if (isAdminEmail(email)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: "Server configuratie fout" }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.auth.resetPasswordForEmail(String(email).toLowerCase(), {
        redirectTo: `${getBaseUrl()}/admin/wachtwoord-reset`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Als dit e-mailadres bij een adminaccount hoort, is er een resetmail verstuurd.",
    });
  } catch (error) {
    console.error("Admin password reset request error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het versturen van de resetmail" }, { status: 500 });
  }
}
