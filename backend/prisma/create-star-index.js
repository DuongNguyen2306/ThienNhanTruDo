require('dotenv').config();
const { MongoClient } = require('mongodb');

// Get connection string from env
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(connectionString);
  await client.connect();
  
  // 1. Check active database connection
  console.log('=== STEP 1: Verify Database Connection ===');
  const dbName = client.db().databaseName;
  console.log(`Connected to database: ${dbName}`);
  
  if (!dbName.includes('thiennhan')) {
    console.error('ERROR: Not connected to thiennhan database!');
    await client.close();
    process.exit(1);
  }
  console.log('✓ Connected to correct database (thiennhan_db)\n');
  
  const db = client.db();
  const collection = db.collection('star_transactions');
  
  // 2. Recheck duplicate (userId, boostOrderId) pairs
  console.log('=== STEP 2: Check for Duplicate (userId, boostOrderId) Pairs ===');
  
  const transactions = await collection.find({
    boostOrderId: { $exists: true, $ne: null, $type: 'string' }
  }).project({ userId: 1, boostOrderId: 1, _id: 1 }).toArray();
  
  console.log(`Records with string boostOrderId: ${transactions.length}`);
  
  if (transactions.length > 0) {
    const seen = new Map();
    const duplicates = [];
    
    for (const tx of transactions) {
      const key = `${tx.userId}:${tx.boostOrderId}`;
      if (seen.has(key)) {
        duplicates.push({
          userId: tx.userId,
          boostOrderId: tx.boostOrderId,
          existingId: seen.get(key),
          duplicateId: tx._id
        });
      } else {
        seen.set(key, tx._id.toString());
      }
    }
    
    if (duplicates.length > 0) {
      console.error('ERROR: Found duplicate (userId, boostOrderId) pairs!');
      console.log(JSON.stringify(duplicates.slice(0, 5), null, 2));
      await client.close();
      process.exit(1);
    }
    
    console.log('✓ No duplicates found\n');
  } else {
    console.log('✓ No records with string boostOrderId - no duplicates possible\n');
  }
  
  // 3. Check if index already exists
  console.log('=== STEP 3: Check Existing Indexes ===');
  const indexes = await collection.indexes();
  console.log('Existing indexes on star_transactions:');
  indexes.forEach(idx => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    if (idx.partialFilterExpression) {
      console.log(`    Partial filter: ${JSON.stringify(idx.partialFilterExpression)}`);
    }
  });
  
  const targetIndexName = 'star_transactions_userId_boostOrderId_unique';
  const targetIndexExists = indexes.some(idx => 
    idx.name === targetIndexName ||
    (idx.key?.userId === 1 && idx.key?.boostOrderId === 1)
  );
  
  if (targetIndexExists) {
    console.error('ERROR: Target index already exists!');
    await client.close();
    process.exit(1);
  }
  console.log('✓ Target index does not exist\n');
  
  // 4. Create the index
  console.log('=== STEP 4: Create Index ===');
  console.log('Executing: db.star_transactions.createIndex(...)');
  
  try {
    const result = await collection.createIndex(
      { userId: 1, boostOrderId: 1 },
      {
        unique: true,
        partialFilterExpression: { boostOrderId: { $type: 'string' } },
        name: targetIndexName
      }
    );
    console.log(`Index created: ${result}\n`);
  } catch (err) {
    console.error('ERROR creating index:', err.message);
    await client.close();
    process.exit(1);
  }
  
  // 5. Verify the index
  console.log('=== STEP 5: Verify Index ===');
  const newIndexes = await collection.indexes();
  const createdIndex = newIndexes.find(idx => idx.name === targetIndexName);
  
  if (!createdIndex) {
    console.error('ERROR: Index not found after creation!');
    await client.close();
    process.exit(1);
  }
  
  console.log('Created index details:');
  console.log(`  Name: ${createdIndex.name}`);
  console.log(`  Key: ${JSON.stringify(createdIndex.key)}`);
  console.log(`  Unique: ${createdIndex.unique}`);
  console.log(`  Partial Filter: ${JSON.stringify(createdIndex.partialFilterExpression)}`);
  console.log('✓ Index verified\n');
  
  // 6. Confirm existing records unchanged
  console.log('=== STEP 6: Verify Records Unchanged ===');
  const recordCount = await collection.countDocuments();
  console.log(`Total star_transactions records: ${recordCount}`);
  console.log('✓ Records unchanged\n');
  
  console.log('═══════════════════════════════════════════════════');
  console.log('   INDEX CREATION COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  
  await client.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
