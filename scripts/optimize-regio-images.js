const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Map van source bestanden naar doel bestanden
const imageMapping = {
  'Amsterdam regio.png': 'locatie-amsterdam-hero.png',
  'Denhaag regio.png': 'locatie-den-haag-hero.png',
  'Eindhoven regio.png': 'locatie-eindhoven-hero.png',
  'Rotterdam regio.png': 'locatie-rotterdam-hero.png',
  'Utrecht regio.png': 'locatie-utrecht-hero.png'
};

const sourcePath = '/Users/rachid/Desktop/icons etc/Regios';
const publicImagesPath = path.join(__dirname, '..', 'public', 'images');

async function optimizeRegioImage(sourceFile, targetFile) {
  const inputPath = path.join(sourcePath, sourceFile);
  const outputPngPath = path.join(publicImagesPath, targetFile);
  const outputWebpPath = path.join(publicImagesPath, targetFile.replace('.png', '.webp'));

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Skipping ${sourceFile} - file not found`);
    return;
  }

  const inputStats = fs.statSync(inputPath);
  const inputSizeMB = (inputStats.size / 1024 / 1024).toFixed(2);

  try {
    // Resize to max 1920px width and convert to optimized PNG
    await sharp(inputPath)
      .resize(1920, null, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(outputPngPath);

    const pngStats = fs.statSync(outputPngPath);
    const pngSizeMB = (pngStats.size / 1024 / 1024).toFixed(2);

    // Convert to WebP for even better compression
    await sharp(inputPath)
      .resize(1920, null, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ quality: 85, effort: 6 })
      .toFile(outputWebpPath);

    const webpStats = fs.statSync(outputWebpPath);
    const webpSizeMB = (webpStats.size / 1024 / 1024).toFixed(2);
    const reduction = (((inputStats.size - webpStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`✅ ${sourceFile} → ${targetFile}`);
    console.log(`   ${inputSizeMB}MB → PNG: ${pngSizeMB}MB, WebP: ${webpSizeMB}MB`);
    console.log(`   ${reduction}% kleiner met WebP\n`);

  } catch (error) {
    console.error(`❌ Error optimizing ${sourceFile}:`, error.message);
  }
}

async function main() {
  console.log('🖼️  Regio Images Optimization Started\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const [sourceFile, targetFile] of Object.entries(imageMapping)) {
    await optimizeRegioImage(sourceFile, targetFile);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Optimization complete!\n');
}

main();
