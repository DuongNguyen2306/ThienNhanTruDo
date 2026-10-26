/**
 * Verify the API base URL resolution in `lib/api-config.ts` for the three
 * environments that matter.
 *
 * The real module is compiled on the fly so the ACTUAL logic is exercised
 * rather than a copy of it. Run with:
 *   node scripts/verify-api-config.js
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api-config.ts'), 'utf8');

const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadWith(env) {
  const module = { exports: {} };
  const fakeProcess = { env };
  // eslint-disable-next-line no-new-func
  const fn = new Function('exports', 'module', 'require', 'process', js);
  fn(module.exports, module, require, fakeProcess);
  return module.exports;
}

const cases = [
  {
    name: 'LOCAL DEV (.env.local → localhost:3005)',
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:3005', NODE_ENV: 'development' },
    expect: 'http://localhost:3005',
  },
  {
    name: 'LOCAL DEV (no env var → dev fallback)',
    env: { NODE_ENV: 'development' },
    expect: 'http://localhost:3005',
  },
  {
    name: 'PRODUCTION (env var set → used as-is)',
    env: {
      NEXT_PUBLIC_API_URL: 'https://thiennhantrudo-be.onrender.com',
      NODE_ENV: 'production',
    },
    expect: 'https://thiennhantrudo-be.onrender.com',
  },
  {
    name: 'PRODUCTION (trailing slash stripped)',
    env: { NEXT_PUBLIC_API_URL: 'https://api.example.com/', NODE_ENV: 'production' },
    expect: 'https://api.example.com',
  },
  {
    name: 'PRODUCTION (no env var → empty, NOT localhost)',
    env: { NODE_ENV: 'production' },
    expect: '',
  },
];

let failures = 0;
for (const c of cases) {
  const { API_BASE } = loadWith(c.env);
  const ok = API_BASE === c.expect;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  console.log(`        resolved = ${JSON.stringify(API_BASE)}`);
}

console.log('');
console.log(
  failures === 0
    ? 'ALL CONFIG CASES PASSED'
    : `${failures} CONFIG CASE(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
