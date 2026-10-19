const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.bankAccount.update({
    where: { id: '6d944339-d2f9-4ce3-9793-b06cf7bdb2ad' },
    data: { qrImageUrl: '/images/payment/vnp.jpg' }
  })
  console.log('Updated bank account with QR image URL')
}

main().catch(console.error).finally(() => prisma.$disconnect())
