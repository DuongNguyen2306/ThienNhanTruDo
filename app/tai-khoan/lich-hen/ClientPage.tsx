'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarCheck, CalendarClock, CheckCircle, XCircle, X, Clock, FileText, Phone, RefreshCw } from 'lucide-react'
import { tenantApi, type Appointment } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ')
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Đang chờ', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300', icon: XCircle },
  completed: { label: 'Hoàn thành', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', icon: CheckCircle },
}

const FILTER_TABS: { value: FilterStatus; label: string; apiStatus?: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Đang chờ', apiStatus: 'pending' },
  { value: 'confirmed', label: 'Đã xác nhận', apiStatus: 'confirmed' },
  { value: 'cancelled', label: 'Đã hủy', apiStatus: 'cancelled' },
]

function AppointmentCard({ appointment, onCancel }: { appointment: Appointment; onCancel: (id: string) => void }) {
  const appointmentAny = appointment as unknown as { status?: string }
  const effectiveStatus = appointmentAny.status ?? appointment.status
  const config = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const isCancellable = effectiveStatus === 'pending' || effectiveStatus === 'Chờ duyệt'
  
  // Get room title from listing
  const roomTitle = appointment.listing?.title ?? 'Phòng không xác định'
  
  // Parse date/time from "when" field
  const appointmentWhen = appointment.when ? new Date(appointment.when) : null
  const dateStr = appointmentWhen ? appointmentWhen.toLocaleDateString('vi-VN') : '—'
  const timeStr = appointmentWhen ? appointmentWhen.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'
  
  return (
    <div className="group relative flex gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#151515] transition-all hover:shadow-[6px_6px_0px_0px_#151515]">
      {/* Room thumbnail */}
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-black">
        {appointment.listing?.image ? (
          <Image
            src={appointment.listing.image}
            alt={roomTitle}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <CalendarCheck className="size-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">
              {roomTitle}
            </h3>
            {appointment.listing?.rent && (
              <p className="font-semibold text-emerald-600">
                {formatCurrency(appointment.listing.rent)}/tháng
              </p>
            )}
          </div>
          
          {/* Status badge */}
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.color}`}>
            <StatusIcon className="size-3.5" />
            {config.label}
          </div>
        </div>
        
        {/* Info row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            {dateStr || '—'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {timeStr || '—'}
          </span>
          {appointment.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {appointment.phone}
            </span>
          )}
        </div>
        
        {/* Note */}
        {appointment.note && (
          <p className="mt-2 text-sm text-gray-500 italic line-clamp-1">
            "{appointment.note}"
          </p>
        )}
        
        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          {appointment.listingId && (
            <Link
              href={`/phong/${appointment.listingId}`}
              className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
            >
              <FileText className="size-4" />
              Xem phòng
            </Link>
          )}
          
          {isCancellable && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="flex items-center gap-1.5 rounded-xl border-2 border-red-400 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-[3px_3px_0px_0px_#fca5a5] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#fca5a5] active:translate-x-0 active:translate-y-0 active:shadow-none"
            >
              <X className="size-4" />
              Hủy lịch hẹn
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center">
      <CalendarCheck className="size-16 text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold text-gray-600">Chưa có lịch hẹn nào</h3>
      <p className="mt-1 text-sm text-gray-400">
        Hãy đặt lịch xem phòng để theo dõi tại đây
      </p>
      <Link
        href="/tim-kiem"
        className="mt-4 flex items-center gap-2 rounded-xl border-2 border-black bg-yellow-400 px-6 py-2.5 font-semibold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
      >
        Tìm phòng ngay
      </Link>
    </div>
  )
}

function AuthErrorState({ message, onLogin }: { message: string; onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-100">
        <RefreshCw className="size-8 text-amber-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-amber-800">{message}</h3>
      <p className="mt-2 text-sm text-amber-600">
        Vui lòng đăng nhập để xem lịch hẹn của bạn
      </p>
      <button
        onClick={onLogin}
        className="mt-6 flex items-center gap-2 rounded-xl border-2 border-black bg-yellow-400 px-6 py-2.5 font-semibold shadow-[4px_4px_0px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#151515] active:translate-x-0 active:translate-y-0 active:shadow-none"
      >
        Đăng nhập ngay
      </button>
    </div>
  )
}

function CancelConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  loading 
}: { 
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean 
}) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#151515]">
        <h3 className="text-lg font-bold">Xác nhận hủy lịch hẹn?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Bạn có chắc muốn hủy lịch hẹn này không? Hành động này không thể hoàn tác.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-black bg-white px-4 py-2.5 font-semibold shadow-[3px_3px_0px_0px_#151515] transition-all hover:shadow-[4px_4px_0px_0px_#151515] active:shadow-none disabled:opacity-50"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-red-400 bg-red-500 px-4 py-2.5 font-semibold text-white shadow-[3px_3px_0px_0px_#991b1b] transition-all hover:shadow-[4px_4px_0px_0px_#991b1b] active:shadow-none disabled:opacity-50"
          >
            {loading ? 'Đang hủy...' : 'Hủy lịch hẹn'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LichHenPage() {
  const { user, ready } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  
  // Fetch appointments
  const fetchAppointments = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    setAuthError(false)
    try {
      const data = await tenantApi.getAppointments(status)
      setAppointments(data.appointments ?? [])
    } catch (err: unknown) {
      console.error('[LichHen] Fetch error:', err)
      const apiErr = err as { status?: number; message?: string }
      if (apiErr?.status === 401) {
        setAuthError(true)
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else if (apiErr?.status === 403) {
        setError('Bạn không có quyền xem lịch hẹn.')
      } else {
        setError('Không thể tải danh sách lịch hẹn. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!ready) return
    if (!user) {
      setLoading(false)
      setAuthError(true)
      setError('Vui lòng đăng nhập để xem lịch hẹn.')
      return
    }
    const tab = FILTER_TABS.find(t => t.value === filter)
    fetchAppointments(tab?.apiStatus)
  }, [ready, user, filter, fetchAppointments])
  
  const handleLogin = () => {
    router.push('/dang-nhap')
  }
  
  // Cancel appointment
  const handleCancel = async () => {
    if (!cancelId) return
    setCancelLoading(true)
    try {
      await tenantApi.cancelAppointment(cancelId)
      // Update local state
      setAppointments(prev => prev.map(a => 
        a.id === cancelId ? { ...a, status: 'cancelled' as const } : a
      ))
      setCancelId(null)
    } catch (err) {
      console.error('[LichHen] Cancel error:', err)
      alert('Không thể hủy lịch hẹn. Vui lòng thử lại.')
    } finally {
      setCancelLoading(false)
    }
  }
  
  // Count by status
  const counts = appointments.reduce<Record<string, number>>((acc, a) => {
    const status = a.status as string
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
  
  // Count pending appointments for sidebar
  const pendingCount = counts['pending'] ?? 0

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all' 
            ? appointments.length 
            : (counts[tab.value] ?? 0)
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                filter === tab.value
                  ? 'border-black bg-yellow-400 text-black shadow-[3px_3px_0px_0px_#151515]'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                filter === tab.value ? 'bg-black text-yellow-400' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 animate-pulse">
              <div className="h-24 w-32 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-8 w-40 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : authError ? (
        <AuthErrorState message={error || 'Phiên đăng nhập hết hạn'} onLogin={handleLogin} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-red-200 bg-red-50 py-12 text-center">
          <XCircle className="size-12 text-red-400" />
          <h3 className="mt-3 font-semibold text-red-700">{error}</h3>
          <button
            onClick={() => fetchAppointments(filter === 'all' ? undefined : filter)}
            className="mt-3 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0px_0px_#151515] transition-all hover:shadow-[4px_4px_0px_0px_#151515]"
          >
            Thử lại
          </button>
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onCancel={setCancelId}
            />
          ))}
        </div>
      )}
      
      {/* Note */}
      {!loading && !error && appointments.length > 0 && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Lịch hẹn phụ thuộc vào phản hồi của chủ đăng tin. Vui lòng chờ xác nhận trước khi đến xem phòng.
        </p>
      )}
      
      {/* Cancel confirm dialog */}
      <CancelConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        loading={cancelLoading}
      />
    </>
  )
}
