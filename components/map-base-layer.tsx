'use client'

// Base layer shared by every Leaflet map (RealMap, InteractiveMap).
//
// Uses VIETMAP raster (PNG) street tiles when a VIETMAP tile key is set and
// a probe tile loads; otherwise falls back to the raster tiles configured in
// lib/map-tiles.ts (CARTO Voyager), so the map is never left blank.
//
// react-leaflet is loaded dynamically by the map components (no SSR), so its
// hooks/components are passed in instead of imported here.

import { useEffect, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { getTileLayerProps } from '@/lib/map-tiles'
import { hasVietmapTileKey, vietmapRasterTileUrl, VIETMAP_ATTRIBUTION } from '@/lib/vietmap'

// Probe once per page load. VIETMAP answers e.g. 423 "Your request is
// limited" (without CORS headers) when the key may not load tiles.
let tileProbe: Promise<boolean> | null = null

function vietmapTilesUsable(): Promise<boolean> {
  if (!tileProbe) {
    // Tile covering central Ho Chi Minh City at zoom 11.
    const url = vietmapRasterTileUrl('tm').replace('{z}', '11').replace('{x}', '1631').replace('{y}', '962').replace('{r}', '')
    // VIETMAP tiles come back without a Content-Type header, so check the
    // bytes themselves: a real tile starts with the PNG signature.
    tileProbe = fetch(url)
      .then(async (res) => {
        if (!res.ok) return false
        const bytes = new Uint8Array(await res.arrayBuffer())
        return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      })
      .catch(() => false) // network error or blocked response without CORS headers
  }
  return tileProbe
}

type BaseLayerState = 'checking' | 'vietmap' | 'fallback'

export function MapBaseLayer({
  TileLayer,
}: {
  useMap?: () => LeafletMap
  TileLayer: any
}) {
  const [state, setState] = useState<BaseLayerState>(() => (hasVietmapTileKey() ? 'checking' : 'fallback'))

  useEffect(() => {
    if (state !== 'checking') return
    let cancelled = false
    vietmapTilesUsable().then((ok) => {
      if (cancelled) return
      if (!ok) console.warn('[map] VIETMAP tiles unavailable for this key, using fallback tiles')
      setState(ok ? 'vietmap' : 'fallback')
    })
    return () => { cancelled = true }
  }, [state])

  if (state === 'checking') return null

  if (state === 'vietmap') {
    return (
      <TileLayer
        key="vietmap"
        url={vietmapRasterTileUrl('tm')}
        attribution={VIETMAP_ATTRIBUTION}
        detectRetina={false}
        maxZoom={20}
        maxNativeZoom={18}
      />
    )
  }

  return <TileLayer key="fallback" {...getTileLayerProps()} />
}
