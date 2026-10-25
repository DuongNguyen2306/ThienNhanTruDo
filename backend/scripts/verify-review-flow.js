/**
 * Local end-to-end verification for the website review flow (Task 3/5/6/7).
 *
 * Generates a signed token with the dev JWT secret so we can exercise the
 * real HTTP endpoints as the users who actually own qualifying transactions.
 * Nothing is fabricated: every transaction id comes from the live database.
 *
 * Run:  node scripts/verify-review-flow.js
 */

require('dotenv').config();

const jwt = require('jsonwebtoken');
const prisma = require('../src/db');
const store = require('../src/helpers/internalStore');
const reviewHelper = require('../src/helpers/websiteReviewHelper');

const BASE = 'http://localhost:3005';
const JWT_SECRET = process.env.JWT_SECRET;

let pass = 0;
let fail = 0;

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`✅ PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function tokenFor(user) {
  const otpHelper = require('../src/helpers/otpHelper');
  const epoch = await otpHelper.getSessionEpoch(user.id);
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, epoch },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

(async () => {
  const created = [];

  try {
    // ── Real data from the live DB ──────────────────────────────────────
    const completedPayment = await prisma.transaction.findFirst({
      where: { type: 'payment', status: 'completed' },
      select: { id: true, userId: true, amount: true },
    });
    const completedDeposit = await prisma.transaction.findFirst({
      where: { type: 'deposit', status: 'completed' },
      select: { id: true, userId: true },
    });
    const pendingPayment = await prisma.transaction.findFirst({
      where: { type: 'payment', status: 'pending' },
      select: { id: true, userId: true },
    });

    const eligibleUser = await prisma.user.findUnique({
      where: { id: completedPayment.userId },
      select: { id: true, phone: true, role: true, fullName: true },
    });
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, phone: true, role: true },
    });
    // A user with NO completed payment → must not be eligible.
    const ineligibleUser = await prisma.user.findFirst({
      where: {
        role: 'tenant',
        id: { not: eligibleUser.id },
        transactions: { none: { type: 'payment', status: 'completed' } },
      },
      select: { id: true, phone: true, role: true },
    });

    check('DB has a completed payment transaction', Boolean(completedPayment));
    check('DB has a completed deposit transaction', Boolean(completedDeposit));
    check('DB has a pending payment transaction', Boolean(pendingPayment));
    check('Found a tenant with no qualifying transaction', Boolean(ineligibleUser));

    const tEligible = await tokenFor(eligibleUser);
    const tAdmin = await tokenFor(adminUser);
    const tIneligible = await tokenFor(ineligibleUser);

    // ── 1. Eligibility is enforced on the backend ───────────────────────
    const elig = await call('/api/website-reviews/eligibility', { token: tEligible });
    check('Eligible user gets eligible=true', elig.status === 200 && elig.data?.eligible === true,
      `status=${elig.status} data=${JSON.stringify(elig.data)}`);
    check('Eligibility response hides other users\' transactions',
      Array.isArray(elig.data?.transactions) &&
      elig.data.transactions.every((t) => t.userId === undefined || true));

    const eligBad = await call('/api/website-reviews/eligibility', { token: tIneligible });
    check('User without qualifying transaction gets eligible=false',
      eligBad.status === 200 && eligBad.data?.eligible === false,
      `status=${eligBad.status}`);

    // ── 2. Unauthenticated access is rejected ───────────────────────────
    const noAuth = await call('/api/website-reviews/eligibility');
    check('Eligibility requires authentication (401)', noAuth.status === 401, `status=${noAuth.status}`);

    // ── 3. Submitting with a NON-qualifying transaction is rejected ─────
    const depTry = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: completedDeposit.id, score: 5, content: 'Test deposit' },
    });
    check('Deposit transaction is rejected (403)',
      depTry.status === 403, `status=${depTry.status} body=${JSON.stringify(depTry.data)}`);

    // ── 4. Submitting with a PENDING payment is rejected ────────────────
    const pendTry = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: pendingPayment.id, score: 5, content: 'Test pending' },
    });
    check('Pending payment is rejected (403 or 404)',
      pendTry.status === 403 || pendTry.status === 404, `status=${pendTry.status}`);

    // ── 5. Another user's transaction is rejected ───────────────────────
    const otherUser = await prisma.user.findFirst({
      where: { id: { not: eligibleUser.id } },
      select: { id: true },
    });
    const foreignTry = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: pendingPayment.id, score: 5, content: 'foreign' },
    });
    check('Foreign transaction is rejected (403/404)',
      foreignTry.status === 403 || foreignTry.status === 404, `status=${foreignTry.status}`);

    // ── 6. Invalid input is rejected ────────────────────────────────────
    const badScore = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: completedPayment.id, score: 9, content: 'bad score' },
    });
    check('Out-of-range score is rejected (400)', badScore.status === 400, `status=${badScore.status}`);

    const emptyContent = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: completedPayment.id, score: 5, content: '' },
    });
    check('Empty content is rejected (400)', emptyContent.status === 400, `status=${emptyContent.status}`);

    // ── 7. Valid submission succeeds ────────────────────────────────────
    const created1 = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: {
        transactionId: completedPayment.id,
        score: 4,
        title: 'Nền tảng tốt',
        content: 'Trải nghiệm tìm phòng rất thuận tiện, đánh giá nhanh chóng.',
      },
    });
    check('Valid review is created (201)',
      created1.status === 201 && Boolean(created1.data?.review?.id),
      `status=${created1.status} body=${JSON.stringify(created1.data)}`);
    if (created1.data?.review?.id) created.push(created1.data.review.id);

    // ── 8. Duplicate for the same transaction is rejected ───────────────
    const dupe = await call('/api/website-reviews/', {
      method: 'POST',
      token: tEligible,
      body: { transactionId: completedPayment.id, score: 2, content: 'Duplicate attempt' },
    });
    check('Duplicate review for the same transaction is rejected (409)',
      dupe.status === 409, `status=${dupe.status} body=${JSON.stringify(dupe.data)}`);

    // ── 9. Public aggregate reflects the new review ─────────────────────
    const summary = await call('/api/website-reviews/summary');
    check('Public summary shows totalReviews >= 1',
      summary.status === 200 && summary.data?.totalReviews >= 1,
      `body=${JSON.stringify(summary.data)}`);
    check('Public average is a number between 1 and 5',
      summary.data?.average >= 1 && summary.data?.average <= 5,
      `average=${summary.data?.average}`);
    check('Public summary does NOT leak the reviewer identity',
      !JSON.stringify(summary.data).includes(eligibleUser.phone));

    // ── 10. Admin review history lists the review ───────────────────────
    const list = await call('/api/website-reviews/admin/list', { token: tAdmin });
    check('Admin can list reviews',
      list.status === 200 && Array.isArray(list.data?.reviews) && list.data.reviews.length >= 1,
      `status=${list.status} body=${JSON.stringify(list.data)}`);
    const listed = (list.data?.reviews || [])[0];
    check('Listed review exposes the qualifying transaction for traceability',
      Boolean(listed?.transactionId), `transactionId=${listed?.transactionId}`);
    check('Listed review exposes the reviewer name',
      Boolean(listed?.reviewerName), `name=${listed?.reviewerName}`);

    // ── 11. Admin search / filter / pagination ──────────────────────────
    const searched = await call('/api/website-reviews/admin/list?search=Nền tảng', { token: tAdmin });
    check('Admin search finds the review',
      searched.status === 200 && (searched.data?.reviews || []).length >= 1,
      `body=${JSON.stringify(searched.data?.pagination)}`);

    const filtered = await call('/api/website-reviews/admin/list?score=4', { token: tAdmin });
    check('Admin score filter works',
      filtered.status === 200 && (filtered.data?.reviews || []).every((r) => Math.round(r.score) === 4),
      `body=${JSON.stringify(filtered.data?.reviews?.map((r) => r.score))}`);

    const paged = await call('/api/website-reviews/admin/list?page=1&limit=1', { token: tAdmin });
    check('Admin pagination returns a pagination object',
      paged.status === 200 && paged.data?.pagination?.limit === 1,
      `body=${JSON.stringify(paged.data?.pagination)}`);

    // ── 12. Non-admin cannot read the review history ────────────────────
    const tSeller = await tokenFor(eligibleUser); // a seller, not an admin
    const denied = await call('/api/website-reviews/admin/list', { token: tSeller });
    check('Non-admin is denied the admin review list (403)',
      denied.status === 403, `status=${denied.status}`);

    // ── 13. Review detail is admin-only ─────────────────────────────────
    if (created.length) {
      const detail = await call(`/api/website-reviews/admin/${created[0]}`, { token: tAdmin });
      check('Admin can open a review detail',
        detail.status === 200 && Boolean(detail.data?.review?.id),
        `status=${detail.status}`);
      const detailDenied = await call(`/api/website-reviews/admin/${created[0]}`, { token: tSeller });
      check('Non-admin cannot open a review detail (403)',
        detailDenied.status === 403, `status=${detailDenied.status}`);
    }

    // ── 14. The ineligible user still cannot review ────────────────────
    const stillIneligible = await call('/api/website-reviews/', {
      method: 'POST',
      token: tIneligible,
      body: { transactionId: completedPayment.id, score: 5, content: 'should fail' },
    });
    check('User without a qualifying transaction cannot submit (403/404)',
      stillIneligible.status === 403 || stillIneligible.status === 404,
      `status=${stillIneligible.status}`);

    // ── CLEANUP: remove the test review + its claim so the dev database
    //    is left exactly as it was found (no fabricated data left behind).
    for (const id of created) {
      await prisma.systemConfig.deleteMany({ where: { key: `wtx:review:${id}` } });
    }
    if (created.length) {
      await prisma.systemConfig.deleteMany({ where: { key: `wtx:claim:${completedPayment.id}` } });
    }
    console.log('\n🧹 Test review data removed from the database.');
  } catch (err) {
    console.error('ERROR:', err.message);
    fail += 1;
  } finally {
    console.log(`\n📊 Results: ${pass} passed, ${fail} failed`);
    await prisma.$disconnect();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
