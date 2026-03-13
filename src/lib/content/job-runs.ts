import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/content/errors";

export async function createJobRun(jobName: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("job_runs")
    .insert({
      job_name: jobName,
      status: "running",
      payload,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[content] Failed to create job run", error);
    return null;
  }

  return data?.id as string | null;
}

export async function finishJobRun(jobRunId: string | null, result: Record<string, unknown>) {
  if (!jobRunId) {
    return;
  }

  await supabaseAdmin
    .from("job_runs")
    .update({
      status: "completed",
      result,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobRunId);
}

export async function failJobRun(jobRunId: string | null, error: unknown) {
  if (!jobRunId) {
    return;
  }

  await supabaseAdmin
    .from("job_runs")
    .update({
      status: "failed",
      error_message: getErrorMessage(error),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobRunId);
}
