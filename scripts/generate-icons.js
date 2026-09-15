// scripts/generate-icons.js
// Generates all required PWA icon sizes from public/logo.png using Sharp
// Run: node scripts/generate-icons.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../public/logo.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SIZES = [96, 192, 512];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from logo.png...\n');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ icon-${size}x${size}.png`);
  }

  // Maskable icon: add padding (safe zone) — logo centered on blue background
  const maskablePath = path.join(OUTPUT_DIR, 'icon-512x512-maskable.png');
  const MASKABLE_SIZE = 512;
  const LOGO_SIZE = Math.floor(MASKABLE_SIZE * 0.7); // 70% safe zone

  const logoBuffer = await sharp(SOURCE)
    .resize(LOGO_SIZE, LOGO_SIZE, {
      fit: 'contain',
      background: { r: 37, g: 99, b: 235, alpha: 1 } // blue-600
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: MASKABLE_SIZE,
      height: MASKABLE_SIZE,
      channels: 4,
      background: { r: 37, g: 99, b: 235, alpha: 1 } // blue-600
    }
  })
    .composite([
      {
        input: logoBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(maskablePath);

  console.log('  ✅ icon-512x512-maskable.png (maskable with safe zone)');
  console.log('\n🚀 All icons generated successfully in public/icons/');
}

generateIcons().catch(console.error);
