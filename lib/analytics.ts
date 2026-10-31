/**
 * GA4 helper — an toàn, KHÔNG chứa PII.
 *
 * Nguyên tắc bảo mật:
 *  - Không bao giờ gửi email / số điện thoại / OTP / mật khẩu / token lên GA4.
 *  - Mọi query param nhạy cảm bị loại bỏ trước khi gửi `page_location` / `page_path`.
 *  - Chỉ gửi các tham số attribution (utm_*, fbclid, gclid, ...) cần cho báo cáo nguồn traffic.
 *
 * Lưu ý về cấu hình:
 *  - Measurement ID đọc từ `NEXT_PUBLIC_GA_MEASUREMENT_ID` (inline lúc build — đổi cần rebuild).
 *  - Cờ bật/tắt đọc ở RUNTIME từ `GA_TRACKING_ENABLED` (không NEXT_PUBLIC) và được
 *    truyền xuống client qua prop, nên `.env.local` ở máy dev KHÔNG thể vô hiệu hoá
 *    tracker trên production build.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''

/** Params chứa dữ liệu cá nhân / bí mật — tuyệt đối không gửi lên GA4. */
const SENSITIVE_PARAM_RE =
  /(^|[^a-z])(email|e_?mail|mail|password|pass|pwd|otp|code|token|jwt|secret|phone|mobile|tel|sdt|cvv|card|mat_khau)([^a-z]|$)/i

/** Params attribution được phép gửi (giúp đọc nguồn Facebook / Threads / Google). */
export const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'ttclid',
  'twclid',
  'igshid',
] as const

export type TrafficSource =
  | 'facebook'
  | 'threads'
  | 'instagram'
  | 'google'
  | 'youtube'
  | 'tiktok'
  | 'zalo'
  | 'organic'
  | 'referral'
  | 'direct'

export type TrafficInfo = {
  source: TrafficSource
  medium: string
  campaign: string
  clickId?: string
  referrerHost: string
}

/**
 * Quyết định bật tracker (chạy trên server trong layout).
 *  - `GA_TRACKING_ENABLED=true`  -> ép BẬT (dùng để test trên localhost).
 *  - `GA_TRACKING_ENABLED=false` -> ép TẮT.
 *  - mặc định: bật ở production, tắt ở localhost (quyết định cuối cùng lại lặp ở client).
 */
export function resolveGaEnabled(): boolean {
  if (!GA_MEASUREMENT_ID) return false
  const forced = process.env.GA_TRACKING_ENABLED
  if (forced === 'true') return true
  if (forced === 'false') return false
  return process.env.NODE_ENV === 'production'
}

/**
 * Cho phép tracker chạy trên localhost khi bị ép bật (`GA_TRACKING_ENABLED=true`).
 * Dùng để kiểm thử trên máy dev mà không làm nhiễu dữ liệu production.
 */
export function allowGaOnLocalhost(): boolean {
  return process.env.GA_TRACKING_ENABLED === 'true'
}

/** Địa chỉ localhost — không bao giờ gửi dữ liệu lên GA4 production. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0'])

/** Kiểm tra phía client (hostname thật của người dùng). */
export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase())
}

/** Xóa các query param nhạy cảm khỏi chuỗi query (giữ nguyên param attribution). */
export function sanitizeSearch(search: string): string {
  if (!search) return ''
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return ''
  }
  const kept = new URLSearchParams()
  params.forEach((value, key) => {
    if (SENSITIVE_PARAM_RE.test(key)) return
    kept.append(key, value)
  })
  const result = kept.toString()
  return result ? `?${result}` : ''
}

/** Lấy đúng các tham số attribution (không PII) từ query string. */
export function extractAttribution(search: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!search) return out
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return out
  }
  params.forEach((value, key) => {
    if ((ATTRIBUTION_PARAMS as readonly string[]).includes(key)) out[key] = value
  })
  return out
}

const HOST_MAP: Array<{ match: RegExp; source: TrafficSource }> = [
  { match: /(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)m\.facebook\.com$/i, source: 'facebook' },
  { match: /(^|\.)threads\.net$/i, source: 'threads' },
  { match: /(^|\.)instagram\.com$/i, source: 'instagram' },
  { match: /(^|\.)google\.[a-z.]+$/i, source: 'google' },
  { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, source: 'youtube' },
  { match: /(^|\.)tiktok\.com$/i, source: 'tiktok' },
  { match: /(^|\.)zalo\.me$/i, source: 'zalo' },
]

