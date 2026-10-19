'use client'

// Utility functions safe for client-side use
export function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

/**
 * Parse Vietnamese currency input to integer.
 * Handles both dot (.) and comma (,) as thousand separators.
 * 
 * Valid inputs:
 * - "3500000" → 3500000
 * - "3.500.000" → 3500000
 * - "3,500,000" → 3500000
 * - "3500" → 3500
 * - "0" → 0
 * 
 * Returns NaN for invalid input (non-numeric strings).
 */
export function parseVnd(value: string): number {
  if (!value || typeof value !== 'string') return 0
  
  // Trim whitespace
  const trimmed = value.trim()
  if (trimmed === '') return 0
  
  // Remove all thousand separators (dots and commas)
  // Also handle mixed formats like "3.500,000"
  const cleaned = trimmed
    .replace(/[.\s]/g, '') // Remove dots and whitespace
    .replace(/,/g, '')      // Remove commas
  
  // Check if remaining characters are all digits
  if (!/^\d+$/.test(cleaned)) {
    return NaN // Invalid input
  }
  
  const result = parseInt(cleaned, 10)
  return isNaN(result) ? 0 : result
}

/**
 * Format input value as user types (add thousand separators on the fly).
 * Used for controlled input fields.
 * 
 * @param value - Raw input value
 * @param previousValue - Previous formatted value to detect deletion
 */
export function formatVndInput(value: string, previousValue: string = ''): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  
  if (digits === '') return ''
  
  // Parse to number
  const num = parseInt(digits, 10)
  if (isNaN(num)) return ''
  
  // Format with thousand separators
  return num.toLocaleString('vi-VN')
}

/**
 * Check if a VND input string is valid (not malformed).
 */
export function isValidVndInput(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  
  const trimmed = value.trim()
  if (trimmed === '') return true // Empty is valid (handled separately)
  
  // Must have at least one digit
  if (!/\d/.test(trimmed)) return false
  
  // Remove valid separators and check remaining is all digits
  const cleaned = trimmed.replace(/[.\s,]/g, '')
  return /^\d+$/.test(cleaned)
}

export function totalMonthly(listing: { water: number; waterType: string; electricity: number; rent: number; internet: number; sanitation: number; parkingBike: number; managementFee: number }, people = 1) {
  const water = listing.waterType === 'Đầu người' ? listing.water * people : listing.water * 4 * people
  const elec = listing.electricity * (people === 1 ? 80 : 140)
  return listing.rent + listing.internet + listing.sanitation + listing.parkingBike + listing.managementFee + water + elec
}
