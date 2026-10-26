/**
 * Renders the sign-in screen in headless Chrome and dumps the visible text.
 *
 * The server-rendered HTML only shows the loading state, because the
 * session check is asynchronous. This script lets the client-side bundle
 * run, then reads the DOM that the app actually produced.
 *
 * Usage: node scripts/check-render-browser.js [baseUrl]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8099';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-verify-'));

  try {
    const stdout = execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + userDataDir,
        '--virtual-time-budget=20000',
        '--dump-dom',
        BASE + '/dang-nhap',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 120000 },
    );
    return stdout;
  } catch (err) {
    if (err.stdout) return err.stdout;
    throw err;
  } finally {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

function main() {
  const dom = run();

  if (!dom) {
    console.error('Chrome produced no DOM output');
    process.exit(1);
  }

  const text = dom
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(text));

  console.log('=== visible text ===');
  for (const t of unique) console.log(' -', t);

  const CHECKS = [
    ['brand title', 'THIÊN NHÃN TRÚ ĐỒ'],
    ['sign-in heading', 'Đăng nhập'],
    ['identifier label', 'Số điện thoại hoặc Email'],
    ['password label', 'Mật khẩu'],
    ['role hint', 'Người thuê'],
    ['role hint 2', 'Chủ trọ'],
  ];

  console.log('\n=== assertions ===');
  let failures = 0;
  for (const [name, needle] of CHECKS) {
    const found = unique.some((t) => t.includes(needle));
    if (!found) failures += 1;
    console.log((found ? 'PASS' : 'FAIL') + '  ' + name.padEnd(18) + ' ' + needle);
  }

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
  process.exit(failures === 0 ? 0 : 1);
}

main();
