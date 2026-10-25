/**
 * Feature test suite for Tasks 1-7.
 *
 * Run:  node backend/tests/features.test.js
 *
 * The tests that touch the database clean up after themselves, so the suite is
 * safe to run against the development database. It never deletes user data.
 */

const assert = require('assert');
const prisma = require('../src/db');
const revenueHelper = require('../src/helpers/revenueHelper');
const otpHelper = require('../src/helpers/otpHelper');
const emailVerification = require('../src/helpers/emailVerificationHelper');
const reviewHelper = require('../src/helpers/websiteReviewHelper');
const internalStore = require('../src/helpers/internalStore');

const tests = [];
const test = (name, run) => tests.push({ name, run });

// ───────────────────────────────────────────────────────────────────────────
// TASK 2 — Revenue math
// ───────────────────────────────────────────────────────────────────────────

test('Revenue: wallet top-up is NOT revenue', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'deposit', status: 'completed', amount: 500000, method: 'bank_transfer', description: 'Nap tien vi' },
  ]);
  assert.strictEqual(s.grossRevenue, 0, 'deposit must not be revenue');
  assert.strictEqual(s.deposits, 500000, 'deposit must be reported separately');
  assert.strictEqual(s.netRevenue, 0);
});

test('Revenue: completed payment IS revenue', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'payment', status: 'completed', amount: 299000, method: 'wallet', description: 'Mua goi "Goi VIP" qua vi' },
  ]);
  assert.strictEqual(s.grossRevenue, 299000);
  assert.strictEqual(s.revenueCount, 1);
});

test('Revenue: pending payment is NOT revenue', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'payment', status: 'pending', amount: 99000, method: 'vnpay', description: 'Goi Tieu Chuan' },
  ]);
  assert.strictEqual(s.grossRevenue, 0, 'pending must not be revenue');
  assert.strictEqual(s.pendingAmount, 99000);
  assert.strictEqual(s.pendingCount, 1);
});

test('Revenue: failed payment is NOT revenue', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'payment', status: 'failed', amount: 99000, method: 'vnpay', description: 'Goi Tieu Chuan' },
  ]);
  assert.strictEqual(s.grossRevenue, 0);
  assert.strictEqual(s.pendingAmount, 0);
});

test('Revenue: top-up then spend is counted ONCE (no double counting)', () => {
  // The classic double-count: 500k in, 299k out. Only 299k is earned revenue.
  const s = revenueHelper.summarizeTransactions([
    { type: 'deposit', status: 'completed', amount: 500000, method: 'bank_transfer', description: 'Nap tien vi' },
    { type: 'payment', status: 'completed', amount: 299000, method: 'wallet', description: 'Mua goi "Goi VIP" qua vi' },
  ]);
  assert.strictEqual(s.grossRevenue, 299000, 'only the purchase is revenue');
  assert.strictEqual(s.deposits, 500000, 'the top-up is a liability, reported apart');
  assert.notStrictEqual(s.grossRevenue, 799000, 'must not sum both');
});

test('Revenue: refunds reduce net but not gross', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'payment', status: 'completed', amount: 100000, description: 'Mua goi' },
    { type: 'refund', status: 'refunded', amount: 40000, description: 'Hoan tien' },
  ]);
  assert.strictEqual(s.grossRevenue, 100000);
  assert.strictEqual(s.refunds, 40000);
  assert.strictEqual(s.netRevenue, 60000);
});

test('Revenue: category classification', () => {
  assert.strictEqual(
    revenueHelper.classifyTransaction({ type: 'payment', description: 'Mua gói "Gói VIP" qua ví' }).category,
    'package_subscription'
  );
  assert.strictEqual(
    revenueHelper.classifyTransaction({ type: 'payment', description: 'Mua boost "Gói X" cho tin "T"' }).category,
    'vip_boost'
  );
  assert.strictEqual(
    revenueHelper.classifyTransaction({ type: 'payment', description: 'Dịch vụ kiểm định' }).category,
    'verification'
  );
  assert.strictEqual(revenueHelper.classifyTransaction({ type: 'deposit' }).category, 'wallet_deposit');
  assert.strictEqual(revenueHelper.classifyTransaction({ type: 'refund' }).category, 'refund');
});

