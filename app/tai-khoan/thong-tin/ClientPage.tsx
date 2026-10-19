'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  Edit3,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

interface ProfileData {
  fullName: string
  phone: string
  email: string
}

export default function ThongTinPage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    phone: '',
    email: '',
  })
  const [initialData, setInitialData] = useState<ProfileData>({
    fullName: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    if (!user) return
    const loadProfile = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
        const token = localStorage.getItem('api_token') || ''
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const profile = {
            fullName: data.user?.fullName || user.name || '',
            phone: data.user?.phone || '',
            email: data.user?.email || '',
          }
          setFormData(profile)
          setInitialData(profile)
        }
      } catch (err) {
        const profile = { fullName: user.name || '', phone: user.phone || '', email: user.email || '' }
        setFormData(profile)
        setInitialData(profile)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!formData.fullName.trim()) return
    setSaving(true)
    setSuccess(false)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
      const token = localStorage.getItem('api_token') || ''
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const data = await res.json()
        const updated = {
          fullName: data.user?.fullName || formData.fullName,
          phone: data.user?.phone || formData.phone,
          email: data.user?.email || formData.email,
        }
        setFormData(updated)
        setInitialData(updated)
        setIsEditing(false)
        setSuccess(true)
      }
    } catch (err) {
      console.error('[ThongTin] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialData)
    setIsEditing(false)
    setSuccess(false)
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F8FAFC]">
        <p className="text-[#151515]/60">Vui lòng đăng nhập để xem thông tin.</p>
      </div>
    )
  }

  const initials = (formData.fullName || user.name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border-[2px] border-[#059669] bg-[#D1FAE5] px-4 py-3">
          <CheckCircle className="size-5 text-[#059669]" />
          <p className="text-sm font-semibold text-[#059669]">Cập nhật thông tin thành công!</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border-[3px] border-[#151515] bg-white shadow-[5px_5px_0_#151515]">
        {loading ? (
          <div className="flex flex-col items-center border-b-[2px] border-[#151515] bg-[#F5F5F0] p-8">
            <div className="mb-4 h-24 w-24 animate-pulse rounded-2xl bg-[#E5E5E0]" />
            <div className="mb-2 h-6 w-40 animate-pulse rounded-lg bg-[#E5E5E0]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#E5E5E0]" />
          </div>
        ) : (
          <div className="flex flex-col items-center border-b-[2px] border-[#151515] bg-[#F5F5F0] p-8">
            <div className="flex size-24 items-center justify-center rounded-2xl border-[3px] border-[#151515] bg-[#FDE047] text-3xl font-black text-[#151515] shadow-[4px_4px_0_#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              {initials}
            </div>
            <p className="mt-4 text-lg font-bold text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              {formData.fullName || user.name}
            </p>
            <p className="mt-1 text-sm text-[#151515]/60">Người thuê</p>
          </div>
        )}

        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-black text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>Thông tin tài khoản</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-lg border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
              >
                <Edit3 className="size-4" />Chỉnh sửa
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} disabled={saving}
                  className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:opacity-50">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving || !formData.fullName.trim()}
                  className="flex items-center gap-2 rounded-lg border-[2px] border-[#151515] bg-[#059669] px-4 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? <><Loader2 className="size-4 animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#151515]"><User className="size-4 text-[#151515]/50" />Họ và tên</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={!isEditing}
                className="w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3 text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#151515]"><Phone className="size-4 text-[#151515]/50" />Số điện thoại</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing}
                className="w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3 text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#151515]"><Mail className="size-4 text-[#151515]/50" />Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing}
                className="w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-3 text-sm font-medium text-[#151515] shadow-[2px_2px_0_#151515] transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none" />
            </div>
          </div>

          <div className="mt-6 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <ShieldCheck className="size-5 text-[#151515]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#151515]">Tài khoản đã xác minh</p>
                  <p className="text-xs text-[#151515]/60">Số điện thoại đã được xác thực</p>
                </div>
              </div>
              <div className="flex size-6 items-center justify-center rounded-full bg-[#059669]">
                <CheckCircle className="size-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center pb-6">
          <Link href="/tai-khoan" className="flex items-center gap-2 text-sm font-semibold text-[#151515]/60 hover:text-[#151515] hover:underline">
            <ArrowLeft className="size-4" />Quay lại Tài khoản của tôi
          </Link>
        </div>
      </div>
    </>
  )
}
