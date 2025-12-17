import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email ontbreekt" }, { status: 400 });
    }

    // Check if medewerker exists and is active
    const { data: medewerker, error } = await supabase
      .from("medewerkers")
      .select("id, naam, status")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !medewerker) {
      return NextResponse.json({ error: "Email niet gevonden" }, { status: 404 });
    }

    if (medewerker.status !== "actief") {
      return NextResponse.json({ error: "Account is niet actief" }, { status: 403 });
    }

    // Generate magic token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await supabase
      .from("medewerkers")
      .update({ magic_token: token, magic_token_expires_at: expiresAt.toISOString() })
      .eq("id", medewerker.id);

    // Send email via Resend
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://toptalentjobs.nl"}/medewerker/verify?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "TopTalent Jobs <info@toptalentjobs.nl>",
        to: [email],
        subject: "Inloggen bij TopTalent Jobs",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #F27501; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">TopTalent Jobs</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Hoi ${medewerker.naam},</p>
              <p>Klik op de knop om in te loggen:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: #F27501; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Inloggen
                </a>
              </div>
              <p style="color: #666; font-size: 12px;">Link verloopt over 15 minuten.</p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
