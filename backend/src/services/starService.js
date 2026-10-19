/**
 * Star System Service
 * Handles star expiration, grants, and spending logic
 * Uses atomic operations for consistency and concurrency safety
 */

const prisma = require('../db');

/**
 * Process expired StarGrantBatch records
 * Idempotent: only processes batches where isExpired = false
 * Uses atomic conditional update to prevent race conditions
 */
async function processExpiredStars() {
  const now = new Date();
  
  try {
    // Find batches that are due to expire (but not yet marked)
    // This query runs outside the transaction for efficiency
    const expiredBatches = await prisma.starGrantBatch.findMany({
      where: {
        isExpired: false,
        expiresAt: { lte: now },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        userId: true,
        remainingAmount: true,
      },
    });

    if (expiredBatches.length === 0) {
      return { processed: 0, expired: 0 };
    }

    // Process each batch atomically
    // Each batch is independent, so we process them sequentially for safety
    let totalExpired = 0;
    const results = [];
    
    for (const batch of expiredBatches) {
      try {
        const result = await expireSingleBatch(batch.id, batch.userId, batch.remainingAmount, now);
        results.push({ batchId: batch.id, success: true, ...result });
        totalExpired += result.expired;
      } catch (err) {
        console.error(`[Star Expiration] Failed to expire batch ${batch.id}:`, err.message);
        results.push({ batchId: batch.id, success: false, error: err.message });
      }
    }

    console.log(`[Star Expiration] Processed ${expiredBatches.length} batches, expired ${totalExpired} Stars`);
    return { processed: results.filter(r => r.success).length, expired: totalExpired, errors: results.filter(r => !r.success) };
  } catch (error) {
    console.error('[Star Expiration] Error:', error);
    throw error;
  }
}

/**
 * Expire a single batch atomically
 * Uses Prisma transaction to ensure both batch update and EXPIRE transaction succeed or fail together
 */
async function expireSingleBatch(batchId, userId, amount, now) {
  return prisma.$transaction(async (tx) => {
    // Double-check within transaction - prevents race conditions
    const batch = await tx.starGrantBatch.findUnique({
      where: { id: batchId },
      select: { isExpired: true, remainingAmount: true },
    });

    if (!batch) {
      return { expired: 0, error: 'Batch not found' };
    }

    if (batch.isExpired || batch.remainingAmount <= 0) {
      return { expired: 0, alreadyProcessed: true };
    }

    // Get last transaction balance for audit trail
    const lastTx = await tx.starTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    // Step 1: Create EXPIRE transaction FIRST (within same transaction)
    // If this fails, the whole transaction rolls back
    await tx.starTransaction.create({
      data: {
        userId,
        type: 'EXPIRE',
        amount: amount,
        balanceAfter: Math.max(0, (lastTx?.balanceAfter || 0) - amount),
        description: `Hết hạn ${amount} Stars không sử dụng`,
        grantBatchId: batchId,
      },
    });

    // Step 2: Mark batch as expired and zero remaining
    // If this fails after step 1, transaction rolls back
    await tx.starGrantBatch.update({
      where: { id: batchId },
      data: {
        isExpired: true,
        expiredAt: now,
        remainingAmount: 0,
      },
    });

    return { expired: amount, alreadyProcessed: false };
  }, {
    timeout: 5000,
    maxWait: 3000,
  });
}

/**
 * Calculate available stars for a user
 * Excludes expired batches and marks them as expired first
 */
