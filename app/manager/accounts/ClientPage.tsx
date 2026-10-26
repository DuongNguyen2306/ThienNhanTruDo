'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, ChevronLeft, ChevronRight, Users,
  UserCheck, Building2, Clock, ChevronDown, ArrowUpDown
} from 'lucide-react'
import { managerApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Account {
  id: string
  fullName: string
  phone: string
  phoneRaw?: string
  email: string | null
  role: 'tenant' | 'seller'
  initials: string
  createdAt: string
  sellerStatus: string | null
  listingsCount: number
  appointmentsCount: number
  reportsCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  total: number
  tenants: number
  sellers: number
  pendingReviews: number
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
      Người thuê
    </span>
  )
  const configs: Record<string, { label: string; class: string }> = {
    pending: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    active: { label: 'Đã duyệt', class: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'Từ chối', class: 'bg-red-100 text-red-700 border-red-200' },
  }
  const config = configs[status] || { label: status, class: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border ${config.class}`}>
      {status === 'active' && <UserCheck className="size-3" />}
      {status === 'pending' && <Clock className="size-3" />}
      {config.label}
    </span>
  )
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

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border-[1.5px] ${
      role === 'seller'
        ? 'bg-[#FDE047] text-[#151515] border-[#151515]'
        : 'bg-blue-50 text-blue-700 border-blue-200'
    }`}>
      {role === 'seller' ? <Building2 className="size-3" /> : <Users className="size-3" />}
      {role === 'seller' ? 'Chủ trọ' : 'Người thuê'}
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ManagerAccountsPage() {
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch accounts ─────────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsRes, statsRes] = await Promise.all([
        managerApi.getAccounts({
          search: debouncedSearch,
          role: roleFilter || undefined,
          page: pagination.page,
          limit: 20,
          sortBy,
          sortOrder,
        }),
        managerApi.getAccountStats(),
      ])
      setAccounts(accountsRes.accounts)
      setPagination(accountsRes.pagination)
      setStats(statsRes)
    } catch (err) {
      console.error('[ManagerAccounts] Fetch error:', err)
      setError('Không thể tải danh sách tài khoản. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter, pagination.page, sortBy, sortOrder])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }))
  }, [debouncedSearch, roleFilter])

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
      <div>
        <h1
          className="text-2xl font-black text-[#151515] lg:text-3xl"
          
        >
          QUẢN LÝ TÀI KHOẢN
        </h1>
        <p className="mt-1 text-sm font-medium text-[#151515]/50">
          Xem và quản lý tài khoản Người thuê, Chủ trọ trên hệ thống
        </p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Tổng tài khoản" value={stats.total} color="bg-[#F5F5F0]" />
          <StatCard icon={Users} label="Người thuê" value={stats.tenants} color="bg-blue-50" />
          <StatCard icon={Building2} label="Chủ trọ" value={stats.sellers} color="bg-[#FDE047]" />
          <StatCard icon={Clock} label="Cần xem xét" value={stats.pendingReviews} color="bg-yellow-50" />
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
            placeholder="Tìm theo tên, số điện thoại..."
            className="h-10 w-full rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] pl-10 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 transition"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả vai trò</option>
          <option value="tenant">Người thuê</option>
          <option value="seller">Chủ trọ</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border-[2px] border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none transition cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đã duyệt</option>
          <option value="pending">Chờ duyệt</option>
          <option value="rejected">Từ chối</option>
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
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchAccounts}
              className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Users className="size-12 text-[#151515]/20" />
            <p className="text-sm font-medium text-[#151515]/50">Chưa có tài khoản phù hợp</p>
          </div>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3">
                  <button
                    onClick={() => toggleSort('fullName')}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50 hover:text-[#151515]"
                  >
                    Tài khoản
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Vai trò
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  <button
                    onClick={() => toggleSort('listingsCount')}
                    className="flex items-center gap-1 hover:text-[#151515]"
                  >
                    Tin đăng
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Lịch hẹn
                </th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => toggleSort('createdAt')}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50 hover:text-[#151515]"
                  >
                    Ngày tham gia
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="cursor-pointer border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/10 transition"
                  onClick={() => router.push(`/manager/accounts/${account.id}`)}
                >
                  {/* Avatar + Name */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-xs font-black text-[#151515]">
                        {account.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-[#151515] line-clamp-1">{account.fullName}</p>
                        <p className="text-xs text-[#151515]/50">{account.phone}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-4 py-4">
                    <RoleBadge role={account.role} />
                  </td>
                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={account.sellerStatus} />
                  </td>
                  {/* Listings count */}
                  <td className="px-4 py-4">
                    <span className="font-semibold text-[#151515]">{account.listingsCount}</span>
                  </td>
                  {/* Appointments count */}
                  <td className="px-4 py-4">
                    <span className="font-semibold text-[#151515]">{account.appointmentsCount}</span>
                  </td>
                  {/* Join date */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-[#151515]/60">
                      {new Date(account.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  {/* Action */}
                  <td className="px-4 py-4">
                    <Link
                      href={`/manager/accounts/${account.id}`}
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
            Hiển thị <span className="font-semibold text-[#151515]">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong <span className="font-semibold text-[#151515]">{pagination.total}</span> tài khoản
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
