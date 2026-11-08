// VIETMAP (maps.vietmap.vn) — Vietnamese basemap + address search.
//
// VIETMAP grants services per key, so there are two separate keys:
//
//   NEXT_PUBLIC_VIETMAP_TILE_KEY  Tilemap key   -> map tiles only
//                                 (vietmapRasterTileUrl, used by map-base-layer)
//   NEXT_PUBLIC_VIETMAP_API_KEY   Service key   -> address search only
//                                 (autocomplete -> ref_id, place -> lat/lng, reverse)
//
// Neither falls back to the other: a key without the right service answers
// 423 "Your request is limited". Both are client-side keys (NEXT_PUBLIC_*),
// so restrict them by domain in the VIETMAP console
// (https://maps.vietmap.vn/console-v2/).

/** Tilemap key: map display only. */
export const VIETMAP_TILE_KEY = process.env.NEXT_PUBLIC_VIETMAP_TILE_KEY || ''
/** Service key: Search / Autocomplete / Place / Reverse only. */
export const VIETMAP_API_KEY = process.env.NEXT_PUBLIC_VIETMAP_API_KEY || ''

export const hasVietmapTileKey = () => VIETMAP_TILE_KEY.length > 0
export const hasVietmapKey = () => VIETMAP_API_KEY.length > 0

const BASE = 'https://maps.vietmap.vn'

/**
 * Raster (PNG) street-map tiles for Leaflet's TileLayer.
 * Styles: tm (default), lm (light). `{r}` becomes "@2x" on retina screens.
 */
export function vietmapRasterTileUrl(style: 'tm' | 'lm' = 'tm') {
  return `${BASE}/api/${style}/{z}/{x}/{y}{r}.png?apikey=${encodeURIComponent(VIETMAP_TILE_KEY)}`
}

export const VIETMAP_ATTRIBUTION = '&copy; <a href="https://maps.vietmap.vn" target="_blank" rel="noopener">VIETMAP</a>'

export interface VietmapSuggestion {
  refId: string
  name: string
  address: string
  display: string
}

export interface VietmapPlace {
  lat: number
  lng: number
  display: string
  houseNumber?: string
  street?: string
  ward?: string
  district?: string
  city?: string
}

async function getJson<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams({ apikey: VIETMAP_API_KEY, ...params })
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, { signal })
  if (!res.ok) throw new Error(`VIETMAP ${path} failed (${res.status})`)
  return res.json() as Promise<T>
}

/** Address suggestions while typing. `focus` biases results near a point. */
export async function vietmapAutocomplete(
  text: string,
  opts: { focus?: { lat: number; lng: number }; signal?: AbortSignal } = {}
): Promise<VietmapSuggestion[]> {
  if (!hasVietmapKey() || text.trim().length < 2) return []
  const params: Record<string, string> = { text: text.trim() }
  if (opts.focus) params.focus = `${opts.focus.lat},${opts.focus.lng}`
  const data = await getJson<any[]>('/api/autocomplete/v3', params, opts.signal)
  return (Array.isArray(data) ? data : [])
    .filter((d) => d && d.ref_id)
    .map((d) => ({
      refId: String(d.ref_id),
      name: String(d.name || ''),
      address: String(d.address || ''),
      display: String(d.display || d.name || ''),
    }))
}

/** Coordinates and structured address for a suggestion. */
export async function vietmapPlace(refId: string, signal?: AbortSignal): Promise<VietmapPlace | null> {
  if (!hasVietmapKey()) return null
  const d = await getJson<any>('/api/place/v3', { refid: refId }, signal)
  if (!d || typeof d.lat !== 'number' || typeof d.lng !== 'number') return null
  return {
    lat: d.lat,
    lng: d.lng,
    display: String(d.display || ''),
    houseNumber: d.hs_num || undefined,
    street: d.street || undefined,
    ward: d.ward || undefined,
    district: d.district || undefined,
    city: d.city || undefined,
  }
}

/** Nearest address for a point (e.g. after the user drops the pin). */
export async function vietmapReverse(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  if (!hasVietmapKey()) return null
  const data = await getJson<any[]>('/api/reverse/v3', { lat: String(lat), lng: String(lng) }, signal)
  const first = Array.isArray(data) ? data[0] : null
  return first?.display ? String(first.display) : null
}
