'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  ArrowLeft, BadgeCheck, ChevronDown, Home, List, MapPin, Navigation,
  Star, Wifi,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { listings, formatVnd } from '@/lib/data'
import { MapBoard } from '@/components/map-board'

// Rough coordinate centers for known areas (lat, lng)
const areaCenters: Record<string, { lat: number; lng: number; x: number; y: number; label: string }> = {
  'thảo điền': { lat: 10.8024, lng: 106.7341, x: 55, y: 42, label: 'Thảo Điền' },
  'quận 1': { lat: 10.7762, lng: 106.6981, x: 48, y: 48, label: 'Quận 1' },
  'quận 7': { lat: 10.7295, lng: 106.7218, x: 52, y: 55, label: 'Quận 7' },
  'quận 3': { lat: 10.7877, lng: 106.7108, x: 50, y: 44, label: 'Quận 3' },
  'bình thạnh': { lat: 10.8012, lng: 106.7103, x: 45, y: 46, label: 'Bình Thạnh' },
  'thủ đức': { lat: 10.8414, lng: 106.7616, x: 62, y: 32, label: 'Thủ Đức' },
  'knc': { lat: 10.8414, lng: 106.8099, x: 68, y: 28, label: 'Khu CNC' },
  'fpt': { lat: 10.8414, lng: 106.8099, x: 68, y: 28, label: 'ĐH FPT' },
  'bitexco': { lat: 10.7712, lng: 106.7048, x: 50, y: 50, label: 'Bitexco' },
  'bến thành': { lat: 10.7725, lng: 106.6975, x: 49, y: 49, label: 'Chợ Bến Thành' },
}

// Nearby amenities shown on the map
const nearbyAmenities = [
  { name: 'Chợ', x: 28, y: 62, type: 'Chợ' },
  { name: 'Trạm xe buýt', x: 62, y: 30, type: 'Xe buýt' },
  { name: 'Trường học', x: 74, y: 58, type: 'Trường' },
  { name: 'Công ty', x: 40, y: 22, type: 'Công ty' },
  { name: 'Bệnh viện', x: 20, y: 38, type: 'BV' },
  { name: 'ATM', x: 78, y: 48, type: 'ATM' },
]

