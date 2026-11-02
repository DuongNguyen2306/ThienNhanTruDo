'use client'

/**
 * Admin → Financial Overview (PROTOTYPE — dữ liệu GIẢ, tĩnh).
 *
 * MỤC ĐÍCH
 *  Màn hình prototype hiển thị bức tranh tài chính tổng quan của dự án:
 *  doanh thu từ khách hàng Standard, chi phí đăng ký phần mềm (Cursor + Vercel),
 *  chênh lệch dòng tiền và số khách hàng cần có để hòa vốn.
 *
 * DỮ LIỆU
 *  • 100% TĨNH, khai báo trong file này. KHÔNG gọi API, KHÔNG đọc MongoDB,
 *    KHÔNG có backend.
 *  • Các con số là số liệu GIẢ để prototype — KHÔNG tự cập nhật, KHÔNG làm
 *    tròn, KHÔNG tính lại. Muốn đổi thì sửa trực tiếp hằng số bên dưới.
 *
 * PHONG CÁCH
 *  Neo Brutalism của THIÊN NHÃN TRÚ ĐỒ:
 *    • vàng chủ đạo #FDE047 · mực đen #151515 · trắng #FFFFFF
 *    • nền off-white #F5F5F0 · viền đen 3px · bo góc · hard offset shadow
 *  Kết hợp cảm giác dashboard tài chính chuyên nghiệp:
 *    • xanh lá cho Revenue · đỏ cho Cash gap · xanh dương cho biểu đồ
 *    • vàng/cam cho Break-even
 */

