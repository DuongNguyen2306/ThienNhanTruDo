'use client'

/**
 * Traffic tracker — ghi nhận lượt truy cập vào backend riêng (MongoDB).
 *
 * MỤC TIÊU
 *  Ghi lại "người dùng vào website từ nguồn nào" vào DB của chính dự án,
 *  thay vì phụ thuộc vào GA4 `sessionSourceMedium` (vốn không phản ánh đúng
 *  nguồn Facebook/Threads khi vào bằng link UTM).
 *
 * NGUYÊN TẮC
 *  1. MỖI PHIÊN = 1 LƯỢT. Phiên kéo dài 30 phút không hoạt động.
 *  2. KHÔNG gửi khi chuyển trang SPA, không gửi lại khi refresh.
 *  3. KHÔNG gửi PII: không gửi query string đầy đủ, không gửi email/OTP/token.
 *  4. Lỗi API KHÔNG được làm hỏng website (fire-and-forget + retry an toàn).
 *  5. NHIỀU TAB: `localStorage` được chia sẻ giữa các tab ⇒ mọi tab của
 *     cùng một phiên dùng CHUNG sessionId ⇒ chỉ 1 lượt cho cả nhóm tab.
 *
 * GHI CHÚ VỀ NGUỒN:
 *  Backend tự xác định nguồn lại từ `utm_source` / `referrer` — giá trị
 *  `source` mà tracker gửi lên chỉ là thông tin đối chiếu, KHÔNG phải nguồn
 *  dữ liệu chính.
 */

import { useEffect } from 'react'
import { API_BASE, IS_API_BASE_USABLE } from '@/lib/api-config'

/** Thời hạn phiên: 30 phút không hoạt động ⇒ phiên mới. */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

/** Khoá lưu trữ (localStorage ⇒ dùng chung cho mọi tab của cùng phiên). */
const STORAGE_KEY = 'tn_traffic_session'

/** Số lần retry tối đa khi request thất bại. */
const MAX_RETRIES = 2

/** Độ trễ retry (ms) — tăng dần. */
const RETRY_DELAYS = [3000, 8000]

type TrafficPayload = {
  sessionId: string
  utmSource: string
  utmMedium: string
  referrer: string
  landingPath: string
  /**
   * Hostname của WEBSITE đang xem (ví dụ `thiennhantudo.vercel.app`).
   *
   * Backend dùng giá trị này (kèm header `Origin`) để phân biệt lượt truy
   * cập THẬT (từ domain production) với lượt truy cập từ môi trường
   * dev/test (`localhost`). Giá trị này KHÔNG chứa PII.
   */
  siteHost: string
}

// ───────────────────────────────────────────────────────────────────────────
// Session helpers
// ───────────────────────────────────────────────────────────────────────────

function randomId(): string {
  const bytes = new Uint8Array(18)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type StoredSession = { id: string; lastSeen: number; sent: boolean }

/**
 * Đọc (hoặc tạo) session hiện tại.
 *
 * `localStorage` ⇒ dùng chung cho MỌI TAB. Nên:
 *  • Mở 5 tab      → cùng sessionId → chỉ 1 lượt.
 *  • Refresh 5 lần → cùng sessionId → chỉ 1 lượt.
 *  • Đóng hết tab, mở lại trong < 30 phút → cùng sessionId → vẫn 1 lượt.
 *  • Quay lại sau > 30 phút → sessionId MỚI → lượt mới (đúng định nghĩa
 *    "phiên 30 phút không hoạt động").
 */
function getSession(): StoredSession {
  if (typeof window === 'undefined') {
    return { id: randomId(), lastSeen: Date.now(), sent: false }
  }

  try {
    const now = Date.now()
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession
      if (parsed?.id && now - parsed.lastSeen < SESSION_TIMEOUT_MS) {
        parsed.lastSeen = now
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        return parsed
      }
      // Hết thời hạn ⇒ phiên mới. Giữ `sent: false` để gửi lượt mới.
    }

    const fresh: StoredSession = { id: randomId(), lastSeen: now, sent: false }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  } catch {
    // localStorage bị chặn (private mode / CSP) → vẫn gửi, backend chống trùng.
    return { id: randomId(), lastSeen: Date.now(), sent: false }
  }
}

