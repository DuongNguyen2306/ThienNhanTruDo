// ============================================
// HISTORICAL SERVICE AREA DATA
// Only accepts properties in:
// - Historical District 9 (Quận 9 cũ)
// - Historical Thu Duc District (Quận Thủ Đức cũ)
// 
// EXCLUDED: Historical District 2 (Quận 2 cũ)
// ============================================

export interface WardData {
  historicalName: string
  currentName: string
  currentCode?: string
  lat: number
  lng: number
}

export interface DistrictData {
  historicalName: string
  currentName: string // Part of Thu Duc City
  wards: WardData[]
  // Approximate center
  centerLat: number
  centerLng: number
  // Bounding box for quick validation
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}

// ============================================
// HISTORICAL DISTRICT 9 (Quận 9 cũ)
// Part of Thu Duc City since 2021
// Coordinates based on official administrative data
// ============================================
const DISTRICT_9_WARDS: WardData[] = [
  // Long Bình
  {
    historicalName: 'Phường Long Bình',
    currentName: 'Phường Long Bình',
    lat: 10.9297,
    lng: 106.8328,
  },
  // Long Phước
  {
    historicalName: 'Phường Long Phước',
    currentName: 'Phường Long Phước',
    lat: 10.9386,
    lng: 106.8139,
  },
  // Long Thới Bình
  {
    historicalName: 'Phường Long Thới Bình',
    currentName: 'Phường Long Thới Bình',
    lat: 10.9083,
    lng: 106.8236,
  },
  // Phước Bình
  {
    historicalName: 'Phường Phước Bình',
    currentName: 'Phường Phước Bình',
    lat: 10.8914,
    lng: 106.8350,
  },
  // Phước Long A
  {
    historicalName: 'Phường Phước Long A',
    currentName: 'Phường Phước Long A',
    lat: 10.8847,
    lng: 106.8250,
  },
  // Phước Long B
  {
    historicalName: 'Phường Phước Long B',
    currentName: 'Phường Phước Long B',
    lat: 10.8931,
    lng: 106.8153,
  },
  // Tân Phú
  {
    historicalName: 'Phường Tân Phú',
    currentName: 'Phường Tân Phú',
    lat: 10.8714,
    lng: 106.8214,
  },
  // Trường Thạnh
  {
    historicalName: 'Phường Trường Thạnh',
    currentName: 'Phường Trường Thạnh',
    lat: 10.8647,
    lng: 106.8086,
  },
]

// ============================================
// HISTORICAL THU DUC DISTRICT (Quận Thủ Đức cũ)
// Part of Thu Duc City since 2021
// Coordinates based on official administrative data
// ============================================
const THU_DUC_DISTRICT_WARDS: WardData[] = [
  // Hiệp Bình Chánh
  {
    historicalName: 'Phường Hiệp Bình Chánh',
    currentName: 'Phường Hiệp Bình Chánh',
    lat: 10.8542,
    lng: 106.7281,
  },
  // Hiệp Bình Phước
  {
    historicalName: 'Phường Hiệp Bình Phước',
    currentName: 'Phường Hiệp Bình Phước',
    lat: 10.8614,
    lng: 106.7197,
  },
  // Linh Chiểu
  {
    historicalName: 'Phường Linh Chiểu',
    currentName: 'Phường Linh Chiểu',
    lat: 10.8486,
    lng: 106.7336,
  },
  // Linh Đông
  {
    historicalName: 'Phường Linh Đông',
    currentName: 'Phường Linh Đông',
    lat: 10.8553,
    lng: 106.7464,
  },
  // Linh Tây
  {
    historicalName: 'Phường Linh Tây',
    currentName: 'Phường Linh Tây',
    lat: 10.8525,
    lng: 106.7417,
  },
  // Linh Trung
  {
    historicalName: 'Phường Linh Trung',
    currentName: 'Phường Linh Trung',
    lat: 10.8681,
    lng: 106.7103,
  },
  // Tam Bình
  {
    historicalName: 'Phường Tam Bình',
    currentName: 'Phường Tam Bình',
    lat: 10.8453,
    lng: 106.7517,
  },
  // Tam Phú
  {
    historicalName: 'Phường Tam Phú',
    currentName: 'Phường Tam Phú',
    lat: 10.8367,
    lng: 106.7456,
  },
  // Thủ Đức
  {
    historicalName: 'Phường Thủ Đức',
    currentName: 'Phường Thủ Đức',
    lat: 10.8417,
    lng: 106.7569,
  },
  // Trường Thọ
  {
    historicalName: 'Phường Trường Thọ',
    currentName: 'Phường Trường Thọ',
    lat: 10.8433,
    lng: 106.7433,
  },
]

// ============================================
// COMPLETE SERVICE AREA DATA
// ============================================
export const SERVICE_AREAS: DistrictData[] = [
  {
    historicalName: 'Quận 9 cũ',
    currentName: 'Thành phố Thủ Đức',
    wards: DISTRICT_9_WARDS,
    centerLat: 10.8958,
    centerLng: 106.8208,
    bounds: {
      north: 10.9500,
      south: 10.8600,
      east: 106.8450,
      west: 106.8000,
    },
  },
  {
    historicalName: 'Quận Thủ Đức cũ',
    currentName: 'Thành phố Thủ Đức',
    wards: THU_DUC_DISTRICT_WARDS,
    centerLat: 10.8500,
    centerLng: 106.7350,
    bounds: {
      north: 10.8750,
      south: 10.8300,
      east: 106.7600,
      west: 106.7050,
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all districts in the service area
 */
export function getDistricts(): { id: string; name: string; currentName: string }[] {
  return SERVICE_AREAS.map((d, i) => ({
    id: `district-${i}`,
    name: d.historicalName,
    currentName: d.currentName,
  }))
}

/**
 * Get wards for a specific district index
 */
export function getWardsForDistrict(districtIndex: number): WardData[] {
  if (districtIndex < 0 || districtIndex >= SERVICE_AREAS.length) {
    return []
  }
  return SERVICE_AREAS[districtIndex].wards
}

/**
 * Get district by historical name
 */
export function getDistrictByName(name: string): DistrictData | undefined {
  return SERVICE_AREAS.find(
    (d) => d.historicalName === name || d.currentName === name
  )
}

/**
 * Validate if coordinates are within service area
 * Uses bounding box + ward proximity check
 */
export function isInServiceArea(lat: number, lng: number): boolean {
  for (const district of SERVICE_AREAS) {
    const { bounds } = district
    
    // Quick bounding box check
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      // Check if within ~3km of any ward center (accounting for edge cases)
      for (const ward of district.wards) {
        const distance = getDistance(lat, lng, ward.lat, ward.lng)
        if (distance < 5) { // Within 5km of ward center
          return true
        }
      }
    }
  }
  return false
}

/**
 * Get the nearest ward to given coordinates
 */
export function getNearestWard(lat: number, lng: number): WardData | undefined {
  let nearest: WardData | undefined
  let minDistance = Infinity
  
  for (const district of SERVICE_AREAS) {
    for (const ward of district.wards) {
      const distance = getDistance(lat, lng, ward.lat, ward.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearest = ward
      }
    }
  }
  
  return nearest
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Get center coordinates for a district
 */
export function getDistrictCenter(districtIndex: number): [number, number] | null {
  if (districtIndex < 0 || districtIndex >= SERVICE_AREAS.length) {
    return null
  }
  const district = SERVICE_AREAS[districtIndex]
  return [district.centerLat, district.centerLng]
}