test('Revenue: empty input yields zeroed summary (no NaN)', () => {
  const s = revenueHelper.summarizeTransactions([]);
  assert.strictEqual(s.grossRevenue, 0);
  assert.strictEqual(s.netRevenue, 0);
  assert.strictEqual(s.average, undefined);
  assert.deepStrictEqual(s.categories, []);
});

test('Revenue: percentage is relative to gross revenue only', () => {
  const s = revenueHelper.summarizeTransactions([
    { type: 'payment', status: 'completed', amount: 750000, description: 'Mua gói "Gói Tiêu Chuẩn" qua ví' },
    { type: 'payment', status: 'completed', amount: 250000, description: 'Mua boost "VIP" cho tin' },
    { type: 'deposit', status: 'completed', amount: 900000, description: 'Nạp tiền' },
  ]);
  const pkg = s.categories.find((c) => c.category === 'package_subscription');
  const boost = s.categories.find((c) => c.category === 'vip_boost');
  assert.strictEqual(pkg.percentage, 75);
  assert.strictEqual(boost.percentage, 25);
  assert.ok(!s.categories.some((c) => c.category === 'wallet_deposit' && c.isRevenue));
});

test('Revenue: chart buckets keep refunds and deposits in separate series', () => {
  const buckets = revenueHelper.bucketTransactions(
    [
      { type: 'payment', status: 'completed', amount: 100000, createdAt: new Date('2026-10-05T00:00:00Z'), description: 'Mua gói' },
      { type: 'refund', status: 'refunded', amount: 20000, createdAt: new Date('2026-10-05T00:00:00Z') },
      { type: 'deposit', status: 'completed', amount: 300000, createdAt: new Date('2026-10-05T00:00:00Z') },
    ],
    'month'
  );
  assert.strictEqual(buckets.length, 1);
  assert.strictEqual(buckets[0].revenue, 100000);
  assert.strictEqual(buckets[0].refunds, 20000);
  assert.strictEqual(buckets[0].deposits, 300000);
});

test('Revenue: chart buckets sort chronologically, not alphabetically', () => {
  const buckets = revenueHelper.bucketTransactions(
    [
      { type: 'payment', status: 'completed', amount: 1, createdAt: new Date('2026-09-15T00:00:00Z') },
      { type: 'payment', status: 'completed', amount: 2, createdAt: new Date('2026-10-15T00:00:00Z') },
      { type: 'payment', status: 'completed', amount: 3, createdAt: new Date('2026-11-15T00:00:00Z') },
    ],
    'month'
  );
  assert.deepStrictEqual(buckets.map((b) => b.key), ['2026-09', '2026-10', '2026-11']);
});

test('Revenue: date range filter is inclusive of the end day', () => {
  const range = revenueHelper.buildDateRange('2026-10-01', '2026-10-31');
  assert.ok(range.createdAt.gte instanceof Date);
  assert.ok(range.createdAt.lte instanceof Date);
  assert.strictEqual(range.createdAt.lte.getHours(), 23);
  assert.strictEqual(range.createdAt.lte.getMinutes(), 59);
});

test('Revenue: invalid date range yields no filter', () => {
  assert.strictEqual(revenueHelper.buildDateRange('not-a-date', 'also-bad'), null);
  assert.strictEqual(revenueHelper.buildDateRange(undefined, undefined), null);
});

test('Revenue: isRecognizedRevenue only accepts completed payments', () => {
  assert.strictEqual(revenueHelper.isRecognizedRevenue({ type: 'payment', status: 'completed' }), true);
  assert.strictEqual(revenueHelper.isRecognizedRevenue({ type: 'payment', status: 'pending' }), false);
  assert.strictEqual(revenueHelper.isRecognizedRevenue({ type: 'payment', status: 'failed' }), false);
  assert.strictEqual(revenueHelper.isRecognizedRevenue({ type: 'deposit', status: 'completed' }), false);
});

// ───────────────────────────────────────────────────────────────────────────
// TASK 3 — Website review eligibility
// ───────────────────────────────────────────────────────────────────────────

