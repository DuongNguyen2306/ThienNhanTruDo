// Script để seed dữ liệu yêu cầu Seller vào MongoDB
// Chạy: cd backend && node prisma/seed-seller-requests.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Bắt đầu seed yêu cầu Seller...')

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10)

    // 1. Tạo một số Tenant users muốn nâng cấp thành Seller
    console.log('\n👤 Tạo Tenant users với SellerProfile...')
    
    const tenantsData = [
      { 
        phone: '0911222333', 
        name: 'Võ Thị Mai', 
        email: 'maivothi@gmail.com',
        idNumber: '079201234567', 
        brand: 'Phòng trọ Mai House', 
        address: '123 Đường Nguyễn Văn Linh, P.Bình Trị Đông B, Q.Bình Tân, TP.HCM' 
      },
      { 
        phone: '0922333444', 
        name: 'Ngô Đình Phú', 
        email: 'phungodin@gmail.com',
        idNumber: '079203456789', 
        brand: 'Trọ Phú Homestay', 
        address: '456 Đường Phạm Văn Đồng, P.3, Q.Gò Vấp, TP.HCM' 
      },
      { 
        phone: '0933444555', 
        name: 'Đặng Thị Lan', 
        email: 'landangthi@yahoo.com',
        idNumber: '079205678901', 
        brand: 'Nhà trọ Lan Garden', 
        address: '789 Đường Lê Văn Lương, P.Tân Phong, Q.7, TP.HCM' 
      },
    ]

    for (const tenantData of tenantsData) {
      // Tạo User
      const user = await prisma.user.upsert({
        where: { phone: tenantData.phone },
        update: { 
          password: hashedPassword,
          email: tenantData.email,
        },
        create: {
          phone: tenantData.phone,
          email: tenantData.email,
          password: hashedPassword,
          fullName: tenantData.name,
          role: 'tenant',
          initials: tenantData.name.split(' ').map(n => n[0]).join('').slice(0, 2),
        },
      })
      console.log('✅ User:', user.fullName, '-', user.phone)

      // Tạo SellerProfile với status pending
      const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } })
      if (!existingProfile) {
        const profile = await prisma.sellerProfile.create({
          data: {
            userId: user.id,
            status: 'pending', // Trạng thái chờ duyệt
            idNumber: tenantData.idNumber,
            brand: tenantData.brand,
            address: tenantData.address,
            submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random 0-7 days ago
            trustScore: 0,
            responseRate: 100,
          },
        })
        console.log('  ✅ SellerProfile created:', profile.id, '(pending)')
      } else {
        console.log('  ⚠️ SellerProfile đã tồn tại:', existingProfile.id)
      }
    }

    // 2. Tạo một số Seller đã được duyệt
    console.log('\n✅ Tạo Seller đã duyệt...')
    const approvedSellersData = [
      { phone: '0944555666', name: 'Trần Quốc Tuấn', email: 'tuan.tran@gmail.com', brand: 'TuanHouse' },
      { phone: '0955666777', name: 'Lê Hoàng Nam', email: 'nam.lehoang@yahoo.com', brand: 'NamHomeStay' },
    ]

    for (const sellerData of approvedSellersData) {
      const user = await prisma.user.upsert({
        where: { phone: sellerData.phone },
        update: { 
          password: hashedPassword, 
          role: 'seller',
          email: sellerData.email,
        },
        create: {
          phone: sellerData.phone,
          email: sellerData.email,
          password: hashedPassword,
          fullName: sellerData.name,
          role: 'seller',
          initials: sellerData.name.split(' ').map(n => n[0]).join('').slice(0, 2),
        },
      })
      
      const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } })
      if (!existingProfile) {
        const profile = await prisma.sellerProfile.create({
          data: {
            userId: user.id,
            status: 'active',
            brand: sellerData.brand,
            idNumber: '0792' + Math.floor(Math.random() * 9000000 + 1000000),
            address: '123 Đường Test, Q.Test, TP.HCM',
            submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            reviewedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
            trustScore: Math.random() * 30 + 70,
            responseRate: Math.random() * 30 + 70,
          },
        })
        console.log('✅ Seller approved:', user.fullName, '-', profile.id)
      } else {
        console.log('  ⚠️ Seller đã tồn tại:', user.fullName)
      }
    }

    // 3. Tạo một số Seller đã bị từ chối
    console.log('\n❌ Tạo Seller đã từ chối...')
    const rejectedSellersData = [
      { phone: '0966777888', name: 'Phạm Văn Bình', email: 'binhpham@gmail.com', reason: 'Thông tin CCCD không hợp lệ hoặc không đọc được. Vui lòng chụp lại ảnh rõ ràng hơn.' },
    ]

    for (const sellerData of rejectedSellersData) {
      const user = await prisma.user.upsert({
        where: { phone: sellerData.phone },
        update: { 
          password: hashedPassword,
          email: sellerData.email,
        },
        create: {
          phone: sellerData.phone,
          email: sellerData.email,
          password: hashedPassword,
          fullName: sellerData.name,
          role: 'tenant',
          initials: sellerData.name.split(' ').map(n => n[0]).join('').slice(0, 2),
        },
      })
      
      const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } })
      if (!existingProfile) {
        const profile = await prisma.sellerProfile.create({
          data: {
            userId: user.id,
            status: 'rejected',
            brand: sellerData.name + ' House',
            idNumber: '079288888888',
            address: '456 Đường Bình Test, Q.Test, TP.HCM',
            submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            reviewedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            reviewNote: sellerData.reason,
            trustScore: 0,
            responseRate: 100,
          },
        })
        console.log('✅ Seller rejected:', user.fullName, '-', profile.id)
      } else {
        console.log('  ⚠️ Seller đã tồn tại:', user.fullName)
      }
    }

    // 4. Hiển thị tổng kết
    console.log('\n📊 Tổng kết dữ liệu:')
    
    const pendingCount = await prisma.sellerProfile.count({ where: { status: 'pending' } })
    const activeCount = await prisma.sellerProfile.count({ where: { status: 'active' } })
    const rejectedCount = await prisma.sellerProfile.count({ where: { status: 'rejected' } })
    
    console.log('   - Chờ duyệt:', pendingCount)
    console.log('   - Đã duyệt:', activeCount)
    console.log('   - Đã từ chối:', rejectedCount)
    
    const pendingProfiles = await prisma.sellerProfile.findMany({ 
      where: { status: 'pending' },
      include: { user: true }
    })
    
    console.log('\n📋 Chi tiết yêu cầu chờ duyệt:')
    for (const profile of pendingProfiles) {
      console.log(`   ID: ${profile.id}`)
      console.log(`   User: ${profile.user?.fullName} (${profile.user?.phone})`)
      console.log(`   Brand: ${profile.brand}`)
      console.log(`   Ngày gửi: ${profile.submittedAt}`)
      console.log('   ---')
    }

    console.log('\n🎉 Seed hoàn tất!')
    console.log('\n📋 Tài khoản test:')
    console.log('   Manager: phone=0900000001, password=password123')
    console.log('   Tenant: phone=0911222333, password=password123')

  } catch (error) {
    console.error('❌ Lỗi seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