import {
  AlertTriangle,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

// ───────────────────────────────────────────────────────────────────────────
// HẰNG SỐ DỮ LIỆU GIẢ (TĨNH)
// ───────────────────────────────────────────────────────────────────────────

/** Badge trạng thái prototype ở header. */
const PROTOTYPE_BADGE = 'Prototype'

/** Chu kỳ báo cáo hiển thị ở header. */
const REPORTING_PERIOD = 'Current reporting period'

/** Tiêu đề phụ của trang. */
const PAGE_SUBTITLE = 'THIÊN NHÃN TRÚ ĐỒ · SELLER MANAGEMENT'

/**
 * KPI tài chính — Section 01.
 *
 * Giữ NGUYÊN tên, giá trị, dấu âm, đơn vị tiền tệ và chú thích.
 */
const KPIS = [
  {
    key: 'revenue',
    label: 'Revenue',
    value: '198.000đ',
    detail: '2 Standard customers',
    accent: 'emerald' as const,
    icon: TrendingUp,
  },
  {
    key: 'costs',
    label: 'Reported costs',
    value: '935.020đ',
    detail: 'Cursor + Vercel / month',
    accent: 'neutral' as const,
    icon: Wallet,
  },
  {
    key: 'gap',
    label: 'Cash gap',
    value: '-737.020đ',
    detail: 'Provisional difference',
    accent: 'red' as const,
    icon: AlertTriangle,
  },
  {
    key: 'customers',
    label: 'Customers',
    value: '2',
    detail: 'Paying landlords',
    accent: 'yellow' as const,
    icon: Users,
  },
]

/**
 * Dữ liệu biểu đồ cột — đúng 3 hạng mục.
 *
 * `value` là số VND thực (không phải chuỗi) để recharts vẽ đúng tỉ lệ;
 * `label` là nhãn hiển thị trên trục X.
 */
const FINANCIAL_CHART_DATA = [
  { label: 'Revenue', value: 198000, display: '198.000đ', color: '#16A34A' },
  { label: 'Cursor', value: 779400, display: '779.400đ', color: '#2563EB' },
  { label: 'Vercel', value: 155620, display: '155.620đ', color: '#2563EB' },
]

/**
 * Các mốc trục Y — theo thiết kế tham chiếu.
 *
 * Dùng `ticks` cố định + domain cố định để trục Y hiển thị đúng các mốc
 * này, không phụ thuộc dữ liệu.
 */
const Y_AXIS_TICKS = [0, 250000, 500000, 750000, 1000000]

/** Nhãn hiển thị cho từng mốc trục Y. */
const Y_AXIS_TICK_FORMATTER = (value: number): string => {
  if (value === 0) return '0 nghìn'
  if (value === 1000000) return '1 N nghìn'
  return `${value / 1000} nghìn`
}

/**
 * Chi tiết chi phí.
 *
 * `ratio` là tỉ lệ thanh progress (0–1) theo thiết kế tham chiếu:
 * Cursor chiếm phần lớn tổng chi phí, Vercel là phần nhỏ còn lại.
 */
const COST_DETAILS = [
  {
    key: 'cursor',
    name: 'Cursor AI',
    amount: '779.400đ',
    usd: '30 USD',
    category: 'Software Development',
    ratio: 0.833,
  },
  {
    key: 'vercel',
    name: 'Vercel',
    amount: '155.620đ',
    usd: '5.99 USD',
    category: 'Hosting / Deployment',
    ratio: 0.167,
  },
]

/**
 * Break-even analysis — Section 04.
 *
 * `progress` = 20% (2 khách hàng hiện tại trên tổng target 10).
 */
const BREAK_EVEN = {
  label: 'Standard buyers needed',
  target: '10 customers',
  current: '2 current customers',
  percentLabel: '20% of target',
  progress: 0.2,
  note: 'Target covers only the two reported software subscriptions, not all business costs.',
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

/** Thẻ KPI — viền đen + hard offset shadow, màu nhấn theo loại số liệu. */
function KpiCard({
  label,
  value,
  detail,
  accent,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  accent: 'emerald' | 'neutral' | 'red' | 'yellow'
  icon: typeof TrendingUp
}) {
  // Màu nhấn theo ngữ nghĩa số liệu.
  const accentStyles: Record<
    'emerald' | 'neutral' | 'red' | 'yellow',
    { value: string; iconWrap: string }
  > = {
    emerald: {
      value: 'text-emerald-600',
      iconWrap: 'bg-emerald-100 text-emerald-700 border-emerald-600',
    },
    neutral: {
      value: 'text-[#151515]',
      iconWrap: 'bg-[#F5F5F0] text-[#151515] border-[#151515]',
    },
    red: {
      value: 'text-red-600',
      iconWrap: 'bg-red-100 text-red-700 border-red-600',
    },
    yellow: {
      value: 'text-[#151515]',
      iconWrap: 'bg-[#FDE047] text-[#151515] border-[#151515]',
    },
  }
  const styles = accentStyles[accent]

  return (
    <div className="rounded-xl border-[3px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#151515]/50">
            {label}
          </p>
          <p
            className={`mt-2 font-mono text-3xl font-black leading-none ${styles.value}`}
          >
            {value}
          </p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] ${styles.iconWrap}`}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#151515]/55">{detail}</p>
    </div>
  )
}

/** Thẻ "dải màu" Neo Brutalism dùng chung cho các section. */
function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] ${className}`}
    >
      {children}
    </div>
  )
}

