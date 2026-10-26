/**
 * Generates the app icon set from the Thiên Nhãn Trú Đồ brand mark.
 * Run once with: node scripts/generate-assets.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(OUT, { recursive: true });

const YELLOW = '#FDE047';
const INK = '#151515';
const GREEN = '#059669';
const OFFWHITE = '#F5F5F0';

/** The brand mark: a house with a green door and a check badge. */
function houseSvg({ bg, fg, accent, size, radius }) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="${radius}" fill="${bg}"/>
  <path d="M90 38L48 76H64V118H116V76H132L90 38Z" fill="${fg}"/>
  <rect x="79" y="84" width="22" height="34" rx="4" fill="${accent}"/>
  <circle cx="140" cy="112" r="17" fill="${accent}"/>
  <path d="M133 112L138 117L148 107" stroke="${OFFWHITE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;
}

/** Android foreground: the mark only, transparent background (scaled down). */
function foregroundSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(30 30) scale(0.667)">
    <path d="M90 38L48 76H64V118H116V76H132L90 38Z" fill="${INK}"/>
    <rect x="79" y="84" width="22" height="34" rx="4" fill="${GREEN}"/>
    <circle cx="140" cy="112" r="17" fill="${GREEN}"/>
    <path d="M133 112L138 117L148 107" stroke="${OFFWHITE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
}

async function main() {
  // iOS / general icon: 1024x1024, no rounded corners (the OS masks it).
  await sharp(Buffer.from(houseSvg({ bg: YELLOW, fg: INK, accent: GREEN, size: 1024, radius: 0 })))
    .png()
    .toFile(path.join(OUT, 'icon.png'));

  // Android foreground: 1024x1024, transparent, mark fits the safe zone.
  await sharp(Buffer.from(foregroundSvg(1024)))
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));

  // Android monochrome: 1024x1024, transparent, single colour.
  const mono = `<svg width="1024" height="1024" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(30 30) scale(0.667)" fill="#000000">
    <path d="M90 38L48 76H64V118H116V76H132L90 38Z"/>
    <rect x="79" y="84" width="22" height="34" rx="4"/>
    <circle cx="140" cy="112" r="17"/>
  </g>
</svg>`;
  await sharp(Buffer.from(mono)).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));

  // Splash: the mark on the brand yellow.
  await sharp(Buffer.from(houseSvg({ bg: YELLOW, fg: INK, accent: GREEN, size: 512, radius: 0 })))
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));

  // Favicon: 48x48.
  await sharp(Buffer.from(houseSvg({ bg: YELLOW, fg: INK, accent: GREEN, size: 48, radius: 0 })))
    .png()
    .toFile(path.join(OUT, 'favicon.png'));

  console.log('assets written to', OUT);
  for (const f of fs.readdirSync(OUT)) console.log(' -', f);
}

main().catch((e) => { console.error(e); process.exit(1); });
