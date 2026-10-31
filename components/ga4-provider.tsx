'use client'

import { useEffect, useRef } from 'react'
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
 * Bộ nạp GA4 tự quản lý — App Router.
 *
 * Vì sao không dùng `@next/third-parties/google`?
 *  - `gtag('config', id)` của GA4 tự sinh 1 event `page_view` cho lần tải trang đầu.
 *  - Nếu ta còn tự bắn `page_view` thêm cho lần tải đầu, dữ liệu sẽ bị NHÂN ĐÔI.
 *  - Vì vậy ta tự nạp gtag.js, dùng `send_page_view: false` trong config,
 *    rồi bắn `page_view` đúng 1 lần cho mỗi URL (kể cả điều hướng SPA).
 *
 * Vì sao không dùng `usePathname()`?
 *  - Trong Next.js App Router, `usePathname()` đặt ở ROOT LAYOUT không cập nhật
 *    khi điều hướng SPA: layout được giữ nguyên (không remount) nên effect
 *    không chạy lại → thiếu `page_view` cho các trang sau.
 *  - Thay vào đó ta theo dõi trực tiếp URL thật qua `history.pushState`,
 *    `history.replaceState` và sự kiện `popstate`.
 *
 * Quy tắc bảo mật: không bao giờ gửi PII. Query nhạy cảm bị lọc trước khi gửi.
 */
export function Ga4Provider({
  enabled,
  allowLocalhost,
}: {
  enabled: boolean
  allowLocalhost: boolean
}) {
  const lastUrlRef = useRef<string>('')
  const sentFirstVisitRef = useRef(false)

  useEffect(() => {
    if (!enabled || !GA_MEASUREMENT_ID) return

    // ── 0) Chặn localhost (dev) ──────────────────────────────────────
    // Kiểm tra ngay trong effect (effect chỉ chạy ở client) để cờ
    // không bao giờ đổi → effect không bị cleanup giữa chừng.
    const isLocal = isLocalHostname(window.location.hostname)
    if (isLocal && !allowLocalhost) return

    // ── 1) Nạp gtag.js + cấu hình measurement (chỉ 1 lần) ──────────
    window.dataLayer = window.dataLayer || []
    if (typeof window.gtag !== 'function') {
      function gtag(...args: unknown[]) {
        window.dataLayer!.push(args)
      }
      window.gtag = gtag
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      // Tắt auto page_view để ta tự kiểm soát (tránh nhân đôi event).
      send_page_view: false,
      allow_google_signals: false,
    })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.dataset.ga4Loader = 'true'
    document.head.appendChild(script)

    setTrackerEnabled(true)

    // ── 2) Bắn page_view theo URL thật ────────────────────────────────
    const firePageView = () => {
      const url = window.location
      const search = url.search.startsWith('?') ? url.search.slice(1) : url.search
      const safeSearch = sanitizeSearch(search)
      const fullPath = `${url.pathname}${safeSearch}`

      // Dedupe: cùng 1 URL chỉ bắn 1 lần.
      if (fullPath === lastUrlRef.current) return
      lastUrlRef.current = fullPath

      const referrer = document.referrer
      const traffic = deriveTrafficInfo(search, referrer)
      const attribution = extractAttribution(search)

      window.gtag?.('event', 'page_view', {
        page_path: fullPath,
        page_location: `${url.origin}${fullPath}`,
        page_title: document.title,
        // Nguồn traffic đã chuẩn hoá (facebook / threads / google / organic ...)
        traffic_source: traffic.source,
        traffic_medium: traffic.medium,
        traffic_campaign: traffic.campaign,
        referrer_host: traffic.referrerHost,
        ...(traffic.clickId ? { click_id: traffic.clickId } : {}),
        ...attribution,
      })

      // Event riêng để dễ lọc trong GA4 Explore / Looker Studio
      window.gtag?.('event', 'traffic_source', {
        traffic_source: traffic.source,
        traffic_medium: traffic.medium,
        traffic_campaign: traffic.campaign,
        referrer_host: traffic.referrerHost,
        page_path: fullPath,
      })

      // Ghi nhận nguồn của phiên đầu tiên (đối chiếu session_start)
      if (!sentFirstVisitRef.current) {
        sentFirstVisitRef.current = true
        window.gtag?.('event', 'first_visit_source', {
          session_traffic_source: traffic.source,
          session_traffic_medium: traffic.medium,
          session_traffic_campaign: traffic.campaign,
        })
      }
    }

    // Lần tải trang đầu
    firePageView()

    // ── 3) Theo dõi điều hướng SPA ───────────────────────────────────
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = function patchedPushState(
      state: unknown,
      title: string,
      url?: string | URL | null,
    ) {
      const result = originalPushState(state, title, url)
      // Đợi Next cập nhật DOM (tiêu đề) rồi mới bắn event.
      setTimeout(firePageView, 0)
      return result
    }

    history.replaceState = function patchedReplaceState(
      state: unknown,
      title: string,
      url?: string | URL | null,
    ) {
      const result = originalReplaceState(state, title, url)
      setTimeout(firePageView, 0)
      return result
    }

    // Nút back / forward
    const onPopState = () => {
      setTimeout(firePageView, 0)
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      setTrackerEnabled(false)
      window.removeEventListener('popstate', onPopState)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      script.remove()
    }
  }, [])

  return null
}
