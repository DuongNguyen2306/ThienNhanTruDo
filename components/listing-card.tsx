'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check, Heart, MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatVnd, totalMonthly, type Listing } from '@/lib/data'

export function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const total = totalMonthly(listing)
  return (
    <Link href={`/phong/${listing.id}`}>
      <Card className="overflow-hidden rounded-2xl border border-slate-200 py-0 shadow-sm transition hover:shadow-md">
        <div className="relative aspect-[4/3]">
          <Image src={listing.image} alt={listing.title} fill className="object-cover" unoptimized />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {listing.verified && (
              <Badge className="gap-1 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                <Check className="size-3" /> Đã xác thực thực tế
              </Badge>
            )}
            {listing.vip && <Badge className="rounded-full bg-amber-500 text-white">VIP</Badge>}
          </div>
          <Button variant="secondary" size="icon" className="absolute right-3 top-3 rounded-full bg-white/90" aria-label="Lưu tin">
            <Heart className="size-4" />
          </Button>
        </div>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex justify-between gap-2">
            <div>
              <h2 className="font-bold leading-snug">{listing.title}</h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="size-3" />
                {listing.district}, {listing.city}
              </p>
            </div>
            {listing.rating > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                <Star className="size-3.5 fill-amber-500" />
                {listing.rating}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{listing.roomType} · {listing.area} m² · {listing.vacantNow ? 'Trống ngay' : 'Sắp trống'}</p>
          <p className="text-lg font-bold text-emerald-700">
            {formatVnd(listing.rent)}
            <span className="text-xs font-normal text-slate-400"> / tháng</span>
          </p>
          {!compact && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <b>Tổng chi phí ước tính/tháng</b>
              <strong className="float-right text-emerald-700">{formatVnd(total)}</strong>
              <p className="mt-1 text-[11px] text-slate-400">Gồm tiền phòng + điện + nước + phí cố định</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
