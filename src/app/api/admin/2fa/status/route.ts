import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/2fa/status
 * Check of 2FA enabled is voor deze admin
 */
export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);

  if (!isAdmin || !email) {
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { data: twoFactor } = await supabaseAdmin
      .from("admin_2fa")
      .select("enabled, enabled_at")
      .eq("email", email)
      .single();

    return NextResponse.json({
      enabled: twoFactor?.enabled || false,
      enabledAt: twoFactor?.enabled_at || null,
    });
  } catch (error) {
    console.error("2FA status check error:", error);
    return NextResponse.json(
      { enabled: false, enabledAt: null }
    );
  }
}
