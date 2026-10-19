'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Home, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  User, Calendar, DollarSign, Maximize, HomeIcon, Phone, Mail, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, X, ImageIcon, Flag, FileText, BadgeCheck
} from 'lucide-react'
import { adminApi, type Listing } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Đang hiển thị', className: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  inactive: { label: 'Đã ẩn', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: XCircle },
  rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle },
  draft: { label: 'Nháp', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: Edit },
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Fetch listing
  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await adminApi.getListingById(id)
        setListing(data.listing)
      } catch (err: any) {
        console.error('[AdminListingDetail] Fetch error:', err)
        if (err.message?.includes('Token')) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
        } else {
          setError('Không tìm thấy tin đăng này.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchListing()
  }, [id])

  // Handle status update
  const handleStatusUpdate = async (newStatus: string, reason?: string) => {
    setActionLoading(newStatus)
    try {
      await adminApi.updateListingStatus(id, newStatus)
      setListing(prev => prev ? { ...prev, status: newStatus as Listing['status'] } : null)
      
      if (newStatus === 'rejected' && reason) {
        setShowRejectDialog(false)
        setRejectReason('')
      }
    } catch (err: any) {
      console.error('[AdminListingDetail] Status update error:', err)
      alert(err.message || 'Không thể cập nhật trạng thái.')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tin đăng này? Hành động này không thể hoàn tác.')) {
      return
    }
    setActionLoading('delete')
    try {
      await adminApi.deleteListing(id)
      router.push('/admin/listings')
    } catch (err: any) {
      console.error('[AdminListingDetail] Delete error:', err)
      alert(err.message || 'Không thể xóa tin đăng.')
    } finally {
      setActionLoading(null)
    }
  }

  // Image navigation
  const allImages = listing?.photos?.length 
    ? listing.photos 
    : listing?.image 
      ? [listing.image] 
      : []

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  // Build address
  const address = listing ? [
    listing.houseNumber,
    listing.alley ? `Hẻm ${listing.alley}` : null,
    listing.street,
    listing.ward,
    listing.district,
  ].filter(Boolean).join(', ') : ''

  // Status config
  const status = listing ? statusConfig[listing.status] || statusConfig.draft : statusConfig.draft
  const StatusIcon = status.icon

  // Loading state
  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <div className="size-10 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
        </div>
      </main>
    )
  }

  // Error state
  if (error || !listing) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="size-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#151515]">{error || 'Tin đăng không tồn tại'}</h2>
          <Link
            href="/admin"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
          >
            <ArrowLeft className="size-4" />
            Quay lại Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/admin" className="hover:text-[#151515]">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/listings" className="hover:text-[#151515]">Quản lý tin đăng</Link>
        <span>/</span>
        <span className="text-[#151515]">{listing.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/listings"
            className="flex size-11 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
          >
            <ArrowLeft className="size-5 text-[#151515]" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#151515]">Chi tiết tin đăng</h1>
            <p className="text-sm text-[#151515]/60">Mã tin: {listing.id.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold',
            status.className
          )}>
            <StatusIcon className="size-4" />
            {status.label}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Image Gallery */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="relative aspect-video bg-[#F5F5F0]">
              {allImages.length > 0 ? (
                <>
                  <Image
                    src={allImages[currentImageIndex]}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                      >
                        <ChevronLeft className="size-5 text-[#151515]" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                      >
                        <ChevronRight className="size-5 text-[#151515]" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-[#151515]/80 px-3 py-1.5 text-xs font-bold text-white">
                        {currentImageIndex + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex size-full flex-col items-center justify-center text-[#151515]/30">
                  <ImageIcon className="size-16" />
                  <p className="mt-2 text-sm">Chưa có hình ảnh</p>
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t-[2px] border-[#151515] p-4">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      'relative size-16 shrink-0 overflow-hidden rounded-lg border-[2px] transition-all',
                      idx === currentImageIndex 
                        ? 'border-[#151515] shadow-[2px_2px_0_#151515]' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <Image src={img} alt={`Ảnh ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Information */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Thông tin bất động sản</h2>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-black text-[#151515]">{listing.title}</h3>
              <div className="mt-3 flex items-start gap-2 text-sm text-[#151515]/60">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <span>{address || 'Chưa cập nhật địa chỉ'}</span>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border-[2px] border-[#151515]/10 bg-[#F5F5F0] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">
                    <DollarSign className="size-3.5" />
                    Giá thuê
                  </div>
                  <p className="mt-2 font-mono text-lg font-black text-[#151515]">
                    {formatVnd(listing.rent)}
                  </p>
                  <span className="text-xs text-[#151515]/60">/tháng</span>
                </div>
                <div className="rounded-xl border-[2px] border-[#151515]/10 bg-[#F5F5F0] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">
                    <Maximize className="size-3.5" />
                    Diện tích
                  </div>
                  <p className="mt-2 font-mono text-lg font-black text-[#151515]">
                    {listing.area || '-'}
                  </p>
                  <span className="text-xs text-[#151515]/60">m²</span>
                </div>
                <div className="rounded-xl border-[2px] border-[#151515]/10 bg-[#F5F5F0] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">
                    <HomeIcon className="size-3.5" />
                    Loại phòng
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#151515]">
                    {listing.roomType || '-'}
                  </p>
                </div>
                <div className="rounded-xl border-[2px] border-[#151515]/10 bg-[#F5F5F0] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">
                    <ShieldCheck className="size-3.5" />
                    Cọc
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#151515]">
                    {listing.depositMonths || 1} <span className="text-sm font-normal">tháng</span>
                  </p>
                </div>
              </div>

              {/* Description */}
              {(listing as any).description && (
                <div className="mt-6">
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Mô tả</h4>
                  <p className="text-[#151515]/80 whitespace-pre-wrap">{(listing as any).description}</p>
                </div>
              )}

              {/* Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/60">Tiện ích</h4>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((amenity, idx) => (
                      <span 
                        key={idx} 
                        className="rounded-full border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-3 py-1.5 text-sm font-medium text-[#151515]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller Information */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Thông tin người đăng</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full border-[2px] border-[#151515] bg-[#FDE047]">
                  <User className="size-6 text-[#151515]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#151515]">{(listing as any).seller?.fullName || 'Người dùng'}</p>
                  <p className="text-sm text-[#151515]/60">
                    ID: {(listing as any).seller?.id?.slice(-8).toUpperCase() || '-'}
                  </p>
                  {(listing as any).seller?.phone && (
                    <p className="text-sm text-[#151515]/60">{(listing as any).seller?.phone}</p>
                  )}
                </div>
                {(listing as any).seller?.sellerProfile?.status === 'active' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    <BadgeCheck className="size-3.5" />
                    Đã xác minh
                  </span>
                )}
              </div>
              {(listing as any).seller?.id && (
                <Link
                  href={`/admin/sellers/${(listing as any).seller?.id}`}
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                >
                  <Eye className="size-4" />
                  Xem hồ sơ Seller
                </Link>
              )}
            </div>
          </div>

          {/* Moderation History */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Lịch sử kiểm duyệt</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515]/10 bg-[#F5F5F0] p-4">
                <div className={cn(
                  'flex size-10 items-center justify-center rounded-full',
                  listing.status === 'active' ? 'bg-emerald-100' :
                  listing.status === 'pending' ? 'bg-yellow-100' :
                  listing.status === 'rejected' ? 'bg-red-100' : 'bg-slate-100'
                )}>
                  {listing.status === 'active' ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : listing.status === 'pending' ? (
                    <Clock className="size-5 text-yellow-600" />
                  ) : listing.status === 'rejected' ? (
                    <XCircle className="size-5 text-red-600" />
                  ) : (
                    <Edit className="size-5 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#151515]">
                    {listing.status === 'active' ? 'Đã duyệt' :
                     listing.status === 'pending' ? 'Chờ duyệt' :
                     listing.status === 'rejected' ? 'Đã từ chối' : 'Nháp'}
                  </p>
                  <p className="text-sm text-[#151515]/60">
                    {(listing as any).updatedAt 
                      ? `Cập nhật: ${new Date((listing as any).updatedAt).toLocaleString('vi-VN')}`
                      : listing.createdAt 
                        ? `Tạo: ${new Date(listing.createdAt).toLocaleString('vi-VN')}`
                        : '-'
                    }
                  </p>
                </div>
              </div>

              {/* Rejection Reason */}
              {(listing as any).rejectReason && (
                <div className="mt-4 rounded-xl border-[2px] border-red-200 bg-red-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-red-700">
                    <AlertCircle className="size-4" />
                    Lý do từ chối
                  </p>
                  <p className="mt-2 text-sm text-red-600">{(listing as any).rejectReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Admin Actions */}
        <aside className="flex flex-col gap-4">
          {/* Admin Actions */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#151515] px-6 py-4">
              <h2 className="text-lg font-bold text-white">Thao tác quản trị</h2>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {/* Approve - only for pending */}
              {listing.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate('active')}
                  disabled={actionLoading === 'active'}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-emerald-500 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                >
                  {actionLoading === 'active' ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="size-5" />
                      Duyệt tin
                    </>
                  )}
                </button>
              )}

              {/* Reject - only for pending */}
              {listing.status === 'pending' && (
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading === 'reject'}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-red-500 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                >
                  {actionLoading === 'reject' ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <XCircle className="size-5" />
                      Từ chối
                    </>
                  )}
                </button>
              )}

              {/* Hide - only for active */}
              {listing.status === 'active' && (
                <button
                  onClick={() => handleStatusUpdate('inactive')}
                  disabled={actionLoading === 'inactive'}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                >
                  {actionLoading === 'inactive' ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                  ) : (
                    <>
                      <XCircle className="size-5" />
                      Ẩn tin
                    </>
                  )}
                </button>
              )}

              {/* Show - for inactive */}
              {listing.status === 'inactive' && (
                <button
                  onClick={() => handleStatusUpdate('active')}
                  disabled={actionLoading === 'active'}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-emerald-500 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                >
                  {actionLoading === 'active' ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="size-5" />
                      Hiển thị lại
                    </>
                  )}
                </button>
              )}

              {/* View Public Page */}
              <Link
                href={`/tin-dang/${listing.id}`}
                target="_blank"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
              >
                <Eye className="size-5" />
                Xem trang công khai
              </Link>

              {/* View Reports */}
              <button className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515]/30 bg-white text-sm font-bold text-[#151515]/60 shadow-[3px_3px_0_#151515]/30 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-50">
                <Flag className="size-5" />
                Xem báo cáo
              </button>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-[2px] border-red-300 bg-red-50 text-sm font-bold text-red-600 shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <div className="size-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                ) : (
                  <>
                    <Trash2 className="size-5" />
                    Xóa tin đăng
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Listing Info Summary */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Thông tin cơ bản</h2>
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Mã tin:</span>
                <span className="font-mono font-bold text-[#151515]">{listing.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Loại:</span>
                <span className="font-medium text-[#151515]">{(listing as any).category || listing.roomType || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Giá:</span>
                <span className="font-mono font-bold text-[#151515]">{formatVnd(listing.rent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Diện tích:</span>
                <span className="font-mono font-bold text-[#151515]">{listing.area || '-'} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#151515]/60">Trạng thái:</span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                  status.className
                )}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Ngày tháng</h2>
            </div>
            <div className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="size-4 mt-0.5 text-[#151515]/40" />
                <div>
                  <span className="text-[#151515]/60">Ngày tạo:</span>
                  <p className="font-medium text-[#151515]">
                    {listing.createdAt 
                      ? new Date(listing.createdAt).toLocaleDateString('vi-VN')
                      : '-'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="size-4 mt-0.5 text-[#151515]/40" />
                <div>
                  <span className="text-[#151515]/60">Cập nhật cuối:</span>
                  <p className="font-medium text-[#151515]">
                    {(listing as any).updatedAt 
                      ? new Date((listing as any).updatedAt).toLocaleDateString('vi-VN')
                      : '-'
                    }
                  </p>
                </div>
              </div>
              {listing.availableFrom && (
                <div className="flex items-start gap-2">
                  <Clock className="size-4 mt-0.5 text-[#151515]/40" />
                  <div>
                    <span className="text-[#151515]/60">Trống từ:</span>
                    <p className="font-medium text-[#151515]">
                      {new Date(listing.availableFrom).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Thống kê</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <Eye className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">{listing.views || 0}</p>
                <span className="text-xs text-[#151515]/60">Lượt xem</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[#F5F5F0] p-3 text-center">
                <Calendar className="size-5 text-[#151515]/60" />
                <p className="mt-1 text-xl font-bold text-[#151515]">
                  {(listing as any).appointmentsCount || 0}
                </p>
                <span className="text-xs text-[#151515]/60">Lịch hẹn</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[5px_5px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#151515] px-6 py-4">
              <h3 className="text-lg font-bold text-white">Từ chối tin đăng</h3>
            </div>
            <div className="p-6">
              <label className="mb-2 block text-sm font-bold text-[#151515]">
                Lý do từ chối
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối tin đăng..."
                className="h-32 w-full resize-none rounded-xl border-[2px] border-[#151515] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FDE047]"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectDialog(false)
                    setRejectReason('')
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleStatusUpdate('rejected', rejectReason)}
                  disabled={!rejectReason.trim() || actionLoading === 'reject'}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-red-500 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-50"
                >
                  {actionLoading === 'reject' ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Xác nhận từ chối'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
