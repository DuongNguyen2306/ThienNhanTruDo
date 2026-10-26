'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck2,
  ChevronRight,
  Edit3,
  Heart,
  Phone,
  ShieldCheck,
  Star,
  User,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { tenantApi, type Appointment, type Listing } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Type for mapped appointment ──────────────────────────────────────
interface MappedAppointment {
  id: string
  roomTitle: string
  roomDistrict: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  imageUrl: string
  listingId?: string
}

interface MappedSavedRoom {
  id: string
  title: string
  district: string
  price: number
  area: number
  imageUrl: string
  isVerified: boolean
}

// ── Status badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MappedAppointment['status'] }) {
  const map = {
    pending: { label: 'Đang chờ', cls: 'border-[#F59E0B] bg-[#FEF3C7] text-[#D97706]' },
    confirmed: { label: 'Đã xác nhận', cls: 'border-[#059669] bg-[#D1FAE5] text-[#059669]' },
    cancelled: { label: 'Đã hủy', cls: 'border-[#EF4444] bg-[#FEE2E2] text-[#EF4444]' },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn('rounded-lg border-[2px] px-2.5 py-0.5 text-xs font-bold', cls)}>
      {label}
    </span>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accentColor,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  href: string
  accentColor: string
  loading?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] text-[#151515] shadow-[2px_2px_0_#151515]"
        style={{ backgroundColor: accentColor }}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#151515]" >
          {loading ? '...' : value}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[#151515]/60">{label}</p>
      </div>
      <ChevronRight className="ml-auto size-5 shrink-0 text-[#151515]/30" />
    </Link>
  )
}

