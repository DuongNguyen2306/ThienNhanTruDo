'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, User, Building2, Calendar, Phone,
  Mail, MapPin, Clock, AlertTriangle,
  FileText, CalendarDays, Activity, Flag,
  CheckCircle2, XCircle, ExternalLink, ChevronRight
} from 'lucide-react'
import { managerApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccountDetail {
  id: string
  fullName: string
  phone: string
  phoneRaw?: string
  email: string | null
  role: 'tenant' | 'seller'
  initials: string
  createdAt: string
  updatedAt: string
  sellerProfile?: {
    id: string
    status: string
    submittedAt: string | null
    reviewedAt: string | null
    reviewNote: string | null
    address: string | null
    idNumber: string | null
    brand: string | null
  } | null
  listings: Array<{
    id: string
    title: string
    status: string
    verified: boolean
    createdAt: string
    appointmentsCount: number
  }>
  activities: Array<{
    id: string
    action: string
    targetType: string | null
    target: string | null
    details: string | null
    createdAt: string
  }>
  reports: Array<{
    id: string
    reason: string
    severity: string
    status: string
    title: string
    createdAt: string
    listing?: { id: string; title: string }
    reporter?: { id: string; fullName: string }
  }>
  stats: {
    totalListings: number
    activeListings: number
    totalAppointments: number
    totalReports: number
  }
}

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold border-[2px] ${
      role === 'seller'
        ? 'bg-[#FDE047] text-[#151515] border-[#151515]'
        : 'bg-blue-50 text-blue-700 border-blue-300'
    }`}>
      {role === 'seller' ? <Building2 className="size-4" /> : <User className="size-4" />}
      {role === 'seller' ? 'Chủ trọ' : 'Người thuê'}
    </span>
  )
}

// ─── Seller Status Badge ───────────────────────────────────────────────────────
function SellerStatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const configs: Record<string, { label: string; class: string; icon: any }> = {
    pending: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
    active: { label: 'Đã duyệt', class: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
    rejected: { label: 'Từ chối', class: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  }
  const config = configs[status] || { label: status, class: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border-[2px] ${config.class}`}>
      <Icon className="size-4" />
      {config.label}
    </span>
  )
}

