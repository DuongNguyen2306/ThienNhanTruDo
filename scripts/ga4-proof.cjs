/**
 * BẰNG CHỨNG GA4 — đếm page_view chính xác cho: lần tải đầu, SPA nav, Back/Forward.
 * Bắt cả GET và POST /g/collect, đọc cả request body.
 * Không tính scroll / session_start / traffic_source là page_view.
 *
 * Dùng: node scripts/ga4-proof.cjs <url> [<url> ...]
 */
const { chromium } = require('playwright-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

function parseHit(url, body) {
  const out = { tid: '', en: '', dp: '', dl: '', ep: {}, et: '' }
  const merged = new URLSearchParams()
  try {
    new URL(url).searchParams.forEach((v, k) => merged.set(k, v))
  } catch (e) {}
  if (body) {
    try {
      new URLSearchParams(body).forEach((v, k) => merged.set(k, v))
    } catch (e) {}
  }
  merged.forEach((v, k) => {
    if (k === 'tid') out.tid = v
    if (k === 'en') out.en = v
    if (k === 'dp') out.dp = decodeURIComponent(v)
    if (k === 'dl') out.dl = decodeURIComponent(v)
    if (k === '_et') out.et = v
    if (k.startsWith('ep.')) out.ep[k.slice(3)] = decodeURIComponent(v)
  })
  return out
}

async function main() {
  const urls = process.argv.slice(2)
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  let allPassed = true

  for (const target of urls) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const hits = []
    const statuses = []
    page.on('request', (r) => {
      if (r.url().includes('/g/collect')) {
        hits.push({ url: r.url(), body: r.postData() || '' })
      }
    })
    page.on('response', (r) => {
      if (r.url().includes('/g/collect')) statuses.push(r.status())
    })

    const mark = () => hits.length
    const wait = (ms) => page.waitForTimeout(ms)
    const countPv = () => {
      let n = 0
      for (const h of hits) {
        const merged = new URLSearchParams()
        try {
          new URL(h.url).searchParams.forEach((v, k) => merged.set(k, v))
        } catch (e) {}
        if (h.body) {
          try {
            new URLSearchParams(h.body).forEach((v, k) => merged.set(k, v))
          } catch (e) {}
        }
        if (merged.get('en') === 'page_view') n++
      }
      return n
    }

    // ── TEST 1: lần tải đầu ──────────────────────────────────────────
    await page.goto(target, { waitUntil: 'load', timeout: 45000 })
    await wait(7000)
    const pvAfterLoad = countPv()

    // ── TEST 2: điều hướng SPA ───────────────────────────────────────
    const link = await page.$('a[href="/pricing"]')
    if (link) await link.click()
    await wait(7000)
    const pvAfterSpa = countPv()

    // ── TEST 3: Back ─────────────────────────────────────────────────
    await page.goBack()
    await wait(7000)
    const pvAfterBack = countPv()

    // ── TEST 4: Forward ──────────────────────────────────────────────
    await page.goForward()
    await wait(7000)
    const pvAfterForward = countPv()

    const parsed = hits.map((h) => parseHit(h.url, h.body))
    const pv = parsed.filter((h) => h.en === 'page_view')

    console.log('\n' + '='.repeat(80))
    console.log('URL:', target)
    console.log('='.repeat(80))
    console.log('HTTP status codes        :', statuses.join(', ') || '(none)')
    console.log('--- SO PAGE_VIEW THEO TUNG BUOC ---')
    console.log('  1) Tai trang dau        : ' + pvAfterLoad + ' page_view')
    console.log('  2) Sau SPA nav          : ' + (pvAfterSpa - pvAfterLoad) + ' page_view moi')
    console.log('  3) Sau Back             : ' + (pvAfterBack - pvAfterSpa) + ' page_view moi')
    console.log('  4) Sau Forward          : ' + (pvAfterForward - pvAfterBack) + ' page_view moi')
    console.log('TONG page_view            : ' + pv.length)
    console.log('--- CHI TIET TUNG PAGE_VIEW ---')
    pv.forEach((h, i) => {
      console.log('  [pv #' + (i + 1) + '] tid=' + h.tid + ' _et=' + (h.et || '-'))
      console.log('        dp = ' + h.dp)
      console.log('        dl = ' + h.dl)
      console.log('        ep = ' + JSON.stringify(h.ep))
    })
    const others = parsed.filter((h) => h.en && h.en !== 'page_view')
    console.log('events KHAC (khong phai page_view):', others.map((h) => h.en).join(', ') || '(khong co)')

    // Đánh giá
    const load1 = pvAfterLoad === 1
    const spaOk = pvAfterSpa - pvAfterLoad === 1
    const backOk = pvAfterBack - pvAfterSpa === 1
    const fwdOk = pvAfterForward - pvAfterBack === 1
    const utmOk = pv[0] && /utm_source=(facebook|threads)/.test(pv[0].dp || '')
    console.log('--- KET QUA ---')
    console.log('  Tai trang dau = 1 pv     : ' + (load1 ? 'PASS' : 'FAIL'))
    console.log('  SPA nav = 1 pv moi URL    : ' + (spaOk ? 'PASS' : 'FAIL'))
    console.log('  Back = 1 pv moi URL       : ' + (backOk ? 'PASS' : 'FAIL'))
    console.log('  Forward = 1 pv moi URL    : ' + (fwdOk ? 'PASS' : 'FAIL'))
    console.log('  UTM facebook/threads giu  : ' + (utmOk ? 'PASS' : 'FAIL'))
    if (!(load1 && spaOk && backOk && fwdOk && utmOk)) allPassed = false

    await context.close()
  }

  await browser.close()
  console.log('\n' + (allPassed ? 'TAT CA TESTS PASS' : 'CO TESTS FAIL'))
  process.exit(allPassed ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
