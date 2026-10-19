'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, Check, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { tenantApi, type Listing as ApiListing } from '@/lib/api'
import { formatVnd } from '@/lib/client-utils'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

type Listing = ApiListing

interface SavedListingCardProps {
  listing: Listing
  onUnsave: (id: string) => Promise<void>
  unsaverLoading: boolean
}

function SavedListingCard({ listing, onUnsave, unsaverLoading }: SavedListingCardProps) {
  const [localUnsave, setLocalUnsave] = useState(false)

  // Calculate total monthly cost from listing
  const total = (listing.rent || 0)
    + (listing.electricity || 0) * 50 // estimate 50 units/month
    + (listing.water || 0)
    + (listing.managementFee || 0)
    + (listing.internet || 0)
    + (listing.sanitation || 0)

  const handleUnsave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (localUnsave || unsaverLoading) return
    setLocalUnsave(true)
    await onUnsave(listing.id)
    setLocalUnsave(false)
  }

  return (
    <div className="group relative rounded-2xl border-[2.5px] border-[#151515] bg-white shadow-[4px_4px_0px_0px_#151515] transition-all hover:shadow-[6px_6px_0px_0px_#151515]">
      {/* Image */}
      <Link href={`/phong/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          <Image
            src={listing.image || listing.photos?.[0] || '/placeholder.jpg'}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized
          />
          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.verified && (
              <span className="flex items-center gap-1 rounded-full border-[1.5px] border-[#151515] bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#151515] shadow-[2px_2px_0px_0px_#151515]">
                <Check className="size-3 text-emerald-600" />
                Đã xác thực
              </span>
            )}
            {listing.vip && (
              <span 
                className="rounded-full border-[1.5px] border-[#151515] bg-gradient-to-r from-emerald-500 to-green-400 px-2.5 py-1 text-[10px] font-black text-white shadow-[2px_2px_0_#151515]"
                style={{ boxShadow: '0 0 6px 1px rgba(34, 197, 94, 0.4), 2px 2px 0 #151515' }}
              >
                ⭐ VIP
              </span>
            )}
          </div>
          {/* Unsave button - filled heart */}
          <button
            type="button"
            onClick={handleUnsave}
            disabled={localUnsave || unsaverLoading}
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-[#EF4444] text-white shadow-[2px_2px_0px_0px_#151515] transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
            aria-label="Bỏ lưu phòng"
          >
            {localUnsave || unsaverLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Heart className="size-5 fill-current" />
            )}
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/phong/${listing.id}`} className="block">
          <h3 className="font-bold leading-tight text-[#151515] line-clamp-1 hover:text-emerald-600">
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="size-3 shrink-0" />
            {listing.district}, {listing.city}
          </p>
          
          <p className="mt-2 text-xs text-slate-500">
            {listing.roomType} · {listing.area} m² · {listing.vacantNow ? 'Trống ngay' : 'Sắp trống'}
          </p>
          
          <p className="mt-1 text-xl font-extrabold text-[#151515]">
            {formatVnd(listing.rent)}
            <span className="text-xs font-normal text-slate-400"> / tháng</span>
          </p>
        </Link>

        {/* Cost estimate */}
        <div className="mt-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Tổng chi phí/tháng</span>
            <span className="text-sm font-bold text-emerald-600">{formatVnd(total)}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">Gồm tiền phòng + điện + nước + phí cố định</p>
        </div>

        {/* View button */}
        <Link
          href={`/phong/${listing.id}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-4 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          Xem chi tiết
        </Link>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-[2.5px] border-dashed border-slate-300 bg-slate-50 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border-[2.5px] border-[#151515] bg-slate-100 shadow-[3px_3px_0px_0px_#151515]">
        <Heart className="size-10 text-slate-300" />
      </div>
      <h3 className="mt-6 text-lg font-bold text-[#151515]">Chưa có phòng nào được lưu</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Lưu lại những phòng bạn quan tâm để dễ dàng so sánh và đặt lịch xem.
      </p>
      <Link
        href="/tim-kiem"
        className="mt-6 flex items-center gap-2 rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-6 py-3 font-bold text-[#151515] shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
      >
        <MapPin className="size-5" />
        Tiếp tục tìm phòng
      </Link>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl border-[2.5px] border-slate-200 bg-white shadow-[4px_4px_0px_0px_#151515]">
          <div className="aspect-[4/3] animate-pulse rounded-t-xl bg-slate-200" />
          <div className="p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-1/3 animate-pulse rounded bg-slate-200" />
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
      <p className="mt-2 text-sm text-slate-500">Đã xảy ra lỗi khi tải phòng đã lưu. Vui lòng thử lại.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-xl border-[2.5px] border-[#151515] bg-white px-5 py-2.5 font-bold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:shadow-[4px_4px_0px_0px_#151515] active:shadow-none"
      >
        Thử lại
      </button>
    </div>
  )
}

export default function SavedPage() {
  const { user } = useAuth()
  const [savedListings, setSavedListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unsavingId, setUnsavingId] = useState<string | null>(null)

  const fetchSavedListings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tenantApi.getSaved()
      setSavedListings(data.listings ?? [])
    } catch (err) {
      console.error('[SavedPage] Fetch error:', err)
      setError('Không thể tải danh sách phòng đã lưu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSavedListings()
  }, [fetchSavedListings])

  const handleUnsave = async (listingId: string) => {
    if (unsavingId) return
    setUnsavingId(listingId)
    try {
      await tenantApi.unsaveListing(listingId)
      // Update local state
      setSavedListings(prev => prev.filter(l => l.id !== listingId))
    } catch (err) {
      console.error('[SavedPage] Unsave API error, updating locally:', err)
      // Fallback: remove locally for demo
      setSavedListings(prev => prev.filter(l => l.id !== listingId))
    } finally {
      setUnsavingId(null)
    }
  }

  return (
    <>
      {/* Header with count and CTA */}
      {!loading && !error && savedListings.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full border-[2px] border-[#151515] bg-[#FDE047] px-3 py-1 text-sm font-bold text-[#151515] shadow-[2px_2px_0px_0px_#151515]">
              {savedListings.length} phòng
            </span>
            <span className="text-sm text-slate-500">Giá và tình trạng có thể thay đổi</span>
          </div>
          <Link
            href="/tim-kiem"
            className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <MapPin className="size-4" />
            Tiếp tục tìm phòng
          </Link>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={fetchSavedListings} />
      ) : savedListings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {savedListings.map((listing) => (
            <SavedListingCard
              key={listing.id}
              listing={listing}
              onUnsave={handleUnsave}
              unsaverLoading={unsavingId === listing.id}
            />
          ))}
        </div>
      )}

      {/* Note */}
      {!loading && !error && savedListings.length > 0 && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Nhấn vào biểu tượng trái tim đỏ để bỏ lưu phòng khỏi danh sách
        </p>
      )}
    </>
  )
}
