'use client'

/**
 * Admin → Thống kê truy cập.
 *
 * HAI NGUỒN DỮ LIỆU (chuyển qua tab):
 *
 *  1. GA4 (mặc định) — số SESSIONS theo nguồn, lấy từ dimension
 *     `sessionSourceMedium` của GA4 Data API, đã đồng bộ vào MongoDB bằng
 *     upsert theo (ngày, nguồn) nên chạy lại không nhân đôi số liệu.
 *       • Facebook và Threads tách RIÊNG từ `sessionSourceMedium`
 *         (KHÔNG lấy từ nhóm tổng hợp Organic Social — nhóm đó gộp cả FB
 *         lẫn Threads lẫn Instagram nên không tách được từng nguồn).
 *       • Route: GET /api/admin/analytics/ga4?period=today|7d|30d|all
 *       • Đồng bộ: POST /api/admin/analytics/ga4/sync
 *
 *  2. Tự ghi (tracker) — lượt truy cập do website tự ghi vào collection
 *     `traffic_visits`.
 *       • Route: GET /api/admin/analytics/traffic?period=today|7d|30d|all
 *
 *  Realtime (GA4, 30 phút) → GET /api/admin/analytics/realtime
 *
 * Backend đã áp dụng `authorize('admin')` — giao diện chỉ là lớp trình bày,
 * không phải ranh giới bảo mật.
 *
 * Lưu ý số liệu:
 *  • GA4: đơn vị là SESSIONS (phiên của GA4), có kỳ "Toàn bộ".
 *  • Tự ghi: đơn vị là LƯỢT (mỗi phiên 30 phút = 1 lượt), tổng các nhóm
 *    nguồn luôn bằng tổng lượt truy cập.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Globe,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import {
  adminApi,
  type AnalyticsPeriod,
  type AnalyticsRealtimeReport,
  type AnalyticsSourceGroup,
  type AnalyticsTrafficReport,
  type Ga4SourceGroup,
  type Ga4TrafficReport,
} from '@/lib/api'
const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Toàn bộ' },
]

/** Màu Neo-Brutalism cho từng nhóm nguồn. */
const SOURCE_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  facebook: { bg: 'bg-[#1877F2]', text: 'text-white', bar: 'bg-[#1877F2]' },
  threads: { bg: 'bg-[#151515]', text: 'text-white', bar: 'bg-[#151515]' },
  google: { bg: 'bg-[#FDE047]', text: 'text-[#151515]', bar: 'bg-[#FDE047]' },
  direct: { bg: 'bg-white', text: 'text-[#151515]', bar: 'bg-[#151515]/35' },
}

/** Icon Facebook (không có trong lucide-react). */
function FacebookGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 text-[#151515]"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.29-.04-1.27-.12-2.4-.12-2.38 0-4 1.45-4 4.11v2.32H7.6V14h2.7v8h3.2z" />
    </svg>
  )
}

function formatNumber(value: number | undefined | null) {
  return (value ?? 0).toLocaleString('vi-VN')
}

/**
 * Tỷ lệ phần trăm của từng nhóm nguồn.
 *
 * Dùng phương pháp "largest remainder" để tổng tỷ lệ LUÔN đúng 100%.
 * Nếu dùng `Math.round` cho từng nhóm riêng lẻ, tổng có thể ra 101% hoặc
 * 99% do sai số làm tròn — đây chính là lỗi khiến bảng cũ hiển thị 125%.
 */
function computePercentages(
  sources: AnalyticsSourceGroup[],
  total: number
): Record<string, number> {
  if (!total || total <= 0) {
    return Object.fromEntries(sources.map((s) => [s.key, 0]))
  }

  const exact = sources.map((s) => (s.visits / total) * 100)
  const floors = exact.map((v) => Math.floor(v))
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0)

  // Chia phần dư cho các nhóm có phần thập lớn nhất.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)

  const result = [...floors]
  let cursor = 0
  while (remainder > 0 && order.length > 0) {
    result[order[cursor % order.length].i] += 1
    remainder -= 1
    cursor += 1
  }

  return Object.fromEntries(sources.map((s, i) => [s.key, result[i]]))
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

