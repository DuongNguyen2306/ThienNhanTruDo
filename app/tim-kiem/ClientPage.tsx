'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Search, SlidersHorizontal, Map, List, X, MapPin, ShieldCheck, Home } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { BrutalFooter } from '@/components/brutal-footer'
import { BrutalListingCard } from '@/components/brutal-listing-card'
import { listingApi, type Listing as ApiListing } from '@/lib/api'
import { formatVnd } from '@/lib/data'

// Dynamic import RealMap (Leaflet requires client-side only)
const RealMap = dynamic(() => import('@/components/RealMap').then((m) => m.RealMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-[#F5F5F0] text-sm text-[#151515]/50">
      Đang tải bản đồ...
    </div>
  ),
})

const ROOM_TYPES = ['Phòng trọ', 'Chung cư mini', 'Căn hộ dịch vụ', 'Ký túc xá']

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'newest', label: 'Mới nhất' },
]

const AMENITIES = [
  { id: 'ac', label: 'Máy lạnh' },
  { id: 'elevator', label: 'Thang máy' },
  { id: 'furniture', label: 'Nội thất' },
  { id: 'pets', label: 'Cho nuôi thú cưng' },
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [vacantOnly, setVacantOnly] = useState(false)
  const [sortBy, setSortBy] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)
  
  // Map view state - check URL param for initial view
  const initialView = searchParams.get('view') === 'map' ? 'map' : 'list'
  const [viewMode, setViewMode] = useState<'list' | 'map'>(initialView)
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined)
  
  // Ref for map scroll into view
  const mapContainerRef = useRef<HTMLDivElement>(null)
  
  // API data state
  const [listings, setListings] = useState<ApiListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  const ITEMS_PER_PAGE = 9

  // Fetch listings from API
  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page: currentPage,
        limit: ITEMS_PER_PAGE * 5, // Fetch more for client-side filtering
        status: 'active',
      }
      
      if (searchQuery) params.district = searchQuery
      if (priceMin) params.minRent = parseInt(priceMin.replace(/\D/g, ''))
      if (priceMax) params.maxRent = parseInt(priceMax.replace(/\D/g, ''))
      if (areaMin) params.minArea = parseInt(areaMin)
      if (areaMax) params.maxArea = parseInt(areaMax)
      if (selectedTypes.length > 0) params.roomType = selectedTypes[0]
      if (verifiedOnly) params.verified = true
      if (vacantOnly) params.vacantNow = true
      if (sortBy === 'price_asc') { params.sortBy = 'rent'; params.sortOrder = 'asc' }
      if (sortBy === 'price_desc') { params.sortBy = 'rent'; params.sortOrder = 'desc' }
      if (sortBy === 'newest') { params.sortBy = 'createdAt'; params.sortOrder = 'desc' }

      const data = await listingApi.search(params as any)
      setListings(data.listings ?? [])
      setTotalCount(data.pagination?.total ?? data.listings?.length ?? 0)
      // Calculate actual pages based on fetched count (for client-side filtering)
      const fetchedCount = data.listings?.length ?? 0
      setTotalPages(Math.ceil(fetchedCount / ITEMS_PER_PAGE) || 1)
    } catch (err) {
      console.error('[Search] Fetch error:', err)
      setError('Không thể tải danh sách phòng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedTypes, priceMin, priceMax, areaMin, areaMax, verifiedOnly, vacantOnly, sortBy, currentPage])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Client-side additional filtering (for amenities not in API)
  const filteredListings = listings.filter((l) => {
    // Amenities filter
    if (selectedAmenities.includes('pets') && !l.pets) return false
    if (selectedAmenities.includes('furniture') && !l.furniture) return false
    if (selectedAmenities.includes('ac') && !l.amenities?.some((a: string) => a.includes('lạnh'))) return false
    if (selectedAmenities.includes('elevator') && !l.amenities?.some((a: string) => a.includes('Thang'))) return false
    return true
  })

  // Split into VIP and non-VIP, then put VIPs first (preserve original order within each group)
  const vipListings = filteredListings.filter((l) => l.vip)
  const normalListings = filteredListings.filter((l) => !l.vip)
  const sortedListings = [...vipListings, ...normalListings]

  // Pagination - calculate pages based on filtered results
  const paginatedListings = sortedListings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const calculatedTotalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE) || 1

  // Toggle room type
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // Toggle amenity
  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTypes([])
    setPriceMin('')
    setPriceMax('')
    setAreaMin('')
    setAreaMax('')
    setSelectedAmenities([])
    setVerifiedOnly(false)
    setVacantOnly(false)
    setSortBy('default')
    setCurrentPage(1)
  }

  // Check if any filters active
  const hasActiveFilters =
    selectedTypes.length > 0 ||
    priceMin ||
    priceMax ||
    areaMin ||
    areaMax ||
    selectedAmenities.length > 0 ||
    verifiedOnly ||
    vacantOnly

  // Handle view mode change - scroll to content
  const handleViewModeChange = (mode: 'list' | 'map') => {
    setViewMode(mode)
    if (mode === 'map') {
      // Clear selected when entering map mode
      setSelectedListingId(undefined)
      // Scroll to results area
      setTimeout(() => {
        mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  // Handle marker click from map
  const handleMapSelect = (id: string) => {
    setSelectedListingId(id)
  }

  // Handle card click in map view
  const handleCardClick = (listing: ApiListing) => {
    setSelectedListingId(listing.id)
  }

  return (
    <main className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      {/* Page Title & Search Bar */}
      <section className="border-b-[2px] border-[#151515] bg-white py-6">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <h1
            className="text-2xl font-black text-[#151515] lg:text-3xl"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          >
            TÌM PHÒNG PHÙ HỢP VỚI BẠN
          </h1>
          
          {/* Search Bar */}
          <div className="relative mt-4 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#151515]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Nhập quận, huyện, đường..."
              className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] pl-12 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 shadow-[3px_3px_0_#151515]"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left Sidebar - Filters */}
          <aside className="w-full lg:w-[290px] shrink-0">
            <div className="sticky top-[76px] rounded-xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#151515]">
                  <SlidersHorizontal className="size-4" />
                  Bộ lọc
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-[#151515]/60 hover:text-red-500"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {/* Room Type */}
              <div className="mb-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                  Loại phòng
                </h3>
                <div className="flex flex-col gap-2">
                  {ROOM_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleType(type)}
                        className="size-4 rounded border-[2px] border-[#151515] accent-[#FDE047]"
                      />
                      <span className="text-sm text-[#151515]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                  Khoảng giá
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Từ"
                    className="h-10 w-full rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] px-3 text-xs shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none"
                  />
                  <span className="text-[#151515]/40">-</span>
                  <input
                    type="text"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Đến"
                    className="h-10 w-full rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] px-3 text-xs shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none"
                  />
                </div>
              </div>

              {/* Area */}
              <div className="mb-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                  Diện tích
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={areaMin}
                    onChange={(e) => setAreaMin(e.target.value)}
                    placeholder="Từ"
                    className="h-10 w-full rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] px-3 text-xs shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none"
                  />
                  <span className="text-[#151515]/40">-</span>
                  <input
                    type="number"
                    value={areaMax}
                    onChange={(e) => setAreaMax(e.target.value)}
                    placeholder="Đến"
                    className="h-10 w-full rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] px-3 text-xs shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none"
                  />
                  <span className="text-xs text-[#151515]/40">m²</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                  Tiện ích
                </h3>
                <div className="flex flex-col gap-2">
                  {AMENITIES.map((amenity) => (
                    <label
                      key={amenity.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity.id)}
                        onChange={() => toggleAmenity(amenity.id)}
                        className="size-4 rounded border-[2px] border-[#151515] accent-[#FDE047]"
                      />
                      <span className="text-sm text-[#151515]">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="mb-5 space-y-3">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[#151515]/10 bg-white p-3 transition hover:border-[#151515]/30">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium text-[#151515]">Đã xác minh</span>
                  </div>
                  <div
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`relative size-12 rounded-full border-[2px] border-[#151515] transition-colors ${
                      verifiedOnly ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                        verifiedOnly ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[#151515]/10 bg-white p-3 transition hover:border-[#151515]/30">
                  <div className="flex items-center gap-2">
                    <Home className="size-4 text-amber-500" />
                    <span className="text-sm font-medium text-[#151515]">Trống ngay</span>
                  </div>
                  <div
                    onClick={() => setVacantOnly(!vacantOnly)}
                    className={`relative size-12 rounded-full border-[2px] border-[#151515] transition-colors ${
                      vacantOnly ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                        vacantOnly ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
                >
                  Áp dụng bộ lọc
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1" ref={mapContainerRef}>
            {/* Results Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#151515]/70">
                  Tìm thấy <strong className="font-bold text-[#151515]">{sortedListings.length}</strong> tin phù hợp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 rounded-xl border-[2px] border-[#151515] bg-white px-4 text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                
                {/* Map Toggle Button */}
                <button
                  onClick={() => handleViewModeChange(viewMode === 'list' ? 'map' : 'list')}
                  className={`h-10 flex items-center gap-2 rounded-xl border-[2px] border-[#151515] px-4 text-sm font-bold shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515] ${
                    viewMode === 'map'
                      ? 'bg-[#FDE047] text-[#151515]'
                      : 'bg-white text-[#151515]'
                  }`}
                >
                  {viewMode === 'list' ? (
                    <>
                      <Map className="size-4" />
                      Xem bản đồ
                    </>
                  ) : (
                    <>
                      <List className="size-4" />
                      Xem danh sách
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <>
                {/* Listing Grid */}
                {paginatedListings.length > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {paginatedListings.map((listing) => (
                      <BrutalListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white p-12 text-center shadow-[4px_4px_0_#151515]">
                    <div className="mb-4 text-5xl">🔍</div>
                    <h3 className="text-lg font-bold text-[#151515]">Không tìm thấy tin phù hợp</h3>
                    <p className="mt-2 text-sm text-[#151515]/60">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-4 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {calculatedTotalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(calculatedTotalPages, 5) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] text-sm font-bold shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515] ${
                            currentPage === page
                              ? 'bg-[#FDE047] text-[#151515]'
                              : 'bg-white text-[#151515]'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    {calculatedTotalPages > 5 && <span className="text-sm text-[#151515]/40">...</span>}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(calculatedTotalPages, p + 1))}
                      disabled={currentPage === calculatedTotalPages}
                      className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ›
                    </button>
                  </div>
                )}
              </>
            )}

            {/* MAP VIEW */}
            {viewMode === 'map' && (
              <div className="flex flex-col gap-4 lg:flex-row">
                {/* Compact Listing Cards */}
                <div className="w-full lg:w-[380px] shrink-0 space-y-3 lg:max-h-[600px] lg:overflow-y-auto">
                  {sortedListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white p-8 text-center shadow-[4px_4px_0_#151515]">
                      <div className="mb-3 text-4xl">🔍</div>
                      <p className="text-sm text-[#151515]/60">
                        Không có phòng nào phù hợp
                      </p>
                    </div>
                  ) : (
                    sortedListings.map((listing) => (
                      <CompactListingCard
                        key={listing.id}
                        listing={listing}
                        isSelected={selectedListingId === listing.id}
                        onClick={() => handleCardClick(listing)}
                      />
                    ))
                  )}
                </div>

                {/* RealMap */}
                <div className="flex-1">
                  <div className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[5px_5px_0_#151515]">
                    <RealMap
                      listings={sortedListings}
                      selectedId={selectedListingId}
                      onSelect={handleMapSelect}
                      height="h-[600px]"
                      hint="Nhấn marker để xem thông tin phòng"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BrutalFooter />
    </main>
  )
}

// Compact listing card for map view
function CompactListingCard({
  listing,
  isSelected,
  onClick,
}: {
  listing: ApiListing
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-[2px] bg-white p-3 text-left transition-all shadow-[3px_3px_0_#151515] ${
        isSelected
          ? 'border-[#FDE047] bg-[#FDE047]/10'
          : 'border-[#151515] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]'
      }`}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <Image
            src={listing.image || '/placeholder.jpg'}
            alt={listing.title}
            width={80}
            height={60}
            className="aspect-[4/3] w-20 rounded-lg object-cover"
            unoptimized
          />
          {listing.vip && (
            <span
              className="absolute -top-1 -right-1 rounded bg-gradient-to-r from-emerald-500 to-green-400 px-1.5 py-0.5 text-[9px] font-black text-white border-[1.5px] border-[#151515]"
              style={{
                boxShadow: '0 0 6px 1px rgba(34, 197, 94, 0.5)',
              }}
            >
              ⭐ VIP
            </span>
          )}
          {listing.verified && (
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#059669] text-[8px] text-white">
              ✓
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#151515] line-clamp-1">{listing.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#151515]/60">
            <MapPin className="size-2.5 shrink-0" />
            <span className="truncate">{listing.district}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-[#059669]">{formatVnd(listing.rent)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded bg-[#F5F5F0] px-1.5 py-0.5 text-[9px] font-medium text-[#151515]/70">
              {listing.area}m²
            </span>
            <span className="rounded bg-[#F5F5F0] px-1.5 py-0.5 text-[9px] font-medium text-[#151515]/70">
              {listing.roomType}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
