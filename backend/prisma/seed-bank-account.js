// Script to create default bank account
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Check if bank account already exists
  const existing = await prisma.bankAccount.findFirst({
    where: { isActive: true }
  })

  if (existing) {
    console.log('Bank account already exists:', existing)
    return
  }

  // Create default bank account
  const bankAccount = await prisma.bankAccount.create({
    data: {
      bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
      bankBin: '970436',
      accountNumber: '1234567890',
      accountHolder: 'CONG TY TNHH THIEN NHAN',
      isActive: true,
    }
  })

  console.log('Created bank account:', bankAccount)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
