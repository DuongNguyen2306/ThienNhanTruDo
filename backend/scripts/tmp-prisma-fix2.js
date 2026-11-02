require('dotenv').config();
const prisma = require('../src/db');

(async () => {
  const variants = {
    'is: { id: { not: undefined } }': { user: { is: { id: { not: undefined } } } },
    'is: { id: { not: null } }': { user: { is: { id: { not: null } } } },
    'isNot: null': { user: { isNot: null } },
  };

  for (const [label, where] of Object.entries(variants)) {
    try {
      const rows = await prisma.sellerProfile.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { submittedAt: 'asc' },
      });
      const allHaveUser = rows.every((r) => r.user !== null && r.user !== undefined);
      console.log(`PASS ${label} => ${rows.length} dong, tat ca co user: ${allHaveUser}`);
    } catch (e) {
      console.log(`FAIL ${label} => ${String(e.message).split('\n')[0]}`);
    }
  }

  // Kiem tra pending + include userId de hien thi cho admin
  console.log('\n=== pending voi filter (co userId de doi chieu) ===');
  const pending = await prisma.sellerProfile.findMany({
    where: { status: 'pending', user: { is: { id: { not: undefined } } } },
    include: { user: { select: { id: true, fullName: true, phone: true, email: true, createdAt: true } } },
    orderBy: { submittedAt: 'asc' },
  });
  console.log('so pending:', pending.length);
  for (const p of pending) {
    console.log('  userId:', p.userId, '| user:', p.user?.fullName ?? '(null)', '| status:', p.status);
  }

  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
