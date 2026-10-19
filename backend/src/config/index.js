require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  console.error('Please set JWT_SECRET in your .env file or environment');
  process.exit(1);
}

const vnpayHashSecret = process.env.VNPAY_HASH_SECRET;
if (!vnpayHashSecret) {
  console.error('FATAL: VNPAY_HASH_SECRET environment variable is required');
  console.error('Please set VNPAY_HASH_SECRET from VNPay Merchant Portal');
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Validate JWT secret strength in production
if (nodeEnv === 'production' && jwtSecret.length < 32) {
  console.warn('WARNING: JWT_SECRET should be at least 32 characters for production security');
}

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv,
  enableSwaggerInProduction: process.env.ENABLE_SWAGGER === 'true',
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  vnpay: {
    hashSecret: vnpayHashSecret,
  },
};
