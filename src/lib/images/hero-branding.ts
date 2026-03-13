import "server-only";

import sharp from "sharp";

export interface HeroBrandingOptions {
  logoPath: string;
  outputWidth?: number;
  outputHeight?: number;
}

function buildBottomGlow(width: number, height: number): Buffer {
  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomGlow" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="rgba(242,117,1,0.32)" />
        <stop offset="55%" stop-color="rgba(249,115,22,0.14)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <rect x="0" y="${Math.round(height * 0.55)}" width="${width}" height="${Math.round(height * 0.45)}" fill="url(#bottomGlow)" />
  </svg>`;

  return Buffer.from(svg);
}

export async function applyEditorialHeroBranding(
  inputBuffer: Buffer,
  options: HeroBrandingOptions,
): Promise<Buffer> {
  const width = options.outputWidth ?? 1600;
  const height = options.outputHeight ?? 900;
  const logoWidth = Math.round(width * 0.12);
  const logoPadding = Math.round(width * 0.035);

  const logo = await sharp(options.logoPath)
    .resize({ width: logoWidth })
    .png()
    .toBuffer();

  return sharp(inputBuffer)
    .resize(width, height, { fit: "cover" })
    .composite([
      {
        input: buildBottomGlow(width, height),
        top: 0,
        left: 0,
      },
      {
        input: logo,
        gravity: "southwest",
        left: logoPadding,
        top: height - logoPadding - Math.round(logoWidth * 0.4),
        blend: "over",
      },
    ])
    .webp({ quality: 84 })
    .toBuffer();
}
