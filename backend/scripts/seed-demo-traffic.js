/**
 * Seed dữ liệu MẪU cho Facebook + Threads (tổng 78) vào `traffic_visits`.
 *
 * MỤC ĐÍCH: khi custom dimension `traffic_source` của GA4 chưa được đăng ký,
 * bảng nguồn truy cập trên trang Admin hiển thị 0 cho Facebook/Threads. Seed
 * giúp bạn xem/thử giao diện với số liệu thực tế trước khi có dữ liệu thật.
 *
 * DÙNG MỘT MARKER: mọi bản ghi seed có `referrerHost` bắt đầu bằng
 * `seed.` ⇒ có thể xoá sạch chỉ bằng 1 lệnh (xem `scripts/remove-seed-traffic.js`).
 *
 * KHÔNG đụng tới bản ghi thật (referrerHost khác `seed.`).
 */

require('dotenv').config();
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const TZ_OFFSET_MS = 420 * 60 * 1000; // UTC+7

/** Tổng số lượt cần seed cho mỗi nguồn. */
const TARGET = {
  facebook: 52,
  threads: 26,
};

/**
 * Số ngày phân bố ngược lại (hôm nay + 6 ngày trước).
 *
 * 7 ngày ⇒ kỳ "7 ngày" (mặc định của trang Admin), "30 ngày" và "Toàn bộ"
 * đều hiện đủ tổng 78 ⇒ nhìn thấy con số như mong muốn ở mọi bộ lọc.
 */
const DAYS = 7;

/** Hostname production (không phải localhost ⇒ được tính là khách thật). */
const SITE_HOST = 'thien-nhan-tru-do-kappa.vercel.app';

/** Trang đích ngẫu nhiên cho mỗi lượt. */
const LANDING_PATHS = ['/', '/phong', '/tim-kiem', '/bang-gia', '/lien-he'];

/** PRNG tất định (seed cố định) ⇒ chạy lại cho cùng kết quả. */
function makeRandom(seed) {
  let s = seed >>> 0;
  return function random() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Ngày theo giờ VN, dạng YYYY-MM-DD. */
function vnDate(offsetDays) {
  const now = new Date(Date.now() + TZ_OFFSET_MS);
  const day = new Date(now);
  day.setUTCDate(day.getUTCDate() - offsetDays);
  return day.toISOString().slice(0, 10);
}

(async () => {
  const client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  const col = client.db().collection('traffic_visits');

  // ── Idempotent: xoá bản ghi seed cũ trước khi tạo lại ────────────────
  const removed = await col.deleteMany({
    referrerHost: { $regex: /^seed\./ },
  });
  if (removed.deletedCount > 0) {
    console.log(`Đã xoá ${removed.deletedCount} bản ghi seed cũ.`);
  }

  const random = makeRandom(20261102);
  const docs = [];

  for (const [source, total] of Object.entries(TARGET)) {
    // Phân bố theo ngày: ngày càng gần càng nhiều lượt (hợp lý với traffic
    // tăng dần), nhưng có nhiễu ngẫu nhiên để biểu đồ nhìn tự nhiên.
    const weights = [];
    let weightSum = 0;
    for (let i = 0; i < DAYS; i++) {
      const w = 1 + (DAYS - i) * 0.12 + random() * 1.4;
      weights.push(w);
      weightSum += w;
    }

    // Phân bố số lượt từng ngày (largest remainder ⇒ tổng chính xác).
    const counts = weights.map((w) => Math.floor((w / weightSum) * total));
    let remainder = total - counts.reduce((a, b) => a + b, 0);
    const order = weights
      .map((w, i) => ({ i, frac: (w / weightSum) * total - Math.floor((w / weightSum) * total) }))
      .sort((a, b) => b.frac - a.frac);
    let cursor = 0;
    while (remainder > 0 && order.length > 0) {
      counts[order[cursor % order.length].i] += 1;
      remainder -= 1;
      cursor += 1;
    }

    for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
      const count = counts[dayIndex];
      if (count <= 0) continue;
      const dateStr = vnDate(dayIndex);

      for (let k = 0; k < count; k++) {
        // Giờ trong ngày (giờ VN) → chuyển sang UTC để lưu.
        const hour = 7 + Math.floor(random() * 15); // 7h–22h giờ VN
        const minute = Math.floor(random() * 60);
        const second = Math.floor(random() * 60);
        const createdAt = new Date(
          Date.parse(`${dateStr}T00:00:00.000Z`) +
            (hour * 3600 + minute * 60 + second) * 1000 -
            TZ_OFFSET_MS
        );

        docs.push({
          _id: crypto.randomUUID(),
          // sessionId = SHA-256 (giống cách backend băm) ⇒ unique, không lộ
          // session id gốc.
          sessionId: crypto
            .createHash('sha256')
            .update(`seed-${source}-${dateStr}-${k}-${random()}`)
            .digest('hex'),
          source,
          medium: source === 'facebook' ? 'social' : 'social',
          utmSource: source,
          // MARKER — dùng để xoá sạch riêng phần dữ liệu mẫu.
          referrerHost: `seed.${source}.example`,
          landingPath:
            LANDING_PATHS[Math.floor(random() * LANDING_PATHS.length)],
          siteHost: SITE_HOST,
          isLocal: false,
          createdAt,
          lastActivityAt: createdAt,
        });
      }
    }
  }

  if (docs.length > 0) {
    await col.insertMany(docs);
  }

  // ── Báo cáo kết quả ───────────────────────────────────────────────────
  console.log(`\nĐã seed ${docs.length} bản ghi mẫu:`);
  for (const [source, total] of Object.entries(TARGET)) {
    console.log(`  ${source}: ${total}`);
  }

  const summary = await col
    .aggregate([
      { $group: { _id: '$source', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  console.log('\nTổng hiện tại trong DB:');
  for (const row of summary) console.log('  ', row._id, '=>', row.n);

  await client.close();
})().catch((error) => {
  console.error('ERR', error.message);
  process.exit(1);
});
