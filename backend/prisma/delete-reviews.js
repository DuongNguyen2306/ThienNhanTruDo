const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Xóa tất cả reviews
  const deleted = await prisma.review.deleteMany({});
  console.log('Da xoa', deleted.count, 'danh gia');
  
  // Reset reviewCount trên tất cả listings
  const updated = await prisma.listing.updateMany({
    data: { reviewCount: 0 }
  });
  console.log('Da reset reviewCount tren', updated.count, 'tin');
  
  // Xem lại số lượng
  const count = await prisma.review.count();
  console.log('So danh gia con lai:', count);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
