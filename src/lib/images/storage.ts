import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

const EDITORIAL_BUCKET = "editorial-images";

export async function uploadEditorialImage(params: {
  path: string;
  buffer: Buffer;
  contentType: string;
}) {
  const { error } = await supabaseAdmin.storage
    .from(EDITORIAL_BUCKET)
    .upload(params.path, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) {
    console.error(`[storage] Upload failed to bucket '${EDITORIAL_BUCKET}':`, error);
    throw new Error(
      `Failed to upload image to storage bucket '${EDITORIAL_BUCKET}': ${error.message}. ` +
      `Please ensure the bucket exists and has correct permissions.`
    );
  }

  return params.path;
}

export async function createEditorialImageSignedUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(EDITORIAL_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
