'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, ChevronLeft, ChevronRight, FileText,
  Clock, CheckCircle2, XCircle, AlertTriangle,
  ArrowUpDown, Eye, AlertCircle, Users
} from 'lucide-react'
import { adminApi } from '@/lib/api'

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

// ─── Type Config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  inspection: { label: 'Kiểm tra', icon: Eye, class: 'bg-blue-100 text-blue-700 border-blue-200' },
  warning: { label: 'Cảnh cáo', icon: AlertCircle, class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  suspension_request: { label: 'Yêu cầu đình chỉ', icon: AlertTriangle, class: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  low: { label: 'Thấp', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Trung bình', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'Cao', class: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  draft: { label: 'Bản nháp', icon: FileText, class: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { label: 'Chờ duyệt', icon: Clock, class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: 'Đã chấp thuận', icon: CheckCircle2, class: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Đã từ chối', icon: XCircle, class: 'bg-red-100 text-red-700 border-red-200' },
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, highlight }: { icon: any; label: string; value: number; color: string; highlight?: string }) {
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

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ type, config, children }: { type: string; config: Record<string, any>; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border ${config[type]?.class || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {children}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminProposalsPage() {
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch proposals ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        adminApi.getProposals({
          search: debouncedSearch,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          priority: priorityFilter || undefined,
          page: pagination.page,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder,
        }),
        adminApi.getProposalStats(),
      ])
      setProposals(proposalsRes.proposals)
      setPagination(proposalsRes.pagination)
      setStats(statsRes)
    } catch (err: any) {
      console.error('[AdminProposals] Fetch error:', err)
      if (err.message?.includes('Token')) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setError('Không thể tải danh sách đề xuất. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, typeFilter, priorityFilter, pagination.page, sortOrder])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }))
  }, [debouncedSearch, statusFilter, typeFilter, priorityFilter])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-black text-[#151515] lg:text-3xl"
          
        >
          ĐỀ XUẤT XỬ LÝ TÀI KHOẢN
        </h1>
        <p className="mt-1 text-sm font-medium text-[#151515]/50">
          Xem xét các đề xuất từ ban quản lý và đưa ra quyết định phù hợp
        </p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard icon={FileText} label="Tổng đề xuất" value={stats.total} color="bg-[#F5F5F0]" />
          <StatCard icon={Clock} label="Chờ duyệt" value={stats.pending} color="bg-yellow-50" />
          <StatCard icon={CheckCircle2} label="Đã chấp thuận" value={stats.approved} color="bg-green-50" />
          <StatCard icon={XCircle} label="Đã từ chối" value={stats.rejected} color="bg-red-50" />
          <StatCard icon={Users} label="Bản nháp" value={stats.draft} color="bg-gray-50" />
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
            placeholder="Tìm tài khoản hoặc mã đề xuất..."
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
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã chấp thuận</option>
          <option value="rejected">Đã từ chối</option>
          <option value="draft">Bản nháp</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả loại</option>
          <option value="inspection">Kiểm tra</option>
          <option value="warning">Cảnh cáo</option>
          <option value="suspension_request">Yêu cầu đình chỉ</option>
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả ưu tiên</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
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
              onClick={fetchData}
              className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <FileText className="size-12 text-[#151515]/20" />
            <p className="text-sm font-medium text-[#151515]/50">
              {search || statusFilter || typeFilter || priorityFilter
                ? 'Không có đề xuất phù hợp với bộ lọc'
                : 'Chưa có đề xuất nào'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Mã đề xuất
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Tài khoản
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Manager gửi
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Loại
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Ưu tiên
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Ngày gửi
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Trạng thái
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
                  onClick={() => router.push(`/admin/account-proposals/${proposal.id}`)}
                >
                  {/* ID */}
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs text-[#151515]/60">
                      {proposal.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  {/* Target User */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-xs font-black text-[#151515]/60">
                        {proposal.targetUser.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#151515] line-clamp-1">{proposal.targetUser.fullName}</p>
                        <p className="text-xs text-[#151515]/50">{proposal.targetUser.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  {/* Manager */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047] text-xs font-bold text-[#151515]">
                        {proposal.manager.initials || proposal.manager.fullName.slice(0, 1)}
                      </div>
                      <span className="font-medium text-[#151515]">{proposal.manager.fullName}</span>
                    </div>
                  </td>
                  {/* Type */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border ${
                      TYPE_CONFIG[proposal.type]?.class || 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {TYPE_CONFIG[proposal.type]?.label || proposal.type}
                    </span>
                  </td>
                  {/* Priority */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border ${
                      PRIORITY_CONFIG[proposal.priority]?.class || 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {PRIORITY_CONFIG[proposal.priority]?.label || proposal.priority}
                    </span>
                  </td>
                  {/* Date */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-[#151515]/60">
                      {proposal.submittedAt
                        ? new Date(proposal.submittedAt).toLocaleDateString('vi-VN')
                        : new Date(proposal.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border ${
                      STATUS_CONFIG[proposal.status]?.class || 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {proposal.status === 'pending' && <Clock className="size-3" />}
                      {proposal.status === 'approved' && <CheckCircle2 className="size-3" />}
                      {proposal.status === 'rejected' && <XCircle className="size-3" />}
                      {proposal.status === 'draft' && <FileText className="size-3" />}
                      {STATUS_CONFIG[proposal.status]?.label || proposal.status}
                    </span>
                  </td>
                  {/* Action */}
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/account-proposals/${proposal.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
                    >
                      Xem →
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
