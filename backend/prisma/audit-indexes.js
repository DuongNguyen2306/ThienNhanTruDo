/**
 * READ-ONLY index inspection — no writes.
 * Checks whether `users.email` unique index is SPARSE (critical for null-email users).
 */
const prisma = require('../src/db');

(async () => {
  const db = prisma.$disconnect ? null : null;

  // Raw command to list indexes on the users collection
  const res = await prisma.$runCommandRaw({
    listIndexes: 'users',
  });
  console.log('=== users indexes ===');
  console.log(JSON.stringify(res, null, 2));

  // Count nulls and duplicates
  const nulls = await prisma.user.count({ where: { email: null } });
  const total = await prisma.user.count();
  console.log('\n=== users email nullability ===');
  console.log({ total, nullEmail: nulls });

  // Check transactions collection indexes (for idempotencyKey sparse unique)
  const txIdx = await prisma.$runCommandRaw({ listIndexes: 'transactions' });
  console.log('\n=== transactions indexes ===');
  console.log(JSON.stringify(txIdx, null, 2));

  // Existing collections
  const cols = await prisma.$runCommandRaw({ listCollections: 1 });
  console.log('\n=== collections ===');
  console.log((cols.cursor?.firstBatch || []).map(c => c.name).join(', '));
})()
  .catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