/** Đánh dấu "phiên này đã gửi rồi" (dùng chung cho mọi tab). */
function markSent(sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = getSession()
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, id: sessionId, sent: true })
    )
  } catch {
    // Bỏ qua — backend vẫn chống trùng bằng unique index.
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Payload helpers
// ───────────────────────────────────────────────────────────────────────────

/** Chỉ lấy hostname của referrer — KHÔNG gửi URL đầy đủ. */
function safeReferrerHost(): string {
  if (typeof document === 'undefined') return ''
  const referrer = document.referrer
  if (!referrer) return ''
  try {
    return new URL(referrer).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

/**
 * Tách UTM từ query string.
 *
 * CHÚ Ý: đọc TRỰC TIẾP từ `window.location.search` (không dùng
 * `useSearchParams`) để không mất UTM ở lần tải đầu tiên — App Router có
 * thể render server-side trước khi `searchParams` sẵn sàng.
 */
function readUtm(): { source: string; medium: string } {
  if (typeof window === 'undefined') return { source: '', medium: '' }
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      source: (params.get('utm_source') || '').trim().slice(0, 64),
      medium: (params.get('utm_medium') || '').trim().slice(0, 32),
    }
  } catch {
    return { source: '', medium: '' }
  }
}

/** Landing path — chỉ pathname, KHÔNG query (tránh lộ PII). */
function readLandingPath(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname || '/'
}

/** Hostname của website đang xem (không PII). */
function readSiteHost(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname || ''
}

// ───────────────────────────────────────────────────────────────────────────
// Gửi
// ───────────────────────────────────────────────────────────────────────────

async function sendVisit(payload: TrafficPayload, attempt = 0): Promise<void> {
  // API chưa cấu hình (thiếu NEXT_PUBLIC_API_URL, hoặc URL trỏ về localhost
  // trong bản build production) ⇒ KHÔNG gửi và KHÔNG retry. Tracker im lặng
  // để không làm nhiễu console của người quản trị.
  if (!IS_API_BASE_USABLE || !API_BASE) return

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`${API_BASE}/api/traffic/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    })

    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch {
    // Retry an toàn với CÙNG sessionId ⇒ backend vẫn chỉ tính 1 lượt.
    if (attempt < MAX_RETRIES) {
      setTimeout(() => {
        void sendVisit(payload, attempt + 1)
      }, RETRY_DELAYS[attempt])
    }
    // Hết số lần retry → bỏ qua. Analytics KHÔNG được làm hỏng website.
  }
}

/**
 * Gửi 1 lượt truy cập (nếu phiên này chưa gửi).
 */
export function trackVisitOnce(): void {
  if (typeof window === 'undefined') return
  // Xem `sendVisit` — không gửi khi API chưa cấu hình.
  if (!IS_API_BASE_USABLE || !API_BASE) return

  const session = getSession()
  if (session.sent) return

  // Ghi cờ "đã gửi" TRƯỚC khi gọi API để chặn race condition giữa các
  // tab (tab A và tab B cùng chạy effect → chỉ tab A đi tiếp).
  markSent(session.id)

  const utm = readUtm()

  void sendVisit({
    sessionId: session.id,
    utmSource: utm.source,
    utmMedium: utm.medium,
    referrer: safeReferrerHost(),
    landingPath: readLandingPath(),
    siteHost: readSiteHost(),
  })
}

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

/**
 * Provider gắn vào layout root. Chỉ gửi 1 lần cho mỗi phiên.
 */
export function TrafficTracker() {
  useEffect(() => {
    // Chờ một tick để `document.referrer` và `window.location` đã sẵn sàng.
    const timer = setTimeout(() => trackVisitOnce(), 0)
    return () => clearTimeout(timer)
  }, [])

  return null
}

export default TrafficTracker
