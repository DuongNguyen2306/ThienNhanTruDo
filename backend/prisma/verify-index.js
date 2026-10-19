require('dotenv').config();
const { MongoClient } = require('mongodb');

const connectionString = process.env.DATABASE_URL;

async function main() {
  const client = new MongoClient(connectionString);
  await client.connect();
  
  console.log('=== Verifying Star System Index ===\n');
  
  const db = client.db();
  const collection = db.collection('star_transactions');
  
  // Check index
  const indexes = await collection.indexes();
  const targetIndex = indexes.find(idx => idx.name === 'star_transactions_userId_boostOrderId_unique');
  
  if (!targetIndex) {
    console.error('ERROR: Index not found!');
    process.exit(1);
  }
  
  console.log('Index details:');
  console.log(`  Name: ${targetIndex.name}`);
  console.log(`  Key: ${JSON.stringify(targetIndex.key)}`);
  console.log(`  Unique: ${targetIndex.unique}`);
  console.log(`  Partial Filter: ${JSON.stringify(targetIndex.partialFilterExpression)}`);
  
  // Verify partial filter matches string type
  const filterMatch = targetIndex.partialFilterExpression?.boostOrderId?.$type === 'string';
  console.log(`  Filter matches string type: ${filterMatch ? '✓' : '✗'}`);
  
  console.log('\n=== Star Service Module Verification ===\n');
  
  const starService = require('../src/services/starService');
  console.log('Exported functions:');
  console.log(`  - processExpiredStars: ${typeof starService.processExpiredStars === 'function' ? '✓' : '✗'}`);
  console.log(`  - expireSingleBatch: ${typeof starService.expireSingleBatch === 'function' ? '✓' : '✗'}`);
  console.log(`  - getAvailableStars: ${typeof starService.getAvailableStars === 'function' ? '✓' : '✗'}`);
  console.log(`  - spendStarsAtomic: ${typeof starService.spendStarsAtomic === 'function' ? '✓' : '✗'}`);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   ALL VERIFICATIONS COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  
  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
