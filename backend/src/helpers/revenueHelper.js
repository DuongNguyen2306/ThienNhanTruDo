/**
 * Revenue Helper — canonical revenue math for the Admin dashboard.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The previous implementation had three defects that inflated reported revenue:
 *
 *  1. `GET /api/admin/dashboard` summed EVERY transaction (any type, any status)
 *     as "totalRevenue" — including pending deposits and failed payments.
 *  2. `GET /api/admin/finance/chart` filtered `status: 'completed'` in the query
 *     and then also branched on `tx.status === 'refunded'`, so the refund branch
 *     was unreachable and refunds never appeared in the chart.
 *  3. Wallet top-ups (`type: 'deposit'`) and the wallet spending they later fund
 *     (`type: 'payment', method: 'wallet'`) were both counted, so the same money
 *     was recognised twice.
 *
 * REVENUE MODEL (single source of truth)
 * --------------------------------------
 *   Recognized revenue  = completed `type: 'payment'` transactions.
 *   A wallet top-up is a LIABILITY (prepaid balance), never revenue.
 *   A wallet-funded purchase IS revenue — the money reached the platform,
 *   it simply arrived via a different rail.
 *   Net revenue         = recognized revenue − refunds.
 *
 * Because `Transaction` has no `category` column, categories are DERIVED from
 * (type, method, status, description). Deriving is also *better* than a stored
 * column here: it classifies historical rows correctly with no backfill.
 */

// ── Category constants ────────────────────────────────────────────────────
const REVENUE_CATEGORIES = {
  PACKAGE_SUBSCRIPTION: 'package_subscription',
  VERIFICATION: 'verification',
  VIP_BOOST: 'vip_boost',
  OTHER: 'other',
};

const NON_REVENUE_CATEGORIES = {
  WALLET_DEPOSIT: 'wallet_deposit',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
};

const CATEGORY_LABELS = {
  package_subscription: 'Gói thuê bao',
  verification: 'Kiểm định',
  vip_boost: 'Đẩy VIP',
  other: 'Khác',
  wallet_deposit: 'Nạp tiền ví (không tính doanh thu)',
  withdrawal: 'Rút tiền',
  refund: 'Hoàn tiền',
};

/**
 * Classify a single transaction.
 *
 * @param {{type?:string,status?:string,method?:string,description?:string}} tx
 * @returns {{category:string, isRevenue:boolean, isRefund:boolean, isDeposit:boolean}}
 */
function classifyTransaction(tx) {
  const type = (tx?.type || '').toLowerCase();
  const status = (tx?.status || '').toLowerCase();
  const desc = (tx?.description || '').toLowerCase();

  // Refunds are contra-revenue, checked before the generic payment branch.
  if (type === 'refund' || status === 'refunded') {
    return { category: NON_REVENUE_CATEGORIES.REFUND, isRevenue: false, isRefund: true, isDeposit: false };
  }

  // A wallet top-up is a liability, not revenue.
  if (type === 'deposit') {
    return { category: NON_REVENUE_CATEGORIES.WALLET_DEPOSIT, isRevenue: false, isRefund: false, isDeposit: true };
  }

  if (type === 'withdrawal') {
    return { category: NON_REVENUE_CATEGORIES.WITHDRAWAL, isRevenue: false, isRefund: false, isDeposit: false };
  }

  if (type === 'payment') {
    // Order matters: "Mua boost "Gói X" cho tin" contains "gói" as well.
    let category = REVENUE_CATEGORIES.OTHER;
    if (desc.includes('boost') || desc.includes('đẩy vip') || desc.includes('day vip')) {
      category = REVENUE_CATEGORIES.VIP_BOOST;
    } else if (desc.includes('kiểm định') || desc.includes('kiem dinh') || desc.includes('verify')) {
      category = REVENUE_CATEGORIES.VERIFICATION;
    } else if (desc.includes('gói') || desc.includes('mua goi') || desc.includes('gói ')) {
      category = REVENUE_CATEGORIES.PACKAGE_SUBSCRIPTION;
    }
    return { category, isRevenue: true, isRefund: false, isDeposit: false };
  }

  return { category: REVENUE_CATEGORIES.OTHER, isRevenue: false, isRefund: false, isDeposit: false };
}

/**
 * Is this a transaction that represents recognized (earned) revenue?
 * Only a COMPLETED purchase qualifies. Pending and failed payments are not revenue.
 */
function isRecognizedRevenue(tx) {
  const c = classifyTransaction(tx);
  return c.isRevenue && (tx?.status || '').toLowerCase() === 'completed';
}

/**
 * Aggregate a set of transactions into the canonical revenue summary.
 * Every revenue surface in the admin portal uses this function, so the
 * headline number, the chart and the breakdown can never disagree.
 *
 * @param {Array<object>} transactions
 */
