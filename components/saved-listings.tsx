'use client'

// "Tin đã lưu" list, shared by /da-luu (all roles) and /tai-khoan/da-luu (tenant account area).

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, Check, Loader2, AlertCircle, Maximize2, Search } from 'lucide-react'
import { tenantApi, type Listing } from '@/lib/api'
import { formatVnd } from '@/lib/client-utils'
import { estimateMonthlyCost } from '@/lib/cost-estimate'
import { setSavedIds, unsaveListing } from '@/lib/saved-listings-store'

const PAGE_SIZE = 6 // 2 rows of 3 cards on desktop

const ROOM_TYPE_LABELS: Record<string, string> = {
  'phong-tro': 'Phòng trọ',
  'chung-cu-mini': 'Chung cư mini',
  'nha-tro': 'Nhà trọ',
  'can-ho': 'Căn hộ',
}

function listingAddress(l: any): string {
  const parts = [
    [l.houseNumber, l.street].filter(Boolean).join(' '),
    l.ward,
    l.district,
    l.city,
  ].filter((p) => p && String(p).trim())
  return parts.length > 0 ? parts.join(', ') : String(l.address || '')
}

function listingImage(l: any): string {
  const first = l.photos?.[0]
  const fromPhotos = typeof first === 'string' ? first : first?.url || first?.src
  return l.image || fromPhotos || '/placeholder.jpg'
}

