/**
 * Traffic service — ghi nhận và thống kê lượt truy cập tự ghi.
 *
 * MỤC TIÊU
 *  Thay thế việc đọc `sessionSourceMedium` từ GA4 Data API bằng dữ liệu do
 *  chính website gửi về, lưu trong MongoDB. Dữ liệu tích luỹ, không biến
 *  mất sau 30 phút như GA4 Realtime.
 *
 * NGUYÊN TẮC
 *  1. MỖI PHIÊN = 1 BẢN GHI. Idempotency dựa trên `sessionId` (unique index
 *     trong DB) ⇒ chống đếm trùng kể cả khi request chạy song song.
 *  2. KHÔNG đếm "người dùng duy nhất" — chỉ đếm lượt truy cập / phiên.
 *  3. KHÔNG lưu IP đầy đủ, không lưu PII, không lưu URL có query nhạy cảm.
 *  4. Nguồn được XÁC ĐỊNH LẠI ở backend từ UTM/referrer — không tin tuyệt đối
 *     giá trị `source` do client gửi (xem `classifySource`).
 */

const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const prisma = require('../db');

// ───────────────────────────────────────────────────────────────────────────
// Hằng số
// ───────────────────────────────────────────────────────────────────────────

/** Nguồn được ghi nhận. */
const SOURCE_FACEBOOK = 'facebook';
const SOURCE_THREADS = 'threads';
const SOURCE_GOOGLE = 'google';
const SOURCE_DIRECT = 'direct_other';

const VALID_SOURCES = new Set([
  SOURCE_FACEBOOK,
  SOURCE_THREADS,
  SOURCE_GOOGLE,
  SOURCE_DIRECT,
]);

/** Môi trường hợp nhận. */
const MEDIUMS = new Set(['organic', 'cpc', 'social', 'referral', '(none)']);

/**
 * Domain được công nhận cho từng nguồn (chỉ dùng cho referrer).
 */
const REFERRER_HOSTS = {
  [SOURCE_FACEBOOK]: [
    /(^|\.)facebook\.com$/i,
    /(^|\.)fb\.com$/i,
    /(^|\.)m\.facebook\.com$/i,
    /(^|\.)l\.facebook\.com$/i,
    /(^|\.)facebook\.net$/i,
    /(^|\.)fb\.me$/i,
    /(^|\.)messenger\.com$/i,
  ],
  [SOURCE_THREADS]: [
    /(^|\.)threads\.net$/i,
    /(^|\.)threads\.com$/i,
    /(^|\.)threads\.int$/i,
  ],
  [SOURCE_GOOGLE]: [
    /(^|\.)google\.[a-z.]+$/i,
    /(^|\.)googleusercontent\.com$/i,
    /(^|\.)googleadservices\.com$/i,
    /(^|\.)doubleclick\.net$/i,
    /(^|\.)adwords\.com$/i,
  ],
};

/** UTM hợp lệ cho từng nguồn. */
const UTM_SOURCE_ALIASES = {
  [SOURCE_FACEBOOK]: /^(facebook|fb|m\.facebook|l\.facebook|facebookads|fbclid)$/i,
  [SOURCE_THREADS]: /^(threads|thread|threadsapp|threads\.net|threads\.com)$/i,
  [SOURCE_GOOGLE]: /^(google|googleads|adwords|google_search|googleadservices)$/i,
};

/** Thời hạn phiên: 30 phút không hoạt động ⇒ coi là phiên mới. */
const SESSION_TIMEOUT_MS = Number(
  process.env.TRAFFIC_SESSION_TIMEOUT_MINUTES || 30
) * 60 * 1000;

/**
 * Múi giờ kinh doanh của dự án (Việt Nam, UTC+7).
 *
 * Mọi ranh giới "ngày" (kỳ Hôm nay / 7 ngày / 30 ngày, và chuỗi ngày) được
 * tính theo múi giờ này, KHÔNG theo múi giờ của máy chủ và KHÔNG theo UTC.
 * Nhờ vậy "Hôm nay" luôn là ngày lịch của Việt Nam, và chuỗi ngày khớp với
 * tổng số lượt truy cập trong kỳ.
 */
