/**
 * GA4 sync service — đồng bộ số SESSIONS theo ngày + nguồn từ Google
 * Analytics 4 vào MongoDB Atlas (collection `ga4_traffic_daily`).
 *
 * VÌ SAO CẦN ĐỒNG BỘ
 *  • GA4 Data API có quota (10 property tokens / giờ) ⇒ không thể gọi trực
 *    tiếp mỗi khi Admin mở trang.
 *  • Dữ liệu đã đồng bộ nằm trong MongoDB ⇒ Admin đọc nhanh, không tốn quota.
 *
 * NGUỒN SỐ LIỆU (quan trọng — đúng yêu cầu):
 *  • Lấy từ dimension `sessionSourceMedium` + metric `sessions`.
 *  • KHÔNG lấy Facebook/Threads từ nhóm tổng hợp "Organic Social" (đó là
 *    `sessionDefaultChannelGroup` — gộp cả FB lẫn Threads lẫn Instagram nên
 *    không tách được từng nguồn). Ở đây mỗi dòng là MỘT cặp source/medium
 *    cụ thể ⇒ Facebook và Threads tách bạch.
 *
 * CHỐNG TRÙNG (upsert):
 *  • Khoá duy nhất = (date, source). Đồng bộ lại nhiều lần chỉ CẬP NHẬT
 *    bản ghi cũ, không tạo bản ghi mới ⇒ không nhân đôi số liệu.
 *
 * CẬP NHẬT (upsert) DÙNG CHÍNH TẦNG LƯU TRỮ:
 *  • `upsertOne` với bộ lọc `{ date, source }` ⇒ MongoDB tự tạo bản ghi nếu
 *    chưa có, hoặc cập nhật bản ghi đang có.
 */

const { MongoClient } = require('mongodb');
const ga4Service = require('./ga4Service');

// ───────────────────────────────────────────────────────────────────────────
// Hằng số
// ───────────────────────────────────────────────────────────────────────────

/** Collection lưu số liệu GA4 đã đồng bộ. */
const COLLECTION_NAME = 'ga4_traffic_daily';

/** Collection lưu metadata của lần đồng bộ gần nhất. */
const META_COLLECTION_NAME = 'ga4_traffic_sync_meta';

/**
 * Collection lưu số lượt theo nguồn, đọc từ CUSTOM EVENT `traffic_source`
 * của GA4 (event parameter `traffic_source`).
 *
 * VÌ SAO CẦN COLLECTION RIÊNG
 *  • `sessionSourceMedium` là dimension CHUẨN của GA4 — nó gán nguồn ở mức
 *    phiên theo thứ tự ưu tiên (referrer → UTM →…). Với link quảng cáo
 *    Facebook mở trong app browser, Facebook KHÔNG gửi referrer và UTM
 *    không có ⇒ GA4 rơi về `(direct) / (none)` ⇒ Facebook = 0.
 *  • Event `traffic_source` mà frontend bắn lại mang theo nguồn đã được
 *    chuẩn hoá sẵn (`facebook`, `threads`, `google`, …) ⇒ đây mới là nơi
 *    GA4 ghi nhận đúng lượt Facebook.
 *
 *  ⇒ Hai nguồn bổ sung cho nhau, KHÔNG thay thế nhau. Collection riêng để
 *    không trộn hai loại số liệu (sessions vs event count).
 */
const CUSTOM_EVENT_COLLECTION_NAME = 'ga4_custom_event_daily';

/**
 * Tên event + event parameter chứa nguồn chuẩn hoá.
 *
 * Frontend bắn event `traffic_source` với parameter `traffic_source`
 * (xem `components/ga4-provider.tsx`).
 */
const CUSTOM_EVENT_NAME = 'traffic_source';
const CUSTOM_EVENT_DIMENSION = 'customEvent:traffic_source';

/**
 * Khoá nguồn hiển thị — KHÔNG trùng nhau, phủ kín 4 nhóm.
 * `source` khớp với giá trị `source` của collection `ga4_traffic_daily`.
 */
