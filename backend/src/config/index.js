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

// ── OTP / e-mail configuration (Task 7) ─────────────────────────────────────
// OTP_SECRET is used to HMAC the OTP digests. It falls back to JWT_SECRET so
// the feature works out of the box, but a dedicated value is recommended.
const otpSecret = process.env.OTP_SECRET || jwtSecret;
if (nodeEnv === 'production' && !process.env.OTP_SECRET) {
  console.warn('WARNING: OTP_SECRET is not set — falling back to JWT_SECRET for OTP digests');
}

// E-mail transport. EMAIL_PROVIDER selects between:
//   • 'smtp'   → Gmail / any SMTP server through Nodemailer (local dev).
//   • 'resend' → the Resend HTTP API (default, used by the hosted deployment).
const emailProvider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
const resendApiKey = process.env.RESEND_API_KEY;
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpConfigured = Boolean(
  process.env.SMTP_HOST && smtpUser && smtpPass
);

if (nodeEnv === 'production') {
  if (emailProvider === 'smtp' && !smtpConfigured) {
    console.warn('WARNING: EMAIL_PROVIDER=smtp but SMTP credentials are incomplete — e-mail delivery will fail');
  } else if (emailProvider !== 'smtp' && !resendApiKey) {
    console.warn('WARNING: RESEND_API_KEY is not set — e-mail OTP delivery will fail in production');
  }
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
  otp: {
    secret: otpSecret,
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS || 600),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    maxSendsPerHour: Number(process.env.OTP_MAX_SENDS_PER_HOUR || 5),
  },
  email: {
    provider: emailProvider,
    apiKey: resendApiKey,
    from:
      emailProvider === 'smtp'
        ? process.env.SMTP_FROM_EMAIL || (smtpUser ? `Thiên Nhãn Trú Đồ <${smtpUser}>` : '')
        : process.env.RESEND_FROM_EMAIL || 'Thiên Nhãn Trú Đồ <no-reply@thiennhan.vn>',
    configured: emailProvider === 'smtp' ? smtpConfigured : Boolean(resendApiKey),
  },
};