const TZ_OFFSET_MINUTES = 420; // UTC+7
const TZ_OFFSET_MS = TZ_OFFSET_MINUTES * 60 * 1000;

/** Giới hạn độ dài chuỗi lưu trữ (chống payload bịa). */
const MAX_LEN = {
  sessionId: 128,
  utmSource: 64,
  utmMedium: 32,
  referrerHost: 128,
  landingPath: 256,
  siteHost: 128,
};

// ───────────────────────────────────────────────────────────────────────────
// Mongo client (chỉ dùng cho aggregation theo ngày)
// ───────────────────────────────────────────────────────────────────────────

let mongoClient = null;

async function getMongoCollection() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!mongoClient) {
    mongoClient = new MongoClient(url);
    await mongoClient.connect();
  }
  // `db()` lấy tên database từ chính `DATABASE_URL` ⇒ luôn khớp với nơi
  // Prisma đang ghi (cùng một URL ⇒ cùng một database).
  return mongoClient.db().collection('traffic_visits');
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, maxLength);
}

/**
 * Chuẩn hoá `utm_source` về đúng tên nguồn.
 *
 * Chỉ 4 giá trị được chấp nhận: facebook / threads / google / direct_other.
 * Mọi thứ khác (chatgpt.com, instagram, zalo, …) → `direct_other`, đúng yêu
 * cầu "không hiển thị ChatGPT thành mục riêng, gộp vào Trực tiếp / Khác".
 *
 * @returns {{ source: string, matched: boolean }}
 */
function classifyUtmSource(utmSource) {
  const raw = cleanString(utmSource, MAX_LEN.utmSource).toLowerCase();
  if (!raw) return { source: SOURCE_DIRECT, matched: false };

  for (const [source, pattern] of Object.entries(UTM_SOURCE_ALIASES)) {
    if (pattern.test(raw)) return { source, matched: true };
  }
  return { source: SOURCE_DIRECT, matched: false };
}

/**
 * Phân loại nguồn từ TÊN tham số click id mà client gửi lên.
 *
 * Click id là dấu hiệu ĐẦU TIÊN và đáng tin cậy nhất cho lượt từ quảng cáo:
 *    • `fbclid` → Facebook / Meta (Facebook & Threads đều dùng Meta ads)
 *    • `gclid`, `gbraid`, `wbraid` → Google Ads
 *    • `ttclid` → TikTok, `twclid` → X (gộp vào Trực tiếp / Khác)
 *
 * VÌ SAO CẦN:
 *  Link quảng cáo Facebook có dạng `https://site.com/?fbclid=...`. Trong app
 *  browser của Facebook/Threads, trình duyệt KHÔNG gửi referrer (chính sách
 *  bảo mật của họ) ⇒ `document.referrer` rỗng ⇒ không có tín hiệu nào để biết
 *  lượt đó đến từ Facebook.
 *
 *  Click id KHÔNG chứa PII — đây là mã định danh quảng cáo.
 *
 * @param {string} paramName tên tham số (fbclid, gclid, …)
 * @returns {{ source: string, matched: boolean }}
 */
function classifyClickIdParam(paramName) {
  const raw = cleanString(paramName, 64).toLowerCase();
  if (!raw) return { source: SOURCE_DIRECT, matched: false };

  if (raw === 'fbclid') {
    return { source: SOURCE_FACEBOOK, matched: true };
  }
  if (raw === 'gclid' || raw === 'gbraid' || raw === 'wbraid') {
    return { source: SOURCE_GOOGLE, matched: true };
  }
  // TikTok / X — không có nhóm riêng ⇒ gộp vào Trực tiếp / Khác.
  if (raw === 'ttclid' || raw === 'twclid') {
    return { source: SOURCE_DIRECT, matched: false };
  }
  return { source: SOURCE_DIRECT, matched: false };
}

/**
 * Chuẩn hoá `utm_medium` — chỉ giữ các giá trị quen thuộc.
 */
