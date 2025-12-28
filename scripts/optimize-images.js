const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesToOptimize = [
  'dienst-detachering.png',
  'dienst-recruitment.png',
  'dienst-uitzenden.png',
  'over-ons-verhaal.png',
  'powder-splash.png'
];

const publicImagesPath = path.join(__dirname, '..', 'public', 'images');

async function optimizeImage(filename) {
  const inputPath = path.join(publicImagesPath, filename);
  const outputPath = path.join(publicImagesPath, filename.replace('.png', '.webp'));

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    return;
  }

  const inputStats = fs.statSync(inputPath);
  const inputSizeMB = (inputStats.size / 1024 / 1024).toFixed(2);

  try {
    // Convert to WebP with high quality
    await sharp(inputPath)
      .webp({ quality: 85, effort: 6 })
      .toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputSizeMB = (outputStats.size / 1024 / 1024).toFixed(2);
    const reduction = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`✅ ${filename}`);
    console.log(`   ${inputSizeMB}MB → ${outputSizeMB}MB (${reduction}% kleiner)`);

    // Also create a compressed PNG version
    const compressedPngPath = inputPath;
    await sharp(inputPath)
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(compressedPngPath + '.tmp');

    // Replace original with compressed version
    fs.renameSync(compressedPngPath + '.tmp', compressedPngPath);

    const compressedStats = fs.statSync(compressedPngPath);
    const compressedSizeMB = (compressedStats.size / 1024 / 1024).toFixed(2);
    console.log(`   PNG compressed: ${compressedSizeMB}MB\n`);

  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error.message);
  }
}

async function main() {
  console.log('🖼️  Image Optimization Started\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const filename of imagesToOptimize) {
    await optimizeImage(filename);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Optimization complete!\n');
  console.log('Next steps:');
  console.log('1. Update components to use .webp versions with .png fallback');
  console.log('2. Test images in browser');
  console.log('3. Commit optimized images\n');
}

main();
