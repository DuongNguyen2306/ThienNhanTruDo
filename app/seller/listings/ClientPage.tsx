'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, ChevronLeft, ChevronRight, Eye, Pencil, MoreHorizontal, Crown } from 'lucide-react'
import { sellerApi, type Listing } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { cn } from '@/lib/utils'

type FilterStatus = 'all' | 'active' | 'pending' | 'inactive' | 'rejected'

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Đang hiển thị', className: 'bg-[#dcfce7] text-[#166534] border-[#86efac]' },
  pending: { label: 'Chờ duyệt', className: 'bg-[#fef9c3] text-[#854d0e] border-[#fde047]' },
  inactive: { label: 'Đã ẩn', className: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]' },
  rejected: { label: 'Từ chối', className: 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]' },
  draft: { label: 'Nháp', className: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]' },
}

const ITEMS_PER_PAGE = 10

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    sellerApi.getListings()
      .then(({ listings: data }) => setListings(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Count by status for tabs
  const counts = useMemo(() => ({
    all: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    pending: listings.filter(l => l.status === 'pending').length,
    inactive: listings.filter(l => l.status === 'inactive').length,
    rejected: listings.filter(l => l.status === 'rejected').length,
  }), [listings])

  // Filter listings
  const filtered = useMemo(() => {
    let result = listings
    if (filter !== 'all') {
      result = result.filter(l => l.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.district?.toLowerCase().includes(q) ||
        l.ward?.toLowerCase().includes(q) ||
        l.street?.toLowerCase().includes(q)
      )
    }
    return result
  }, [listings, filter, search])

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(l => l.id)))
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'active', label: 'Đang hiển thị' },
    { id: 'pending', label: 'Chờ duyệt' },
    { id: 'inactive', label: 'Đã ẩn' },
    { id: 'rejected', label: 'Từ chối' },
  ]

  return (
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <span className="text-[#151515]">Quản lý tin đăng</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-black text-[#151515]">Quản lý tin đăng</h1>
          <p className="mt-1 text-sm text-[#151515]/60">Theo dõi và cập nhật các phòng trọ của bạn</p>
        </div>
        <Link
          href="/seller/listings/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          <Plus className="size-4" />
          Đăng tin mới
        </Link>
      </div>

      {/* Filters + Search Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-sm font-semibold transition-all',
                filter === f.id
                  ? 'border-[#151515] bg-[#151515] text-white'
                  : 'border-[#151515]/30 bg-white text-[#151515] hover:border-[#151515]/60'
              )}
            >
              {f.label}
              <span className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs',
                filter === f.id ? 'bg-white/20' : 'bg-[#151515]/10'
              )}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm tin đăng..."
              className="h-10 w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] pl-10 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 lg:w-64"
            />
          </div>
          <select className="h-10 rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm font-medium shadow-[2px_2px_0_#151515]">
            <option>Mới nhất</option>
            <option>Cũ nhất</option>
            <option>Giá thấp → cao</option>
            <option>Giá cao → thấp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="size-16 rounded-full bg-[#F5F5F0] flex items-center justify-center mb-4">
              <svg className="size-8 text-[#151515]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-[#151515]/60">Chưa có tin đăng nào</p>
            <Link href="/seller/listings/new" className="mt-2 text-sm font-semibold text-[#059669] hover:underline">
              Đăng tin mới
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-[#151515]"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">Tin đăng</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">Giá thuê</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">Ngày đăng</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((listing, idx) => {
                const status = statusConfig[listing.status] || statusConfig.draft
                const isSelected = selectedIds.has(listing.id)
                const address = [listing.houseNumber, listing.street, listing.ward, listing.district]
                  .filter(Boolean).join(', ')

                return (
                  <tr
                    key={listing.id}
                    className={cn(
                      'border-b border-[#151515]/20 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F5F0]/50',
                      isSelected && 'bg-[#FDE047]/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(listing.id)}
                        className="size-4 rounded border-[#151515]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0]">
                          {listing.photos?.[0] || listing.image ? (
                            <Image
                              src={listing.photos[0] || listing.image!}
                              alt={listing.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-[#151515]/30">
                              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                            </div>
                          )}
                          {listing.verified && (
                            <div className="absolute -right-1 -top-1 rounded-full bg-[#059669] p-0.5">
                              <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#151515]">{listing.title}</p>
                          <p className="truncate text-xs text-[#151515]/60">{address || '-'}</p>
                          {listing.status === 'rejected' && listing.rejectReason && (
                            <p className="mt-1 truncate text-xs text-red-500" title={listing.rejectReason}>
                              Lý do: {listing.rejectReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#151515]">
                      {formatVnd(listing.rent)}
                      <span className="text-xs font-normal text-[#151515]/60">/tháng</span>
                    </td>
                    <td className="px-4 py-3 text-[#151515]/60">
                      {formatDate(listing.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        status.className
                      )}>
                        {status.label}
                      </span>
                      {listing.vip && listing.vipExpiresAt && new Date(listing.vipExpiresAt) > new Date() && (
                        <span 
                          className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 px-2.5 py-0.5 text-[11px] font-black text-white border-[1.5px] border-[#151515]"
                          style={{ boxShadow: '0 0 8px 2px rgba(34, 197, 94, 0.4)' }}
                        >
                          <Crown className="size-3" />
                          ⭐ VIP
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/seller/listings/${listing.id}`}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#151515] bg-white px-2.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          <Eye className="size-3.5" />
                          Xem
                        </Link>
                        <Link
                          href={`/seller/listings/${listing.id}/edit`}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#151515] bg-white px-2.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          <Pencil className="size-3.5" />
                          Sửa
                        </Link>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]">
                          <MoreHorizontal className="size-4 text-[#151515]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#151515]/60">
            Đang hiển thị <span className="font-bold text-[#151515]">{Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}</span>
            {' – '}
            <span className="font-bold text-[#151515]">{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span>
            {' trong '}
            <span className="font-bold text-[#151515]">{filtered.length}</span>
            {' tin đăng'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-10 items-center gap-1 rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
              Trước
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl border-[2px] text-sm font-semibold transition-all',
                    p === page
                      ? 'border-[#151515] bg-[#151515] text-white shadow-[2px_2px_0_#FDE047]'
                      : 'border-[#151515]/30 bg-white text-[#151515] hover:border-[#151515]'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-10 items-center gap-1 rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
