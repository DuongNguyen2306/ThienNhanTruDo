/**
 * Website Review Helper — platform-level rating system (Task 3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS
 * ─────────────────────────────────────────────────────────────────────────────
 * A rating for the PLATFORM itself, completely separate from `Review`, which
 * rates a LISTING (a room). The two systems never interact.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELIGIBILITY (server-side only — never a frontend check)
 * ─────────────────────────────────────────────────────────────────────────────
 * A user may submit a website review only if they own a qualifying completed
 * transaction:
 *
 *     Transaction.type   === 'payment'
 *     Transaction.status === 'completed'
 *
 * Rationale for each constraint:
 *   • `type: 'payment'` — a wallet TOP-UP (`type: 'deposit'`) is not a
 *     purchase; it is a prepaid balance. Counting it would let anyone qualify
 *     by moving their own money in and out.
 *   • `type: 'payment'` also covers package subscriptions, verification
 *     services and VIP boosts — all genuine platform revenue.
 *   • `status: 'completed'` — pending (unpaid) and failed payments are not
 *     revenue and must not confer eligibility.
 *   • A wallet-funded purchase DOES qualify (`method: 'wallet'`): the money
 *     still reached the platform, it simply arrived via a different rail.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DUPLICATE PREVENTION (database-enforced, no schema change)
 * ─────────────────────────────────────────────────────────────────────────────
 * `SystemConfig.key` is UNIQUE. We therefore use a *claim key*:
 *
 *     wtx:claim:<transactionId>
 *
 * Creating it is a `create` (not an upsert). If the key already exists
 * MongoDB raises P2002, which we translate into HTTP 409. This is a real
 * database-level uniqueness guarantee, not a read-then-write race.
 *
 * On top of that, a user may hold only ONE active review at a time, so a
 * user with several qualifying transactions cannot spam the rating.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STORAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *     wtx:review:<reviewId>  → the review record itself
 *     wtx:claim:<txId>       → the uniqueness claim for a transaction
 */

const crypto = require('crypto');
const prisma = require('../db');
const store = require('./internalStore');

const REVIEW_PREFIX = 'wtx:review:';
const CLAIM_PREFIX = 'wtx:claim:';

const REVIEW_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  FLAGGED: 'flagged',
};

const PURPOSES = {
  WEBSITE_REVIEW: 'website_review',
};

/**
 * Find the user's qualifying completed transactions.
 * This is THE eligibility source of truth.
 */