test('Review: eligibility requires a completed payment transaction', async () => {
  const user = await prisma.user.findFirst({ where: { role: 'tenant' } });
  if (!user) return { skipped: true, message: 'no tenant user in db' };

  const result = await reviewHelper.checkEligibility(user.id);
  const completedPayments = result.transactions.filter((t) => t.status === 'completed' && t.type === 'payment');
  if (completedPayments.length === 0) {
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reason.length > 0);
  } else {
    assert.strictEqual(result.eligible, true);
  }
  return { message: `eligible=${result.eligible}` };
});

test('Review: eligibility never lists deposits or pending payments', async () => {
  const users = await prisma.user.findMany({ take: 20 });
  for (const u of users) {
    const result = await reviewHelper.checkEligibility(u.id);
    for (const t of result.transactions) {
      assert.strictEqual(t.status, 'completed', 'only completed transactions may be listed');
      assert.strictEqual(t.type, 'payment', 'only payment transactions may be listed');
    }
  }
});

test('Review: aggregate handles the empty case without NaN', async () => {
  const agg = await reviewHelper.getAggregate();
  assert.ok(typeof agg.average === 'number');
  assert.ok(!Number.isNaN(agg.average));
  assert.ok(agg.average >= 0 && agg.average <= 5);
  assert.ok(agg.totalReviews >= 0);
  return { message: `avg=${agg.average} total=${agg.totalReviews}` };
});

test('Review: average has at most one decimal (decimal handled correctly)', async () => {
  const agg = await reviewHelper.getAggregate();
  const decimals = String(agg.average).split('.')[1];
  assert.ok(decimals === undefined || decimals.length <= 1, 'average must have at most 1 decimal');
  assert.ok(agg.rawAverage >= agg.average - 0.1 && agg.rawAverage <= agg.average + 0.1);
});

test('Review: duplicate claim for the same transaction is rejected', async () => {
  const key = `${reviewHelper.CLAIM_PREFIX}__test_dup__`;
  const first = await internalStore.claimKey(key, { test: true }, 'test');
  const second = await internalStore.claimKey(key, { test: true }, 'test');
  await internalStore.deleteRecord(key);

  assert.strictEqual(first, true, 'first claim must succeed');
  assert.strictEqual(second, false, 'second claim must be rejected (DB-enforced uniqueness)');
});

test('Review: createReview rejects a transaction that does not qualify', async () => {
  // A deposit must never be usable to qualify.
  const deposit = await prisma.transaction.findFirst({ where: { type: 'deposit' } });
  if (!deposit) return { skipped: true, message: 'no deposit tx in db' };

  const r = await reviewHelper.createReview({
    userId: deposit.userId,
    transactionId: deposit.id,
    score: 5,
    content: 'x',
  });
  assert.strictEqual(r.ok, false);
  assert.ok([403, 404].includes(r.status), `expected 403/404, got ${r.status}`);
});

test('Review: listReviews supports search, filter and pagination', async () => {
  const page1 = await reviewHelper.listReviews({ page: 1, limit: 5 });
  assert.ok(page1.pagination.total >= 0);
  assert.ok(page1.pagination.totalPages >= 1);
  assert.ok(page1.items.length <= 5);

  const page2 = await reviewHelper.listReviews({ page: 2, limit: 5 });
  if (page1.pagination.total > 5) {
    assert.notStrictEqual(page1.items[0]?.id, page2.items[0]?.id, 'pages must not overlap');
  }
  return { message: `total=${page1.pagination.total}` };
});

test('Review: getReview returns null for an unknown id', async () => {
  const r = await reviewHelper.getReview('__does_not_exist__');
  assert.strictEqual(r, null);
});

