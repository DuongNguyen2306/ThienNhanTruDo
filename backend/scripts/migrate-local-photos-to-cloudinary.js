// Migrate legacy listing photos (http://localhost:3005/uploads/... or /uploads/...)
// to Cloudinary and rewrite Listing.photos with the new secure URLs.
//
//   node scripts/migrate-local-photos-to-cloudinary.js          # dry run
//   node scripts/migrate-local-photos-to-cloudinary.js --apply  # write changes
//
// A backup of every modified listing's original `photos` value is written to
// scripts/backup-photos-<timestamp>.json before any update.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const cloudinaryService = require('../src/services/cloudinaryService');

const APPLY = process.argv.includes('--apply');
const UPLOADS = path.join(__dirname, '..', 'uploads');
const LEGACY_RE = /(?:^|https?:\/\/[^/]+)\/uploads\/(.+)$/;
const prisma = new PrismaClient();

function findLocalFile(rel, sellerId) {
  const clean = decodeURIComponent(rel.split(/[?#]/)[0]);
  const name = path.basename(clean);
  const candidates = [
    path.join(UPLOADS, clean),
    path.join(UPLOADS, sellerId || '', name),
    path.join(UPLOADS, name),
  ];
  return candidates.find((p) => p.startsWith(UPLOADS) && fs.existsSync(p) && fs.statSync(p).isFile());
}

(async () => {
  const listings = await prisma.listing.findMany({ select: { id: true, title: true, sellerId: true, photos: true } });
  const backup = listings
    .filter((l) => typeof l.photos === 'string' && /\/uploads\//.test(l.photos))
    .map((l) => ({ id: l.id, photos: l.photos }));
  if (APPLY && backup.length) {
    const out = path.join(__dirname, `backup-photos-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(backup, null, 2));
    console.log('Backup written:', out);
  }
  let migrated = 0;
  let missing = 0;

  for (const l of listings) {
    let photos;
    try { photos = JSON.parse(l.photos || '[]'); } catch { continue; }
    if (!Array.isArray(photos) || !photos.some((u) => typeof u === 'string' && LEGACY_RE.test(u))) continue;

    const next = [];
    for (const url of photos) {
      const m = typeof url === 'string' && url.match(LEGACY_RE);
      if (!m) { next.push(url); continue; }
      const file = findLocalFile(m[1], l.sellerId);
      if (!file) {
        console.warn(`  [missing] ${l.title} | ${url}`);
        missing += 1;
        continue; // drop dead URL: it can never load
      }
      if (!APPLY) {
        console.log(`  [dry] ${l.title} | ${path.relative(UPLOADS, file)}`);
        next.push(url);
        continue;
      }
      const res = await cloudinaryService.uploadBuffer(fs.readFileSync(file), {
        folder: cloudinaryService.buildFolder('listings', l.sellerId),
      });
      console.log(`  [ok] ${l.title} | ${path.basename(file)} -> ${res.secure_url}`);
      next.push(res.secure_url);
      migrated += 1;
    }

    if (APPLY) {
      await prisma.listing.update({ where: { id: l.id }, data: { photos: JSON.stringify(next) } });
    }
  }

  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: listings=${backup.length} migrated=${migrated} missing=${missing}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