function SavedListingCard({
  listing,
  onUnsave,
  unsaving,
}: {
  listing: Listing
  onUnsave: (id: string) => void
  unsaving: boolean
}) {
  const total = estimateMonthlyCost(listing, 1).total
  const amenities = ((listing.amenities as string[] | undefined) ?? []).filter(Boolean)
  const address = listingAddress(listing)

  return (
    <div className="group relative flex flex-col rounded-2xl border-[2.5px] border-[#151515] bg-white shadow-[4px_4px_0px_0px_#151515] transition-all hover:shadow-[6px_6px_0px_0px_#151515]">
      {/* Image */}
      <Link href={`/phong/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-100">
          <Image src={listingImage(listing)} alt={listing.title} fill className="object-cover" unoptimized />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.verified && (
              <span className="flex items-center gap-1 rounded-full border-[1.5px] border-[#151515] bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#151515] shadow-[2px_2px_0px_0px_#151515]">
                <Check className="size-3 text-emerald-600" />
                Đã xác thực
              </span>
            )}
            {listing.vip && (
              <span className="rounded-full border-[1.5px] border-[#151515] bg-gradient-to-r from-emerald-500 to-green-400 px-2.5 py-1 text-[10px] font-black text-white shadow-[2px_2px_0_#151515]">
                ⭐ VIP
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Unsave (outside the link so it never navigates) */}
      <button
        type="button"
        onClick={() => onUnsave(listing.id)}
        disabled={unsaving}
        title="Bỏ lưu"
        aria-label="Bỏ lưu tin này"
        className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-[#EF4444] text-white shadow-[2px_2px_0px_0px_#151515] transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {unsaving ? <Loader2 className="size-5 animate-spin" /> : <Heart className="size-5 fill-current" />}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/phong/${listing.id}`} className="block">
          <h3 className="line-clamp-1 font-bold leading-tight text-[#151515] hover:text-emerald-600">{listing.title}</h3>
          {address && (
            <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
              <MapPin className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2">{address}</span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {listing.roomType && <span>{ROOM_TYPE_LABELS[listing.roomType] ?? listing.roomType}</span>}
            {listing.area ? (
              <span className="flex items-center gap-1">
                <Maximize2 className="size-3" />
                {listing.area} m²
              </span>
            ) : null}
            <span className={listing.vacantNow ? 'font-semibold text-emerald-600' : ''}>
              {listing.vacantNow ? 'Trống ngay' : 'Sắp trống'}
            </span>
          </div>
          <p className="mt-2 text-xl font-extrabold text-[#151515]">
            {formatVnd(listing.rent)}
            <span className="text-xs font-normal text-slate-400"> / tháng</span>
          </p>
        </Link>

        {amenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {a}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400">+{amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Tổng chi phí ước tính/tháng</span>
            <span className="text-sm font-bold text-emerald-600">{formatVnd(total)}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">1 người · tiền phòng + điện + nước + phí cố định</p>
        </div>

        <div className="mt-auto flex gap-2 pt-3">
          <Link
            href={`/phong/${listing.id}`}
            className="flex flex-1 items-center justify-center rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-4 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#151515]"
          >
            Xem chi tiết
          </Link>
          <button
            type="button"
            onClick={() => onUnsave(listing.id)}
            disabled={unsaving}
            className="rounded-xl border-[2.5px] border-[#151515] bg-white px-3 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Bỏ lưu
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[2.5px] border-dashed border-[#151515]/30 bg-white px-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border-[2.5px] border-[#151515] bg-[#FEE2E2] shadow-[3px_3px_0px_0px_#151515]">
        <Heart className="size-10 text-[#EF4444]" />
      </div>
      <h3 className="mt-6 text-lg font-bold text-[#151515]">Bạn chưa lưu tin đăng nào</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Bấm biểu tượng trái tim trên tin đăng để lưu lại những phòng bạn quan tâm, rồi quay lại đây để so sánh.
      </p>
      <Link
        href="/tim-kiem"
        className="mt-6 flex items-center gap-2 rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-6 py-3 font-bold text-[#151515] shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515]"
      >
        <Search className="size-5" />
        Khám phá phòng ngay
      </Link>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-[2.5px] border-slate-200 bg-white">
          <div className="aspect-[4/3] animate-pulse rounded-t-xl bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[2.5px] border-red-200 bg-red-50 py-16 text-center">
      <AlertCircle className="size-12 text-red-400" />
      <h3 className="mt-4 text-lg font-bold text-red-700">Không thể tải danh sách</h3>
      <p className="mt-2 text-sm text-slate-500">Đã xảy ra lỗi khi tải tin đã lưu. Vui lòng thử lại.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border-[2.5px] border-[#151515] bg-white px-5 py-2.5 font-bold text-[#151515] shadow-[3px_3px_0px_0px_#151515]"
      >
        Thử lại
      </button>
    </div>
  )
}

export function SavedListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [unsavingId, setUnsavingId] = useState<string | null>(null)
  const [unsaveError, setUnsaveError] = useState<string | null>(null)

  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await tenantApi.getSaved()
      const items = data.listings ?? []
      setListings(items)
      setSavedIds(items.map((l) => String(l.id))) // keep hearts elsewhere in sync
    } catch (err) {
      console.error('[SavedListings] fetch error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUnsave = async (id: string) => {
    if (unsavingId) return
    setUnsavingId(id)
    setUnsaveError(null)
    try {
      await unsaveListing(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      console.error('[SavedListings] unsave error:', err)
      setUnsaveError('Không bỏ lưu được tin này, vui lòng thử lại.')
    } finally {
      setUnsavingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))
  // Removing the last item of the last page moves back one page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])
  const currentPage = Math.min(page, totalPages)
  const pageItems = listings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const goTo = (p: number) => {
    setPage(p)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState onRetry={load} />
  if (listings.length === 0) return <EmptyState />

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full border-[2px] border-[#151515] bg-[#FDE047] px-3 py-1 text-sm font-bold text-[#151515] shadow-[2px_2px_0px_0px_#151515]">
            {listings.length} tin
          </span>
          <span className="text-sm text-slate-500">Giá và tình trạng phòng có thể thay đổi</span>
        </div>
        <Link
          href="/tim-kiem"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#151515]"
        >
          <Search className="size-4" />
          Tìm thêm phòng
        </Link>
      </div>

      {unsaveError && (
        <div className="mb-4 rounded-xl border-[2px] border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">{unsaveError}</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((listing) => (
          <SavedListingCard key={listing.id} listing={listing} onUnsave={handleUnsave} unsaving={unsavingId === listing.id} />
        ))}
      </div>

      {/* Pagination: always shown so users can see where they are */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm text-slate-500">
          Hiển thị <strong className="text-[#151515]">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, listings.length)}</strong>{' '}
          / {listings.length} tin · Trang {currentPage}/{totalPages}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang tin đã lưu">
          <button
            type="button"
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border-[2px] border-[#151515] bg-white px-3 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={`size-10 rounded-lg border-[2px] border-[#151515] text-sm font-bold shadow-[2px_2px_0_#151515] ${
                p === currentPage ? 'bg-[#FDE047] text-[#151515]' : 'bg-white text-[#151515]/70 hover:bg-[#fef9c3]'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border-[2px] border-[#151515] bg-white px-3 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau →
          </button>
        </nav>
      </div>
    </>
  )
}
