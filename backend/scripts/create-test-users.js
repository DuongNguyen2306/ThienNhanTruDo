/**
 * Tạo tài khoản test tạm (admin + tenant) để kiểm thử phân quyền endpoint.
 * KHÔNG in mật khẩu ra log.
 *
 * Dùng: node scripts/create-test-users.js
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = require('../src/db');
const bcrypt = require('bcryptjs');

async function upsert({ email, phone, password, fullName, role }) {
  const hash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role, password: hash },
    });
    console.log(`  ${role}: cap nhat user da co (id=${updated.id.slice(0, 8)}...)`);
    return updated;
  }
  const created = await prisma.user.create({
    data: {
      email,
      phone,
      password: hash,
      fullName,
      role,
    },
  });
  console.log(`  ${role}: tao moi (id=${created.id.slice(0, 8)}...)`);
  return created;
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const password = 'Ga4Test!' + crypto.randomBytes(3).toString('hex');

  console.log('=== Tao tai khoan test ===');
  const admin = await upsert({
    email: `ga4test.admin.${stamp}@example.test`,
    phone: `09${stamp}0001`,
    password,
    fullName: 'GA4 Test Admin',
    role: 'admin',
  });
  const tenant = await upsert({
    email: `ga4test.tenant.${stamp}@example.test`,
    phone: `09${stamp}0002`,
    password,
    fullName: 'GA4 Test Tenant',
    role: 'tenant',
  });

  // Ghi thông tin test vào file riêng (KHÔNG commit) để script test dùng.
  const outFile = path.resolve(__dirname, '.ga4-test-users.json');
  require('fs').writeFileSync(
    outFile,
    JSON.stringify(
      {
        password,
        admin: { email: admin.email, phone: admin.phone, id: admin.id },
        tenant: { email: tenant.email, phone: tenant.phone, id: tenant.id },
      },
      null,
      2,
    ),
  );
  console.log('  -> ghi test users vao', path.basename(outFile), '(khong commit)');
  console.log('  -> mat khau da sinh ngau nhien, KHONG in ra log.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error('LOI:', e.message); process.exit(1); });
