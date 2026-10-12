require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  demoOtp: process.env.DEMO_OTP || '123456',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
