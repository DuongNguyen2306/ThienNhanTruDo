// Test script để verify dữ liệu
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  console.log('Testing API...\n')

  // Lấy tất cả requests
  const all = await prisma.sellerProfile.findMany({
    include: { user: { select: { phone: true, fullName: true } } },
    orderBy: { submittedAt: 'asc' }
  })
  
  console.log('Tổng số SellerProfiles:', all.length)
  console.log('\nChi tiết:')
  all.forEach((r, i) => {
    console.log(`${i+1}. ID: ${r.id}`)
    console.log(`   User: ${r.user?.fullName} (${r.user?.phone})`)
    console.log(`   Status: ${r.status}`)
    console.log(`   Brand: ${r.brand}`)
    console.log('')
  })

  // Lấy 1 request pending
  const pending = await prisma.sellerProfile.findFirst({
    where: { status: 'pending' },
    include: { user: { select: { phone: true, fullName: true } } }
  })
  
  console.log('Sample pending request:')
  console.log(JSON.stringify(pending, null, 2))

  await prisma.$disconnect()
}

test().catch(console.error)