/**
 * Panel số liệu GA4.
 *
 * HIỂN THỊ HAI NGUỒN:
 *  1. `sessionSourceMedium` (sessions) — dimension chuẩn của GA4.
 *  2. `customEvent:traffic_source` (event count) — nơi GA4 ghi nhận nguồn
 *     đã chuẩn hoá (facebook / threads / google / …), KHỚP với bảng
 *     drill-down trong GA4 UI (Reports → Events → traffic_source).
 *
 * Nguồn (2) là nơi có số Facebook khớp với GA4 UI, vì `sessionSourceMedium`
 * gán nguồn ở mức phiên theo thứ tự ưu tiên của GA4 (referrer → UTM) và
 * rơi về `(direct)` khi mở link quảng cáo trong app browser.
 */
function Ga4Panel({
  data,
  loading,
  error,
  onSync,
  syncing,
}: {
  data: Ga4TrafficReport | null
  loading: boolean
  error: string | null
  onSync: () => void
  syncing: boolean
}) {
  const custom = data?.customEvent
  const customAvailable = custom?.available === true

  return (
    <BrutalCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#1877F2] px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
          <BarChart3 className="size-4" />
          Số liệu Google Analytics 4
        </h2>
        <div className="flex items-center gap-3">
          {data?.totals?.lastSyncedAt ? (
            <span className="font-mono text-xs font-bold text-white/70">
              Đồng bộ {formatTime(data.totals.lastSyncedAt)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            disabled={loading || syncing}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-white/40 px-2.5 py-1 text-xs font-bold text-white/85 transition hover:border-[#FDE047] hover:text-[#FDE047] disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Đang đồng bộ' : 'Đồng bộ GA4'}
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading && !data ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#151515]/40" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-red-400/60 bg-red-500/10 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-red-400" />
            <p className="text-xs font-semibold text-red-200">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nguồn chuẩn của GA4 */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#151515]/55">
                  Theo session source / medium
                </p>
                <table className="mt-2 w-full text-left">
                  <tbody>
                    {data.sources.map((s) => (
                      <tr key={s.key} className="border-b border-[#151515]/10 last:border-0">
                        <td className="py-1.5 text-sm font-bold text-[#151515]">
                          {s.label}
                        </td>
                        <td className="py-1.5 text-right font-mono text-sm font-black text-[#151515]">
                          {formatNumber(s.sessions)}
                        </td>
                        <td className="w-12 py-1.5 text-right font-mono text-xs font-bold text-[#151515]/55">
                          {s.percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Custom event — khớp bảng drill-down trong GA4 UI */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#151515]/55">
                  Theo event traffic_source (khớp GA4 UI)
                </p>
                {customAvailable ? (
                  <table className="mt-2 w-full text-left">
                    <tbody>
                      {(['facebook', 'threads', 'google', 'direct'] as const).map((key) => (
                        <tr key={key} className="border-b border-[#151515]/10 last:border-0">
                          <td className="py-1.5 text-sm font-bold text-[#151515]">
                            {key === 'facebook'
                              ? 'Facebook'
                              : key === 'threads'
                                ? 'Threads'
                                : key === 'google'
                                  ? 'Google'
                                  : 'Trực tiếp / Khác'}
                          </td>
                          <td className="py-1.5 text-right font-mono text-sm font-black text-[#151515]">
                            {formatNumber(custom?.bySource?.[key] ?? 0)}
                          </td>
                          <td className="w-12 py-1.5 text-right font-mono text-xs font-bold text-[#151515]/55">
                            {custom && custom.total > 0
                              ? Math.round(
                                  ((custom.bySource?.[key] ?? 0) / custom.total) * 100
                                )
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 rounded-xl border-2 border-[#151515]/20 bg-[#F5F5F0] px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#151515]/65">
                    Chưa đọc được custom dimension <code>traffic_source</code>. Cần
                    đăng ký trong GA4: <strong>Admin → Data display → Custom definitions</strong>{' '}
                    (Parameter name <code>traffic_source</code>, Scope <code>Event</code>).
                  </p>
                )}
              </div>
            </div>

            {data.note ? (
              <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#151515]/50">
                <Activity className="mt-0.5 size-3.5 shrink-0" />
                {data.note}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </BrutalCard>
  )
}

function BrutalCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] ${className}`}
    >
      {children}
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  accent = false,
  icon,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  icon?: React.ReactNode
}) {
  return (
    <BrutalCard className={accent ? 'bg-[#FDE047]' : ''}>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#151515]/55">
            {label}
          </p>
          <p className="mt-2 font-mono text-3xl font-black leading-none text-[#151515]">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-xs font-medium leading-relaxed text-[#151515]/60">
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#151515] bg-white shadow-[2px_2px_0_#151515]">
            {icon}
          </span>
        ) : null}
      </div>
    </BrutalCard>
  )
}

function SourceBarChart({
  sources,
  total,
}: {
  sources: AnalyticsSourceGroup[]
  total: number
}) {
  const max = Math.max(...sources.map((s) => s.visits), 0)
  const percents = computePercentages(sources, total)
  if (max === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm font-medium text-[#151515]/50">
        Chưa có dữ liệu lượt truy cập để vẽ biểu đồ.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-5">
      {sources.map((source) => {
        const style = SOURCE_STYLES[source.key] ?? SOURCE_STYLES.direct
        const percent = percents[source.key] ?? 0
        return (
          <div key={source.key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs font-bold text-[#151515]/70 sm:w-40">
              {source.label}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded-lg border-2 border-[#151515] bg-[#F5F5F0]">
              <div
                className={`flex h-full items-center justify-end ${style.bar} ${style.text}`}
                style={{
                  width: `${Math.max(
                    (source.visits / max) * 100,
                    source.visits > 0 ? 4 : 0
                  )}%`,
                }}
              >
                <span className="pr-2 font-mono text-[11px] font-black">
                  {formatNumber(source.visits)}
                </span>
              </div>
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[11px] font-bold text-[#151515]/55">
              {percent}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DailySparkline({
  daily,
}: {
  daily: { date: string; visits: number }[]
}) {
  if (daily.length === 0) return null
  const max = Math.max(...daily.map((d) => d.visits), 1)

  return (
    <div className="flex h-24 items-end gap-1 px-5 pb-5 pt-2">
      {daily.map((point) => {
        const heightPct = Math.round((point.visits / max) * 100)
        return (
          <div
            key={point.date}
            className="group relative flex-1"
            title={`${point.date}: ${point.visits} lượt`}
          >
            <div
              className="w-full rounded-t-sm border-x-2 border-t-2 border-[#151515] bg-[#1877F2] transition-all"
              style={{ height: `${Math.max(heightPct, point.visits > 0 ? 4 : 1)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function RealtimePanel({
  data,
  loading,
  error,
  onRefresh,
}: {
  data: AnalyticsRealtimeReport | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}) {
  return (
    <BrutalCard className="bg-[#151515] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-white/20 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#FDE047] opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-[#FDE047]" />
          </span>
          <h2 className="text-base font-black uppercase tracking-wide">
            Realtime · 30 phút gần nhất
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-white/40 px-2.5 py-1 text-xs font-bold text-white/80 transition hover:border-[#FDE047] hover:text-[#FDE047] disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="p-5">
        {loading && !data ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-[#FDE047]" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2.5 rounded-xl border-2 border-red-400/60 bg-red-500/10 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-red-400" />
            <p className="text-xs font-semibold text-red-200">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-white/25 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Người dùng đang hoạt động
                </p>
                <p className="mt-1 font-mono text-3xl font-black text-[#FDE047]">
                  {formatNumber(data.activeUsers)}
                </p>
              </div>
              <div className="rounded-xl border-2 border-white/25 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Sự kiện
                </p>
                <p className="mt-1 font-mono text-3xl font-black text-[#FDE047]">
                  {formatNumber(data.eventCount)}
                </p>
              </div>
            </div>

            {data.countries.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.countries.map((c) => (
                  <span
                    key={c.country}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-white/30 px-2.5 py-1 text-xs font-bold text-white/85"
                  >
                    <Globe className="size-3.5" />
                    {c.country}
                    <span className="font-mono text-[#FDE047]">{c.activeUsers}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/45">
              <Activity className="mt-0.5 size-3.5 shrink-0" />
              {data.note}
            </p>
          </>
        ) : null}
      </div>
    </BrutalCard>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d')
  // Mặc định KHÔNG tính lượt truy cập từ localhost (dev & test).
  const [includeLocal, setIncludeLocal] = useState(false)
  const [report, setReport] = useState<AnalyticsTrafficReport | null>(null)
  const [realtime, setRealtime] = useState<AnalyticsRealtimeReport | null>(null)
  const [ga4, setGa4] = useState<Ga4TrafficReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [rtLoading, setRtLoading] = useState(false)
  const [ga4Loading, setGa4Loading] = useState(false)
  const [ga4Syncing, setGa4Syncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rtError, setRtError] = useState<string | null>(null)
  const [ga4Error, setGa4Error] = useState<string | null>(null)

  const loadTraffic = useCallback(
    async (p: AnalyticsPeriod, withLocal: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const data = await adminApi.getAnalyticsTraffic(p, withLocal)
        setReport(data)
      } catch (e) {
        setReport(null)
        setError(
          e instanceof Error
            ? e.message
            : 'Không đọc được dữ liệu lượt truy cập.'
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadRealtime = useCallback(async () => {
    setRtLoading(true)
    setRtError(null)
    try {
      const data = await adminApi.getAnalyticsRealtime()
      setRealtime(data)
    } catch (e) {
      setRealtime(null)
      setRtError(
        e instanceof Error
          ? e.message
          : 'Không đọc được dữ liệu realtime từ Google Analytics.'
      )
    } finally {
      setRtLoading(false)
    }
  }, [])

  // ── GA4 (đã đồng bộ vào MongoDB) ──────────────────────────────────────
  const loadGa4 = useCallback(async () => {
    setGa4Loading(true)
    setGa4Error(null)
    try {
      const data = await adminApi.getAnalyticsGa4(period)
      setGa4(data)
    } catch (e) {
      setGa4(null)
      setGa4Error(
        e instanceof Error ? e.message : 'Không đọc được số liệu GA4.'
      )
    } finally {
      setGa4Loading(false)
    }
  }, [period])

  const syncGa4 = useCallback(async () => {
    setGa4Syncing(true)
    setGa4Error(null)
    try {
      await adminApi.syncAnalyticsGa4(90)
      await loadGa4()
    } catch (e) {
      setGa4Error(
        e instanceof Error ? e.message : 'Không đồng bộ được số liệu GA4.'
      )
    } finally {
      setGa4Syncing(false)
    }
  }, [loadGa4])

  useEffect(() => {
    loadTraffic(period, includeLocal)
  }, [period, includeLocal, loadTraffic])

  useEffect(() => {
    loadGa4()
  }, [loadGa4])

  useEffect(() => {
    loadRealtime()
    // Tự làm mới realtime mỗi 60 giây.
    const timer = setInterval(loadRealtime, 60_000)
    return () => clearInterval(timer)
  }, [loadRealtime])

  const totalVisits = report?.totals?.totalVisits ?? 0
  const groupedTotal = report?.totals?.groupedTotal ?? 0
  /** Số lượt dev/test đang bị ẩn khỏi số liệu. */
  const excludedLocalVisits = report?.totals?.excludedLocalVisits ?? 0
  /**
   * Số lượt lịch sử chưa xác định được website (bản ghi cũ không có
   * `siteHost`). KHÔNG được tự động tính vào khách thật.
   */
  const unknownOriginVisits = report?.totals?.unknownOriginVisits ?? 0

  const hasTraffic = totalVisits > 0

  /** Tỷ lệ % của từng nhóm — tổng luôn đúng 100% (largest remainder). */
  const percents = useMemo(() => {
    const backend = report?.sources ?? []
    // Ưu tiên `percent` từ backend (đã bảo đảm tổng = 100%).
    if (backend.length > 0 && backend.every((s) => typeof s.percent === 'number')) {
      return Object.fromEntries(backend.map((s) => [s.key, s.percent]))
    }
    // Fallback — tính lại tại client.
    return computePercentages(backend, totalVisits)
  }, [report, totalVisits])

  /** Chỉ hiện cảnh báo khi thực sự lệch — bảng và tổng luôn dùng cùng nguồn. */
  const mismatch = groupedTotal !== totalVisits

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#151515]/45">
            Thống kê nội bộ
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#151515] lg:text-3xl">
            Thống kê truy cập
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#151515]/60">
            Lượt truy cập theo Facebook, Threads, Google và Trực tiếp / Khác — dữ
            liệu tự ghi trong MongoDB, tích luỹ theo thời gian.
          </p>
        </div>

        {/* Period filter */}
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => {
              const active = period === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={active}
                  className={`rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-bold transition-all ${
                    active
                      ? 'bg-[#FDE047] text-[#151515] shadow-[3px_3px_0_#151515]'
                      : 'bg-white text-[#151515] shadow-[2px_2px_0_#151515] hover:bg-[#F5F5F0]'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Toggle lượt truy cập từ môi trường dev/test */}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#151515]/70">
            <input
              type="checkbox"
              checked={includeLocal}
              onChange={(e) => setIncludeLocal(e.target.checked)}
              className="size-4 accent-[#151515]"
            />
            Bao gồm lượt truy cập từ localhost (dev/test)
            {excludedLocalVisits > 0 ? (
              <span className="rounded-md border-2 border-[#151515] bg-[#FDE047] px-1.5 py-0.5 font-mono text-[10px] font-black text-[#151515]">
                {excludedLocalVisits} lượt đang bị ẩn
              </span>
            ) : null}
          </label>

          {/* Bản ghi chưa xác định được website — báo riêng, không tính vào
              khách thật. */}
          {unknownOriginVisits > 0 ? (
            <p className="max-w-sm rounded-xl border-2 border-[#151515]/25 bg-[#F5F5F0] px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#151515]/65">
              Có <strong className="font-black text-[#151515]">{unknownOriginVisits}</strong>{' '}
              lượt lịch sử chưa xác định được website (bản ghi cũ) — không được
              tính vào số liệu khách thật.
            </p>
          ) : null}
        </div>
      </div>

      {/* Realtime (GA4 — bổ sung, không thay thế bảng lượt truy cập) */}
      <RealtimePanel
        data={realtime}
        loading={rtLoading}
        error={rtError}
        onRefresh={loadRealtime}
      />

      {/* Số liệu GA4 đã đồng bộ (sessions + custom event traffic_source) */}
      <Ga4Panel
        data={ga4}
        loading={ga4Loading}
        error={ga4Error}
        onSync={syncGa4}
        syncing={ga4Syncing}
      />

      {/* Error state — lịch sử */}
      {error ? (
        <BrutalCard className="border-red-500 bg-red-50">
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <AlertTriangle className="size-11 text-red-500" />
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => loadTraffic(period, includeLocal)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
            >
              <RefreshCw className="size-4" />
              Thử lại
            </button>
          </div>
        </BrutalCard>
      ) : loading && !report ? (
        /* Loading state */
        <BrutalCard>
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-[#151515]/40" />
            <p className="text-sm font-medium text-[#151515]/50">
              Đang tải số liệu truy cập...
            </p>
          </div>
        </BrutalCard>
      ) : (
        <>
          {/* Totals */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tổng lượt truy cập"
              value={formatNumber(totalVisits)}
              hint={
                report?.period === 'all'
                  ? 'Tích luỹ từ lúc bắt đầu ghi nhận'
                  : `Lượt truy cập trong ${report?.periodLabel?.toLowerCase() ?? ''}`
              }
              accent
              icon={<Activity className="size-5 text-[#151515]" />}
            />
            {(['facebook', 'threads', 'google', 'direct'] as const).map((key) => {
              const source = report?.sources?.find((s) => s.key === key)
              const icon =
                key === 'facebook' ? (
                  <FacebookGlyph />
                ) : key === 'threads' ? (
                  <span className="text-[11px] font-black text-[#151515]">@</span>
                ) : key === 'google' ? (
                  <Globe className="size-5 text-[#151515]" />
                ) : (
                  <Users className="size-5 text-[#151515]" />
                )
              const percent = percents[key] ?? 0
              return (
                <MetricCard
                  key={key}
                  label={source?.label ?? key}
                  value={formatNumber(source?.visits ?? 0)}
                  hint={`${percent}% tổng lượt truy cập`}
                  icon={icon}
                />
              )
            })}
          </div>

          {/* Chuỗi ngày */}
          {report?.daily && report.daily.length > 1 ? (
            <BrutalCard className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#151515]">
                  <CalendarDays className="size-4" />
                  Lượt truy cập theo ngày
                </h2>
                <span className="font-mono text-xs font-bold text-[#151515]/70">
                  {report.daily[0]?.date} → {report.daily[report.daily.length - 1]?.date}
                </span>
              </div>
              <DailySparkline daily={report.daily} />
            </BrutalCard>
          ) : null}

          {/* Biểu đồ so sánh */}
          <BrutalCard>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#151515]">
                <BarChart3 className="size-4" />
                Phân bổ lượt truy cập theo nguồn
              </h2>
              <span className="font-mono text-xs font-bold text-[#151515]/70">
                {report?.periodLabel}
              </span>
            </div>
            <SourceBarChart
              sources={report?.sources ?? []}
              total={totalVisits}
            />
          </BrutalCard>

          {/* Bảng nguồn truy cập */}
          <BrutalCard className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-[#151515]">
                Bảng nguồn truy cập
              </h2>
              {report ? (
                <span className="font-mono text-xs font-bold text-[#151515]/70">
                  Cập nhật {formatTime(report.generatedAt)}
                </span>
              ) : null}
            </div>

            {!hasTraffic ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border-[3px] border-[#151515] bg-[#FDE047] shadow-[4px_4px_0_#151515]">
                  <BarChart3 className="size-7 text-[#151515]" />
                </span>
                <p className="text-base font-black text-[#151515]">
                  Chưa có dữ liệu truy cập
                </p>
                <p className="max-w-md text-sm font-medium leading-relaxed text-[#151515]/55">
                  Chưa có lượt truy cập nào được ghi nhận trong khoảng thời gian
                  này. Số liệu sẽ tự xuất hiện ngay khi có lượt truy cập mới.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b-[3px] border-[#151515] bg-[#F5F5F0]">
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Nguồn
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Lượt truy cập
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Tỉ lệ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.sources.map((source) => {
                      const style =
                        SOURCE_STYLES[source.key] ?? SOURCE_STYLES.direct
                      const percent = percents[source.key] ?? 0
                      return (
                        <tr
                          key={source.key}
                          className="border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/5"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`size-3 shrink-0 rounded-sm border-2 border-[#151515] ${style.bg}`}
                              />
                              <span className="text-sm font-bold text-[#151515]">
                                {source.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                            {formatNumber(source.visits)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#151515]/75">
                            {percent}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-[3px] border-[#151515] bg-[#FDE047]">
                      <td className="px-4 py-3 text-sm font-black text-[#151515]">
                        Tổng cộng
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                        {formatNumber(groupedTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </BrutalCard>

          {/* Phân bổ theo domain — phân biệt khách thật vs dev/test */}
          {report?.siteHosts && report.siteHosts.length > 0 ? (
            <BrutalCard className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#151515]">
                  <Globe className="size-4" />
                  Lượt truy cập theo website
                </h2>
                <span className="font-mono text-xs font-bold text-[#151515]/70">
                  {includeLocal ? 'Bao gồm dev/test' : 'Chỉ khách thật'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left">
                  <thead>
                    <tr className="border-b-[3px] border-[#151515] bg-[#F5F5F0]">
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Website (hostname)
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Lượt truy cập
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.siteHosts.map((h) => (
                      <tr
                        key={h.host}
                        className="border-b border-[#151515]/10 last:border-0"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#151515]">
                          {h.host}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                          {formatNumber(h.visits)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BrutalCard>
          ) : null}

          {/* Ghi chú về cách tính */}
          <BrutalCard className="bg-[#F5F5F0]">
            <div className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-[#151515]">
                <Activity className="size-4" />
                Cách đọc số liệu
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-xs font-medium leading-relaxed text-[#151515]/70">
                <li>
                  • <strong className="font-black text-[#151515]">Tổng lượt truy cập</strong> là
                  số phiên ghi nhận được trong kỳ. Mỗi phiên 30 phút tính là 1 lượt.
                </li>
                <li>
                  • <strong className="font-black text-[#151515]">Tổng các nhóm nguồn</strong>{' '}
                  luôn bằng tổng lượt truy cập (cùng một truy vấn, không cộng tay).
                  {mismatch ? (
                    <span className="text-red-600">
                      {' '}
                      ⚠ Lệch {groupedTotal - totalVisits} — cần kiểm tra dữ liệu.
                    </span>
                  ) : null}
                </li>
                <li>
                  • <strong className="font-black text-[#151515]">Không có số "người dùng
                  duy nhất"</strong> — hệ thống không xác định được danh tính người
                  dùng nên không gắn nhãn người dùng cho dữ liệu phiên.
                </li>
                <li>
                  • <strong className="font-black text-[#151515]">Nguồn</strong> được xác định
                  theo UTM hợp lệ, sau đó tới referrer; không xác định được thì tính vào
                  Trực tiếp / Khác (kể cả ChatGPT và các nguồn khác).
                </li>
                {report?.firstRecordedAt ? (
                  <li>
                    • <strong className="font-black text-[#151515]">Bắt đầu ghi nhận</strong>:{' '}
                    {formatTime(report.firstRecordedAt)}
                  </li>
                ) : null}
                <li>
                  • <strong className="font-black text-[#151515]">Lượt dev/test</strong>:{' '}
                  {excludedLocalVisits > 0
                    ? `${excludedLocalVisits} lượt truy cập từ localhost đang được ẩn khỏi số liệu (không phải khách thật).`
                    : 'Không có lượt truy cập nào từ localhost trong kỳ này.'}
                </li>
                {unknownOriginVisits > 0 ? (
                  <li>
                    • <strong className="font-black text-[#151515]">Chưa xác định</strong>:{' '}
                    {unknownOriginVisits} lượt lịch sử không có thông tin website — không
                    được tính vào số liệu khách thật.
                  </li>
                ) : null}
                {report?.note ? <li>• {report.note}</li> : null}
              </ul>
            </div>
          </BrutalCard>
        </>
      )}
    </main>
  )
}