// ─── Tab Button ────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-t-xl border-[2px] border-b-0 px-5 py-3 text-sm font-semibold transition ${
        active
          ? 'border-[#151515] bg-[#FDE047] text-[#151515]'
          : 'border-[#151515]/30 bg-white text-[#151515]/60 hover:bg-[#F5F5F0]'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AccountDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string
  const router = useRouter()

  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'activities' | 'reports'>('overview')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    managerApi.getAccountDetail(id)
      .then((data) => setAccount(data))
      .catch((err) => {
        console.error('[AccountDetail] Fetch error:', err)
        setError('Không thể tải thông tin tài khoản. Vui lòng thử lại.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="size-10 animate-pulse rounded-xl bg-[#F5F5F0]" />
          <div className="h-8 w-64 animate-pulse rounded bg-[#F5F5F0]" />
        </div>
        <div className="h-48 animate-pulse rounded-xl border-2 border-[#151515] bg-white" />
      </main>
    )
  }

  if (error || !account) {
    return (
      <main className="flex flex-col items-center justify-center gap-6 px-5 py-20 lg:px-8">
        <AlertTriangle className="size-16 text-red-500" />
        <p className="text-lg font-semibold text-[#151515]">{error || 'Không tìm thấy tài khoản'}</p>
        <Link
          href="/manager/accounts"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-5 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Back button ────────────────────────────────────────────────────── */}
      <Link
        href="/manager/accounts"
        className="inline-flex w-fit items-center gap-2 rounded-lg border-[2px] border-[#151515]/20 bg-white px-4 py-2 text-sm font-medium text-[#151515]/60 transition hover:border-[#151515] hover:text-[#151515]"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      {/* ── Profile Card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-xl font-black text-[#151515]">
              {account.initials}
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {account.fullName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <RoleBadge role={account.role} />
                {account.sellerProfile && (
                  <SellerStatusBadge status={account.sellerProfile.status} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {account.phone && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
                <Phone className="size-4 text-[#151515]/50" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Số điện thoại</p>
                <p className="font-semibold text-[#151515]">{account.phone}</p>
              </div>
            </div>
          )}
          {account.email && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
                <Mail className="size-4 text-[#151515]/50" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Email</p>
                <p className="font-semibold text-[#151515]">{account.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
              <Calendar className="size-4 text-[#151515]/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#151515]/50">Ngày tham gia</p>
              <p className="font-semibold text-[#151515]">
                {new Date(account.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          {account.sellerProfile?.address && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
                <MapPin className="size-4 text-[#151515]/50" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Địa chỉ đăng ký</p>
                <p className="font-semibold text-[#151515]">{account.sellerProfile.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Seller info */}
        {account.sellerProfile && (
          <div className="border-t-[2px] border-[#151515]/20 px-6 py-4 bg-[#F5F5F0]/50">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#151515]/50">
              Thông tin Seller
            </h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {account.sellerProfile?.brand && (
                <div>
                  <span className="text-[#151515]/50">Thương hiệu: </span>
                  <span className="font-medium">{account.sellerProfile.brand}</span>
                </div>
              )}
              {account.sellerProfile?.idNumber && (
                <div>
                  <span className="text-[#151515]/50">Số CCCD: </span>
                  <span className="font-medium">{account.sellerProfile.idNumber}</span>
                </div>
              )}
              {account.sellerProfile?.reviewedAt && (
                <div>
                  <span className="text-[#151515]/50">Duyệt ngày: </span>
                  <span className="font-medium">
                    {new Date(account.sellerProfile.reviewedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
              {account.sellerProfile?.reviewNote && (
                <div>
                  <span className="text-[#151515]/50">Ghi chú: </span>
                  <span className="font-medium">{account.sellerProfile.reviewNote}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
          <div className="flex size-12 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0]">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#151515]">{account.stats.totalListings}</p>
            <p className="text-xs font-medium text-[#151515]/50">Tin đăng</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
          <div className="flex size-12 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-green-100">
            <CheckCircle2 className="size-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#151515]">{account.stats.activeListings}</p>
            <p className="text-xs font-medium text-[#151515]/50">Đang hiển thị</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
          <div className="flex size-12 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-blue-100">
            <CalendarDays className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#151515]">{account.stats.totalAppointments}</p>
            <p className="text-xs font-medium text-[#151515]/50">Lịch hẹn</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
          <div className="flex size-12 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-red-100">
            <Flag className="size-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#151515]">{account.stats.totalReports}</p>
            <p className="text-xs font-medium text-[#151515]/50">Báo cáo</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div>
        {/* Tab buttons */}
        <div className="flex flex-wrap gap-0">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            <FileText className="size-4" /> Tổng quan
          </TabButton>
          <TabButton active={activeTab === 'listings'} onClick={() => setActiveTab('listings')}>
            <FileText className="size-4" /> Tin đăng ({account.listings.length})
          </TabButton>
          <TabButton active={activeTab === 'activities'} onClick={() => setActiveTab('activities')}>
            <Activity className="size-4" /> Lịch sử ({account.activities.length})
          </TabButton>
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>
            <Flag className="size-4" /> Báo cáo ({account.reports.length})
          </TabButton>
        </div>

        {/* Tab content */}
        <div className="rounded-b-xl border-[2px] border-t-0 border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">

          {/* ── Overview Tab ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {account.listings.length === 0 && account.reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <FileText className="size-12 text-[#151515]/20" />
                  <p className="text-sm font-medium text-[#151515]/50">Chưa có hoạt động nào</p>
                </div>
              ) : (
                <>
                  {account.listings.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/50">
                        Tin đăng gần đây
                      </h3>
                      <div className="space-y-2">
                        {account.listings.slice(0, 5).map((listing) => (
                          <Link
                            key={listing.id}
                            href={`/phong/${listing.id}`}
                            target="_blank"
                            className="flex items-center justify-between rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-4 py-3 transition hover:border-[#151515] hover:bg-[#FDE047]/20"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="size-4 text-[#151515]/50" />
                              <span className="font-medium text-[#151515] line-clamp-1">{listing.title}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                listing.status === 'active' ? 'bg-green-100 text-green-700' :
                                listing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {listing.status}
                              </span>
                            </div>
                            <ExternalLink className="size-4 text-[#151515]/30 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {account.reports.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#151515]/50">
                        Báo cáo liên quan
                      </h3>
                      <div className="space-y-2">
                        {account.reports.map((report) => (
                          <div
                            key={report.id}
                            className="flex items-center justify-between rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Flag className={`size-4 ${
                                report.severity === 'high' ? 'text-red-500' :
                                report.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                              }`} />
                              <div>
                                <p className="font-medium text-[#151515]">{report.reason}</p>
                                <p className="text-xs text-[#151515]/50">
                                  {report.listing?.title || 'Không có tin'} ·{' '}
                                  {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {report.status === 'resolved' ? 'Đã xử lý' :
                               report.status === 'pending' ? 'Chờ xử lý' :
                               report.status === 'dismissed' ? 'Bác bỏ' : report.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Listings Tab ──────────────────────────────────────────────── */}
          {activeTab === 'listings' && (
            <div>
              {account.listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <FileText className="size-12 text-[#151515]/20" />
                  <p className="text-sm font-medium text-[#151515]/50">Chưa có tin đăng nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {account.listings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/phong/${listing.id}`}
                      target="_blank"
                      className="flex items-center justify-between rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4 transition hover:border-[#FDE047] hover:bg-[#FDE047]/20 hover:shadow-[3px_3px_0_#151515]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-white">
                          <FileText className="size-5 text-[#151515]/50" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#151515]">{listing.title}</p>
                          <p className="text-xs text-[#151515]/50">
                            {new Date(listing.createdAt).toLocaleDateString('vi-VN')}
                            {listing.appointmentsCount > 0 && ` · ${listing.appointmentsCount} lịch hẹn`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border-[2px] ${
                          listing.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' :
                          listing.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          listing.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                          'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {listing.status === 'active' ? 'Đang hiển thị' :
                           listing.status === 'pending' ? 'Chờ duyệt' :
                           listing.status === 'rejected' ? 'Bị từ chối' : listing.status}
                        </span>
                        {listing.verified && (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1.5 rounded-lg border border-green-300">
                            ✓ Đã xác thực
                          </span>
                        )}
                        <ChevronRight className="size-4 text-[#151515]/30" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Activities Tab ────────────────────────────────────────────── */}
          {activeTab === 'activities' && (
            <div>
              {account.activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <Activity className="size-12 text-[#151515]/20" />
                  <p className="text-sm font-medium text-[#151515]/50">Chưa có lịch sử hoạt động</p>
                  <p className="text-xs text-[#151515]/30">Audit log sẽ hiển thị tại đây khi có dữ liệu</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#151515]/10" />
                  
                  <div className="space-y-4">
                    {account.activities.map((activity, idx) => (
                      <div key={activity.id} className="relative flex gap-4 pl-12">
                        {/* Dot */}
                        <div className={`absolute left-0 flex size-10 items-center justify-center rounded-full border-[2px] border-[#151515] bg-white z-10 ${
                          idx === 0 ? 'bg-[#FDE047]' : 'bg-[#F5F5F0]'
                        }`}>
                          <Activity className="size-4 text-[#151515]/50" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[#151515]">{activity.action}</p>
                              <p className="text-xs text-[#151515]/50">
                                {activity.targetType && `${activity.targetType}`}
                                {activity.target && ` #${activity.target.slice(-8)}`}
                              </p>
                            </div>
                            <span className="text-xs text-[#151515]/40 whitespace-nowrap">
                              {new Date(activity.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {activity.details && (
                            <p className="mt-1 text-xs text-[#151515]/60">{activity.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reports Tab ──────────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <div>
              {account.reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <Flag className="size-12 text-[#151515]/20" />
                  <p className="text-sm font-medium text-[#151515]/50">Không có báo cáo vi phạm</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {account.reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Flag className={`size-5 mt-0.5 shrink-0 ${
                            report.severity === 'high' ? 'text-red-500' :
                            report.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-[#151515]">{report.title}</p>
                            <p className="text-xs text-[#151515]/50 mt-1">
                              {report.listing?.title && `Tin: ${report.listing.title}`}
                              {report.reporter && ` · Người báo cáo: ${report.reporter.fullName}`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border-[2px] shrink-0 ${
                          report.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-300' :
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          report.status === 'dismissed' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {report.status === 'resolved' ? 'Đã xử lý' :
                           report.status === 'pending' ? 'Chờ xử lý' :
                           report.status === 'dismissed' ? 'Bác bỏ' : report.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-[#151515]/40">
                        <span>Ngày: {new Date(report.createdAt).toLocaleDateString('vi-VN')}</span>
                        <span>Mức độ: <strong className={
                          report.severity === 'high' ? 'text-red-600' :
                          report.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }>{report.severity}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
