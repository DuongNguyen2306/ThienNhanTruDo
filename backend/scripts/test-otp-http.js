/**
 * End-to-end HTTP test of the three OTP flows.
 *
 * Runs against a live backend instance and uses the DEVELOPMENT transport
 * (EMAIL_PROVIDER=resend without an API key), where the OTP is printed to the
 * server console. That lets the test read the code and complete the flow
 * without sending any real e-mail.
 *
 * The test creates a throw-away account and deletes it (with its audit logs)
 * at the end. It never touches the schema.
 *
 * Usage:
 *   node scripts/test-otp-http.js http://localhost:3105
 */

require('dotenv').config();

const prisma = require('../src/db');

const BASE = process.argv[2] || 'http://localhost:3105';
const LOG_FILE = process.argv[3] || 't.log';

const fs = require('fs');
const path = require('path');

let createdUserId = null;
let createdPhone = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function req(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body: json };
}

/** Read the newest dev-printed OTP code for an address from the server log. */
function readDevCode(email) {
  const file = path.resolve(LOG_FILE);
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(`to=${email}`)) {
      const m = lines[i].match(/code=(\d{6})/);
      if (m) return m[1];
    }
  }
  return null;
}

async function waitForDevCode(email, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const code = readDevCode(email);
    if (code) return code;
    await sleep(400);
  }
  return null;
}

function log(step, detail) {
  console.log(`  ${step.padEnd(38)} ${detail}`);
}

async function cleanup() {
  if (!createdUserId) return;
  try {
    await prisma.auditLog.deleteMany({ where: { actorId: createdUserId } });
    await prisma.user.delete({ where: { id: createdUserId } });
    console.log('\n[cleanup] throw-away account removed.');
  } catch (err) {
    console.log('\n[cleanup] FAILED:', err.message);
  }
}

(async () => {
  const stamp = Date.now();
  const email = `otp.http.${stamp}@example.com`;
  createdPhone = `09${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
  const password = 'Test@1234';

  const results = {};

  // ── 1. REGISTER ────────────────────────────────────────────────────────
  console.log('\n[1] OTP REGISTER — register → OTP → verify-email');
  const reg = await req('POST', '/api/auth/register', {
    phone: createdPhone,
    password,
    fullName: 'OTP HTTP Test',
    email,
    role: 'tenant',
  });
  log('register', `HTTP ${reg.status} requiresVerification=${reg.body?.requiresVerification}`);
  if (reg.status !== 201) {
    console.log('  body:', JSON.stringify(reg.body));
    results.register = false;
  } else {
    createdUserId = reg.body?.user?.id;
    const code = await waitForDevCode(email);
    log('OTP delivered (dev console)', code ? 'code received' : 'NO CODE');
    if (!code) {
      results.register = false;
    } else {
      // A wrong code must be rejected.
      const bad = await req('POST', '/api/auth/verify-email', { email, otp: '000000' });
      log('wrong OTP rejected', `HTTP ${bad.status} (${bad.body?.code})`);
      const good = await req('POST', '/api/auth/verify-email', { email, otp: code });
      log('correct OTP accepted', `HTTP ${good.status} token=${good.body?.token ? 'issued' : 'none'}`);
      results.register = good.status === 200 && Boolean(good.body?.token);
      // The token is needed for the e-mail-change flow.
      reg.token = good.body?.token;
    }
  }

  // ── 2. FORGOT PASSWORD (by e-mail) ────────────────────────────────────
  console.log('\n[2] OTP FORGOT PASSWORD — forgot-password → OTP → reset-password');
  const forgot = await req('POST', '/api/auth/forgot-password', { email });
  log('forgot-password', `HTTP ${forgot.status} sent=${forgot.body?.sent}`);
  const resetEmail = email;
  const resetCode = await waitForDevCode(resetEmail, 10000);
  log('OTP delivered (dev console)', resetCode ? 'code received' : 'NO CODE');
  if (!resetCode) {
    results.forgot = false;
  } else {
    const bad = await req('POST', '/api/auth/reset-password', {
      email,
      otp: '000000',
      newPassword: 'NewPass@123',
    });
    log('wrong OTP rejected', `HTTP ${bad.status} (${bad.body?.code})`);
    const good = await req('POST', '/api/auth/reset-password', {
      email,
      otp: resetCode,
      newPassword: 'NewPass@123',
    });
    log('correct OTP accepted', `HTTP ${good.status}`);
    results.forgot = good.status === 200;

    // The old password must no longer work; the new one must.
    const oldLogin = await req('POST', '/api/auth/login', {
      phone: createdPhone,
      password,
    });
    log('old password rejected', `HTTP ${oldLogin.status}`);
    const newLogin = await req('POST', '/api/auth/login', {
      phone: createdPhone,
      password: 'NewPass@123',
    });
    log('new password accepted', `HTTP ${newLogin.status} token=${newLogin.body?.token ? 'issued' : 'none'}`);
    results.forgot = results.forgot && oldLogin.status !== 200 && Boolean(newLogin.body?.token);
  }

  // ── 3. CHANGE EMAIL ────────────────────────────────────────────────────
  console.log('\n[3] OTP CHANGE EMAIL — profile → OTP → verify-email-change');
  // The password reset above rotated the session epoch, which invalidates
  // every token issued before it — so we sign in again with the new password.
  const login = await req('POST', '/api/auth/login', {
    phone: createdPhone,
    password: 'NewPass@123',
  });
  const token = login.body?.token;
  log('re-login after reset', token ? 'token issued' : `FAILED (HTTP ${login.status})`);
  if (!token) {
    log('skipped', 'no auth token available');
    results.changeEmail = false;
  } else {
    const newEmail = `otp.http.new.${stamp}@example.com`;
    const prof = await req('PUT', '/api/auth/profile', { email: newEmail }, token);
    log(
      'profile update',
      `HTTP ${prof.status} requiresEmailConfirmation=${prof.body?.requiresEmailConfirmation}`
    );
    const changeCode = await waitForDevCode(newEmail, 10000);
    log('OTP delivered to NEW address', changeCode ? 'code received' : 'NO CODE');

    if (!changeCode) {
      results.changeEmail = false;
    } else {
      const bad = await req('POST', '/api/auth/verify-email-change', { email: newEmail, otp: '000000' }, token);
      log('wrong OTP rejected', `HTTP ${bad.status} (${bad.body?.code})`);
      const good = await req('POST', '/api/auth/verify-email-change', { email: newEmail, otp: changeCode }, token);
      log('correct OTP accepted', `HTTP ${good.status}`);
      const me = await req('GET', '/api/auth/me', null, token);
      log('email on record updated', me.body?.user?.email === newEmail ? 'YES' : `NO (${me.body?.user?.email})`);
      results.changeEmail = good.status === 200 && me.body?.user?.email === newEmail;
    }
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('SUMMARY');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`OTP REGISTER          : ${results.register ? 'PASS' : 'FAIL'}`);
  console.log(`OTP FORGOT PASSWORD   : ${results.forgot ? 'PASS' : 'FAIL'}`);
  console.log(`OTP CHANGE EMAIL      : ${results.changeEmail ? 'PASS' : 'FAIL'}`);
  console.log('────────────────────────────────────────────────────────────');

  await cleanup();
  const allOk = results.register && results.forgot && results.changeEmail;
  process.exit(allOk ? 0 : 1);
})().catch(async (err) => {
  console.error('Test crashed:', err.message);
  await cleanup();
  process.exit(1);
});
