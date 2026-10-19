'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Edit2, Eye, Heart, MessageCircle, Star, MapPin, Home, Wifi, Wind,
  Car, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import { sellerApi, type Listing } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { cn } from '@/lib/utils'

type TabId = 'chi-tiet' | 'lich-hen' | 'danh-gia'

const tabs: { id: TabId; label: string }[] = [
  { id: 'chi-tiet', label: 'Chi tiết' },
  { id: 'lich-hen', label: 'Lịch hẹn' },
  { id: 'danh-gia', label: 'Đánh giá' },
]

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Đang hiển thị', className: 'bg-[#dcfce7] text-[#166534] border-[#86efac]', icon: CheckCircle2 },
  pending: { label: 'Chờ duyệt', className: 'bg-[#fef9c3] text-[#854d0e] border-[#fde047]', icon: Clock },
  inactive: { label: 'Đã ẩn', className: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]', icon: XCircle },
  rejected: { label: 'Bị từ chối', className: 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]', icon: AlertCircle },
  draft: { label: 'Nháp', className: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]', icon: Edit2 },
}

export default function ListingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('chi-tiet')

  useEffect(() => {
    sellerApi.getListings()
      .then(({ listings }) => {
        const found = listings.find((l) => l.id === id)
        if (found) {
          setListing(found)
        } else {
          setError('Không tìm thấy tin đăng này.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Không thể tải thông tin tin đăng.')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
        </div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="size-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#151515]">{error || 'Tin đăng không tồn tại'}</h2>
          <Link
            href="/seller/listings"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
          >
            <ArrowLeft className="size-4" />
            Quay lại danh sách
          </Link>
        </div>
      </main>
    )
  }

  const status = statusConfig[listing.status] || statusConfig.draft
  const StatusIcon = status.icon
  const address = [
    listing.houseNumber,
    listing.alley ? `Hẻm ${listing.alley}` : null,
    listing.street,
    listing.ward,
    listing.district,
  ].filter(Boolean).join(', ')

  const utilities = [
    { icon: Wifi, label: 'Wifi', value: 'Có' },
    { icon: Wind, label: 'Máy lạnh', value: listing.furniture ? 'Có' : 'Không' },
    { icon: Car, label: 'Giữ xe', value: listing.parkingBike ? 'Có' : 'Không' },
    { icon: ShieldCheck, label: 'PCCC', value: 'Đạt chuẩn' },
  ]

  return (
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <Link href="/seller/listings" className="hover:text-[#151515]">Quản lý tin đăng</Link>
        <span>/</span>
        <span className="text-[#151515]">{listing.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/seller/listings"
            className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
          >
            <ArrowLeft className="size-5 text-[#151515]" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#151515]">Chi tiết tin đăng</h1>
            <p className="text-sm text-[#151515]/60">Mã tin: {listing.id.toUpperCase()}</p>
          </div>
        </div>
        <Link
          href={`/seller/listings/${listing.id}/edit`}
          className="inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          <Edit2 className="size-4" />
          Chỉnh sửa
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Listing Card */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            {/* Image */}
            <div className="relative aspect-video bg-[#F5F5F0]">
              {listing.photos?.[0] ? (
                <Image
                  src={listing.photos[0]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : listing.image ? (
                <Image
                  src={listing.image}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[#151515]/30">
                  <Home className="size-16" />
                </div>
              )}
              {listing.verified && (
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#059669] px-3 py-1.5 text-xs font-bold text-white">
                  <ShieldCheck className="size-3.5" />
                  Đã xác minh
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#151515]">{listing.title}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#151515]/60">
                    <MapPin className="size-4 shrink-0" />
                    <span>{address}</span>
                  </div>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
                  status.className
                )}>
                  <StatusIcon className="size-4" />
                  {status.label}
                </span>
              </div>

              {/* Quick Info */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-[#F5F5F0] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Giá thuê</span>
                  <p className="mt-1 font-mono text-lg font-bold text-[#151515]">{formatVnd(listing.rent)}</p>
                  <span className="text-xs text-[#151515]/60">/tháng</span>
                </div>
                <div className="rounded-xl bg-[#F5F5F0] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Diện tích</span>
                  <p className="mt-1 font-mono text-lg font-bold text-[#151515]">{listing.area || '-'} <span className="text-sm">m²</span></p>
                </div>
                <div className="rounded-xl bg-[#F5F5F0] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Loại phòng</span>
                  <p className="mt-1 text-lg font-bold text-[#151515]">{listing.roomType || '-'}</p>
                </div>
                <div className="rounded-xl bg-[#F5F5F0] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Cọc</span>
                  <p className="mt-1 text-lg font-bold text-[#151515]">{listing.depositMonths || 1} <span className="text-sm">tháng</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            {/* Tab Headers */}
            <div className="flex border-b-[2px] border-[#151515]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 px-6 py-4 text-sm font-bold transition-all',
                    activeTab === tab.id
                      ? 'bg-[#151515] text-white'
                      : 'text-[#151515]/60 hover:bg-[#F5F5F0]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'chi-tiet' && (
                <div className="flex flex-col gap-6">
                  {/* Description */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Mô tả</h3>
                    <p className="text-[#151515]">
                      {listing.title} - {listing.roomType} tại {address}.
                      Diện tích {listing.area || '-'}m², giá thuê {formatVnd(listing.rent)}/tháng.
                      {listing.furniture && ' Phòng có nội thất đầy đủ.'}
                      {listing.vacantNow && ' Có thể dọn vào ngay.'}
                    </p>
                  </div>

                  {/* Utilities */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Tiện ích</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {utilities.map((item) => {
                        const Icon = item.icon
                        return (
                          <div key={item.label} className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515]/20 p-3">
                            <Icon className="size-5 text-[#059669]" />
                            <div>
                              <p className="text-xs text-[#151515]/60">{item.label}</p>
                              <p className="text-sm font-bold text-[#151515]">{item.value}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Hình ảnh ({listing.photos?.length || 0})</h3>
                    {listing.photos && listing.photos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {listing.photos.map((photo, index) => (
                          <div key={index} className="relative aspect-square overflow-hidden rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
                            <Image src={photo} alt={`Ảnh ${index + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#151515]/60">Chưa có hình ảnh</p>
                    )}
                  </div>

                  {/* Amenities */}
                  {listing.amenities && listing.amenities.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Danh sách tiện ích</h3>
                      <div className="flex flex-wrap gap-2">
                        {listing.amenities.map((amenity, index) => (
                          <span key={index} className="rounded-full border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-3 py-1 text-sm font-medium text-[#151515]">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Vị trí</h3>
                    <div className="rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
                      <div className="flex items-center gap-2 text-sm text-[#151515]">
                        <MapPin className="size-4 text-[#059669]" />
                        <span>{address}</span>
                      </div>
                      {listing.lat && listing.lng && (
                        <p className="mt-2 font-mono text-xs text-[#151515]/60">
                          Tọa độ: {listing.lat.toFixed(6)}, {listing.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lich-hen' && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageCircle className="size-12 text-[#151515]/20" />
                  <p className="mt-4 text-[#151515]/60">Chưa có lịch hẹn nào</p>
                </div>
              )}

              {activeTab === 'danh-gia' && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Star className="size-12 text-[#151515]/20" />
                  <p className="mt-4 text-[#151515]/60">Chưa có đánh giá nào</p>
                  {listing.rating && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'size-5',
                              star <= (listing.rating || 0) ? 'fill-[#FDE047] text-[#FDE047]' : 'text-[#151515]/20'
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-[#151515]">{listing.rating.toFixed(1)}</span>
                      <span className="text-sm text-[#151515]/60">({listing.reviewCount} đánh giá)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Stats */}
          <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3">
              <h3 className="text-sm font-bold text-[#151515]">Thống kê tin</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <Eye className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">{listing.views}</p>
                <span className="text-xs text-[#151515]/60">Lượt xem</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <Heart className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">-</p>
                <span className="text-xs text-[#151515]/60">Lượt lưu</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <MessageCircle className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">-</p>
                <span className="text-xs text-[#151515]/60">Liên hệ</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <Star className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">{listing.reviewCount}</p>
                <span className="text-xs text-[#151515]/60">Đánh giá</span>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3">
              <h3 className="text-sm font-bold text-[#151515]">Trạng thái & Thao tác</h3>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#151515]/60">Trạng thái:</span>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
                  status.className
                )}>
                  <StatusIcon className="size-4" />
                  {status.label}
                </span>
              </div>
              
              {listing.status === 'active' && (
                <button className="flex h-11 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]">
                  Ẩn tin
                </button>
              )}
              
              {listing.status === 'inactive' && (
                <button className="flex h-11 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]">
                  Hiển thị lại
                </button>
              )}

              <Link
                href={`/seller/listings/${listing.id}/edit`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                <Edit2 className="size-4" />
                Chỉnh sửa tin
              </Link>

              <Link
                href={`/tin-dang/${listing.id}`}
                target="_blank"
                className="flex h-11 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515]/30 bg-white text-sm font-bold text-[#151515]/60 shadow-[2px_2px_0_#151515]/30 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
              >
                <Eye className="size-4" />
                Xem trước
              </Link>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3">
              <h3 className="text-sm font-bold text-[#151515]">Ngày tháng</h3>
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Ngày đăng:</span>
                <span className="font-medium text-[#151515]">
                  {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('vi-VN') : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Cập nhật:</span>
                <span className="font-medium text-[#151515]">-</span>
              </div>
              {listing.availableFrom && (
                <div className="flex justify-between">
                  <span className="text-[#151515]/60">Trống từ:</span>
                  <span className="font-medium text-[#151515]">
                    {new Date(listing.availableFrom).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Reason */}
          {listing.status === 'rejected' && listing.rejectReason && (
            <div className="rounded-2xl border-[2px] border-red-300 bg-red-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-700">
                <AlertCircle className="size-4" />
                Lý do từ chối
              </h3>
              <p className="mt-2 text-sm text-red-600">{listing.rejectReason}</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
