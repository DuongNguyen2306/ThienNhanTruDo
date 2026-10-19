'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, ChevronLeft, ChevronRight, FileWarning,
  Clock, CheckCircle2, XCircle, FileText, AlertTriangle,
  ArrowUpDown, Eye, ChevronDown
} from 'lucide-react'
import { managerApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proposal {
  id: string
  type: string
  reason: string
  description: string | null
  priority: string
  status: string
  evidenceCount: number
  createdAt: string
  submittedAt: string | null
  reviewedAt: string | null
  manager: { id: string; fullName: string; initials: string }
  targetUser: { id: string; fullName: string; role: string; phone: string | null }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
}

// ─── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    low: { label: 'Thấp', class: 'bg-blue-100 text-blue-700 border-blue-300' },
    medium: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    high: { label: 'Cao', class: 'bg-red-100 text-red-700 border-red-300' },
  }
  const config = configs[priority] || { label: priority, class: 'bg-gray-100 text-gray-700 border-gray-300' }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold border ${config.class}`}>
      {config.label}
    </span>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: any; class: string }> = {
    draft: { label: 'Bản nháp', icon: FileText, class: 'bg-gray-100 text-gray-700 border-gray-300' },
    pending: { label: 'Chờ xử lý', icon: Clock, class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    approved: { label: 'Đã duyệt', icon: CheckCircle2, class: 'bg-green-100 text-green-700 border-green-300' },
    rejected: { label: 'Từ chối', icon: XCircle, class: 'bg-red-100 text-red-700 border-red-300' },
  }
  const config = configs[status] || { label: status, icon: Clock, class: 'bg-gray-100 text-gray-700 border-gray-300' }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border ${config.class}`}>
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

// ─── Type Label ──────────────────────────────────────────────────────────────
function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    inspection: 'Kiểm tra tài khoản',
    warning: 'Cảnh báo tài khoản',
    suspension_request: 'Đề nghị khóa tài khoản',
  }
  return <span className="text-sm text-[#151515]">{labels[type] || type}</span>
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
      <div className={`flex size-12 items-center justify-center rounded-lg border-[2px] border-[#151515] ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-[#151515]">{value.toLocaleString('vi-VN')}</p>
        <p className="text-xs font-medium text-[#151515]/50">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AccountProposalsPage() {
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────────────────
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch proposals ─────────────────────────────────────────────────────────
  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        managerApi.getProposals({
          search: debouncedSearch,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          priority: priorityFilter || undefined,
          page: pagination.page,
          limit: 20,
          sortBy,
          sortOrder,
        }),
        managerApi.getProposalStats(),
      ])
      setProposals(proposalsRes.proposals)
      setPagination(proposalsRes.pagination)
      setStats(statsRes)
    } catch (err) {
      console.error('[AccountProposals] Fetch error:', err)
      setError('Không thể tải danh sách đề xuất. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, typeFilter, priorityFilter, pagination.page, sortBy, sortOrder])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }))
  }, [debouncedSearch, statusFilter, typeFilter, priorityFilter])

  // ── Toggle sort ────────────────────────────────────────────────────────────
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(s => s === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-black text-[#151515] lg:text-3xl"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          >
            ĐỀ XUẤT XỬ LÝ TÀI KHOẢN
          </h1>
          <p className="mt-1 text-sm font-medium text-[#151515]/50">
            Gửi đề xuất xử lý tài khoản vi phạm cho Admin xem xét
          </p>
        </div>
        <Link
          href="/manager/account-proposals/new"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#FBBF24]"
        >
          <Plus className="size-4" />
          Tạo đề xuất mới
        </Link>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard icon={FileWarning} label="Tổng đề xuất" value={stats.total} color="bg-[#F5F5F0]" />
          <StatCard icon={FileText} label="Bản nháp" value={stats.draft} color="bg-gray-100" />
          <StatCard icon={Clock} label="Chờ xử lý" value={stats.pending} color="bg-yellow-100" />
          <StatCard icon={CheckCircle2} label="Đã duyệt" value={stats.approved} color="bg-green-100" />
          <StatCard icon={XCircle} label="Đã từ chối" value={stats.rejected} color="bg-red-100" />
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên tài khoản..."
            className="h-10 w-full rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] pl-10 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 transition"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="pending">Chờ xử lý</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả loại</option>
          <option value="inspection">Kiểm tra tài khoản</option>
          <option value="warning">Cảnh báo tài khoản</option>
          <option value="suspension_request">Đề nghị khóa</option>
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả mức ưu tiên</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {loading ? (
          <div className="flex flex-col gap-4 p-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="size-10 animate-pulse rounded-xl bg-[#F5F5F0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-[#F5F5F0]" />
                  <div className="h-3 w-24 animate-pulse rounded bg-[#F5F5F0]" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded bg-[#F5F5F0]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <AlertTriangle className="size-12 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchProposals}
              className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
            <FileWarning className="size-16 text-[#151515]/20" />
            <p className="text-lg font-semibold text-[#151515]/60">Chưa có đề xuất xử lý nào</p>
            <p className="text-sm text-[#151515]/40">Tạo đề xuất mới để báo cáo tài khoản vi phạm cho Admin</p>
            <Link
              href="/manager/account-proposals/new"
              className="mt-4 flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#FBBF24]"
            >
              <Plus className="size-4" />
              Tạo đề xuất mới
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3">
                  <button
                    onClick={() => toggleSort('createdAt')}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50 hover:text-[#151515]"
                  >
                    Thời gian
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Tài khoản
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Loại đề xuất
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Mức ưu tiên
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Bằng chứng
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr
                  key={proposal.id}
                  className="cursor-pointer border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/10 transition"
                  onClick={() => router.push(`/manager/account-proposals/${proposal.id}`)}
                >
                  {/* Time */}
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#151515]">
                        {new Date(proposal.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-[#151515]/50">
                        {new Date(proposal.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </td>
                  {/* Target User */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047] text-xs font-black text-[#151515]">
                        {proposal.targetUser.fullName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#151515] line-clamp-1">{proposal.targetUser.fullName}</p>
                        <p className="text-xs text-[#151515]/50">{proposal.targetUser.phone}</p>
                      </div>
                    </div>
                  </td>
                  {/* Type */}
                  <td className="px-4 py-4">
                    <TypeLabel type={proposal.type} />
                  </td>
                  {/* Priority */}
                  <td className="px-4 py-4">
                    <PriorityBadge priority={proposal.priority} />
                  </td>
                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={proposal.status} />
                  </td>
                  {/* Evidence Count */}
                  <td className="px-4 py-4">
                    {proposal.evidenceCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#151515]">
                        <FileText className="size-4 text-[#151515]/50" />
                        {proposal.evidenceCount} báo cáo
                      </span>
                    ) : (
                      <span className="text-sm text-[#151515]/40">-</span>
                    )}
                  </td>
                  {/* Action */}
                  <td className="px-4 py-4">
                    <Link
                      href={`/manager/account-proposals/${proposal.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
                    >
                      <Eye className="size-3" />
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#151515]/50">
            Hiển thị <span className="font-semibold text-[#151515]">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong <span className="font-semibold text-[#151515]">{pagination.total}</span> đề xuất
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page <= 1}
              className="flex size-9 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-white text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                    className={`flex size-9 items-center justify-center rounded-lg border-[2px] text-sm font-semibold transition ${
                      pagination.page === pageNum
                        ? 'border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                        : 'border-[#151515]/20 bg-white text-[#151515] hover:border-[#151515]/50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex size-9 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-white text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
