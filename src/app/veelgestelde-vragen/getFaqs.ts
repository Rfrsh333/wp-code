import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  slug: string;
}

/**
 * Cached FAQ fetch — React cache() deduplicates within a single
 * server render pass so layout.tsx and page.tsx share one DB call.
 */
export const getFaqs = cache(async (): Promise<FAQItem[]> => {
  const { data } = await supabaseAdmin
    .from("faq_items")
    .select("id, question, answer, category, slug")
    .eq("status", "published")
    .order("category")
    .order("priority", { ascending: true })
    .limit(100);

  return (data as FAQItem[] | null) ?? [];
});
