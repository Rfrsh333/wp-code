import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { MetricsReport } from "@/lib/pdf/metrics-report";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized PDF export by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { metrics } = await request.json();

    if (!metrics) {
      return NextResponse.json({ error: "Metrics data vereist" }, { status: 400 });
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(MetricsReport({ metrics }));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="business-metrics-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "PDF generatie mislukt" }, { status: 500 });
  }
}