function classifyUtmMedium(utmMedium) {
  const raw = cleanString(utmMedium, MAX_LEN.utmMedium).toLowerCase();
  if (!raw) return '(none)';
  if (MEDIUMS.has(raw)) return raw;
  if (/cpc|paid|ads|ppc/.test(raw)) return 'cpc';
  if (/social/.test(raw)) return 'social';
  if (/organic/.test(raw)) return 'organic';
  if (/referral/.test(raw)) return 'referral';
  return '(none)';
}

/**
 * Chỉ lấy hostname từ referrer — KHÔNG lưu URL đầy đủ (URL có thể chứa
 * query nhạy cảm do chính site điều hướng tới).
 *
 * Chấp nhận CẢ hai dạng:
 *  • URL đầy đủ: `https://l.facebook.com/l.php?u=...` → `l.facebook.com`
 *  • hostname thuần: `l.facebook.com` → `l.facebook.com`
 *
 * (Frontend gửi hostname thuần để không bao giờ gửi query string.)
 */
function extractReferrerHost(referrer) {
  const raw = cleanString(referrer, 512);
  if (!raw) return '';

  // Dạng URL đầy đủ.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return url.hostname
        .replace(/^www\./i, '')
        .toLowerCase()
        .slice(0, MAX_LEN.referrerHost);
    } catch {
      return '';
    }
  }

  // Dạng hostname thuần — chỉ chấp nhận chuỗi giống hostname.
  if (/^[a-z0-9]([a-z0-9\-.]*[a-z0-9])?$/i.test(raw)) {
    return raw.replace(/^www\./i, '').toLowerCase().slice(0, MAX_LEN.referrerHost);
  }

  return '';
}

/** Xác định nguồn từ referrer host. */
function classifyReferrerHost(host) {
  if (!host) return SOURCE_DIRECT;
  for (const [source, patterns] of Object.entries(REFERRER_HOSTS)) {
    if (patterns.some((p) => p.test(host))) return source;
  }
  return SOURCE_DIRECT;
}

/** Chuẩn hoá landing path — chỉ pathname, bỏ toàn bộ query/hash. */
function sanitizeLandingPath(path) {
  const raw = cleanString(path, MAX_LEN.landingPath);
  if (!raw) return null;
  try {
    const parsed = new URL(raw, 'http://localhost');
    const pathname = parsed.pathname || '/';
    return pathname.slice(0, MAX_LEN.landingPath);
  } catch {
    return null;
  }
}

/**
 * Chuẩn hoá hostname của WEBSITE đã gửi lượt truy cập.
 *
 * Chỉ lấy hostname — không lưu URL đầy đủ (URL có thể chứa query nhạy cảm).
 */
function sanitizeSiteHost(host) {
  const raw = cleanString(host, MAX_LEN.siteHost);
  if (!raw) return null;
  try {
    // Chấp nhận cả dạng hostname thuần lẫn URL đầy đủ.
    const url = new URL(
      /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    );
    return url.hostname.replace(/^www\./i, '').toLowerCase().slice(0, MAX_LEN.siteHost);
  } catch {
    return null;
  }
}

/**
 * Hostname này có phải môi trường dev/test không?
 *
 * `localhost`, `127.0.0.1`, `::1`, `*.local`, `*.localhost` ⇒ lượt truy cập
 * từ máy dev / test, KHÔNG phải khách thật.
 */
function isLocalHost(host) {
  if (!host) return false;
  return /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(host) ||
    /\.local(host)?$/i.test(host);
}

/**
 * Phân loại một bản ghi theo nguồn website (dùng trong JS, không phải trong
 * aggregation).
 *
 * Ba nhóm rõ ràng:
 *  • `production` — có `siteHost` và không phải localhost ⇒ khách thật.
 *  • `dev`        — `siteHost` là localhost / 127.0.0.1 / *.local ⇒ dev/test.
 *  • `unknown`    — bản ghi cũ, chưa có `siteHost` ⇒ KHÔNG tự động coi là
 *                    khách production (xem `getTrafficStats`).
 */
