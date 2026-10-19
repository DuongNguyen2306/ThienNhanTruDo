const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Tao Test Data cho Review System ===\n');

  // 1. Lay test tenant (hoac tao neu chua co)
  let tenant = await prisma.user.findFirst({
    where: { role: 'tenant' },
    include: { sellerProfile: true }
  });

  if (!tenant) {
    // Lay mot listing de lay sellerId
    const listing = await prisma.listing.findFirst();
    if (!listing) {
      console.log('ERROR: Khong co listing trong he thong!');
      return;
    }

    // Tao test tenant
    tenant = await prisma.user.create({
      data: {
        phone: '0999999999',
        password: '$2b$10$test', // Fake hash, khong dung de login
        fullName: 'Test Tenant',
        role: 'tenant',
        email: 'test-tenant@example.com',
      }
    });
    console.log('Da tao test tenant:', tenant.id);
  } else {
    console.log('Tim thay test tenant:', tenant.id, '-', tenant.fullName);
  }

  // 2. Lay mot listing de test
  const listing = await prisma.listing.findFirst({
    where: { status: 'active' }
  });

  if (!listing) {
    console.log('ERROR: Khong co listing active!');
    return;
  }
  console.log('Listing de test:', listing.id, '-', listing.title);

  // 3. Kiem tra appointment da ton tai chua
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      listingId: listing.id,
    }
  });

  if (existingAppointment) {
    console.log('Appointment da ton tai, status:', existingAppointment.status);
    
    // Update status thanh completed
    if (existingAppointment.status !== 'completed') {
      await prisma.appointment.update({
        where: { id: existingAppointment.id },
        data: { status: 'completed' }
      });
      console.log('Da update appointment thanh completed');
    }
  } else {
    // Tao appointment da completed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const appointment = await prisma.appointment.create({
      data: {
        listingId: listing.id,
        tenantId: tenant.id,
        when: yesterday,
        status: 'completed',
        phone: tenant.phone,
        note: 'Test appointment for review',
      }
    });
    console.log('Da tao completed appointment:', appointment.id);
  }

  // 4. Kiem tra xem tenant da review chua
  const existingReview = await prisma.review.findFirst({
    where: {
      authorId: tenant.id,
      listingId: listing.id,
    }
  });

  if (existingReview) {
    console.log('Tenant da co review, xoa de test lai...');
    await prisma.review.delete({ where: { id: existingReview.id } });
    console.log('Da xoa review cu');
  }

  // 5. Reset listing rating
  await prisma.listing.update({
    where: { id: listing.id },
    data: { rating: 0, reviewCount: 0 }
  });
  console.log('Da reset rating/reviewCount cua listing');

  console.log('\n=== Test Data Ready ===');
  console.log('Tenant ID:', tenant.id);
  console.log('Tenant Phone:', tenant.phone);
  console.log('Listing ID:', listing.id);
  console.log('Role: tenant');
  console.log('\nDang nhap voi phone nay de test review!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
