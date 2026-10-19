const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Reset rating and reviewCount on all listings
  const updated = await p.listing.updateMany({
    data: { rating: 0, reviewCount: 0 }
  });
  console.log('Da reset rating/reviewCount tren', updated.count, 'tin');
  
  // Verify
  const listings = await p.listing.findMany({ select: { id: true, title: true, rating: true, reviewCount: true } });
  console.log('\nDanh sach tin sau khi reset:');
  listings.forEach(l => console.log('  -', l.title.substring(0, 40), '| rating:', l.rating, '| reviews:', l.reviewCount));
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
