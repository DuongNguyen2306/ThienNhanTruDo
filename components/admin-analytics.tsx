'use client'

/**
 * Admin → Thống kê truy cập (Google Analytics 4 Data API).
 *
 * Dữ liệu thật, không có mock:
 *   • Lịch sử  → GET /api/admin/analytics/traffic?period=today|7d|30d
 *   • Realtime → GET /api/admin/analytics/realtime (30 phút gần nhất)
 *
 * Backend đã áp dụng `authorize('admin')` — giao diện chỉ là lớp trình bày,
 * không phải ranh giới bảo mật.
 *
 * Lưu ý số liệu: `totalUsers` là số người dùng DUY NHẤT lấy từ truy vấn
 * tổng của GA4. Tổng `activeUsers` của các nguồn có thể lớn hơn vì một
 * người có thể đến từ nhiều nguồn trong cùng khoảng thời gian.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ExternalLink,
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
} from '@/lib/api'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
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
    <svg viewBox="0 0 24 24" className="size-5 text-[#151515]" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.29-.04-1.27-.12-2.4-.12-2.38 0-4 1.45-4 4.11v2.32H7.6V14h2.7v8h3.2z" />
    </svg>
  )
}

function formatNumber(value: number | undefined | null) {
  return (value ?? 0).toLocaleString('vi-VN')
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

function SourceCard({ source, max }: { source: AnalyticsSourceGroup; max: number }) {
  const style = SOURCE_STYLES[source.key] ?? SOURCE_STYLES.direct
  const percent = max > 0 ? Math.round((source.sessions / max) * 100) : 0

  return (
    <BrutalCard className="overflow-hidden">
      {/* Header strip */}
      <div
        className={`flex items-center justify-between gap-2 border-b-[3px] border-[#151515] px-4 py-2.5 ${style.bg} ${style.text}`}
      >
        <span className="truncate text-sm font-black uppercase tracking-wide">
          {source.label}
        </span>
        <span className="shrink-0 rounded-md border-2 border-[#151515] bg-white px-2 py-0.5 font-mono text-[11px] font-black text-[#151515]">
          {percent}%
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
              Phiên
            </p>
            <p className="font-mono text-xl font-black text-[#151515]">
              {formatNumber(source.sessions)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
              Người dùng
            </p>
            <p className="font-mono text-xl font-black text-[#151515]">
              {formatNumber(source.activeUsers)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-[#151515] bg-[#F5F5F0]">
          <div
            className={`h-full ${style.bar}`}
            style={{ width: `${Math.max(percent, source.sessions > 0 ? 3 : 0)}%` }}
          />
        </div>
      </div>
    </BrutalCard>
  )
}

function SourceBarChart({ sources }: { sources: AnalyticsSourceGroup[] }) {
  const max = Math.max(...sources.map((s) => s.sessions), 0)
  if (max === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm font-medium text-[#151515]/50">
        Chưa có dữ liệu phiên để vẽ biểu đồ.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-5">
      {sources.map((source) => {
        const style = SOURCE_STYLES[source.key] ?? SOURCE_STYLES.direct
        const percent = Math.round((source.sessions / max) * 100)
        return (
          <div key={source.key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs font-bold text-[#151515]/70 sm:w-40">
              {source.label}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded-lg border-2 border-[#151515] bg-[#F5F5F0]">
              <div
                className={`flex h-full items-center justify-end ${style.bar} ${style.text}`}
                style={{ width: `${Math.max(percent, source.sessions > 0 ? 4 : 0)}%` }}
              >
                <span className="pr-2 font-mono text-[11px] font-black">
                  {formatNumber(source.sessions)}
                </span>
              </div>
            </div>
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
  const [report, setReport] = useState<AnalyticsTrafficReport | null>(null)
  const [realtime, setRealtime] = useState<AnalyticsRealtimeReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [rtLoading, setRtLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rtError, setRtError] = useState<string | null>(null)

  const loadTraffic = useCallback(async (p: AnalyticsPeriod) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getAnalyticsTraffic(p)
      setReport(data)
    } catch (e) {
      setReport(null)
      setError(
        e instanceof Error
          ? e.message
          : 'Không đọc được dữ liệu truy cập từ Google Analytics.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

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

  useEffect(() => {
    loadTraffic(period)
  }, [period, loadTraffic])

  useEffect(() => {
    loadRealtime()
    // Tự làm mới realtime mỗi 60 giây.
    const timer = setInterval(loadRealtime, 60_000)
    return () => clearInterval(timer)
  }, [loadRealtime])

  const maxSessions = useMemo(
    () => Math.max(...(report?.sources ?? []).map((s) => s.sessions), 0),
    [report]
  )

  const hasTraffic = (report?.totals?.totalSessions ?? 0) > 0

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#151515]/45">
            Google Analytics 4
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#151515] lg:text-3xl">
            Thống kê truy cập
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#151515]/60">
            Nguồn truy cập website theo Facebook, Threads, Google và Trực tiếp / Khác — dữ liệu thật từ GA4 Data API.
          </p>
        </div>

        {/* Period filter */}
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
      </div>

      {/* Realtime (nổi bật, tách biệt rõ với lịch sử) */}
      <RealtimePanel
        data={realtime}
        loading={rtLoading}
        error={rtError}
        onRefresh={loadRealtime}
      />

      {/* Error state — lịch sử */}
      {error ? (
        <BrutalCard className="border-red-500 bg-red-50">
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <AlertTriangle className="size-11 text-red-500" />
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => loadTraffic(period)}
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
              label="Tổng người dùng"
              value={formatNumber(report?.totals?.totalUsers ?? 0)}
              hint="Người dùng duy nhất trong kỳ (truy vấn tổng GA4)"
              accent
              icon={<Users className="size-5 text-[#151515]" />}
            />
            <MetricCard
              label="Tổng phiên truy cập"
              value={formatNumber(report?.totals?.totalSessions ?? 0)}
              hint={`Lịch sử ${report?.periodLabel?.toLowerCase() ?? ''} — dữ liệu GA4 đã xử lý`}
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
              return (
                <MetricCard
                  key={key}
                  label={source?.label ?? key}
                  value={formatNumber(source?.sessions ?? 0)}
                  hint={`${formatNumber(source?.activeUsers ?? 0)} người dùng`}
                  icon={icon}
                />
              )
            })}
          </div>

          {/* Biểu đồ so sánh */}
          <BrutalCard>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#151515]">
                <BarChart3 className="size-4" />
                Phân bổ phiên theo nguồn
              </h2>
              <span className="font-mono text-xs font-bold text-[#151515]/70">
                {report?.dateRange?.startDate} → {report?.dateRange?.endDate}
              </span>
            </div>
            <SourceBarChart sources={report?.sources ?? []} />
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
                  Google Analytics 4 chưa ghi nhận lượt truy cập nào trong khoảng thời gian
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
                        Phiên
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Người dùng
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Tỉ lệ phiên
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.sources.map((source) => {
                      const style = SOURCE_STYLES[source.key] ?? SOURCE_STYLES.direct
                      const percent =
                        (report?.totals?.totalSessions ?? 0) > 0
                          ? Math.round(
                              (source.sessions / (report?.totals?.totalSessions ?? 1)) * 100
                            )
                          : 0
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
                            {formatNumber(source.sessions)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#151515]/75">
                            {formatNumber(source.activeUsers)}
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
                        {formatNumber(report?.totals?.totalSessions ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                        {formatNumber(report?.totals?.totalUsers ?? 0)}
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

          {/* Chi tiết theo sessionSourceMedium */}
          {hasTraffic ? (
            <BrutalCard className="overflow-hidden">
              <div className="border-b-[3px] border-[#151515] bg-[#151515] px-5 py-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-white">
                  Chi tiết theo nguồn / kênh (GA4 sessionSourceMedium)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b-[3px] border-[#151515] bg-[#F5F5F0]">
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Nguồn / kênh
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Phiên
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#151515]/60">
                        Người dùng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.sources
                      ?.flatMap((s) =>
                        (s.breakdown ?? []).map((b) => ({ ...b, group: s.label }))
                      )
                      .sort((a, b) => b.sessions - a.sessions)
                      .map((row) => (
                        <tr
                          key={`${row.group}-${row.sourceMedium}`}
                          className="border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/5"
                        >
                          <td className="px-4 py-3">
                            <p className="font-mono text-sm font-bold text-[#151515]">
                              {row.sourceMedium}
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold text-[#151515]/45">
                              {row.group}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-black text-[#151515]">
                            {formatNumber(row.sessions)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#151515]/75">
                            {formatNumber(row.activeUsers)}
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
                <ExternalLink className="size-4" />
                Cách đọc số liệu
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-xs font-medium leading-relaxed text-[#151515]/70">
                <li>
                  • <strong className="font-black text-[#151515]">Tổng người dùng</strong> là số
                  người dùng DUY NHẤT, lấy từ một truy vấn tổng riêng của GA4 — không phải
                  tổng của các cột nguồn (một người có thể đến từ nhiều nguồn).
                </li>
                <li>
                  • <strong className="font-black text-[#151515]">Realtime</strong> tính trong 30
                  phút gần nhất và chưa qua xử lý đầy đủ, nên khác (thường nhỏ hơn) số liệu
                  lịch sử.
                </li>
                <li>
                  • <strong className="font-black text-[#151515]">Lịch sử</strong> tính theo
                  ngày theo múi giờ của property (Asia/Saigon). Dữ liệu có thể chưa kịp được
                  GA4 xử lý cho các lượt truy cập vừa xảy ra.
                </li>
                {report?.note ? <li>• {report.note}</li> : null}
              </ul>
            </div>
          </BrutalCard>
        </>
      )}
    </main>
  )
}
