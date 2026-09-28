'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Listing } from '@/lib/data'
import { formatVnd } from '@/lib/data'

// ─── Static data: tiện ích xung quanh Thảo Điền / Quận 2 ───────────────────
const AMENITIES = [
  { id: 'am-1', name: 'Chợ Thảo Điền', type: 'Chợ', lat: 10.8039, lng: 106.7311 },
  { id: 'am-2', name: 'Trạm xe buýt 141', type: 'Xe buýt', lat: 10.8068, lng: 106.7391 },
  { id: 'am-3', name: 'THCS Thảo Điền', type: 'Trường học', lat: 10.7999, lng: 106.737 },
  { id: 'am-4', name: 'Trạm xe buýt 60', type: 'Xe buýt', lat: 10.8009, lng: 106.7261 },
  { id: 'am-5', name: 'Trường Tiểu học Thảo Điền', type: 'Trường học', lat: 10.8029, lng: 106.7351 },
]

const CENTER: [number, number] = [10.8035, 106.7325]

const POPUP_IMGS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=80',
]

function priceLabel(rent: number) {
  const raw = (rent / 1_000_000).toFixed(1).replace('.0', '')
  return `${raw}tr`
}

// ─── Inner map — chỉ chạy trên client, dynamic import với ssr:false ──────────
function RealMapInner({
  listings,
  selectedId,
  onSelect,
}: {
  listings: Listing[]
  selectedId?: string
  onSelect?: (id: string) => void
}) {
  const [modules, setModules] = useState<{
    L: typeof import('leaflet')
    MapContainer: any
    TileLayer: any
    Marker: any
    Popup: any
    Circle: any
    useMap: any
  } | null>(null)

  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [locError, setLocError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)

  // Load toàn bộ leaflet + react-leaflet phía client
  useEffect(() => {
    let cancelled = false
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([leafletMod, rlMod]) => {
      if (cancelled) return
      // Import CSS side-effect
      import('leaflet/dist/leaflet.css')
      setModules({
        L: (leafletMod as any).default ?? leafletMod,
        MapContainer: (rlMod as any).MapContainer,
        TileLayer: (rlMod as any).TileLayer,
        Marker: (rlMod as any).Marker,
        Popup: (rlMod as any).Popup,
        Circle: (rlMod as any).Circle,
        useMap: (rlMod as any).useMap,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (watchId.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  const locateUser = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocStatus('error')
      setLocError('Trình duyệt không hỗ trợ định vị.')
      return
    }
    setLocStatus('loading')
    setLocError(null)

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude])
        setLocStatus('ok')
        setLocError(null)
      },
      (err) => {
        setLocStatus('error')
        if (err.code === 1) setLocError('Bạn đã từ chối cấp quyền vị trí.')
        else if (err.code === 2) setLocError('Không thể xác định vị trí hiện tại.')
        else if (err.code === 3) setLocError('Hết thời gian chờ định vị.')
        else setLocError('Lỗi định vị không xác định.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  if (!modules) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Đang tải bản đồ...
      </div>
    )
  }

  const { L, MapContainer, TileLayer, Marker, Popup, Circle, useMap } = modules

  // Fly to selected listing
  function FlyToSelected() {
    const map = useMap()
    useEffect(() => {
      if (!selectedId) return
      const listing = listings.find((l) => l.id === selectedId)
      if (!listing) return
      map.flyTo([listing.lat, listing.lng], 15, { duration: 0.8 })
    }, [selectedId, map])
    return null
  }

  // Fly to user pos
  function FlyToUser() {
    const map = useMap()
    useEffect(() => {
      if (!userPos) return
      map.flyTo(userPos, 16, { duration: 1 })
    }, [userPos, map])
    return null
  }

  // Nút vị trí của tôi (render trong leaflet-top-right)
  function UserLocationControl() {
    return (
      <div className="leaflet-top leaflet-right" style={{ top: 10, right: 10, zIndex: 1000 }}>
        <button
          type="button"
          onClick={locateUser}
          title="Vị trí của tôi"
          aria-label="Vị trí của tôi"
          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow"
          style={{
            width: 36,
            height: 36,
            color: locStatus === 'ok' ? '#2563eb' : '#0f172a',
            transition: 'color 0.2s, background 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </button>
      </div>
    )
  }

  const makePriceIcon = (listing: Listing, isSelected: boolean) => {
    const color = listing.vip ? '#047857' : '#059669'
    const fontSize = listing.vip ? 11 : 10
    return L.divIcon({
      className: '',
      html: `<div style="
        background:${color};
        color:#fff;
        font-weight:700;
        font-size:${fontSize}px;
        line-height:1;
        padding:4px 9px;
        border-radius:999px;
        border:1.5px solid rgba(255,255,255,0.85);
        box-shadow:0 2px 8px rgba(0,0,0,0.25),0 0 0 2.5px ${isSelected ? '#fde68a' : 'transparent'};
        white-space:nowrap;
        cursor:pointer;
        font-family:system-ui,-apple-system,sans-serif;
      ">${priceLabel(listing.rent)}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
  }

  const makeAmenityIcon = (amenity: (typeof AMENITIES)[number]) => {
    return L.divIcon({
      className: '',
      html: `<div style="
        background:#fff;
        color:#374151;
        font-size:10px;
        font-weight:600;
        padding:3px 8px;
        border-radius:6px;
        border:1px solid #d1d5db;
        box-shadow:0 1px 4px rgba(0,0,0,0.15);
        white-space:nowrap;
        font-family:system-ui,-apple-system,sans-serif;
      ">${amenity.type}: ${amenity.name}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
  }

  const userIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;
      background:#2563eb;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(37,99,235,0.25),0 2px 8px rgba(0,0,0,0.3);
      animation:verirent-pulse 2s ease-in-out infinite;
    "></div>
    <style>@keyframes verirent-pulse{0%,100%{box-shadow:0 0 0 4px rgba(37,99,235,0.25),0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 0 10px rgba(37,99,235,0.1),0 2px 8px rgba(0,0,0,0.3)} }</style>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  const selectedListing = listings.find((l) => l.id === selectedId)

  return (
    <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected />
      <FlyToUser />
      <UserLocationControl />

      {userPos && <Marker position={userPos} icon={userIcon} />}

      {selectedListing && (
        <Circle
          center={[selectedListing.lat, selectedListing.lng]}
          radius={500}
          pathOptions={{
            color: '#059669',
            fillColor: '#059669',
            fillOpacity: 0.07,
            dashArray: '6 6',
            weight: 1.5,
          }}
        />
      )}

      {AMENITIES.map((am) => (
        <Marker key={am.id} position={[am.lat, am.lng]} icon={makeAmenityIcon(am)} />
      ))}

      {listings.map((listing, idx) => {
        const isSelected = listing.id === selectedId
        return (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={makePriceIcon(listing, isSelected)}
            eventHandlers={{ click: () => onSelect?.(listing.id) }}
          >
            <Popup>
              <div style={{ minWidth: 220, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                  <img
                    src={listing.image ?? POPUP_IMGS[idx % POPUP_IMGS.length]}
                    alt={listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {listing.vip && (
                    <span style={{ background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                      VIP
                    </span>
                  )}
                  {listing.verified && (
                    <span style={{ background: '#059669', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                      Đã xác thực
                    </span>
                  )}
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999 }}>
                    {listing.roomType}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#0f172a', lineHeight: 1.3 }}>
                  {listing.title}
                </p>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{listing.address}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#059669', marginBottom: 10 }}>
                  {formatVnd(listing.rent)}<span style={{ fontSize: 11, fontWeight: 500 }}>/tháng</span>
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {listing.amenities.slice(0, 3).map((am) => (
                    <span key={am} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 10, color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                      {am}
                    </span>
                  ))}
                </div>
                <a
                  href={`/phong/${listing.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: '#059669',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 0',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  Xem chi tiết
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

// ─── SSR-safe wrapper — dynamic import với ssr:false ─────────────────────────
const RealMapClient = dynamic(() => Promise.resolve(RealMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-400">
      Đang tải bản đồ...
    </div>
  ),
})

// ─── Props ────────────────────────────────────────────────────────────────────
export type RealMapProps = {
  listings: Listing[]
  selectedId?: string
  onSelect?: (id: string) => void
  height?: string
  hint?: string
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function RealMap({
  listings,
  selectedId,
  onSelect,
  height = 'h-full min-h-[420px]',
  hint = 'Bán kính tiện ích: chợ, xe buýt, trường học quanh ghim phòng.',
}: RealMapProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${height}`}>
      {/* Badge cố định góc trên */}
      <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold shadow-sm">
        <span style={{ color: '#059669', marginRight: 4 }}>📍</span>
        TP. Hồ Chí Minh · Bản đồ tương tác
      </div>

      {/* Thanh chú thích cố định góc dưới */}
      <div className="absolute bottom-4 left-4 right-[70px] z-[1000] rounded-xl bg-white/95 p-3 text-xs text-slate-600 shadow-sm">
        {hint}
      </div>

      <RealMapClient listings={listings} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}
