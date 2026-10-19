const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const testPhone = '0909123456';
  const testPassword = 'test123';
  const testPasswordHash = await bcrypt.hash(testPassword, 10);

  // Check if user exists
  let user = await p.user.findFirst({ where: { phone: testPhone } });

  if (user) {
    console.log('Updating existing test user:', user.fullName);
    user = await p.user.update({
      where: { id: user.id },
      data: { password: testPasswordHash }
    });
  } else {
    console.log('Creating new test user');
    user = await p.user.create({
      data: {
        phone: testPhone,
        password: testPasswordHash,
        fullName: 'Nguyen Van Test',
        role: 'tenant',
        email: 'test@example.com',
        initials: 'NV',
        title: 'Người thuê',
      }
    });
  }

  console.log('\n=== TEST CREDENTIALS ===');
  console.log('Phone:', testPhone);
  console.log('Password:', testPassword);
  console.log('Role: tenant');
  console.log('User ID:', user.id);

  // Create confirmed appointment for first listing
  const listing = await p.listing.findFirst({ where: { status: 'active' } });
  if (listing) {
    // Remove existing appointment for this tenant
    await p.appointment.deleteMany({
      where: { tenantId: user.id, listingId: listing.id }
    });
    
    // Create CONFIRMED appointment (seller da xac nhan, co the danh gia)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appt = await p.appointment.create({
      data: {
        listingId: listing.id,
        tenantId: user.id,
        when: tomorrow,
        status: 'confirmed',  // Seller da xac nhan -> co the danh gia
        phone: testPhone,
        note: 'Test appointment - seller confirmed',
      }
    });
    
    // Remove any existing review
    await p.review.deleteMany({
      where: { authorId: user.id, listingId: listing.id }
    });
    
    // Reset listing rating
    await p.listing.update({
      where: { id: listing.id },
      data: { rating: 0, reviewCount: 0 }
    });
    
    console.log('\n=== TEST DATA ===');
    console.log('Listing ID:', listing.id);
    console.log('Listing Title:', listing.title);
    console.log('Appointment ID:', appt.id);
    console.log('Appointment Status: CONFIRMED (da duoc seller xac nhan)');
  }

  console.log('\n✅ San sang test! Seller xac nhan lich hen -> Tenant co the danh gia ngay');
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
