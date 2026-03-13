import type { SourceRuleRecord } from "@/lib/content/types";

export const defaultSourceRules: Array<
  Omit<SourceRuleRecord, "id" | "createdAt" | "updatedAt">
> = [
  {
    sourceId: null,
    name: "Vergunning signalering",
    description: "Tag vergunning-gerelateerd nieuws direct voor review.",
    priority: 100,
    isActive: true,
    conditions: [
      { field: "analysis.category", operator: "equals", value: "vergunningen" },
      { field: "article.cleaned_text", operator: "contains_any", value: ["vergunning", "exploitatie", "terras"] },
    ],
    actions: [
      { type: "tag", value: "vergunning" },
      { type: "route_review_queue", value: "priority_regulation" },
    ],
  },
  {
    sourceId: null,
    name: "Loondienst thema",
    description: "Detecteer cao-, loon- en contractnieuws voor werkgeverscontent.",
    priority: 80,
    isActive: true,
    conditions: [
      { field: "article.cleaned_text", operator: "contains_any", value: ["cao", "minimumloon", "contract", "loon"] },
    ],
    actions: [
      { type: "tag", value: "loondienst" },
      { type: "set_audience", value: "werkgevers" },
    ],
  },
  {
    sourceId: null,
    name: "ZZP handhaving",
    description: "Escalatie voor zzp- en schijnzelfstandigheidsonderwerpen.",
    priority: 95,
    isActive: true,
    conditions: [
      {
        field: "article.cleaned_text",
        operator: "contains_any",
        value: ["zzp", "schijnzelfstandigheid", "handhaving"],
      },
    ],
    actions: [
      { type: "tag", value: "zzp" },
      { type: "route_review_queue", value: "priority_regulation" },
    ],
  },
  {
    sourceId: null,
    name: "Hotel staffing",
    description: "Hotel- en hospitality staffing signalen voor intermediairs en operators.",
    priority: 70,
    isActive: true,
    conditions: [
      {
        field: "article.cleaned_text",
        operator: "contains_any",
        value: ["hotel", "housekeeping", "front office", "hospitality staffing"],
      },
    ],
    actions: [
      { type: "tag", value: "hotel_staffing" },
      { type: "set_audience", value: "hotel_operators" },
    ],
  },
];
