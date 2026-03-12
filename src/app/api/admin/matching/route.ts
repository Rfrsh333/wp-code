import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { findMatchesForDienst, inviteMedewerkersForDienst } from "@/lib/matching";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized matching access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const dienstId = request.nextUrl.searchParams.get("dienst_id");
  if (!dienstId) {
    return NextResponse.json({ error: "dienst_id is vereist" }, { status: 400 });
  }

  try {
    const result = await findMatchesForDienst(dienstId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Matching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Matching mislukt" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized matching invite attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { dienst_id, medewerker_ids } = await request.json();

    if (!dienst_id || !Array.isArray(medewerker_ids) || medewerker_ids.length === 0) {
      return NextResponse.json(
        { error: "dienst_id en medewerker_ids[] zijn vereist" },
        { status: 400 }
      );
    }

    const result = await inviteMedewerkersForDienst(dienst_id, medewerker_ids);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Uitnodigen mislukt" }, { status: 500 });
  }
}
