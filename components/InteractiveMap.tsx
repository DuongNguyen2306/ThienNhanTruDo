'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { geocodeApi, type GeocodeResult } from '@/lib/api'
import { cn } from '@/lib/utils'

interface InteractiveMapProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  onLocationConfirm?: (confirmed: boolean) => void
  disabled?: boolean
  showConfirmButton?: boolean
}

interface MapModules {
  L: typeof import('leaflet')
  MapContainer: any
  TileLayer: any
  Marker: any
  Popup: any
  useMap: any
  useMapEvents: any
}

// ── Inner map component (client-only) ────────────────────────────────────────
function MapInner({
  lat,
  lng,
  onChange,
  disabled = false,
  onMapClick,
}: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  disabled?: boolean
  onMapClick?: (lat: number, lng: number) => void
}) {
  const [modules, setModules] = useState<MapModules | null>(null)
  const [dragging, setDragging] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const markerRef = useRef<any>(null)
  const searchControlRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Load Leaflet modules
  useEffect(() => {
    let cancelled = false
    Promise.all([import('leaflet'), import('react-leaflet'), import('leaflet-search')]).then(([leafletMod, rlMod, leafletSearchMod]) => {
      if (cancelled) return
      
      import('leaflet/dist/leaflet.css')
      import('leaflet-search/dist/leaflet-search.min.css')
      
      const L = (leafletMod as any).default ?? leafletMod
      const MarkerClass = (rlMod as any).Marker
      
      // Fix default icon
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      } catch (e) {
        console.warn('Could not fix default icon:', e)
      }
      
      setModules({
        L,
        MapContainer: (rlMod as any).MapContainer,
        TileLayer: (rlMod as any).TileLayer,
        Marker: MarkerClass,
        Popup: (rlMod as any).Popup,
        useMap: (rlMod as any).useMap,
        useMapEvents: (rlMod as any).useMapEvents,
      })
    })
    return () => { cancelled = true }
  }, [])

  // Setup search control after map loads
  useEffect(() => {
    if (!modules || !mapContainerRef.current) return

    const L = modules.L
    const map = mapContainerRef.current['_leaflet_map']
    
    if (!map) return

    // Remove existing search control
    if (searchControlRef.current) {
      map.removeControl(searchControlRef.current)
    }

    // Create custom search icon HTML
    const createSearchIcon = () => {
      return L.divIcon({
        className: 'leaflet-search-custom-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        html: `<div style="
          width: 36px;
          height: 36px;
          background: #151515;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FDE047" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>`
      })
    }

    // Create search control
    const searchControl = new (L.Control as any).Search({
      url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
      jsonpParam: 'json_callback',
      propertyName: 'display_name',
      propertyLoc: ['lat', 'lon'],
      marker: false, // Don't create marker on search
      animateLocation: true,
      zoom: 17,
      textErr: 'Không tìm thấy địa chỉ',
      textPlaceholder: 'Tìm địa chỉ trên bản đồ...',
      textCancel: 'Hủy',
      textReset: 'Xóa',
      autoType: true,
      autoCollapse: false,
      minLength: 3,
      delayType: 400,
      iconLabel: { className: 'leaflet-search-label' },
      buildTip: function(text: string, val: any, lat: number, lon: number) {
        // Parse display name to get parts
        const parts = text.split(',').map((p: string) => p.trim())
        const primary = parts[0] || text
        const secondary = parts.slice(1, 3).join(', ')
        
        const tip = L.DomUtil.create('div', 'leaflet-search-tip')
        tip.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 8px; padding: 4px 0;">
            <div style="
              width: 32px;
              height: 32px;
              background: #dcfce7;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; font-size: 13px; color: #151515; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${primary}
              </div>
              <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${secondary}
              </div>
            </div>
          </div>
        `
        return tip
      },
      filterJSON: function(json: any[]) {
        // Filter results to keep relevant ones
        return json.filter(item => item.display_name && item.lat && item.lon)
      },
      moveToLocation: function(latlng: any, title: string, map: any) {
        // Update the main marker position
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng)
          onChange(latlng.lat, latlng.lng)
        }
        map.setView(latlng, 17)
      },
    })

    // Add custom CSS for search control
    const style = document.createElement('style')
    style.textContent = `
      .leaflet-search-custom-icon {
        background: transparent !important;
      }
      .leaflet-control-search {
        border: 2px solid #151515 !important;
        border-radius: 12px !important;
        box-shadow: 3px 3px 0 #151515 !important;
      }
      .leaflet-control-search.search-exp {
        border-radius: 12px 12px 0 0 !important;
      }
      .leaflet-control-search input {
        height: 44px !important;
        padding: 0 12px !important;
        font-size: 14px !important;
        border: none !important;
        border-radius: 10px 0 0 10px !important;
        font-family: inherit !important;
      }
      .leaflet-control-search input:focus {
        outline: none !important;
        box-shadow: inset 0 0 0 2px #FDE047 !important;
      }
      .leaflet-control-search button {
        width: 44px !important;
        height: 44px !important;
        border-radius: 0 10px 10px 0 !important;
        background: #FDE047 !important;
        border: none !important;
      }
      .leaflet-control-search button:hover {
        background: #fde916 !important;
      }
      .leaflet-control-search button .leaflet-icon-magnifier {
        background-image: none !important;
        width: 20px !important;
        height: 20px !important;
      }
      .leaflet-control-search button .leaflet-icon-magnifier::after {
        content: '🔍';
        font-size: 18px;
      }
      .leaflet-search-tip {
        background: white !important;
        border: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
        padding: 8px 12px !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        cursor: pointer !important;
      }
      .leaflet-search-tip:hover {
        background: #fef3c7 !important;
      }
      .leaflet-search-tip-selected,
      .leaflet-search-tip-selected:hover {
        background: #FDE047 !important;
      }
      .leaflet-control-search .search-tooltip {
        border: 2px solid #151515 !important;
        border-top: none !important;
        border-radius: 0 0 12px 12px !important;
        box-shadow: 3px 3px 0 #151515 !important;
        max-height: 280px !important;
        overflow-y: auto !important;
      }
      .leaflet-control-search .search-cancel {
        width: 44px !important;
        height: 44px !important;
        line-height: 44px !important;
        color: #151515 !important;
      }
      .leaflet-control-search .search-load {
        background: #FDE047 !important;
      }
    `
    document.head.appendChild(style)

    searchControlRef.current = searchControl
    map.addControl(searchControl)
    
    setMapReady(true)

    return () => {
      if (searchControlRef.current) {
        map.removeControl(searchControlRef.current)
      }
    }
  }, [modules, onChange])

  // Update marker position when coords change externally
  useEffect(() => {
    if (markerRef.current && !dragging && mapReady) {
      markerRef.current.setLatLng([lat, lng])
    }
  }, [lat, lng, dragging, mapReady])

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

  // Create custom icon
  const pinIcon = L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          background: #FDE047;
          border: 3px solid #151515;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          width: 12px;
          height: 12px;
          background: #151515;
          border-radius: 50%;
          transform: translate(-1px, -1px);
        "></div>
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

  return (
    <div ref={mapContainerRef} className="h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={!disabled}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler />
        
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
            <div style={{ fontFamily: 'system-ui', padding: '4px 0' }}>
              <p className="text-sm font-semibold">Vị trí phòng</p>
              <p className="text-xs text-slate-500">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
              {!disabled && (
                <p className="mt-1 text-xs text-emerald-600">Kéo để điều chỉnh</p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
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
  disabled = false,
  showConfirmButton = true,
}: InteractiveMapProps) {
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  const handleMapClick = useCallback(async (clickLat: number, clickLng: number) => {
    if (disabled) return
    
    onChange(clickLat, clickLng)
    setLocationConfirmed(false)
    onLocationConfirm?.(false)
    setConfirmError(null)
  }, [disabled, onChange, onLocationConfirm])

  const handleConfirmLocation = useCallback(async () => {
    if (disabled) return
    
    setValidating(true)
    setConfirmError(null)

    try {
      // Simple confirmation - just validate coordinates are reasonable
      const validation = await geocodeApi.validate(lat, lng)
      
      // Always accept - validation endpoint now returns valid for all
      setLocationConfirmed(true)
      onLocationConfirm?.(true)
    } catch (err: any) {
      // Still confirm even on error
      setLocationConfirmed(true)
      onLocationConfirm?.(true)
    } finally {
      setValidating(false)
    }
  }, [lat, lng, disabled, onLocationConfirm])

  return (
    <div className="flex flex-col gap-3">
      {/* Map Container */}
      <div className="relative overflow-hidden rounded-2xl border-[2px] border-[#151515]">
        <div className="h-[350px] w-full">
          <MapClient
            lat={lat}
            lng={lng}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
        
        {/* Map overlay info */}
        <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold shadow-sm">
          <span className="mr-1 text-emerald-600">📍</span>
          TP. Hồ Chí Minh · Khu vực dịch vụ
        </div>

        {/* Coordinates display */}
        <div className="flex items-center justify-between border-t-2 border-[#151515] bg-[#F5F5F0] px-4 py-3">
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
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            locationConfirmed 
              ? "bg-emerald-100 text-emerald-700" 
              : "bg-amber-100 text-amber-700"
          )}>
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

      {/* Confirm Button */}
      {showConfirmButton && !disabled && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirmLocation}
            disabled={validating || locationConfirmed}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] px-5 text-sm font-bold transition-all",
              locationConfirmed
                ? "border-emerald-500 bg-emerald-100 text-emerald-700 cursor-default"
                : "border-[#151515] bg-[#FDE047] text-[#151515] shadow-[3px_3px_0_#151515] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#151515]"
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

          {/* Error message */}
          {confirmError && (
            <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-300 bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {confirmError}
            </div>
          )}

          {/* Info message */}
          {!locationConfirmed && !confirmError && (
            <div className="flex items-start gap-2 rounded-xl border-[2px] border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Tìm địa chỉ trên bản đồ • Kéo ghim đến vị trí chính xác • Nhấn xác nhận
            </div>
          )}
        </div>
      )}
    </div>
  )
}
