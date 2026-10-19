// seller-portal.tsx — wizard & billing components for Seller Portal
// NOTE: Layout is handled by SellerPortalShell in shells.tsx (via app/seller/layout.tsx)
// Pages should NOT wrap content with SellerLayout - just return the page content.

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleDollarSign,
  Clock3, FileCheck2, ImagePlus, Info, MapPin, Navigation, QrCode, ShieldCheck, Sparkles, UploadCloud, WalletCards, X, GripVertical,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVnd, parseVnd } from '@/lib/client-utils'
import { paymentApi, type Package, type Transaction } from '@/lib/api'
import { cn } from '@/lib/utils'
import { InteractiveMap } from '@/components/InteractiveMap'
import { getDistricts, getWardsForDistrict, getDistrictCenter, type WardData } from '@/lib/geographic-data'
import { geocodeApi, getBackendUrl } from '@/lib/api'

// Steps matching UI-15/16 order
const steps = [
  { label: 'Địa chỉ chính xác', icon: MapPin, note: 'Ghim cửa vào thật' },
  { label: 'Biểu phí minh bạch', icon: CircleDollarSign, note: 'Không phí ẩn' },
  { label: 'Hình ảnh & Vị trí', icon: ImagePlus, note: 'Ảnh gốc + ghim bản đồ' },
  { label: 'Tình trạng phòng', icon: FileCheck2, note: 'Trống / ngày trống' },
]

const feeFields: [string, string, boolean][] = [
  ['Giá thuê / tháng', 'rent', true],
  ['Tiền cọc (VNĐ)', 'deposit', true],
  ['Đơn giá điện / kWh', 'electricity', true],
  ['Đơn giá nước', 'water', true],
  ['Internet / tháng', 'internet', false],
  ['Phí giữ xe máy', 'parkingBike', false],
  ['Phí giữ ô tô', 'parkingCar', false],
  ['Phí rác / quản lý', 'managementFee', false],
]

const amenities = [
  'Máy lạnh', 'Thang máy', 'Giờ giấc tự do', 'PCCC đạt chuẩn',
  'Cho nuôi thú cưng', 'Nội thất có sẵn', 'Wifi', 'Camera an ninh'
]

// Required media categories (in order of importance)
const requiredMedia = ['Tổng quan phòng', 'Nhà vệ sinh', 'Ban công/cửa sổ', 'Đồng hồ điện/nước']

// Smart assign photos to categories based on position or existing label
function assignPhotosToCategories(photos: any[]): { type: string; url: string; filename?: string }[] {
  if (!photos || photos.length === 0) return []
  
  const result: { type: string; url: string; filename?: string }[] = []
  const usedCategories = new Set<string>()
  
  // First pass: assign photos with explicit labels
  photos.forEach((photo) => {
    const url = typeof photo === 'string' ? photo : photo.src
    const label = typeof photo === 'string' ? '' : photo.label || ''
    
    if (label && requiredMedia.includes(label)) {
      result.push({ type: label, url, filename: url.split('/').pop() })
      usedCategories.add(label)
    }
  })
  
  // Second pass: assign remaining photos to unfilled categories
  const unlabeledPhotos = photos.filter((photo) => {
    const label = typeof photo === 'string' ? '' : photo.label || ''
    return !label || !requiredMedia.includes(label)
  })
  
  requiredMedia.forEach((category) => {
    if (!usedCategories.has(category)) {
      const photo = unlabeledPhotos.shift()
      if (photo) {
        const url = typeof photo === 'string' ? photo : photo.src
        result.push({ type: category, url, filename: url.split('/').pop() })
        usedCategories.add(category)
      }
    }
  })
  
  // Third pass: remaining photos as extra
  unlabeledPhotos.forEach((photo) => {
    const url = typeof photo === 'string' ? photo : photo.src
    result.push({ type: 'extra', url, filename: url.split('/').pop() })
  })
  
  return result
}

const roomTypeLabels: Record<string, string> = {
  'phong-tro': 'Phòng trọ',
  'chung-cu-mini': 'Chung cư mini',
  'nha-tro': 'Nhà trọ',
  'can-ho': 'Căn hộ',
}

function getRoomTypeLabel(value: string): string {
  return roomTypeLabels[value] || value || 'Phòng trọ'
}

// Default form data
const formDataDefault = {
  city: 'TP. Hồ Chí Minh',
  district: '',
  districtIndex: -1,
  ward: '',
  street: '',
  houseNumber: '',
  roomType: '',
  area: '',
  direction: '',
}

