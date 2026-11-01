/**
 * Set GA4 credentials as Vercel Secret env vars (production + preview).
 *
 * - Reads the service account JSON locally.
 * - Pipes values to `vercel env add` via STDIN so the private key is never
 *   passed as a command-line argument (would land in shell history / logs).
 * - NEVER prints the private key or the email.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = process.env.VERCEL_PROJECT || 'thien-nhan-tru-do';
const ENVS = 'production,preview';

const saPath = path.resolve(__dirname, '..', 'secrets', 'ga4-service-account.json');
const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

if (!sa.client_email || !sa.private_key) {
  console.error('Service account JSON khong hop le (thieu client_email / private_key).');
  process.exit(1);
}

function resolveVercelBin() {
  // Ưu tiên: entry point Node của CLI trong npm cache (npx).
  // Gọi trực tiếp file JS để truyền được STDIN (`.cmd` không nhận pipe).
  const cacheRoot = path.join(
    process.env.LOCALAPPDATA || '',
    'npm-cache',
    '_npx'
  );
  if (fs.existsSync(cacheRoot)) {
    for (const dir of fs.readdirSync(cacheRoot)) {
      const entry = path.join(cacheRoot, dir, 'node_modules', 'vercel', 'dist', 'vc.js');
      if (fs.existsSync(entry)) return { cmd: process.execPath, args: [entry] };
    }
  }
  return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vercel'] };
}

function addVar(name, value) {
  console.log(`\n=== ${name} ===`);
  console.log('  do dai value:', value.length, 'ky tu');
  const { cmd, args } = resolveVercelBin();
  try {
    const out = execFileSync(
      cmd,
      [
        ...args,
        'env', 'add', name,
        '--sensitive',
        '--environment', ENVS,
        '--force',
        '--project', PROJECT,
      ],
      { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    console.log('  OK');
    const line = String(out).split('\n').filter((l) => /added|created|environment/i.test(l));
    if (line.length) console.log('  ' + line[line.length - 1].trim());
  } catch (e) {
    console.error('  LOI:', (e.stderr || e.stdout || e.message).toString().slice(0, 300));
    process.exitCode = 1;
  }
}

addVar('GA4_CLIENT_EMAIL', sa.client_email);
addVar('GA4_PRIVATE_KEY', sa.private_key);
addVar('GA4_PROPERTY_ID', '560770118');

console.log('\nHoan tat. KHONG commit file nay.');
