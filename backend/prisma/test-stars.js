/**
 * Star System Concurrency Tests
 * Run: node prisma/test-stars.js
 */

require('dotenv').config();
const prisma = require('../src/db');
const starService = require('../src/services/starService');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   STAR SYSTEM CONCURRENCY TESTS');
  console.log('═══════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${err.message}`);
      failed++;
    }
  };

  // Setup
  const testSeller = await prisma.user.findFirst({
    where: { role: 'seller' },
    include: { wallet: true }
  });

  if (!testSeller) {
    console.log('❌ No seller found for testing.');
    return;
  }

  console.log(`Testing with seller: ${testSeller.fullName} (${testSeller.id})\n`);
  const userId = testSeller.id;

  // Clean up test data
  await prisma.starTransaction.deleteMany({ where: { userId } });
  await prisma.starGrantBatch.deleteMany({ where: { userId } });
  await prisma.starCredit.deleteMany({ where: { userId } });
  console.log('Cleaned up test data\n');

  // Test 1: Empty database
  await test('Process expired stars on empty database', async () => {
    const result = await starService.processExpiredStars();
    if (result.processed !== 0) throw new Error('Expected 0 processed batches');
  });

  await test('Get available stars on empty database', async () => {
    const balance = await starService.getAvailableStars(userId);
    if (balance !== 0) throw new Error(`Expected 0 balance, got ${balance}`);
  });

  // Test 2: Create grant batch
  await test('Create star grant batch', async () => {
    await prisma.starCredit.create({ data: { userId } });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.starGrantBatch.create({
      data: {
        userId,
        grantRef: `test_grant_${Date.now()}`,
        subscriptionId: 'test_sub_1',
        packageId: 'standard',
        originalAmount: 20,
        remainingAmount: 20,
        expiresAt,
        isExpired: false,
      }
    });
    const balance = await starService.getAvailableStars(userId);
    if (balance !== 20) throw new Error(`Expected 20 balance, got ${balance}`);
  });

  // Test 3: First purchase
  await test('First purchase spends 7 stars', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    if (!listing) throw new Error('No active listing found');
    
    const orderId = `test_uuid_${Date.now()}`;
    const result = await starService.spendStarsAtomic(userId, 7, listing.id, orderId, 7);
    
    if (!result.success) throw new Error(result.error);
    if (result.spent !== 7) throw new Error(`Expected spent 7, got ${result.spent}`);
    if (result.remainingBalance !== 13) throw new Error(`Expected remaining 13, got ${result.remainingBalance}`);
  });

  // Test 4: Network retry with same UUID
  await test('Network retry with same UUID - idempotent', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    const orderId = `test_uuid_${Date.now()}`;
    
    // First request
    const result1 = await starService.spendStarsAtomic(userId, 5, listing.id, orderId, 5);
    
    // Network retry with same UUID
    const result2 = await starService.spendStarsAtomic(userId, 5, listing.id, orderId, 5);
    
    if (!result2.idempotent) throw new Error('Second request should be idempotent');
    if (result2.spent !== 5) throw new Error(`Expected spent 5, got ${result2.spent}`);
    
    // Balance should not have changed
    const balance = await starService.getAvailableStars(userId);
    if (balance !== 8) throw new Error(`Balance should be 8, got ${balance}`);
  });

  // Test 5: Two legitimate purchases same listing and duration
  await test('Two legitimate purchases with same listing and duration (different UUIDs)', async () => {
    // Reset with fresh balance
    await prisma.starGrantBatch.deleteMany({ where: { userId } });
    await prisma.starGrantBatch.create({
      data: {
        userId,
        grantRef: `test_legit_${Date.now()}`,
        subscriptionId: 'test_legit',
        packageId: 'vip',
        originalAmount: 30,
        remainingAmount: 30,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isExpired: false,
      }
    });
    
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    // First purchase: 7 stars
    const orderId1 = `legit_uuid_${Date.now()}_1`;
    const result1 = await starService.spendStarsAtomic(userId, 7, listing.id, orderId1, 7);
    
    // Second purchase: 7 stars (different UUID, same listing and duration is VALID)
    const orderId2 = `legit_uuid_${Date.now()}_2`;
    const result2 = await starService.spendStarsAtomic(userId, 7, listing.id, orderId2, 7);
    
    if (!result1.success) throw new Error('First purchase failed: ' + result1.error);
    if (!result2.success) throw new Error('Second purchase failed: ' + result2.error);
    if (result1.idempotent) throw new Error('First purchase should NOT be idempotent');
    if (result2.idempotent) throw new Error('Second purchase should NOT be idempotent');
    
    // Check both spent 7 stars each
    if (result1.spent !== 7) throw new Error(`First should spend 7, spent ${result1.spent}`);
    if (result2.spent !== 7) throw new Error(`Second should spend 7, spent ${result2.spent}`);
    
    // Balance should be 30 - 14 = 16
    const balance = await starService.getAvailableStars(userId);
    if (balance !== 16) throw new Error(`Expected balance 16, got ${balance}`);
    
    console.log(`   Both purchases succeeded, balance: ${balance} stars`);
  });

  // Test 6: Insufficient stars rejection
  await test('Insufficient stars rejects purchase', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    try {
      await starService.spendStarsAtomic(userId, 100, listing.id, `test_insuff_${Date.now()}`, 100);
      throw new Error('Should have thrown insufficient stars error');
    } catch (err) {
      if (!err.message.includes('Không đủ Stars')) {
        throw err;
      }
      console.log(`   Correctly rejected: ${err.message}`);
    }
  });

  // Test 7: Concurrent requests - race condition handling
  // Scenario: 15 stars available, two requests try to spend 10 each
  // Only ONE should succeed (spending 10), the other should fail after retry
  await test('Concurrent requests with different UUIDs - race condition handled', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    // Clean slate
    await prisma.starTransaction.deleteMany({ where: { userId } });
    await prisma.starGrantBatch.deleteMany({ where: { userId } });
    
    // Give exactly 15 stars
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.starGrantBatch.create({
      data: {
        userId,
        grantRef: `test_concurrent_${Date.now()}`,
        subscriptionId: 'test_concurrent',
        packageId: 'vip',
        originalAmount: 15,
        remainingAmount: 15,
        expiresAt,
        isExpired: false,
      }
    });
    
    const balance = await starService.getAvailableStars(userId);
    console.log(`   Initial balance: ${balance} stars`);
    
    // Two concurrent requests each trying to spend 10 stars
    const orderId1 = `concurrent_1_${Date.now()}`;
    const orderId2 = `concurrent_2_${Date.now()}`;
    
    const [result1, result2] = await Promise.allSettled([
      starService.spendStarsAtomic(userId, 10, listing.id, orderId1, 10),
      starService.spendStarsAtomic(userId, 10, listing.id, orderId2, 10),
    ]);
    
    const successCount = [
      result1.status === 'fulfilled' && result1.value.success,
      result2.status === 'fulfilled' && result2.value.success,
    ].filter(Boolean).length;
    
    const totalSpent = [
      result1.status === 'fulfilled' && result1.value.success ? result1.value.spent : 0,
      result2.status === 'fulfilled' && result2.value.success ? result2.value.spent : 0,
    ].reduce((a, b) => a + b, 0);
    
    console.log(`   Successful purchases: ${successCount}`);
    console.log(`   Total stars spent: ${totalSpent}`);
    
    // Exactly one should succeed, spending 10 stars
    if (successCount !== 1) {
      throw new Error(`Expected exactly 1 success, got ${successCount}`);
    }
    if (totalSpent !== 10) {
      throw new Error(`Expected exactly 10 stars spent, got ${totalSpent}`);
    }
    
    // Final balance should be 5
    const finalBalance = await starService.getAvailableStars(userId);
    console.log(`   Final balance: ${finalBalance} stars`);
    if (finalBalance !== 5) {
      throw new Error(`Expected balance 5, got ${finalBalance}`);
    }
  });

  // Test 8: Expiration processes expired batches
  await test('Expiration processes expired batches', async () => {
    const expiresAt = new Date(Date.now() + 1000);
    const grantRef = `test_expire_${Date.now()}`;
    await prisma.starGrantBatch.create({
      data: {
        userId,
        grantRef,
        subscriptionId: 'test_sub_expire',
        packageId: 'test',
        originalAmount: 10,
        remainingAmount: 10,
        expiresAt,
        isExpired: false,
      }
    });

    console.log('   Waiting 2 seconds for batch to expire...');
    await sleep(2000);

    const result = await starService.processExpiredStars();
    if (result.processed === 0) throw new Error('Expected 1 processed batch');
    if (result.expired !== 10) throw new Error(`Expected 10 expired, got ${result.expired}`);
    
    const batch = await prisma.starGrantBatch.findUnique({ where: { grantRef } });
    if (!batch) throw new Error('Batch not found');
    if (!batch.isExpired) throw new Error('Batch should be marked expired');
    if (batch.remainingAmount !== 0) throw new Error('Remaining should be 0');
  });

  // Test 9: Second expiration run is idempotent
  await test('Second expiration run is idempotent', async () => {
    const result = await starService.processExpiredStars();
    if (result.processed !== 0) throw new Error('Second run should process 0 batches');
  });

  // Test 10: VIP extension preserved
  await test('VIP expiration is extended, not replaced', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    const currentVipExpiry = listing.vipExpiresAt;
    const orderId = `test_extend_${Date.now()}`;
    
    const result = await starService.spendStarsAtomic(userId, 3, listing.id, orderId, 3);
    
    if (!result.success) throw new Error(result.error);
    
    const updatedListing = await prisma.listing.findUnique({
      where: { id: listing.id }
    });
    
    const oldExpiry = new Date(currentVipExpiry);
    const newExpiry = new Date(updatedListing.vipExpiresAt);
    
    const daysAdded = (newExpiry - oldExpiry) / (24 * 60 * 60 * 1000);
    if (daysAdded < 2.9 || daysAdded > 3.1) {
      throw new Error(`Expected ~3 days extension, got ${daysAdded}`);
    }
    console.log(`   VIP extended by ${daysAdded.toFixed(1)} days`);
  });

  // Test 11: Transaction rollback on failure
  await test('Transaction rollback - failed purchase does not affect balance', async () => {
    const listing = await prisma.listing.findFirst({
      where: { sellerId: userId, status: 'active' }
    });
    
    const balanceBefore = await starService.getAvailableStars(userId);
    
    try {
      // Try to spend more than available
      await starService.spendStarsAtomic(userId, balanceBefore + 100, listing.id, `test_fail_${Date.now()}`, balanceBefore + 100);
    } catch (err) {
      console.log(`   Expected failure: ${err.message}`);
    }
    
    const balanceAfter = await starService.getAvailableStars(userId);
    if (balanceBefore !== balanceAfter) {
      throw new Error(`Balance changed after failed purchase: ${balanceBefore} -> ${balanceAfter}`);
    }
    console.log(`   Balance unchanged: ${balanceBefore}`);
  });

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`   RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════');

  // Cleanup
  await prisma.starTransaction.deleteMany({ where: { userId } });
  await prisma.starGrantBatch.deleteMany({ where: { userId } });
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
