'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  GA_MEASUREMENT_ID,
  deriveTrafficInfo,
  extractAttribution,
  isLocalHostname,
  sanitizeSearch,
  setTrackerEnabled,
} from '@/lib/analytics'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Dựng `page_location` ĐÃ LỌC PII.
 *
 * GA4 mặc định tự điền `dl` = `window.location.href` (URL thật). Nếu người dùng
 * mở trang có `?email=...&otp=...&token=...` thì PII sẽ bị gửi lên Google.
 * Hàm này loại bỏ toàn bộ query nhạy cảm trước khi gửi.
 */
function sanitizedLocation(): string {
  if (typeof window === 'undefined') return ''
  const { pathname, search, origin } = window.location
  return `${origin}${pathname}${sanitizeSearch(search)}`
}

/**
 * Sự kiện history change mà Enhanced Measurement của GA4 tự sinh.
 *
 * VÌ SAO PHẢI CHẶN:
 *  gtag.js tự đăng ký listener cho `pushState` / `replaceState` / `popstate`
 *  và đẩy event `gtm.historyChange-v2` vào `window.dataLayer`.
 *  Container GA4 (Enhanced Measurement) đang bật "Page changes based on
 *  browser history events", nên mỗi lần Next.js điều hướng SPA sẽ khiến
 *  GA4 tự bắn thêm 1 hit `page_view` (hit có `_et=963`).
 *  Tracker của ta lại bắn 1 hit nữa → DUPLICATE page_view.
 *
 *  Cách chặn: bọc `window.dataLayer.push` để loại bỏ object mang
 *  `event === 'gtm.historyChange-v2'` (và biến thể 'gtm.historyChange')
 *  trước khi gtag.js kịp xử lý. Sau khi chặn, chỉ còn MỘT nguồn gửi
 *  page_view là tracker của ta.
 */
const HISTORY_CHANGE_EVENTS = new Set(['gtm.historyChange-v2', 'gtm.historyChange'])

type PatchedPush = ((...args: unknown[]) => unknown) & { __gaHistoryFilter?: boolean }

/**
 * Cài bộ lọc history-change trên `window.dataLayer.push`.
 *
 * LƯU Ý THỨ TỰ: gtag.js ghi đè `dataLayer.push` ngay khi script được thực thi,
 * nên bộ lọc phải được cài SAU khi gtag.js đã nạp xong (script.onload),
 * nếu không sẽ bị gtag.js đè mất.
 */
function installHistoryChangeFilter(): void {
  const dl = window.dataLayer
  if (!dl) return

  const current = dl.push as PatchedPush
  if (!current || current.__gaHistoryFilter) return

  const filtered = function (this: unknown, ...args: unknown[]): unknown {
    const kept = args.filter((arg) => {
      if (!arg || typeof arg !== 'object' || Array.isArray(arg)) return true
      const event = (arg as { event?: unknown }).event
      return typeof event !== 'string' || !HISTORY_CHANGE_EVENTS.has(event)
    })
    if (kept.length === 0) return undefined
    // `this` phải là chính mảng dataLayer vì gtag.js đọc `this.length` bên trong.
    return current.apply(dl, kept as never)
  } as PatchedPush

  filtered.__gaHistoryFilter = true
  dl.push = filtered as never
}

/**
 * Bộ nạp GA4 — App Router.
 *
 * GHI CHÚ QUAN TRỌNG (đã kiểm chứng bằng network capture):
 *  `dataLayer.push(arguments)` là BẮT BUỘC. Nếu push một mảng thường
 *  (`push([...args])`) thì gtag.js KHÔNG nhận được lệnh và sẽ KHÔNG gửi
 *  bất kỳ hit nào tới Google — dataLayer vẫn đầy nhưng /g/collect không
 *  bao giờ được gọi. Đây là nguyên nhân gốc của bug "GA4 không gửi dữ liệu".
 *
 * Thứ tự chuẩn của Google:
 *  1. Khởi tạo dataLayer + định nghĩa gtag (push arguments).
 *  2. Nạp gtag.js.
 *  3. gtag('js', new Date()).
 *  4. gtag('config', ID, { send_page_view: false }).
 *  5. Tự bắn 'page_view' cho mỗi URL.
 *
 * Vì sao `send_page_view: false`?
 *  `gtag('config')` tự sinh 1 page_view cho lần tải đầu. Nếu ta bắn thêm
 *  → dữ liệu bị nhân đôi. Ta tắt auto rồi tự kiểm soát để có đúng 1
 *  page_view cho mỗi URL (kể cả điều hướng SPA).
 *
 * Quy tắc bảo mật: không bao giờ gửi PII. Query nhạy cảm bị lọc trước khi gửi.
 */
