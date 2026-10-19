require('dotenv').config();
const prisma = require('../src/db');

async function main() {
  await prisma.$connect();
  
  console.log('=== star_transactions indexes ===');
  
  // Check using Prisma's findMany for duplicates
  const transactions = await prisma.starTransaction.findMany({
    where: { boostOrderId: { not: null } },
    select: { userId: true, boostOrderId: true },
    orderBy: { createdAt: 'asc' },
  });
  
  console.log(`Total records with non-null boostOrderId: ${transactions.length}`);
  
  // Check for duplicates
  const seen = new Map();
  const duplicates = [];
  
  for (const tx of transactions) {
    const key = `${tx.userId}:${tx.boostOrderId}`;
    if (seen.has(key)) {
      duplicates.push({ userId: tx.userId, boostOrderId: tx.boostOrderId, count: seen.get(key) + 1 });
    } else {
      seen.set(key, 1);
    }
  }
  
  console.log(`Duplicate (userId, boostOrderId) pairs found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Sample duplicates (showing first 5):');
    const uniqueDups = [...new Set(duplicates.map(d => d.boostOrderId))];
    console.log(uniqueDups.slice(0, 5).map(id => `  - ${id}`).join('\n'));
  } else {
    console.log('No duplicate boostOrderId values found - safe to add unique index');
  }
  
  // Check star_grant_batches grantRef uniqueness
  console.log('\n=== Checking grantRef uniqueness ===');
  const batches = await prisma.starGrantBatch.findMany({
    where: { grantRef: { not: null } },
    select: { userId: true, grantRef: true },
  });
  
  const grantRefSeen = new Map();
  const grantRefDups = [];
  
  for (const batch of batches) {
    const key = batch.grantRef;
    if (grantRefSeen.has(key)) {
      grantRefDups.push({ grantRef: batch.grantRef });
    } else {
      grantRefSeen.set(key, true);
    }
  }
  
  console.log(`Duplicate grantRef values found: ${grantRefDups.length}`);
  
  // List all existing indexes on star_transactions
  console.log('\n=== Prisma indexes on star_transactions model ===');
  // These are defined in schema.prisma
  console.log('  - @@index([userId, createdAt])');
  console.log('  - @@index([userId, type])');
  
  console.log('\n=== Prisma indexes on star_grant_batches model ===');
  console.log('  - @@index([userId, expiresAt])');
  console.log('  - @@index([userId, isExpired])');
  console.log('  - grantRef @unique (defined as field-level unique)');
  
  await prisma.$disconnect();
  
  console.log('\n=== PROPOSED INDEX ===');
  console.log('To enforce uniqueness on (userId, boostOrderId):');
  console.log('');
  console.log('MongoDB Command:');
  console.log('db.star_transactions.createIndex(');
  console.log('  { userId: 1, boostOrderId: 1 },');
  console.log('  { unique: true, partialFilterExpression: { boostOrderId: { $exists: true, $ne: null } } }');
  console.log(')');
  console.log('');
  console.log('This creates a sparse unique index that:');
  console.log('  - Only indexes documents where boostOrderId is not null');
  console.log('  - Enforces uniqueness of (userId, boostOrderId) pairs');
  console.log('  - Allows multiple null boostOrderId records per user');
}

main().catch(console.error);