async function getAvailableStars(userId) {
  const now = new Date();

  // Mark any expired batches atomically
  await prisma.starGrantBatch.updateMany({
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

  // Sum available from unexpired batches
  const result = await prisma.starGrantBatch.aggregate({
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

/**
 * Spend stars atomically with concurrency protection
 * Uses optimistic locking via unique boostOrderId to prevent double-spending
 * 
 * @param {string} userId
 * @param {number} starsToSpend
 * @param {string} listingId
 * @param {string} boostOrderId - unique ID for this purchase (used for idempotency)
 * @param {number} days - duration in days
 * @returns {{ success: boolean, spent?: number, remainingBalance?: number, vipExpiresAt?: Date, error?: string, idempotent?: boolean }}
 */
async function spendStarsAtomic(userId, starsToSpend, listingId, boostOrderId, days) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 100;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await doSpendStars(userId, starsToSpend, listingId, boostOrderId, days);
    } catch (error) {
      // Check if it's a retryable error (MongoDB transaction conflict)
      const isRetryable = error.code === 251 || // TransactionConflict
                          error.code === 'P2034' || // Prisma transaction conflict
                          error.message?.includes('Transaction') ||
                          error.message?.includes('conflict');
      
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        console.log(`[StarService] Retryable error, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }
}

/**
 * Core spending logic - runs inside transaction
 */
async function doSpendStars(userId, starsToSpend, listingId, boostOrderId, days) {
  return prisma.$transaction(async (tx) => {
    // STEP 1: Idempotency check - has this order already been processed?
    const existingTx = await tx.starTransaction.findFirst({
      where: {
        userId,
        boostOrderId,
        type: 'SPEND',
      },
    });

    if (existingTx) {
      // Already spent - return original result
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        select: { vipExpiresAt: true },
      });
      return {
        success: true,
        idempotent: true,
        spent: existingTx.amount,
        remainingBalance: existingTx.balanceAfter,
        vipExpiresAt: listing?.vipExpiresAt ? new Date(listing.vipExpiresAt) : null,
      };
    }

    const now = new Date();

    // STEP 2: Mark expired batches (fast, no records to update if none expired)
    const expiredUpdateResult = await tx.starGrantBatch.updateMany({
      where: {
        userId,
        isExpired: false,
        expiresAt: { lte: now },
        remainingAmount: { gt: 0 },
      },
      data: { isExpired: true, expiredAt: now },
    });

    // STEP 3: Atomic batch selection with sufficient remaining stars
    // This query finds and locks the exact batches we need
    // We use a two-phase approach:
    // Phase A: Query available batches with enough stars
    // Phase B: Atomically decrement each batch (prevents overspending)
    
    // Get batches with remaining stars, ordered by expiry (FIFO)
    const validBatches = await tx.starGrantBatch.findMany({
      where: {
        userId,
        isExpired: false,
        expiresAt: { gt: now },
        remainingAmount: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });

    // Calculate total available
    const totalAvailable = validBatches.reduce((sum, b) => sum + b.remainingAmount, 0);

    if (totalAvailable < starsToSpend) {
      throw Object.assign(
        new Error(`Không đủ Stars. Cần ${starsToSpend}, có ${totalAvailable}`),
        { statusCode: 400 }
      );
    }

    // Phase B: Atomically decrement each batch
    // Each decrement uses remainingAmount >= toSpend as a guard
    // This prevents race conditions where two purchases could both succeed
    let remaining = starsToSpend;
    const spentBatches = [];
    const failedBatches = [];

    for (const batch of validBatches) {
      if (remaining <= 0) break;
      
      const toSpend = Math.min(batch.remainingAmount, remaining);
      
      // Atomic conditional update: only succeed if remainingAmount >= toSpend
      const result = await tx.starGrantBatch.updateMany({
        where: {
          id: batch.id,
          remainingAmount: { gte: toSpend }, // Guard: only if we have enough
        },
        data: {
          remainingAmount: { decrement: toSpend },
        },
      });

      if (result.count === 1) {
        // Successfully decremented
        spentBatches.push({ batchId: batch.id, spent: toSpend });
        remaining -= toSpend;
      } else {
        // Batch was modified concurrently (race condition)
        // This batch is no longer reliable - retry the whole transaction
        failedBatches.push(batch.id);
      }
    }

    // If any batch failed due to race condition, throw to trigger retry
    if (failedBatches.length > 0) {
      throw Object.assign(
        new Error('Transaction conflict - please retry'),
        { code: 'P2034', retryable: true }
      );
    }

    // Safety check: ensure we got all the stars we needed
    if (remaining > 0) {
      throw Object.assign(
        new Error(`Không đủ Stars. Thiếu ${remaining} Stars`),
        { statusCode: 400 }
      );
    }

    // STEP 4: Verify listing ownership and status
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw Object.assign(new Error('Không tìm thấy tin đăng'), { statusCode: 404 });
    }

    if (listing.sellerId !== userId) {
      throw Object.assign(new Error('Bạn không sở hữu tin đăng này'), { statusCode: 403 });
    }

    if (listing.status !== 'active') {
      throw Object.assign(new Error('Tin đăng phải đang hoạt động'), { statusCode: 400 });
    }

    // STEP 5: Calculate new VIP expiry (extend from current or now)
    const listingNow = new Date();
    const currentVipExpiry = listing.vipExpiresAt ? new Date(listing.vipExpiresAt) : null;
    const baseDate = currentVipExpiry && currentVipExpiry > listingNow
      ? currentVipExpiry
      : listingNow;
    const newVipExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    // STEP 6: Record SPEND transaction with primary batch reference
    const primaryBatchId = spentBatches[0]?.batchId || null;
    const remainingBalance = totalAvailable - starsToSpend;

    await tx.starTransaction.create({
      data: {
        userId,
        type: 'SPEND',
        amount: starsToSpend,
        balanceAfter: remainingBalance,
        description: `Sử dụng ${starsToSpend} Stars để đẩy VIP ${days} ngày`,
        grantBatchId: primaryBatchId,
        listingId,
        boostOrderId,
      },
    });

    // STEP 7: Update listing with VIP status (non-destructive)
    // Use upsert-like logic to only extend, never shorten
    await tx.listing.update({
      where: { id: listingId },
      data: {
        vip: true,
        vipExpiresAt: newVipExpiry,
      },
    });

    // STEP 8: Create audit log
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: 'purchase_vip_boost_stars',
        target: listingId,
        targetType: 'listing',
        details: JSON.stringify({
          starsUsed: starsToSpend,
          duration: days,
          vipExpiresAt: newVipExpiry,
          boostOrderId,
        }),
      },
    });

    return {
      success: true,
      idempotent: false,
      spent: starsToSpend,
      remainingBalance,
      vipExpiresAt: newVipExpiry,
    };
  }, {
    // Transaction options for better concurrency handling
    timeout: 10000,
    maxWait: 5000,
  });
}

module.exports = {
  processExpiredStars,
  expireSingleBatch,
  getAvailableStars,
  spendStarsAtomic,
  doSpendStars,
};
