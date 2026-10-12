'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  ArrowLeft, BadgeCheck, Calendar, Car, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, CookingPot, DoorOpen, ElectricBolt, Eye, Home, MapPin, MessageCircle,
  Phone, Share2, ShieldCheck, Star, WaterDrop, WifiHigh, X, Flag, ExternalLink,
} from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { BrutalFooter } from '@/components/brutal-footer'
import { formatVnd, getListing, getSeller, reviews, totalMonthly, type Listing } from '@/lib/data'

// Dynamic import RealMap (Leaflet requires client-side only)
const RealMap = dynamic(() => import('@/components/RealMap').then((m) => m.RealMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl bg-[#F5F5F0] text-sm text-[#151515]/50">
      Đang tải bản đồ...
    </div>
  ),
})

// Amenity icons mapping
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Máy lạnh': <span>❄️</span>,
  'Thang máy': <span>🏢</span>,
  'Giờ giấc tự do': <span>🕐</span>,
  'PCCC đạt chuẩn': <span>🔥</span>,
  'Máy giặt': <span>🧺</span>,
  'Nội thất đầy đủ': <span>🛋️</span>,
  'Cho nuôi thú cưng': <span>🐕</span>,
  'Wifi miễn phí': <span>📶</span>,
  'Ban công': <span>🌿</span>,
  'Bếp': <span>🍳</span>,
}

