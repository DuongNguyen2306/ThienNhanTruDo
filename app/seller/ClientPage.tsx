'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BedDouble, CalendarDays, ChevronRight, Clock, Edit2,
  Eye, Image as ImageIcon, MapPin, Megaphone, Phone, Plus, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sellerApi, type Listing, type SellerLead, type Appointment } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { formatVnd } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function ClientPage() {
  return <SellerDashboard />
}

function SellerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<{
    listings: { draft: number; pending: number; active: number; rejected: number; inactive: number }
    newLeads: number
    pendingAppointments: number
    totalViews: number
  } | null>(null)
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [leads, setLeads] = useState<SellerLead[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      sellerApi.getDashboard(),
      sellerApi.getListings(),
      sellerApi.getLeads(),
      sellerApi.getAppointments(),
    ])
      .then(([dashRes, listingsRes, leadsRes, apptsRes]) => {
        setStats(dashRes.stats)
        setRecentListings(listingsRes.listings.slice(0, 5))
        setLeads(leadsRes.leads.slice(0, 5))
        const today = new Date().toDateString()
        setTodayAppointments(
          apptsRes.appointments.filter(a =>
            a.status === 'pending' || a.when?.startsWith(today)
          ).slice(0, 5)
        )
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const totalListings = stats?.listings
    ? Object.values(stats.listings).reduce((a, b) => a + b, 0)
    : 0

  const userName = user?.name || user?.fullName || 'Seller'

  return (
    <div className="flex flex-col gap-6">

      {/* ── B: Welcome header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#151515] lg:text-3xl" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            Xin chào, {userName}! 👋
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Đây là tổng quan hoạt động cho thuê phòng của bạn
          </p>
        </div>
        <Link href="/seller/listings/new">
          <Button className="gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]">
            <Plus className="size-4" /> Đăng tin mới
          </Button>
        </Link>
      </div>

      {/* ── D: Four stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BedDouble className="size-5 text-[#151515]" />}
          label="Tổng tin đăng"
          value={loading ? '...' : totalListings}
          sublabel="Tin đăng"
          color="bg-white"
        />
        <StatCard
          icon={<Eye className="size-5 text-[#151515]" />}
          label="Đang hiển thị"
          value={loading ? '...' : stats?.listings?.active ?? '...'}
          sublabel="Đang hiển thị"
          color="bg-white"
        />
        <StatCard
          icon={<CalendarDays className="size-5 text-[#151515]" />}
          label="Lịch hẹn sắp tới"
          value={loading ? '...' : todayAppointments.length}
          sublabel="Lịch hẹn xem phòng"
          color="bg-[#FDE047]"
        />
        <StatCard
          icon={<Users className="size-5 text-[#151515]" />}
          label="Khách hàng quan tâm"
          value={loading ? '...' : leads.length}
          sublabel="Lead mới"
          color="bg-[#FDE047]"
        />
      </div>

      {/* ── Main: Listings + Side ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">

        {/* ── E: Listings table ── */}
        <Card className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <CardHeader className="flex flex-row items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-black" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              <Megaphone className="size-5 text-[#FDE047]" />
              Tin đăng của bạn
            </CardTitle>
            <Link href="/seller/listings">
              <Button variant="ghost" size="sm" className="gap-1 text-sm font-bold text-[#059669] hover:underline">
                Xem tất cả <ChevronRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <div className="size-8 animate-spin rounded-full border-[2px] border-[#151515] border-t-transparent" />
                <p className="text-sm text-[#151515]/50">Đang tải...</p>
              </div>
            ) : recentListings.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <ImageIcon className="size-12 text-[#151515]/20" />
                <p className="text-sm text-[#151515]/50">Chưa có tin đăng nào</p>
                <Link href="/seller/listings/new">
                  <Button size="sm" className="gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] font-bold text-[#151515] shadow-[2px_2px_0_#151515]">
                    <Plus className="size-4" /> Tạo tin đầu tiên
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#151515]/10 bg-[#F5F5F0]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#151515]/50">Tin đăng</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#151515]/50">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#151515]/50">Giá thuê</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#151515]/50">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151515]/5">
                    {recentListings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-[#F5F5F0]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0]">
                              {listing.image?.[0] ? (
                                <img src={listing.image[0]} alt="" className="size-full rounded-xl object-cover" />
                              ) : (
                                <BedDouble className="size-5 text-[#151515]/30" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>{listing.title}</p>
                              <p className="flex items-center gap-1 truncate text-xs text-[#151515]/50">
                                <MapPin className="size-3" />
                                {listing.district}, {listing.city}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getListingBadge(listing)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-[#151515]">
                          {listing.rent ? formatVnd(listing.rent) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/seller/listings/${listing.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-xl border-[2px] border-[#151515] bg-white px-3 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]">
                                <Edit2 className="size-3" /> Quản lý
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right sidebar ── */}
        <div className="flex flex-col gap-5">

          {/* ── F: Upcoming appointments ── */}
          <Card className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <CardHeader className="flex flex-row items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-black" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                <CalendarDays className="size-5 text-[#059669]" />
                Lịch hẹn sắp tới
              </CardTitle>
              <Link href="/seller/appointments">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-bold text-[#059669] hover:underline">
                  Xem lịch hẹn <ChevronRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="size-6 animate-spin rounded-full border-[2px] border-[#151515] border-t-transparent" />
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CalendarDays className="size-8 text-[#151515]/20" />
                  <p className="text-xs text-[#151515]/50">Không có lịch hẹn nào</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-start gap-3 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-3 shadow-[2px_2px_0_#151515]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white">
                        {appt.listing?.image?.[0] ? (
                          <img src={appt.listing.image[0]} alt="" className="size-full rounded-xl object-cover" />
                        ) : (
                          <BedDouble className="size-5 text-[#151515]/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                          {appt.tenant?.fullName || appt.phone || 'Khách lẻ'}
                        </p>
                        <p className="truncate text-xs text-[#151515]/50">{appt.listing?.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="size-3 text-[#F59E0B]" />
                          <span className="text-xs font-bold text-[#F59E0B]">
                            {appt.when ? new Date(appt.when).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chờ xác nhận'}
                          </span>
                        </div>
                      </div>
                      <ApptStatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── G: Interested customers ── */}
          <Card className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <CardHeader className="flex flex-row items-center justify-between border-b-[2px] border-[#151515] bg-[#FDE047] px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-black" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                <Users className="size-5 text-[#151515]" />
                Khách hàng quan tâm
              </CardTitle>
              <Link href="/seller/leads">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-bold text-[#151515] hover:underline">
                  Xem tất cả <ChevronRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="size-6 animate-spin rounded-full border-[2px] border-[#151515] border-t-transparent" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Users className="size-8 text-[#151515]/20" />
                  <p className="text-xs text-[#151515]/50">Chưa có khách quan tâm</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {leads.slice(0, 4).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-3 shadow-[2px_2px_0_#151515]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2px] border-[#151515] bg-[#FDE047] text-sm font-black text-[#151515]">
                          {lead.name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>{lead.name}</p>
                          <p className="flex items-center gap-1 text-xs text-[#151515]/50">
                            <Phone className="size-3" /> {lead.phone}
                          </p>
                          {lead.listing && (
                            <p className="mt-1 truncate text-xs font-medium text-[#059669]">{lead.listing.title}</p>
                          )}
                        </div>
                      </div>
                      <LeadStatus status={lead.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

// ── Stat Card ──
function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel: string
  color: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border-[3px] border-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_#151515]', color)}>
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/50">{label}</p>
          <p className="mt-1 text-3xl font-black text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>{value}</p>
          <p className="mt-1 text-xs text-[#151515]/50">{sublabel}</p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515]">
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Listing badge ──
function getListingBadge(listing: Listing) {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    active:   { bg: 'bg-[#D1FAE5]', text: 'text-[#059669]', border: 'border-[#059669]', label: 'Đang hiển thị' },
    pending:  { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#D97706]', label: 'Chờ duyệt' },
    draft:    { bg: 'bg-[#F5F5F0]', text: 'text-[#151515]/60', border: 'border-[#151515]/30', label: 'Nháp' },
    rejected: { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', border: 'border-[#EF4444]', label: 'Bị từ chối' },
    inactive: { bg: 'bg-[#F5F5F0]', text: 'text-[#151515]/40', border: 'border-[#151515]/20', label: 'Đã ẩn' },
  }
  const c = config[listing.status] || config.draft
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg border-[2px] px-2.5 py-1 text-xs font-bold', c.bg, c.text, c.border)}>
      {c.label}
    </span>
  )
}

// ── Lead status ──
function LeadStatus({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string; label: string; text?: string }> = {
    new:          { bg: 'bg-[#EFF6FF]', dot: 'bg-[#3B82F6]', label: 'Mới', text: 'text-[#3B82F6]' },
    contacted:    { bg: 'bg-[#FEF3C7]', dot: 'bg-[#F59E0B]', label: 'Đã liên hệ', text: 'text-[#D97706]' },
    interested:   { bg: 'bg-[#D1FAE5]', dot: 'bg-[#059669]', label: 'Quan tâm', text: 'text-[#059669]' },
    not_interested: { bg: 'bg-[#F5F5F0]', dot: 'bg-[#9CA3AF]', label: 'Không', text: 'text-[#151515]/60' },
  }
  const c = config[status] || config.new
  return (
    <span className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold', c.bg, c.text)}>
      <span className={cn('size-2 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

// ── Appointment status ──
function ApptStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    pending:   { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#D97706]', label: 'Chờ' },
    confirmed: { bg: 'bg-[#D1FAE5]', text: 'text-[#059669]', border: 'border-[#059669]', label: 'Xác nhận' },
    completed: { bg: 'bg-[#EFF6FF]', text: 'text-[#3B82F6]', border: 'border-[#3B82F6]', label: 'Xong' },
    cancelled: { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', border: 'border-[#EF4444]', label: 'Hủy' },
  }
  const c = config[status] || config.pending
  return (
    <span className={cn('rounded-lg border-[2px] px-2 py-0.5 text-[10px] font-bold', c.bg, c.text, c.border)}>
      {c.label}
    </span>
  )
}