// ── Address Step Component ──────────────────────────────────────────────────────
function AddressStep({
  formData,
  setFormData,
  coords,
  setCoords,
  errors,
  locationConfirmed,
  setLocationConfirmed,
}: {
  formData: typeof formDataDefault
  setFormData: (data: Partial<typeof formDataDefault>) => void
  coords: [number, number]
  setCoords: (coords: [number, number]) => void
  errors: Record<string, string>
  locationConfirmed: boolean
  setLocationConfirmed: (confirmed: boolean) => void
}) {
  const districts = getDistricts()
  const wards = getWardsForDistrict(formData.districtIndex)
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value)
    const district = districts[idx]
    const center = getDistrictCenter(idx)
    
    setFormData({
      district: district?.name || '',
      districtIndex: idx,
      ward: '',
    })
    
    // Reset map to district center
    if (center) {
      setCoords(center)
    }
    setLocationConfirmed(false)
  }

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardName = e.target.value
    setFormData({ ward: wardName })
    
    // Find ward center and move map there
    const ward = wards.find(w => w.historicalName === wardName || w.currentName === wardName)
    if (ward) {
      setCoords([ward.lat, ward.lng])
    }
    setLocationConfirmed(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Info Banner */}
      <div className="rounded-xl border-[2px] border-blue-200 bg-blue-50 p-4">
        <MapPin className="mb-2 inline size-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          Tìm địa chỉ trên bản đồ → Kéo ghim đến vị trí chính xác → Nhấn xác nhận.
        </span>
      </div>

      {/* City - Fixed */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-[#151515]">
            Tỉnh/Thành <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <select
              disabled
              value="TP. Hồ Chí Minh"
              className="h-11 w-full cursor-not-allowed rounded-xl border-[2px] border-[#151515] bg-slate-100 px-3 font-normal text-slate-500"
            >
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            </select>
          </div>
        </div>

        {/* District Selector */}
        <div>
          <label className="text-sm font-bold text-[#151515]">
            Quận/Huyện <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <select
              value={formData.districtIndex}
              onChange={handleDistrictChange}
              className="h-11 w-full appearance-none rounded-xl border-[2px] border-[#151515] bg-white px-3 pr-10 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            >
              <option value="">Chọn Quận/Huyện</option>
              {districts.map((d, idx) => (
                <option key={d.id} value={idx}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-[#151515]/50" />
          </div>
        </div>

        {/* Ward Selector */}
        <div>
          <label className="text-sm font-bold text-[#151515]">
            Phường/Xã <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <select
              value={formData.ward}
              onChange={handleWardChange}
              disabled={!formData.district}
              className="h-11 w-full appearance-none rounded-xl border-[2px] border-[#151515] bg-white px-3 pr-10 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Chọn Phường/Xã</option>
              {wards.map((ward) => (
                <option key={ward.historicalName} value={ward.historicalName}>
                  {ward.historicalName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-[#151515]/50" />
          </div>
          {errors.ward && <p className="mt-1 text-xs text-red-500">{errors.ward}</p>}
        </div>

        {/* Room Type */}
        <div>
          <label className="text-sm font-bold text-[#151515]">
            Loại phòng <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-2">
            <select
              value={formData.roomType}
              onChange={(e) => setFormData({ roomType: e.target.value })}
              className="h-11 w-full appearance-none rounded-xl border-[2px] border-[#151515] bg-white px-3 pr-10 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            >
              <option value="">Chọn loại phòng</option>
              <option value="phong-tro">Phòng trọ</option>
              <option value="chung-cu-mini">Chung cư mini</option>
              <option value="nha-tro">Nhà trọ</option>
              <option value="can-ho">Căn hộ</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-[#151515]/50" />
          </div>
        </div>
      </div>

      {/* House Number and Street */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-[#151515]">Số nhà</label>
          <input
            type="text"
            value={formData.houseNumber}
            onChange={(e) => setFormData({ houseNumber: e.target.value })}
            placeholder="VD: 24B"
            className="mt-2 h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-[#151515]">Tên đường</label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => setFormData({ street: e.target.value })}
            placeholder="VD: Nguyễn Văn Hưởng"
            className="mt-2 h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
          />
        </div>
      </div>

      {/* Interactive Map with Address Search */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[#151515]">
          Xác nhận vị trí trên bản đồ <span className="text-red-500">*</span>
        </label>
        <InteractiveMap
          lat={coords[0]}
          lng={coords[1]}
          onChange={(lat, lng) => {
            setCoords([lat, lng])
            setLocationConfirmed(false)
          }}
          onLocationConfirm={setLocationConfirmed}
          showConfirmButton={true}
        />
      </div>
    </div>
  )
}

// ── Stepper UI-15/16 Style ──
function Stepper({ current, onStepClick }: { current: number; onStepClick?: (index: number) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index < current
        const isCurrent = index === current
        const isClickable = isCompleted

        return (
          <button
            key={step.label}
            type="button"
            onClick={() => isClickable && onStepClick?.(index)}
            disabled={!isClickable}
            className={cn(
              'flex items-center gap-3 rounded-xl border-[2px] p-3 text-left transition-all',
              isCurrent
                ? 'border-[#151515] bg-[#151515] text-white'
                : isCompleted
                  ? 'border-[#059669] bg-[#dcfce7] text-[#166534] cursor-pointer'
                  : 'border-[#151515]/30 bg-white text-[#151515]/50'
            )}
          >
            <span className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border-[2px]',
              isCurrent ? 'border-white/30 bg-white/15 text-white' :
              isCompleted ? 'border-[#059669] bg-[#dcfce7] text-[#166534]' :
              'border-current bg-white text-current'
            )}>
              {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[10px] font-bold uppercase tracking-wider', isCurrent ? 'text-white/70' : '')}>
                Bước {index + 1}
              </span>
              <span className="block truncate text-sm font-bold">{step.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Map Pin Board UI-15/16 Style ──
function MapPinBoard({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState({ x: 53, y: 44 })
  const board = useRef<HTMLDivElement>(null)

  const move = (event: React.PointerEvent) => {
    if (!board.current) return
    const rect = board.current.getBoundingClientRect()
    const x = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(88, Math.max(12, ((event.clientY - rect.top) / rect.height) * 100))
    setPosition({ x, y })
    onChange(10.7769 + (y - 50) * 0.0007, 106.7009 + (x - 50) * 0.0007)
  }

  return (
    <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515]">
      <div
        ref={board}
        onPointerMove={(e) => e.buttons === 1 && move(e)}
        onPointerDown={move}
        className="relative h-[220px] cursor-crosshair bg-[#e8f1e9] bg-[linear-gradient(35deg,transparent_46%,rgba(255,255,255,.9)_47%,rgba(255,255,255,.9)_49%,transparent_50%),linear-gradient(125deg,transparent_42%,rgba(255,255,255,.9)_43%,rgba(255,255,255,.9)_45%,transparent_46%)] bg-[length:130px_110px]"
      >
        <div className="absolute left-[12%] top-[22%] h-20 w-44 rotate-12 rounded-[45%] bg-emerald-200/70" />
        <span className="absolute left-[8%] top-[58%] text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">Thảo Điền</span>
        <div className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
          <div className="flex size-10 rotate-45 items-center justify-center rounded-full rounded-br-none bg-[#FDE047] text-[#151515] shadow-lg">
            <MapPin className="-rotate-45" />
          </div>
          <div className="mt-2 rounded-full bg-[#151515] px-2 py-1 text-[10px] font-bold text-white shadow">Kéo ghim cửa vào</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t-2 border-[#151515] bg-[#F5F5F0] px-4 py-3 text-xs font-medium">
        <span className="flex items-center gap-2 text-[#151515]/70">
          <Navigation className="text-[#059669]" /> Đã ghim cửa/sảnh — không nhận địa chỉ "gần ngã tư X"
        </span>
      </div>
    </div>
  )
}

// ── Select Field UI-15/16 Style ──
function SelectField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-bold text-[#151515]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <span className="relative mt-2 block">
        <select className="h-11 w-full appearance-none rounded-xl border-[2px] border-[#151515] bg-white px-3 pr-10 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30">
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-[#151515]/50" />
      </span>
    </div>
  )
}

// ── Input Field UI-15/16 Style ──
function InputField({ label, required, placeholder, type = 'text', value, onChange, ...props }: {
  label: string; required?: boolean; placeholder?: string; type?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-[#151515]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="mt-2 h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
        {...props}
      />
    </div>
  )
}

// ── Photo Upload Item ──
function PhotoUploadItem({
  label,
  required,
  hasImage,
  imageUrl,
  uploading,
  onUpload,
  onRemove,
  onReplace,
}: {
  label: string
  required?: boolean
  hasImage: boolean
  imageUrl?: string
  uploading?: boolean
  onUpload?: () => void
  onRemove?: () => void
  onReplace?: () => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center">
      {hasImage ? (
        <div className="group relative w-full">
          <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border-[2px] border-[#059669] bg-[#dcfce7]">
            {imageUrl && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={getBackendUrl(imageUrl)} 
                alt={label} 
                className="h-full w-full object-cover" 
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-slate-200 text-xs text-slate-500">
                <span>Không tải được ảnh</span>
                <span className="mt-1 text-[10px] text-slate-400">{imageUrl?.split('/').pop()}</span>
              </div>
            )}
            {/* Replace button overlay */}
            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#151515] shadow">
                  Thay ảnh
                </span>
              </button>
            )}
            {/* Remove button */}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-[2px] border-dashed border-[#151515]/30 bg-[#F5F5F0] transition-all hover:border-[#151515] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <div className="size-6 animate-spin rounded-full border-2 border-[#151515]/30 border-t-[#151515]" />
          ) : (
            <>
              <UploadCloud className="size-6 text-[#151515]/40" />
              <span className="text-xs text-[#151515]/40">Tải ảnh</span>
            </>
          )}
        </button>
      )}
      <span className={cn('mt-2 text-xs font-medium', hasImage ? 'text-[#166534]' : 'text-[#151515]/50')}>
        {label}
      </span>
      {required && <span className="text-[10px] text-red-500">Bắt buộc</span>}
      {hasImage && <span className="text-[10px] text-[#059669]">High Trust</span>}
    </div>
  )
}

// ── ListingWizard UI-15/16 ──
export function ListingWizard({ editListingId }: { editListingId?: string }) {
  const isEditMode = !!editListingId
  
  const [current, setCurrent] = useState(0)
  const [coords, setCoords] = useState<[number, number]>([10.8958, 106.8208]) // Default to District 9 center
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [fees, setFees] = useState<Record<string, string>>({})
  // files now stores both type and the uploaded URL
  const [files, setFiles] = useState<{ type: string; url: string; filename?: string }[]>([])
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [vacant, setVacant] = useState(true)
  const [availableDate, setAvailableDate] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [formData, setFormDataState] = useState({
    city: 'TP. Hồ Chí Minh',
    district: '',
    districtIndex: -1,
    ward: '',
    street: '',
    houseNumber: '',
    roomType: '',
    area: '',
    direction: '',
    roadWidth: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdListingId, setCreatedListingId] = useState<string | null>(null)
  const [existingListingId, setExistingListingId] = useState<string | null>(editListingId || null)
  const [loadingExisting, setLoadingExisting] = useState(!!editListingId)

  const { sellerApi } = require('@/lib/api')

  // Load existing listing data in edit mode
  useEffect(() => {
    if (!editListingId) return
    
    const loadListing = async () => {
      setLoadingExisting(true)
      try {
        const data = await sellerApi.getListing(editListingId) as { listing: any }
        const listing = data.listing
        
        if (listing) {
          // Set form data
          setFormDataState({
            city: listing.city || 'TP. Hồ Chí Minh',
            district: listing.district || '',
            districtIndex: -1,
            ward: listing.ward || '',
            street: listing.street || '',
            houseNumber: listing.houseNumber || '',
            roomType: listing.roomType || '',
            area: listing.area?.toString() || '',
            direction: listing.direction || '',
            roadWidth: listing.roadWidth?.toString() || '',
          })
          
          // Set fees
          setFees({
            rent: listing.rent?.toString() || '',
            electricity: listing.electricity?.toString() || '',
            water: listing.water?.toString() || '',
            internet: listing.internet?.toString() || '',
            parkingBike: listing.parkingBike?.toString() || '',
            parkingCar: listing.parkingCar?.toString() || '',
            managementFee: listing.managementFee?.toString() || '',
          })
          
          // Set amenities
          if (listing.amenities && Array.isArray(listing.amenities)) {
            setSelectedAmenities(listing.amenities)
          }
          
          // Set vacant status
          setVacant(listing.vacantNow ?? true)
          setAvailableDate(listing.availableFrom || '')
          
          // Set location confirmed based on existing coordinates
          if (listing.lat && listing.lng) {
            setCoords([listing.lat, listing.lng])
            setLocationConfirmed(true)
          }
          
          // Set photos from existing listing with smart category assignment
          if (listing.photos && Array.isArray(listing.photos)) {
            const assignedFiles = assignPhotosToCategories(listing.photos)
            setFiles(assignedFiles)
          }
        }
      } catch (err) {
        console.error('Failed to load listing:', err)
        alert('Không thể tải thông tin tin đăng')
      } finally {
        setLoadingExisting(false)
      }
    }
    
    loadListing()
  }, [editListingId])

  // Helper to set form data
  const setFormData = (data: Partial<typeof formData>) => {
    setFormDataState(prev => ({ ...prev, ...data }))
  }

  const hasRequired = requiredMedia.every((x) => files.some((f) => f.type === x))

  // Handle file upload
  const handleFileUpload = async (type: string) => {
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)')
        setTimeout(() => setUploadError(null), 3000)
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File quá lớn. Kích thước tối đa là 10MB.')
        setTimeout(() => setUploadError(null), 3000)
        return
      }

      setUploadingType(type)
      setUploadError(null)

      try {
        // Upload to backend WITHOUT listingId in edit mode
        // In edit mode, we handle photos on final submit to avoid duplicate uploads
        const result = await sellerApi.uploadPhotos([file], isEditMode ? undefined : (createdListingId || undefined))
        
        if (result.success && result.files.length > 0) {
          const uploadedFile = result.files[0]
          
          // In edit mode: just update state, don't touch listing photos yet
          // In create mode: remove existing file of this type and add new one
          setFiles((prev) => {
            const filtered = prev.filter((f) => f.type !== type)
            return [...filtered, { type, url: uploadedFile.url, filename: uploadedFile.filename }]
          })
        }
      } catch (err: any) {
        console.error('Upload error:', err)
        setUploadError(err.message || 'Không thể tải ảnh lên')
        setTimeout(() => setUploadError(null), 5000)
      } finally {
        setUploadingType(null)
      }
    }
    input.click()
  }

  const removeFile = (type: string) => {
    const file = files.find((f) => f.type === type)
    // In edit mode, only remove from state (don't call backend)
    // In create mode, also delete from backend if it was uploaded
    if (file?.filename && !isEditMode) {
      sellerApi.deletePhoto(file.filename, createdListingId || undefined).catch(console.error)
    }
    setFiles((prev) => prev.filter((f) => f.type !== type))
  }

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    )
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) {
      if (!formData.district) newErrors.district = 'Chọn Quận/Huyện'
      if (!formData.ward) newErrors.ward = 'Chọn Phường/Xã'
      if (!locationConfirmed) newErrors.location = 'Vui lòng xác nhận vị trí trên bản đồ'
    }

    if (step === 1) {
      if (!fees.rent) newErrors.rent = 'Nhập giá thuê'
      if (!fees.electricity) newErrors.electricity = 'Nhập giá điện'
      if (!fees.water) newErrors.water = 'Nhập giá nước'
    }

    if (step === 2) {
      // In edit mode, allow if we have existing photos (even if not all required categories)
      // In create mode, require all mandatory categories
      const hasAnyPhotos = files.length > 0
      const hasRequiredCategories = requiredMedia.every(cat => files.some(f => f.type === cat))
      
      if (!hasAnyPhotos) {
        newErrors.photos = 'Cần tải đủ ảnh bắt buộc'
      } else if (!isEditMode && !hasRequiredCategories) {
        newErrors.photos = 'Cần tải đủ ảnh bắt buộc'
      }
      // In edit mode, allow partial existing photos without forcing re-upload
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => {
    if (!validateStep(current)) return
    if (current < 3) {
      setCurrent((s) => s + 1)
    }
  }

  const prev = () => {
    if (current > 0) {
      setCurrent((s) => s - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    setSubmitting(true)

    try {
      // Build listing data
      const listingData = {
        title: `${getRoomTypeLabel(formData.roomType)} - ${formData.street || ''}, ${formData.ward || ''}, ${formData.district || ''}`,
        roomType: formData.roomType || 'phong-tro',
        city: formData.city,
        district: formData.district,
        ward: formData.ward,
        street: formData.street,
        houseNumber: formData.houseNumber,
        lat: coords[0],
        lng: coords[1],
        rent: parseVnd(fees.rent),
        depositMonths: 1,
        electricity: parseVnd(fees.electricity),
        electricityType: 'state',
        water: parseVnd(fees.water),
        waterType: 'person',
        internet: parseVnd(fees.internet),
        parkingBike: parseVnd(fees.parkingBike),
        parkingCar: parseVnd(fees.parkingCar),
        managementFee: parseVnd(fees.managementFee),
        area: parseFloat(formData.area) || 0,
        roadWidth: parseFloat(formData.roadWidth) || 0,
        direction: formData.direction,
        vacantNow: vacant,
        availableFrom: vacant ? null : availableDate,
        photos: files.map((f) => f.url),
        amenities: selectedAmenities,
        furniture: false,
        pets: false,
      }

      let result
      if (isEditMode && existingListingId) {
        // Update existing listing
        result = await sellerApi.updateListing(existingListingId, listingData)
        alert('Cập nhật tin đăng thành công')
        window.location.href = '/seller/listings'
      } else {
        // Create new listing
        result = await sellerApi.createListing(listingData)
        setCreatedListingId(result.listing.id)
        setSubmitted(true)
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      const errorMsg = err.data?.details?.[0]?.msg 
        || err.data?.error 
        || err.message 
        || 'Không thể lưu tin đăng. Vui lòng thử lại.'
      alert(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const isStepValid = (step: number): boolean => {
    if (step === 0) return !!formData.district && !!formData.ward && !!formData.roomType && locationConfirmed
    if (step === 1) return !!fees.rent && !!fees.electricity && !!fees.water
    if (step === 2) {
      // In edit mode, allow partial existing photos
      if (isEditMode) return files.length > 0
      return hasRequired
    }
    if (step === 3) return true
    return false
  }

  const checklist = [
    { label: 'Ghim cửa vào', valid: !!formData.district && !!formData.ward && locationConfirmed },
    { label: 'Điện/nước/cọc', valid: !!fees.rent && !!fees.electricity && !!fees.water },
    { label: 'Ảnh gốc + đồng hồ', valid: isEditMode ? files.length > 0 : hasRequired },
    { label: 'Tình trạng phòng', valid: true },
  ]

  return (
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <a href="/seller" className="hover:text-[#151515]">Trang chủ</a>
        <span>/</span>
        <a href="/seller/listings" className="hover:text-[#151515]">Quản lý tin đăng</a>
        <span>/</span>
        <span className="text-[#151515]">{isEditMode ? 'Chỉnh sửa tin đăng' : 'Đăng tin mới'}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-black text-[#151515]">
            {isEditMode ? 'Chỉnh sửa tin đăng' : 'Đăng tin phòng trọ mới'}
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            {isEditMode ? 'Cập nhật thông tin tin đăng của bạn' : 'Điền đầy đủ thông tin để tin được duyệt nhanh hơn'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper current={current} onStepClick={(index) => index < current && setCurrent(index)} />

      {loadingExisting ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#151515]/20 border-t-[#151515]" />
        </div>
      ) : submitted ? (
        /* Success State */
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <div className="flex size-20 items-center justify-center rounded-full bg-[#dcfce7]">
            <CheckCircle2 className="size-10 text-[#059669]" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-[#151515]">Tin đăng đã được gửi!</h2>
          <p className="mt-2 text-center text-[#151515]/60">Tin của bạn đang chờ Manager duyệt. Thông thường mất 1-3 giờ.</p>
          <div className="mt-6 flex gap-3">
            <a
              href="/seller/listings"
              className="inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
            >
              Xem danh sách tin
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
            >
              Đăng tin khác
            </button>
          </div>
        </div>
      ) : (
        /* Form Steps */
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Form */}
          <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#151515]">
                Bước {current + 1}: {steps[current].label}
              </h2>
              <p className="mt-1 text-sm text-[#151515]/60">{steps[current].note}</p>
            </div>

            <div className="p-6">
              {/* Step 0: Address */}
              {current === 0 && (
                <AddressStep
                  formData={formData}
                  setFormData={setFormData}
                  coords={coords}
                  setCoords={setCoords}
                  errors={errors}
                  locationConfirmed={locationConfirmed}
                  setLocationConfirmed={setLocationConfirmed}
                />
              )}

              {/* Step 1: Fees */}
              {current === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="rounded-xl border-[2px] border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mb-2 inline size-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">
                      Điện và nước bắt buộc nhập số. Nếu miễn phí, nhập 0.
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {feeFields.map(([label, key, required]: [string, string, boolean]) => (
                      <div key={key}>
                        <label className="text-sm font-bold text-[#151515]">
                          {label}
                          {required && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        <div className="relative mt-2">
                          <input
                            inputMode="numeric"
                            value={fees[key] || ''}
                            onChange={(e) => setFees({ ...fees, [key]: e.target.value })}
                            className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 pr-16 font-mono font-normal shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-lg bg-[#F5F5F0] px-2 py-1 text-[10px] font-bold text-[#151515]"
                            onClick={() => setFees({ ...fees, [key]: '0' })}
                          >
                            0đ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField 
                      label="Diện tích (m²)" 
                      type="number" 
                      placeholder="VD: 25"
                      value={formData.area}
                      onChange={(e) => setFormData({ area: e.target.value })}
                    />
                    <SelectField label="Hướng cửa">
                      <option value="">Chọn hướng</option>
                      <option value="Đông">Đông</option>
                      <option value="Tây">Tây</option>
                      <option value="Nam">Nam</option>
                      <option value="Bắc">Bắc</option>
                      <option value="Đông Nam">Đông Nam</option>
                      <option value="Tây Nam">Tây Nam</option>
                    </SelectField>
                  </div>
                </div>
              )}

              {/* Step 2: Photos & Location - UI-16 Layout */}
              {current === 2 && (
                <div className="flex flex-col gap-6">
                  {/* Info Banner */}
                  <div className="rounded-xl border-[2px] border-emerald-200 bg-emerald-50 p-4">
                    <Info className="mb-2 inline size-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-900">
                      Nếu ảnh có GPS lúc chụp, hệ thống tự gắn nhãn High Trust. Giấy tờ nhà chỉ Manager/Admin thấy.
                    </span>
                  </div>

                  {/* Two Column Layout - Photos (Left) & Map (Right) */}
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    {/* Left: Photos */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-sm font-bold text-[#151515]">Hình ảnh phòng</h3>
                      
                      {/* Required Photos Grid - 2 columns */}
                      <div className="grid grid-cols-2 gap-3">
                        {requiredMedia.map((type) => {
                          const file = files.find((f) => f.type === type)
                          const added = !!file
                          return (
                            <PhotoUploadItem
                              key={type}
                              label={type}
                              required
                              hasImage={added}
                              imageUrl={file?.url}
                              uploading={uploadingType === type}
                              onUpload={() => handleFileUpload(type)}
                              onRemove={() => removeFile(type)}
                              onReplace={() => handleFileUpload(type)}
                            />
                          )
                        })}
                      </div>

                      {uploadError && (
                        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-3 text-sm text-red-600">
                          {uploadError}
                        </div>
                      )}

                      {/* Additional Photos */}
                      <div>
                        <h4 className="mb-2 text-xs font-medium text-[#151515]/60">Ảnh bổ sung</h4>
                        <button
                          type="button"
                          onClick={async () => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/jpeg,image/png,image/gif,image/webp'
                            input.multiple = true
                            input.onchange = async (e) => {
                              const fileList = (e.target as HTMLInputElement).files
                              if (!fileList || fileList.length === 0) return
                              
                              const validFiles = Array.from(fileList).filter(f => {
                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                                if (!allowedTypes.includes(f.type)) return false
                                if (f.size > 10 * 1024 * 1024) return false
                                return true
                              })
                              
                              if (validFiles.length === 0) {
                                setUploadError('Không có file hợp lệ')
                                return
                              }
                              
                              try {
                                setUploadingType('extra')
                                // In edit mode, still upload immediately but handle listing photos on final submit
                                const result = await sellerApi.uploadPhotos(validFiles, createdListingId || undefined)
                                if (result.success) {
                                  setFiles(prev => [
                                    ...prev,
                                    ...result.files.map((f: { url: string; filename: string }) => ({ type: 'extra', url: f.url, filename: f.filename }))
                                  ])
                                }
                              } catch (err: any) {
                                setUploadError(err.message || 'Upload thất bại')
                              } finally {
                                setUploadingType(null)
                              }
                            }
                            input.click()
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-dashed border-[#151515]/30 bg-[#F5F5F0] p-4 text-sm font-medium text-[#151515]/50 transition-all hover:border-[#151515] hover:text-[#151515]"
                        >
                          <UploadCloud className="size-5" />
                          Thêm ảnh khác
                        </button>
                      </div>

                      {/* Documents */}
                      <div className="rounded-xl border-[2px] border-dashed border-[#151515]/30 bg-[#F5F5F0] p-4">
                        <div className="flex items-center gap-3">
                          <FileCheck2 className="size-5 text-[#151515]/40" />
                          <div>
                            <p className="text-sm font-medium text-[#151515]">Giấy tờ chứng minh</p>
                            <p className="text-xs text-[#151515]/50">PDF, JPG, PNG - ẩn với người thuê</p>
                          </div>
                        </div>
                      </div>

                      {errors.photos && (
                        <p className="text-sm text-red-500">{errors.photos}</p>
                      )}
                    </div>

                    {/* Right: Map & Location */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-sm font-bold text-[#151515]">Vị trí phòng</h3>

                      {/* Address Summary */}
                      <div className="rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
                        <p className="text-sm text-[#151515]/60">Địa chỉ đã chọn:</p>
                        <p className="mt-1 font-medium text-[#151515]">
                          {formData.houseNumber || 'Số nhà'}, {formData.street || 'Tên đường'}, {formData.ward || 'Phường/Xã'}, {formData.district || 'Quận/Huyện'}
                        </p>
                      </div>

                      {/* Map - Read-only, showing location from Step 1 */}
                      <div className="relative overflow-hidden rounded-2xl border-[2px] border-[#151515]">
                        <div className="h-[220px] w-full">
                          <InteractiveMap
                            lat={coords[0]}
                            lng={coords[1]}
                            onChange={() => {}} // Read-only
                            showConfirmButton={false}
                            disabled={true}
                          />
                        </div>
                      </div>

                      {/* Coordinates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#F5F5F0] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Vĩ độ</span>
                          <b className="mt-1 block font-mono text-sm text-[#151515]">{coords[0].toFixed(6)}</b>
                        </div>
                        <div className="rounded-xl bg-[#F5F5F0] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">Kinh độ</span>
                          <b className="mt-1 block font-mono text-sm text-[#151515]">{coords[1].toFixed(6)}</b>
                        </div>
                      </div>

                      {/* Road Width */}
                      <InputField 
                        label="Chiều rộng đường (m)" 
                        type="number" 
                        placeholder="VD: 4"
                        value={formData.roadWidth}
                        onChange={(e) => setFormData({ roadWidth: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Room Status */}
              {current === 3 && (
                <div className="flex flex-col gap-5">
                  {/* Vacancy Status */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-[#151515]">Tình trạng phòng</h3>
                    <div className="flex flex-col gap-3">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 transition-all has-[:checked]:border-[#059669] has-[:checked]:bg-[#dcfce7]">
                        <input
                          type="radio"
                          name="vacancy"
                          checked={vacant}
                          onChange={() => setVacant(true)}
                          className="size-5 accent-[#059669]"
                        />
                        <div>
                          <span className="block font-bold text-[#151515]">Trống ngay</span>
                          <span className="text-xs text-[#151515]/60">Phòng hiện đang trống, có thể dọn vào ngay</span>
                        </div>
                      </label>
                      <label className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 transition-all',
                        !vacant && 'ring-2 ring-[#059669]'
                      )}>
                        <input
                          type="radio"
                          name="vacancy"
                          checked={!vacant}
                          onChange={() => setVacant(false)}
                          className="size-5 accent-[#059669]"
                        />
                        <div className="flex-1">
                          <span className="block font-bold text-[#151515]">Sắp trống</span>
                          <span className="text-xs text-[#151515]/60">Dự kiến trống từ ngày</span>
                        </div>
                        {!vacant && (
                          <input
                            type="date"
                            value={availableDate}
                            onChange={(e) => setAvailableDate(e.target.value)}
                            className="h-9 rounded-lg border-[2px] border-[#151515] px-3 text-sm"
                          />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-[#151515]">Tiện ích</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {amenities.map((amenity) => (
                        <label
                          key={amenity}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-xl border-[2px] p-3 text-sm font-medium transition-all',
                            selectedAmenities.includes(amenity)
                              ? 'border-[#059669] bg-[#dcfce7] text-[#166534]'
                              : 'border-[#151515]/30 bg-white text-[#151515] hover:border-[#151515]'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAmenities.includes(amenity)}
                            onChange={() => toggleAmenity(amenity)}
                            className="size-4 accent-[#059669]"
                          />
                          {amenity}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Furniture */}
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-[#151515]">Nội thất</h3>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" className="size-5 accent-[#059669]" />
                      <span className="text-sm font-medium text-[#151515]">Phòng có nội thất (giường, tủ, bàn, ghế...)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between border-t-[2px] border-[#151515] bg-[#F5F5F0] p-4">
              <button
                type="button"
                onClick={prev}
                disabled={current === 0}
                className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#151515]"
              >
                <ArrowLeft className="size-4" />
                Quay lại
              </button>
              {current < 3 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!isStepValid(current)}
                  className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#151515]"
                >
                  Tiếp tục
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-5 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      {isEditMode ? 'Lưu thay đổi' : 'Gửi duyệt'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Checklist */}
            <div className="rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#151515]">
                  <ShieldCheck className="size-4 text-[#059669]" />
                  Checklist minh bạch
                </h3>
              </div>
              <div className="flex flex-col gap-3 p-4">
                {checklist.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                      item.valid
                        ? 'bg-[#dcfce7] text-[#166534]'
                        : 'bg-[#F5F5F0] text-[#151515]/50'
                    )}>
                      {item.valid ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className={cn(
                      'text-sm font-medium',
                      item.valid ? 'text-[#166534]' : 'text-[#151515]/50'
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border-[2px] border-[#151515] bg-[#151515] p-5 text-white shadow-[3px_3px_0_#151515]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#FDE047]" />
                <h3 className="font-bold">Mẹo đăng tin</h3>
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#FDE047]" />
                  Tin đủ 4 bước được ưu tiên duyệt nhanh hơn
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#FDE047]" />
                  Ảnh có GPS sẽ được gắn badge High Trust
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#FDE047]" />
                  Thông tin rõ ràng tăng 70% liên hệ
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

// ── BillingPage ──
export function BillingPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallet, setWallet] = useState<{ balance: number; totalSpent: number } | null>(null)
  const [selected, setSelected] = useState('')
  const [checkout, setCheckout] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)
  const [seconds, setSeconds] = useState(900)
  const [txnRef, setTxnRef] = useState('')

  useEffect(() => {
    Promise.all([
      paymentApi.getPackages(),
      paymentApi.getWallet(),
      paymentApi.getHistory(),
    ])
      .then(([pkgRes, walletRes, txRes]) => {
        setPackages(pkgRes.packages)
        setWallet(walletRes.wallet)
        setTransactions(txRes.transactions)
        if (pkgRes.packages.length > 0) {
          setSelected(pkgRes.packages[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!checkout || paid || seconds <= 0) return
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [checkout, paid, seconds])

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const plan = packages.find((p) => p.id === selected)

  const handlePayment = async () => {
    if (!plan) return
    setProcessing(true)
    try {
      const res = await paymentApi.createPayment(plan.price, plan.id, plan.name)
      setPaymentUrl(res.paymentUrl)
      setTxnRef(res.transactionId)
      setCheckout(true)
      setSeconds(900)
      setPaid(false)
    } catch (err) {
      console.error('Payment error:', err)
      alert('Không thể tạo thanh toán. Vui lòng thử lại.')
    } finally {
      setProcessing(false)
    }
  }

  const simulateWebhook = async () => {
    setPaid(true)
    const [walletRes, txRes] = await Promise.all([
      paymentApi.getWallet(),
      paymentApi.getHistory(),
    ])
    setWallet(walletRes.wallet)
    setTransactions(txRes.transactions)
  }

  if (loading) {
    return (
      <main className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Đang tải...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">Nạp tiền & mua gói tin</Badge>
        <h1 className="mt-4 text-4xl font-bold">Bảng giá dịch vụ</h1>
        <p className="mt-3 text-slate-500">Tin thường, Tin VIP (đẩy đầu trang), Gói xác minh tận nơi do Manager đến chụp.</p>
      </div>

      {wallet && (
        <div className="mx-auto mt-6 max-w-3xl">
          <Card className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm opacity-80">Số dư ví</p>
                <p className="mt-1 font-mono text-3xl font-bold">{formatVnd(wallet.balance)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Đã chi tiêu</p>
                <p className="mt-1 font-mono text-xl font-bold">{formatVnd(wallet.totalSpent)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id} className={`relative flex flex-col rounded-2xl ${selected === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
            {p.popular && <Badge className="absolute -top-3 left-5 bg-emerald-600">Phổ biến</Badge>}
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>{p.features.join(' · ')}</CardDescription>
              <p className="pt-3 font-mono text-3xl font-bold">{formatVnd(p.price)}</p>
            </CardHeader>
            <CardContent className="flex-1">
              {p.features.map((f) => (
                <div key={f} className="mb-2 flex gap-2 text-sm"><Check className="text-emerald-600" />{f}</div>
              ))}
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-xl bg-emerald-600" onClick={() => { setSelected(p.id); handlePayment() }} disabled={processing}>
                {processing ? 'Đang xử lý...' : 'Thanh toán VNPay'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="mx-auto mt-10 max-w-6xl rounded-2xl">
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
          <CardDescription>Tất cả giao dịch thanh toán qua VNPay</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-slate-400">Chưa có giao dịch nào</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>{['Mã đơn', 'Loại', 'Số tiền', 'Cổng', 'Trạng thái', 'Ngày'].map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}</tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-3 pr-4 font-mono text-xs">{t.vnpayTxRef || t.id.slice(0, 12)}</td>
                    <td className="py-3 pr-4">{t.description || t.type}</td>
                    <td className="py-3 pr-4 font-mono">{formatVnd(t.amount)}</td>
                    <td className="py-3 pr-4">{t.method === 'vnpay' ? 'VNPay' : t.method}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={t.status === 'completed' ? 'default' : 'outline'} className={t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}>
                        {t.status === 'completed' ? 'Thành công' : t.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl rounded-2xl">
            <CardHeader className="flex-row items-start justify-between border-b">
              <div>
                <CardTitle>Thanh toán trực tuyến VNPay</CardTitle>
                <CardDescription>Mã VietQR động theo đơn hàng {plan?.name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCheckout(false)}><X /></Button>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_220px]">
              <div className="flex flex-col gap-4">
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${paid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  {paid ? <CheckCircle2 className="text-emerald-600" /> : <Clock3 className="animate-pulse text-amber-600" />}
                  <div>
                    <b>{paid ? 'Thanh toán thành công!' : 'Đang chờ thanh toán...'}</b>
                    <span className="block text-xs">{paid ? 'Số dư/gói tin đã được cộng.' : `QR hết hạn sau ${time}`}</span>
                  </div>
                </div>
                <div className="rounded-xl border p-4 text-sm">
                  <div className="flex justify-between"><span>Mã đơn</span><b className="font-mono">{txnRef}</b></div>
                  <div className="mt-2 flex justify-between"><span>{plan?.name}</span><b>{plan ? formatVnd(plan.price) : ''}</b></div>
                </div>
                {!paid && (
                  <Button variant="outline" className="w-full" onClick={() => window.open(paymentUrl, '_blank')}>
                    Mở trang thanh toán VNPay
                  </Button>
                )}
                <p className="flex gap-2 text-xs text-slate-400"><Info className="size-4" /> Quét mã QR bằng app ngân hàng hoặc ví điện tử để thanh toán.</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-8 border-slate-100 bg-slate-950 text-white">
                  <QrCode className="size-28" />
                </div>
                {!paid && (
                  <Button variant="outline" size="sm" className="w-full" onClick={simulateWebhook}>
                    Mô phỏng thanh toán thành công
                  </Button>
                )}
                {paid && (
                  <Button className="w-full bg-emerald-600" onClick={() => setCheckout(false)}>
                    Hoàn tất
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
