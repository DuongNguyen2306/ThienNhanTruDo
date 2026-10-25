'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { EmailChangeOtpDialog } from '@/components/email-change-otp-dialog'
import { authApi } from '@/lib/api'

export function ManagerProfile() {
  const { user, logout, updateAccount } = useAuth()
  const router = useRouter()
  
  // Form state
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // E-mail change confirmation (OTP sent to the NEW address)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendAvailableIn, setResendAvailableIn] = useState(60)
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Sync with user data when it changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmail(user.email || '')
    }
  }, [user])

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setSaveError('Họ tên không được trống')
      return
    }
    
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      const result = await authApi.updateProfile({ fullName: fullName.trim(), email: email.trim() || undefined })

      // An e-mail change is not applied immediately: the backend sends an OTP
      // to the NEW address and only updates the record once it is confirmed.
      if (result.requiresEmailConfirmation && result.pendingEmail) {
        setPendingEmail(result.pendingEmail)
        setResendAvailableIn(result.resendAvailableIn || 60)
        // Keep the OLD address on screen until the change is confirmed.
        setEmail(user!.email || '')
        return
      }

      // Update local auth state
      if (result.user) {
        updateAccount(user!.id, { fullName: result.user.fullName, email: result.user.email })
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      setSaveError(error?.message || 'Không thể lưu thay đổi')
    } finally {
      setSaving(false)
    }
  }

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)
    
    // Validation
    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp')
      return
    }
    
    setChangingPassword(true)
    
    try {
      await authApi.changePassword(currentPassword, newPassword)
      
      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error?.status === 401) {
        setPasswordError('Mật khẩu hiện tại không đúng')
      } else {
        setPasswordError(error?.message || 'Không thể đổi mật khẩu')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    router.push('/dang-nhap')
  }

  // Role badge colors
  const roleColors: Record<string, string> = {
    manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    seller: 'bg-blue-100 text-blue-700 border-blue-200',
    tenant: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Cổng quản trị</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#151515]">Hồ sơ & Bảo mật</h1>
        <p className="mt-1 text-sm text-[#151515]/60">
          Quản lý thông tin cá nhân và bảo vệ tài khoản quản lý của bạn.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            {/* Profile Header */}
            <div className="flex flex-col items-center border-b border-[#151515]/10 bg-[#F5F5F0] px-6 py-8">
              {/* Avatar */}
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-[#FDE047] text-2xl font-bold text-[#151515]">
                  {user?.initials || '??'}
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-[2px] border-white bg-emerald-500">
                  <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Name */}
              <h2 className="mt-4 text-lg font-bold text-[#151515]">{user?.fullName || 'Không xác định'}</h2>
              
              {/* Role Badge */}
              <span className={`mt-2 rounded-full border px-3 py-1 text-xs font-semibold ${roleColors[user?.role || 'tenant']}`}>
                {user?.title || 'Người dùng'}
              </span>
            </div>
            
            {/* Profile Info */}
            <div className="divide-y divide-[#151515]/10 px-6 py-4">
              <div className="flex items-center gap-3 py-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#151515]/5">
                  <svg className="size-4 text-[#151515]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#151515]/40">Số điện thoại</p>
                  <p className="text-sm font-medium text-[#151515]">{user?.phone || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 py-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#151515]/5">
                  <svg className="size-4 text-[#151515]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#151515]/40">Email</p>
                  <p className="text-sm font-medium text-[#151515]">{user?.email || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 py-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#151515]/5">
                  <svg className="size-4 text-[#151515]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#151515]/40">Trạng thái</p>
                  <p className="text-sm font-medium text-emerald-600">Đang hoạt động</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal Information */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin cá nhân</h3>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Họ và tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 text-sm font-medium transition focus:border-[#FDE047] focus:outline-none focus:ring-2 focus:ring-[#FDE047]/20"
                    placeholder="Nhập họ và tên"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Số điện thoại</label>
                  <input
                    type="text"
                    value={user?.phone || ''}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-4 py-2.5 text-sm font-medium text-[#151515]/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 text-sm font-medium transition focus:border-[#FDE047] focus:outline-none focus:ring-2 focus:ring-[#FDE047]/20"
                  placeholder="Nhập email"
                />
              </div>
              
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {saveError}
                </div>
              )}
              
              {saveSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                  Đã lưu thay đổi thành công!
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Bảo mật tài khoản</h3>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 pr-10 text-sm font-medium transition focus:border-[#FDE047] focus:outline-none focus:ring-2 focus:ring-[#FDE047]/20"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                  >
                    {showPasswords.current ? (
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 pr-10 text-sm font-medium transition focus:border-[#FDE047] focus:outline-none focus:ring-2 focus:ring-[#FDE047]/20"
                      placeholder="Ít nhất 6 ký tự"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                    >
                      {showPasswords.new ? (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#151515]/60">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 pr-10 text-sm font-medium transition focus:border-[#FDE047] focus:outline-none focus:ring-2 focus:ring-[#FDE047]/20"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                    >
                      {showPasswords.confirm ? (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600">
                  Đổi mật khẩu thành công!
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
                >
                  {changingPassword ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </div>
          </div>

          {/* Account Session */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Phiên đăng nhập</h3>
            </div>
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="size-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#151515]">Đang đăng nhập</p>
                  <p className="text-xs text-[#151515]/50">{user?.title || 'Người dùng'} · {user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="rounded-xl border-[2px] border-[#151515] bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* E-mail change confirmation */}
      {pendingEmail && (
        <EmailChangeOtpDialog
          pendingEmail={pendingEmail}
          resendAvailableIn={resendAvailableIn}
          onVerified={(newEmail) => {
            setPendingEmail(null)
            setEmail(newEmail)
            if (user) updateAccount(user.id, { email: newEmail })
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
          }}
          onCancel={() => {
            setPendingEmail(null)
            setEmail(user?.email || '')
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border-[2px] border-[#151515] bg-white shadow-[6px_6px_0_#151515]">
            <div className="flex items-center gap-3 border-b border-[#151515]/10 p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                <svg className="size-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#151515]">Xác nhận đăng xuất</h3>
                <p className="text-xs text-[#151515]/60">Bạn có chắc muốn đăng xuất?</p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[#F5F5F0]"
              >
                Hủy
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_#151515] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
