require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const openApiSpec = require('./config/openapi.json');

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

const app = express();

// Middleware
// CORS - cho phép nhiều origins
const allowedOrigins = [
  'http://localhost:3000',           // Dev frontend
  'http://localhost:5173',            // Vite dev
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://thien-nhan-tru-do-kappa.vercel.app', // Production frontend
];

// Thêm production frontend URLs từ env (comma separated)
if (process.env.FRONTEND_URL) {
  const extraUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...extraUrls);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
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

// Swagger UI - bật trong cả development và production
if (config.nodeEnv === 'development' || config.enableSwaggerInProduction) {
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