const SOURCE_GROUPS = [
  { key: 'facebook', label: 'Facebook', source: 'facebook' },
  { key: 'threads', label: 'Threads', source: 'threads' },
  { key: 'google', label: 'Google', source: 'google' },
  { key: 'direct', label: 'Trực tiếp / Khác', source: 'direct' },
];

/** Số ngày tối đa được đồng bộ trong 1 lần (GA4 giới hạn 100k dòng). */
const MAX_SYNC_DAYS = 400;

/** Số ngày mặc định khi đồng bộ. */
const DEFAULT_SYNC_DAYS = 90;

/** Khoảng thời gian báo cáo (khớp với frontend). */
const PERIODS = {
  today: { label: 'Hôm nay', days: 1 },
  '7d': { label: '7 ngày', days: 7 },
  '30d': { label: '30 ngày', days: 30 },
  all: { label: 'Toàn bộ', days: null },
};

/** Múi giờ kinh doanh (Việt Nam, UTC+7). */
const TZ_OFFSET_MINUTES = 420;
const TZ_OFFSET_MS = TZ_OFFSET_MINUTES * 60 * 1000;

// ───────────────────────────────────────────────────────────────────────────
// Mongo client
// ───────────────────────────────────────────────────────────────────────────

let mongoClient = null;
let indexesEnsured = false;

async function getMongo() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL chưa được cấu hình.');
  if (!mongoClient) {
    mongoClient = new MongoClient(url);
    await mongoClient.connect();
  }
  const db = mongoClient.db();
  return {
    collection: db.collection(COLLECTION_NAME),
    meta: db.collection(META_COLLECTION_NAME),
    customEvent: db.collection(CUSTOM_EVENT_COLLECTION_NAME),
  };
}

/**
 * Collection chứa số lượt từ custom event `traffic_source`.
 *
 * Dùng chung kết nối Mongo đã mở (không tạo client mới).
 */
async function customCollection() {
  const { customEvent } = await getMongo();
  await customEvent.createIndex(
    { date: 1, source: 1 },
    { unique: true, name: 'uniq_date_source_custom_event' }
  );
  return customEvent;
}

/**
 * Đảm bảo có unique index (date, source).
 *
 * Unique index là chốt chặn CUỐI CÙNG chống trùng: dù upsert có lỗi logic thì
 * MongoDB vẫn không cho tồn tại 2 bản ghi cùng một (ngày, nguồn).
 */
