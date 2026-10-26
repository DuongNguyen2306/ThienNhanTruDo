const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.listing.findMany({
    select: { id: true, title: true, photos: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });
  for (const r of rows) {
    console.log('---');
    console.log(r.id, '|', r.title, '|', r.updatedAt);
    console.log(r.photos);
  }
  await p.$disconnect();
})();
