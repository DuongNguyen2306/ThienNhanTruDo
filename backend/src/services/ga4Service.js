/**
 * GA4 Data API service.
 *
 * Đọc dữ liệu truy cập thật từ Google Analytics 4 cho trang Admin.
 * KHÔNG bao giờ trả credentials hay private key về phía Frontend.
 *
 * Design notes
 * ------------
 * - Credentials được resolve theo đường dẫn TƯƠNG ĐỐI so với thư mục
 *   project (không phụ thuộc thư mục chạy lệnh), rồi mới fallback về
 *   biến môi trường GOOGLE_APPLICATION_CREDENTIALS.
 * - Client được khởi tạo lazily (một lần) để không mở connection
 *   khi module được require.
 * - Kết quả được cache trong RAM với TTL ngắn (mặc định 2 phút) để không
 *   đốt quota của GA4 (property: 10 property/hour).
 * - Tổng người dùng DUY NHẤT lấy từ một truy vấn TỔNG riêng, KHÔNG cộng
 *   activeUsers của các nguồn lại (một người có thể đến từ nhiều nguồn).
 */

const fs = require('fs');
const path = require('path');

const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CACHE_TTL_MS = Number(process.env.GA4_CACHE_TTL_MS || 2 * 60 * 1000);
const REALTIME_CACHE_TTL_MS = Number(process.env.GA4_REALTIME_CACHE_TTL_MS || 30 * 1000);

// ───────────────────────────────────────────────────────────────────────────
// Credential resolution
// ───────────────────────────────────────────────────────────────────────────

/** Thư mục gốc của backend (…/backend), không phụ thuộc cwd. */
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Tìm file credentials mà không phụ thuộc thư mục chạy lệnh.
 * Thứ tự ưu tiên:
 *   1. GA4_CREDENTIALS_PATH (đường dẫn tuyệt đối hoặc tương đối so với BACKEND_ROOT)
 *   2. GOOGLE_APPLICATION_CREDENTIALS (tương đối so với BACKEND_ROOT trước, rồi cwd)
 *   3. secrets/ga4-service-account.json trong BACKEND_ROOT
 */
function resolveCredentialsPath() {
  const candidates = [];

  const explicit = process.env.GA4_CREDENTIALS_PATH;
  if (explicit) {
    candidates.push(path.resolve(BACKEND_ROOT, explicit));
    candidates.push(path.resolve(process.cwd(), explicit));
    candidates.push(explicit);
  }

  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv) {
    // Đường dẫn tương đối trong .env thường là "./secrets/xxx.json" — tương đối
    // với BACKEND_ROOT chứ không phải cwd, nên thử BACKEND_ROOT trước.
    candidates.push(path.resolve(BACKEND_ROOT, fromEnv));
    candidates.push(path.resolve(process.cwd(), fromEnv));
  }

  candidates.push(path.join(BACKEND_ROOT, 'secrets', 'ga4-service-account.json'));

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // bỏ qua candidate lỗi
    }
  }
  return null;
}

let cachedClient = null;
let cachedClientError = null;

/**
 * Credentials từ biến môi trường (dùng cho Vercel / container, nơi không
 * thể upload file JSON).
 *
 * `GA4_PRIVATE_KEY` phải lưu với newline thật (`\n`), không phải chuỗi
 * literal `\n`. Nhiều CLI đặt biến từ file sẽ tự thay thế.
 */
function resolveCredentialsFromEnv() {
  const clientEmail = (process.env.GA4_CLIENT_EMAIL || '').trim();
  const rawKey = process.env.GA4_PRIVATE_KEY || '';

  if (!clientEmail || !rawKey) return null;

  // Người dùng có thể paste private key với newline bị escape.
  const privateKey = rawKey.replace(/\\n/g, '\n');

  return { client_email: clientEmail, private_key: privateKey };
}

function getClient() {
  if (cachedClient) return cachedClient;
  if (cachedClientError) throw cachedClientError;

  // Ưu tiên biến môi trường — hoạt động trên Vercel.
  const envCredentials = resolveCredentialsFromEnv();
  if (envCredentials) {
    try {
      cachedClient = new BetaAnalyticsDataClient({ credentials: envCredentials });
      return cachedClient;
    } catch (error) {
      cachedClientError = error;
      throw error;
    }
  }

  const credPath = resolveCredentialsPath();
  if (!credPath) {
    cachedClientError = new Error(
      'GA4: không tìm thấy thông tin xác thực. Kiểm tra GOOGLE_APPLICATION_CREDENTIALS trong backend/.env, đặt backend/secrets/ga4-service-account.json, hoặc set GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY trong môi trường deploy.',
    );
    throw cachedClientError;
  }

  try {
    // google-auth-library tự đọc GOOGLE_APPLICATION_CREDENTIALS, nhưng ta truyền
    // path tuyệt đối để không phụ thuộc cwd.
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    cachedClient = new BetaAnalyticsDataClient();
    return cachedClient;
  } catch (error) {
    cachedClientError = error;
    throw error;
  }
}