async function ensureIndexes(collection) {
  if (indexesEnsured) return;
  await collection.createIndex(
    { date: 1, source: 1 },
    { unique: true, name: 'uniq_date_source' }
  );
  indexesEnsured = true;
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Ngày hôm nay theo giờ Việt Nam, định dạng YYYY-MM-DD. */
function todayVn() {
  const vn = new Date(Date.now() + TZ_OFFSET_MS);
  return vn.toISOString().slice(0, 10);
}

/**
 * Mốc bắt đầu của kỳ (giờ Việt Nam) — dùng để lọc dữ liệu đã đồng bộ.
 *
 *  - today → 00:00 giờ VN hôm nay
 *  - 7d    → 00:00 giờ VN của 6 ngày trước (7 ngày gồm hôm nay)
 *  - 30d   → 00:00 giờ VN của 29 ngày trước
 *  - all   → null (mọi lúc)
 */
function periodStart(period) {
  const days = PERIODS[period].days;
  if (days === null) return null;
  const vnNow = new Date(Date.now() + TZ_OFFSET_MS);
  const start = new Date(vnNow);
  start.setUTCHours(0, 0, 0, 0);
  if (days > 1) start.setUTCDate(start.getUTCDate() - (days - 1));
  return new Date(start.getTime() - TZ_OFFSET_MS);
}

/**
 * Phân loại một dòng `sessionSourceMedium` của GA4 thành nhóm nguồn.
 *
 * GA4 trả dạng "facebook / organic_social", "threads / referral",
 * "(direct) / (none)", "google / organic"…
 *
 * CHỈ dùng phần SOURCE (trước dấu '/') để quyết định:
 *  • Facebook → source chứa "facebook" (kể cả fb.com, messenger).
 *  • Threads  → source chứa "threads".
 *  • Google   → source chứa "google" / "adwords" / "doubleclick".
 *  • còn lại (kể cả chatgpt.com, vercel.com, (direct), zalo…) → Trực tiếp/Khác.
 */
function classifySource(sessionSourceMedium) {
  const raw = String(sessionSourceMedium || '').trim();
  const source = raw.split('/')[0].trim().toLowerCase();

  if (/facebook|fb\.com|messenger/i.test(source)) {
    return 'facebook';
  }
  if (/threads/i.test(source)) {
    return 'threads';
  }
  if (/google|adwords|doubleclick|dm\.google|googleadservices/i.test(source)) {
    return 'google';
  }
  return 'direct';
}

/** Ngày GA4 dạng "20261102" → "2026-11-02". */
function normalizeGaDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

// ───────────────────────────────────────────────────────────────────────────
// Đồng bộ: GA4 → MongoDB
// ───────────────────────────────────────────────────────────────────────────

/**
 * Tải số sessions theo (ngày, source/medium) từ GA4 Data API.
 *
 * @param {number} days số ngày gần nhất cần lấy
 * @returns {Promise<Array<{ date: string, sourceMedium: string, source: string, sessions: number }>>}
 */
async function fetchRowsFromGa4(days) {
  const client = ga4Service.getClient();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('GA4_PROPERTY_ID chưa được cấu hình.');
  }

  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }, { name: 'sessionSourceMedium' }],
    metrics: [{ name: 'sessions' }],
    limit: 100000,
  });

  const rows = [];
  for (const row of report.rows || []) {
    const date = normalizeGaDate(row.dimensionValues?.[0]?.value);
    const sourceMedium = row.dimensionValues?.[1]?.value || '(direct) / (none)';
    const sessions = Number(row.metricValues?.[0]?.value) || 0;
    if (!date) continue;
    rows.push({ date, sourceMedium, source: classifySource(sourceMedium), sessions });
  }
  return rows;
}

/**
 * Tải số lượt theo (ngày, nguồn) từ CUSTOM EVENT `traffic_source` của GA4.
 *
 * Dùng event parameter `customEvent:traffic_source` — nơi GA4 thực sự ghi
 * nhận nguồn đã chuẩn hoá (facebook / threads / google / …).
 *
 * LƯU Ý QUAN TRỌNG
 *  Custom dimension phải được ĐĂNG KÝ trong GA4 Admin (Admin → Custom
 *  definitions) thì mới query được. Nếu chưa đăng ký, GA4 trả
 *  INVALID_ARGUMENT ⇒ hàm này trả `null` (KHÔNG ném lỗi) để phần còn lại
 *  của hệ thống vẫn chạy bình thường bằng `sessionSourceMedium`.
 *
 * @param {number} days số ngày gần nhất cần lấy
 * @returns {Promise<Array<{ date: string, source: string, count: number }>|null>}
 *          `null` = không đọc được (dimension chưa đăng ký / lỗi quyền).
 */
async function fetchCustomEventRows(days) {
  const client = ga4Service.getClient();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return null;

  try {
    const [report] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: CUSTOM_EVENT_DIMENSION }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: CUSTOM_EVENT_NAME },
        },
      },
      limit: 100000,
    });

    const rows = [];
    for (const row of report.rows || []) {
      const date = normalizeGaDate(row.dimensionValues?.[0]?.value);
      const rawSource = String(
        row.dimensionValues?.[1]?.value || ''
      ).trim().toLowerCase();
      const count = Number(row.metricValues?.[0]?.value) || 0;
      if (!date || !rawSource || count <= 0) continue;
      rows.push({ date, source: classifySource(rawSource), count });
    }
    return rows;
  } catch (error) {
    // Dimension chưa đăng ký trong GA4 (INVALID_ARGUMENT) hoặc service account
    // chưa có quyền ⇒ bỏ qua, dùng nguồn `sessionSourceMedium` thay thế.
    console.warn(
      `[ga4Sync] Không đọc được custom event "${CUSTOM_EVENT_NAME}" ` +
        `(${error.code || 'ERROR'}): ${error.message}. ` +
        'Cần đăng ký custom dimension "traffic_source" trong GA4 Admin để đọc được.'
    );
    return null;
  }
}

