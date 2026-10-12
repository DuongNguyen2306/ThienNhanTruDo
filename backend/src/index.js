require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const sellerRoutes = require('./routes/seller');
const managerRoutes = require('./routes/manager');
const adminRoutes = require('./routes/admin');
const tenantRoutes = require('./routes/tenant');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/payment', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint không tồn tại' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Thiên Nhãn Backend Server                   ║
║                                                   ║
║   Server: http://localhost:${PORT}                   ║
║   Environment: ${config.nodeEnv.padEnd(20)}           ║
║   Database: SQLite (./prisma/dev.db)              ║
║                                                   ║
║   Demo OTP: ${config.demoOtp}                               ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
