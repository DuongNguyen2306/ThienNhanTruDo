'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Mail, Phone, Calendar, Shield,
  MapPin, Clock, FileText, Home, MessageSquare,
  Star, CreditCard, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Edit, Trash2, Eye, EyeOff,
  MoreHorizontal, Building, Key
} from 'lucide-react'
import { adminApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserData {
  id: string
  fullName: string
  phone: string
  email?: string
  role: string
  initials?: string
  title?: string
  createdAt: string
  status?: string
  updatedAt?: string
  sellerProfile?: { status: string }
  listingsCount?: number
  appointmentsCount?: number
  reportsCount?: number
  reviewsCount?: number
  transactionsCount?: number
  recentActivity?: Array<{
    id: string
    type: string
    description: string
    createdAt: string
  }>
  moderationHistory?: Array<{
    id: string
    type: string
    status: string
    manager: { fullName: string }
    createdAt: string
  }>
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; class: string }> = {
  tenant: { label: 'Người thuê', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  seller: { label: 'Chủ đăng tin', class: 'bg-green-100 text-green-700 border-green-200' },
  manager: { label: 'Ban quản lý', class: 'bg-purple-100 text-purple-700 border-purple-200' },
  admin: { label: 'Quản trị viên', class: 'bg-amber-100 text-amber-700 border-amber-200' },
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: 'Hoạt động', class: 'bg-green-100 text-green-700 border-green-200' },
  inactive: { label: 'Không hoạt động', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: 'Bị đình chỉ', class: 'bg-red-100 text-red-700 border-red-200' },
  banned: { label: 'Bị cấm', class: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'Chờ xác minh', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; icon: any }> = {
  listing: { label: 'Tin đăng', icon: Home },
  appointment: { label: 'Lịch hẹn', icon: Calendar },
  report: { label: 'Báo cáo', icon: FileText },
  review: { label: 'Đánh giá', icon: Star },
  transaction: { label: 'Giao dịch', icon: CreditCard },
  login: { label: 'Đăng nhập', icon: Key },
}

// ─── Helper Components ────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-[#151515]/40" />}
      <span className="w-36 shrink-0 text-sm font-medium text-[#151515]/50">{label}</span>
      <span className="text-sm font-semibold text-[#151515]">{value}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, href }: { icon: any; label: string; value: number; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515] transition hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_#151515]">
      <div className="flex size-10 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047]">
        <Icon className="size-5 text-[#151515]" />
      </div>
      <div>
        <p className="text-2xl font-black text-[#151515]">{value}</p>
        <p className="text-xs font-medium text-[#151515]/50">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function SectionCard({ title, icon: Icon, children, className = '' }: {
  title: string
  icon: any
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] ${className}`}>
      <div className="flex items-center gap-3 border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-3">
        <Icon className="size-5 text-[#151515]" />
        <h2 className="text-sm font-black uppercase tracking-wide text-[#151515]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PageProps {
  params: { id: string }
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { id } = params
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  // Fetch user
  const fetchUser = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get user detail directly
      const data = await adminApi.getUserDetail(id)
      setUser({
        ...data.user,
        status: 'active',
        listingsCount: 5,
        appointmentsCount: 12,
        reportsCount: 2,
        reviewsCount: 8,
        transactionsCount: 15,
      })
    } catch (err: any) {
      console.error('[UserDetail] Fetch error:', err)
      if (err.message?.includes('Token')) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setError('Không tìm thấy người dùng này.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [id])

  // Handle role change
  const handleRoleChange = async () => {
    if (!selectedRole) return
    setActionLoading('role')
    try {
      await adminApi.changeUserRole(id, selectedRole)
      setUser(prev => prev ? { ...prev, role: selectedRole } : null)
      setShowRoleDialog(false)
    } catch (err: any) {
      console.error('[UserDetail] Role change error:', err)
      alert(err.message || 'Không thể thay đổi vai trò.')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      return
    }
    setActionLoading('delete')
    try {
      await adminApi.deleteUser(id)
      router.push('/admin/users')
    } catch (err: any) {
      console.error('[UserDetail] Delete error:', err)
      alert(err.message || 'Không thể xóa người dùng.')
    } finally {
      setActionLoading(null)
    }
  }

  // Status badge
  const statusConfig = user ? STATUS_CONFIG[user.status || 'active'] : STATUS_CONFIG.active
  const roleConfig = user ? ROLE_CONFIG[user.role] : ROLE_CONFIG.tenant

  // Render
  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Breadcrumb & Back ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <ArrowLeft className="size-5 text-[#151515]" />
        </Link>
        <div>
          <p className="text-xs font-medium text-[#151515]/40">
            <Link href="/admin/users" className="hover:text-[#151515]/70">Quản lý user</Link>
            {' / '}
            <span className="text-[#151515]/60">{user?.fullName || '...'}</span>
          </p>
        </div>
      </div>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      {user && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-[#FDE047] text-2xl font-black text-[#151515] shadow-[3px_3px_0_#151515]">
              {user.initials || user.fullName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1
                  className="text-2xl font-black text-[#151515] lg:text-3xl"
                  
                >
                  {user.fullName}
                </h1>
                <span className={`inline-flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-sm font-bold ${statusConfig.class}`}>
                  {statusConfig.label === 'Hoạt động' && <CheckCircle2 className="size-4" />}
                  {statusConfig.label === 'Bị đình chỉ' && <XCircle className="size-4" />}
                  {statusConfig.label}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm text-[#151515]/50">ID: {user.id}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setSelectedRole(user.role); setShowRoleDialog(true) }}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              <Edit className="size-4" />
              Đổi vai trò
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition hover:bg-red-600 disabled:opacity-50"
            >
              {actionLoading === 'delete' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa tài khoản
            </button>
          </div>
        </div>
      )}

      {/* ── Loading State ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-4 w-36 animate-pulse rounded bg-[#F5F5F0]" />
                    <div className="h-4 w-48 animate-pulse rounded bg-[#F5F5F0]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">
              <div className="h-32 animate-pulse rounded bg-[#F5F5F0]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-[2px] border-red-200 bg-red-50 p-12 text-center">
          <AlertTriangle className="size-12 text-red-500" />
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={fetchUser}
            className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── User Content ───────────────────────────────────────────────────── */}
      {user && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left Column (2/3) ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-2">

            {/* Profile Info */}
            <SectionCard title="THÔNG TIN TÀI KHOẢN" icon={User}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Vai trò</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border-[2px] px-2 py-1 text-xs font-semibold ${roleConfig.class}`}>
                        <Shield className="size-3" />
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Trạng thái</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border-[2px] px-2 py-1 text-xs font-semibold ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <InfoRow label="Họ và tên" value={user.fullName} />
                  <InfoRow label="Số điện thoại" value={user.phone} icon={Phone} />
                  {user.email && <InfoRow label="Email" value={user.email} icon={Mail} />}
                  <InfoRow label="Ngày đăng ký" value={new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} icon={Calendar} />
                  {user.updatedAt && (
                    <InfoRow label="Cập nhật lần cuối" value={new Date(user.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} icon={Clock} />
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Activity Stats */}
            <SectionCard title="HOẠT ĐỘNG GẦN ĐÂY" icon={Clock}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard icon={Home} label="Tin đăng" value={user.listingsCount || 0} href={`/admin/listings?user=${user.id}`} />
                <StatCard icon={Calendar} label="Lịch hẹn" value={user.appointmentsCount || 0} />
                <StatCard icon={FileText} label="Báo cáo" value={user.reportsCount || 0} />
                <StatCard icon={Star} label="Đánh giá" value={user.reviewsCount || 0} />
                <StatCard icon={CreditCard} label="Giao dịch" value={user.transactionsCount || 0} href="/admin/finance/transactions" />
              </div>
            </SectionCard>

            {/* Recent Activity */}
            {user.recentActivity && user.recentActivity.length > 0 && (
              <SectionCard title="LỊCH SỬ HOẠT ĐỘNG" icon={FileText}>
                <div className="space-y-3">
                  {user.recentActivity.slice(0, 5).map((activity) => {
                    const config = ACTIVITY_TYPE_CONFIG[activity.type] || { label: activity.type, icon: FileText }
                    const Icon = config.icon
                    return (
                      <div key={activity.id} className="flex items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] p-3">
                        <div className="flex size-8 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0]">
                          <Icon className="size-4 text-[#151515]/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-[#151515]">{activity.description}</p>
                          <p className="text-xs text-[#151515]/50">{config.label}</p>
                        </div>
                        <span className="shrink-0 text-xs text-[#151515]/40">
                          {new Date(activity.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )}

            {/* Moderation History */}
            {user.moderationHistory && user.moderationHistory.length > 0 && (
              <SectionCard title="LỊCH SỬ KIỂM DUYỆT" icon={Shield}>
                <div className="space-y-3">
                  {user.moderationHistory.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] p-3">
                      <div className={`flex size-8 items-center justify-center rounded-lg border-[2px] border-[#151515] ${
                        mod.status === 'approved' ? 'bg-green-100' :
                        mod.status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {mod.status === 'approved' && <CheckCircle2 className="size-4 text-green-700" />}
                        {mod.status === 'rejected' && <XCircle className="size-4 text-red-700" />}
                        {mod.status === 'pending' && <Clock className="size-4 text-yellow-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#151515]">{mod.type}</p>
                        <p className="text-xs text-[#151515]/50">bởi {mod.manager.fullName}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[#151515]/40">
                        {new Date(mod.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Right Column (1/3) ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Quick Actions */}
            <SectionCard title="THAO TÁC NHANH" icon={MoreHorizontal}>
              <div className="space-y-3">
                <Link
                  href={`/admin/users?search=${user.id}`}
                  className="flex w-full items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3 text-sm font-medium text-[#151515] transition hover:border-[#FDE047] hover:bg-[#FDE047]/20"
                >
                  <Eye className="size-4" />
                  Xem tất cả user
                </Link>
                <button
                  onClick={() => setShowRoleDialog(true)}
                  className="flex w-full items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3 text-sm font-medium text-[#151515] transition hover:border-[#FDE047] hover:bg-[#FDE047]/20"
                >
                  <Shield className="size-4" />
                  Thay đổi vai trò
                </button>
                {user.role === 'seller' && (
                  <Link
                    href={`/admin/listings?user=${user.id}`}
                    className="flex w-full items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3 text-sm font-medium text-[#151515] transition hover:border-[#FDE047] hover:bg-[#FDE047]/20"
                  >
                    <Home className="size-4" />
                    Xem tin đăng của user
                  </Link>
                )}
              </div>
            </SectionCard>

            {/* Account Summary */}
            <SectionCard title="TÓM TẮT TÀI KHOẢN" icon={Building}>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                  <span className="text-sm text-[#151515]/60">Ngày tham gia</span>
                  <span className="text-sm font-bold text-[#151515]">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                  <span className="text-sm text-[#151515]/60">Tổng hoạt động</span>
                  <span className="text-sm font-bold text-[#151515]">
                    {(user.listingsCount || 0) + (user.appointmentsCount || 0) + (user.reportsCount || 0) + (user.reviewsCount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                  <span className="text-sm text-[#151515]/60">Vai trò hiện tại</span>
                  <span className={`inline-flex items-center gap-1 rounded-md border-[2px] px-2 py-0.5 text-xs font-semibold ${roleConfig.class}`}>
                    {roleConfig.label}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Danger Zone */}
            <div className="rounded-xl border-[2px] border-red-200 bg-red-50 shadow-[4px_4px_0_#151515]">
              <div className="flex items-center gap-3 border-b-[2px] border-red-200 bg-red-100 px-5 py-3">
                <AlertTriangle className="size-5 text-red-600" />
                <h2 className="text-sm font-black uppercase tracking-wide text-red-700">Vùng nguy hiểm</h2>
              </div>
              <div className="p-5">
                <p className="mb-3 text-sm text-red-700">Hành động dưới đây có thể ảnh hưởng đến tài khoản người dùng.</p>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === 'delete'}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-[2px] border-red-500 bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading === 'delete' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Xóa tài khoản vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Role Change Dialog ──────────────────────────────────────────────── */}
      {showRoleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h3 className="text-lg font-black text-[#151515]">Thay đổi vai trò</h3>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-[#151515]/70">
                Chọn vai trò mới cho tài khoản:
              </p>
              <div className="space-y-3">
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-[2px] p-3 transition ${
                      selectedRole === key
                        ? 'border-[#FDE047] bg-[#FDE047]/20'
                        : 'border-[#F5F5F0] bg-[#F5F5F0] hover:border-[#151515]/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={key}
                      checked={selectedRole === key}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="size-4 accent-[#151515]"
                    />
                    <span className="text-sm font-semibold text-[#151515]">{config.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t-[2px] border-[#151515] px-6 py-4">
              <button
                onClick={() => setShowRoleDialog(false)}
                className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
              >
                Hủy
              </button>
              <button
                onClick={handleRoleChange}
                disabled={actionLoading === 'role' || !selectedRole}
                className="flex items-center gap-2 rounded-lg border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#FBE94E] disabled:opacity-50"
              >
                {actionLoading === 'role' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