/**
 * Gom các dòng GA4 thành bản ghi theo (ngày, nhóm nguồn).
 *
 * Mỗi bản ghi giữ luôn `breakdown` (chi tiết từng source/medium) để Admin
 * có thể đối chiếu với báo cáo "Traffic acquisition" của GA4.
 */
function groupRows(rows) {
  /** @type {Map<string, { date: string, source: string, sessions: number, breakdown: Map<string, number> }>} */
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.date}__${row.source}`;
    let bucket = grouped.get(key);
    if (!bucket) {
      bucket = { date: row.date, source: row.source, sessions: 0, breakdown: new Map() };
      grouped.set(key, bucket);
    }
    bucket.sessions += row.sessions;
    bucket.breakdown.set(
      row.sourceMedium,
      (bucket.breakdown.get(row.sourceMedium) || 0) + row.sessions
    );
  }

  return [...grouped.values()].map((bucket) => ({
    date: bucket.date,
    source: bucket.source,
    sessions: bucket.sessions,
    breakdown: [...bucket.breakdown.entries()]
      .map(([sourceMedium, sessions]) => ({ sourceMedium, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
  }));
}

/**
 * Gom các dòng custom event thành bản ghi theo (ngày, nhóm nguồn).
 *
 * Khác với `groupRows` (dùng `sessions`), ở đây đếm EVENT COUNT — mỗi lần
 * frontend bắn event `traffic_source` tương ứng 1 lượt truy cập.
 */
function groupCustomEventRows(rows) {
  /** @type {Map<string, { date: string, source: string, count: number }>} */
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.date}__${row.source}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.count += row.count;
    } else {
      grouped.set(key, { date: row.date, source: row.source, count: row.count });
    }
  }

  return [...grouped.values()];
}

/**
 * Đồng bộ dữ liệu GA4 vào MongoDB bằng UPSERT.
 *
 * - Bộ lọc upsert: `{ date, source }` (khớp unique index) ⇒ chạy lại nhiều
 *   lần chỉ cập nhật, KHÔNG tạo bản ghi trùng.
 * - Dữ liệu cũ hơn `days` ngày KHÔNG bị xoá (giữ lịch sử).
 *
 * @param {object} [options]
 * @param {number} [options.days=90]
 * @returns {Promise<{ synced: number, days: number, lastSyncedAt: string }>}
 */
async function syncFromGa4(options = {}) {
  if (!ga4Service.isConfigured()) {
    throw new Error(
      'GA4 chưa được cấu hình. Thiếu GA4_PROPERTY_ID hoặc thông tin xác thực service account.'
    );
  }

  const days = Math.min(
    Math.max(Number(options.days) || DEFAULT_SYNC_DAYS, 1),
    MAX_SYNC_DAYS
  );

  const rows = await fetchRowsFromGa4(days);
  const grouped = groupRows(rows);

  const now = new Date();

  // ── Custom event `traffic_source` (nguồn đã chuẩn hoá) ────────────────
  // Bổ sung cho `sessionSourceMedium`: đây là nơi GA4 ghi nhận đúng lượt
  // Facebook (khi mở link quảng cáo trong app browser, GA4 rơi về direct).
  // `null` khi custom dimension chưa được đăng ký trong GA4.
  const customRows = await fetchCustomEventRows(days);

  const { collection, meta } = await getMongo();
  await ensureIndexes(collection);

  let customSynced = 0;
  if (customRows && customRows.length > 0) {
    const customOps = groupCustomEventRows(customRows).map((item) => ({
      updateOne: {
        filter: { date: item.date, source: item.source },
        update: {
          $set: {
            date: item.date,
            source: item.source,
            count: item.count,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    }));
    const customResult = await customCollection().bulkWrite(customOps, {
      ordered: false,
    });
    customSynced =
      (customResult.upsertedCount || 0) + (customResult.modifiedCount || 0);
  }

  let synced = 0;

  if (grouped.length > 0) {
    const operations = grouped.map((item) => ({
      updateOne: {
        filter: { date: item.date, source: item.source },
        update: {
          $set: {
            date: item.date,
            source: item.source,
            sessions: item.sessions,
            breakdown: item.breakdown,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    }));

    const result = await collection.bulkWrite(operations, { ordered: false });
    synced = (result.upsertedCount || 0) + (result.modifiedCount || 0);
  }

  const lastSyncedAt = now.toISOString();
  await meta.updateOne(
    { _id: 'last_sync' },
    {
      $set: {
        lastSyncedAt,
        days,
        propertyId: process.env.GA4_PROPERTY_ID || null,
        rowsFetched: rows.length,
        recordsWritten: synced,
        customEventRecordsWritten: customSynced,
      },
    },
    { upsert: true }
  );

  return { synced, customSynced, days, lastSyncedAt };
}

// ───────────────────────────────────────────────────────────────────────────
// Đọc số liệu đã đồng bộ
// ───────────────────────────────────────────────────────────────────────────

/**
 * Đọc báo cáo lượt truy cập từ dữ liệu GA4 ĐÃ ĐỒNG BỘ trong MongoDB.
 *
 * Không gọi GA4 ⇒ không tốn quota, và trả được cả kỳ "Toàn bộ".
 *
 * @param {string} period 'today' | '7d' | '30d' | 'all'
 */
async function getSyncedReport(period) {
  const key = PERIODS[period] ? period : '7d';
  const { collection, meta } = await getMongo();

  const match = {};
  const start = periodStart(key);
  if (start) match.date = { $gte: start.toISOString().slice(0, 10) };

  // ── Tổng theo nguồn (1 truy vấn) ─────────────────────────────────────
  const bySource = await collection
    .aggregate([{ $match: match }, { $group: { _id: '$source', sessions: { $sum: '$sessions' } } }])
    .toArray();

  const counts = new Map(bySource.map((r) => [r._id, r.sessions]));
  const sources = SOURCE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    sessions: counts.get(group.source) || 0,
  }));

  // Bản ghi có nguồn lạ (không thuộc 4 nhóm) → gộp vào "Trực tiếp / Khác"
  // để tổng luôn khớp.
  const known = new Set(SOURCE_GROUPS.map((g) => g.source));
  let extra = 0;
  for (const [source, sessions] of counts) {
    if (!known.has(source)) extra += sessions;
  }
  if (extra > 0) {
    const direct = sources.find((s) => s.key === 'direct');
    if (direct) direct.sessions += extra;
  }

  const totalSessions = sources.reduce((sum, s) => sum + s.sessions, 0);

  // ── Tỷ lệ % (largest remainder) ⇒ tổng LUÔN đúng 100% ────────────────
  const percents = {};
  if (totalSessions > 0) {
    const exact = sources.map((s) => (s.sessions / totalSessions) * 100);
    const floors = exact.map((v) => Math.floor(v));
    let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    let cursor = 0;
    while (remainder > 0 && order.length > 0) {
      floors[order[cursor % order.length].i] += 1;
      remainder -= 1;
      cursor += 1;
    }
    sources.forEach((s, i) => {
      percents[s.key] = floors[i];
    });
  } else {
    sources.forEach((s) => {
      percents[s.key] = 0;
    });
  }

  // ── Chuỗi ngày ────────────────────────────────────────────────────────
  const byDate = await collection
    .aggregate([
      { $match: match },
      { $group: { _id: '$date', sessions: { $sum: '$sessions' } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const dailyMap = new Map(byDate.map((r) => [r._id, r.sessions]));
  const daily = [...dailyMap.entries()]
    .map(([date, sessions]) => ({ date, sessions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Chi tiết source/medium (để đối chiếu với GA4 Traffic acquisition) ─
  const detail = await collection
    .aggregate([
      { $match: match },
      { $unwind: '$breakdown' },
      {
        $group: {
          _id: '$breakdown.sourceMedium',
          sessions: { $sum: '$breakdown.sessions' },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 50 },
    ])
    .toArray();

  const breakdown = detail.map((row) => ({
    sourceMedium: row._id,
    source: classifySource(row._id),
    sessions: row.sessions,
  }));

  // ── Custom event `traffic_source` (nguồn đã chuẩn hoá) ────────────────
  // Đây là nơi GA4 ghi nhận đúng lượt Facebook (khi mở link quảng cáo trong
  // app browser, `sessionSourceMedium` rơi về `(direct) / (none)`).
  // Collection rỗng / không tồn tại ⇒ chưa đăng ký custom dimension hoặc
  // chưa đồng bộ ⇒ báo `available: false`, KHÔNG làm hỏng báo cáo chính.
  let customEvent = { available: false, bySource: {}, total: 0 };
  try {
    const { customEvent: customCol } = await getMongo();
    const customRows = await customCol
      .aggregate([
        { $match: match },
        { $group: { _id: '$source', count: { $sum: '$count' } } },
      ])
      .toArray();

    if (customRows.length > 0) {
      const customMap = {};
      for (const row of customRows) customMap[row._id] = row.count;
      customEvent = {
        available: true,
        bySource: customMap,
        total: customRows.reduce((sum, row) => sum + row.count, 0),
      };
    }
  } catch (error) {
    console.warn('[ga4Sync] Không đọc được custom event:', error.message);
  }

  // ── Metadata lần đồng bộ gần nhất ────────────────────────────────────
  const metaDoc = await meta.find({ _id: 'last_sync' }).next();

  const firstDoc = await collection
    .find({}, { projection: { date: 1 } })
    .sort({ date: 1 })
    .limit(1)
    .next();

  return {
    period: key,
    periodLabel: PERIODS[key].label,
    totals: {
      totalSessions,
      groupedTotal: totalSessions,
      /** Ngày đầu tiên có dữ liệu đã đồng bộ. */
      firstRecordedDate: firstDoc?.date || null,
      /** Thời điểm đồng bộ gần nhất (ISO). */
      lastSyncedAt: metaDoc?.lastSyncedAt || null,
      /** Số ngày đã đồng bộ trong lần gần nhất. */
      syncedDays: metaDoc?.days || null,
    },
    sources: sources.map((s) => ({ ...s, percent: percents[s.key] ?? 0 })),
    daily,
    breakdown,
    /**
     * Số lượt theo nguồn đọc từ CUSTOM EVENT `traffic_source` của GA4.
     *
     * Khớp với bảng drill-down trong GA4 UI (Reports → Events → traffic_source
     * → parameter traffic_source), nơi bạn thấy Facebook = 1.
     *
     * `available: false` ⇒ custom dimension chưa được đăng ký trong GA4
     * Admin ⇒ chưa đọc được; hệ thống vẫn chạy bình thường bằng
     * `sessionSourceMedium`.
     */
    customEvent,
    note:
      'Số liệu lấy từ GA4 Data API (dimension sessionSourceMedium, metric sessions) ' +
      'đã đồng bộ vào MongoDB bằng upsert theo (ngày, nguồn) nên chạy lại không nhân đôi số liệu. ' +
      'Facebook và Threads được tách riêng từ sessionSourceMedium, không lấy từ nhóm tổng hợp Organic Social. ' +
      (customEvent.available
        ? 'Ngoài ra, số lượt theo nguồn đã chuẩn hoá được đọc từ custom event "traffic_source" ' +
          '(khớp với bảng drill-down trong GA4 UI).'
        : 'Custom event "traffic_source" chưa đọc được — cần đăng ký custom dimension ' +
          '"traffic_source" trong GA4 Admin (Admin → Data display → Custom definitions).'),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  COLLECTION_NAME,
  META_COLLECTION_NAME,
  CUSTOM_EVENT_COLLECTION_NAME,
  SOURCE_GROUPS,
  PERIODS,
  MAX_SYNC_DAYS,
  DEFAULT_SYNC_DAYS,
  classifySource,
  normalizeGaDate,
  groupRows,
  groupCustomEventRows,
  fetchCustomEventRows,
  syncFromGa4,
  getSyncedReport,
  todayVn,
};
