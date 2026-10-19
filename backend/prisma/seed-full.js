/**
 * Seed Script - Tạo data mẫu cho THIÊN NHÃN TRÚ ĐỒ
 * Chạy: node prisma/seed-full.js
 */

require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu seed data...\n');

  // Xóa data cũ (tùy chọn - uncomment nếu muốn reset)
  // await prisma.auditLog.deleteMany();
  // await prisma.savedListing.deleteMany();
  // await prisma.appointment.deleteMany();
  // await prisma.review.deleteMany();
  // await prisma.listing.deleteMany();
  // await prisma.sellerProfile.deleteMany();
  // await prisma.user.deleteMany();

  const password = await bcrypt.hash('123456', 10);

  // ========================================
  // 1. TENANT - Người thuê
  // ========================================
  const tenant1 = await prisma.user.upsert({
    where: { phone: '0901000001' },
    update: {},
    create: {
      phone: '0901000001',
      password: password,
      fullName: 'Nguyễn Văn A',
      email: 'nguyenvana@email.com',
      role: 'tenant',
      initials: 'NA',
      title: 'Người thuê',
    },
  });

  const tenant2 = await prisma.user.upsert({
    where: { phone: '0901000002' },
    update: {},
    create: {
      phone: '0901000002',
      password: password,
      fullName: 'Trần Thị B',
      email: 'tranthib@email.com',
      role: 'tenant',
      initials: 'TB',
      title: 'Người thuê',
    },
  });

  const tenant3 = await prisma.user.upsert({
    where: { phone: '0901000003' },
    update: {},
    create: {
      phone: '0901000003',
      password: password,
      fullName: 'Lê Minh C',
      email: 'leminhc@email.com',
      role: 'tenant',
      initials: 'LC',
      title: 'Người thuê',
    },
  });

  console.log('✅ Đã tạo TENANT users:');
  console.log('   - nguyenvana@email.com / 123456');
  console.log('   - tranthib@email.com / 123456');
  console.log('   - leminhc@email.com / 123456\n');

  // ========================================
  // 2. SELLER - Chủ đăng tin
  // ========================================
  const seller1 = await prisma.user.upsert({
    where: { phone: '0902000001' },
    update: {},
    create: {
      phone: '0902000001',
      password: password,
      fullName: 'Phạm Đình Sơn',
      email: 'phamdinhson@email.com',
      role: 'seller',
      initials: 'PS',
      title: 'Chủ đăng tin',
    },
  });

  const seller2 = await prisma.user.upsert({
    where: { phone: '0902000002' },
    update: {},
    create: {
      phone: '0902000002',
      password: password,
      fullName: 'Hoàng Mai Lan',
      email: 'hoangmailan@email.com',
      role: 'seller',
      initials: 'HL',
      title: 'Chủ đăng tin',
    },
  });

  const seller3 = await prisma.user.upsert({
    where: { phone: '0902000003' },
    update: {},
    create: {
      phone: '0902000003',
      password: password,
      fullName: 'Đặng Quốc Bảo',
      email: 'dangquocbao@email.com',
      role: 'seller',
      initials: 'DB',
      title: 'Chủ đăng tin',
    },
  });

  // Tạo Seller Profile cho mỗi seller
  await prisma.sellerProfile.upsert({
    where: { userId: seller1.id },
    update: {},
    create: {
      userId: seller1.id,
      idNumber: '079201234567',
      brand: 'Sơn Land',
      address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
      status: 'active',
      responseRate: 95,
      trustScore: 4.5,
    },
  });

  await prisma.sellerProfile.upsert({
    where: { userId: seller2.id },
    update: {},
    create: {
      userId: seller2.id,
      idNumber: '079208765432',
      brand: 'Mai Lan Realty',
      address: '456 Lê Lợi, Quận 3, TP.HCM',
      status: 'active',
      responseRate: 88,
      trustScore: 4.2,
    },
  });

  await prisma.sellerProfile.upsert({
    where: { userId: seller3.id },
    update: {},
    create: {
      userId: seller3.id,
      idNumber: '079209876543',
      brand: 'Bảo House',
      address: '789 Pasteur, Quận 1, TP.HCM',
      status: 'active',
      responseRate: 92,
      trustScore: 4.8,
    },
  });

  console.log('✅ Đã tạo SELLER users (và profiles):');
  console.log('   - phamdinhson@email.com / 123456 (status: active)');
  console.log('   - hoangmailan@email.com / 123456 (status: active)');
  console.log('   - dangquocbao@email.com / 123456 (status: active)\n');

  // ========================================
  // 3. MANAGER - Ban quản lý
  // ========================================
  const manager1 = await prisma.user.upsert({
    where: { phone: '0903000001' },
    update: {},
    create: {
      phone: '0903000001',
      password: password,
      fullName: 'Vũ Thanh Hà',
      email: 'vuthanhha@email.com',
      role: 'manager',
      initials: 'VH',
      title: 'Ban quản lý',
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { phone: '0903000002' },
    update: {},
    create: {
      phone: '0903000002',
      password: password,
      fullName: 'Ngô Thu Hương',
      email: 'ngothuhuong@email.com',
      role: 'manager',
      initials: 'NH',
      title: 'Ban quản lý',
    },
  });

  console.log('✅ Đã tạo MANAGER users:');
  console.log('   - vuthanhha@email.com / 123456');
  console.log('   - ngothuhuong@email.com / 123456\n');

  // ========================================
  // 4. ADMIN - Quản trị viên
  // ========================================
  const admin1 = await prisma.user.upsert({
    where: { phone: '0904000001' },
    update: {},
    create: {
      phone: '0904000001',
      password: password,
      fullName: 'Lê Hoàng Nam',
      email: 'lehoangnam@email.com',
      role: 'admin',
      initials: 'LN',
      title: 'Quản trị viên',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { phone: '0904000002' },
    update: {},
    create: {
      phone: '0904000002',
      password: password,
      fullName: 'Trần Minh Đức',
      email: 'tranminhduc@email.com',
      role: 'admin',
      initials: 'TD',
      title: 'Quản trị viên',
    },
  });

  console.log('✅ Đã tạo ADMIN users:');
  console.log('   - lehoangnam@email.com / 123456');
  console.log('   - tranminhduc@email.com / 123456\n');

  // ========================================
  // 5. TẠO LISTINGS MẪU
  // ========================================
  const listingData = [
    {
      id: 'listing-001',
      sellerId: seller1.id,
      title: 'Phòng trọ cao cấp Quận 1 - View đẹp',
      roomType: 'phong-tro',
      houseNumber: '123',
      street: 'Nguyễn Trãi',
      ward: 'Phường 2',
      district: 'Quận 1',
      city: 'TP Hồ Chí Minh',
      lat: 10.7765,
      lng: 106.6955,
      rent: 5500000,
      depositMonths: 1,
      electricity: 3500,
      electricityType: 'state',
      water: 10000,
      waterType: 'person',
      area: 25,
      direction: 'east',
      floor: 3,
      totalFloors: 5,
      furniture: true,
      pets: false,
      availableFrom: '2026-11-01',
      vacantNow: true,
      verified: true,
      vip: true,
      highTrust: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
      ]),
      amenities: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'gac-lung', 'cho-dau-xe', 'camera']),
      views: 245,
      rating: 4.5,
      reviewCount: 12,
    },
    {
      id: 'listing-002',
      sellerId: seller2.id,
      title: 'Chung cư mini Quận 3 - Gần trung tâm',
      roomType: 'chung-cu-mini',
      houseNumber: '456',
      street: 'Lê Lợi',
      ward: 'Phường 4',
      district: 'Quận 3',
      city: 'TP Hồ Chí Minh',
      lat: 10.7802,
      lng: 106.6890,
      rent: 7500000,
      depositMonths: 2,
      electricity: 4000,
      electricityType: 'business',
      water: 15000,
      waterType: 'person',
      area: 35,
      direction: 'south',
      floor: 2,
      totalFloors: 6,
      furniture: true,
      pets: false,
      availableFrom: '2026-10-20',
      vacantNow: true,
      verified: true,
      vip: false,
      highTrust: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
      ]),
      amenities: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'cho-dau-xe', 'ho-boi', 'phong-gym']),
      views: 189,
      rating: 4.2,
      reviewCount: 8,
    },
    {
      id: 'listing-003',
      sellerId: seller3.id,
      title: 'Căn hộ cao cấp Bitexco - Full nội thất',
      roomType: 'can-ho',
      houseNumber: '789',
      street: 'Hàm Nghi',
      ward: 'Phường Nguyễn Thái Bình',
      district: 'Quận 1',
      city: 'TP Hồ Chí Minh',
      lat: 10.7721,
      lng: 106.7042,
      rent: 15000000,
      depositMonths: 3,
      electricity: 5000,
      electricityType: 'business',
      water: 20000,
      waterType: 'unit',
      internet: 250000,
      managementFee: 500000,
      area: 65,
      direction: 'northeast',
      floor: 15,
      totalFloors: 20,
      furniture: true,
      pets: true,
      availableFrom: '2026-11-15',
      vacantNow: true,
      verified: true,
      vip: true,
      highTrust: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
      ]),
      amenities: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'ho-boi', 'phong-gym', 'san-thuong', 'camera', 'cho-dau-xe']),
      views: 567,
      rating: 4.8,
      reviewCount: 34,
    },
    {
      id: 'listing-004',
      sellerId: seller1.id,
      title: 'Nhà trọ Quận 5 - Giá sinh viên',
      roomType: 'nha-tro',
      houseNumber: '321',
      street: 'Trần Hưng Đạo',
      ward: 'Phường 2',
      district: 'Quận 5',
      city: 'TP Hồ Chí Minh',
      lat: 10.7550,
      lng: 106.6830,
      rent: 2800000,
      depositMonths: 1,
      electricity: 3000,
      electricityType: 'state',
      water: 8000,
      waterType: 'person',
      area: 18,
      direction: 'west',
      floor: 1,
      totalFloors: 3,
      furniture: false,
      pets: false,
      availableFrom: '2026-10-15',
      vacantNow: true,
      verified: false,
      vip: false,
      highTrust: false,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
      ]),
      amenities: JSON.stringify(['wifi', 'dieu-hoa', 'gac-lung']),
      views: 89,
      rating: 3.8,
      reviewCount: 5,
    },
    {
      id: 'listing-005',
      sellerId: seller2.id,
      title: 'Phòng trọ mới Quận 7 - Khu phú Mỹ',
      roomType: 'phong-tro',
      houseNumber: '555',
      street: 'Đại lộ Nguyễn Lương Bằng',
      ward: 'Phú Mỹ',
      district: 'Quận 7',
      city: 'TP Hồ Chí Minh',
      lat: 10.7281,
      lng: 106.7158,
      rent: 4200000,
      depositMonths: 1,
      electricity: 3500,
      electricityType: 'state',
      water: 10000,
      waterType: 'person',
      area: 22,
      direction: 'east',
      floor: 4,
      totalFloors: 6,
      furniture: true,
      pets: false,
      availableFrom: '2026-11-01',
      vacantNow: true,
      verified: true,
      vip: false,
      highTrust: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
      ]),
      amenities: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'cho-dau-xe', 'camera']),
      views: 156,
      rating: 4.0,
      reviewCount: 9,
    },
  ];

  for (const listing of listingData) {
    const existing = await prisma.listing.findFirst({
      where: { title: listing.title },
    });

    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: listing,
      });
    } else {
      await prisma.listing.create({ data: listing });
    }
  }

  console.log('✅ Đã tạo 5 LISTINGS mẫu\n');

  // ========================================
  // 6. TẠO SAVED LISTINGS CHO TENANT
  // ========================================
  const savedListings = await prisma.listing.findMany({ take: 3 });

  for (const listing of savedListings) {
    await prisma.savedListing.upsert({
      where: {
        userId_listingId: {
          userId: tenant1.id,
          listingId: listing.id,
        },
      },
      update: {},
      create: {
        userId: tenant1.id,
        listingId: listing.id,
      },
    });
  }

  console.log('✅ Đã tạo SAVED LISTINGS cho tenant1\n');

  // ========================================
  // 7. TẠO APPOINTMENTS
  // ========================================
  const firstListing = await prisma.listing.findFirst();

  if (firstListing) {
    // Delete existing appointments first to avoid unique constraint issues
    await prisma.appointment.deleteMany({
      where: {
        OR: [
          { listingId: firstListing.id, tenantId: tenant1.id },
          { listingId: firstListing.id, tenantId: tenant2.id },
        ],
      },
    });

    await prisma.appointment.create({
      data: {
        listingId: firstListing.id,
        tenantId: tenant1.id,
        when: new Date('2026-10-20T14:00:00Z'),
        status: 'pending',
        phone: '0901000001',
        note: 'Muốn xem phòng vào chiều Thứ 2',
      },
    });

    await prisma.appointment.create({
      data: {
        listingId: firstListing.id,
        tenantId: tenant2.id,
        when: new Date('2026-10-22T10:00:00Z'),
        status: 'confirmed',
        phone: '0901000002',
        note: 'Hẹn xem phòng buổi sáng',
      },
    });
  }

  console.log('✅ Đã tạo APPOINTMENTS mẫu\n');

  // ========================================
  // 8. TẠO SYSTEM CONFIG
  // ========================================
  await prisma.systemConfig.upsert({
    where: { key: 'roomTypes' },
    update: {},
    create: {
      key: 'roomTypes',
      value: JSON.stringify(['phong-tro', 'chung-cu-mini', 'nha-tro', 'can-ho']),
      description: 'Loại phòng cho thuê',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'amenities' },
    update: {},
    create: {
      key: 'amenities',
      value: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'gac-lung', 'chung-chu', 'cho-dau-xe', 'camera', 'ho-boi', 'phong-gym', 'san-thuong']),
      description: 'Tiện ích phòng',
    },
  });

  console.log('✅ Đã tạo SYSTEM CONFIG\n');

  console.log('═══════════════════════════════════════════════');
  console.log('        🎉 SEED HOÀN TẤT! 🎉');
  console.log('═══════════════════════════════════════════════\n');

  console.log('📋 TỔNG KẾT:\n');
  console.log('👤 TENANT (Người thuê):');
  console.log('   1. nguyenvana@email.com / 123456');
  console.log('   2. tranthib@email.com / 123456');
  console.log('   3. leminhc@email.com / 123456\n');

  console.log('🏠 SELLER (Chủ đăng tin):');
  console.log('   1. phamdinhson@email.com / 123456 [ACTIVE]');
  console.log('   2. hoangmailan@email.com / 123456 [ACTIVE]');
  console.log('   3. dangquocbao@email.com / 123456 [ACTIVE]\n');

  console.log('👔 MANAGER (Ban quản lý):');
  console.log('   1. vuthanhha@email.com / 123456');
  console.log('   2. ngothuhuong@email.com / 123456\n');

  console.log('🔐 ADMIN (Quản trị viên):');
  console.log('   1. lehoangnam@email.com / 123456');
  console.log('   2. tranminhduc@email.com / 123456\n');

  console.log('📍 OTP Demo: 123456 (cho tất cả tài khoản)\n');

  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
