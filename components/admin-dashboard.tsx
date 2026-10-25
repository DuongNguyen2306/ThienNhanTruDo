'use client'

/**
 * Admin Dashboard (Tasks 1, 2, 4, 6).
 *
 * ── Design system ──────────────────────────────────────────────────────────
 * Neo Brutalism: yellow #FDE047, black #151515, white + warm off-white
 * #F5F5F0, Be Vietnam Pro, hard 2px borders and offset shadows.
 *
 * ── Data ───────────────────────────────────────────────────────────────────
 * EVERY figure comes from a real API. There are no hard-coded placeholder
 * series: the previous implementation rendered a static `cashflowData` array
 * of invented numbers, which is why the "cash-flow chart" was removed.
 *
 *  • Task 1 — user statistics (real counts, filtered by role)
 *  • Task 2 — revenue (canonical figures, deposits excluded from revenue)
 *  • Task 4 — revenue / user-growth / review-activity charts + date filter
 *  • Task 6 — every metric is a link to the list that produced it
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  XAxis, YAxis,
} from 'recharts'
import {
  AlertTriangle, ArrowUpRight, Banknote, CalendarRange, ChevronDown,
  Download, Eye, Loader2, MessageSquare, RefreshCw, Star, TrendingDown,
  TrendingUp, UserPlus, Users, Wallet, WalletCards,
} from 'lucide-react'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatVnd } from '@/lib/data'
import {
  adminApi,
  type AdminDashboardStats,
  type FinanceChartPoint,
  type RevenueCategory,
  type ReviewActivityPoint,
  type UserGrowthPoint,
} from '@/lib/api'

// ── Chart configs (explicit brutal palette) ────────────────────────────────

const revenueChartConfig = {
  revenue: { label: 'Doanh thu', color: '#FDE047' },
  refunds: { label: 'Hoàn tiền', color: '#151515' },
  deposits: { label: 'Nạp tiền ví', color: '#94A3B8' },
} satisfies ChartConfig

const userGrowthConfig = {
  tenant: { label: 'Người thuê', color: '#FDE047' },
  seller: { label: 'Chủ đăng tin', color: '#151515' },
} satisfies ChartConfig

const reviewActivityConfig = {
  count: { label: 'Số đánh giá', color: '#FDE047' },
  average: { label: 'Điểm trung bình', color: '#151515' },
} satisfies ChartConfig

// ── Date range presets ──────────────────────────────────────────────────────

type RangePreset = '7d' | '30d' | '90d' | 'month' | 'year' | 'custom'

const RANGE_LABELS: Record<Exclude<RangePreset, 'custom'>, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '90d': '90 ngày',
  month: 'Tháng này',
  year: '12 tháng',
}

interface DateRange {
  startDate?: string
  endDate?: string
}

function resolveRange(preset: RangePreset, custom: DateRange): DateRange {
  if (preset === 'custom') return custom
  const now = new Date()
  if (preset === 'month') {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) }
}

// ── Small presentational pieces ────────────────────────────────────────────

/** A metric tile. When `href` is given the whole tile becomes a link (Task 6). */
function MetricTile({
  label,
  value,
  detail,
  href,
  tone = 'white',
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  detail?: string
  href?: string
  tone?: 'white' | 'yellow' | 'dark'
  icon?: React.ElementType
  trend?: { value: number; label: string }
}) {
  const toneClass =
    tone === 'yellow'
      ? 'bg-[#FDE047]'
      : tone === 'dark'
        ? 'bg-[#151515] text-white'
        : 'bg-white'

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[11px] font-bold uppercase tracking-wider ${
            tone === 'dark' ? 'text-white/60' : 'text-[#151515]/50'
          }`}
        >
          {label}
        </p>
        {Icon ? (
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border-2 ${
              tone === 'dark'
                ? 'border-white/30 bg-white/10'
                : 'border-[#151515] bg-[#F5F5F0]'
            }`}
          >
            <Icon className={`size-4 ${tone === 'dark' ? 'text-white' : 'text-[#151515]'}`} />
          </span>
        ) : null}
      </div>

      <p className="mt-2 font-mono text-2xl font-black tabular-nums">{value}</p>

      {trend ? (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
            trend.value >= 0 ? 'text-emerald-700' : 'text-red-600'
          } ${tone === 'dark' ? '!text-white/80' : ''}`}
        >
          {trend.value >= 0 ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          {trend.value >= 0 ? '+' : ''}
          {trend.value} {trend.label}
        </p>
      ) : null}

      {detail ? (
        <p
          className={`mt-1 text-xs ${
            tone === 'dark' ? 'text-white/60' : 'text-[#151515]/55'
          }`}
        >
          {detail}
        </p>
      ) : null}

      {href ? (
        <span
          className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${
            tone === 'dark' ? 'text-[#FDE047]' : 'text-[#151515]/70'
          }`}
        >
          Xem chi tiết <ArrowUpRight className="size-3" />
        </span>
      ) : null}
    </>
  )

  const className = `rounded-xl border-2 border-[#151515] p-4 shadow-[3px_3px_0_#151515] transition-all ${
    toneClass
  } ${href ? 'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]' : ''}`

  if (!href) return <div className={className}>{body}</div>

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  )
}

