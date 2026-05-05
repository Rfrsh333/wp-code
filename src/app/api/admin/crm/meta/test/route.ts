import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateMetaConfig, metaGraphGet, getMetaConfig } from "@/lib/meta";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configStatus = validateMetaConfig();

  // Check if minimum required fields are present for a test
  if (!configStatus.hasPageId || !configStatus.hasPageAccessToken) {
    return NextResponse.json({
      ok: false,
      error: "META_PAGE_ID en META_PAGE_ACCESS_TOKEN zijn vereist voor de test",
      config: configStatus,
    });
  }

  const config = getMetaConfig();

  try {
    // Test: fetch page info with instagram_business_account
    const pageData = await metaGraphGet<{
      id: string;
      name: string;
      instagram_business_account?: { id: string };
    }>(config.pageId!, { fields: "id,name,instagram_business_account" });

    return NextResponse.json({
      ok: true,
      page: {
        id: pageData.id,
        name: pageData.name,
        instagram_business_account: pageData.instagram_business_account || null,
      },
      config: configStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij Meta API test";
    return NextResponse.json({
      ok: false,
      error: message,
      config: configStatus,
    });
  }
}
