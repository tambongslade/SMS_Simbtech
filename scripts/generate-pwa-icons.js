// Generates PWA icons from public/logo.png using sharp.
// Run: node scripts/generate-pwa-icons.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '..', 'public', 'logo.png');
const OUT = path.join(__dirname, '..', 'public', 'icons');
const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // white background

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Build a square icon: white canvas of `size`, logo scaled to `coverage` of it, centered.
async function makeIcon(size, coverage, outName) {
  const inner = Math.round(size * coverage);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, outName));
  console.log('  wrote', outName, `(${size}x${size})`);
}

(async () => {
  console.log('Generating PWA icons from', SRC);
  await makeIcon(192, 0.85, 'icon-192.png');
  await makeIcon(512, 0.85, 'icon-512.png');
  // Maskable: logo lives inside the ~80% safe zone, full-bleed white background.
  await makeIcon(512, 0.6, 'icon-maskable-512.png');
  await makeIcon(192, 0.6, 'icon-maskable-192.png');
  // Apple touch icon (iOS ignores transparency; solid white bg is correct).
  await makeIcon(180, 0.85, 'apple-touch-icon.png');
  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
