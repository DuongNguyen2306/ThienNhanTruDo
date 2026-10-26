const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.user.findMany({
    where: { role: 'seller' },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  console.log('=== sellers ===');
  sellers.forEach((s) => console.log(s.id, s.email, s.phone));

  for (const s of sellers) {
    const ls = await prisma.listing.findMany({
      where: { sellerId: s.id },
      select: { id: true, title: true, photos: true, image: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    if (!ls.length) continue;
    console.log('\n### seller', s.id, s.email);
    ls.forEach((l) => {
      console.log(' -', l.id, '|', l.status, '|', l.updatedAt, '|', l.title);
      console.log('   image:', l.image);
      console.log('   photos:', l.photos);
    });
  }
}

main().finally(() => prisma.$disconnect());
