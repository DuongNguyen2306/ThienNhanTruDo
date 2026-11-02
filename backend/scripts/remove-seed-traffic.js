/**
 * Xoá TOÀN BỘ dữ liệu MẪU đã seed (Facebook + Threads).
 *
 * Chỉ xoá bản ghi có marker `referrerHost` bắt đầu bằng `seed.` ⇒ KHÔNG đụng
 * tới bản ghi thật của khách.
 *
 * Dùng khi: đã có dữ liệu thật từ GA4 / tracker, hoặc không còn dùng số liệu
 * mẫu nữa.
 *
 *   cd backend && node scripts/remove-seed-traffic.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  const col = client.db().collection('traffic_visits');

  const before = await col.countDocuments({ referrerHost: { $regex: /^seed\./ } });
  if (before === 0) {
    console.log('Không có bản ghi mẫu nào để xoá.');
  } else {
    const res = await col.deleteMany({ referrerHost: { $regex: /^seed\./ } });
    console.log(`Đã xoá ${res.deletedCount} bản ghi mẫu.`);
  }

  console.log('\nTổng hiện tại trong DB:');
  for (const row of await col
    .aggregate([{ $group: { _id: '$source', n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray()) {
    console.log('  ', row._id, '=>', row.n);
  }

  await client.close();
})().catch((error) => {
  console.error('ERR', error.message);
  process.exit(1);
});
