import "server-only";

import { supabaseAdmin } from "@/lib/supabase";

const EDITORIAL_BUCKET = "editorial-images";

let bucketChecked = false;

async function ensureBucketExists() {
  if (bucketChecked) return;

  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === EDITORIAL_BUCKET);

    if (!bucketExists) {
      console.error(
        `[storage] CRITICAL: Bucket '${EDITORIAL_BUCKET}' does not exist!\n` +
        `Please run scripts/setup-editorial-bucket.sql in Supabase SQL Editor to create it.`
      );
    } else {
      bucketChecked = true;
    }
  } catch (error) {
    console.error("[storage] Failed to check bucket existence:", error);
  }
}

export async function uploadEditorialImage(params: {
  path: string;
  buffer: Buffer;
  contentType: string;
}) {
  await ensureBucketExists();

  const { error } = await supabaseAdmin.storage
    .from(EDITORIAL_BUCKET)
    .upload(params.path, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });

  if (error) {
    console.error(`[storage] Upload failed to bucket '${EDITORIAL_BUCKET}':`, error);

    // Check if error is because bucket doesn't exist
    if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
      throw new Error(
        `Storage bucket '${EDITORIAL_BUCKET}' does not exist. ` +
        `Please run scripts/setup-editorial-bucket.sql in Supabase SQL Editor.`
      );
    }

    throw new Error(
      `Failed to upload image to storage: ${error.message}. ` +
      `Please check bucket permissions and try again.`
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