// ── Appointment Row ──────────────────────────────────────────────────
function AppointmentRow({ apt }: { apt: MappedAppointment }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-3 shadow-[2px_2px_0_#151515]">
      <img
        src={apt.imageUrl}
        alt={apt.roomTitle}
        className="size-14 shrink-0 rounded-lg object-cover border border-[#151515]/20"
        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#151515]">{apt.roomTitle}</p>
        <p className="text-xs text-[#151515]/50">{apt.roomDistrict}</p>
        <p className="mt-1 text-xs font-semibold text-[#151515]/60">
          {apt.date} · {apt.time}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={apt.status} />
        {apt.listingId && (
          <Link
            href={`/phong/${apt.listingId}`}
            className="text-xs font-bold text-[#059669] hover:underline"
          >
            Xem phòng
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Dashboard Client Component ───────────────────────────────────────
export default function ClientPage() {
  const { user, ready } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const [stats, setStats] = useState({ appointments: 0, savedRooms: 0 })
  const [recentAppointments, setRecentAppointments] = useState<MappedAppointment[]>([])
  const [recentSaved, setRecentSaved] = useState<MappedSavedRoom[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Wait for client hydration ──
  useEffect(() => {
    setHydrated(true)
  }, [])

  // ── Load real data from API ──
  useEffect(() => {
    if (!hydrated || !user) return

    const loadData = async () => {
      setLoadingStats(true)
      setError(null)
      try {
        const [aptRes, savedRes] = await Promise.allSettled([
          tenantApi.getAppointments(),
          tenantApi.getSaved(),
        ])

        // Process appointments
        if (aptRes.status === 'fulfilled' && aptRes.value.appointments) {
          const apts = aptRes.value.appointments.slice(0, 3)
          setRecentAppointments(apts.map((a) => ({
            id: a.id,
            roomTitle: a.listing?.title || 'Phòng trọ',
            roomDistrict: '',
            date: a.when ? new Date(a.when).toLocaleDateString('vi-VN') : '',
            time: a.when ? new Date(a.when).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
            status: (a.status === 'pending' ? 'pending' : a.status === 'confirmed' ? 'confirmed' : 'cancelled') as 'pending' | 'confirmed' | 'cancelled',
            imageUrl: a.listing?.image || '/placeholder.jpg',
            listingId: a.listingId,
          })))
          setStats(prev => ({ ...prev, appointments: aptRes.value.appointments.length }))
        }

        // Process saved rooms
        if (savedRes.status === 'fulfilled' && savedRes.value.listings) {
          const saved = savedRes.value.listings.slice(0, 4)
          setRecentSaved(saved.map((l) => ({
            id: l.id,
            title: l.title || 'Phòng trọ',
            district: (l as any).district || '',
            price: l.rent || 0,
            area: l.area || 0,
            imageUrl: l.image || l.photos?.[0] || '/placeholder.jpg',
            isVerified: l.verified || false,
          })))
          setStats(prev => ({ ...prev, savedRooms: savedRes.value.listings.length }))
        }
      } catch (err) {
        console.error('[TaiKhoan] Load stats error:', err)
        setError('Không thể tải dữ liệu. Vui lòng thử lại.')
      } finally {
        setLoadingStats(false)
      }
    }

    loadData()
  }, [hydrated, user])

  // ── Loading: not yet hydrated ──
  if (!hydrated || !ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
          <p className="text-sm font-semibold text-[#151515]/60">Đang tải...</p>
        </div>
      </div>
    )
  }

  // ── Not authenticated ──
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border-[3px] border-[#151515] bg-[#FDE047] shadow-[4px_4px_0_#151515]">
          <UserCircle className="size-8 text-[#151515]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#151515] lg:text-3xl" >
            Vui lòng đăng nhập
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#151515]/60">
            Bạn cần đăng nhập để xem Tài khoản của tôi.
          </p>
        </div>
        <Link
          href="/dang-nhap?next=/tai-khoan"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-3 text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          <User className="size-5" />
          Đăng nhập ngay
        </Link>
      </div>
    )
  }

  // ── Authenticated Dashboard ──
  const userRole = user.role === 'seller' ? 'Chủ đăng tin' : 'Người thuê'
  const appointments = recentAppointments
  const savedRooms = recentSaved

  return (
    <>
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#151515] lg:text-3xl" >
          Xin chào, <span className="font-bold">{user.name || user.fullName}</span>!
        </h1>
        <p className="mt-1 text-base text-[#151515]/60">
          Chào mừng bạn quay trở lại THIÊN NHÃN TRÚ ĐỒ.
        </p>
      </div>

      {/* ── Two-column: Profile + Stats ── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">

        {/* Profile card */}
        <div className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <div className="flex items-start justify-between border-b-[2px] border-[#151515] bg-[#FDE047] px-5 py-4">
            <h2 className="text-base font-black text-[#151515]" >
              Hồ sơ cá nhân
            </h2>
            <Link
              href="/tai-khoan/thong-tin"
              className="flex items-center gap-1.5 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
            >
              <Edit3 className="size-3" />
              Chỉnh sửa
            </Link>
          </div>
          <div className="grid gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-[#151515] shadow-[2px_2px_0_#151515]">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#151515]">{user.name || user.fullName}</p>
                <p className="mt-0.5 text-xs text-[#151515]/50">{userRole}</p>
              </div>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-[#151515]/40" />
                <p className="text-sm font-semibold text-[#151515]">{user.phone}</p>
              </div>
            )}
            {user.email && (
              <div className="flex items-center gap-3">
                <svg className="size-4 shrink-0 text-[#151515]/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <p className="text-sm font-semibold text-[#151515]/70">{user.email}</p>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border-[2px] border-[#059669] bg-[#D1FAE5] px-3 py-2">
              <ShieldCheck className="size-4 shrink-0 text-[#059669]" />
              <p className="text-xs font-bold text-[#059669]">Đã xác minh SĐT</p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="space-y-4">
          <StatCard
            icon={CalendarCheck2}
            label="Lịch hẹn xem"
            value={stats.appointments}
            href="/tai-khoan/lich-hen"
            accentColor="#FDE047"
            loading={loadingStats}
          />
          <StatCard
            icon={Heart}
            label="Phòng đã lưu"
            value={stats.savedRooms}
            href="/tai-khoan/da-luu"
            accentColor="#FECACA"
            loading={loadingStats}
          />
        </div>
      </div>

      {/* Lịch hẹn gần đây */}
      <div className="mb-6 overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
              <CalendarCheck2 className="size-4 text-[#151515]" />
            </span>
            <h2 className="text-base font-black text-[#151515]" >
              Lịch hẹn gần đây
            </h2>
          </div>
          <Link
            href="/tai-khoan/lich-hen"
            className="flex items-center gap-1 text-sm font-bold text-[#059669] hover:underline"
          >
            Xem tất cả
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="space-y-3 p-5">
          {loadingStats ? (
            <div className="flex items-center justify-center py-6">
              <div className="size-6 animate-spin rounded-full border-[2px] border-[#151515] border-t-transparent" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CalendarCheck2 className="size-10 text-[#151515]/20" />
              <p className="text-sm text-[#151515]/50">Chưa có lịch hẹn nào.</p>
              <Link
                href="/tim-kiem"
                className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                Tìm phòng ngay
              </Link>
            </div>
          ) : (
            appointments.map((apt) => (
              <AppointmentRow key={apt.id} apt={apt} />
            ))
          )}
        </div>
      </div>

      {/* Phòng quan tâm */}
      <div className="mb-6 overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FECACA] shadow-[2px_2px_0_#151515]">
              <Heart className="size-4 text-[#EF4444]" />
            </span>
            <h2 className="text-base font-black text-[#151515]" >
              Phòng quan tâm
            </h2>
          </div>
          <Link
            href="/tai-khoan/da-luu"
            className="flex items-center gap-1 text-sm font-bold text-[#059669] hover:underline"
          >
            Xem tất cả
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="p-5">
          {loadingStats ? (
            <div className="flex items-center justify-center py-6">
              <div className="size-6 animate-spin rounded-full border-[2px] border-[#151515] border-t-transparent" />
            </div>
          ) : savedRooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Heart className="size-10 text-[#151515]/20" />
              <p className="text-sm text-[#151515]/50">Chưa có phòng nào được lưu.</p>
              <Link
                href="/tim-kiem"
                className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                Khám phá phòng trọ
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/phong/${room.id}`}
                  className="group flex gap-3 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-3 shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                >
                  <div className="relative shrink-0">
                    <img
                      src={room.imageUrl}
                      alt={room.title}
                      className="size-20 rounded-lg object-cover border border-[#151515]/20"
                    />
                    {room.isVerified && (
                      <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded border-[1.5px] border-[#151515] bg-[#FDE047] shadow-[1px_1px_0_#151515]">
                        <ShieldCheck className="size-3 text-[#151515]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-[#151515]">{room.title}</p>
                    <p className="mt-0.5 text-xs text-[#151515]/50">{room.district}</p>
                    <p className="mt-2 font-black text-[#151515]" >
                      {room.price.toLocaleString('vi-VN')} ₫
                    </p>
                    <p className="text-xs text-[#151515]/50">{room.area} m²</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault() }}
                    className="self-start rounded-lg p-1.5 text-[#EF4444] transition-colors hover:bg-[#FEE2E2]"
                  >
                    <Heart className="size-4 fill-current" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/tim-kiem"
          className="flex items-center justify-center gap-3 rounded-2xl border-[3px] border-[#151515] bg-[#FDE047] p-4 text-base font-black text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_#151515]"
          
        >
          <svg className="size-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          Tìm phòng ngay
        </Link>
        <Link
          href="/dang-ky"
          className="flex items-center justify-center gap-3 rounded-2xl border-[3px] border-[#151515] bg-white p-4 text-base font-black text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_#151515]"
          
        >
          <Star className="size-6" />
          Giới thiệu bạn bè
        </Link>
      </div>
    </>
  )
}
