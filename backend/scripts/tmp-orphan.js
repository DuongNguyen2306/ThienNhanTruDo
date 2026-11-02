require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.DATABASE_URL);
  await c.connect();
  const db = c.db();
  const sp = db.collection('seller_profiles');
  const users = db.collection('users');

  console.log('seller_profiles:', await sp.countDocuments());
  console.log('users:', await users.countDocuments());

  const profiles = await sp.find({}).toArray();
  const userIds = new Set(profiles.map((p) => p.userId));
  const usersArr = await users.find({ _id: { $in: [...userIds] } }).toArray();
  const existing = new Set(usersArr.map((u) => u._id));

  const orphans = profiles.filter((p) => !existing.has(p.userId));
  console.log('\n=== seller_profiles có userId KHÔNG tồn tại trong users ===');
  console.log('so orphan:', orphans.length);
  for (const o of orphans) {
    console.log('  _id:', o._id, '| userId:', o.userId, '| status:', o.status,
      '| createdAt:', o.createdAt);
  }

  console.log('\n=== tat ca seller_profiles ===');
  for (const p of profiles) {
    console.log('  userId:', p.userId, '| status:', p.status,
      '| user ton tai:', existing.has(p.userId));
  }

  await c.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
