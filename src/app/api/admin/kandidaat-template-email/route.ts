import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import {
  sendCandidateTemplateEmail,
  logEmail,
} from "@/lib/candidate-onboarding";
import {
  adminCandidateEmailTemplates,
  type AdminCandidateTemplateKey,
} from "@/content/adminCandidateEmailTemplates";

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { kandidaatId, templateKey } = body as {
    kandidaatId?: string;
    templateKey?: AdminCandidateTemplateKey;
  };

  if (!kandidaatId || !templateKey) {
    return NextResponse.json({ error: "kandidaatId en templateKey zijn verplicht" }, { status: 400 });
  }

  const template = adminCandidateEmailTemplates[templateKey];
  if (!template) {
    return NextResponse.json({ error: "Onbekend template" }, { status: 400 });
  }

  const { data: kandidaat, error } = await supabaseAdmin
    .from("inschrijvingen")
    .select("id, voornaam, achternaam, email, uitbetalingswijze, onboarding_portal_token")
    .eq("id", kandidaatId)
    .single();

  if (error || !kandidaat) {
    return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
  }

  const emailResult = await sendCandidateTemplateEmail(kandidaat, template);

  if (emailResult.error) {
    return NextResponse.json({ error: "Mail verzenden mislukt" }, { status: 500 });
  }

  await logEmail(
    kandidaat.id,
    "custom",
    kandidaat.email,
    template.subject.replace("{voornaam}", kandidaat.voornaam),
    emailResult.data?.id
  );

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "send_candidate_template_email",
    targetTable: "inschrijvingen",
    targetId: kandidaatId,
    summary: `Template mail verstuurd: ${templateKey}`,
    metadata: { templateKey, recipient: kandidaat.email },
  });

  return NextResponse.json({ success: true });
}
