import { supabaseAdmin } from "@/lib/supabase";
import type { AdminRole } from "@/lib/admin-auth";

interface AuditLogInput {
  actorEmail?: string;
  actorRole?: AdminRole;
  action: string;
  targetTable: string;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return null;

  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return {
      serialization_error: true,
    };
  }
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      actor_email: input.actorEmail || null,
      actor_role: input.actorRole || null,
      action: input.action,
      target_table: input.targetTable,
      target_id: input.targetId || null,
      summary: input.summary,
      metadata: sanitizeMetadata(input.metadata),
    });
  } catch (error) {
    console.warn("[AUDIT] Failed to write audit log:", error);
  }
}
