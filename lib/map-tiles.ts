// Basemap used by every Leaflet map in the app (RealMap, InteractiveMap).
//
// Change ACTIVE_MAP_STYLE to switch the look everywhere. All styles below are
// free and need no API key; keep the attribution, it is required by the
// tile providers' terms.

export type MapStyleId = 'voyager' | 'positron' | 'esriStreet' | 'osm'

interface MapTileStyle {
  url: string
  attribution: string
  subdomains?: string
  maxZoom: number
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

export const MAP_STYLES: Record<MapStyleId, MapTileStyle> = {
  // Modern, soft colours with clear street labels (default).
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 20,
  },
  // Very light, minimal grey map: markers stand out the most.
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 20,
  },
  // Esri street map: Google-Maps-like colours.
  esriStreet: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  // Original OpenStreetMap tiles.
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
}

export const ACTIVE_MAP_STYLE: MapStyleId = 'voyager'

/** Props to spread onto react-leaflet's <TileLayer />. */
export function getTileLayerProps(style: MapStyleId = ACTIVE_MAP_STYLE) {
  const s = MAP_STYLES[style]
  return {
    url: s.url,
    attribution: s.attribution,
    maxZoom: s.maxZoom,
    ...(s.subdomains ? { subdomains: s.subdomains } : {}),
  }
}