export default function ListingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const listing = getListing(id)
  const seller = listing ? getSeller(listing.sellerId) : undefined
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [people, setPeople] = useState(1)

  // Booking form state
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  const [bookingNote, setBookingNote] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Validate phone number (Vietnamese format)
  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '')
    return /^(0[0-9]{9,10})$/.test(cleaned)
  }

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Validate booking form
  const validateBookingForm = () => {
    const errors: Record<string, string> = {}
    
    if (!bookingDate) {
      errors.date = 'Vui lòng chọn ngày xem phòng'
    } else {
      const selected = new Date(bookingDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected <= today) {
        errors.date = 'Ngày xem phải từ ngày mai trở đi'
      }
    }
    
    if (!bookingTime) {
      errors.time = 'Vui lòng chọn giờ xem phòng'
    }
    
    if (!bookingPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại'
    } else if (!isValidPhone(bookingPhone)) {
      errors.phone = 'Số điện thoại không hợp lệ (VD: 0912 345 678)'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle booking submission
  const handleBookingSubmit = async () => {
    if (!validateBookingForm()) return
    
    setBookingLoading(true)
    setBookingError('')
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Success
      setBookingSuccess(true)
      setBookingLoading(false)
      
      // Reset form after delay
      setTimeout(() => {
        setShowBookingModal(false)
        setBookingDate('')
        setBookingTime('')
        setBookingPhone('')
        setBookingNote('')
        setBookingSuccess(false)
        setFormErrors({})
      }, 2000)
    } catch {
      setBookingError('Đã xảy ra lỗi. Vui lòng thử lại.')
      setBookingLoading(false)
    }
  }

  // Close modal and reset form
  const closeBookingModal = () => {
    setShowBookingModal(false)
    setBookingDate('')
    setBookingTime('')
    setBookingPhone('')
    setBookingNote('')
    setBookingSuccess(false)
    setBookingError('')
    setFormErrors({})
  }

  if (!listing || !seller) {
    return (
      <main className="min-h-screen bg-[#F5F5F0]">
        <BrutalHeader />
        <div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#151515]">Không tìm thấy tin đăng</h1>
            <Link href="/tim-kiem" className="mt-4 inline-block text-sm text-[#151515]/60 hover:text-[#FDE047]">
              ← Quay về trang tìm kiếm
            </Link>
          </div>
        </div>
        <BrutalFooter />
      </main>
    )
  }

  const listingReviews = reviews.filter((r) => r.listingId === listing.id)
  const monthlyTotal = totalMonthly(listing, people)
  const photos = listing.photos.length > 0 ? listing.photos : [{ src: listing.image, label: 'Tổng quan', source: 'host' as const }]

  return (
    <main className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      {/* Breadcrumb & Title Section */}
      <section className="border-b-[2px] border-[#151515] bg-white py-4">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          {/* Back button */}
          <Link
            href="/tim-kiem"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#151515]/60 transition-colors hover:text-[#151515]"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>

          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-xs text-[#151515]/50">
            <Link href="/" className="hover:text-[#151515]">Trang chủ</Link>
            <span>/</span>
            <Link href="/tim-kiem" className="hover:text-[#151515]">Tìm phòng</Link>
            <span>/</span>
            <span className="text-[#151515]">Chi tiết phòng</span>
          </div>

          {/* Title Row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-[#151515] lg:text-3xl">
                  {listing.title}
                </h1>
                {listing.verified && (
                  <span className="flex items-center gap-1 rounded-lg bg-[#FDE047] px-3 py-1 text-xs font-bold text-[#151515] border-[1.5px] border-[#151515]">
                    <BadgeCheck className="size-3.5" />
                    Đã xác minh
                  </span>
                )}
                {listing.vip && (
                  <span className="rounded-lg bg-[#151515] px-3 py-1 text-xs font-bold text-white border-[1.5px] border-[#151515]">
                    VIP
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-[#151515]/60">
                <MapPin className="size-4" />
                <span>{listing.address}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                aria-label="Lưu tin"
              >
                ❤️
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                aria-label="Chia sẻ"
              >
                <Share2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* LEFT COLUMN */}
          <div className="flex-1">
            {/* Photo Gallery */}
            <div className="mb-6">
              <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[6px_6px_0_#151515]">
                <Image
                  src={photos[currentPhoto].src}
                  alt={photos[currentPhoto].label}
                  width={1200}
                  height={600}
                  className="aspect-[16/9] w-full object-cover"
                  unoptimized
                />
                {/* Photo source badge */}
                <div className="absolute left-4 top-4 flex gap-2">
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold border-[1.5px] border-[#151515] ${
                    photos[currentPhoto].source === 'manager'
                      ? 'bg-[#FDE047] text-[#151515]'
                      : 'bg-white/90 text-[#151515]'
                  }`}>
                    {photos[currentPhoto].source === 'manager' ? '📷 Ảnh do Manager chụp' : '📸 Ảnh chủ nhà'}
                  </span>
                </div>
                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentPhoto((p) => (p === 0 ? photos.length - 1 : p - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPhoto((p) => (p === photos.length - 1 ? 0 : p + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPhoto(i)}
                      className={`relative shrink-0 overflow-hidden rounded-xl border-[2px] ${
                        i === currentPhoto ? 'border-[#151515]' : 'border-transparent'
                      } shadow-[2px_2px_0_#151515]`}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.label}
                        width={120}
                        height={80}
                        className="aspect-[4/3] w-20 object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Key Info */}
            <div className="mb-6">
              <div className="flex flex-wrap items-baseline gap-4">
                <span className="text-3xl font-black text-[#151515] lg:text-4xl">
                  {formatVnd(listing.rent)}
                </span>
                <span className="text-base text-[#151515]/50">/ tháng</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="flex items-center gap-1.5 rounded-lg bg-[#F5F5F0] px-3 py-1.5 text-xs font-semibold text-[#151515] border-[1.5px] border-[#151515]">
                  <Home className="size-3.5" />
                  {listing.roomType}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-[#F5F5F0] px-3 py-1.5 text-xs font-semibold text-[#151515] border-[1.5px] border-[#151515]">
                  📐 {listing.area} m²
                </span>
                <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border-[1.5px] border-[#151515] ${
                  listing.vacantNow
                    ? 'bg-[#FDE047] text-[#151515]'
                    : 'bg-white text-[#151515]/60'
                }`}>
                  {listing.vacantNow ? '🟢 Còn trống' : '🟡 Sắp trống'}
                </span>
              </div>
            </div>

            {/* Room Info */}
            <div className="mb-6 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#151515]">
                <DoorOpen className="size-5" />
                Thông tin phòng
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Hướng phòng</span>
                  <span className="text-sm font-bold text-[#151515]">{listing.direction}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Số người ở</span>
                  <span className="text-sm font-bold text-[#151515]">{people} người</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Thú cưng</span>
                  <span className="text-sm font-bold text-[#151515]">{listing.pets ? 'Cho phép' : 'Không'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Đường rộng</span>
                  <span className="text-sm font-bold text-[#151515]">{listing.roadWidth}m</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Ô tô vào được</span>
                  <span className="text-sm font-bold text-[#151515]">{listing.carAccess ? 'Có' : 'Không'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F5F5F0] px-4 py-3">
                  <span className="text-sm text-[#151515]/60">Xe tải vào được</span>
                  <span className="text-sm font-bold text-[#151515]">{listing.truckAccess ? 'Có' : 'Không'}</span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="mb-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#151515]">
                ✨ Tiện ích
              </h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515]"
                  >
                    {AMENITY_ICONS[amenity] || '•'} {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* Fee Breakdown Table */}
            <div className="mb-6 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#151515]">
                💰 Bảng chi phí minh bạch
              </h2>
              <div className="space-y-2">
                {[
                  ['Tiền thuê hàng tháng', formatVnd(listing.rent)],
                  ['Tiền cọc', `${listing.depositMonths} tháng · ${formatVnd(listing.rent * listing.depositMonths)}`],
                  ['Đơn giá điện', `${formatVnd(listing.electricity)}/kWh · ${listing.electricityType}`],
                  ['Tiền nước', listing.waterType === 'Đầu người' ? `${formatVnd(listing.water)}/người/tháng` : `${formatVnd(listing.water)}/m³`],
                  ['Internet', listing.internet === 0 ? 'Miễn phí' : formatVnd(listing.internet)],
                  ['Phí gửi xe máy', listing.parkingBike === 0 ? 'Miễn phí' : formatVnd(listing.parkingBike)],
                  ['Phí quản lý', listing.managementFee === 0 ? 'Miễn phí' : formatVnd(listing.managementFee)],
                  ['Phí vệ sinh', listing.sanitation === 0 ? 'Miễn phí' : formatVnd(listing.sanitation)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border-[1.5px] border-[#151515]/10 bg-[#F5F5F0] px-4 py-3">
                    <span className="text-sm text-[#151515]/70">{label}</span>
                    <span className="text-sm font-semibold text-[#151515]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Estimate Calculator */}
            <div className="mb-6 rounded-2xl border-[2px] border-[#151515] bg-[#151515] p-6 shadow-[5px_5px_0_#FDE047]">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-[#FDE047]">Mô phỏng chi phí hàng tháng</p>
                <div className="flex gap-2">
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPeople(n)}
                      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                        people === n
                          ? 'bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {n} người
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-4 font-mono text-4xl font-black text-white lg:text-5xl">
                {formatVnd(monthlyTotal)}
              </p>
              <p className="mt-2 text-xs text-white/50">
                Gồm tiền phòng + điện ước lượng {people === 1 ? '80' : '140'} kWh + nước + phí cố định.
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FDE047]/30 bg-[#FDE047]/10 px-4 py-3">
                <ShieldCheck className="size-5 shrink-0 text-[#FDE047]" />
                <p className="text-xs font-medium text-white/80">
                  Cam kết hoàn cọc 100% + bù 200.000đ nếu chi phí thực tế khác bảng giá trên web.
                </p>
              </div>
            </div>

            {/* Location Map Section */}
            <div className="mb-6 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#151515]">
                  🗺️ Vị trí phòng
                </h2>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${listing.lat}&mlon=${listing.lng}&zoom=17`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                >
                  <ExternalLink className="size-4" />
                  Mở bản đồ lớn
                </a>
              </div>
              
              {/* RealMap with listing marker */}
              <div className="h-[400px] overflow-hidden rounded-xl border-[2px] border-[#151515] shadow-[3px_3px_0_#151515]">
                <RealMap
                  listings={[listing]}
                  selectedId={listing.id}
                  height="h-full"
                  hint={`${listing.street || listing.address}, ${listing.ward}, ${listing.district}`}
                />
              </div>
              
              {/* Address Summary */}
              <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
                <p className="text-sm text-[#151515]">
                  <strong>Địa chỉ:</strong> {listing.houseNumber}{listing.alley && ` hẻm ${listing.alley},`} {listing.street || listing.address}, {listing.ward}, {listing.district}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#151515]/60">
                  <span className="flex items-center gap-1">
                    📐 Đường rộng: {listing.roadWidth}m
                  </span>
                  <span className="flex items-center gap-1">
                    🚗 Ô tô: {listing.carAccess ? 'Vào được' : 'Không vào được'}
                  </span>
                  <span className="flex items-center gap-1">
                    🚚 Xe tải: {listing.truckAccess ? 'Vào được' : 'Không vào được'}
                  </span>
                </p>
              </div>
            </div>

            {/* Reviews */}
            <div className="mb-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#151515]">
                ⭐ Đánh giá ({listingReviews.length})
              </h2>
              {listingReviews.length === 0 ? (
                <p className="text-sm text-[#151515]/50">Chưa có đánh giá nào.</p>
              ) : (
                <div className="space-y-3">
                  {listingReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#151515]">{review.author}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${i < review.score ? 'fill-[#FDE047] text-[#FDE047]' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[#151515]/70">{review.text}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#151515]/50 sm:grid-cols-4">
                        <span>📷 Giống ảnh: {review.photoMatch}/5</span>
                        <span>👤 Thái độ chủ: {review.landlord}/5</span>
                        <span>🔒 An ninh: {review.security}/5</span>
                        <span>🧹 Vệ sinh: {review.hygiene}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Report */}
            <div className="flex justify-end">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600"
              >
                <Flag className="size-4" />
                Báo cáo vi phạm
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - Booking Sidebar */}
          <aside className="w-full lg:w-[340px] shrink-0">
            <div className="sticky top-[76px] space-y-4">
              {/* Seller Card */}
              <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
                {/* Price Header */}
                <div className="rounded-t-2xl bg-[#FDE047] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                    Giá thuê / tháng
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-[#151515]">
                    {formatVnd(listing.rent)}
                  </p>
                  <p className="mt-1 text-sm text-[#151515]/70">
                    Cọc {listing.depositMonths} tháng · {formatVnd(listing.rent * listing.depositMonths)}
                  </p>
                </div>

                {/* Seller Info */}
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-full bg-[#FDE047] text-lg font-black text-[#151515] border-[2px] border-[#151515]">
                      {seller.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <b className="text-base text-[#151515]">{seller.name}</b>
                      {seller.verified && (
                        <p className="flex items-center gap-1 text-xs font-medium text-[#151515]/60">
                          <BadgeCheck className="size-3.5 text-green-600" />
                          Đã định danh
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#F5F5F0] p-2 text-center border-[1.5px] border-[#151515]/10">
                      <p className="text-[10px] text-[#151515]/50">Phản hồi</p>
                      <p className="font-bold text-[#151515]">{seller.responseRate}%</p>
                    </div>
                    <div className="rounded-xl bg-[#F5F5F0] p-2 text-center border-[1.5px] border-[#151515]/10">
                      <p className="text-[10px] text-[#151515]/50">Điểm uy tín</p>
                      <p className="font-bold text-[#151515]">{seller.trustScore}/5</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(true)
                      setBookingPhone('')
                      setBookingDate('')
                      setBookingTime('')
                      setBookingNote('')
                      setFormErrors({})
                      setBookingError('')
                      setBookingSuccess(false)
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-3 text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515]"
                  >
                    <Calendar className="size-5" />
                    Hẹn xem phòng
                  </button>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${seller.phone}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white py-2.5 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                    >
                      <Phone className="size-4" />
                      Gọi ngay
                    </a>
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]"
                    >
                      <MessageCircle className="size-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trust Commitment */}
              <div className="rounded-2xl border-[2px] border-[#151515] bg-[#FDE047] p-4 shadow-[4px_4px_0_#151515]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-[#151515]" />
                  <p className="font-bold text-[#151515]">Cam kết minh bạch</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#151515]/80">
                  Nếu chi phí thực tế khác bảng giá, bạn được hoàn cọc <b>100%</b> + bù <b>200.000đ</b>.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="rounded-2xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-[#151515]/60">
                    <Eye className="size-4" />
                    Lượt xem
                  </span>
                  <span className="font-semibold text-[#151515]">{listing.views.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-[#151515]/60">
                    <Star className="size-4" />
                    Đánh giá
                  </span>
                  <span className="font-semibold text-[#151515]">{listing.rating}/5 ({listing.reviewCount})</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <BrutalFooter />

      {/* Booking Modal */}
      {showBookingModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBookingModal()
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border-[3px] border-[#151515] bg-white shadow-[6px_6px_0_#151515] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-black text-[#151515]">ĐẶT LỊCH XEM PHÒNG</h2>
                <p className="mt-0.5 text-xs text-[#151515]/60">Yêu cầu sẽ được gửi đến chủ đăng tin</p>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:bg-[#151515] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Success State */}
            {bookingSuccess ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[#059669] text-4xl">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-[#151515]">Đặt lịch thành công!</h3>
                <p className="mt-2 text-sm text-[#151515]/60">
                  Yêu cầu của bạn đang chờ chủ nhà xác nhận.
                </p>
                <p className="mt-1 text-xs text-[#151515]/40">
                  Bạn sẽ được thông báo khi có phản hồi.
                </p>
              </div>
            ) : (
              <>
                {/* Modal Content */}
                <div className="p-4 sm:p-5">
                  {/* Listing Preview */}
                  <div className="mb-5 flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-3 shadow-[2px_2px_0_#151515]">
                    <div className="relative shrink-0">
                      <Image
                        src={listing.image}
                        alt={listing.title}
                        width={80}
                        height={60}
                        className="aspect-[4/3] w-20 rounded-lg object-cover border border-[#151515]/20"
                        unoptimized
                      />
                      {listing.vip && (
                        <span className="absolute -top-1.5 -right-1.5 rounded bg-[#151515] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#151515] line-clamp-1 text-sm sm:text-base">{listing.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#151515]/60">
                        <MapPin className="size-3 shrink-0" />
                        {listing.ward}, {listing.district}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#059669]">{formatVnd(listing.rent)}/tháng</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Date Picker */}
                    <div>
                      <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#151515]">
                        Ngày muốn xem
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => {
                          setBookingDate(e.target.value)
                          if (formErrors.date) {
                            setFormErrors({ ...formErrors, date: '' })
                          }
                        }}
                        min={getMinDate()}
                        className={`h-12 w-full rounded-xl border-[2px] bg-[#F5F5F0] px-4 text-sm shadow-[2px_2px_0_#151515] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 ${
                          formErrors.date 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                            : 'border-[#151515] focus:border-[#FDE047]'
                        }`}
                      />
                      {formErrors.date && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <span className="text-base">⚠️</span> {formErrors.date}
                        </p>
                      )}
                    </div>

                    {/* Time Picker */}
                    <div>
                      <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#151515]">
                        Giờ muốn xem
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                        {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              setBookingTime(time)
                              if (formErrors.time) {
                                setFormErrors({ ...formErrors, time: '' })
                              }
                            }}
                            className={`rounded-xl border-[2px] py-2.5 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all ${
                              bookingTime === time
                                ? 'border-[#151515] bg-[#FDE047] text-[#151515]'
                                : 'border-[#151515] bg-white text-[#151515] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#151515]'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                      {formErrors.time && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <span className="text-base">⚠️</span> {formErrors.time}
                        </p>
                      )}
                    </div>

                    {/* Phone Input */}
                    <div>
                      <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#151515]">
                        Số điện thoại liên hệ
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={bookingPhone}
                        onChange={(e) => {
                          setBookingPhone(e.target.value)
                          if (formErrors.phone) {
                            setFormErrors({ ...formErrors, phone: '' })
                          }
                        }}
                        placeholder="VD: 0912 345 678"
                        className={`h-12 w-full rounded-xl border-[2px] bg-[#F5F5F0] px-4 text-sm shadow-[2px_2px_0_#151515] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 ${
                          formErrors.phone 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                            : 'border-[#151515] focus:border-[#FDE047]'
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <span className="text-base">⚠️</span> {formErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Note Input */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#151515]">
                        Ghi chú <span className="font-normal text-[#151515]/50">(không bắt buộc)</span>
                      </label>
                      <textarea
                        value={bookingNote}
                        onChange={(e) => setBookingNote(e.target.value)}
                        placeholder="VD: Tôi muốn xem phòng vào buổi sáng..."
                        className="min-h-20 w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 resize-none"
                      />
                    </div>

                    {/* Error Message */}
                    {bookingError && (
                      <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                        <span className="text-base text-red-500">⚠️</span>
                        <p className="text-sm text-red-600">{bookingError}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 border-t-[2px] border-[#151515] bg-[#F5F5F0] p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    disabled={bookingLoading}
                    className="flex-1 rounded-xl border-[2px] border-[#151515] bg-white py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleBookingSubmit}
                    disabled={bookingLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Calendar className="size-4" />
                        Gửi yêu cầu hẹn xem
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
