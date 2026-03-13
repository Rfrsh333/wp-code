import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { seedSourceProfiles } from "@/lib/content/source-profiles";
import { defaultSourceRules } from "@/lib/rules/content-rules";

export async function seedCuratedSources() {
  const { data: existingSources, error: sourceReadError } = await supabaseAdmin
    .from("sources")
    .select("id, name, source_type, source_url, rss_url, category_focus, region, trust_level, fetch_frequency, rule_profile");

  if (sourceReadError && sourceReadError.code !== "42P01") {
    throw sourceReadError;
  }

  const existingByName = new Map((existingSources ?? []).map((source) => [String(source.name), source]));

  const sourcesToInsert = seedSourceProfiles
    .filter((source) => !existingByName.has(source.name))
    .map((source) => ({
      name: source.name,
      source_type: source.sourceType,
      source_url: source.sourceUrl,
      rss_url: source.rssUrl,
      category_focus: source.categoryFocus,
      region: source.region,
      trust_level: source.trustLevel,
      fetch_frequency: source.fetchFrequency,
      rule_profile: source.ruleProfile,
      is_active: true,
    }));

  if (sourcesToInsert.length > 0) {
    const { error } = await supabaseAdmin.from("sources").insert(sourcesToInsert);
    if (error) {
      throw error;
    }
  }

  for (const seed of seedSourceProfiles) {
    const existing = existingByName.get(seed.name);
    if (!existing) {
      continue;
    }

    const nextValues = {
      source_type: seed.sourceType,
      source_url: seed.sourceUrl,
      rss_url: seed.rssUrl,
      category_focus: seed.categoryFocus,
      region: seed.region,
      trust_level: seed.trustLevel,
      fetch_frequency: seed.fetchFrequency,
      rule_profile: seed.ruleProfile,
      is_active: true,
    };

    const { error } = await supabaseAdmin
      .from("sources")
      .update(nextValues)
      .eq("id", existing.id as string);

    if (error) {
      throw error;
    }
  }

  const { data: refreshedSources, error: refreshedSourcesError } = await supabaseAdmin
    .from("sources")
    .select("id, name");

  if (refreshedSourcesError) {
    throw refreshedSourcesError;
  }

  const existingRules = await supabaseAdmin.from("source_rules").select("name");
  if (existingRules.error && existingRules.error.code !== "42P01") {
    throw existingRules.error;
  }

  const existingRuleNames = new Set((existingRules.data ?? []).map((rule) => String(rule.name)));
  const sourceIdByName = new Map((refreshedSources ?? []).map((source) => [String(source.name), String(source.id)]));

  const rulesToInsert = defaultSourceRules
    .filter((rule) => !existingRuleNames.has(rule.name))
    .map((rule) => ({
      source_id: rule.sourceId,
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      is_active: rule.isActive,
      conditions: rule.conditions,
      actions: rule.actions,
    }));

  if (rulesToInsert.length > 0) {
    const { error } = await supabaseAdmin.from("source_rules").insert(rulesToInsert);
    if (error) {
      throw error;
    }
  }

  return {
    insertedSources: sourcesToInsert.length,
    insertedRules: rulesToInsert.length,
    totalSources: sourceIdByName.size,
  };
}
