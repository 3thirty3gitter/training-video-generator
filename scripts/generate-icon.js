const sharp = require('sharp');
const path = require('path');

async function createIcon() {
  const svg = '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" style="stop-color:#6366f1"/>' +
    '<stop offset="100%" style="stop-color:#8b5cf6"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="256" height="256" rx="48" fill="url(#bg)"/>' +
    '<polygon points="96,64 96,192 208,128" fill="white" opacity="0.95"/>' +
    '<rect x="24" y="200" width="208" height="8" rx="4" fill="white" opacity="0.5"/>' +
    '<rect x="24" y="200" width="120" height="8" rx="4" fill="white" opacity="0.8"/>' +
    '</svg>';

  const sizes = [256, 128, 64, 48, 32, 16];
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join('public', 'icon-' + size + '.png'));
  }

  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .png()
    .toFile(path.join('public', 'icon.png'));

  console.log('Icon PNGs generated in public/');
}

createIcon().catch(console.error);