async function findQualifyingTransactions(userId) {
  return prisma.transaction.findMany({
    where: {
      userId,
      type: 'payment',
      status: 'completed',
    },
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      type: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check whether a user is eligible to review the website, and why.
 *
 * @returns {Promise<{eligible:boolean, reason:string, transactions:Array, usedTransactionIds:string[]}>}
 */
async function checkEligibility(userId) {
  const transactions = await findQualifyingTransactions(userId);

  if (transactions.length === 0) {
    return {
      eligible: false,
      reason: 'Bạn cần có ít nhất một giao dịch thanh toán hoàn tất mới có thể đánh giá website.',
      transactions: [],
      usedTransactionIds: [],
    };
  }

  // Which of these transactions already back an existing review?
  const claimKeys = transactions.map((t) => `${CLAIM_PREFIX}${t.id}`);
  const existingClaims = await store.listRecords(CLAIM_PREFIX);
  const claimed = new Set(
    existingClaims
      .filter((c) => claimKeys.includes(c._key))
      .map((c) => c._key.replace(CLAIM_PREFIX, ''))
  );

  // A user may hold only one active (published) review.
  const allReviews = await store.listRecords(REVIEW_PREFIX);
  const myActiveReview = allReviews.find(
    (r) => r.userId === userId && r.status === REVIEW_STATUS.PUBLISHED
  );

  if (myActiveReview) {
    return {
      eligible: false,
      reason: 'Bạn đã có một đánh giá đang hiển thị. Hãy chỉnh sửa đánh giá hiện tại thay vì tạo mới.',
      transactions,
      usedTransactionIds: [...claimed],
      existingReviewId: myActiveReview.id,
      canEdit: true,
    };
  }

  const available = transactions.filter((t) => !claimed.has(t.id));
  if (available.length === 0) {
    return {
      eligible: false,
      reason: 'Tất cả giao dịch của bạn đã được dùng để đánh giá. Bạn chỉ có thể đánh giá một lần.',
      transactions,
      usedTransactionIds: [...claimed],
    };
  }

  return {
    eligible: true,
    reason: 'Bạn đủ điều kiện đánh giá website.',
    transactions,
    usedTransactionIds: [...claimed],
    availableTransactionIds: available.map((t) => t.id),
  };
}

/**
 * Create a website review.
 *
 * Duplicate protection is enforced by a unique DB claim, so two concurrent
 * requests for the same transaction cannot both succeed.
 */
async function createReview({ userId, transactionId, score, title, content, user }) {
  // 1. Verify the transaction exists, belongs to the user and is qualifying.
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: { id: true, type: true, status: true, amount: true, method: true, description: true, createdAt: true },
  });

  if (!transaction) {
    return { ok: false, status: 404, error: 'Không tìm thấy giao dịch đủ điều kiện' };
  }
  if (transaction.type !== 'payment' || transaction.status !== 'completed') {
    return {
      ok: false,
      status: 403,
      error: 'Giao dịch này không đủ điều kiện để đánh giá (yêu cầu thanh toán hoàn tất).',
    };
  }

  // 2. One active review per user.
  const allReviews = await store.listRecords(REVIEW_PREFIX);
  const myActiveReview = allReviews.find(
    (r) => r.userId === userId && r.status === REVIEW_STATUS.PUBLISHED
  );
  if (myActiveReview) {
    return {
      ok: false,
      status: 409,
      error: 'Bạn đã có một đánh giá đang hiển thị. Hãy chỉnh sửa đánh giá hiện tại.',
      existingReviewId: myActiveReview.id,
    };
  }

  // 3. Claim the transaction — this is the database-enforced dedupe.
  const reviewId = crypto.randomUUID();
  const claimed = await store.claimKey(
    `${CLAIM_PREFIX}${transactionId}`,
    {
      reviewId,
      userId,
      transactionId,
      createdAt: new Date().toISOString(),
    },
    'Website review claim'
  );

  if (!claimed) {
    return {
      ok: false,
      status: 409,
      error: 'Giao dịch này đã được dùng để đánh giá website trước đó.',
    };
  }

  // 4. Persist the review.
  const now = new Date();
  const record = {
    id: reviewId,
    userId,
    transactionId,
    score,
    title: title || null,
    content,
    status: REVIEW_STATUS.PUBLISHED,
    // Snapshot of the reviewer's public identity at review time.
    reviewerName: user?.fullName || null,
    reviewerInitials: user?.initials || null,
    reviewerRole: user?.role || null,
    // Snapshot of the qualifying transaction for traceability (Task 5/6).
    transactionAmount: transaction.amount,
    transactionMethod: transaction.method,
    transactionDescription: transaction.description,
    transactionCreatedAt: transaction.createdAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    hiddenReason: null,
    hiddenAt: null,
    hiddenBy: null,
    adminReply: null,
    adminReplyAt: null,
  };

  await store.writeRecord(`${REVIEW_PREFIX}${reviewId}`, record, 'Website review');

  return { ok: true, review: record };
}

/** Get a single review by id. */
async function getReview(reviewId) {
  const rec = await store.readRecord(`${REVIEW_PREFIX}${reviewId}`);
  return rec || null;
}

/** Update the current user's own review. */
async function updateReview({ reviewId, userId, score, title, content }) {
  const rec = await getReview(reviewId);
  if (!rec) return { ok: false, status: 404, error: 'Không tìm thấy đánh giá' };
  if (rec.userId !== userId) return { ok: false, status: 403, error: 'Bạn không có quyền sửa đánh giá này' };
  if (rec.status === REVIEW_STATUS.HIDDEN) {
    return { ok: false, status: 400, error: 'Đánh giá này đã bị ẩn và không thể chỉnh sửa' };
  }

  const updated = {
    ...rec,
    score: score !== undefined ? score : rec.score,
    title: title !== undefined ? title : rec.title,
    content: content !== undefined ? content : rec.content,
    updatedAt: new Date().toISOString(),
  };
  await store.writeRecord(`${REVIEW_PREFIX}${reviewId}`, updated, 'Website review');
  return { ok: true, review: updated };
}

/** Moderate a review (admin). */
async function moderateReview({ reviewId, action, reason, adminId }) {
  const rec = await getReview(reviewId);
  if (!rec) return { ok: false, status: 404, error: 'Không tìm thấy đánh giá' };

  const now = new Date().toISOString();
  let updated;
  if (action === 'hide') {
    updated = { ...rec, status: REVIEW_STATUS.HIDDEN, hiddenReason: reason || null, hiddenAt: now, hiddenBy: adminId, updatedAt: now };
  } else if (action === 'unhide') {
    updated = { ...rec, status: REVIEW_STATUS.PUBLISHED, hiddenReason: null, hiddenAt: null, hiddenBy: null, updatedAt: now };
  } else if (action === 'flag') {
    updated = { ...rec, status: REVIEW_STATUS.FLAGGED, updatedAt: now };
  } else if (action === 'reply') {
    updated = { ...rec, adminReply: reason || null, adminReplyAt: now, updatedAt: now };
  } else {
    return { ok: false, status: 400, error: 'Hành động không hợp lệ' };
  }

  await store.writeRecord(`${REVIEW_PREFIX}${reviewId}`, updated, 'Website review');
  return { ok: true, review: updated };
}

/**
 * Aggregate the public rating.
 *
 * Only PUBLISHED reviews count. The average is rounded to ONE decimal place
 * (e.g. 4.3) so a decimal average is displayed correctly, and the raw
 * (unrounded) average is also returned for precision-sensitive consumers.
 */
async function getAggregate() {
  const all = await store.listRecords(REVIEW_PREFIX);
  const published = all.filter((r) => r.status === REVIEW_STATUS.PUBLISHED);

  const total = published.length;
  const sum = published.reduce((s, r) => s + (Number(r.score) || 0), 0);
  const rawAverage = total > 0 ? sum / total : 0;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of published) {
    const s = Math.round(Number(r.score));
    if (s >= 1 && s <= 5) distribution[s] += 1;
  }

  return {
    average: Math.round(rawAverage * 10) / 10,
    rawAverage,
    totalReviews: total,
    totalAllStatuses: all.length,
    distribution,
    hiddenCount: all.filter((r) => r.status === REVIEW_STATUS.HIDDEN).length,
    flaggedCount: all.filter((r) => r.status === REVIEW_STATUS.FLAGGED).length,
  };
}

