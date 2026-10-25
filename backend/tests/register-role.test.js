/**
 * Register-role test suite.
 *
 * Verifies that POST /api/auth/register ALWAYS creates a TENANT account,
 * whatever role the client sends (tenant / seller / manager / admin).
 *
 * The test NEVER touches the shared database: the Prisma client and the
 * e-mail helper are stubbed in the require cache before the auth router is
 * loaded, so no real user, OTP or e-mail is ever created.
 *
 * Run:  node backend/tests/register-role.test.js
 */

const assert = require('assert');
const path = require('path');

const BACKEND_SRC = path.resolve(__dirname, '..', 'src');

// ── Stub the Prisma client ────────────────────────────────────────────────
const createdUsers = [];
const prismaStub = {
  user: {
    findFirst: async () => null, // no existing user → registration proceeds
    create: async ({ data }) => {
      const user = { id: 'stub-user-id', ...data };
      createdUsers.push(user);
      return user;
    },
  },
  sellerProfile: {
    create: async () => {
      throw new Error('register must NOT create a seller profile');
    },
  },
  auditLog: {
    create: async () => ({}),
  },
};

const dbPath = require.resolve(path.join(BACKEND_SRC, 'db', 'index.js'));
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: prismaStub,
};

// ── Stub the e-mail helper (no SMTP traffic) ──────────────────────────────
const emailHelperPath = require.resolve(path.join(BACKEND_SRC, 'helpers', 'emailHelper.js'));
require.cache[emailHelperPath] = {
  id: emailHelperPath,
  filename: emailHelperPath,
  loaded: true,
  exports: {
    sendOtpEmail: async () => ({ ok: true, id: 'stub-email' }),
    sendWelcomeEmail: async () => ({ ok: true, id: 'stub-email' }),
  },
};

// ── Stub the OTP helper (no OTP record is persisted) ──────────────────────
const otpHelperPath = require.resolve(path.join(BACKEND_SRC, 'helpers', 'otpHelper.js'));
require.cache[otpHelperPath] = {
  id: otpHelperPath,
  filename: otpHelperPath,
  loaded: true,
  exports: {
    issueOtp: async () => ({
      ok: true,
      code: '123456',
      id: 'stub-otp',
      expiresAt: new Date(Date.now() + 600000),
      resendAvailableIn: 60,
    }),
    verifyOtp: async () => ({ ok: true, payload: null }),
    verifySessionEpoch: async () => true,
    getSessionEpoch: async () => null,
    rotateSessionEpoch: async () => null,
  },
};

// ── Stub the e-mail verification helper (no marker is written) ────────────
const emailVerificationPath = require.resolve(
  path.join(BACKEND_SRC, 'helpers', 'emailVerificationHelper.js')
);
require.cache[emailVerificationPath] = {
  id: emailVerificationPath,
  filename: emailVerificationPath,
  loaded: true,
  exports: {
    markUnverified: async () => true,
    markVerified: async () => true,
    clearVerified: async () => true,
    isEmailVerified: async () => true,
    getPendingEmail: async () => null,
    isNewAccount: () => true,
    LAUNCH_DATE: new Date(),
  },
};

// ── Stub the audit helper ─────────────────────────────────────────────────
const auditHelperPath = require.resolve(path.join(BACKEND_SRC, 'helpers', 'auditHelper.js'));
require.cache[auditHelperPath] = {
  id: auditHelperPath,
  filename: auditHelperPath,
  loaded: true,
  exports: { createAuditLog: async () => ({}), },
};

const express = require('express');
const authRouter = require(path.join(BACKEND_SRC, 'routes', 'auth.js'));

// ── Tiny in-process HTTP harness ──────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use((err, req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || 'Lỗi server' });
});

const server = app.listen(0);
const { port } = server.address();

function post(path, body) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
}

const tests = [];
const test = (name, run) => tests.push({ name, run });

const validBody = {
  fullName: 'Nguyễn Văn A',
  phone: '0903123456',
  email: 'nguyen.van.a@example.com',
  password: 'Matkhau123',
};

// ───────────────────────────────────────────────────────────────────────────
// Register always creates a TENANT
// ───────────────────────────────────────────────────────────────────────────

test('Register: no role in the body → the account is a tenant', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', validBody);
  assert.strictEqual(res.status, 201, `expected 201, got ${res.status}`);
  assert.strictEqual(createdUsers.length, 1);
  assert.strictEqual(createdUsers[0].role, 'tenant');
  assert.strictEqual(res.body.user.role, 'tenant');
});

test('Register: role=seller is IGNORED → the account is still a tenant', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', { ...validBody, role: 'seller' });
  assert.strictEqual(res.status, 201, `expected 201, got ${res.status}`);
  assert.strictEqual(createdUsers[0].role, 'tenant');
  assert.strictEqual(res.body.user.role, 'tenant');
});

test('Register: role=admin is IGNORED → the account is still a tenant', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', { ...validBody, role: 'admin' });
  assert.strictEqual(res.status, 201, `expected 201, got ${res.status}`);
  assert.strictEqual(createdUsers[0].role, 'tenant');
  assert.strictEqual(res.body.user.role, 'tenant');
});

test('Register: role=manager is IGNORED → the account is still a tenant', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', { ...validBody, role: 'manager' });
  assert.strictEqual(res.status, 201, `expected 201, got ${res.status}`);
  assert.strictEqual(createdUsers[0].role, 'tenant');
  assert.strictEqual(res.body.user.role, 'tenant');
});

test('Register: the OTP is still issued (e-mail verification still works)', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', validBody);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.requiresVerification, true, 'the account must require verification');
  assert.ok(res.body.resendAvailableIn > 0, 'a resend cooldown must be advertised');
  // No token is issued before the e-mail is proven.
  assert.strictEqual(res.body.token, undefined, 'no token may be issued before verification');
});

test('Register: an invalid e-mail is still rejected', async () => {
  createdUsers.length = 0;
  const res = await post('/api/auth/register', { ...validBody, email: 'not-an-email' });
  assert.strictEqual(res.status, 400, `expected 400, got ${res.status}`);
  assert.strictEqual(createdUsers.length, 0, 'no account may be created');
});

// ───────────────────────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🧪 THIÊN NHÃN — REGISTER ROLE TESTS\n');
  console.log('='.repeat(64));

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.run();
      console.log(`✅ PASS  ${t.name}`);
      passed += 1;
    } catch (err) {
      console.log(`❌ FAIL  ${t.name}`);
      console.log(`        ${err.message}`);
      failed += 1;
    }
  }

  console.log('='.repeat(64));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  server.close();
  // The rate limiter keeps an interval alive, so exit explicitly.
  process.exit(failed > 0 ? 1 : 0);
})();
