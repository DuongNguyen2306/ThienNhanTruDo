'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin } from 'lucide-react'
import { formatVnd, totalMonthly } from '@/lib/data'
import { api } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { useState } from 'react'

// Flexible listing type - accepts fields from both API and local types
interface ListingProps {
  id: string
  title: string
  image?: string
  photos?: ({ src?: string } | string)[]
  verified?: boolean
  vip?: boolean
  highTrust?: boolean
  district?: string
  city?: string
  rent?: number
  depositMonths?: number
  electricity?: number
  water?: number
  managementFee?: number
  internet?: number
  sanitation?: number
  parkingBike?: number
  area?: number
  pets?: boolean
  furniture?: boolean
  [key: string]: unknown
}

interface BrutalListingCardProps {
  listing: ListingProps
  variant?: 'default' | 'featured'
}

export function BrutalListingCard({ listing, variant = 'default' }: BrutalListingCardProps) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const total = (listing.rent || 0)
    + (listing.electricity || 0) * 50
    + (listing.water || 0)
    + (listing.managementFee || 0)
    + (listing.internet || 0)
    + (listing.sanitation || 0)

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      alert('Vui lòng đăng nhập để lưu tin')
      return
    }
    
    setIsLoading(true)
    try {
      if (isSaved) {
        // TODO: Implement unsave API when backend is ready
        setIsSaved(false)
      } else {
        await api(`/api/tenant/saved/${listing.id}`, { method: 'POST' })
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Không thể lưu tin. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Link href={`/phong/${listing.id}`} className="group block">
      <div className="overflow-hidden rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[6px_6px_0_#151515]">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F0]">
          <Image
            src={listing.image || (typeof listing.photos?.[0] === 'string' ? listing.photos[0] : (listing.photos?.[0] as any)?.src) || '/placeholder.jpg'}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized
          />
          
          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.vip === true && (
              <span 
                className="relative rounded-md bg-gradient-to-r from-emerald-500 to-green-400 px-3 py-1.5 text-[11px] font-black text-white border-[2px] border-[#151515] shadow-[2px_2px_0_#151515]"
                style={{
                  boxShadow: '0 0 12px 2px rgba(34, 197, 94, 0.5), 2px 2px 0 #151515',
                }}
              >
                ⭐ VIP
              </span>
            )}
            {listing.verified && (
              <span className="flex items-center gap-1 rounded-md bg-[#FDE047] px-2 py-1 text-[10px] font-bold text-[#151515] border-[1.5px] border-[#151515]">
                <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
                Đã xác thực thực tế
              </span>
            )}
          </div>

          {/* Heart Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border-[2px] border-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:scale-110 ${
              isSaved ? 'bg-red-500' : 'bg-white'
            }`}
            aria-label={isSaved ? 'Bỏ lưu tin' : 'Lưu tin'}
          >
            <Heart className={`size-4 ${isSaved ? 'fill-white text-white' : 'text-[#151515]'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold leading-snug text-[#151515] line-clamp-1" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            {listing.title}
          </h3>
          
          <div className="mt-1.5 flex items-center gap-1 text-xs text-[#151515]/60">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{listing.district}, {listing.city}</span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl font-black text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {formatVnd(listing.rent ?? 0)}
              </span>
              <span className="ml-1 text-xs font-medium text-[#151515]/50">/ tháng</span>
            </div>
            <span className="text-[11px] text-[#151515]/50">{listing.area} m²</span>
          </div>

          <div className="mt-3 rounded-lg bg-[#F5F5F0] px-3 py-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-medium text-[#151515]/60">Tổng chi phí ước tính</span>
              <span className="font-bold text-[#151515]">{formatVnd(total)}</span>
            </div>
          </div>

          {/* Action Link */}
          <div className="mt-3 flex items-center justify-end">
            <span className="text-xs font-semibold text-[#151515] underline underline-offset-2">
              Xem chi tiết →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
