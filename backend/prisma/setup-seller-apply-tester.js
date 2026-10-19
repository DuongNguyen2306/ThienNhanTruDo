const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const testPhone = '0909123457';
  const testPassword = 'Test1234';
  const testPasswordHash = await bcrypt.hash(testPassword, 10);

  // Check if user exists
  let user = await p.user.findFirst({ where: { phone: testPhone } });

  if (user) {
    console.log('Updating existing test tenant:', user.fullName);
    user = await p.user.update({
      where: { id: user.id },
      data: { 
        password: testPasswordHash,
        fullName: 'Nguyen Van Tenant',
        role: 'tenant',
      }
    });
    // Remove any existing seller profile
    await p.sellerProfile.deleteMany({ where: { userId: user.id } });
  } else {
    console.log('Creating new test tenant');
    user = await p.user.create({
      data: {
        phone: testPhone,
        password: testPasswordHash,
        fullName: 'Nguyen Van Tenant',
        role: 'tenant',
        email: 'tenant@example.com',
        initials: 'NV',
        title: 'Người thuê',
      }
    });
  }

  console.log('\n=== TEST TENANT CREDENTIALS ===');
  console.log('Phone:', testPhone);
  console.log('Password:', testPassword);
  console.log('Role: tenant');
  console.log('User ID:', user.id);
  console.log('\nUse this account to test "Đăng ký làm Chủ trọ" flow');
}

main()
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
