/**
 * Direct SMTP delivery test — prints the full Gmail SMTP response.
 * Run: node scripts/test-smtp-direct.js <recipient>
 */
require('dotenv').config({ path: './.env' });

const nodemailer = require('nodemailer');
const to = process.argv[2] || 'thiennhantrudocskh@gmail.com';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

(async () => {
  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: `[Thien Nhan] Test OTP delivery ${new Date().toISOString()}`,
      text: 'Day la email kiem tra thu giao. Ma OTP: 123456',
      html: '<p>Day la email kiem tra thu giao.</p><p>Ma OTP: <b>123456</b></p>',
    });

    console.log('=== SEND RESULT ===');
    console.log('messageId :', info.messageId);
    console.log('accepted  :', JSON.stringify(info.accepted));
    console.log('rejected  :', JSON.stringify(info.rejected));
    console.log('pending   :', JSON.stringify(info.pending));
    console.log('response  :', info.response);
    console.log('envelope  :', JSON.stringify(info.envelope));
  } catch (err) {
    console.log('=== SEND FAILED ===');
    console.log('code    :', err.code);
    console.log('command :', err.command);
    console.log('message :', err.message);
    console.log('response:', err.response);
  } finally {
    transport.close();
    process.exit(0);
  }
})();
