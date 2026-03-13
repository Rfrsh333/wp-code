import type { EditorialDraftRecord } from "@/lib/content/types";

export function formatEditorialLabel(value: string | null | undefined): string {
  if (!value) {
    return "Onbekend";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function deriveReadableClusterTitle(input: {
  category: string | null;
  subtopic: string | null;
}) {
  const category = formatEditorialLabel(input.category);
  const subtopic = formatEditorialLabel(input.subtopic);

  if (!input.category && !input.subtopic) {
    return "Hospitality marktupdate";
  }

  if (!input.category) {
    return subtopic;
  }

  if (!input.subtopic) {
    return category;
  }

  if (category === subtopic) {
    return category;
  }

  return `${category}: ${subtopic}`;
}

export function deriveDraftStatusTone(status: EditorialDraftRecord["reviewStatus"]) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "approved") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-100 text-neutral-700";
}
