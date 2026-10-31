import {
  deriveTrafficInfo,
  sanitizeSearch,
  extractAttribution,
  safeSearchTerm,
} from '../lib/analytics'

const cases: Array<[string, string, string, string]> = [
  // [label, search, referrer, expected source]
  ['fbclid', 'fbclid=abc123', '', 'facebook'],
  ['utm facebook', 'utm_source=facebook&utm_medium=cpc&utm_campaign=thu', '', 'facebook'],
  ['utm threads', 'utm_source=threads&utm_medium=social', '', 'threads'],
  ['utm instagram', 'utm_source=instagram', '', 'instagram'],
  ['utm google', 'utm_source=google&utm_medium=cpc', '', 'google'],
  ['gclid', 'gclid=xyz', '', 'google'],
  ['referrer facebook', '', 'https://l.facebook.com/l.php?u=1', 'facebook'],
  ['referrer threads', '', 'https://www.threads.net/@abc/post/1', 'threads'],
  ['referrer google', '', 'https://www.google.com/', 'google'],
  ['referrer other', '', 'https://example.com/x', 'referral'],
  ['direct', '', '', 'direct'],
]

let failed = 0
for (const [label, search, referrer, expected] of cases) {
  const info = deriveTrafficInfo(search, referrer)
  const ok = info.source === expected
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(18)} -> ${info.source} (${info.medium})` +
      (ok ? '' : `  EXPECTED ${expected}`),
  )
}

console.log('\n--- sanitizeSearch (loại PII) ---')
const s1 = sanitizeSearch('email=a%40b.com&phone=0912345678&token=xyz&fbclid=fb1&dist=Quan1')
console.log(s1)
if (s1.includes('email') || s1.includes('phone') || s1.includes('token')) {
  failed++
  console.log('FAIL: PII chưa được loại')
} else if (!s1.includes('fbclid') || !s1.includes('dist')) {
  failed++
  console.log('FAIL: mất param attribution')
} else {
  console.log('PASS: PII bị loại, attribution giữ nguyên')
}

console.log('\n--- extractAttribution ---')
console.log(extractAttribution('fbclid=fb1&gclid=g1&utm_source=threads&secret=abc'))

console.log('\n--- safeSearchTerm ---')
console.log(safeSearchTerm('Quận 1'))
console.log(safeSearchTerm('hoa.nguyen@gmail.com'))
console.log(safeSearchTerm('0912345678'))

console.log(`\n${failed === 0 ? 'ALL PASSED' : failed + ' FAILED'}`)
