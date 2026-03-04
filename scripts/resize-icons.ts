import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = './public/icons/icon-512x512.png';
const outputDir = './public/icons';

async function resizeIcons() {
  // Read the source image
  const imageBuffer = fs.readFileSync(inputPath);
  const image = sharp(imageBuffer);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    // Skip if it's the same as source
    if (size === 512 && fs.existsSync(inputPath)) {
      console.log(`Skipped: ${outputPath} (source file)`);
      continue;
    }
    
    await sharp(imageBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Created: ${outputPath}`);
  }
  
  console.log('All icons created successfully!');
}

resizeIcons().catch(console.error);
