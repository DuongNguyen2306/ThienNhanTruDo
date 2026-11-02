/**
 * Public traffic tracking routes.
 *
 *  POST /api/traffic/visit   — ghi nhận lượt truy cập (KHÔNG cần đăng nhập)
 *  GET  /api/traffic/health  — kiểm tra tracker hoạt động (KHÔNG cần đăng nhập)
 *
 * Endpoint ghi nhận là PUBLIC vì nó phải chạy cho khách truy cập chưa đăng
 * nhập. Rủi ro được kiểm soát bằng:
 *  • Rate limit theo IP.
 *  • Validate + cắt ngắn mọi chuỗi đầu vào.
 *  • KHÔNG lưu IP, PII, hay URL có query nhạy cảm.
 *  • Idempotency theo `sessionId` (unique index) ⇒ spam không làm tăng số
 *    liệu ngoài số phiên thật.
 */

const express = require('express');
const trafficService = require('../services/trafficService');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Rate limit riêng cho endpoint ghi nhận.
 *
 * Một người dùng thật có thể bắn 1 request / 30 phút (đó là 1 phiên), nhưng
 * script spam có thể bắn liên tục. Cho phép 60 request / phút / IP là rộng
 * rãi cho hành vi thật nhưng vẫn chặn được flood.
 */
const visitRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  key: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'TRAFFIC_RATE_LIMIT',
});

/**
 * Lấy hostname của WEBSITE đã gửi lượt truy cập.
 *
 * Ưu tiên:
 *  1. Header `Origin` (trình duyệt luôn gửi khi gọi cross-origin bằng
 *     `fetch` + CORS) — đây là nguồn đáng tin cậy nhất.
 *  2. Header `Referer` — do chính trang đặt ⇒ cũng là domain thật.
 *
 * KHÔNG dùng hostname từ `req.headers.host` vì đó là hostname của BACKEND,
 * không phải website khách đang xem.
 */
function readSiteHost(req) {
  const candidates = [
    req.headers.origin,
    req.headers.referer,
  ];
  for (const value of candidates) {
    if (!value || typeof value !== 'string') continue;
    if (!/^https?:\/\//i.test(value)) continue;
    try {
      const host = new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
      if (host) return host;
    } catch {
      /* bỏ qua */
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// POST /api/traffic/visit
// ───────────────────────────────────────────────────────────────────────────
router.post('/visit', visitRateLimiter, async (req, res, next) => {
  try {
    const body = req.body || {};

    // Chỉ nhận các field cần thiết — mọi thứ khác bị bỏ qua.
    const result = await trafficService.recordVisit({
      sessionId: body.sessionId,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      referrer: body.referrer,
      landingPath: body.landingPath,
      // Hostname website lấy từ header (Origin/Referer) — không tin body.
      siteHost: readSiteHost(req),
      // Tên tham số click id (fbclid/gclid/…) — dùng để nhận diện lượt
      // từ quảng cáo khi referrer bị Facebook/Threads chặn.
      clickIdParam: body.clickIdParam,
    });

    // Luôn trả 200 để client không phải xử lý lỗi (analytics không được
    // làm hỏng trải nghiệm người dùng).
    res.status(200).json({
      success: true,
      counted: result.counted,
      source: result.source,
    });
  } catch (error) {
    console.error('[traffic/visit]', error.message);
    // Trả 200 + success=false để client không retry dữ dỗi. Lỗi DB vẫn được
    // ghi log để admin theo dõi.
    res.status(200).json({ success: false, counted: false });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/traffic/health
// ───────────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'traffic-tracking',
    sessionTimeoutMinutes: Math.round(
      trafficService.SESSION_TIMEOUT_MS / 60000
    ),
  });
});

module.exports = router;
