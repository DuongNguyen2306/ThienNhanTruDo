/**
 * Kiểm tra rò rỉ PII từ GA4 — KHÔNG in giá trị nhạy cảm ra log.
 * Chỉ in TÊN tham số bị phát hiện, không in value.
 *
 * Dùng: node scripts/ga4-pii.cjs <url>
 */
const { chromium } = require('playwright-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// Danh sách "tên" tham số nhạy cảm + các giá trị test cố định (chỉ dùng để so khớp).
const SENSITIVE_KEYS = [
  'email', 'e_mail', 'mail', 'password', 'pass', 'pwd', 'otp', 'code',
  'token', 'jwt', 'secret', 'phone', 'mobile', 'tel', 'sdt', 'cvv',
  'card', 'mat_khau', 'id_number', 'idnumber', 'cccd',
]

// Giá trị canary — chúng ta tự đặt, KHÔNG phải dữ liệu người dùng thật.
const CANARIES = {
  'email@example-fake.test': 'email-canary',
  '0912345678': 'phone-canary',
  '999888': 'otp-canary',
  'canary-token-xyz': 'token-canary',
  'fake-secret-abc': 'secret-canary',
}

async function main() {
  const target = process.argv[2]
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  const hits = []
  page.on('request', (r) => {
    if (r.url().includes('/g/collect')) {
      hits.push(r.url() + (r.postData() ? ' || BODY: ' + r.postData() : ''))
    }
  })

  const q = new URLSearchParams({
    utm_source: 'facebook',
    utm_medium: 'organic_social',
    utm_campaign: 'ga4_pii_check',
    email: 'email@example-fake.test',
    phone: '0912345678',
    otp: '999888',
    token: 'canary-token-xyz',
    password: 'fake-secret-abc',
  })

  const url = target + (target.includes('?') ? '&' : '?') + q.toString()
  await page.goto(url, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(9000)

  // Điều hướng SPA để kích hoạt thêm event tự động
  const link = await page.$('a[href="/pricing"]')
  if (link) await link.click()
  await page.waitForTimeout(7000)

  const blob = decodeURIComponent(hits.join('\n'))
  const lower = blob.toLowerCase()

  console.log('=== TONG SO HIT /g/collect:', hits.length, '===')

  // 1) Canary values
  const leakedCanaries = []
  for (const [value, label] of Object.entries(CANARIES)) {
    if (lower.includes(value.toLowerCase())) leakedCanaries.push(label)
  }
  console.log('1) Canary values (gia tri test) bi gui len Google:',
    leakedCanaries.length ? leakedCanaries.join(', ') : 'KHONG CO - PASS')

  // 2) Ten tham so nhay cam xuat hien
  const leakedKeys = SENSITIVE_KEYS.filter((k) => lower.includes(k))
  console.log('2) Ten tham so nhay cam xuat hien:', leakedKeys.length ? leakedKeys.join(', ') : 'KHONG CO - PASS')

  // 3) Kiem tra dl / page_location / referrer
  const dlMatch = blob.match(/dl=([^&|\s]+)/g) || []
  const dlClean = dlMatch.map((s) => s.replace(/^dl=/, '')).filter(Boolean)
  const dlHasSensitive = dlClean.filter((d) => SENSITIVE_KEYS.some((k) => d.toLowerCase().includes(k)))
  console.log('3) dl/page_location co tham so nhay cam:', dlHasSensitive.length ? 'CO - FAIL' : 'KHONG - PASS')

  const refMatch = blob.match(/dr=([^&|\s]+)/g) || []
  const refHasSensitive = refMatch.filter((d) => SENSITIVE_KEYS.some((k) => d.toLowerCase().includes(k)))
  console.log('4) dr/referrer co tham so nhay cam:', refHasSensitive.length ? 'CO - FAIL' : 'KHONG - PASS')

  // 5) Danh sach event gui di (chi ten)
  const events = [...blob.matchAll(/en=([a-z_]+)/g)].map((m) => m[1])
  const unique = [...new Set(events)]
  console.log('5) Cac event da gui:', unique.join(', '))

  const pass = leakedCanaries.length === 0 && leakedKeys.length === 0 && dlHasSensitive.length === 0 && refHasSensitive.length === 0
  console.log('\nKET LUAN PII:', pass ? 'PASS - khong ro PII' : 'FAIL')
  await browser.close()
  process.exit(pass ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
