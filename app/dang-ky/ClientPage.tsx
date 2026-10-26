'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, User as UserIcon } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { useAuth } from '@/components/auth-provider'
import { authApi, ApiError } from '@/lib/api'

const highlights = [
  { icon: ShieldCheck, label: 'Cam kết hoàn cọc 100%', detail: 'Nếu thông tin phòng khác thực tế' },
  { icon: BadgeCheck, label: 'Manager kiểm định từng tin', detail: 'Địa chỉ, giá, ảnh đều đối soát' },
  { icon: CheckCircle2, label: 'Thanh toán an toàn qua VNPay', detail: 'Không chuyển tiền trực tiếp cho chủ nhà' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Task 7: e-mail verification step ────────────────────────────────
  const [stage, setStage] = useState<'form' | 'otp'>('form')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpNotice, setOtpNotice] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const validateForm = () => {
    if (!fullName.trim()) return 'Vui lòng nhập họ tên'
    if (!phone.trim() || phone.replace(/\s/g, '').length < 9) return 'Số điện thoại không hợp lệ'
    if (!email.trim()) return 'Vui lòng nhập email để nhận mã xác thực'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email không hợp lệ'
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa và số'
    }
    if (password !== confirm) return 'Mật khẩu xác nhận không khớp'

    return null
  }

  const onSubmit = async () => {
    const validationError = validateForm()
    if (validationError) return setError(validationError)

    setError('')
    setLoading(true)

    try {
      // The backend creates the account UNVERIFIED and emails a 6-digit OTP.
      // No token is issued until the e-mail is proven.
      await authApi.register({
        fullName: fullName.trim(),
        phone: phone.replace(/\s/g, ''),
        email: email.trim(),
        password,
      })

      // Move to the OTP step. The code itself only ever arrives by e-mail.
      setStage('otp')
      setOtp('')
      setOtpError('')
      setOtpNotice('Mã xác thực đã được gửi tới email của bạn.')
      setResendIn(60)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Task 7: verify the e-mail OTP ───────────────────────────────────
  const onVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError('Mã xác thực phải gồm đúng 6 chữ số.')
      return
    }

    setOtpError('')
    setOtpLoading(true)

    try {
      const { user: apiUser, token } = await authApi.verifyEmail({
        email: email.trim(),
        otp,
      })

      localStorage.setItem('token', token)

      const sessionUser: import('@/lib/auth').SessionUser = {
        id: apiUser.id,
        role: apiUser.role,
        fullName: apiUser.fullName,
        name: apiUser.fullName,
        email: apiUser.email,
        phone: apiUser.phone,
        initials: apiUser.initials,
        title: apiUser.title,
        sellerStatus: apiUser.sellerStatus ?? 'none',
        sellerProfile: apiUser.sellerProfile ? {
          ...apiUser.sellerProfile,
          idNumber: apiUser.sellerProfile.idNumber ?? '',
        } : undefined,
      }

      login(sessionUser)
      router.push('/dang-nhap?verified=1')
    } catch (err) {
      if (err instanceof ApiError) {
        setOtpError(err.message)
      } else {
        setOtpError('Xác thực thất bại. Vui lòng thử lại.')
      }
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Resend the OTP (with client-side cooldown mirror) ────────────────
  const onResend = async () => {
    if (resendIn > 0) return
    setResendLoading(true)
    setOtpError('')
    try {
      const res = await authApi.resendVerification({ email: email.trim() })
      setOtpNotice(res.message || 'Đã gửi lại mã xác thực.')
      setResendIn(res.resendAvailableIn || 60)
    } catch (err) {
      if (err instanceof ApiError) {
        setOtpError(err.message)
      } else {
        setOtpError('Không thể gửi lại mã. Vui lòng thử lại.')
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      {/* Main Content Grid */}
      <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[58%_42%]">

        {/* ── LEFT: Register Form ── */}
        <div className="flex justify-center bg-white px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="mb-6">
              <h1
                className="text-2xl font-black text-[#151515] lg:text-3xl"
                
              >
                {stage === 'otp' ? 'XÁC THỰC EMAIL' : 'TẠO TÀI KHOẢN'}
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                {stage === 'otp'
                  ? 'Nhập mã 6 chữ số được gửi tới email của bạn.'
                  : 'Điền thông tin để tạo tài khoản người thuê.'}
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-6 shadow-[5px_5px_0_#151515]">

              {stage === 'otp' ? (
                /* ── Task 7: e-mail verification step ────────────────────── */
                <div className="space-y-4">
                  <div className="flex items-start gap-2 rounded-xl border-[2px] border-[#FDE047] bg-[#FDE047]/20 p-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#151515]" />
                    <p className="text-sm font-medium text-[#151515]/75">
                      Mã xác thực đã được gửi tới <b>{email.trim()}</b>. Mã có hiệu lực
                      trong 10 phút và chỉ dùng được một lần.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Mã xác thực
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && onVerifyOtp()}
                      placeholder="000000"
                      className="h-14 w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-[#151515] shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                    />
                  </div>

                  {otpNotice ? (
                    <p className="text-sm font-medium text-emerald-700">{otpNotice}</p>
                  ) : null}

                  {otpError ? (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <span className="text-sm text-red-500">⚠️</span>
                      <p className="text-sm font-medium text-red-600">{otpError}</p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={onVerifyOtp}
                    disabled={otpLoading || otp.length !== 6}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang xác thực...
                      </>
                    ) : (
                      <>
                        Xác thực &amp; hoàn tất
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStage('form')
                        setOtp('')
                        setOtpError('')
                      }}
                      className="font-bold text-[#151515]/60 hover:text-[#151515]"
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={resendIn > 0 || resendLoading}
                      className="font-bold text-[#059669] disabled:cursor-not-allowed disabled:text-[#151515]/35 disabled:no-underline hover:underline"
                    >
                      {resendIn > 0
                        ? `Gửi lại sau ${resendIn}s`
                        : resendLoading
                          ? 'Đang gửi...'
                          : 'Gửi lại mã'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {/* Form Fields */}
              <div className="grid gap-4">

                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="VD: Nguyễn Văn A"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="0xxx xxx xxx"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-12 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#151515]/40 transition-colors hover:text-[#151515]"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                      className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-12 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="Nhập lại mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#151515]/40 transition-colors hover:text-[#151515]"
                      aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                    <span className="text-sm text-red-500">⚠️</span>
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                      Đang đăng ký...
                    </>
                  ) : (
                    <>
                      Tạo tài khoản
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </button>

                {/* Login Link */}
                <p className="text-center text-sm text-[#151515]/60">
                  Đã có tài khoản?{' '}
                  <Link href="/dang-nhap" className="font-bold text-[#059669] hover:underline">
                    Đăng nhập
                  </Link>
                </p>
              </div>
                </>
              )}
            </div>

            {/* Footer Note */}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#151515]/50">
              <ShieldCheck className="size-3.5 text-[#059669]" />
              THIÊN NHÃN TRÚ ĐỒ xác thực email để chống tài khoản ảo.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Branding Panel ── */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">

            {/* Heading */}
            <h2
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl"
              
            >
              Tìm phòng thật — thuê đúng người.
            </h2>

            {/* Logo Badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" >
              <ShieldCheck className="size-5" />
              THIÊN NHÃN TRÚ ĐỒ
            </div>

            {/* Description */}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Thiên Nhãn Trú Đồ kết nối người thuê với chủ trọ đã qua kiểm định, giúp hàng nghìn sinh viên và người đi làm thuê đúng phòng, đúng giá.
            </p>

            {/* Illustration */}
            <div className="mt-8 flex items-center justify-start">
              <div className="relative">
                {/* Main Building */}
                <div className="relative rounded-2xl border-[3px] border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className="size-6 rounded-lg border-[2px] border-[#151515] bg-[#FDE047]"
                      />
                    ))}
                  </div>
                  <div className="mt-3 h-12 rounded-lg border-[2px] border-[#151515] bg-[#059669]" />
                </div>

                {/* Floating Icons */}
                <div className="absolute -right-6 -top-3 rounded-xl border-[2px] border-[#151515] bg-white p-3 shadow-[4px_4px_0_#151515]">
                  <CheckCircle2 className="size-6 text-[#059669]" />
                </div>
                <div className="absolute -left-5 bottom-4 rounded-xl border-[2px] border-[#151515] bg-white p-2 shadow-[4px_4px_0_#151515]">
                  <UserIcon className="size-6 text-[#151515]" />
                </div>
                <div className="absolute -right-4 -bottom-5 rounded-xl border-[2px] border-[#151515] bg-white p-2 shadow-[4px_4px_0_#151515]">
                  <MapPin className="size-6 text-[#059669]" />
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-8 flex flex-col gap-3">
              {highlights.map((h, i) => {
                const Icon = h.icon
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#151515]">{h.label}</p>
                      <p className="mt-0.5 text-xs text-[#151515]/60">{h.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
