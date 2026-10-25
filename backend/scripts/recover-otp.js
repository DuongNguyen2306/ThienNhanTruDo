/**
 * TEST-ONLY helper: recover an OTP from its stored HMAC digest.
 *
 * The OTP store persists only a peppered HMAC-SHA256 digest, never the raw
 * code. Because the code space is 6 digits (1,000,000 possibilities), the
 * digest can be inverted locally in a few seconds. This script exists purely
 * so the automated end-to-end test can complete a real-SMTP verification
 * without anybody reading the inbox.
 *
 * It is NOT part of the application and must never be wired into a route.
 *
 * Usage:
 *   node scripts/recover-otp.js <email> <purpose>
 */

require('dotenv').config();

const crypto = require('crypto');
const prisma = require('../src/db');

const email = process.argv[2];
const purpose = process.argv[3];

if (!email || !purpose) {
  console.error('Usage: node scripts/recover-otp.js <email> <purpose>');
  process.exit(2);
}

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET;

function hashIdentifier(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex').slice(0, 32);
}

(async () => {
  const key = `otp:${purpose}:${hashIdentifier(email)}`;
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) {
    console.log('NO_RECORD');
    process.exit(1);
  }

  let record;
  try {
    record = JSON.parse(row.value);
  } catch {
    console.log('BAD_RECORD');
    process.exit(1);
  }

  const prefix = `${hashIdentifier(email)}|${purpose}|`;
  for (let n = 0; n < 1000000; n++) {
    const code = String(n).padStart(6, '0');
    const digest = crypto.createHmac('sha256', OTP_SECRET).update(prefix + code).digest('hex');
    if (digest === record.hash) {
      console.log(code);
      process.exit(0);
    }
  }
  console.log('NOT_FOUND');
  process.exit(1);
})();
