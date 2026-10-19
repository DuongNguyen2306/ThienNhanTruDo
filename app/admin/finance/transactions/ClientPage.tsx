'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, XCircle, 
  RefreshCw, ExternalLink, ChevronLeft, ChevronRight,
  Search, Filter, Download, Loader2, FileText, AlertCircle,
  CreditCard, User, Calendar, ReceiptText, ShieldCheck, TrendingUp, Wallet
} from 'lucide-react'
import { adminApi, type Transaction } from '@/lib/api'
import { formatVnd } from '@/lib/data'

// Types
interface TransactionFilters {
  search: string
  status: string
  type: string
  startDate: string
  endDate: string
  sortOrder: 'asc' | 'desc'
}

// Transaction summary stats
interface TransactionStats {
  totalCount: number
  completedCount: number
  pendingCount: number
  failedCount: number
  totalAmount: number
  completedAmount: number
}

// Anomaly detection types
interface Anomaly {
  type: 'duplicate_ref' | 'stale_pending' | 'inconsistent_status' | 'missing_amount'
  severity: 'warning' | 'error'
  message: string
  transactionId: string
}

// Anomaly badge
function AnomalyBadge({ type, severity }: { type: string; severity: string }) {
  if (severity === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 border border-red-200">
        <AlertCircle className="size-3" />
        Bất thường
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">
      <AlertTriangle className="size-3" />
      Cần kiểm tra
    </span>
  )
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="size-3" />
          Thành công
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="size-3" />
          Đang xử lý
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 border border-red-200">
          <XCircle className="size-3" />
          Thất bại
        </span>
      )
    case 'refunded':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
          <RefreshCw className="size-3" />
          Đã hoàn tiền
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
          {status}
        </span>
      )
  }
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  bgColor,
  textColor = '[#151515]'
}: { 
  label: string
  value: string | number
  icon: React.ElementType
  bgColor: string
  textColor?: string
}) {
  return (
    <div className={`rounded-xl border-2 border-[#151515] ${bgColor} p-4 shadow-[3px_3px_0_#151515]`}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border-2 border-[#151515] bg-white">
          <Icon className="size-5 text-[#151515]" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">{label}</p>
          <p className={`font-mono text-xl font-black ${textColor}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function TransactionManagementPage() {
  const router = useRouter()

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1, limit: 20, total: 0, totalPages: 0
  })
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<TransactionStats | null>(null)

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: '',
    type: '',
    startDate: '',
    endDate: '',
    sortOrder: 'desc'
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getTransactions({
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        page: pagination.page,
        limit: 20,
      })
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch (e: any) {
      console.error('Fetch error:', e)
      setError('Không thể tải danh sách giao dịch')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filters.status, filters.type, pagination.page])

  // Fetch stats from overview API
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await adminApi.getFinanceOverview()
      setStats({
        totalCount: data.transactionCount,
        completedCount: data.completedCount,
        pendingCount: data.pendingCount,
        failedCount: 0, // Not available in overview
        totalAmount: data.totalRevenue + data.totalRefunded,
        completedAmount: data.netRevenue,
      })
    } catch (e) {
      // Fallback stats calculation from transactions
      console.error('Stats fetch failed, using transaction data:', e)
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Detect anomalies
  const detectAnomalies = useCallback((txs: Transaction[]) => {
    const detected: Anomaly[] = []
    const refCounts: Record<string, string[]> = {}

    txs.forEach((tx) => {
      // Check duplicate references
      if (tx.vnpayTxRef) {
        if (!refCounts[tx.vnpayTxRef]) refCounts[tx.vnpayTxRef] = []
        refCounts[tx.vnpayTxRef].push(tx.id)
      }

      // Check stale pending transactions (older than 24h)
      if (tx.status === 'pending') {
        const createdAt = new Date(tx.createdAt)
        const now = new Date()
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
        if (hoursDiff > 24) {
          detected.push({
            type: 'stale_pending',
            severity: 'warning',
            message: `Giao dịch chờ xử lý hơn ${Math.floor(hoursDiff)} giờ`,
            transactionId: tx.id
          })
        }
      }
    })

    // Check for duplicate references
    Object.entries(refCounts).forEach(([ref, ids]) => {
      if (ids.length > 1) {
        detected.push({
          type: 'duplicate_ref',
          severity: 'error',
          message: `Mã tham chiếu VNPay "${ref}" xuất hiện ${ids.length} lần`,
          transactionId: ids[0]
        })
      }
    })

    setAnomalies(detected)
  }, [])

  useEffect(() => {
    fetchStats()
    fetchTransactions()
  }, [fetchStats, fetchTransactions])

  useEffect(() => {
    if (transactions.length > 0) {
      detectAnomalies(transactions)
    }
  }, [transactions, detectAnomalies])

  // Reset page when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }))
  }, [debouncedSearch, filters.status, filters.type])

  // Export CSV
  const exportCSV = () => {
    setExporting(true)
    try {
      const headers = ['Mã GD', 'Mã VNPay', 'Người dùng', 'Loại', 'Số tiền (VND)', 'Trạng thái', 'Ngày tạo']
      const rows = transactions.map(t => [
        t.id || '',
        t.vnpayTxRef || '',
        (t as any).user?.fullName || 'N/A',
        t.type || '',
        t.amount || 0,
        t.status || '',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : ''
      ])

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const BOM = '\ufeff'
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thiennhan-transactions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert('Không thể xuất báo cáo')
    } finally {
      setExporting(false)
    }
  }

  // Get anomalies for a transaction
  const getTransactionAnomalies = (txId: string) => 
    anomalies.filter(a => a.transactionId === txId)

  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">
            Quản lý giao dịch
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Theo dõi và đối soát tất cả giao dịch thanh toán
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Transaction Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border-2 border-[#151515] bg-[#F5F5F0]" />
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Tổng giao dịch"
              value={stats.totalCount.toLocaleString('vi-VN')}
              icon={ReceiptText}
              bgColor="bg-white"
            />
            <StatCard
              label="Thành công"
              value={stats.completedCount.toLocaleString('vi-VN')}
              icon={CheckCircle2}
              bgColor="bg-emerald-50"
              textColor="text-emerald-700"
            />
            <StatCard
              label="Đang xử lý"
              value={stats.pendingCount.toLocaleString('vi-VN')}
              icon={Clock}
              bgColor="bg-amber-50"
              textColor="text-amber-700"
            />
            <StatCard
              label="Thất bại"
              value={stats.failedCount.toLocaleString('vi-VN')}
              icon={XCircle}
              bgColor="bg-red-50"
              textColor="text-red-600"
            />
            <StatCard
              label="Tổng giá trị"
              value={formatVnd(stats.totalAmount)}
              icon={TrendingUp}
              bgColor="bg-[#FDE047]"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Tổng giao dịch"
              value={pagination.total.toLocaleString('vi-VN')}
              icon={ReceiptText}
              bgColor="bg-white"
            />
            <StatCard
              label="Trang"
              value={`${pagination.page}/${pagination.totalPages || 1}`}
              icon={CheckCircle2}
              bgColor="bg-[#F5F5F0]"
            />
            <StatCard
              label="Đang xử lý"
              value="-"
              icon={Clock}
              bgColor="bg-[#F5F5F0]"
            />
            <StatCard
              label="Thất bại"
              value="-"
              icon={XCircle}
              bgColor="bg-[#F5F5F0]"
            />
            <StatCard
              label="Tổng giá trị"
              value="-"
              icon={TrendingUp}
              bgColor="bg-[#F5F5F0]"
            />
          </>
        )}
      </div>

      {/* Anomalies Alert */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                Phát hiện {anomalies.length} giao dịch bất thường
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                {anomalies.slice(0, 3).map((a, i) => (
                  <li key={i}>• {a.message}</li>
                ))}
                {anomalies.length > 3 && (
                  <li className="font-medium">... và {anomalies.length - 3} bất thường khác</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Tìm mã GD, mã VNPay..."
            className="h-10 w-full rounded-lg border-2 border-[#151515]/20 bg-[#F5F5F0] pl-10 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 transition"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="completed">Thành công</option>
          <option value="pending">Đang xử lý</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
          className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả loại</option>
          <option value="payment">Thanh toán</option>
          <option value="deposit">Nạp tiền</option>
          <option value="withdrawal">Rút tiền</option>
          <option value="refund">Hoàn tiền</option>
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm text-[#151515] focus:border-[#FDE047] focus:outline-none"
          />
          <span className="text-[#151515]/40">-</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm text-[#151515] focus:border-[#FDE047] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="size-8 animate-spin text-[#151515]/40" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <AlertTriangle className="size-12 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchTransactions}
              className="rounded-lg border-2 border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <ReceiptText className="size-12 text-[#151515]/20" />
            <p className="text-sm font-medium text-[#151515]/50">
              {filters.search || filters.status || filters.type
                ? 'Không có giao dịch phù hợp với bộ lọc'
                : 'Chưa có giao dịch nào'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Mã GD
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Mã VNPay
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Người thanh toán
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Loại
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const txAnomalies = getTransactionAnomalies(tx.id)
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/5"
                  >
                    {/* ID */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{tx.id?.slice(-12).toUpperCase()}</span>
                        {txAnomalies.length > 0 && (
                          <AnomalyBadge type={txAnomalies[0].type} severity={txAnomalies[0].severity} />
                        )}
                      </div>
                    </td>
                    {/* VNPay Ref */}
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-[#151515]/60">
                        {tx.vnpayTxRef || '-'}
                      </span>
                    </td>
                    {/* User */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg border-2 border-[#151515] bg-[#F5F5F0] text-xs font-bold text-[#151515]/60">
                          {(tx as any).user?.fullName?.slice(0, 1) || '?'}
                        </div>
                        <span className="font-medium">{(tx as any).user?.fullName || 'N/A'}</span>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-4">
                      <span className="capitalize">{tx.type || '-'}</span>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-4">
                      <span className="font-mono font-bold">{formatVnd(tx.amount || 0)}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={tx.status || 'unknown'} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-4">
                      <span className="text-[#151515]/60">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </span>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => router.push(`/admin/finance/transactions/${tx.id}`)}
                        className="rounded-lg border-2 border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#151515]/50">
            Hiển thị <span className="font-semibold text-[#151515]">
              {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
            </span> trong <span className="font-semibold text-[#151515]">{pagination.total}</span> giao dịch
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="flex size-9 items-center justify-center rounded-lg border-2 border-[#151515] bg-white text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 text-sm font-medium">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex size-9 items-center justify-center rounded-lg border-2 border-[#151515] bg-white text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* VNPay Security Note */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">Về đối soát VNPay</p>
            <p className="mt-1 text-sm text-blue-700">
              Hệ thống hiện tại kiểm tra chữ ký VNPay (signature verification) và chống xử lý trùng (idempotency check) 
              trong IPN endpoint. Tuy nhiên, để thực hiện đối soát thực sự với dữ liệu VNPay, cần có API tra cứu 
              giao dịch từ VNPay Merchant Portal hoặc file đối soát hàng ngày.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
