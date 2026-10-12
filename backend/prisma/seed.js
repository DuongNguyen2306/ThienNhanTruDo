const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
};

const getRoleTitle = (role) => {
  const titles = {
    tenant: 'Người thuê',
    seller: 'Chủ đăng tin',
    manager: 'Ban quản lý',
    admin: 'Quản trị viên',
  };
  return titles[role] || role;
};

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.savedListing.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.sellerLead.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();

  // ============================================
  // Create Users
  // ============================================

  const password = await bcrypt.hash('tenant123', 10);
  const sellerPassword = await bcrypt.hash('seller123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // Tenant
  const tenant = await prisma.user.create({
    data: {
      phone: '0918334221',
      password,
      fullName: 'Nguyễn Hà An',
      email: 'ha.nguyen@email.vn',
      role: 'tenant',
      initials: getInitials('Nguyễn Hà An'),
      title: getRoleTitle('tenant'),
    },
  });

  // Seller
  const seller = await prisma.user.create({
    data: {
      phone: '0903112334',
      password: sellerPassword,
      fullName: 'Trần Minh Anh',
      email: 'hello@minhanh.vn',
      role: 'seller',
      initials: getInitials('Trần Minh Anh'),
      title: getRoleTitle('seller'),
    },
  });

  // Pending Seller (tenant with pending seller request)
  const pendingSeller = await prisma.user.create({
    data: {
      phone: '0933123456',
      password: await bcrypt.hash('pending123', 10),
      fullName: 'Phạm Thu Vy',
      email: 'vy.pham@email.vn',
      role: 'tenant',
      initials: getInitials('Phạm Thu Vy'),
      title: getRoleTitle('tenant'),
    },
  });

  // Manager
  const manager = await prisma.user.create({
    data: {
      phone: '0909000111',
      password: managerPassword,
      fullName: 'Lê Mai Linh',
      email: 'mai.linh@verirent.vn',
      role: 'manager',
      initials: getInitials('Lê Mai Linh'),
      title: getRoleTitle('manager'),
    },
  });

  // Admin
  const admin = await prisma.user.create({
    data: {
      phone: '0908000222',
      password: adminPassword,
      fullName: 'Nguyễn Thảo Nguyên',
      email: 'thao.nguyen@verirent.vn',
      role: 'admin',
      initials: getInitials('Nguyễn Thảo Nguyên'),
      title: getRoleTitle('admin'),
    },
  });

  // Create seller profiles
  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: seller.id,
      idNumber: '079201234567',
      brand: 'Minh Anh Housing',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      docs: JSON.stringify(['cccd_front.jpg', 'cccd_back.jpg', 'business_license.pdf']),
      status: 'active',
      trustScore: 4.8,
      responseRate: 98,
      submittedAt: new Date('2024-01-15'),
      reviewedAt: new Date('2024-01-17'),
      reviewerId: admin.id,
    },
  });

  const pendingProfile = await prisma.sellerProfile.create({
    data: {
      userId: pendingSeller.id,
      idNumber: '079209999999',
      address: '456 Đường XYZ, Quận Bình Thạnh, TP.HCM',
      status: 'pending',
      submittedAt: new Date(),
    },
  });

  console.log('✅ Created users');

  // ============================================
  // Create Listings
  // ============================================

  const listings = [
    {
      sellerId: seller.id,
      title: 'Phòng trọ cao cấp full nội thất Quận 1',
      roomType: 'phong-tro',
      houseNumber: '45/3',
      street: 'Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP Hồ Chí Minh',
      lat: 10.7755,
      lng: 106.7009,
      rent: 8500000,
      depositMonths: 1,
      electricity: 3500,
      electricityType: 'state',
      water: 15000,
      waterType: 'person',
      internet: 250000,
      sanitation: 50000,
      area: 25,
      direction: 'east',
      floor: 3,
      totalFloors: 5,
      furniture: true,
      pets: false,
      vacantNow: true,
      verified: true,
      vip: true,
      highTrust: true,
      status: 'active',
      views: 1250,
      rating: 4.7,
      reviewCount: 23,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      ]),
      amenities: JSON.stringify(['wifi', ' dieu-hoa', ' may-giat', ' tu-lanh', ' gac-lung', ' chung-chu']),
      roadWidth: 4,
      carAccess: true,
      truckAccess: false,
    },
    {
      sellerId: seller.id,
      title: 'Chung cư mini view đẹp gần metro Quận 7',
      roomType: 'chung-cu-mini',
      houseNumber: '12',
      street: 'Đào Duy Từ',
      ward: 'Tân Quy',
      district: 'Quận 7',
      city: 'TP Hồ Chí Minh',
      lat: 10.7415,
      lng: 106.7230,
      rent: 12000000,
      depositMonths: 2,
      electricity: 4000,
      electricityType: 'business',
      water: 10000,
      waterType: 'unit',
      internet: 300000,
      area: 35,
      direction: 'south',
      floor: 6,
      totalFloors: 8,
      furniture: true,
      pets: true,
      vacantNow: true,
      verified: true,
      vip: false,
      highTrust: false,
      status: 'active',
      views: 890,
      rating: 4.5,
      reviewCount: 15,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      ]),
      amenities: JSON.stringify(['wifi', ' dieu-hoa', ' may-giat', ' tu-lanh', ' cho-dau-xe', ' camera']),
      roadWidth: 6,
      carAccess: true,
      truckAccess: true,
    },
    {
      sellerId: seller.id,
      title: 'Nhà trọ sạch sẽ gần chợ Bến Thành',
      roomType: 'nha-tro',
      houseNumber: '78',
      street: 'Phan Chu Trinh',
      ward: 'Phường 12',
      district: 'Quận 10',
      city: 'TP Hồ Chí Minh',
      lat: 10.7634,
      lng: 106.6834,
      rent: 4500000,
      depositMonths: 1,
      electricity: 3000,
      electricityType: 'state',
      water: 10000,
      waterType: 'person',
      area: 18,
      direction: 'north',
      floor: 1,
      totalFloors: 3,
      furniture: false,
      pets: false,
      vacantNow: true,
      verified: false,
      vip: false,
      highTrust: false,
      status: 'active',
      views: 456,
      rating: 4.0,
      reviewCount: 8,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      ]),
      amenities: JSON.stringify(['wifi', ' cho-dau-xe']),
      roadWidth: 3,
      carAccess: false,
      truckAccess: false,
    },
    {
      sellerId: seller.id,
      title: 'Căn hộ cao cấp 2PN full nội thất Quận Phú Nhuận',
      roomType: 'can-ho',
      houseNumber: '199',
      street: 'Nguyễn Trọng Tuyển',
      ward: 'Phường 15',
      district: 'Phú Nhuận',
      city: 'TP Hồ Chí Minh',
      lat: 10.7955,
      lng: 106.6789,
      rent: 22000000,
      depositMonths: 2,
      electricity: 4500,
      electricityType: 'business',
      water: 15000,
      waterType: 'unit',
      internet: 500000,
      managementFee: 1500000,
      area: 65,
      direction: 'northeast',
      floor: 12,
      totalFloors: 20,
      furniture: true,
      pets: true,
      vacantNow: true,
      availableFrom: '2026-10-01',
      verified: true,
      vip: true,
      highTrust: true,
      status: 'active',
      views: 2100,
      rating: 4.9,
      reviewCount: 42,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      ]),
      amenities: JSON.stringify(['wifi', ' dieu-hoa', ' may-giat', ' tu-lanh', ' ho-boi', ' phong-gym', ' san-thuong']),
      roadWidth: 10,
      carAccess: true,
      truckAccess: true,
    },
    // Pending listings
    {
      sellerId: seller.id,
      title: 'Phòng trọ mới Quận Bình Tân',
      roomType: 'phong-tro',
      houseNumber: '55',
      street: 'Liên khu 4-5',
      ward: 'Bình Hưng Hòa',
      district: 'Bình Tân',
      city: 'TP Hồ Chí Minh',
      lat: 10.7355,
      lng: 106.6123,
      rent: 5500000,
      depositMonths: 1,
      electricity: 3500,
      electricityType: 'state',
      water: 12000,
      waterType: 'person',
      area: 22,
      direction: 'west',
      floor: 2,
      totalFloors: 4,
      furniture: true,
      pets: false,
      vacantNow: true,
      verified: false,
      vip: false,
      highTrust: false,
      status: 'pending',
      views: 0,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      ]),
      amenities: JSON.stringify(['wifi', ' dieu-hoa']),
    },
  ];

  for (const listing of listings) {
    await prisma.listing.create({ data: listing });
  }

  console.log('✅ Created listings');

  // ============================================
  // Create Reviews
  // ============================================

  const listing1 = await prisma.listing.findFirst({ where: { title: { contains: 'Quận 1' } } });
  
  if (listing1) {
    await prisma.review.createMany({
      data: [
        {
          listingId: listing1.id,
          authorId: tenant.id,
          score: 5,
          photoMatch: 5,
          landlord: 5,
          security: 4,
          hygiene: 5,
          text: 'Phòng rất đẹp như hình, chủ nhà thân thiện, vị trí tiện lợi. Đã ở được 6 tháng rất hài lòng!',
          verifiedStay: true,
        },
        {
          listingId: listing1.id,
          authorId: pendingSeller.id,
          score: 4,
          photoMatch: 4,
          landlord: 4,
          security: 4,
          hygiene: 4,
          text: 'Phòng tốt, gần trung tâm. Giá hơi cao so với khu vực nhưng xứng đáng.',
          verifiedStay: true,
        },
      ],
    });
  }

  console.log('✅ Created reviews');

  // ============================================
  // Create System Config
  // ============================================

  await prisma.systemConfig.createMany({
    data: [
      { key: 'roomTypes', value: JSON.stringify(['phong-tro', 'chung-cu-mini', 'nha-tro', 'can-ho']) },
      { key: 'amenities', value: JSON.stringify(['wifi', 'dieu-hoa', 'may-giat', 'tu-lanh', 'gac-lung', 'chung-chu', 'cho-dau-xe', 'camera', 'ho-boi', 'phong-gym', 'san-thuong']) },
      { key: 'packages', value: JSON.stringify([
        { id: 'basic', name: 'Gói Cơ Bản', price: 0, days: 30, features: ['5 tin đăng', 'Hỗ trợ email'] },
        { id: 'standard', name: 'Gói Tiêu Chuẩn', price: 99000, days: 30, features: ['20 tin đăng', 'Hỗ trợ ưu tiên', 'Báo cáo thống kê'] },
        { id: 'premium', name: 'Gói Cao Cấp', price: 199000, days: 30, features: ['Không giới hạn tin', 'Ghim tin VIP', 'Hỗ trợ 24/7', 'Analytics nâng cao'] },
      ]) },
      { key: 'appName', value: JSON.stringify('Thiên Nhãn Trú Đồ') },
      { key: 'supportPhone', value: JSON.stringify('1900 1234') },
    ],
  });

  console.log('✅ Created system config');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('─'.repeat(50));
  console.log('Tenant:  0918334221 / tenant123');
  console.log('Seller:  0903112334 / seller123');
  console.log('Manager: 0909000111 / manager123');
  console.log('Admin:   0908000222 / admin123');
  console.log('─'.repeat(50));
  console.log('OTP Code: 123456 (for all accounts)\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