function summarizeTransactions(transactions = []) {
  const byCategory = {};
  const ensure = (key) => {
    if (!byCategory[key]) {
      byCategory[key] = { category: key, label: CATEGORY_LABELS[key] || key, total: 0, count: 0, isRevenue: false };
    }
    return byCategory[key];
  };

  let grossRevenue = 0;
  let refunds = 0;
  let deposits = 0;
  let withdrawals = 0;
  let pendingAmount = 0;
  let failedAmount = 0;
  let revenueCount = 0;
  let refundCount = 0;
  let depositCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const tx of transactions) {
    const amount = Number(tx?.amount) || 0;
    const status = (tx?.status || '').toLowerCase();
    const c = classifyTransaction(tx);

    if (c.isRefund) {
      refunds += amount;
      refundCount += 1;
      const bucket = ensure(c.category);
      bucket.total += amount;
      bucket.count += 1;
      continue;
    }

    if (c.isDeposit) {
      deposits += amount;
      depositCount += 1;
      const bucket = ensure(c.category);
      bucket.total += amount;
      bucket.count += 1;
      continue;
    }

    if (c.isRevenue) {
      if (status === 'completed') {
        grossRevenue += amount;
        revenueCount += 1;
        const bucket = ensure(c.category);
        bucket.total += amount;
        bucket.count += 1;
        bucket.isRevenue = true;
      } else if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
        // A failed/cancelled purchase is NOT revenue and NOT outstanding —
        // it will never be collected, so counting it as "pending" would
        // overstate the money still expected to arrive.
        failedAmount += amount;
        failedCount += 1;
      } else {
        // pending purchases are NOT revenue yet
        pendingAmount += amount;
        pendingCount += 1;
      }
      continue;
    }

    if (c.category === NON_REVENUE_CATEGORIES.WITHDRAWAL) {
      withdrawals += amount;
      const bucket = ensure(c.category);
      bucket.total += amount;
      bucket.count += 1;
      continue;
    }

    if (status === 'pending') {
      pendingAmount += amount;
      pendingCount += 1;
    } else if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
      failedAmount += amount;
      failedCount += 1;
    }
  }

  const categories = Object.values(byCategory)
    .map((b) => ({
      ...b,
      total: Math.round(b.total),
      percentage: grossRevenue > 0 && b.isRevenue ? Math.round((b.total / grossRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    grossRevenue: Math.round(grossRevenue),
    netRevenue: Math.round(grossRevenue - refunds),
    refunds: Math.round(refunds),
    deposits: Math.round(deposits),
    withdrawals: Math.round(withdrawals),
    pendingAmount: Math.round(pendingAmount),
    failedAmount: Math.round(failedAmount),
    revenueCount,
    refundCount,
    depositCount,
    pendingCount,
    failedCount,
    categories,
  };
}

// ── Period bucketing for charts ───────────────────────────────────────────

const PERIODS = ['day', 'week', 'month', 'quarter', 'year'];

/**
 * Build a sortable bucket key + a human label for a date.
 * Keys are chronological (so sorting by key is correct); labels are cosmetic.
 */
function bucketKeyFor(date, period) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  const day = d.getDate();

  switch (period) {
    case 'week': {
      // ISO-ish week: start of the week (Monday)
      const tmp = new Date(d);
      const dow = (tmp.getDay() + 6) % 7;
      tmp.setDate(tmp.getDate() - dow);
      return {
        key: `${tmp.getFullYear()}-${String(tmp.getMonth() + 1).padStart(2, '0')}-${String(tmp.getDate()).padStart(2, '0')}`,
        label: `Tuần ${tmp.getDate()}/${tmp.getMonth() + 1}`,
      };
    }
    case 'month':
      return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `Tháng ${m + 1}/${y}` };
    case 'quarter': {
      const q = Math.floor(m / 3) + 1;
      return { key: `${y}-Q${q}`, label: `Q${q}/${y}` };
    }
    case 'year':
      return { key: String(y), label: `Năm ${y}` };
    case 'day':
    default:
      return { key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, label: `${String(day).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}` };
  }
}

/**
 * Group transactions into chart buckets.
 * Refunds and deposits are tracked in SEPARATE series so the chart can never
 * present a wallet top-up as revenue.
 *
 * @param {Array<object>} transactions
 * @param {'day'|'week'|'month'|'quarter'|'year'} period
 */
function bucketTransactions(transactions = [], period = 'day') {
  const p = PERIODS.includes(period) ? period : 'day';
  const buckets = new Map();

  for (const tx of transactions) {
    const { key, label } = bucketKeyFor(tx.createdAt, p);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label, revenue: 0, refunds: 0, deposits: 0, count: 0 });
    }
    const b = buckets.get(key);
    const amount = Number(tx?.amount) || 0;
    const status = (tx?.status || '').toLowerCase();
    const c = classifyTransaction(tx);

    if (c.isRefund) {
      b.refunds += amount;
    } else if (c.isDeposit) {
      b.deposits += amount;
    } else if (c.isRevenue && status === 'completed') {
      b.revenue += amount;
      b.count += 1;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.key.localeCompare(b.key)) // chronological, NOT label-alphabetical
    .map((b) => ({
      label: b.label,
      key: b.key,
      revenue: Math.round(b.revenue),
      refunds: Math.round(b.refunds),
      deposits: Math.round(b.deposits),
      count: b.count,
    }));
}

/**
 * Parse a date-range query param pair into a Prisma-compatible filter.
 * Returns null when no range is requested.
 */
function buildDateRange(startDate, endDate) {
  const range = {};
  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!Number.isNaN(d.getTime())) {
      // Make the end date inclusive of the whole day.
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
  }
  return Object.keys(range).length > 0 ? { createdAt: range } : null;
}

module.exports = {
  REVENUE_CATEGORIES,
  NON_REVENUE_CATEGORIES,
  CATEGORY_LABELS,
  PERIODS,
  classifyTransaction,
  isRecognizedRevenue,
  summarizeTransactions,
  bucketKeyFor,
  bucketTransactions,
  buildDateRange,
};