function classifyOrigin(doc) {
  if (doc.isLocal === true) return 'dev';
  const host = doc.siteHost;
  if (!host) return 'unknown';
  return isLocalHost(host) ? 'dev' : 'production';
}
/**
 * Idempotency key.
 *
 * Chỉ dựa trên `sessionId` (random, client sinh và giữ suốt phiên). Nhờ vậy:
 *  • Refresh / SPA navigation / retry / nhiều tab ⇒ CÙNG sessionId ⇒ 1 bản ghi.
 *  • Hết 30 phút không hoạt động ⇒ client sinh sessionId MỚI ⇒ bản ghi mới.
 *
 * Key được băm bằng SHA-256 nên không lộ sessionId gốc ra DB.
 */
function buildVisitKey(sessionId) {
  return crypto.createHash('sha256').update(sessionId).digest('hex');
}

/** Sinh sessionId hợp lệ ở phía server (fallback khi client không gửi). */
function generateSessionId() {
  return crypto.randomBytes(18).toString('base64url');
}

// ───────────────────────────────────────────────────────────────────────────
// Ghi nhận
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ghi nhận một lượt truy cập (mỗi phiên chỉ 1 lần).
 *
 * @param {object} input
 * @param {string} [input.sessionId]   — id phiên do client sinh
 * @param {string} [input.utmSource]   — utm_source
 * @param {string} [input.utmMedium]   — utm_medium
 * @param {string} [input.referrer]    — document.referrer (URL đầy đủ)
 * @param {string} [input.landingPath] — pathname đầu tiên
 * @param {string} [input.siteHost]    — hostname của website gửi lượt truy cập
 * @param {string} [input.clickIdParam] — tên tham số click id (fbclid, gclid…)
 * @returns {Promise<{ counted: boolean, source: string, medium: string }>}
 */
