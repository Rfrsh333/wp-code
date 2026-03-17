import "server-only";

import path from "path";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase";
import { brandGeneratedHeroImage } from "@/lib/content/services/image-service";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { uploadEditorialImage } from "@/lib/images/storage";
import { ContentPipelineError, getErrorMessage } from "@/lib/content/errors";
import { createPlaceholderHeroImage } from "@/lib/images/hero-branding";

interface UnsplashPhoto {
  urls: { regular?: string; full?: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
}

/**
 * Search Unsplash for a topic-relevant stock photo.
 * Returns the image buffer and attribution info.
 */
async function searchUnsplashImage(
  query: string,
): Promise<{ buffer: Buffer; altText: string; attribution: string } | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.log("[hero-image] UNSPLASH_ACCESS_KEY not configured, skipping Unsplash");
    return null;
  }

  try {
    const searchUrl = new URL("https://api.unsplash.com/search/photos");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("per_page", "5");
    searchUrl.searchParams.set("orientation", "landscape");
    searchUrl.searchParams.set("content_filter", "high");

    const response = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      console.warn(`[hero-image] Unsplash search failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as UnsplashSearchResponse;
    if (!data.results?.length) {
      return null;
    }

    // Pick a random photo from top 5 results for variety
    const photo = data.results[Math.floor(Math.random() * Math.min(data.results.length, 5))];
    const imageUrl = photo.urls.regular ?? photo.urls.full;
    if (!imageUrl) return null;

    const imageBuffer = await downloadImage(imageUrl);
    const attribution = `Foto: ${photo.user.name} via Unsplash`;

    // Trigger download event per Unsplash API guidelines
    try {
      await fetch(`https://api.unsplash.com/photos/${query}/download`, {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }).catch(() => {});
    } catch {
      // Non-critical
    }

    return {
      buffer: imageBuffer,
      altText: photo.alt_description ?? query,
      attribution,
    };
  } catch (error) {
    console.warn(`[hero-image] Unsplash error: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * Build a search query for Unsplash based on draft title/excerpt.
 */
function buildUnsplashQuery(title: string, excerpt: string): string {
  // Map common Dutch topics to English search terms for better Unsplash results
  const topicMap: Record<string, string> = {
    horeca: "restaurant hospitality",
    hotel: "hotel hospitality",
    restaurant: "restaurant kitchen",
    personeel: "team employees",
    uitzend: "staffing agency",
    arbeidsmarkt: "job market employment",
    cao: "business negotiation",
    medewerker: "employee workplace",
    ondernemer: "entrepreneur business",
    keuken: "professional kitchen chef",
    zzp: "freelancer working",
    wet: "law regulation",
    compliance: "business compliance",
  };

  const text = `${title} ${excerpt}`.toLowerCase();

  for (const [keyword, query] of Object.entries(topicMap)) {
    if (text.includes(keyword)) {
      return query;
    }
  }

  return "business professional workplace";
}

function buildStorageBase(slug: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `editorial/${slug}/${timestamp}`;
}

/**
 * Extract og:image URL from article HTML.
 */
async function extractOgImage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TopTalentBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Try og:image first, then twitter:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogMatch?.[1]) {
      return ogMatch[1];
    }

    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    return twitterMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Download an image from a URL and return it as a Buffer.
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TopTalentBot/1.0)",
      Accept: "image/*",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    throw new ContentPipelineError(
      `Failed to download image: ${response.status}`,
      "image_download_failed",
      { url: imageUrl, status: response.status },
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get source article URLs linked to a draft.
 */
async function getDraftSourceUrls(draftId: string): Promise<string[]> {
  const { data: sources } = await supabaseAdmin
    .from("editorial_draft_sources")
    .select(`
      normalized_article_id,
      normalized_articles (
        canonical_url
      )
    `)
    .eq("draft_id", draftId)
    .order("source_order", { ascending: true })
    .limit(3);

  if (!sources?.length) {
    return [];
  }

  return sources
    .map((row) => {
      const article = Array.isArray(row.normalized_articles)
        ? row.normalized_articles[0]
        : row.normalized_articles;
      return article?.canonical_url;
    })
    .filter((url): url is string => Boolean(url));
}

/** URL patterns that indicate a logo, icon or generic placeholder — not a real article photo. */
const BLOCKED_IMAGE_PATTERNS = [
  /google\.com.*\/logo/i,
  /googlenews/i,
  /google-news/i,
  /gstatic\.com/i,
  /\/favicon/i,
  /\/icon[s]?\//i,
  /\/logo[s]?\//i,
  /\/brand[ing]?\//i,
  /\/apple-touch-icon/i,
  /\/default[-_]?(og|image|thumb|share)/i,
  /\/placeholder/i,
  /\/site[-_]?logo/i,
  /\/og[-_]?default/i,
];

/**
 * Check if an og:image URL looks like a generic logo/icon rather than a real article photo.
 */
function isBlockedImageUrl(imageUrl: string): boolean {
  return BLOCKED_IMAGE_PATTERNS.some((pattern) => pattern.test(imageUrl));
}

/**
 * Check image dimensions — real article photos should be landscape and at least 600px wide.
 * Logos/icons are typically small or square.
 */
async function isUsablePhotoDimensions(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;

    // Too small — likely an icon or logo
    if (w < 600 || h < 300) {
      console.log(`[hero-image] Rejected: too small (${w}x${h})`);
      return false;
    }

    // Nearly square or taller than wide — likely a logo, not an article photo
    const ratio = w / h;
    if (ratio < 1.1) {
      console.log(`[hero-image] Rejected: not landscape (${w}x${h}, ratio ${ratio.toFixed(2)})`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Try to find a usable og:image URL from source articles (without downloading).
 * Returns the URL and source article URL, or null.
 * Checks max 3 sources with 4s timeout per fetch.
 */
async function findSourceImageUrl(sourceUrls: string[]): Promise<{ imageUrl: string; sourceArticleUrl: string } | null> {
  for (const url of sourceUrls.slice(0, 3)) {
    try {
      const ogImageUrl = await extractOgImage(url);
      if (!ogImageUrl) {
        continue;
      }

      // Resolve relative URLs
      const absoluteUrl = ogImageUrl.startsWith("http")
        ? ogImageUrl
        : new URL(ogImageUrl, url).href;

      // Block known logo/icon URLs
      if (isBlockedImageUrl(absoluteUrl)) {
        console.log(`[hero-image] Blocked generic image URL: ${absoluteUrl}`);
        continue;
      }

      return { imageUrl: absoluteUrl, sourceArticleUrl: url };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Step 1: Find the best source image URL for a draft.
 * Only scrapes og:image from max 3 source articles. Does NOT download the image.
 * Designed to fit within ~3s.
 */
export async function findBestSourceImageUrl(draftId: string): Promise<{ imageUrl: string; sourceArticleUrl: string } | null> {
  const sourceUrls = await getDraftSourceUrls(draftId);
  if (!sourceUrls.length) {
    return null;
  }

  return findSourceImageUrl(sourceUrls);
}

/**
 * Step 2: Download image from URL, validate, brand with logo+gradient, and upload to Supabase.
 * Designed to fit within ~5s.
 */
export async function downloadBrandAndUpload(draftId: string, imageUrl: string): Promise<{
  draftId: string;
  generatedImageId: string;
  brandedPath: string;
}> {
  const jobRunId = await createJobRun("content.brandAndUploadImage", { draftId, imageUrl });

  try {
    const { data: draft, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("id, slug, title")
      .eq("id", draftId)
      .single();

    if (error || !draft) {
      throw error ?? new Error("Draft not found.");
    }

    // Download and validate
    let imageBuffer: Buffer;
    let imageSource: string;
    let usePlaceholder = false;

    try {
      imageBuffer = await downloadImage(imageUrl);

      if (imageBuffer.length < 10_000) {
        console.warn(`[hero-image] Image too small from ${imageUrl}, using placeholder`);
        usePlaceholder = true;
      } else if (!(await isUsablePhotoDimensions(imageBuffer))) {
        console.warn(`[hero-image] Image dimensions not suitable from ${imageUrl}, using placeholder`);
        usePlaceholder = true;
      }
    } catch (downloadError) {
      console.warn(`[hero-image] Failed to download ${imageUrl}, using placeholder:`, downloadError);
      usePlaceholder = true;
    }

    if (usePlaceholder) {
      // Use placeholder when source image is not suitable
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      imageBuffer = await createPlaceholderHeroImage({ logoPath });
      imageSource = "placeholder";
    } else {
      imageSource = imageUrl;
    }

    const altText = String(draft.title);

    // Create image record
    const { data: imageRow, error: imageInsertError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        draft_id: draftId,
        status: "generating",
        prompt: `Image from: ${imageSource}`,
        alt_text: altText,
        generation_model: usePlaceholder ? "placeholder" : "source_og_image",
      })
      .select("id")
      .single();

    if (imageInsertError || !imageRow) {
      throw imageInsertError ?? new Error("Failed to create image row.");
    }

    const generatedImageId = String(imageRow.id);
    const storageBase = buildStorageBase(String(draft.slug));

    // Upload original
    const originalPath = `${storageBase}/original.png`;
    await uploadEditorialImage({
      path: originalPath,
      buffer: imageBuffer,
      contentType: "image/png",
    });

    await supabaseAdmin
      .from("generated_images")
      .update({
        status: "branding",
        storage_path_original: originalPath,
      })
      .eq("id", generatedImageId);

    // Apply branding (logo bottom-right + orange gradient)
    // Note: if usePlaceholder, imageBuffer is already branded
    let brandedBuffer: Buffer;
    if (usePlaceholder) {
      brandedBuffer = imageBuffer; // Already branded by createPlaceholderHeroImage
    } else {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      brandedBuffer = await brandGeneratedHeroImage({
        buffer: imageBuffer,
        logoPath,
      });
    }
    const brandedPath = `${storageBase}/branded.webp`;

    await uploadEditorialImage({
      path: brandedPath,
      buffer: brandedBuffer,
      contentType: "image/webp",
    });

    // Finalize
    await supabaseAdmin
      .from("generated_images")
      .update({
        status: "completed",
        storage_path_branded: brandedPath,
        width: 1600,
        height: 900,
      })
      .eq("id", generatedImageId);

    await supabaseAdmin
      .from("editorial_drafts")
      .update({
        hero_image_id: generatedImageId,
      })
      .eq("id", draftId);

    await finishJobRun(jobRunId, {
      draftId,
      generatedImageId,
      brandedPath,
      imageSource: imageUrl,
    });

    return {
      draftId,
      generatedImageId,
      brandedPath,
    };
  } catch (error) {
    await failJobRun(jobRunId, error);
    throw error;
  }
}

/**
 * Legacy all-in-one function. Now uses the split steps internally.
 * Tries og:image first, then Unsplash. No AI fallback (doesn't fit in 10s).
 */
export async function generateHeroImageForDraft(draftId: string) {
  // Step 1: Try og:image from source articles
  const sourceResult = await findBestSourceImageUrl(draftId);

  if (sourceResult) {
    return downloadBrandAndUpload(draftId, sourceResult.imageUrl);
  }

  // Step 2: Fallback to Unsplash
  const { data: draft, error } = await supabaseAdmin
    .from("editorial_drafts")
    .select("id, slug, title, excerpt")
    .eq("id", draftId)
    .single();

  if (error || !draft) {
    throw error ?? new Error("Draft not found.");
  }

  const unsplashQuery = buildUnsplashQuery(String(draft.title), String(draft.excerpt));
  const unsplashResult = await searchUnsplashImage(unsplashQuery);

  const jobRunId = await createJobRun("content.generateHeroImage", { draftId });

  try {
    let imageBuffer: Buffer;
    let altText: string;
    let generationModel: string;
    let imageSource: string;

    if (unsplashResult) {
      // Use Unsplash image
      imageBuffer = unsplashResult.buffer;
      altText = unsplashResult.altText;
      generationModel = `unsplash (${unsplashResult.attribution})`;
      imageSource = `unsplash:${unsplashQuery}`;
    } else {
      // Fallback to placeholder when Unsplash fails
      console.warn(`[hero-image] No Unsplash result for ${unsplashQuery}, using placeholder`);
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      imageBuffer = await createPlaceholderHeroImage({ logoPath });
      altText = String(draft.title);
      generationModel = "placeholder";
      imageSource = "placeholder";
    }

    // Create image record
    const { data: imageRow, error: imageInsertError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        draft_id: draftId,
        status: "generating",
        prompt: `Image from: ${imageSource}`,
        alt_text: altText,
        generation_model: generationModel,
      })
      .select("id")
      .single();

    if (imageInsertError || !imageRow) {
      throw imageInsertError ?? new Error("Failed to create image row.");
    }

    const generatedImageId = String(imageRow.id);
    const storageBase = buildStorageBase(String(draft.slug));

    // Upload original
    const originalPath = `${storageBase}/original.png`;
    await uploadEditorialImage({
      path: originalPath,
      buffer: imageBuffer,
      contentType: "image/png",
    });

    await supabaseAdmin
      .from("generated_images")
      .update({
        status: "branding",
        storage_path_original: originalPath,
      })
      .eq("id", generatedImageId);

    // Apply branding (skip if placeholder, as it's already branded)
    let brandedBuffer: Buffer;
    if (generationModel === "placeholder") {
      brandedBuffer = imageBuffer; // Already branded by createPlaceholderHeroImage
    } else {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      brandedBuffer = await brandGeneratedHeroImage({
        buffer: imageBuffer,
        logoPath,
      });
    }
    const brandedPath = `${storageBase}/branded.webp`;

    await uploadEditorialImage({
      path: brandedPath,
      buffer: brandedBuffer,
      contentType: "image/webp",
    });

    // Finalize
    await supabaseAdmin
      .from("generated_images")
      .update({
        status: "completed",
        storage_path_branded: brandedPath,
        width: 1600,
        height: 900,
      })
      .eq("id", generatedImageId);

    await supabaseAdmin
      .from("editorial_drafts")
      .update({
        hero_image_id: generatedImageId,
      })
      .eq("id", draftId);

    await finishJobRun(jobRunId, {
      draftId,
      generatedImageId,
      brandedPath,
      imageSource,
    });

    return {
      draftId,
      generatedImageId,
      brandedPath,
    };
  } catch (error) {
    await failJobRun(jobRunId, error);
    throw error;
  }
}

export async function generateHeroImagesForReadyDrafts(limit = 3) {
  const { data: drafts, error } = await supabaseAdmin
    .from("editorial_drafts")
    .select("id")
    .in("review_status", ["draft", "approved"])
    .is("hero_image_id", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") {
      return {
        attempted: 0,
        completed: 0,
        failed: 0,
        results: [],
      };
    }

    throw error;
  }

  const results: Array<{
    draftId: string;
    status: "success" | "failed";
    generatedImageId?: string;
    error?: string;
  }> = [];

  for (const draft of drafts ?? []) {
    const draftId = String(draft.id);
    try {
      const result = await generateHeroImageForDraft(draftId);
      results.push({
        draftId,
        status: "success",
        generatedImageId: result.generatedImageId,
      });
    } catch (error) {
      results.push({
        draftId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown image generation error",
      });
    }
  }

  return {
    attempted: (drafts ?? []).length,
    completed: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
