const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({ where: { phone: '0987654321' } });
  if (user) {
    console.log('User found:', user.fullName, '| Role:', user.role);
    console.log('Password hash:', user.password.substring(0, 30) + '...');
  } else {
    console.log('User not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
