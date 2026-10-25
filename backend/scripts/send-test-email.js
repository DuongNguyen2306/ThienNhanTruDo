/**
 * SMTP send test — sends ONE real e-mail to a given address.
 *
 * Usage:
 *   node scripts/send-test-email.js <recipient@example.com>
 *
 * Deliberately separate from verify-smtp.js so nothing is ever sent by
 * accident. The recipient must be passed explicitly on the command line.
 * The e-mail carries a fixed dummy code (never a real OTP) and no secret.
 */

require('dotenv').config();

const emailHelper = require('../src/helpers/emailHelper');

const to = process.argv[2];

(async () => {
  if (!to) {
    console.error('Usage: node scripts/send-test-email.js <recipient@example.com>');
    process.exit(2);
  }

  console.log('─'.repeat(60));
  console.log('SMTP SEND TEST');
  console.log('─'.repeat(60));
  console.log('EMAIL_PROVIDER :', emailHelper.provider);
  console.log('Recipient      :', to);
  console.log('From           :', emailHelper.SMTP_FROM);
  console.log('─'.repeat(60));

  const result = await emailHelper.sendOtpEmail({
    to,
    code: '123456',
    purpose: 'register_verify',
  });

  if (result.ok) {
    console.log('RESULT: PASS — e-mail handed to the SMTP server.');
    console.log('Message ID     :', result.id || '(not provided by server)');
  } else {
    console.log('RESULT: FAIL —', result.error);
  }
  console.log('─'.repeat(60));
  process.exit(result.ok ? 0 : 1);
})();