function isConfigured() {
  return Boolean(PROPERTY_ID) && Boolean(resolveCredentialsFromEnv() || resolveCredentialsPath());
}

// ───────────────────────────────────────────────────────────────────────────
// Date ranges
// ───────────────────────────────────────────────────────────────────────────

const PERIODS = {
  today: { startDate: 'today', endDate: 'today', label: 'Hôm nay' },
  // `endDate` phải là 'today' chứ không phải 'yesterday': GA4 có thể đã có
  // dữ liệu của hôm nay (độ trễ xử lý thực tế thường vài giờ, không phải
  // 24–48h như nhiều tài liệu mô tả). Dùng 'yesterday' sẽ loại mất toàn
  // bộ dữ liệu khi property mới bắt đầu nhận lượt truy cập.
  '7d': { startDate: '7daysAgo', endDate: 'today', label: '7 ngày' },
  '30d': { startDate: '30daysAgo', endDate: 'today', label: '30 ngày' },
};

function resolvePeriod(period) {
  const key = String(period || '7d').toLowerCase();
  return PERIODS[key] ? key : '7d';
}

// ───────────────────────────────────────────────────────────────────────────
// Source grouping
// ───────────────────────────────────────────────────────────────────────────

/**
 * Phân nhóm nguồn truy cập dựa trên dữ liệu GA4 thật (sessionSourceMedium).
 *
 * ChatGPT / các trợ lý AI khác KHÔNG được tách riêng — chúng rơi vào
 * "Trực tiếp / Khác" đúng theo yêu cầu.
 */
const SOURCE_GROUPS = [
  { key: 'facebook', label: 'Facebook', match: /facebook|fb\.com|messenger/i },
  { key: 'threads', label: 'Threads', match: /threads/i },
  { key: 'google', label: 'Google', match: /google|adwords|doubleclick|dm\.google/i },
];

const OTHER_KEY = 'direct';
const OTHER_LABEL = 'Trực tiếp / Khác';

/** Xác định nhóm nguồn từ chuỗi "source / medium" của GA4. */
function classifySource(sessionSourceMedium) {
  const raw = String(sessionSourceMedium || '').trim();
  // GA4 trả về dạng "facebook / organic_social" hoặc "(direct) / (none)".
  const source = raw.split('/')[0].trim();

  for (const group of SOURCE_GROUPS) {
    if (group.match.test(source)) return group.key;
  }
  return OTHER_KEY;
}

// ───────────────────────────────────────────────────────────────────────────
// Cache
// ───────────────────────────────────────────────────────────────────────────

