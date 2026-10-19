/**
 * Vietnamese text normalization utilities
 * Supports searching with or without accents
 */

// Vietnamese character mappings (without accents)
const VIETNAMESE_MAP: Record<string, string> = {
  // A
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ā': 'a', 'ă': 'a', 'â': 'a',
  'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
  'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
  'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
  'Ā': 'A', 'Ă': 'A', 'Â': 'A',
  
  // E
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ē': 'e', 'ĕ': 'e', 'ė': 'e', 'ę': 'e', 'ê': 'e',
  'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
  'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
  'Ē': 'E', 'Ĕ': 'E', 'Ė': 'E', 'Ę': 'E', 'Ê': 'E',
  
  // I
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ī': 'i', 'ĭ': 'i', 'ı': 'i', 'î': 'i',
  'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
  'Ī': 'I', 'Ĭ': 'I', 'İ': 'I', 'Î': 'I',
  
  // O
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ō': 'o', 'ŏ': 'o', 'ơ': 'o', 'ô': 'o',
  'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
  'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
  'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
  'Ō': 'O', 'Ŏ': 'O', 'Ơ': 'O', 'Ô': 'O',
  
  // U
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ū': 'u', 'ŭ': 'u', 'ư': 'u',
  'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
  'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
  'Ū': 'U', 'Ŭ': 'U', 'Ư': 'U',
  
  // Y
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'ȳ': 'y', 'ÿ': 'y',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
  'Ȳ': 'Y', 'Ÿ': 'Y',
  
  // D
  'đ': 'd', 'Đ': 'D',
}

/**
 * Remove all Vietnamese diacritics from a string
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .split('')
    .map(char => VIETNAMESE_MAP[char] || char)
    .join('')
}

/**
 * Normalize search text for matching
 * - Lowercase
 * - Remove accents
 * - Collapse multiple spaces
 * - Trim
 */
export function normalizeSearchText(text: string): string {
  return removeVietnameseAccents(text.toLowerCase().trim()).replace(/\s+/g, ' ')
}

/**
 * Check if a query matches a target (supports Vietnamese with/without accents)
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const normalizedQuery = normalizeSearchText(query)
  const normalizedTarget = normalizeSearchText(target)
  
  // Direct match
  if (normalizedTarget.includes(normalizedQuery)) {
    return true
  }
  
  // Check individual words
  const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2)
  const targetWords = normalizedTarget.split(' ')
  
  // Match if all query words are found in target
  return queryWords.every(qw => 
    targetWords.some(tw => tw.includes(qw) || qw.includes(tw))
  )
}

/**
 * Calculate match quality score (0-100)
 */
export function calculateMatchScore(query: string, target: string): number {
  const normalizedQuery = normalizeSearchText(query)
  const normalizedTarget = normalizeSearchText(target)
  
  // Exact match
  if (normalizedTarget === normalizedQuery) return 100
  
  // Target starts with query
  if (normalizedTarget.startsWith(normalizedQuery)) {
    return 90 + (10 * Math.min(normalizedQuery.length / normalizedTarget.length, 1))
  }
  
  // Query words all found in target
  const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2)
  const targetWords = normalizedTarget.split(' ')
  const matchedWords = queryWords.filter(qw => 
    targetWords.some(tw => tw.includes(qw))
  )
  
  if (matchedWords.length === queryWords.length) {
    return 60 + (matchedWords.length / targetWords.length) * 20
  }
  
  // Partial match
  if (queryWords.some(qw => targetWords.some(tw => tw.includes(qw)))) {
    return 40 + (matchedWords.length / queryWords.length) * 20
  }
  
  return 0
}

/**
 * Result quality classification
 */
export type ResultQuality = 'exact' | 'good' | 'approximate' | 'low'

/**
 * Classify result quality based on match score
 */
export function classifyQuality(score: number): ResultQuality {
  if (score >= 85) return 'exact'
  if (score >= 60) return 'good'
  if (score >= 30) return 'approximate'
  return 'low'
}

/**
 * Get quality label and color
 */
export function getQualityInfo(quality: ResultQuality): { label: string; color: string; bgColor: string } {
  switch (quality) {
    case 'exact':
      return { label: 'Kết quả chính xác', color: 'text-emerald-700', bgColor: 'bg-emerald-100' }
    case 'good':
      return { label: 'Kết quả tốt', color: 'text-blue-700', bgColor: 'bg-blue-100' }
    case 'approximate':
      return { label: 'Kết quả gần đúng', color: 'text-amber-700', bgColor: 'bg-amber-100' }
    case 'low':
      return { label: 'Có thể không chính xác', color: 'text-red-700', bgColor: 'bg-red-100' }
  }
}

/**
 * Extract building/tower name from Vietnamese address
 * Handles formats like:
 * - "Tòa S1.01 Vinhomes Grand Park"
 * - "S1.01 Grand Park"
 * - "Vinhomes Grand Park"
 */
export function extractBuildingInfo(address: string): { building?: string; project?: string; street?: string } {
  const normalized = address.toLowerCase()
  
  // Building patterns
  const buildingPatterns = [
    /tòa\s*([^\s,]+)/gi,
    /block\s*([^\s,]+)/gi,
    /tower\s*([^\s,]+)/gi,
    /tower\s*([a-z]\d+(?:\.\d+)?)/gi,
  ]
  
  let building: string | undefined
  for (const pattern of buildingPatterns) {
    const match = normalized.match(pattern)
    if (match) {
      building = match[0]
      break
    }
  }
  
  // Project patterns
  const projectPatterns = [
    /vinhomes\s*([^\s,]+)/gi,
    /gamuda\s*([^\s,]+)/gi,
    /capitaland\s*([^\s,]+)/gi,
  ]
  
  let project: string | undefined
  for (const pattern of projectPatterns) {
    const match = normalized.match(pattern)
    if (match) {
      project = match[0]
      break
    }
  }
  
  return { building, project }
}