async function recordVisit(input = {}) {
  const sessionIdRaw = cleanString(input.sessionId, MAX_LEN.sessionId);
  const sessionId = sessionIdRaw || generateSessionId();

  // ── Xác định nguồn (cùng thứ tự ưu tiên với `deriveTrafficInfo` ở
  //    frontend ⇒ số liệu web khớp với số liệu GA4):
  //      1. Click id (fbclid/gclid) — tín hiệu đáng tin cậy nhất
  //      2. utm_source hợp lệ
  //      3. referrer hợp lệ
  //      4. direct_other
  const clickId = classifyClickIdParam(input.clickIdParam);
  const utm = classifyUtmSource(input.utmSource);
  const referrerHost = extractReferrerHost(input.referrer);

  let source;
  let medium;
  if (clickId.matched) {
    source = clickId.source;
    // Facebook → 'social', Google → 'cpc' (khớp với GA4).
    medium = source === SOURCE_GOOGLE ? 'cpc' : 'social';
  } else if (utm.matched) {
    source = utm.source;
    medium = classifyUtmMedium(input.utmMedium);
    if (medium === '(none)') {
      medium = source === SOURCE_GOOGLE ? 'cpc' : 'social';
    }
  } else {
    source = classifyReferrerHost(referrerHost);
    if (source === SOURCE_DIRECT) {
      medium = classifyUtmMedium(input.utmMedium);
    } else {
      medium = 'referral';
    }
  }

  const landingPath = sanitizeLandingPath(input.landingPath);
  const siteHost = sanitizeSiteHost(input.siteHost);
  // Lượt truy cập từ localhost / *.local ⇒ KHÔNG phải khách thật.
  const isLocal = isLocalHost(siteHost);
  const key = buildVisitKey(sessionId);
  const now = new Date();

  try {
    await prisma.trafficVisit.create({
      data: {
        sessionId: key,
        source,
        medium,
        utmSource: cleanString(input.utmSource, MAX_LEN.utmSource) || null,
        referrerHost: referrerHost || null,
        landingPath,
        siteHost,
        isLocal,
        createdAt: now,
        lastActivityAt: now,
      },
    });
    return { counted: true, source, medium };
  } catch (error) {
    // P2002 = unique constraint → phiên đã được ghi nhận. Đây là đường đi
    // BÌNH THƯỜNG khi client retry hoặc nhiều tab gửi đồng thời.
    if (error && error.code === 'P2002') {
      // Gia hạn phiên (không tạo bản ghi mới).
      await prisma.trafficVisit
        .updateMany({
          where: { sessionId: key },
          data: { lastActivityAt: now },
        })
        .catch(() => {});
      return { counted: false, source, medium };
    }
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Thống kê
// ───────────────────────────────────────────────────────────────────────────

/** Khoảng thời gian → nhãn + số ngày (null = từ đầu). */
const PERIODS = {
  today: { label: 'Hôm nay', days: 1 },
  '7d': { label: '7 ngày', days: 7 },
  '30d': { label: '30 ngày', days: 30 },
  all: { label: 'Toàn bộ', days: null },
};

function resolvePeriod(period) {
  const key = String(period || '7d').toLowerCase();
  return PERIODS[key] ? key : '7d';
}

/**
 * Mốc bắt đầu của kỳ — theo múi giờ Việt Nam (UTC+7).
 *  - today → 00:00 (giờ VN) hôm nay
 *  - 7d    → 00:00 (giờ VN) của 6 ngày trước (7 ngày gồm hôm nay)
 *  - 30d   → 00:00 (giờ VN) của 29 ngày trước
 *  - all   → null (mọi lúc)
 */
function periodStart(period) {
  const days = PERIODS[period].days;
  if (days === null) return null;
  // Ngày "hôm nay" theo giờ VN = ngày UTC + 7 giờ.
  const vnNow = new Date(Date.now() + TZ_OFFSET_MS);
  const start = new Date(vnNow);
  start.setUTCHours(0, 0, 0, 0);
  if (days > 1) start.setUTCDate(start.getUTCDate() - (days - 1));
  // Trừ lại offset để về UTC thật.
  return new Date(start.getTime() - TZ_OFFSET_MS);
}

/** Nhóm nguồn hiển thị — KHÔNG trùng nhau, phủ kín 4 giá trị `source`. */
const SOURCE_GROUPS = [
  { key: 'facebook', label: 'Facebook', source: SOURCE_FACEBOOK },
  { key: 'threads', label: 'Threads', source: SOURCE_THREADS },
  { key: 'google', label: 'Google', source: SOURCE_GOOGLE },
  { key: 'direct', label: 'Trực tiếp / Khác', source: SOURCE_DIRECT },
];

/**
 * Biểu thức aggregation phân loại bản ghi theo nguồn website.
 *
 * Dùng trong `$addFields: { origin: ORIGIN_EXPR }`:
 *   'production' — có `siteHost` hợp lệ, không phải localhost.
 *   'dev'        — localhost / 127.0.0.1 / *.local (hoặc `isLocal = true`).
 *   'unknown'    — bản ghi cũ chưa có `siteHost`.
 *
 * Bản ghi `unknown` KHÔNG được tự động coi là khách production.
 */
const ORIGIN_EXPR = {
  $cond: [
    { $eq: ['$isLocal', true] },
    'dev',
    {
      $cond: [
        {
          $and: [
            { $ne: [{ $type: '$siteHost' }, 'missing'] },
            { $ne: ['$siteHost', null] },
            {
              $not: {
                $regexMatch: {
                  input: { $toLower: '$siteHost' },
                  regex:
                    '^(localhost|127(\\.[0-9]{1,3}){3}|\\[?::1\\]?|0\\.0\\.0\\.0)$|\\.local(host)?$',
                },
              },
            },
          ],
        },
        'production',
        'unknown',
      ],
    },
  ],
};

/**
 * Chuỗi ngày cho kỳ giới hạn (dùng aggregation MongoDB — 1 lượt truy vấn).
 *
 * `includeLocal = false` (mặc định) ⇒ CHỈ tính lượt từ domain production.
 */
async function dailySeries(start, days, includeLocal = false) {
  const collection = await getMongoCollection();
  if (!collection) return [];

  const from = new Date(start);
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

  const rows = await collection
    .aggregate([
      { $addFields: { origin: ORIGIN_EXPR } },
      {
        $match: {
          createdAt: { $gte: from, $lt: to },
          $expr: includeLocal
            ? { $in: ['$origin', ['production', 'dev', 'unknown']] }
            : { $eq: ['$origin', 'production'] },
        },
      },
      {
        $group: {
          _id: {
            // Định dạng ngày theo giờ VN (UTC+7) để khớp với `periodStart`.
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $dateAdd: { startDate: '$createdAt', unit: 'minute', amount: TZ_OFFSET_MINUTES } },
            },
          },
          visits: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const byDate = new Map(rows.map((r) => [r._id, r.visits]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    // Ngày (giờ VN) = from + i ngày, rồi định dạng YYYY-MM-DD theo giờ VN.
    const day = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    const key = new Date(day.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
    series.push({ date: key, visits: byDate.get(key) || 0 });
  }
  return series;
}

/**
 * Thống kê lượt truy cập theo nguồn cho một kỳ.
 *
 * @param {string} period    — 'today' | '7d' | '30d' | 'all'
 * @param {object} [options]
 * @param {boolean} [options.includeLocal=false]
 *        `true` ⇒ tính cả lượt truy cập từ localhost / *.local (dev & test).
 *        `false` (mặc định) ⇒ CHỈ tính lượt truy cập từ domain thật.
 *
 * Tổng các nhóm LUÔN bằng tổng lượt truy cập trong kỳ, vì:
 *  • Truy vấn dùng MỘT aggregate duy nhất (group by `source`) — không cộng
 *    tay từ nhiều truy vấn.
 *  • Mọi giá trị `source` nằm ngoài danh sách 4 nhóm đều rơi vào
 *    `direct_other` ngay từ lúc ghi (xem `recordVisit`), nên không có
 *    "phần dư" nào bị bỏ sót.
 */
async function getTrafficStats(period, options = {}) {
  const key = resolvePeriod(period);
  const start = periodStart(key);
  const includeLocal = options.includeLocal === true;

  const collection = await getMongoCollection();
  if (!collection) {
    throw new Error('Không kết nối được MongoDB để đọc dữ liệu lượt truy cập.');
  }

  // ── Phân loại bản ghi theo nguồn website ──────────────────────────────
  // `origin` (xem ORIGIN_EXPR):
  //   'production' — có siteHost hợp lệ, không phải localhost.
  //   'dev'        — localhost / 127.0.0.1 / *.local (hoặc isLocal = true).
  //   'unknown'    — bản ghi cũ chưa có siteHost.
  //
  // Bản ghi `unknown` KHÔNG được tự động coi là khách production.
  const buildMatch = (withTime) => {
    const m = {};
    if (withTime && start) m.createdAt = { $gte: start };
    return m;
  };

  // ── 1. Phân nhóm theo nguồn (MỘT truy vấn duy nhất) ───────────────────
  // Khi `includeLocal` = false (mặc định) ⇒ chỉ tính lượt 'production'.
  const originFilter = includeLocal
    ? { $in: ['$origin', ['production', 'dev', 'unknown']] }
    : { $eq: ['$origin', 'production'] };

  const grouped = await collection
    .aggregate([
      { $addFields: { origin: ORIGIN_EXPR } },
      { $match: { ...buildMatch(true), $expr: originFilter } },
      { $group: { _id: '$source', n: { $sum: 1 } } },
    ])
    .toArray();

  const counts = new Map();
  let totalVisits = 0;
  for (const row of grouped) {
    const count = row.n;
    counts.set(row._id, count);
    totalVisits += count;
  }

  const sources = SOURCE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    visits: counts.get(group.source) || 0,
  }));

  // Nhóm phụ (không thuộc 4 nhóm chuẩn) — về lý thuyết không có vì lúc ghi
  // đã chuẩn hoá, nhưng nếu có dữ liệu cũ thì gộp vào direct để tổng luôn
  // khớp.
  const known = new Set(SOURCE_GROUPS.map((g) => g.source));
  let otherVisits = 0;
  for (const [src, count] of counts) {
    if (!known.has(src)) otherVisits += count;
  }
  if (otherVisits > 0) {
    const direct = sources.find((s) => s.key === 'direct');
    if (direct) direct.visits += otherVisits;
  }

  const groupedTotal = sources.reduce((sum, s) => sum + s.visits, 0);

  // ── 3. Tỷ lệ % (largest remainder) — tổng LUÔN đúng 100% ───────────────
  // Nếu dùng Math.round cho từng nhóm riêng lẻ, tổng có thể ra 101%/99% do
  // sai số làm tròn. Phương pháp "largest remainder" đảm bảo tổng = 100%.
  const percents = {};
  if (groupedTotal > 0) {
    const exact = sources.map((s) => (s.visits / groupedTotal) * 100);
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

  // ── 2. Chuỗi ngày ──────────────────────────────────────────────────────
  const daily =
    key === 'all'
      ? []
      : await dailySeries(start, PERIODS[key].days, includeLocal);

  const firstVisit = await collection
    .find(buildMatch(true))
    .sort({ createdAt: 1 })
    .limit(1)
    .project({ createdAt: 1 })
    .next();

  // ── 4. Phân bổ theo hostname + phân nhóm nguồn website ────────────────
  // Tuân theo `includeLocal`: mặc định chỉ liệt kê website production.
  const byHost = await collection
    .aggregate([
      { $addFields: { origin: ORIGIN_EXPR } },
      {
        $match: {
          ...buildMatch(true),
          $expr: includeLocal
            ? { $in: ['$origin', ['production', 'dev', 'unknown']] }
            : { $eq: ['$origin', 'production'] },
        },
      },
      { $group: { _id: '$siteHost', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  // ── 5. Đếm lượt theo từng nhóm nguồn website (dev / unknown) ───────────
  // Những lượt này KHÔNG nằm trong số liệu chính khi `includeLocal = false`.
  const originCounts = await collection
    .aggregate([
      { $addFields: { origin: ORIGIN_EXPR } },
      { $match: buildMatch(true) },
      { $group: { _id: '$origin', n: { $sum: 1 } } },
    ])
    .toArray();

  const originMap = new Map(originCounts.map((r) => [r._id, r.n]));
  const devVisits = originMap.get('dev') || 0;
  const unknownVisits = originMap.get('unknown') || 0;

  return {
    period: key,
    periodLabel: PERIODS[key].label,
    totals: {
      // TỔNG LƯỢT TRUY CẬP (tích luỹ theo kỳ) — chỉ lượt production.
      totalVisits,
      // Tổng các nhóm nguồn — LUÔN bằng totalVisits (cùng một truy vấn).
      groupedTotal,
      // KHÔNG có "người dùng duy nhất": dữ liệu này đếm phiên, không đếm người.
      uniqueUsers: null,
      // Số lượt từ localhost/dev-test ĐÃ BỊ LOẠI khỏi số liệu trên.
      excludedLocalVisits: devVisits,
      // Số lượt lịch sử chưa xác định được website (không có `siteHost`).
      // Được báo riêng, KHÔNG tự động coi là khách production.
      unknownOriginVisits: unknownVisits,
    },
    sources: sources.map((s) => ({ ...s, percent: percents[s.key] ?? 0 })),
    daily,
    // Phân bổ theo hostname — "chưa xác định" = dữ liệu cũ trước khi có
    // trường `siteHost`.
    siteHosts: byHost.map((row) => ({
      host: row._id ?? '(chưa xác định)',
      visits: row.n,
    })),
    includeLocal,
    firstRecordedAt: firstVisit ? new Date(firstVisit.createdAt).toISOString() : null,
    generatedAt: new Date().toISOString(),
    note:
      'Dữ liệu lượt truy cập tự ghi (MongoDB). Mỗi phiên 30 phút được tính là 1 lượt. ' +
      'Không có số "người dùng duy nhất" vì hệ thống không xác định được danh tính người dùng.' +
      (includeLocal
        ? ' Đang tính CẢ lượt truy cập từ localhost (dev/test).'
        : ` Đã loại ${devVisits} lượt dev/test` +
          (unknownVisits > 0
            ? ` và ${unknownVisits} lượt lịch sử chưa xác định được website.`
            : '.')),
  };
}

module.exports = {
  recordVisit,
  getTrafficStats,
  classifyUtmSource,
  classifyClickIdParam,
  classifyReferrerHost,
  extractReferrerHost,
  sanitizeLandingPath,
  sanitizeSiteHost,
  isLocalHost,
  classifyOrigin,
  resolvePeriod,
  SESSION_TIMEOUT_MS,
  VALID_SOURCES,
  SOURCE_FACEBOOK,
  SOURCE_THREADS,
  SOURCE_GOOGLE,
  SOURCE_DIRECT,
};