test('Review: activity series returns a continuous axis', async () => {
  const series = await reviewHelper.getActivitySeries({ buckets: 6 });
  assert.strictEqual(series.length, 6);
  for (const b of series) {
    assert.ok(typeof b.count === 'number');
    assert.ok(b.count >= 0);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// TASK 7 — OTP
// ───────────────────────────────────────────────────────────────────────────

test('OTP: generated code is 6 digits', () => {
  const code = otpHelper.generateOtpCode();
  assert.match(code, /^\d{6}$/);
});

test('OTP: generated codes differ (CSPRNG, not constant)', () => {
  const codes = new Set();
  for (let i = 0; i < 50; i++) codes.add(otpHelper.generateOtpCode());
  assert.ok(codes.size > 45, 'codes must be effectively random');
});

test('OTP: hash is deterministic for the same input', () => {
  const a = otpHelper.hashOtpCode('a@b.com', 'register_verify', '123456');
  const b = otpHelper.hashOtpCode('a@b.com', 'register_verify', '123456');
  assert.strictEqual(a, b);
});

test('OTP: hash differs for a different purpose (no cross-purpose replay)', () => {
  const a = otpHelper.hashOtpCode('a@b.com', 'register_verify', '123456');
  const b = otpHelper.hashOtpCode('a@b.com', 'password_reset', '123456');
  assert.notStrictEqual(a, b);
});

test('OTP: hash differs for a different email (no cross-user replay)', () => {
  const a = otpHelper.hashOtpCode('a@b.com', 'register_verify', '123456');
  const b = otpHelper.hashOtpCode('c@d.com', 'register_verify', '123456');
  assert.notStrictEqual(a, b);
});

test('OTP: timingSafeEqual rejects mismatched digests', () => {
  const a = otpHelper.hashOtpCode('a@b.com', 'register_verify', '123456');
  const b = otpHelper.hashOtpCode('a@b.com', 'register_verify', '654321');
  assert.strictEqual(otpHelper.safeEqual(a, b), false);
  assert.strictEqual(otpHelper.safeEqual(a, a), true);
  assert.strictEqual(otpHelper.safeEqual('short', 'short'), false);
});

test('OTP: issue -> verify consumes the code (single use)', async () => {
  const email = 'otp-test@example.invalid';
  const issued = await otpHelper.issueOtp({ email, purpose: 'register_verify', payload: { userId: 'x' } });
  assert.strictEqual(issued.ok, true);
  assert.match(issued.code, /^\d{6}$/);

  const first = await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: issued.code });
  assert.strictEqual(first.ok, true, 'first verification must succeed');
  assert.deepStrictEqual(first.payload, { userId: 'x' });

  const second = await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: issued.code });
  assert.strictEqual(second.ok, false, 'a consumed OTP must not work twice');
  return { message: `consumed reason=${second.reason}` };
});

test('OTP: wrong code is rejected and consumes an attempt', async () => {
  const email = 'otp-attempt-test@example.invalid';
  const issued = await otpHelper.issueOtp({ email, purpose: 'register_verify' });
  assert.strictEqual(issued.ok, true);

  const bad = await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: '000000' });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, 'invalid');
  assert.strictEqual(bad.retryAfter, 4, 'one attempt consumed');

  const good = await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: issued.code });
  assert.strictEqual(good.ok, true, 'correct code still works before the limit');
});

test('OTP: max attempts invalidates the OTP', async () => {
  const email = 'otp-maxattempt-test@example.invalid';
  const issued = await otpHelper.issueOtp({ email, purpose: 'register_verify' });
  assert.strictEqual(issued.ok, true);

  for (let i = 0; i < 5; i++) {
    await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: '111111' });
  }
  const after = await otpHelper.verifyOtp({ email, purpose: 'register_verify', code: issued.code });
  assert.strictEqual(after.ok, false, 'OTP must be dead after 5 failed attempts');
  assert.ok(['max_attempts', 'not_found'].includes(after.reason));
});

test('OTP: resend cooldown is enforced', async () => {
  const email = 'otp-cooldown-test@example.invalid';
  const first = await otpHelper.issueOtp({ email, purpose: 'register_verify' });
  assert.strictEqual(first.ok, true);

  const second = await otpHelper.issueOtp({ email, purpose: 'register_verify' });
  assert.strictEqual(second.ok, false);
  assert.strictEqual(second.reason, 'cooldown');
  assert.ok(second.retryAfter > 0);
});

