import { contentIntelligenceJobs } from "../../../trigger/content-intelligence.jobs";

export function getContentWorkflowDesign() {
  return {
    jobs: contentIntelligenceJobs,
    guarantees: [
      "Prefer RSS ingestion before page scraping.",
      "Jobs must be idempotent on source IDs, article IDs, cluster IDs, and draft IDs.",
      "Legal and regulatory drafts stay in reviewable states until explicitly approved.",
      "Failures should be logged into job_runs and surfaced to admins.",
    ],
  };
}