/** Legend/empty/error wrapper shared by the three charts. */
function ChartFrame({
  loading,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  children,
  height = 'h-[300px]',
}: {
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyMessage: string
  onRetry: () => void
  children: React.ReactNode
  height?: string
}) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${height}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-[#151515]/50">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${height}`}>
        <AlertTriangle className="size-8 text-red-500" />
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg border-2 border-[#151515] bg-white px-3 py-1.5 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <RefreshCw className="size-3.5" />
          Thử lại
        </button>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${height}`}>
        <span className="flex size-11 items-center justify-center rounded-xl border-2 border-[#151515] bg-[#F5F5F0]">
          <Download className="size-5 text-[#151515]/40" />
        </span>
        <p className="text-sm font-medium text-[#151515]/55">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#151515] px-5 py-4">
        <div>
          <h2 className="text-base font-black text-[#151515]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-[#151515]/55">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Main component
// ───────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  // Headline stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Date filtering (Task 4)
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [custom, setCustom] = useState<DateRange>({ startDate: '', endDate: '' })

  // Revenue chart
  const [revenueChart, setRevenueChart] = useState<FinanceChartPoint[]>([])
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [revenueError, setRevenueError] = useState<string | null>(null)
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('day')

  // User growth chart
  const [growth, setGrowth] = useState<UserGrowthPoint[]>([])
  const [growthLoading, setGrowthLoading] = useState(true)
  const [growthError, setGrowthError] = useState<string | null>(null)

  // Review activity chart
  const [reviewActivity, setReviewActivity] = useState<ReviewActivityPoint[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Revenue breakdown (Task 2)
  const [categories, setCategories] = useState<RevenueCategory[]>([])
  const [nonRevenue, setNonRevenue] = useState<RevenueCategory[]>([])
  const [breakdownLoading, setBreakdownLoading] = useState(true)

  const range = useMemo(() => resolveRange(preset, custom), [preset, custom])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await adminApi.getDashboard()
      setStats(data.stats)
      setReviewActivity(data.stats.reviewActivity ?? [])
      setReviewLoading(false)
    } catch (err: any) {
      setStatsError(err?.message || 'Không thể tải chỉ số dashboard')
      setReviewLoading(false)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadRevenueChart = useCallback(async () => {
    setRevenueLoading(true)
    setRevenueError(null)
    try {
      const data = await adminApi.getFinanceChart({
        period: chartPeriod,
        startDate: range.startDate,
        endDate: range.endDate,
      })
      setRevenueChart(data ?? [])
    } catch (err: any) {
      setRevenueError(err?.message || 'Không thể tải biểu đồ doanh thu')
    } finally {
      setRevenueLoading(false)
    }
  }, [chartPeriod, range.startDate, range.endDate])

  const loadGrowth = useCallback(async () => {
    setGrowthLoading(true)
    setGrowthError(null)
    try {
      const data = await adminApi.getUsersGrowth({ period: 'month', buckets: 12 })
      setGrowth(data?.series ?? [])
    } catch (err: any) {
      setGrowthError(err?.message || 'Không thể tải biểu đồ tăng trưởng')
    } finally {
      setGrowthLoading(false)
    }
  }, [])

  const loadBreakdown = useCallback(async () => {
    setBreakdownLoading(true)
    try {
      const data = await adminApi.getFinanceSources({
        startDate: range.startDate,
        endDate: range.endDate,
      })
      setCategories(data?.revenue ?? [])
      setNonRevenue(data?.nonRevenue ?? [])
    } catch {
      setCategories([])
      setNonRevenue([])
    } finally {
      setBreakdownLoading(false)
    }
  }, [range.startDate, range.endDate])

  useEffect(() => {
    loadStats()
    loadGrowth()
  }, [loadStats, loadGrowth])

  useEffect(() => {
    loadRevenueChart()
  }, [loadRevenueChart])

  useEffect(() => {
    loadBreakdown()
  }, [loadBreakdown])

  // Week-over-week user growth (real comparison, not a hard-coded 12.5%).
  const userTrend = useMemo(() => {
    if (!stats) return undefined
    const delta = stats.newUsersThisWeek - stats.newUsersLastWeek
    return { value: delta, label: 'so với tuần trước' }
  }, [stats])

  const hasRevenueData = revenueChart.some((p) => p.revenue > 0 || p.refunds > 0 || p.deposits > 0)
  const hasGrowthData = growth.some((p) => p.total > 0)
  const hasReviewData = reviewActivity.some((p) => p.count > 0)

  // Traceability targets (Task 6)
  const txnHref = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ ...extra })
    if (range.startDate) params.set('startDate', range.startDate)
    if (range.endDate) params.set('endDate', range.endDate)
    return `/admin/finance/transactions?${params.toString()}`
  }

  return (
    <main className="flex flex-col gap-6">
      {/* ── Header + date range filter ─────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#151515]/45">
            Vận hành
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#151515] lg:text-3xl">
            Dashboard điều hành
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Chỉ số người dùng, doanh thu và hoạt động đánh giá — theo dữ liệu thật.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-xl border-2 border-[#151515] bg-white p-1.5 shadow-[2px_2px_0_#151515]">
            {(Object.keys(RANGE_LABELS) as Array<Exclude<RangePreset, 'custom'>>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  preset === key
                    ? 'bg-[#FDE047] text-[#151515] shadow-[1px_1px_0_#151515]'
                    : 'text-[#151515]/60 hover:bg-[#F5F5F0]'
                }`}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                preset === 'custom'
                  ? 'bg-[#FDE047] text-[#151515] shadow-[1px_1px_0_#151515]'
                  : 'text-[#151515]/60 hover:bg-[#F5F5F0]'
              }`}
            >
              <CalendarRange className="size-3.5" />
              Tuỳ chọn
            </button>
          </div>

          {preset === 'custom' ? (
            <div className="flex items-end gap-2 rounded-xl border-2 border-[#151515] bg-white p-2 shadow-[2px_2px_0_#151515]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
                Từ
                <input
                  type="date"
                  value={custom.startDate}
                  onChange={(e) => setCustom((c) => ({ ...c, startDate: e.target.value }))}
                  className="mt-1 block h-8 rounded-lg border-2 border-[#151515]/20 px-2 text-xs focus:border-[#FDE047] focus:outline-none"
                />
              </label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
                Đến
                <input
                  type="date"
                  value={custom.endDate}
                  onChange={(e) => setCustom((c) => ({ ...c, endDate: e.target.value }))}
                  className="mt-1 block h-8 rounded-lg border-2 border-[#151515]/20 px-2 text-xs focus:border-[#FDE047] focus:outline-none"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              loadStats()
              loadRevenueChart()
              loadGrowth()
              loadBreakdown()
            }}
            className="flex size-10 items-center justify-center rounded-xl border-2 border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw className={`size-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statsError ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <AlertTriangle className="size-5 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700">{statsError}</p>
          <button
            type="button"
            onClick={loadStats}
            className="ml-auto rounded-lg border-2 border-[#151515] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_#151515]"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {/* ── TASK 1: user statistics ─────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md border-2 border-[#151515] bg-[#FDE047]">
            <Users className="size-3.5" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#151515]">
            Thống kê người dùng
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statsLoading && !stats ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[132px] animate-pulse rounded-xl border-2 border-[#151515] bg-[#F5F5F0]"
                />
              ))}
            </>
          ) : (
            <>
              <MetricTile
                label="Tổng người dùng"
                value={(stats?.totalUsers ?? 0).toLocaleString('vi-VN')}
                detail={`${stats?.newUsersThisWeek ?? 0} người trong tuần này`}
                href="/admin/users"
                icon={Users}
                tone="yellow"
              />
              <MetricTile
                label="Người thuê"
                value={(stats?.totalTenants ?? 0).toLocaleString('vi-VN')}
                detail={`${stats?.newTenantsThisMonth ?? 0} mới trong tháng`}
                href="/admin/users?role=tenant"
                icon={UserPlus}
              />
              <MetricTile
                label="Chủ đăng tin"
                value={(stats?.totalSellers ?? 0).toLocaleString('vi-VN')}
                detail={`${stats?.newSellersThisMonth ?? 0} mới trong tháng`}
                href="/admin/users?role=seller"
                icon={WalletCards}
              />
              <MetricTile
                label="Ban quản lý"
                value={(stats?.totalManagers ?? 0).toLocaleString('vi-VN')}
                detail={`${stats?.totalAdmins ?? 0} quản trị viên`}
                href="/admin/users?role=manager"
                icon={Users}
              />
              <MetricTile
                label="Người dùng mới tháng này"
                value={(stats?.newUsersThisMonth ?? 0).toLocaleString('vi-VN')}
                detail={userTrend ? `Tuần này ${stats?.newUsersThisWeek ?? 0}` : undefined}
                href="/admin/users"
                icon={TrendingUp}
                trend={userTrend}
              />
            </>
          )}
        </div>
      </section>

      {/* ── TASK 2: revenue ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md border-2 border-[#151515] bg-[#FDE047]">
            <Banknote className="size-3.5" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#151515]">
            Doanh thu
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statsLoading && !stats ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[132px] animate-pulse rounded-xl border-2 border-[#151515] bg-[#F5F5F0]"
                />
              ))}
            </>
          ) : (
            <>
              <MetricTile
                label="Doanh thu ghi nhận"
                value={formatVnd(stats?.totalRevenue ?? 0)}
                detail="Chỉ giao dịch thanh toán hoàn tất"
                href={txnHref({ type: 'payment', status: 'completed' })}
                icon={Banknote}
                tone="yellow"
              />
              <MetricTile
                label="Doanh thu tháng này"
                value={formatVnd(stats?.monthlyRevenue ?? 0)}
                detail={`${stats?.monthlyRevenueCount ?? 0} giao dịch`}
                href={txnHref({ type: 'payment', status: 'completed' })}
                icon={TrendingUp}
              />
              <MetricTile
                label="Doanh thu thuần"
                value={formatVnd(stats?.netRevenue ?? 0)}
                detail={`Trừ ${formatVnd(stats?.totalRefunded ?? 0)} hoàn tiền`}
                href={txnHref({ type: 'refund' })}
                icon={Wallet}
              />
              <MetricTile
                label="Nạp tiền ví (không tính doanh thu)"
                value={formatVnd(stats?.totalDeposits ?? 0)}
                detail="Tiền nạp là nợ phải trả, không phải doanh thu"
                href={txnHref({ type: 'deposit' })}
                icon={WalletCards}
                tone="dark"
              />
              <MetricTile
                label="Giao dịch chờ xử lý"
                value={formatVnd(stats?.pendingAmount ?? 0)}
                detail={`${formatVnd(stats?.failedAmount ?? 0)} thất bại`}
                href={txnHref({ status: 'pending' })}
                icon={AlertTriangle}
              />
            </>
          )}
        </div>
      </section>

      {/* ── TASK 4: revenue chart ───────────────────────────────────────── */}
      <Panel
        title="Biểu đồ doanh thu"
        description="Doanh thu, hoàn tiền và nạp tiền ví được tách riêng — nạp tiền không bao giờ nằm trong chuỗi doanh thu."
        action={
          <div className="flex gap-1.5">
            {(['day', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  chartPeriod === p
                    ? 'bg-[#151515] text-white'
                    : 'text-[#151515]/55 hover:bg-[#F5F5F0]'
                }`}
              >
                {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : p === 'quarter' ? 'Quý' : 'Năm'}
              </button>
            ))}
          </div>
        }
      >
        <ChartFrame
          loading={revenueLoading}
          error={revenueError}
          isEmpty={!hasRevenueData}
          emptyMessage="Không có giao dịch trong khoảng thời gian này."
          onRetry={loadRevenueChart}
        >
          <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
            <AreaChart accessibilityLayer data={revenueChart} margin={{ left: 4, right: 8, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#151515" strokeOpacity={0.12} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#151515' }}
                tickMargin={10}
                tick={{ fontSize: 11, fill: '#151515' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={62}
                tick={{ fontSize: 11, fill: '#151515' }}
                tickFormatter={(v: number) => formatVnd(v).replace(/\s/g, '')}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatVnd(Number(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#151515"
                fill="#FDE047"
                fillOpacity={0.55}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="refunds"
                stroke="#151515"
                fill="#151515"
                fillOpacity={0.12}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="deposits"
                stroke="#94A3B8"
                fill="#94A3B8"
                fillOpacity={0.18}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            </AreaChart>
          </ChartContainer>
        </ChartFrame>
      </Panel>

      {/* ── TASK 4: user growth + review activity ──────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Tăng trưởng người dùng"
          description="Số tài khoản mới theo tháng, phân tách theo vai trò."
          action={
            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60 hover:text-[#151515]"
            >
              <Eye className="size-3.5" />
              Danh sách
            </Link>
          }
        >
          <ChartFrame
            loading={growthLoading}
            error={growthError}
            isEmpty={!hasGrowthData}
            emptyMessage="Chưa có người dùng mới trong 12 tháng qua."
            onRetry={loadGrowth}
          >
            <ChartContainer config={userGrowthConfig} className="h-[280px] w-full">
              <BarChart accessibilityLayer data={growth} margin={{ left: 4, right: 8, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#151515" strokeOpacity={0.12} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: '#151515' }}
                  tickMargin={10}
                  tick={{ fontSize: 11, fill: '#151515' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#151515' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="tenant" stackId="a" fill="#FDE047" stroke="#151515" strokeWidth={1.5} radius={[0, 0, 0, 0]} />
                <Bar dataKey="seller" stackId="a" fill="#151515" stroke="#151515" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </ChartFrame>
        </Panel>

        <Panel
          title="Hoạt động đánh giá website"
          description="Số đánh giá mới và điểm trung bình theo tháng."
          action={
            <Link
              href="/admin/reviews"
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60 hover:text-[#151515]"
            >
              <Eye className="size-3.5" />
              Lịch sử
            </Link>
          }
        >
          <ChartFrame
            loading={reviewLoading}
            error={reviewError}
            isEmpty={!hasReviewData}
            emptyMessage="Chưa có đánh giá website nào."
            onRetry={loadStats}
          >
            <ChartContainer config={reviewActivityConfig} className="h-[280px] w-full">
              <LineChart accessibilityLayer data={reviewActivity} margin={{ left: 4, right: 8, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#151515" strokeOpacity={0.12} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: '#151515' }}
                  tickMargin={10}
                  tick={{ fontSize: 11, fill: '#151515' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#151515' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  domain={[0, 5]}
                  tick={{ fontSize: 11, fill: '#151515' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar yAxisId="left" dataKey="count" fill="#FDE047" stroke="#151515" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="average"
                  stroke="#151515"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#FDE047', stroke: '#151515', strokeWidth: 1.5 }}
                />
              </LineChart>
            </ChartContainer>
          </ChartFrame>
        </Panel>
      </div>

      {/* ── TASK 2: revenue breakdown by category ───────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel
            title="Phân bổ doanh thu theo nhóm sản phẩm"
            description="Chỉ tính giao dịch thanh toán hoàn tất. Các nhóm không phải doanh thu được tách riêng bên dưới."
          >
            {breakdownLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-[#151515]/40" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <Banknote className="size-9 text-[#151515]/20" />
                <p className="text-sm font-medium text-[#151515]/55">
                  Chưa có doanh thu trong khoảng thời gian này.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {categories.map((c) => (
                  <li key={c.category}>
                    <Link
                      href={txnHref({ type: 'payment', status: 'completed' })}
                      className="group flex items-center gap-3 rounded-xl border-2 border-[#151515]/15 bg-[#F5F5F0] p-3 transition hover:border-[#151515] hover:bg-[#FDE047]/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-bold text-[#151515]">
                            {c.label ?? c.category}
                          </p>
                          <p className="shrink-0 font-mono text-sm font-black tabular-nums">
                            {formatVnd(c.total)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#151515]/10">
                            <div
                              className="h-full rounded-full bg-[#FDE047] ring-1 ring-inset ring-[#151515]"
                              style={{ width: `${Math.max(2, c.percentage)}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] font-bold text-[#151515]/60">
                            {c.percentage}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#151515]/50">
                          {c.count} giao dịch
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="Đánh giá website"
          description="Điểm trung bình và số đánh giá đang hiển thị."
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#151515] bg-[#FDE047] p-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border-2 border-[#151515] bg-white">
              <Star className="size-5 fill-[#FDE047] text-[#151515]" />
            </span>
            <p className="font-mono text-4xl font-black tabular-nums">
              {(stats?.websiteReviewAverage ?? 0).toFixed(1)}
            </p>
            <p className="text-xs font-semibold text-[#151515]/60">
              trên 5 · {stats?.websiteReviewCount ?? 0} đánh giá
            </p>
            <Link
              href="/admin/reviews?type=website"
              className="mt-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515] underline"
            >
              Xem lịch sử đánh giá <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border-2 border-[#151515]/15 bg-[#F5F5F0] px-3 py-2">
              <span className="flex items-center gap-2 font-medium text-[#151515]/70">
                <MessageSquare className="size-4" />
                Đánh giá phòng
              </span>
              <span className="font-mono font-bold tabular-nums">
                {stats?.roomReviewCount ?? 0}
              </span>
            </div>

            {nonRevenue.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-lg border-2 border-dashed border-[#151515]/20 px-3 py-2"
              >
                <span className="truncate font-medium text-[#151515]/55">{c.label ?? c.category}</span>
                <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-[#151515]/45">
                  {formatVnd(c.total)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  )
}