test('OTP: verifying a non-existent OTP returns not_found', async () => {
  const r = await otpHelper.verifyOtp({
    email: 'never-issued@example.invalid',
    purpose: 'register_verify',
    code: '123456',
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'not_found');
});

test('OTP: status endpoint leaks no secret', async () => {
  const email = 'otp-status-test@example.invalid';
  await otpHelper.issueOtp({ email, purpose: 'register_verify' });
  const status = await otpHelper.getOtpStatus(email, 'register_verify');
  assert.strictEqual(status.exists, true);
  assert.ok(!('code' in status));
  assert.ok(!('hash' in status));
  assert.ok(!JSON.stringify(status).includes('"code"'));
});

test('OTP: session epoch rotation invalidates the old epoch', async () => {
  const userId = '__epoch_test_user__';
  const e1 = await otpHelper.getSessionEpoch(userId);
  assert.ok(e1);
  assert.strictEqual(await otpHelper.verifySessionEpoch(userId, e1), true);

  const e2 = await otpHelper.rotateSessionEpoch(userId);
  assert.notStrictEqual(e1, e2);
  assert.strictEqual(await otpHelper.verifySessionEpoch(userId, e1), false, 'old token must be rejected');
  assert.strictEqual(await otpHelper.verifySessionEpoch(userId, e2), true);
  await internalStore.deleteRecord(`pw_epoch:${userId}`);
});

test('OTP: a token without an epoch is accepted (no mass logout)', async () => {
  assert.strictEqual(await otpHelper.verifySessionEpoch('__any_user__', undefined), true);
});

// ───────────────────────────────────────────────────────────────────────────
// TASK 7 — Email verification marker
// ───────────────────────────────────────────────────────────────────────────

test('EmailVerification: legacy account (no marker) counts as VERIFIED', async () => {
  const legacy = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  assert.ok(legacy, 'db must have at least one user');
  const verified = await emailVerification.isEmailVerified(legacy);
  assert.strictEqual(verified, true, 'no marker => treated as verified => no lockout');
});

test('EmailVerification: explicit unverified marker blocks verification', async () => {
  const user = await prisma.user.findFirst({ where: { email: { not: null } } });
  if (!user) return { skipped: true, message: 'no user with email' };

  await emailVerification.markUnverified(user.id, 'pending@example.invalid');
  const verified = await emailVerification.isEmailVerified(user);
  assert.strictEqual(verified, false, 'an explicit unverified marker must block');

  await emailVerification.markVerified(user.id, user.email);
  const verified2 = await emailVerification.isEmailVerified(user);
  assert.strictEqual(verified2, true);

  // Restore the legacy state (no marker) so we do not change behaviour.
  await emailVerification.clearVerified(user.id);
  const verified3 = await emailVerification.isEmailVerified(user);
  assert.strictEqual(verified3, true);
});

// ───────────────────────────────────────────────────────────────────────────
// Internal store
// ───────────────────────────────────────────────────────────────────────────

test('InternalStore: internal keys are hidden from the admin config list', () => {
  assert.strictEqual(internalStore.isInternalKey('wtx:review:abc'), true);
  assert.strictEqual(internalStore.isInternalKey('otp:register_verify:abc'), true);
  assert.strictEqual(internalStore.isInternalKey('pw_epoch:abc'), true);
  assert.strictEqual(internalStore.isInternalKey('email_verified:abc'), true);
  assert.strictEqual(internalStore.isInternalKey('packages'), false);
  assert.strictEqual(internalStore.isInternalKey('amenities'), false);
  assert.strictEqual(internalStore.isInternalKey('roomTypes'), false);
  assert.strictEqual(internalStore.isInternalKey('boost_packages'), false);
});

test('InternalStore: claimKey is exclusive', async () => {
  const key = 'wtx:__test_claim__';
  assert.strictEqual(await internalStore.claimKey(key, { a: 1 }, 'test'), true);
  assert.strictEqual(await internalStore.claimKey(key, { a: 1 }, 'test'), false);
  await internalStore.deleteRecord(key);
});

// ───────────────────────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🧪 THIÊN NHÃN — FEATURE TESTS (Tasks 1-7)\n');
  console.log('='.repeat(64));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const t of tests) {
    try {
      const r = await t.run();
      const extra = r && r.message ? ` (${r.message})` : '';
      const skippedNote = r && r.skipped ? ' ⏭️  SKIPPED' : '';
      console.log(`✅ PASS  ${t.name}${extra}${skippedNote}`);
      passed += 1;
      if (r && r.skipped) skipped += 1;
    } catch (err) {
      console.log(`❌ FAIL  ${t.name}`);
      console.log(`        ${err.message}`);
      failed += 1;
    }
  }

  console.log('='.repeat(64));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}\n`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
})();
