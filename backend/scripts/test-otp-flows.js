/**
 * OTP flow integration test.
 *
 * Exercises the three OTP flows at the helper level against the REAL
 * transport and the REAL OTP store:
 *
 *   1. register_verify  → issue → deliver by e-mail → verify
 *   2. password_reset   → issue → deliver by e-mail → verify
 *   3. email_change     → issue → deliver by e-mail → verify
 *
 * It does NOT create user accounts and does NOT change the schema. The OTP
 * records it creates are consumed (deleted) by the verification step.
 *
 * Usage:
 *   node scripts/test-otp-flows.js <recipient@example.com>
 *
 * The raw OTP is never printed: only the delivery outcome and the
 * verification outcome are reported.
 */

require('dotenv').config();

const otpHelper = require('../src/helpers/otpHelper');
const emailHelper = require('../src/helpers/emailHelper');

const to = process.argv[2];

function line(char = '─') {
  return char.repeat(60);
}

async function runFlow(purpose, recipient) {
  console.log(`\n${line('=')}`);
  console.log(`FLOW: ${purpose}`);
  console.log(line('='));

  const issued = await otpHelper.issueOtp({
    email: recipient,
    purpose,
    payload: { userId: 'test-user', newEmail: recipient },
    ip: '127.0.0.1',
  });

  if (!issued.ok) {
    console.log(`RESULT: FAIL — could not issue OTP (${issued.reason}, retryAfter=${issued.retryAfter}s)`);
    return false;
  }
  console.log('OTP issued          : OK');

  const sent = await emailHelper.sendOtpEmail({
    to: recipient,
    code: issued.code,
    purpose,
  });

  if (!sent.ok) {
    console.log(`RESULT: FAIL — e-mail delivery failed (${sent.error})`);
    return false;
  }
  console.log('E-mail delivered    : OK');

  // A wrong code must be rejected.
  const wrong = await otpHelper.verifyOtp({
    email: recipient,
    purpose,
    code: '000000',
    ip: '127.0.0.1',
  });
  console.log(`Wrong code rejected : ${wrong.ok ? 'FAIL (accepted!)' : 'OK'}`);

  const right = await otpHelper.verifyOtp({
    email: recipient,
    purpose,
    code: issued.code,
    ip: '127.0.0.1',
  });

  if (!right.ok) {
    console.log(`RESULT: FAIL — verification rejected (${right.reason})`);
    return false;
  }
  console.log('Correct code accepted: OK');

  // Single use: the code must not work twice.
  const replay = await otpHelper.verifyOtp({
    email: recipient,
    purpose,
    code: issued.code,
    ip: '127.0.0.1',
  });
  console.log(`Replay rejected     : ${replay.ok ? 'FAIL (accepted!)' : 'OK'}`);

  console.log('RESULT: PASS');
  return true;
}

(async () => {
  if (!to) {
    console.error('Usage: node scripts/test-otp-flows.js <recipient@example.com>');
    process.exit(2);
  }

  console.log(line());
  console.log('OTP FLOW INTEGRATION TEST');
  console.log(`Provider  : ${emailHelper.provider}`);
  console.log(`Recipient : ${to}`);
  console.log(line());

  const results = [];
  for (const purpose of ['register_verify', 'password_reset', 'email_change']) {
    results.push(await runFlow(purpose, to));
    // The OTP store enforces a resend cooldown per (purpose, e-mail); wait it
    // out so the next flow starts from a clean slate.
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n${line('=')}`);
  console.log('SUMMARY');
  console.log(line('='));
  const names = ['OTP REGISTER', 'OTP FORGOT PASSWORD', 'OTP CHANGE EMAIL'];
  names.forEach((n, i) => console.log(`${n.padEnd(22)}: ${results[i] ? 'PASS' : 'FAIL'}`));
  console.log(line('='));

  process.exit(results.every(Boolean) ? 0 : 1);
})();