export default function MapSearchPage() {
  const params = useParams()
  const router = useRouter()
  const rawQuery = typeof params.q === 'string' ? decodeURIComponent(params.q) : ''
  const query = rawQuery.toLowerCase().trim()

  const [view, setView] = useState<'map' | 'list'>('map')
  const [radius, setRadius] = useState(1)

  // Find the matching area center
  const center = useMemo(() => {
    for (const [key, val] of Object.entries(areaCenters)) {
      if (query.includes(key)) return val
    }
    // Fallback: search listings for a match
    const matched = listings.find(
      (l) =>
        l.status === 'active' &&
        (l.district.toLowerCase().includes(query) ||
          l.ward.toLowerCase().includes(query) ||
          l.street.toLowerCase().includes(query) ||
          l.title.toLowerCase().includes(query)),
    )
    if (matched) {
      return {
        lat: matched.lat,
        lng: matched.lng,
        x: 55,
        y: 42,
        label: matched.ward || matched.district,
      }
    }
    return areaCenters['thảo điền']
  }, [query])

  // Filter active listings
  const activeListings = listings.filter((l) => l.status === 'active')

  // Simulate "nearby" by showing listings in a radius around the center
  // Since we don't have real geo, we distribute them around the center pin
  const nearbyListings = useMemo(() => {
    return activeListings.map((l, i) => {
      // Distribute pins around center in a rough circle
      const angle = (i * 137.5 * Math.PI) / 180 // golden angle for nice spread
      const dist = 0.5 + (i % 3) * 1.2 // varies 0.5 to 2.9 km
      const offsetX = Math.cos(angle) * dist * 4
      const offsetY = Math.sin(angle) * dist * 3
      const px = Math.max(10, Math.min(88, center.x + offsetX))
      const py = Math.max(10, Math.min(88, center.y + offsetY))
      const km = dist
      return { ...l, px, py, km: km.toFixed(1) }
    })
  }, [center])

  const totalRentals = nearbyListings.length
  const avgRent = Math.round(nearbyListings.reduce((s, l) => s + l.rent, 0) / totalRentals)
  const verifiedCount = nearbyListings.filter((l) => l.verified).length

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      {/* ── Compact search bar ── */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-600"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
            <input
              defaultValue={rawQuery}
              placeholder="Địa chỉ, khu vực, trường học..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value
                  if (v) router.push(`/tim-kiem/bau-cu?q=${encodeURIComponent(v)}`)
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setView(view === 'map' ? 'list' : 'map')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {view === 'map' ? <List className="size-4" /> : <Home className="size-4" />}
            {view === 'map' ? 'Danh sách' : 'Bản đồ'}
          </button>
        </div>
        {/* Stats bar */}
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 pb-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="size-3 text-emerald-500" />
            <b className="font-semibold text-slate-800">{center.label}</b>
            · {totalRentals} phòng
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="size-3" />Giá TB: <b>{formatVnd(avgRent)}</b>
          </span>
          <span className="flex items-center gap-1">
            <BadgeCheck className="size-3 text-emerald-500" />{verifiedCount} đã xác thực
          </span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value={0.5}>Bán kính 500m</option>
            <option value={1}>1 km</option>
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
          </select>
        </div>
      </div>

      {/* ── Map view ── */}
      {view === 'map' && (
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            {/* Map */}
            <MapBoard
              height="min-h-[520px]"
              pins={nearbyListings.map((l) => ({ id: l.id, x: l.px, y: l.py, label: `${formatVnd(l.rent)}` }))}
              selectedId={undefined}
              showRadius={true}
              hint={`Hiển thị ${totalRentals} phòng trong bán kính ${radius} km quanh ${center.label}`}
            />

            {/* Sidebar listing cards */}
            <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '600px' }}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {totalRentals} phòng quanh {center.label}
                </p>
                <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                  <option>Giá tăng dần</option>
                  <option>Diện tích lớn nhất</option>
                  <option>Đánh giá cao nhất</option>
                </select>
              </div>
              {nearbyListings.slice(0, 8).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => router.push(`/phong/${l.id}`)}
                  className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <Image src={l.image} alt={l.title} fill className="object-cover" unoptimized />
                    {l.verified && (
                      <div className="absolute left-1 top-1">
                        <Badge className="flex items-center gap-0.5 bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">
                          <BadgeCheck className="size-2.5" />
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-700">{l.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="size-2.5" />
                      {l.ward}, {l.district}
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-emerald-600">{formatVnd(l.rent)}/th</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <Star className="size-3 fill-amber-400" />
                        {l.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400">· {l.km} km</span>
                      <span className="text-xs text-slate-400">· {l.area}m²</span>
                    </div>
                  </div>
                </button>
              ))}
              <Button
                variant="outline"
                className="mt-1 h-10 rounded-xl text-sm"
                onClick={() => router.push(`/tim-kiem?q=${encodeURIComponent(rawQuery)}`)}
              >
                Xem tất cả {totalRentals} phòng →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
              <Navigation className="size-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                {totalRentals} phòng trong bán kính {radius} km quanh <b>{center.label}</b>
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyListings.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => router.push(`/phong/${l.id}`)}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white text-left transition-all hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                  <Image src={l.image} alt={l.title} fill className="object-cover" unoptimized />
                  <div className="absolute left-3 top-3 flex gap-2">
                    {l.verified && (
                      <Badge className="flex items-center gap-1 bg-emerald-500 text-white">
                        <BadgeCheck className="size-3" /> Manager Verified
                      </Badge>
                    )}
                    {l.vip && <Badge className="bg-amber-500 text-white">VIP</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <p className="font-semibold text-slate-800 group-hover:text-emerald-700">{l.title}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="size-3" />
                    {l.ward}, {l.district}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono text-base font-bold text-emerald-600">{formatVnd(l.rent)}</p>
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="size-3 fill-amber-400" /> {l.rating.toFixed(1)} ({l.reviewCount})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">· {l.area}m² · {l.amenities.slice(0, 2).join(', ')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <PublicFooter />
    </main>
  )
}
