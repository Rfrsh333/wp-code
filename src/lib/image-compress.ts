/**
 * Client-side image compression utility.
 * Comprimeert afbeeldingen tot max 200KB / 800px breed via Canvas API.
 * Geen externe dependencies nodig.
 */

interface CompressOptions {
  /** Maximale breedte in pixels (default: 800) */
  maxWidth?: number;
  /** Maximale hoogte in pixels (default: 600) */
  maxHeight?: number;
  /** JPEG kwaliteit 0-1 (default: 0.7) */
  quality?: number;
  /** Maximale bestandsgrootte in bytes (default: 200KB) */
  maxSizeBytes?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.7,
  maxSizeBytes: 200 * 1024, // 200KB
};

/**
 * Comprimeer een File/Blob afbeelding tot een kleine JPEG.
 * Returns een Blob die direct naar Supabase Storage kan worden geüpload.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<Blob> {
  const opts = { ...DEFAULTS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Bereken schaalfactor
      let { width, height } = img;
      const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas niet beschikbaar"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Probeer eerst met gewenste kwaliteit
      let quality = opts.quality;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compressie mislukt"));
              return;
            }

            // Als te groot en kwaliteit kan nog lager, probeer opnieuw
            if (blob.size > opts.maxSizeBytes && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Afbeelding laden mislukt"));
    };

    img.src = url;
  });
}

/**
 * Genereer een preview URL voor een File (voor in een <img> tag).
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Schoon preview URL op (voorkom memory leaks).
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
