require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./config/openapi.json');

// The spec is a static JSON file, so the "servers" entry is rewritten at
// runtime to always point at the address this process is actually reachable
// on. Without this, Swagger keeps calling the hard-coded localhost URL.
openApiSpec.servers = [
  {
    url: config.apiBaseUrl,
    description: 'Local Server',
  },
];

// Import routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const sellerRoutes = require('./routes/seller');
const managerRoutes = require('./routes/manager');
const adminRoutes = require('./routes/admin');
const tenantRoutes = require('./routes/tenant');
const paymentRoutes = require('./routes/payment');
const notificationRoutes = require('./routes/notifications');
const geocodeRoutes = require('./routes/geocode');
const websiteReviewRoutes = require('./routes/website-reviews');
const trafficRoutes = require('./routes/traffic');

const app = express();

// Middleware
// CORS - FE chạy trên Vercel (HTTPS), BE chạy local
//
// LƯU Ý QUAN TRỌNG (Private Network Access):
//  Trang trên Vercel là HTTPS, còn backend local là HTTP. Chrome coi
//  `http://localhost` là "potentially trustworthy" nên không chặn mixed
//  content, NHƯNG browser vẫn gửi preflight kèm header
//  `Access-Control-Request-Private-Network: true` cho mọi request từ
//  HTTPS sang loopback. Nếu server KHÔNG trả lại
//  `Access-Control-Allow-Private-Network: true` thì browser chặn request ⇒
//  frontend trên Vercel không gọi được được backend local.
const allowedOrigins = [
  // Local development frontend
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  // Production frontend (Vercel) — domain chính
  'https://thien-nhan-tru-do-kappa.vercel.app',
];

// Thêm frontend URLs từ env (comma separated) nếu cần
if (process.env.FRONTEND_URL) {
  const extraUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(Boolean);
  allowedOrigins.push(...extraUrls);
}

/**
 * Origin này có thuộc website Vercel của dự án không?
 *
 * Domain chính đã nằm trong `allowedOrigins`, nhưng mỗi lần deploy Vercel
 * sinh ra một URL riêng (`thien-nhan-tru-<hash>-a0994123456-3674s-projects
 * .vercel.app`) và các URL preview khác. Nếu không cho phép, trình duyệt bị
 * chặn CORS khi mở bằng URL đó.
 */
function isAllowedVercelOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (!origin.startsWith('https://')) return false;
  let hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  // Domain chính của dự án + mọi URL deploy/preview của cùng project.
  return (
    hostname === 'thien-nhan-tru-do-kappa.vercel.app' ||
    /^thien-nhan-tru-[a-z0-9]+-a0994123456-3674s-projects\.vercel\.app$/i.test(
      hostname
    ) ||
    /^thien-nhan-tru-do-[a-z0-9-]+\.vercel\.app$/i.test(hostname)
  );
}

/**
 * Trả header cho phép Private Network Access.
 *
 * Phải đặt TRƯỚC middleware `cors()` để header có mặt trong preflight
 * response (preflight được kết thúc ngay bởi `cors()`).
 */
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

/**
 * Backend có thể chạy sau một reverse proxy (VD: khi deploy lên một dịch vụ
 * có sẵn HTTPS).
 *
 * Không có dòng này, `req.ip` sẽ là IP của proxy ⇒ rate limiter theo IP sẽ
 * gộp MỌI khách truy cập vào cùng một "IP" và chặn nhầm.
 */
app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin) || isAllowedVercelOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  // Cho phép header của preflight Private Network Access.
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Access-Control-Request-Private-Network',
    'Access-Control-Request-Headers',
    'Access-Control-Request-Method',
  ],
  exposedHeaders: ['Access-Control-Allow-Private-Network'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI - chỉ bật trong development
if (config.nodeEnv === 'development') {
  // OpenAPI JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.json(openApiSpec);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Thiên Nhãn API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/website-reviews', websiteReviewRoutes);
// Public traffic tracking — KHÔNG cần đăng nhập (khách truy cập).
app.use('/api/traffic', trafficRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint không tồn tại' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  const dbName = config.database.url.includes('mongodb')
    ? 'MongoDB Atlas (thiennhan_db)'
    : config.database.url.includes('sqlite') || config.database.url.includes('file:')
      ? 'SQLite (local)'
      : 'Unknown';
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Thiên Nhãn Backend Server                   ║
║                                                   ║
║   Server: http://localhost:${PORT}                   ║
║   Environment: ${config.nodeEnv.padEnd(20)}           ║
║   Database: ${dbName.padEnd(32)}   ║
║   Email: ${config.email.configured ? `${config.email.provider} (configured)` : `${config.email.provider} (NOT configured)`}      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);

  // If the mail transport has no usable credentials, say so loudly at boot
  // instead of letting every OTP silently fail at runtime.
  if (!config.email.configured) {
    console.error(
      '\n[EMAIL] ⚠️  Email transport is NOT configured — OTP e-mails will NOT be delivered.'
    );
    console.error(`[EMAIL]     provider: ${config.email.provider}`);
    console.error(
      '[EMAIL]     fix: set EMAIL_PROVIDER=smtp with SMTP_HOST/SMTP_USER/SMTP_PASS, or set RESEND_API_KEY.\n'
    );
  }

  // Start Star Expiration Scheduler
  if (config.nodeEnv === 'production' || config.enableStarScheduler) {
    const starService = require('./services/starService');
    
    // Run immediately on startup
    setTimeout(() => {
      console.log('[Scheduler] Running initial star expiration check...');
      starService.processExpiredStars()
        .then(result => {
          if (result.processed > 0) {
            console.log(`[Scheduler] Star expiration: ${result.processed} batches, ${result.expired} Stars expired`);
          }
        })
        .catch(err => console.error('[Scheduler] Error:', err));
    }, 10000); // 10 second delay after startup

    // Run hourly
    setInterval(() => {
      console.log('[Scheduler] Running hourly star expiration check...');
      starService.processExpiredStars()
        .then(result => {
          if (result.processed > 0) {
            console.log(`[Scheduler] Star expiration: ${result.processed} batches, ${result.expired} Stars expired`);
          } else {
            console.log('[Scheduler] No expired Stars to process');
          }
        })
        .catch(err => console.error('[Scheduler] Error:', err));
    }, 60 * 60 * 1000); // 1 hour

    console.log('[Scheduler] Star expiration scheduler started (hourly)');
  }
});

module.exports = app;
