/**
 * Diagnostic script — checks email provider configuration WITHOUT printing secrets.
 * Run: node scripts/check-email-config.js
 */
require('dotenv').config({ path: './.env' });

const emailHelper = require('../src/helpers/emailHelper');

function mask(v) {
  if (!v) return '(empty)';
  const s = String(v);
  if (s.length <= 4) return `${s.slice(0, 1)}***(${s.length} chars)`;
  return `${s.slice(0, 2)}***${s.slice(-2)}(${s.length} chars)`;
}

console.log('=== ENV PRESENCE (values masked) ===');
console.log('NODE_ENV          :', process.env.NODE_ENV || '(unset)');
console.log('EMAIL_PROVIDER     :', process.env.EMAIL_PROVIDER || '(unset -> defaults to "resend")');
console.log('RESEND_API_KEY     :', process.env.RESEND_API_KEY ? mask(process.env.RESEND_API_KEY) : '(NOT SET)');
console.log('RESEND_FROM_EMAIL  :', process.env.RESEND_FROM_EMAIL || '(unset)');
console.log('SMTP_HOST          :', process.env.SMTP_HOST || '(unset)');
console.log('SMTP_PORT          :', process.env.SMTP_PORT || '(unset)');
console.log('SMTP_SECURE        :', process.env.SMTP_SECURE || '(unset)');
console.log('SMTP_USER          :', process.env.SMTP_USER ? mask(process.env.SMTP_USER) : '(NOT SET)');
console.log('SMTP_PASS          :', process.env.SMTP_PASS ? mask(process.env.SMTP_PASS) : '(NOT SET)');
console.log('SMTP_FROM_EMAIL    :', process.env.SMTP_FROM_EMAIL || '(unset)');
console.log('');

console.log('=== EFFECTIVE PROVIDER ===');
console.log('emailHelper.provider          :', emailHelper.provider);
console.log('emailHelper.isEmailConfigured():', emailHelper.isEmailConfigured());
console.log('emailHelper.emailConfigProblem():', emailHelper.emailConfigProblem() || '(none)');
console.log('emailHelper.SMTP_FROM          :', emailHelper.SMTP_FROM || '(empty)');
console.log('');

console.log('=== SMTP TRANSPORT AUTH TEST ===');
emailHelper
  .verifySmtpTransport()
  .then((r) => {
    console.log('SMTP verify ok    :', r.ok);
    if (!r.ok) console.log('SMTP verify error :', r.error);
    process.exit(0);
  })
  .catch((e) => {
    console.log('SMTP verify threw :', e && e.message);
    process.exit(1);
  });