/** Suy ra nguồn traffic từ UTM / click id / referrer. */
export function deriveTrafficInfo(search: string, referrer: string): TrafficInfo {
  const attribution = extractAttribution(search)
  const params = new URLSearchParams(search)
  const utmSource = (params.get('utm_source') || '').toLowerCase()
  const utmMedium = (params.get('utm_medium') || '').toLowerCase()
  const campaign = params.get('utm_campaign') || ''

  let referrerHost = ''
  if (referrer) {
    try {
      referrerHost = new URL(referrer).hostname.replace(/^www\./i, '')
    } catch {
      referrerHost = ''
    }
  }

  // 1) Click ID của Facebook (fbclid) — nguồn đáng tin cậy nhất
  if (attribution.fbclid) {
    return {
      source: 'facebook',
      medium: utmMedium || 'cpc',
      campaign,
      clickId: attribution.fbclid,
      referrerHost,
    }
  }

  // 2) Mạng xã hội / search engine qua utm_source
  if (utmSource) {
    if (/facebook|fb\b/.test(utmSource)) {
      return { source: 'facebook', medium: utmMedium || 'cpc', campaign, referrerHost }
    }
    if (/thread/.test(utmSource)) {
      return { source: 'threads', medium: utmMedium || 'social', campaign, referrerHost }
    }
    if (/instagram|ig\b/.test(utmSource)) {
      return { source: 'instagram', medium: utmMedium || 'social', campaign, referrerHost }
    }
    if (/google/.test(utmSource)) {
      return { source: 'google', medium: utmMedium || 'cpc', campaign, referrerHost }
    }
    if (/youtube/.test(utmSource)) {
      return { source: 'youtube', medium: utmMedium || 'social', campaign, referrerHost }
    }
    if (/tiktok/.test(utmSource)) {
      return { source: 'tiktok', medium: utmMedium || 'social', campaign, referrerHost }
    }
    if (/zalo/.test(utmSource)) {
      return { source: 'zalo', medium: utmMedium || 'social', campaign, referrerHost }
    }
    return {
      source: 'referral',
      medium: utmMedium || utmSource,
      campaign,
      clickId: attribution.gclid,
      referrerHost,
    }
  }

  // 3) Google click id
  if (attribution.gclid || attribution.gbraid || attribution.wbraid) {
    return {
      source: 'google',
      medium: 'cpc',
      campaign,
      clickId: attribution.gclid || attribution.gbraid || attribution.wbraid,
      referrerHost,
    }
  }

  // 4) Referrer (chuyển trang trực tiếp từ Facebook / Threads / Google)
  if (referrerHost) {
    for (const { match, source } of HOST_MAP) {
      if (match.test(referrerHost)) {
        return { source, medium: 'referral', campaign, referrerHost }
      }
    }
    return { source: 'referral', medium: 'referral', campaign, referrerHost }
  }

  return { source: 'direct', medium: '(none)', campaign, referrerHost }
}

/**
 * Làm sạch từ khoá tìm kiếm trước khi gửi lên GA4.
 * Người dùng có thể gõ email / số điện thoại → loại bỏ hoàn toàn nếu khớp mẫu PII.
 */
export function safeSearchTerm(term: string): string {
  const value = (term || '').trim()
  if (!value) return '(trống)'
  const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(value)
  const hasPhone = /(?:\d[ \-.]?){9,}/.test(value)
  if (hasEmail || hasPhone) return '(ẩn danh)'
  return value.slice(0, 60)
}

/** Gửi event lên GA4 qua dataLayer (queue được gtag.js xử lý). */
export function gtagEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  const w = window as typeof window & {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
  if (typeof w.gtag === 'function') {
    w.gtag('event', name, params)
    return
  }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(['event', name, params])
}

/** Cờ bật tracker, do <Ga4Provider /> thiết lập lúc khởi tạo. */
let trackerEnabled = false

export function setTrackerEnabled(value: boolean): void {
  trackerEnabled = value
}

export function isTrackerEnabled(): boolean {
  return trackerEnabled
}

/** API public để các page/component gọi event (search, contact, booking...). */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (!trackerEnabled) return
  gtagEvent(name, params)
}
