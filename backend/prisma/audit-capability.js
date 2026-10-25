/**
 * READ-ONLY capability probe (everything inside a transaction that is ROLLED BACK).
 * Determines which existing models can be used to implement the website-review
 * and OTP features WITHOUT any schema change.
 *
 * Q1: Does Prisma support `startsWith` on SystemConfig.key (MongoDB)?
 * Q2: Can a Review be created with a dangling listingId (is the FK enforced)?
 * Q3: Does SystemConfig.upsert work inside a transaction (for OTP storage)?
 */
const prisma = require('../src/db');

const ROLLBACK = (tag) => { throw new Error('__ROLLBACK__:' + tag); };

(async () => {
  // ── Q1: startsWith on a unique String field ─────────────────────────────
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'website_review:' } },
      take: 5,
    });
    console.log('Q1 startsWith on SystemConfig.key -> OK, rows =', rows.length);
  } catch (e) {
    console.log('Q1 startsWith on SystemConfig.key -> FAILED:', e.message.split('\n')[0]);
  }

  // ── Q1b: list all existing SystemConfig keys (to see what is in there) ──
  const allKeys = await prisma.systemConfig.findMany({ select: { key: true, updatedAt: true } });
  console.log('Q1b existing SystemConfig keys:', allKeys.map(k => k.key));

  // ── Q2: can we create a Review with a dangling listingId? ───────────────
  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          listingId: 'wtx_probe_nonexistent',
          authorId: 'probe-user',
          score: 5,
          text: 'probe',
        },
      });
      ROLLBACK('review:' + r.id);
    });
    console.log('Q2 dangling Review.listingId -> COMMITTED (FK NOT enforced)');
  } catch (e) {
    if (e.message.startsWith('__ROLLBACK__')) {
      console.log('Q2 dangling Review.listingId -> ALLOWED (FK not enforced by Prisma/Mongo)');
    } else {
      console.log('Q2 dangling Review.listingId -> BLOCKED:', e.message.split('\n')[0]);
    }
  }

  // ── Q3: SystemConfig upsert inside a transaction ────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
      await tx.systemConfig.upsert({
        where: { key: 'probe_otp_key' },
        create: { key: 'probe_otp_key', value: JSON.stringify({ a: 1 }) },
        update: { value: JSON.stringify({ a: 2 }) },
      });
      const found = await tx.systemConfig.findUnique({ where: { key: 'probe_otp_key' } });
      ROLLBACK('cfg:' + JSON.stringify(found?.value));
    });
    console.log('Q3 SystemConfig.upsert in tx -> COMMITTED (BAD)');
  } catch (e) {
    if (e.message.startsWith('__ROLLBACK__')) {
      console.log('Q3 SystemConfig.upsert in tx -> OK, rolled back');
    } else {
      console.log('Q3 SystemConfig.upsert in tx -> FAILED:', e.message.split('\n')[0]);
    }
  }

  // ── Q4: does a unique-key conflict surface as P2002? ───────────────────
  try {
    await prisma.$transaction(async (tx) => {
      await tx.systemConfig.create({ data: { key: 'probe_dup', value: '{}' } });
      await tx.systemConfig.create({ data: { key: 'probe_dup', value: '{}' } });
      ROLLBACK('dup');
    });
    console.log('Q4 duplicate SystemConfig key -> COMMITTED (BAD)');
  } catch (e) {
    if (e.message.startsWith('__ROLLBACK__')) {
      console.log('Q4 duplicate key -> no conflict (BAD)');
    } else {
      console.log('Q4 duplicate key -> conflict code =', e.code, '(P2002 = unique)');
    }
  }

  // ── Verify nothing persisted ────────────────────────────────────────────
  console.log('\nPersistence check:', {
    probeCfg: await prisma.systemConfig.count({ where: { key: { startsWith: 'probe_' } } }),
    probeReviews: await prisma.review.count({ where: { listingId: { startsWith: 'wtx_probe' } } }),
    totalUsers: await prisma.user.count(),
    totalReviews: await prisma.review.count(),
  });
})()
  .catch((e) => { console.error('PROBE FAILED:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