function Ga4Tracker({ enabled, allowLocalhost }: { enabled: boolean; allowLocalhost: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string>('')
  const sentFirstVisitRef = useRef(false)

  // ── Nạp gtag.js + cấu hình measurement (chỉ 1 lần) ────────────────
  useEffect(() => {
    if (!enabled || !GA_MEASUREMENT_ID) return

    // Chặn localhost (dev). Kiểm tra trong effect (chỉ chạy ở client)
    // để cờ không đổi → effect không bị cleanup giữa chừng.
    if (isLocalHostname(window.location.hostname) && !allowLocalhost) return

    window.dataLayer = window.dataLayer || []

    if (typeof window.gtag !== 'function') {
      // PHẢI push `arguments` (Arguments object), không phải mảng.
      // Dùng function thường (không rest params) vì khi có rest params,
      // `arguments` là unmapped arguments object.
      function gtag() {
        window.dataLayer!.push(arguments)
      }
      window.gtag = gtag
    }

    // (1) Nạp gtag.js trước
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.dataset.ga4Loader = 'true'
    document.head.appendChild(script)

    // (1b) Chặn auto page_view của Enhanced Measurement.
    //
    //  gtag.js GHI ĐÈ `window.dataLayer.push` ngay khi script chạy, nên bộ lọc
    //  phải được cài SAU khi gtag.js đã nạp xong, nếu không sẽ bị đè mất.
    //  Bộ lọc loại bỏ event `gtm.historyChange*` → GA4 không tự bắn page_view
    //  khi điều hướng SPA → chỉ còn tracker của ta gửi page_view.
    const installFilter = () => {
      if (!window.dataLayer) return
      installHistoryChangeFilter()
    }
    script.addEventListener('load', installFilter)
    // Ghi đè phòng trường hợp gtag.js nạp lại script (mạng chậm/cache).
    const retryTimers = [50, 300, 1000, 2500].map((ms) =>
      window.setTimeout(installFilter, ms),
    )

    // (2) Khởi tạo
    window.gtag('js', new Date())
    // (3) Cấu hình measurement — tắt auto page_view để tự kiểm soát.
    //  `page_location` khai báo ở đây để các hit tự động của GA4
    //  (session_start, session_end, ...) KHÔNG tự điền `dl` = URL thật
    //  (URL thật có thể chứa PII: email / sdt / otp / token).
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      page_location:
        typeof window !== 'undefined' ? sanitizedLocation() : undefined,
    })

    setTrackerEnabled(true)

    return () => {
      setTrackerEnabled(false)
      script.removeEventListener('load', installFilter)
      retryTimers.forEach((t) => window.clearTimeout(t))
      script.remove()
    }
  }, [enabled, allowLocalhost])

  // ── Bắn page_view đúng 1 lần cho mỗi URL (kể cả điều hướng SPA) ──
  useEffect(() => {
    if (!enabled || !GA_MEASUREMENT_ID) return
    if (!pathname) return

    const search = searchParams?.toString() ?? ''
    const safeSearch = sanitizeSearch(search)
    const fullPath = `${pathname}${safeSearch}`

    // Dedupe: cùng 1 URL chỉ bắn 1 lần.
    if (fullPath === lastPathRef.current) return
    lastPathRef.current = fullPath

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    const traffic = deriveTrafficInfo(search, referrer)
    const attribution = extractAttribution(search)

    const pageLocation = sanitizedLocation() || fullPath

    window.gtag?.('event', 'page_view', {
      page_path: fullPath,
      page_location: pageLocation,
      page_title: typeof document !== 'undefined' ? document.title : '',
      // Nguồn traffic đã chuẩn hoá (facebook / threads / google / organic ...)
      traffic_source: traffic.source,
      traffic_medium: traffic.medium,
      traffic_campaign: traffic.campaign,
      referrer_host: traffic.referrerHost,
      ...(traffic.clickId ? { click_id: traffic.clickId } : {}),
      ...attribution,
    })

    // Event riêng để dễ lọc trong GA4 Explore / Looker Studio
    // BẮT BUỘC khai báo `page_location` sạch: nếu không, gtag.js tự điền
    // `dl` = window.location.href (URL thật, có thể chứa PII như email/otp/token).
    window.gtag?.('event', 'traffic_source', {
      page_location: pageLocation,
      page_path: fullPath,
      traffic_source: traffic.source,
      traffic_medium: traffic.medium,
      traffic_campaign: traffic.campaign,
      referrer_host: traffic.referrerHost,
    })

    // Ghi nhận nguồn của phiên đầu tiên (đối chiếu session_start)
    if (!sentFirstVisitRef.current) {
      sentFirstVisitRef.current = true
      window.gtag?.('event', 'first_visit_source', {
        page_location: pageLocation,
        page_path: fullPath,
        session_traffic_source: traffic.source,
        session_traffic_medium: traffic.medium,
        session_traffic_campaign: traffic.campaign,
      })
    }
  }, [enabled, pathname, searchParams])

  return null
}

export function Ga4Provider({
  enabled,
  allowLocalhost,
}: {
  enabled: boolean
  allowLocalhost: boolean
}) {
  return (
    <Suspense fallback={null}>
      <Ga4Tracker enabled={enabled} allowLocalhost={allowLocalhost} />
    </Suspense>
  )
}
