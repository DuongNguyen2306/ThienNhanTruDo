/**
 * READ-ONLY audit script — performs no writes.
 * Purpose: ground schema/API decisions in real production data.
 * Run: node prisma/audit-readonly.js
 */
const prisma = require('../src/db');

(async () => {
  const out = {};
  const log = (k, v) => { out[k] = v; };

  // 1. User counts by role
  const byRole = await prisma.user.groupBy({ by: ['role'], _count: true });
  log('usersByRole', byRole.map(r => ({ role: r.role, count: r._count })));
  log('totalUsers', byRole.reduce((s, r) => s + r._count, 0));

  // 2. Null-email users (latent @unique-on-nullable issue)
  const nullEmail = await prisma.user.count({ where: { email: null } });
  const totalWithEmail = await prisma.user.count({ where: { email: { not: null } } });
  log('usersNullEmail', nullEmail);
  log('usersWithEmail', totalWithEmail);

  // 3. New users this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  log('newUsersThisMonth', await prisma.user.count({ where: { createdAt: { gte: monthStart } } }));

  // 4. Transactions by type+status
  const txGroup = await prisma.transaction.groupBy({ by: ['type', 'status'], _sum: { amount: true }, _count: true });
  log('transactionsByTypeStatus', txGroup.map(t => ({
    type: t.type, status: t.status, count: t._count, amount: t._sum.amount || 0,
  })));

  // 5. Transactions by method+status
  const txMethod = await prisma.transaction.groupBy({ by: ['method', 'status'], _sum: { amount: true }, _count: true });
  log('transactionsByMethodStatus', txMethod.map(t => ({
    method: t.method, status: t.status, count: t._count, amount: t._sum.amount || 0,
  })));

  // 6. Sample descriptions (for category inference on legacy rows)
  const sample = await prisma.transaction.findMany({
    select: { id: true, type: true, method: true, status: true, amount: true, description: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
  log('recentTransactionSamples', sample.map(t => ({
    type: t.type, method: t.method, status: t.status, amount: t.amount, description: t.description,
  })));

  // 7. Reviews (room-level) summary
  const reviewCount = await prisma.review.count();
  const hiddenReviews = await prisma.review.count({ where: { hidden: true } });
  log('roomReviews', { total: reviewCount, hidden: hiddenReviews });

  // 8. Does WebsiteReview model already exist? (probe)
  log('websiteReviewModelExists', !!prisma.websiteReview);

  // 9. Package orders / boost orders — are they linked to Transactions?
  const approvedOrders = await prisma.packageOrder.count({ where: { status: 'APPROVED' } });
  const approvedBoosts = await prisma.boostOrder.count({ where: { status: 'APPROVED' } });
  const approvedDeposits = await prisma.walletDeposit.count({ where: { status: 'APPROVED' } });
  log('approvedOrders', { packageOrder: approvedOrders, boostOrder: approvedBoosts, walletDeposit: approvedDeposits });

  // 10. Subscriptions (revenue-bearing products) and Stars
  const subs = await prisma.subscription.count();
  const starGrants = await prisma.starGrantBatch.count();
  log('subscriptions', subs);
  log('starGrantBatches', starGrants);

  // 11. Wallet balances (to reconcile against transactions)
  const wallets = await prisma.sellerWallet.aggregate({ _sum: { balance: true, totalSpent: true }, _count: true });
  log('wallets', { count: wallets._count, balance: wallets._sum.balance || 0, totalSpent: wallets._sum.totalSpent || 0 });

  // 12. Any transaction rows lacking a description (category inference fallback)
  const noDesc = await prisma.transaction.count({ where: { OR: [{ description: null }, { description: '' }] } });
  log('transactionsWithoutDescription', noDesc);

  console.log(JSON.stringify(out, null, 2));
})()
  .catch((e) => { console.error('AUDIT FAILED:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
