'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Trash2, Search, Filter, Home, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { adminApi, type Listing } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Đang hiển thị', className: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  inactive: { label: 'Đã ẩn', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: XCircle },
  rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle },
  draft: { label: 'Nháp', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: Home },
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    adminApi.getListings({ search: search || undefined, status: statusFilter || undefined })
      .then(({ listings }) => setListings(listings))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, statusFilter])

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Quản lý tin đăng</h1>
          <p className="text-sm text-[#151515]/60">Xem và kiểm duyệt tất cả tin đăng trên nền tảng</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, địa chỉ..."
            className="h-10 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FDE047]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border-[2px] border-[#151515] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FDE047]"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="active">Đang hiển thị</option>
          <option value="inactive">Đã ẩn</option>
          <option value="rejected">Bị từ chối</option>
          <option value="draft">Nháp</option>
        </select>
      </div>

      {/* Listings Table */}
      <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-[#151515]/40">
              <Home className="size-12" />
              <p className="mt-2 text-sm">Không có tin đăng nào</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Tin đăng</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Giá</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Diện tích</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Trạng thái</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Ngày tạo</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/60 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const status = statusConfig[listing.status] || statusConfig.draft
                  const StatusIcon = status.icon
                  return (
                    <tr key={listing.id} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-[#151515]">{listing.title}</p>
                          <p className="text-xs text-[#151515]/60">
                            {listing.street && listing.ward ? `${listing.street}, ${listing.ward}` : '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#151515]">{formatVnd(listing.rent)}</span>
                        <span className="text-xs text-[#151515]/60">/tháng</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[#151515]">{listing.area || '-'} m²</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                          status.className
                        )}>
                          <StatusIcon className="size-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#151515]/60">
                        {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/listings/${listing.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px]"
                          >
                            <Eye className="size-3.5" />
                            Chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
