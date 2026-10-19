/**
 * Star System Helper Functions
 * Handles star grants, spending, and expiration logic
 */

const STAR_PACKAGES = {
  standard: { stars: 20, days: 30 },
  vip: { stars: 75, days: 30 },
  basic: { stars: 0, days: 30 },
  verify: { stars: 0, days: 1 }, // No stars for verification service
};

/**
 * Get star allocation for a package
 */
function getStarAllocation(packageId) {
  return STAR_PACKAGES[packageId] || { stars: 0, days: 30 };
}

/**
 * Grant stars to user after successful subscription payment
 * Uses grantRef for idempotency - one grant per subscription cycle
 * 
 * @param {Prisma.TransactionClient} tx - Prisma transaction client
 * @param {string} userId - User ID
 * @param {string} subscriptionId - Subscription ID
 * @param {string} packageId - Package ID
 * @param {Date} expiresAt - Subscription expiry date (also star expiry)
 * @param {string} orderId - Optional order ID for audit
 * @returns {Promise<{granted: boolean, batch?: object, error?: string}>}
 */
async function grantStarsToUser(tx, userId, subscriptionId, packageId, expiresAt, orderId = null) {
  const { stars, days } = getStarAllocation(packageId);
  
  // No stars for basic/verify packages
  if (stars === 0) {
    return { granted: false, reason: 'No stars for this package' };
  }

  // Create unique grant reference: sub_<subscriptionId>
  const grantRef = `sub_${subscriptionId}`;

  // Idempotency check: prevent duplicate grants
  const existingBatch = await tx.starGrantBatch.findUnique({
    where: { grantRef },
  });

  if (existingBatch) {
    return { granted: false, reason: 'Grant already exists for this subscription cycle' };
  }

  // Ensure StarCredit exists for user
  let starCredit = await tx.starCredit.findUnique({
    where: { userId },
  });

  if (!starCredit) {
    starCredit = await tx.starCredit.create({
      data: { userId },
    });
  }

  // Calculate star expiration (same as subscription expiry)
  const starExpiresAt = expiresAt;

  // Create star grant batch
  const batch = await tx.starGrantBatch.create({
    data: {
      userId,
      grantRef,
      subscriptionId,
      packageId,
      originalAmount: stars,
      remainingAmount: stars,
      expiresAt: starExpiresAt,
      isExpired: false,
    },
  });

  // Record GRANT transaction
  await tx.starTransaction.create({
    data: {
      userId,
      type: 'GRANT',
      amount: stars,
      balanceAfter: stars, // Simplified - actual balance computed from batches
      description: `Nhận ${stars} Stars từ gói ${packageId}`,
      grantBatchId: batch.id,
      subscriptionId,
    },
  });

  return { granted: true, batch, stars };
}

/**
 * Spend stars for VIP boost (FIFO - earliest expiring first)
 * 
 * @param {Prisma.TransactionClient} tx - Prisma transaction client
 * @param {string} userId - User ID
 * @param {number} starsToSpend - Number of stars to spend
 * @param {string} listingId - Listing ID for the boost
 * @param {string} boostOrderId - Unique order ID for idempotency
 * @returns {Promise<{success: boolean, spent: number, remainingBalance: number, error?: string}>}
 */
async function spendStars(tx, userId, starsToSpend, listingId, boostOrderId) {
  // Idempotency check - prevent duplicate spending
  const existingTx = await tx.starTransaction.findFirst({
    where: {
      userId,
      boostOrderId,
      type: 'SPEND',
    },
  });

  if (existingTx) {
    return { success: false, error: 'This boost order has already been processed' };
  }

  // Get available batches (unexpired, with remaining stars), sorted by expiry (FIFO)
  const validBatches = await tx.starGrantBatch.findMany({
    where: {
      userId,
      isExpired: false,
      expiresAt: { gt: new Date() },
      remainingAmount: { gt: 0 },
    },
    orderBy: { expiresAt: 'asc' }, // FIFO: spend from earliest expiring first
  });

  // Calculate total available
  const totalAvailable = validBatches.reduce((sum, b) => sum + b.remainingAmount, 0);

  if (totalAvailable < starsToSpend) {
    return { success: false, error: `Không đủ Stars. Cần ${starsToSpend}, có ${totalAvailable}` };
  }

  // Spend from batches (FIFO)
  let remaining = starsToSpend;
  const spentBatches = [];

  for (const batch of validBatches) {
    if (remaining <= 0) break;

    const toSpend = Math.min(batch.remainingAmount, remaining);
    
    // Update batch remaining amount
    await tx.starGrantBatch.update({
      where: { id: batch.id },
      data: { remainingAmount: { decrement: toSpend } },
    });

    spentBatches.push({ batchId: batch.id, spent: toSpend });
    remaining -= toSpend;
  }

  // Record SPEND transaction with reference to primary batch
  const primaryBatchId = spentBatches[0]?.batchId || null;
  
  await tx.starTransaction.create({
    data: {
      userId,
      type: 'SPEND',
      amount: starsToSpend,
      balanceAfter: totalAvailable - starsToSpend,
      description: `Sử dụng ${starsToSpend} Stars để đẩy VIP tin đăng`,
      grantBatchId: primaryBatchId,
      listingId,
      boostOrderId,
    },
  });

  // Calculate remaining balance
  const remainingBalance = totalAvailable - starsToSpend;

  return {
    success: true,
    spent: starsToSpend,
    remainingBalance,
    spentBatches,
  };
}

/**
 * Get available star balance (excluding expired batches)
 * Call this when querying balance to ensure expired batches are excluded
 * 
 * @param {Prisma.TransactionClient} tx - Prisma transaction client
 * @param {string} userId - User ID
 * @returns {Promise<number>} Available stars
 */
async function getAvailableStars(tx, userId) {
  const now = new Date();

  // Mark expired batches first
  await tx.starGrantBatch.updateMany({
    where: {
      userId,
      isExpired: false,
      expiresAt: { lte: now },
      remainingAmount: { gt: 0 },
    },
    data: {
      isExpired: true,
      expiredAt: now,
    },
  });

  // Record EXPIRE transactions for newly expired batches
  const expiredBatches = await tx.starGrantBatch.findMany({
    where: {
      userId,
      isExpired: true,
      expiredAt: now,
      remainingAmount: { gt: 0 }, // Only those with unused stars
    },
  });

  for (const batch of expiredBatches) {
    // Get previous balance for audit
    const lastTx = await tx.starTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    await tx.starTransaction.create({
      data: {
        userId,
        type: 'EXPIRE',
        amount: batch.remainingAmount,
        balanceAfter: lastTx ? Math.max(0, lastTx.balanceAfter - batch.remainingAmount) : 0,
        description: `Hết hạn ${batch.remainingAmount} Stars không sử dụng`,
        grantBatchId: batch.id,
      },
    });
  }

  // Sum remaining from all unexpired batches
  const result = await tx.starGrantBatch.aggregate({
    where: {
      userId,
      isExpired: false,
      expiresAt: { gt: now },
    },
    _sum: {
      remainingAmount: true,
    },
  });

  return result._sum.remainingAmount || 0;
}

module.exports = {
  STAR_PACKAGES,
  getStarAllocation,
  grantStarsToUser,
  spendStars,
  getAvailableStars,
};
