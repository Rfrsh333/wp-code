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
    throw error;
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
