/**
 * Kiểm thử endpoint Admin GA4:
 *  1. Không token  -> phải bị 401
 *  2. Token không phải admin -> phải bị 403
 *  3. Admin token -> phải trả dữ liệu thật
 *
 * Dùng: node scripts/test-analytics-endpoint.js
 * Không in token ra log.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const BASE = process.env.API_BASE_URL || 'http://localhost:3005';

async function call(label, token, url) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    console.log(`\n--- ${label} ---`);
    console.log('  status:', res.status);
    if (typeof body === 'object' && body !== null) {
      if (body.error) console.log('  error :', body.error, body.code ? `(${body.code})` : '');
      if (body.success && body.data) {
        console.log('  data.period     :', body.data.period, '|', body.data.periodLabel);
        console.log('  data.totals     :', JSON.stringify(body.data.totals));
        console.log('  data.sources    :');
        for (const s of body.data.sources || []) {
          console.log(`      ${s.label.padEnd(22)} sessions=${s.sessions} activeUsers=${s.activeUsers}`);
          for (const b of (s.breakdown || []).slice(0, 4)) {
            console.log(`         - ${b.sourceMedium}  sessions=${b.sessions} activeUsers=${b.activeUsers}`);
          }
        }
        console.log('  data.note       :', body.data.note);
      }
      if (body.success && body.data && body.data.window) {
        console.log('  realtime.window :', body.data.window);
        console.log('  realtime.active :', body.data.activeUsers);
        console.log('  realtime.events :', body.data.eventCount);
        console.log('  realtime.countries:', JSON.stringify(body.data.countries));
      }
      // Shape phẳng (hiện tại) — backend trả thẳng payload.
      if (body.period) {
        console.log('  period          :', body.period, '|', body.periodLabel);
        console.log('  totals          :', JSON.stringify(body.totals));
        console.log('  sources         :');
        for (const s of body.sources || []) {
          console.log(`      ${s.label.padEnd(22)} sessions=${s.sessions} activeUsers=${s.activeUsers}`);
          for (const b of (s.breakdown || []).slice(0, 4)) {
            console.log(`         - ${b.sourceMedium}  sessions=${b.sessions} activeUsers=${b.activeUsers}`);
          }
        }
      }
      if (body.window) {
        console.log('  realtime.window :', body.window);
        console.log('  realtime.active :', body.activeUsers);
        console.log('  realtime.events :', body.eventCount);
        console.log('  realtime.countries:', JSON.stringify(body.countries));
      }
    } else {
      console.log('  body  :', String(body).slice(0, 160));
    }
    return res.status;
  } catch (e) {
    console.log(`\n--- ${label} ---`);
    console.log('  ERROR:', e.message);
    return 0;
  }
}

async function main() {
  console.log('BASE:', BASE);

  await call('1) Khong token', null, `${BASE}/api/admin/analytics/traffic?period=7d`);
  await call('2) Token gia (khong phai admin)', 'not-a-real-token', `${BASE}/api/admin/analytics/traffic?period=7d`);
  await call('3) Realtime, khong token', null, `${BASE}/api/admin/analytics/realtime`);

  // Đăng nhập bằng tài khoản test (admin + tenant) do create-test-users.js tạo.
  const fs = require('fs');
  const usersFile = path.resolve(__dirname, '.ga4-test-users.json');
  if (!fs.existsSync(usersFile)) {
    console.log('\n(Bo qua test token: chua chay create-test-users.js)');
    return;
  }
  const testUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

  async function login(identifier) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        phone: identifier,
        password: testUsers.password,
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, token: body.token, role: body.user?.role, error: body.error };
  }

  console.log('\n=== 4) Dang nhap tai khoan tenant ===');
  const t = await login(testUsers.tenant.email);
  console.log('  status:', t.status, '| role:', t.role || '-', t.error ? '| ' + t.error : '');
  await call('5) Tenant -> traffic (phai bi 403)', t.token, `${BASE}/api/admin/analytics/traffic?period=7d`);

  console.log('\n=== 6) Dang nhap tai khoan admin ===');
  const a = await login(testUsers.admin.email);
  console.log('  status:', a.status, '| role:', a.role || '-', a.error ? '| ' + a.error : '');
  if (!a.token) return;

  await call('7) Admin -> traffic?period=today', a.token, `${BASE}/api/admin/analytics/traffic?period=today`);
  await call('8) Admin -> traffic?period=7d', a.token, `${BASE}/api/admin/analytics/traffic?period=7d`);
  await call('9) Admin -> traffic?period=30d', a.token, `${BASE}/api/admin/analytics/traffic?period=30d`);
  await call('10) Admin -> realtime', a.token, `${BASE}/api/admin/analytics/realtime`);
}

main().catch((e) => { console.error('LOI:', e); process.exit(1); });
