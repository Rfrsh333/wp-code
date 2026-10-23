import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { PDF_URL_SECONDEN, UITBETALING_BUCKET } from "@/lib/uitbetaling/config";
import { GEEN_CACHE, uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";
import { isMigratieFout } from "@/lib/uitbetaling/db";

/** Zelffactuur-PDF voor de admin (owner/finance): kortlevende signed URL. → 200 { url } */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    const { data, error } = await supabaseAdmin
      .from("uitbetalingen")
      .select("pdf_pad, ronde:uitbetaalrondes!inner(status)")
      .eq("id", id)
      .neq("ronde.status", "concept")
      .maybeSingle();
    if (isMigratieFout(error)) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });
    if (error) throw error;
    if (!data?.pdf_pad) return NextResponse.json({ error: "Factuur niet gevonden" }, { status: 404 });

    const { data: signed, error: signFout } = await supabaseAdmin.storage
      .from(UITBETALING_BUCKET)
      .createSignedUrl(data.pdf_pad as string, PDF_URL_SECONDEN);
    if (signFout || !signed?.signedUrl) throw signFout ?? new Error("Geen signed URL");
    return NextResponse.json({ url: signed.signedUrl }, { headers: GEEN_CACHE });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen/facturen/[id]/pdf", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
