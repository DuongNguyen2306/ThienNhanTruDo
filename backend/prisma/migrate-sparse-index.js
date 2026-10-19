/**
 * Create sparse unique index for Transaction.idempotencyKey
 * 
 * This allows:
 * - Multiple null values (existing transactions preserved)
 * - Exactly one non-null value per idempotencyKey
 * - Concurrent requests with same key = exactly 1 succeeds
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

async function createSparseIndex() {
  const url = process.env.DATABASE_URL;
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('transactions');
    
    console.log('Checking existing indexes on transactions collection...\n');
    
    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''} ${idx.sparse ? '(sparse)' : ''}`);
    });
    
    // Check if sparse unique index already exists
    const existingSparseIndex = indexes.find(
      idx => idx.key?.idempotencyKey === 1 && idx.unique === true
    );
    
    if (existingSparseIndex) {
      console.log('\n✅ Sparse unique index already exists:', existingSparseIndex.name);
      return;
    }
    
    console.log('\nCreating sparse unique index...');
    
    // Create sparse unique index
    // sparse: true means null values won't be indexed, allowing multiple nulls
    // unique: true means non-null values must be unique
    await collection.createIndex(
      { idempotencyKey: 1 },
      { 
        unique: true, 
        sparse: true, 
        name: 'transactions_idempotencyKey_sparse_unique',
        background: true 
      }
    );
    
    console.log('✅ Sparse unique index created successfully');
    
    // Verify
    console.log('\nVerifying index...');
    const verify = await collection.indexes();
    const newIndex = verify.find(idx => idx.name === 'transactions_idempotencyKey_sparse_unique');
    
    if (newIndex) {
      console.log('\n✅ Index verified:');
      console.log('  - Key:', JSON.stringify(newIndex.key));
      console.log('  - Unique:', newIndex.unique);
      console.log('  - Sparse:', newIndex.sparse);
      console.log('\n✅ Boost purchase idempotency is now safe for concurrent requests');
      console.log('\nProperties:');
      console.log('  - Multiple null values: allowed (existing records preserved)');
      console.log('  - Duplicate non-null keys: prevented');
      console.log('  - Concurrent same-key requests: exactly 1 succeeds');
    }
    
  } catch (error) {
    if (error.code === 85) {
      console.log('\n✅ Index already exists (MongoDB error code 85)');
      return;
    }
    throw error;
  } finally {
    await client.close();
  }
}

createSparseIndex()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.code ? `Code: ${err.code}` : '');
    process.exit(1);
  });
