/**
 * End-to-end check of the mobile app's API layer against the running
 * Express backend.
 *
 * `expo-secure-store` is a native module, so it is stubbed here: the check
 * runs in plain Node, not on a device.
 *
 * Usage: node scripts/check-api.js
 */
const Module = require('module');

// Stub the native SecureStore module.
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'expo-secure-store') {
    return {
      getItemAsync: async () => null,
      setItemAsync: async () => undefined,
      deleteItemAsync: async () => undefined,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { API_BASE_URL, ApiError, authApi } = require('../.api-check-build/src/lib/api-client.js');
const { isMobileRole } = require('../.api-check-build/src/types/auth.js');

async function main() {
  console.log(`API_BASE_URL = ${API_BASE_URL}\n`);

  let failures = 0;
  const check = (name, ok, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  };

  // 1. The backend must be reachable and reject a bad password.
  try {
    await authApi.login('0912345678', 'definitely-not-the-password');
    check('bad password rejected', false, 'the request unexpectedly succeeded');
  } catch (err) {
    const isApiError = err instanceof ApiError;
    check('bad password rejected', isApiError && err.status === 401, `status=${err.status}`);
    if (isApiError) {
      console.log(`      message: ${err.message}`);
      check('error message is Vietnamese', /[àáảãạăâđêôơư]/i.test(err.message));
    }
  }

  // 2. An unknown account must be rejected the same way.
  try {
    await authApi.login('thiennhan+no-such-user@example.com', 'definitely-not-the-password');
    check('unknown account rejected', false);
  } catch (err) {
    check('unknown account rejected', err instanceof ApiError && err.status === 401, `status=${err.status}`);
  }

  // 3. Real accounts from the backend seed must sign in and report a role.
  const ACCOUNTS = [
    { phone: '0901000001', password: '123456', role: 'tenant' },
    { phone: '0902000001', password: '123456', role: 'seller' },
    { phone: '0904000001', password: '123456', role: 'admin' },
  ];

  for (const account of ACCOUNTS) {
    try {
      const result = await authApi.login(account.phone, account.password);
      check(
        `login ${account.role}`,
        result.user.role === account.role && result.token.length > 0,
        `role=${result.user.role}`,
      );

      // 4. Only TENANT and SELLER may use the mobile app.
      const allowed = isMobileRole(result.user.role);
      check(
        `role ${account.role} mobile access`,
        allowed === (account.role === 'tenant' || account.role === 'seller'),
        `allowed=${allowed}`,
      );
    } catch (err) {
      check(`login ${account.role}`, false, `status=${err.status} ${err.message}`);
    }
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
