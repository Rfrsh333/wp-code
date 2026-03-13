import "server-only";

import path from "path";
import { supabaseAdmin } from "@/lib/supabase";
import { OpenAIContentClient } from "@/lib/ai/openai-content-client";
import { generateImagePrompt, brandGeneratedHeroImage } from "@/lib/content/services/image-service";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { uploadEditorialImage } from "@/lib/images/storage";
import { ContentPipelineError } from "@/lib/content/errors";

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
  }>;
}

function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ContentPipelineError("OPENAI_API_KEY is not configured.", "openai_key_missing");
  }

  return apiKey;
}

function buildStorageBase(slug: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `editorial/${slug}/${timestamp}`;
}

async function requestGeneratedImage(prompt: string): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: getImageModel(),
      prompt,
      size: "1536x1024",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ContentPipelineError("OpenAI image generation failed.", "openai_image_generation_failed", {
      status: response.status,
      body: errorBody,
    });
  }

  const payload = (await response.json()) as OpenAIImageResponse;
  const encoded = payload.data?.[0]?.b64_json;

  if (!encoded) {
    throw new ContentPipelineError("OpenAI returned no image payload.", "openai_image_empty");
  }

  return Buffer.from(encoded, "base64");
}

export async function generateHeroImageForDraft(draftId: string) {
  const jobRunId = await createJobRun("content.generateHeroImage", { draftId });

  try {
    const { data: draft, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("id, slug, title, excerpt, visual_direction, image_prompt_suggestion")
      .eq("id", draftId)
      .single();

    if (error || !draft) {
      throw error ?? new Error("Draft not found.");
    }

    const aiClient = new OpenAIContentClient();
    const promptResult = await generateImagePrompt(aiClient, {
      title: String(draft.title),
      excerpt: String(draft.excerpt),
      visualDirection: (draft.visual_direction as string | null) ?? null,
    });

    const { data: imageRow, error: imageInsertError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        draft_id: draftId,
        status: "prompt_ready",
        prompt: promptResult.prompt,
        alt_text: promptResult.altText,
        generation_model: getImageModel(),
      })
      .select("id")
      .single();

    if (imageInsertError || !imageRow) {
      throw imageInsertError ?? new Error("Failed to create generated image row.");
    }

    const generatedImageId = String(imageRow.id);

    await supabaseAdmin
      .from("generated_images")
      .update({ status: "generating" })
      .eq("id", generatedImageId);

    const originalBuffer = await requestGeneratedImage(promptResult.prompt);
    const storageBase = buildStorageBase(String(draft.slug));
    const originalPath = `${storageBase}/original.png`;

    await uploadEditorialImage({
      path: originalPath,
      buffer: originalBuffer,
      contentType: "image/png",
    });

    await supabaseAdmin
      .from("generated_images")
      .update({
        status: "branding",
        storage_path_original: originalPath,
      })
      .eq("id", generatedImageId);

    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const brandedBuffer = await brandGeneratedHeroImage({
      buffer: originalBuffer,
      logoPath,
    });
    const brandedPath = `${storageBase}/branded.webp`;

    await uploadEditorialImage({
      path: brandedPath,
      buffer: brandedBuffer,
      contentType: "image/webp",
    });

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
        image_prompt_suggestion: promptResult.prompt,
        visual_direction: promptResult.visualDirection,
      })
      .eq("id", draftId);

    await finishJobRun(jobRunId, {
      draftId,
      generatedImageId,
      brandedPath,
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