/**
 * List reviews for the admin review-history screen (Task 5).
 * Supports search, filters and pagination, all server-side.
 */
async function listReviews({ search = '', status = '', score = '', startDate = '', endDate = '', page = 1, limit = 20 } = {}) {
  let all = await store.listRecords(REVIEW_PREFIX);

  // Only published reviews are public; hidden/flagged are moderation states.
  if (status && status !== 'all') {
    all = all.filter((r) => r.status === status);
  }
  if (score) {
    const s = Number(score);
    if (Number.isFinite(s)) all = all.filter((r) => Math.round(Number(r.score)) === s);
  }
  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) {
      all = all.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    }
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      all = all.filter((r) => new Date(r.createdAt).getTime() <= d.getTime());
    }
  }
  if (search) {
    const q = String(search).trim().toLowerCase();
    all = all.filter(
      (r) =>
        (r.reviewerName || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q) ||
        (r.transactionId || '').toLowerCase().includes(q) ||
        (r.transactionDescription || '').toLowerCase().includes(q)
    );
  }

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  const items = all.slice(start, start + limit).map((r) => ({ ...r, _key: undefined, _updatedAt: undefined }));

  return { items, pagination: { page: safePage, limit, total, totalPages } };
}

/** Review activity over time (for the dashboard chart). */
async function getActivitySeries({ period = 'month', buckets = 12 } = {}) {
  const all = await store.listRecords(REVIEW_PREFIX);
  const now = new Date();

  // Build a continuous bucket axis so empty periods still render.
  const axis = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    axis.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
      count: 0,
      average: 0,
      _sum: 0,
    });
  }
  const index = new Map(axis.map((a) => [a.key, a]));

  for (const r of all) {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket._sum += Number(r.score) || 0;
  }

  return axis.map((a) => ({
    label: a.label,
    key: a.key,
    count: a.count,
    average: a.count > 0 ? Math.round((a._sum / a.count) * 10) / 10 : 0,
  }));
}

module.exports = {
  REVIEW_PREFIX,
  CLAIM_PREFIX,
  REVIEW_STATUS,
  PURPOSES,
  findQualifyingTransactions,
  checkEligibility,
  createReview,
  getReview,
  updateReview,
  moderateReview,
  getAggregate,
  listReviews,
  getActivitySeries,
};
