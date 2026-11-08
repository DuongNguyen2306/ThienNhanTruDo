'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { geocodeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { MapBaseLayer } from '@/components/map-base-layer'
import { MapAddressSearch } from '@/components/map-address-search'
import { hasVietmapKey, vietmapReverse, type VietmapPlace } from '@/lib/vietmap'
import type { Map as LeafletMap } from 'leaflet'

interface InteractiveMapProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  onLocationConfirm?: (confirmed: boolean) => void
  /** Called when the user picks an address from the search box. */
  onAddressSelect?: (place: VietmapPlace) => void
  disabled?: boolean
  showConfirmButton?: boolean
}

interface MapModules {
  L: typeof import('leaflet')
  MapContainer: any
  TileLayer: any
  Marker: any
  Popup: any
  useMap: () => LeafletMap
  useMapEvents: any
}

// ── Inner map component (client-only) ────────────────────────────────────────
function MapInner({
  lat,
  lng,
  onChange,
  disabled = false,
  onMapClick,
  onAddressSelect,
}: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  disabled?: boolean
  onMapClick?: (lat: number, lng: number) => void
  onAddressSelect?: (place: VietmapPlace) => void
}) {
  const [modules, setModules] = useState<MapModules | null>(null)
  const [dragging, setDragging] = useState(false)
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const markerRef = useRef<any>(null)

  // Load Leaflet modules
  useEffect(() => {
    let cancelled = false
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([leafletMod, rlMod]) => {
      if (cancelled) return

      import('leaflet/dist/leaflet.css')

      const L = (leafletMod as any).default ?? leafletMod

      setModules({
        L,
        MapContainer: (rlMod as any).MapContainer,
        TileLayer: (rlMod as any).TileLayer,
        Marker: (rlMod as any).Marker,
        Popup: (rlMod as any).Popup,
        useMap: (rlMod as any).useMap,
        useMapEvents: (rlMod as any).useMapEvents,
      })
    })
    return () => { cancelled = true }
  }, [])

  // Update marker position when coords change externally
  useEffect(() => {
    if (markerRef.current && !dragging && mapInstance) {
      markerRef.current.setLatLng([lat, lng])
    }
  }, [lat, lng, dragging, mapInstance])

  const handlePick = useCallback(
    (place: VietmapPlace) => {
      onChange(place.lat, place.lng)
      mapInstance?.flyTo([place.lat, place.lng], 18, { duration: 0.8 })
      onAddressSelect?.(place)
    },
    [mapInstance, onChange, onAddressSelect]
  )

  if (!modules) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải bản đồ...
        </div>
      </div>
    )
  }

  const { L, MapContainer, TileLayer, Marker, Popup, useMapEvents } = modules

  const pinIcon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:40px;height:40px;background:#FDE047;border:3px solid #151515;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;width:12px;height:12px;background:#151515;border-radius:50%;transform:translate(-1px,-1px);"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -45],
  })

  // Component to handle map click
  function MapClickHandler() {
    useMapEvents('click', (e: any) => {
      if (disabled) return
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    })
    return null
  }

  // Component to capture the Leaflet map instance via official API
  function MapInstanceCapture() {
    const map = modules!.useMap()
    useEffect(() => {
      setMapInstance(map)
    }, [map])
    return null
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        minZoom={1}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={!disabled}
      >
        <MapBaseLayer useMap={modules.useMap} TileLayer={TileLayer} />
        <ZoomControlBottomRight useMap={modules.useMap} L={L} />
        <MapClickHandler />
        <MapInstanceCapture />

        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable={!disabled}
          ref={markerRef}
          eventHandlers={{
            dragstart: () => setDragging(true),
            dragend: (e: any) => {
              setDragging(false)
              const pos = e.target.getLatLng()
              onChange(pos.lat, pos.lng)
            },
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-be-vietnam-pro), Arial, sans-serif', padding: '4px 0' }}>
              <p className="text-sm font-semibold">Vị trí phòng</p>
              <p className="text-xs text-slate-500">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
              {!disabled && <p className="mt-1 text-xs text-emerald-600">Kéo để điều chỉnh</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {!disabled && (
        <MapAddressSearch focus={{ lat, lng }} disabled={disabled} onPick={handlePick} />
      )}
    </div>
  )
}

// Zoom buttons at bottom-right so they don't collide with the search box.
function ZoomControlBottomRight({ useMap, L }: { useMap: () => LeafletMap; L: any }) {
  const map = useMap()
  useEffect(() => {
    const control = L.control.zoom({ position: 'bottomright' })
    control.addTo(map)
    return () => { control.remove() }
  }, [map, L])
  return null
}

// ── SSR-safe wrapper ─────────────────────────────────────────────────────────
const MapClient = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải bản đồ...
      </div>
    </div>
  ),
})

