// Script để seed dữ liệu mẫu vào MongoDB cho Manager Dashboard
// Chạy: cd backend && node prisma/seed-manager-data.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu...')

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10)
    console.log('🔐 Password hash:', hashedPassword.substring(0, 30) + '...')

    // 1. Tạo Manager user
    console.log('\n👤 Tạo Manager...')
    const manager = await prisma.user.upsert({
      where: { phone: '0900000001' },
      update: { password: hashedPassword },
      create: {
        phone: '0900000001',
        email: 'manager@thiennhan.vn',
        password: hashedPassword,
        fullName: 'Nguyễn Văn Manager',
        role: 'manager',
        initials: 'NVM',
      },
    })
    console.log('✅ Manager:', manager.fullName)

    // 2. Tạo Seller users với listings pending
    console.log('\n🏠 Tạo Sellers và Listings...')
    
    const sellersData = [
      {
        phone: '0900111222',
        name: 'Trần Văn Nam',
        listings: [
          {
            title: 'Phòng trọ cao cấp Quận 1 - View sông',
            roomType: 'phong-tro',
            district: 'Quận 1',
            city: 'TP Hồ Chí Minh',
            street: 'Đại lộ Võ Văn Kiệt',
            rent: 8500000,
            area: 35,
            image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            photos: JSON.stringify([
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
            ]),
            amenities: JSON.stringify(['Điều hòa', 'Máy giặt', 'WiFi', 'Giường', 'Tủ lạnh', 'Tủ quần áo']),
            furniture: true,
          },
          {
            title: 'Căn hộ mini Bình Thạnh - Gần metro',
            roomType: 'chung-cu-mini',
            district: 'Bình Thạnh',
            city: 'TP Hồ Chí Minh',
            street: 'Đường Xô Viết Nghệ Tĩnh',
            rent: 12000000,
            area: 45,
            image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            photos: JSON.stringify([
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
            ]),
            amenities: JSON.stringify(['Điều hòa', 'WiFi', 'Giường', 'Bàn làm việc']),
            furniture: true,
          },
        ],
      },
      {
        phone: '0900333444',
        name: 'Lê Thị Hương',
        listings: [
          {
            title: 'Studio Gò Vấp view city - Full nội thất',
            roomType: 'can-ho',
            district: 'Gò Vấp',
            city: 'TP Hồ Chí Minh',
            street: 'Phạm Văn Đồng',
            rent: 15000000,
            area: 50,
            image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            photos: JSON.stringify([
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
            ]),
            amenities: JSON.stringify(['Điều hòa', 'Máy giặt', 'WiFi', 'Giường', 'Tủ lạnh', 'Bếp', 'Ban công']),
            furniture: true,
          },
        ],
      },
      {
        phone: '0900555666',
        name: 'Phạm Minh Tuấn',
        listings: [
          {
            title: 'Phòng trọ sinh viên Phú Nhuận - Giá rẻ',
            roomType: 'phong-tro',
            district: 'Phú Nhuận',
            city: 'TP Hồ Chí Minh',
            street: 'Hoàng Văn Thụ',
            rent: 4500000,
            area: 20,
            image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
            photos: JSON.stringify([
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
            ]),
            amenities: JSON.stringify(['Điều hòa', 'WiFi', 'Giường']),
            furniture: true,
          },
          {
            title: 'Nhà trọ Bình Tân - Gần chợ',
            roomType: 'nha-tro',
            district: 'Bình Tân',
            city: 'TP Hồ Chí Minh',
            street: 'Đường số 7',
            rent: 6000000,
            area: 30,
            image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            photos: JSON.stringify([
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
            ]),
            amenities: JSON.stringify(['Máy giặt', 'WiFi', 'Giường', 'Tủ lạnh']),
            furniture: false,
          },
        ],
      },
    ]

    for (const sellerData of sellersData) {
      // Tạo Seller user
      const seller = await prisma.user.upsert({
        where: { phone: sellerData.phone },
        update: { password: hashedPassword },
        create: {
          phone: sellerData.phone,
          email: `${sellerData.phone}@example.com`,
          password: hashedPassword,
          fullName: sellerData.name,
          role: 'seller',
          initials: sellerData.name.split(' ').map(n => n[0]).join('').slice(0, 2),
        },
      })
      console.log('✅ Seller:', seller.fullName)

      // Tạo SellerProfile
      await prisma.sellerProfile.upsert({
        where: { userId: seller.id },
        update: {},
        create: {
          userId: seller.id,
          status: 'active',
          brand: sellerData.name,
          trustScore: Math.random() * 20 + 80,
          responseRate: Math.random() * 20 + 80,
        },
      })

      // Tạo Listings
      for (const listingData of sellerData.listings) {
        const listing = await prisma.listing.create({
          data: {
            sellerId: seller.id,
            title: listingData.title,
            roomType: listingData.roomType,
            district: listingData.district,
            city: listingData.city,
            street: listingData.street,
            rent: listingData.rent,
            area: listingData.area,
            image: listingData.image,
            photos: listingData.photos,
            amenities: listingData.amenities,
            furniture: listingData.furniture,
            status: 'pending', // Trạng thái chờ duyệt
            verified: false,
            vip: false,
            highTrust: false,
            depositMonths: 1,
            pets: false,
            vacantNow: true,
            views: Math.floor(Math.random() * 100),
            reviewCount: 0,
            lat: 10.7769 + (Math.random() - 0.5) * 0.1,
            lng: 106.7009 + (Math.random() - 0.5) * 0.1,
          },
        })
        console.log('  ✅ Listing:', listing.title.substring(0, 40) + '...')
      }
    }

    // 3. Tạo một vài listings đã được duyệt
    console.log('\n✅ Tạo Listings đã duyệt...')
    const approvedListings = [
      {
        title: 'Căn hộ dịch vụ Q4 - Đã Verified',
        rent: 10000000,
        area: 40,
        district: 'Quận 4',
      },
      {
        title: 'Phòng trọ Q7 view Sông Sài Gòn',
        rent: 7500000,
        area: 28,
        district: 'Quận 7',
      },
    ]

    const existingSeller = await prisma.user.findFirst({ where: { role: 'seller' } })
    if (existingSeller) {
      for (const listingData of approvedListings) {
        await prisma.listing.create({
          data: {
            sellerId: existingSeller.id,
            title: listingData.title,
            roomType: 'phong-tro',
            district: listingData.district,
            city: 'TP Hồ Chí Minh',
            rent: listingData.rent,
            area: listingData.area,
            status: 'active',
            verified: true,
            vip: false,
            highTrust: false,
            image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            photos: JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800']),
            amenities: JSON.stringify(['Điều hòa', 'WiFi', 'Giường']),
            furniture: true,
            depositMonths: 1,
            pets: false,
            vacantNow: true,
            views: Math.floor(Math.random() * 200) + 100,
            reviewCount: Math.floor(Math.random() * 10),
          },
        })
        console.log('  ✅ Listing approved:', listingData.title.substring(0, 40))
      }
    }

    // 4. Tạo một vài listings đã bị từ chối
    console.log('\n❌ Tạo Listings đã từ chối...')
    const rejectedListings = [
      {
        title: 'Phòng trọ không có thông tin',
        reason: 'Thông tin không đầy đủ, thiếu ảnh thực tế',
      },
    ]

    if (existingSeller) {
      for (const listingData of rejectedListings) {
        await prisma.listing.create({
          data: {
            sellerId: existingSeller.id,
            title: listingData.title,
            roomType: 'phong-tro',
            district: 'Quận 10',
            city: 'TP Hồ Chí Minh',
            rent: 5000000,
            area: 25,
            status: 'rejected',
            rejectReason: listingData.reason,
            verified: false,
            vip: false,
            highTrust: false,
            image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            furniture: false,
            depositMonths: 1,
            pets: false,
            vacantNow: true,
          },
        })
        console.log('  ✅ Listing rejected:', listingData.title)
      }
    }

    console.log('\n🎉 Seed hoàn tất!')
    console.log('\n📋 Tài khoản test:')
    console.log('   Manager: phone=0900000001, password=password123')
    console.log('   Seller: phone=0900111222, password=password123')

  } catch (error) {
    console.error('❌ Lỗi seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
