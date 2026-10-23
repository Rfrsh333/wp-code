// Houdt titels en beschrijvingen binnen de lengte die Google in de zoekresultaten toont.
const SEPARATORS = [" — ", ": ", " | ", " - "];

export function fitTitle(title: string, max = 60): string {
  if (title.length <= max) return title;
  for (const sep of SEPARATORS) {
    const i = title.lastIndexOf(sep, max);
    if (i > 20) return title.slice(0, i);
  }
  return title.slice(0, title.lastIndexOf(" ", max - 1)).replace(/[,;:\-–—]+$/, "");
}

export function fitDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\-–—]+$/, "") + "…";
}
