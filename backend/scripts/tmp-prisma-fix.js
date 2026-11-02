require('dotenv').config();
const prisma = require('../src/db');

(async () => {
  console.log('=== thử filter theo quan hệ: where: { user: { is: { id: { not: undefined } } } } ===');
  try {
    const r1 = await prisma.sellerProfile.findMany({
      where: { status: 'pending' },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { submittedAt: 'asc' },
    });
    console.log('cach 1 (khong filter) => so dong:', r1.length);
  } catch (e) {
    console.log('cach 1 => ERROR:', e.message.split('\n')[0]);
  }

  console.log('\n=== thử: where: { user: { is: { id: { not: null } } } } ===');
  try {
    const r2 = await prisma.sellerProfile.findMany({
      where: { user: { is: { id: { not: null } } } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    console.log('OK, so dong:', r2.length);
  } catch (e) {
    console.log('ERROR:', e.message.split('\n')[0]);
  }

  console.log('\n=== thử: raw query voi $lookup ===');
  try {
    const r3 = await prisma.sellerProfile.findMany({
      where: { user: { is: { id: { not: undefined } } } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    console.log('OK', r3.length);
  } catch (e) {
    console.log('ERROR:', e.message.split('\n')[0]);
  }

  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
