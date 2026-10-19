declare module 'leaflet-search' {
  import * as L from 'leaflet'
  
  interface SearchOptions {
    url?: string
    jsonpParam?: string
    propertyName?: string
    propertyLoc?: [string, string]
    marker?: boolean | L.Marker | L.DivIcon | L.CircleMarker
    markerIcon?: L.Icon | L.DivIcon
    markerJump?: boolean
    zoom?: number
    animateLocation?: boolean
    autoType?: boolean
    autoCollapse?: boolean
    minLength?: number
    delayType?: number
    textErr?: string
    textPlaceholder?: string
    textCancel?: string
    textReset?: string
    position?: string
    container?: string | HTMLElement
    containerPlaceholder?: string
    jsonpParam?: string
    tipAutoSubmit?: boolean
    firstTipSubmit?: boolean
    autoResize?: boolean
    autoCollapse?: boolean
    collapsed?: boolean
    autoSearch?: boolean
    hideMarkerOnCollapse?: boolean
    filterJSON?: (json: any[]) => any[]
    buildTip?: (text: string, val: any, lat: number, lon: number) => HTMLElement
    moveToLocation?: (latlng: L.LatLng, title: string, map: L.Map) => void
  }

  class Search extends L.Control {
    constructor(options?: SearchOptions)
    searchText(text: string): void
    searchLatLng(lat: number, lng: number, text?: string): void
    getJsonpParam(): string
    setJsonpParam(value: string): void
  }

  export = Search
}
