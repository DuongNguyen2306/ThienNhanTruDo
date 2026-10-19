'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User, Phone, Mail, MapPin, Building2, ShieldCheck, Star, Edit2, Save, Camera,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight
} from 'lucide-react'
import { sellerApi, type SellerProfile } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  none: { label: 'Chưa nộp', bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', icon: AlertCircle },
  pending: { label: 'Đang xét duyệt', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', icon: Clock },
  active: { label: 'Đã xác minh', bg: 'bg-[#dcfce7]', text: 'text-[#166534]', icon: CheckCircle2 },
  rejected: { label: 'Bị từ chối', bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', icon: AlertCircle },
}

type EditField = {
  fullName: string
  email: string
  phone: string
  address: string
  brand: string
}

export default function ClientPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<EditField>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    brand: '',
  })

  useEffect(() => {
    sellerApi.getProfile()
      .then(({ profile: p }) => {
        setProfile(p)
        // Note: getProfile may not return user info, we'll use what's available
        setForm({
          fullName: p.userId || '',
          email: '',
          phone: '',
          address: p.address || '',
          brand: p.brand || '',
        })
        setLoading(false)
      })
      .catch(() => {
        setError('Không thể tải thông tin hồ sơ')
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { profile: updated } = await sellerApi.updateProfile(form)
      setProfile(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Không thể lưu thay đổi')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setForm({
        fullName: profile.userId || '',
        email: '',
        phone: '',
        address: profile.address || '',
        brand: profile.brand || '',
      })
    }
    setEditing(false)
  }

  const statusCfg = profile ? STATUS_CONFIG[profile.status] || STATUS_CONFIG.none : STATUS_CONFIG.none

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
        <span className="text-[#151515]">Hồ sơ chủ trọ</span>
      </nav>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="flex flex-col gap-6 rounded-2xl border-[2px] border-[#151515] bg-white p-6 shadow-[3px_3px_0_#151515] lg:flex-row">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-[#FDE047] text-3xl font-black text-[#151515]">
              {profile?.brand?.[0]?.toUpperCase() || 'S'}
            </div>
            {profile?.status === 'active' && (
              <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#059669] text-white">
                <CheckCircle2 className="size-4" />
              </div>
            )}
          </div>
          <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-semibold',
            statusCfg.bg, statusCfg.text, statusCfg.bg.replace('bg-', 'border-')
          )}>
            {(() => {
              const Icon = statusCfg.icon
              return <Icon className="size-3.5" />
            })()}
            {statusCfg.label}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-2xl font-black text-[#151515]">
            {profile?.brand || 'Chủ trọ mới'}
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Thông tin hồ sơ công khai hiển thị với người thuê
          </p>
          
          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#F5F5F0] p-3 text-center">
              <div className="flex size-8 mx-auto items-center justify-center rounded-full bg-[#fef9c3]">
                <Star className="size-4 text-[#854d0e]" />
              </div>
              <p className="mt-1 font-mono text-lg font-black text-[#151515]">
                {profile?.trustScore?.toFixed(1) || '4.0'}
              </p>
              <p className="text-xs text-[#151515]/60">Trust Score</p>
            </div>
            <div className="rounded-xl bg-[#F5F5F0] p-3 text-center">
              <div className="flex size-8 mx-auto items-center justify-center rounded-full bg-[#dbeafe]">
                <Building2 className="size-4 text-[#1e40af]" />
              </div>
              <p className="mt-1 font-mono text-lg font-black text-[#151515]">
                {profile?.idNumber ? '18' : '0'}
              </p>
              <p className="text-xs text-[#151515]/60">Phòng đang quản lý</p>
            </div>
            <div className="rounded-xl bg-[#F5F5F0] p-3 text-center">
              <div className="flex size-8 mx-auto items-center justify-center rounded-full bg-[#dcfce7]">
                <Phone className="size-4 text-[#166534]" />
              </div>
              <p className="mt-1 font-mono text-lg font-black text-[#151515]">
                {profile?.responseRate ?? 0}%
              </p>
              <p className="text-xs text-[#151515]/60">Phản hồi</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
            >
              <Edit2 className="size-4" />
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Saved Message */}
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4 text-sm text-[#166534]">
          <CheckCircle2 className="size-5" />
          Đã lưu thay đổi thành công!
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column - Form */}
        <div className="flex flex-col gap-6">
          
          {/* Basic Info Card */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#151515]">
                <User className="size-5" />
                Thông tin cơ bản
              </h2>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <FormField
                label="Tên hiển thị"
                value={form.brand}
                onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
                disabled={!editing}
                placeholder="VD: Minh Anh Realty"
              />
              <FormField
                label="Họ và tên"
                value={form.fullName}
                onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                disabled={!editing}
                placeholder="VD: Trần Minh Anh"
              />
              <FormField
                label="Số điện thoại"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                disabled={!editing}
                placeholder="VD: 0903 112 334"
                type="tel"
              />
              <FormField
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                disabled={!editing}
                placeholder="VD: contact@example.com"
                type="email"
              />
              <div className="md:col-span-2">
                <FormField
                  label="Địa chỉ hoạt động"
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  disabled={!editing}
                  placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                />
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          {profile?.status === 'pending' && (
            <div className="overflow-hidden rounded-2xl border-[2px] border-[#FDE047] bg-[#fef9c3] p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDE047]">
                  <Clock className="size-5 text-[#854d0e]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#854d0e]">Hồ sơ đang được xét duyệt</h3>
                  <p className="mt-1 text-sm text-[#854d0e]/80">
                    Hồ sơ của bạn đang được Admin xét duyệt. Quá trình này thường mất 1-2 ngày làm việc.
                  </p>
                  {profile.submittedAt && (
                    <p className="mt-2 text-xs text-[#854d0e]/60">
                      Đã gửi: {new Date(profile.submittedAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {profile?.status === 'rejected' && (
            <div className="overflow-hidden rounded-2xl border-[2px] border-red-300 bg-red-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="size-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-700">Hồ sơ bị từ chối</h3>
                  <p className="mt-1 text-sm text-red-600">
                    {profile.reviewNote || 'Vui lòng kiểm tra lại thông tin và gửi lại.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {profile?.status === 'none' && (
            <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#151515]/10">
                  <AlertCircle className="size-5 text-[#151515]/50" />
                </div>
                <div>
                  <h3 className="font-bold text-[#151515]">Chưa gửi hồ sơ xác minh</h3>
                  <p className="mt-1 text-sm text-[#151515]/70">
                    Gửi hồ sơ để được xác minh và tăng độ tin cậy với người thuê.
                  </p>
                  <Link
                    href="/seller/profile/verification"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#059669] hover:underline"
                  >
                    Xác minh ngay
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <aside className="flex flex-col gap-4">
          
          {/* Verification Info Card */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#151515]">
                <ShieldCheck className="size-5 text-[#059669]" />
                Trạng thái xác minh
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex size-12 items-center justify-center rounded-full',
                  profile?.status === 'active' ? 'bg-[#dcfce7]' : 'bg-[#f1f5f9]'
                )}>
                  {profile?.status === 'active' ? (
                    <CheckCircle2 className="size-6 text-[#166534]" />
                  ) : (
                    <ShieldCheck className="size-6 text-[#64748b]" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-[#151515]">
                    {profile?.status === 'active' ? 'Đã xác minh' : 
                     profile?.status === 'pending' ? 'Đang xét duyệt' :
                     'Chưa xác minh'}
                  </p>
                  <p className="text-sm text-[#151515]/60">
                    {profile?.status === 'active' ? 'Hồ sơ đã được duyệt' :
                     profile?.status === 'pending' ? 'Vui lòng chờ 1-2 ngày' :
                     'Cần xác minh để tăng uy tín'}
                  </p>
                </div>
              </div>

              {profile?.reviewedAt && (
                <div className="mt-4 rounded-xl bg-[#F5F5F0] p-3">
                  <p className="text-xs text-[#151515]/60">
                    {profile.status === 'active' ? 'Được duyệt lúc' : 'Xét duyệt lúc'}
                  </p>
                  <p className="text-sm font-medium text-[#151515]">
                    {new Date(profile.reviewedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}

              {profile?.status !== 'active' && (
                <Link
                  href="/seller/profile/verification"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#151515] font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                >
                  <ShieldCheck className="size-4" />
                  Xác minh ngay
                </Link>
              )}
            </div>
          </div>

          {/* Tips Card */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#FDE047] bg-[#fef9c3] p-5">
            <h3 className="flex items-center gap-2 font-bold text-[#854d0e]">
              <Star className="size-5 fill-[#FDE047]" />
              Mẹo tăng uy tín
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#854d0e]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#166534]" />
                Trả lời yêu cầu hẹn trong 1 giờ
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#166534]" />
                Mua gói "Xác minh tận nơi" cho tin VIP
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#166534]" />
                Bổ sung giấy tờ nhà đầy đủ
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#166534]" />
                Cập nhật thông tin chính xác
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}

// Form Field Component
function FormField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#151515]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-xl border-[2px] border-[#151515]/20 bg-white px-4 text-sm text-[#151515] transition-all',
          'focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30',
          disabled && 'cursor-not-allowed bg-[#F5F5F0] text-[#151515]/50'
        )}
      />
    </div>
  )
}
