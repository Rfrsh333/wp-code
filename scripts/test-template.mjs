import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local
const envContent = readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Check clusters without drafts
const { data: clusters, error } = await supabase
  .from("content_clusters")
  .select("id, theme_title, editorial_potential_score")
  .order("editorial_potential_score", { ascending: false })
  .limit(10);

if (error) {
  console.log("Error fetching clusters:", error.message);
  process.exit(1);
}

console.log(`\n=== ${clusters.length} clusters gevonden ===\n`);

let availableCluster = null;

for (const c of clusters) {
  const { data: draft } = await supabase
    .from("editorial_drafts")
    .select("id")
    .eq("cluster_id", c.id)
    .maybeSingle();

  const hasDraft = Boolean(draft?.id);
  const status = hasDraft ? "HAS DRAFT" : "AVAILABLE";
  console.log(`[${status}] ${c.theme_title} (score: ${c.editorial_potential_score})`);
  console.log(`         id: ${c.id}`);

  if (!hasDraft && !availableCluster) {
    availableCluster = c;
  }
}

if (availableCluster) {
  console.log(`\n=== Beschikbaar cluster voor test ===`);
  console.log(`ID: ${availableCluster.id}`);
  console.log(`Titel: ${availableCluster.theme_title}`);
  console.log(`\nGebruik dit cluster ID om een draft te genereren via de API.`);
} else {
  console.log(`\nGeen clusters zonder draft beschikbaar. Run eerst de pipeline (ingestion → clustering).`);
}

// 2. Check recent drafts
const { data: recentDrafts } = await supabase
  .from("editorial_drafts")
  .select("id, title, review_status, body_blocks, created_at")
  .order("created_at", { ascending: false })
  .limit(3);

console.log(`\n=== Recente drafts ===\n`);
for (const d of recentDrafts || []) {
  const blockCount = Array.isArray(d.body_blocks) ? d.body_blocks.length : 0;
  console.log(`[${d.review_status}] ${d.title}`);
  console.log(`         id: ${d.id} | blocks: ${blockCount} | ${d.created_at}`);
}
