require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('🔍 KIỂM TRA DATA TRONG MONGODB');
  console.log('═══════════════════════════════════\n');
  
  // Check users
  const users = await prisma.user.findMany({
    select: {
      phone: true,
      email: true,
      fullName: true,
      role: true,
      title: true,
    }
  });
  
  console.log('👥 Tổng số USERS:', users.length);
  console.log('');
  
  for (const u of users) {
    console.log('─────────────────────────────────');
    console.log('📱 SĐT:', u.phone);
    console.log('📧 Email:', u.email);
    console.log('👤 Tên:', u.fullName);
    console.log('🎭 Role:', u.role, '-', u.title);
  }
  
  console.log('\n═══════════════════════════════════');
  
  // Check listings count
  const listingsCount = await prisma.listing.count();
  console.log('\n📍 Listings:', listingsCount);
  
  // Check seller profiles
  const sellerProfiles = await prisma.sellerProfile.findMany({
    include: {
      user: { select: { phone: true, fullName: true } }
    }
  });
  console.log('🏠 Seller Profiles:', sellerProfiles.length);
  
  await prisma.$disconnect();
}

check().catch(console.error);
