'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Calendar, CheckCircle2, Clock, MapPin, Phone, X, XCircle, MessageCircle, Eye, CalendarDays
} from 'lucide-react'
import { sellerApi, type Appointment } from '@/lib/api'
import { cn } from '@/lib/utils'

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Chờ xác nhận', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', border: 'border-[#fde047]' },
  confirmed: { label: 'Đã xác nhận', bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', border: 'border-[#93c5fd]' },
  completed: { label: 'Hoàn thành', bg: 'bg-[#dcfce7]', text: 'text-[#166534]', border: 'border-[#86efac]' },
  cancelled: { label: 'Đã hủy', bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', border: 'border-[#fca5a5]' },
}

const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
]

export default function ClientPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    sellerApi.getAppointments()
      .then(({ appointments: apts }) => setAppointments(apts))
      .catch(() => setError('Không thể tải lịch hẹn'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = appointments.filter((apt) => {
    const matchFilter = filter === 'all' || apt.status === filter
    const tenantName = apt.tenant?.fullName || ''
    const listingTitle = apt.listing?.title || ''
    const matchSearch =
      !search ||
      tenantName.toLowerCase().includes(search.toLowerCase()) ||
      listingTitle.toLowerCase().includes(search.toLowerCase()) ||
      (apt.tenant?.phone || apt.phone || '').includes(search)
    return matchFilter && matchSearch
  })

  const counts: Record<string, number> = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  }

  const handleConfirm = async (id: string) => {
    setConfirming(id)
    try {
      await sellerApi.updateAppointment(id, 'confirmed')
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a))
      )
    } catch {
      alert('Không thể xác nhận lịch hẹn')
    } finally {
      setConfirming(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return
    setCancelling(id)
    try {
      await sellerApi.updateAppointment(id, 'cancelled')
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      )
    } catch {
      alert('Không thể hủy lịch hẹn')
    } finally {
      setCancelling(null)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <span className="text-[#151515]">Lịch hẹn xem phòng</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#151515]">Lịch hẹn xem phòng</h1>
        <p className="mt-1 text-sm text-[#151515]/60">Quản lý các lịch hẹn xem phòng từ người thuê</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-sm font-semibold transition-all',
              filter === opt.id
                ? 'border-[#151515] bg-[#151515] text-white'
                : 'border-[#151515]/30 bg-white text-[#151515] hover:border-[#151515]/60'
            )}
          >
            {opt.label}
            <span className={cn(
              'ml-1 rounded-full px-2 py-0.5 text-xs',
              filter === opt.id ? 'bg-white/20' : 'bg-[#151515]/10'
            )}>
              {counts[opt.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, phòng, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-4 pr-4 shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <CalendarDays className="size-16 text-[#151515]/20" />
          <p className="mt-4 text-[#151515]/60">Không có lịch hẹn nào</p>
        </div>
      )}

      {/* Appointments List */}
      <div className="flex flex-col gap-4">
        {filtered.map((apt) => {
          const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending
          const tenantName = apt.tenant?.fullName || 'Khách hàng'
          const listingTitle = apt.listing?.title || 'Phòng trọ'
          const phone = apt.tenant?.phone || apt.phone || ''

          return (
            <div
              key={apt.id}
              className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-[#151515]">{listingTitle}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-[#151515]/60">
                    <MapPin className="size-3 shrink-0" />
                    <span>Xem chi tiết</span>
                  </div>
                </div>
                <span className={cn(
                  'shrink-0 rounded-full border-2 px-3 py-1 text-sm font-semibold',
                  statusCfg.bg, statusCfg.text, statusCfg.border
                )}>
                  {statusCfg.label}
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  {/* Left: Info Grid */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Tenant */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F0]">
                        <MessageCircle className="size-5 text-[#151515]/40" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Khách hàng</p>
                        <p className="text-sm font-bold text-[#151515]">{tenantName}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F0]">
                        <Phone className="size-5 text-[#151515]/40" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Điện thoại</p>
                        <p className="text-sm font-bold text-[#151515]">{phone || '-'}</p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F0]">
                        <Calendar className="size-5 text-[#151515]/40" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Ngày</p>
                        <p className="text-sm font-bold text-[#151515]">
                          {apt.when ? new Date(apt.when).toLocaleDateString('vi-VN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F0]">
                        <Clock className="size-5 text-[#151515]/40" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Giờ hẹn</p>
                        <p className="text-sm font-bold text-[#151515]">
                          {apt.when ? new Date(apt.when).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 md:items-end">
                    {/* Note */}
                    {apt.note && (
                      <div className="max-w-[280px] rounded-xl bg-[#F5F5F0] p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Ghi chú</p>
                        <p className="mt-1 text-sm text-[#151515]">{apt.note}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {apt.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirm(apt.id)}
                          disabled={confirming === apt.id}
                          className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirming === apt.id ? (
                            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          Xác nhận
                        </button>
                        <button
                          onClick={() => handleCancel(apt.id)}
                          disabled={cancelling === apt.id}
                          className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="size-4 text-red-500" />
                          Hủy
                        </button>
                      </div>
                    )}

                    {apt.status === 'confirmed' && (
                      <div className="flex gap-2">
                        <Link
                          href={`/seller/listings/${apt.listingId}`}
                          className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          <Eye className="size-4" />
                          Xem phòng
                        </Link>
                        <button
                          onClick={() => handleCancel(apt.id)}
                          disabled={cancelling === apt.id}
                          className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="size-4 text-red-500" />
                          Hủy
                        </button>
                      </div>
                    )}

                    {apt.status === 'completed' && (
                      <div className="flex items-center gap-2 text-sm font-bold text-[#059669]">
                        <CheckCircle2 className="size-5" />
                        Đã hoàn thành
                      </div>
                    )}

                    {apt.status === 'cancelled' && (
                      <div className="flex items-center gap-2 text-sm font-bold text-red-500">
                        <XCircle className="size-5" />
                        Đã hủy
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
