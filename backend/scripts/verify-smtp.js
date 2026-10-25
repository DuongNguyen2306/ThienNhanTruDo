/**
 * SMTP self-test — verifies the Gmail SMTP connection without sending an
 * e-mail to anybody.
 *
 * Usage:
 *   node scripts/verify-smtp.js
 *
 * It only performs transporter.verify(): it authenticates with the SMTP
 * server and confirms the transport works. No OTP, no credential and no
 * recipient address is ever printed.
 */

require('dotenv').config();

const emailHelper = require('../src/helpers/emailHelper');

(async () => {
  console.log('─'.repeat(60));
  console.log('SMTP CONNECTION TEST (transporter.verify)');
  console.log('─'.repeat(60));
  console.log('EMAIL_PROVIDER :', emailHelper.provider);
  console.log('SMTP_HOST      :', process.env.SMTP_HOST || '(unset)');
  console.log('SMTP_PORT      :', process.env.SMTP_PORT || '(unset)');
  console.log('SMTP_SECURE    :', process.env.SMTP_SECURE || '(unset)');
  console.log('SMTP_USER      :', process.env.SMTP_USER ? '(set)' : '(unset)');
  console.log('SMTP_PASS      :', process.env.SMTP_PASS ? '(set)' : '(unset)');
  console.log('─'.repeat(60));

  const result = await emailHelper.verifySmtpTransport();
  if (result.ok) {
    console.log('RESULT: PASS — SMTP connection and authentication succeeded.');
  } else {
    console.log('RESULT: FAIL —', result.error);
  }
  console.log('─'.repeat(60));
  process.exit(result.ok ? 0 : 1);
})();
