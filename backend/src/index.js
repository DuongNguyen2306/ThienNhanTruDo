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

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
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
║                                                   ║
║   Demo OTP: ${config.demoOtp}                               ║
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
