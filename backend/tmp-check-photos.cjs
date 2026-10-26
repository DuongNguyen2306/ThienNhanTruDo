const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const p = new PrismaClient();

const UPLOADS = path.join(__dirname, 'uploads');

(async () => {
  const rows = await p.listing.findMany({ select: { id: true, title: true, photos: true } });
  const missing = [];
  let total = 0;
  for (const r of rows) {
    let a = [];
    try { a = JSON.parse(r.photos || '[]'); } catch (e) { /* ignore */ }
    for (const u of a) {
      if (!/\/uploads\//.test(u)) continue;
      total += 1;
      const file = u.split('/uploads/')[1].split('/').pop();
      const local = path.join(UPLOADS, file);
      const alsoDir = path.join(UPLOADS, u.split('/uploads/')[1].split('/')[0], file);
      if (!fs.existsSync(local) && !fs.existsSync(alsoDir)) {
        missing.push({ listing: r.id, title: r.title, url: u });
      }
    }
  }
  console.log('upload URLs in DB:', total);
  console.log('MISSING locally:', missing.length);
  for (const m of missing) console.log('  -', m.title, '|', m.url.split('/').pop());
  await p.$disconnect();
})();