const cache = new Map(); // key -> { value, expiresAt }

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function clearCache() {
  cache.clear();
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function metricValue(row, index) {
  const mv = row.metricValues?.[index];
  return mv ? Number(mv.value) || 0 : 0;
}

/** Chuyển lỗi của Google API thành thông điệp thân thiện, không kèm credential. */
function toFriendlyError(error) {
  const code = error?.code;
  const details = String(error?.details || error?.message || '');

  if (code === 7 || /PERMISSION_DENIED/i.test(details)) {
    return new Error(
      'GA4: Service Account chưa có quyền đọc property hoặc Google Analytics Data API chưa được bật trong Google Cloud Project.',
    );
  }
  if (code === 8 || /RESOURCE_EXHAUSTED|quota/i.test(details)) {
    return new Error('GA4: đã vượt quota truy vấn. Vui lòng thử lại sau ít phút.');
  }
  if (code === 3 || /INVALID_ARGUMENT/i.test(details)) {
    return new Error('GA4: tham số truy vấn không hợp lệ.');
  }
  return new Error('GA4: không đọc được dữ liệu. Vui lòng thử lại sau.');
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lấy số liệu truy cập theo nguồn cho một khoảng thời gian.
 *
 * @param {string} period 'today' | '7d' | '30d'
 * @returns {Promise<object>}
 */
async function getTrafficReport(period) {
  const key = resolvePeriod(period);
  const cacheKey = `traffic:${key}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!isConfigured()) {
    throw new Error(
      'GA4 chưa được cấu hình. Thiếu GA4_PROPERTY_ID hoặc file credentials service account.',
    );
  }

  const client = getClient();
  const range = PERIODS[key];

  try {
    // ── 1. Theo nguồn (dimension = sessionSourceMedium) ─────────────────
    const [bySource] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      limit: 100,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    const rows = bySource.rows || [];

    // Gom theo nhóm nguồn.
    const grouped = new Map();
    for (const group of [...SOURCE_GROUPS.map((g) => ({ key: g.key, label: g.label })), { key: OTHER_KEY, label: OTHER_LABEL }]) {
      grouped.set(group.key, {
        key: group.key,
        label: group.label,
        sessions: 0,
        activeUsers: 0,
        breakdown: [],
      });
    }

    for (const row of rows) {
      const raw = row.dimensionValues?.[0]?.value || '';
      const groupKey = classifySource(raw);
      const bucket = grouped.get(groupKey);
      const sessions = metricValue(row, 0);
      const activeUsers = metricValue(row, 1);

      bucket.sessions += sessions;
      bucket.activeUsers += activeUsers;
      bucket.breakdown.push({
        sourceMedium: raw,
        sessions,
        activeUsers,
      });
    }

    // Sắp xếp breakdown theo sessions giảm dần.
    for (const bucket of grouped.values()) {
      bucket.breakdown.sort((a, b) => b.sessions - a.sessions);
    }

    // ── 2. Tổng người dùng DUY NHẤT — truy vấn TỔNG riêng ───────────────
    // KHÔNG cộng activeUsers của các nhóm: một người có thể đến từ nhiều
    // nguồn trong cùng khoảng thời gian, nên tổng sẽ bị tính trùng.
    const [totals] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'activeUsers' }],
    });

    const totalsRow = (totals.rows || [])[0];
    const totalUsers = totalsRow ? metricValue(totalsRow, 0) : 0;
    const totalSessions = totalsRow ? metricValue(totalsRow, 1) : 0;
    const totalActiveUsers = totalsRow ? metricValue(totalsRow, 2) : 0;

    const sources = [...grouped.values()].map((b) => ({
      key: b.key,
      label: b.label,
      sessions: b.sessions,
      activeUsers: b.activeUsers,
      breakdown: b.breakdown,
    }));

    const payload = {
      period: key,
      periodLabel: range.label,
      dateRange: { startDate: range.startDate, endDate: range.endDate },
      totals: {
        // Người dùng duy nhất — lấy từ truy vấn tổng, KHÔNG cộng từ các nguồn.
        totalUsers,
        totalSessions,
        totalActiveUsers,
        usersBySourceSum: sources.reduce((sum, s) => sum + s.activeUsers, 0),
      },
      sources,
      note:
        'totalUsers là số người dùng DUY NHẤT từ truy vấn tổng của GA4. ' +
        'Tổng activeUsers của các nguồn có thể lớn hơn vì một người có thể đến từ nhiều nguồn.',      generatedAt: new Date().toISOString(),
    };

    return setCached(cacheKey, payload, CACHE_TTL_MS);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Người dùng đang hoạt động trong 30 phút gần nhất (Realtime API).
 *
 * LƯU Ý: số liệu realtime KHÁC số liệu lịch sử —
 *  - Realtime = 30 phút gần nhất, chưa gộp phiên, có thể tính lại.
 *  - Lịch sử = đã xử lý đầy đủ, có độ trễ 24–48 giờ.
 */
async function getRealtimeReport() {
  const cacheKey = 'realtime';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!isConfigured()) {
    throw new Error('GA4 chưa được cấu hình.');
  }

  const client = getClient();

  try {
    const [rt] = await client.runRealtimeReport({
      property: `properties/${PROPERTY_ID}`,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
      limit: 50,
    });

    const rows = rt.rows || [];
    let activeUsers = 0;
    let eventCount = 0;
    const countries = [];

    for (const row of rows) {
      const users = metricValue(row, 0);
      const events = metricValue(row, 1);
      activeUsers += users;
      eventCount += events;
      const country = row.dimensionValues?.[0]?.value || '(không rõ)';
      countries.push({ country, activeUsers: users, eventCount: events });
    }

    countries.sort((a, b) => b.activeUsers - a.activeUsers);

    const payload = {
      window: '30 phút gần nhất',
      activeUsers,
      eventCount,
      countries,
      note:
        'Số liệu Realtime tính trong 30 phút gần nhất và chưa qua xử lý đầy đủ, ' +
        'nên có thể KHÁC (và thường nhỏ hơn) số liệu lịch sử cùng khoảng thời gian.',
      generatedAt: new Date().toISOString(),
    };

    return setCached(cacheKey, payload, REALTIME_CACHE_TTL_MS);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

module.exports = {
  PERIODS,
  SOURCE_GROUPS,
  OTHER_KEY,
  OTHER_LABEL,
  isConfigured,
  resolveCredentialsPath,
  resolveCredentialsFromEnv,
  resolvePeriod,
  classifySource,
  getTrafficReport,
  getRealtimeReport,
  clearCache,
};