// ── Main Interactive Map Component ───────────────────────────────────────────
export function InteractiveMap({
  lat,
  lng,
  onChange,
  onLocationConfirm,
  onAddressSelect,
  disabled = false,
  showConfirmButton = true,
}: InteractiveMapProps) {
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [nearestAddress, setNearestAddress] = useState<string | null>(null)

  // Any pin move (search pick, click, drag) needs re-confirmation.
  const handleChange = useCallback(
    (newLat: number, newLng: number) => {
      onChange(newLat, newLng)
      setLocationConfirmed(false)
      onLocationConfirm?.(false)
      setConfirmError(null)
    },
    [onChange, onLocationConfirm]
  )

  const handleMapClick = useCallback(
    (clickLat: number, clickLng: number) => {
      if (disabled) return
      handleChange(clickLat, clickLng)
    },
    [disabled, handleChange]
  )

  // Show the nearest address for the current pin (debounced).
  useEffect(() => {
    if (!hasVietmapKey()) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      vietmapReverse(lat, lng, controller.signal)
        .then((addr) => setNearestAddress(addr))
        .catch(() => {})
    }, 600)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [lat, lng])

  const handleConfirmLocation = useCallback(async () => {
    if (disabled) return

    setValidating(true)
    setConfirmError(null)

    try {
      await geocodeApi.validate(lat, lng)
    } catch {
      // Validation is advisory only; confirm anyway.
    } finally {
      setLocationConfirmed(true)
      onLocationConfirm?.(true)
      setValidating(false)
    }
  }, [lat, lng, disabled, onLocationConfirm])

  return (
    <div className="flex flex-col gap-3">
      {/* Map Container */}
      <div className="relative overflow-hidden rounded-2xl border-[2px] border-[#151515]">
        <div className="h-[380px] w-full">
          <MapClient
            lat={lat}
            lng={lng}
            onChange={handleChange}
            onMapClick={handleMapClick}
            onAddressSelect={onAddressSelect}
            disabled={disabled}
          />
        </div>

        {/* Nearest address + coordinates */}
        <div className="flex flex-col gap-2 border-t-2 border-[#151515] bg-[#F5F5F0] px-4 py-3">
          {nearestAddress && (
            <p className="flex items-start gap-1.5 text-xs text-[#151515]/80">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#059669]" />
              <span>
                <span className="font-semibold">Gần: </span>
                {nearestAddress}
              </span>
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Vĩ độ</span>
                <b className="mt-0.5 block font-mono text-sm text-[#151515]">{lat.toFixed(6)}</b>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Kinh độ</span>
                <b className="mt-0.5 block font-mono text-sm text-[#151515]">{lng.toFixed(6)}</b>
              </div>
            </div>

            {/* Location status */}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                locationConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              )}
            >
              {locationConfirmed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã xác nhận
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Chưa xác nhận
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      {showConfirmButton && !disabled && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirmLocation}
            disabled={validating || locationConfirmed}
            className={cn(
              'flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] px-5 text-sm font-bold transition-all',
              locationConfirmed
                ? 'cursor-default border-emerald-500 bg-emerald-100 text-emerald-700'
                : 'border-[#151515] bg-[#FDE047] text-[#151515] shadow-[3px_3px_0_#151515] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#151515]'
            )}
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xác nhận...
              </>
            ) : locationConfirmed ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Đã xác nhận vị trí
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Xác nhận vị trí chính xác
              </>
            )}
          </button>

          {confirmError && (
            <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-300 bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {confirmError}
            </div>
          )}

          {!locationConfirmed && !confirmError && (
            <div className="flex items-start gap-2 rounded-xl border-[2px] border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Gõ địa chỉ vào ô tìm kiếm trên bản đồ • Kéo ghim hoặc bấm lên bản đồ để chỉnh vị trí • Nhấn xác nhận
            </div>
          )}
        </div>
      )}
    </div>
  )
}