/** Tiêu đề section — số thứ tự + nhãn. */
function SectionTitle({
  index,
  title,
  right,
}: {
  index: string
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-[#151515] bg-[#FDE047] px-5 py-3">
      <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-[#151515]">
        <span className="font-mono text-xs text-[#151515]/60">{index}</span>
        {title}
      </h2>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  )
}

/** Badge viền đen theo Neo Brutalism. */
function BrutalBadge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'yellow' | 'emerald'
}) {
  const tones = {
    default: 'bg-white text-[#151515]',
    yellow: 'bg-[#FDE047] text-[#151515]',
    emerald: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border-2 border-[#151515] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function AdminFinancialOverviewPage() {
  return (
    <main className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-[#151515] lg:text-3xl">
              Financial Overview
            </h1>
            <BrutalBadge tone="yellow">{PROTOTYPE_BADGE}</BrutalBadge>
          </div>
          <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#151515]/45">
            {PAGE_SUBTITLE}
          </p>
        </div>
        <div className="rounded-xl border-[3px] border-[#151515] bg-white px-4 py-3 shadow-[3px_3px_0_#151515]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#151515]/45">
            Reporting period
          </p>
          <p className="mt-1 text-sm font-black text-[#151515]">{REPORTING_PERIOD}</p>
        </div>
      </div>

      {/* ── Section 01 — Financial performance ──────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-[#151515]">
          <span className="font-mono text-xs text-[#151515]/45">01</span>
          Financial performance
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              detail={kpi.detail}
              accent={kpi.accent}
              icon={kpi.icon}
            />
          ))}
        </div>
      </section>

      {/* ── Biểu đồ tài chính ──────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle index="02" title="Financial chart" />
        <div className="p-5">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={FINANCIAL_CHART_DATA}
                margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#151515" strokeOpacity={0.12} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: '#151515' }}
                  tickMargin={10}
                  tick={{ fill: '#151515', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  ticks={Y_AXIS_TICKS}
                  domain={[0, 1000000]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={78}
                  tick={{
                    fill: '#151515',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  tickFormatter={Y_AXIS_TICK_FORMATTER}
                />
                <Bar
                  dataKey="value"
                  fill="#2563EB"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={96}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chú thích số liệu ngay dưới biểu đồ — giữ nguyên con số. */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {FINANCIAL_CHART_DATA.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border-2 border-[#151515] bg-[#F5F5F0] px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm border border-[#151515]"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#151515]/55">
                    {item.label}
                  </p>
                </div>
                <p className="mt-1.5 font-mono text-lg font-black text-[#151515]">
                  {item.display}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Chi tiết chi phí ───────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle index="03" title="Cost breakdown" />
        <div className="flex flex-col gap-5 p-5">
          {COST_DETAILS.map((cost) => (
            <div key={cost.key} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-sm font-black text-[#151515]">{cost.name}</p>
                  <p className="font-mono text-sm font-bold text-[#151515]/60">
                    {cost.usd}
                  </p>
                  <p className="text-xs font-semibold text-[#151515]/45">
                    {cost.category}
                  </p>
                </div>
                <p className="font-mono text-lg font-black text-[#151515]">
                  {cost.amount}
                </p>
              </div>

              {/* Thanh progress — tỉ lệ theo thiết kế tham chiếu. */}
              <div className="h-3 w-full overflow-hidden rounded-md border-2 border-[#151515] bg-white">
                <div
                  className="h-full bg-[#2563EB]"
                  style={{ width: `${Math.round(cost.ratio * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Section 04 — Break-even analysis ───────────────────────────── */}
      <SectionCard>
        <SectionTitle index="04" title="Break-even analysis" />
        <div className="p-5">
          <div className="flex flex-col gap-4 rounded-xl border-[3px] border-[#151515] bg-[#F5F5F0] p-5 shadow-[3px_3px_0_#151515]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#151515]/50">
                  {BREAK_EVEN.label}
                </p>
                <p className="mt-1.5 font-mono text-3xl font-black text-[#151515]">
                  {BREAK_EVEN.target}
                </p>
              </div>
              <BrutalBadge tone="yellow">Target</BrutalBadge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black text-[#151515]">
                {BREAK_EVEN.current}
              </p>
              <p className="font-mono text-sm font-black text-amber-600">
                {BREAK_EVEN.percentLabel}
              </p>
            </div>

            {/* Thanh tiến độ 20% — tương ứng tỉ lệ trong ảnh tham chiếu. */}
            <div className="h-4 w-full overflow-hidden rounded-md border-[3px] border-[#151515] bg-white">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${Math.round(BREAK_EVEN.progress * 100)}%` }}
              />
            </div>

            <p className="text-xs font-semibold leading-relaxed text-[#151515]/65">
              {BREAK_EVEN.note}
            </p>
          </div>
        </div>
      </SectionCard>
    </main>
  )
}
