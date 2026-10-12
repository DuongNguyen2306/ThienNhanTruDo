'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, KeyRound, Lock, MapPin, Phone, ShieldCheck, Smartphone, Star, User } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { useAuth } from '@/components/auth-provider'
import { ROLE_HOME } from '@/lib/auth'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Method = 'password' | 'otp'

const methodTabs = [
  { id: 'password' as Method, label: 'ĐT + Mật khẩu', icon: KeyRound },
  { id: 'otp' as Method, label: 'OTP', icon: Smartphone },
]

const highlights = [
  { icon: ShieldCheck, label: 'Cam kết hoàn cọc 100%', detail: 'Nếu thông tin phòng khác thực tế' },
  { icon: BadgeCheck, label: 'Manager kiểm định từng tin', detail: 'Địa chỉ, giá, ảnh đều đối soát' },
  { icon: CheckCircle2, label: 'Thanh toán an toàn qua VNPay', detail: 'Không chuyển tiền trực tiếp cho chủ nhà' },
]

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, ready, login } = useAuth()
  const [method, setMethod] = useState<Method>('password')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [seconds, setSeconds] = useState(60)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const next = params.get('next') || ''

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!user) return
    const home = ROLE_HOME[user.role] ?? '/'
    router.replace(next || home)
  }, [ready, user, router, next])

  useEffect(() => {
    if (method !== 'otp') return
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [method, seconds])

  const onLoginPassword = async () => {
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại.')
    if (!password) return setError('Vui lòng nhập mật khẩu.')
    
    setError('')
    setLoading(true)
    
    try {
      const { user: apiUser, token } = await authApi.login(phone.replace(/\s/g, ''), password)
      localStorage.setItem('token', token)
      const sessionUser: import('@/lib/auth').SessionUser = {
        id: apiUser.id,
        role: apiUser.role,
        fullName: apiUser.fullName,
        name: apiUser.name,
        email: apiUser.email,
        phone: apiUser.phone,
        initials: apiUser.initials,
        title: apiUser.title,
        sellerStatus: apiUser.sellerStatus ?? 'none',
        sellerProfile: apiUser.sellerProfile,
      }
      login(sessionUser)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const onSendOtp = async () => {
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại.')
    
    setError('')
    setLoading(true)
    
    try {
      await authApi.sendOtp(phone.replace(/\s/g, ''))
      setOtpSent(true)
      setSeconds(60)
      setOtp('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể gửi OTP. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const onLoginOtp = async () => {
    if (!otp.trim()) return setError('Vui lòng nhập mã OTP.')
    
    setError('')
    setLoading(true)
    
    try {
      const { user: apiUser, token } = await authApi.verifyOtp(phone.replace(/\s/g, ''), otp)
      localStorage.setItem('token', token)
      const sessionUser: import('@/lib/auth').SessionUser = {
        id: apiUser.id,
        role: apiUser.role,
        fullName: apiUser.fullName,
        name: apiUser.name,
        email: apiUser.email,
        phone: apiUser.phone,
        initials: apiUser.initials,
        title: apiUser.title,
        sellerStatus: apiUser.sellerStatus ?? 'none',
        sellerProfile: apiUser.sellerProfile,
      }
      login(sessionUser)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Mã OTP không đúng.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />
      
      {/* Main Content Grid */}
      <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[58%_42%]">
        
        {/* ── LEFT: Login Form ── */}
        <div className="flex justify-center bg-white px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">
            
            {/* Header */}
            <div className="mb-6">
              <h1 
                className="text-2xl font-black text-[#151515] lg:text-3xl" 
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                ĐĂNG NHẬP
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                Chào mừng bạn trở lại. Đăng nhập để tiếp tục.
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-5 shadow-[5px_5px_0_#151515]">
              
              {/* Method Tabs */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                {methodTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setMethod(tab.id); setError(''); setOtpSent(false) }}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] px-3 py-2.5 text-sm font-bold transition-all',
                        method === tab.id
                          ? 'bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515] -translate-x-[1px] -translate-y-[1px] hover:shadow-[3px_3px_0_#151515]'
                          : 'bg-white text-[#151515]/70 shadow-[2px_2px_0_#151515] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]',
                      )}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* ── PASSWORD METHOD ── */}
              {method === 'password' && (
                <div className="grid gap-4">
                  
                  {/* Phone Field */}
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
                        onKeyDown={(e) => e.key === 'Enter' && onLoginPassword()}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="Nhập số điện thoại..."
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
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
                        onKeyDown={(e) => e.key === 'Enter' && onLoginPassword()}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-12 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="Nhập mật khẩu..."
                        autoComplete="current-password"
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

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <span className="text-sm text-red-500">⚠️</span>
                      <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center justify-between text-sm">
                    <Link 
                      href="/quen-mat-khau" 
                      className="font-bold text-[#151515] hover:text-[#059669] hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                    <Link 
                      href="/dang-ky" 
                      className="font-bold text-[#059669] hover:underline"
                    >
                      Đăng ký →
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={onLoginPassword}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── OTP METHOD ── */}
              {method === 'otp' && (
                <div className="grid gap-4">
                  
                  {/* Phone Field */}
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
                        disabled={otpSent}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 disabled:bg-[#F5F5F0] disabled:text-[#151515]/70"
                        placeholder="Nhập số điện thoại..."
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* OTP Input - 6 Digit Boxes */}
                  {otpSent && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                        Mã xác minh
                      </label>
                      <div className="flex gap-2">
                        {[...Array(6)].map((_, i) => (
                          <input
                            key={i}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otp[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '')[0] || ''
                              const newOtp = otp.split('')
                              newOtp[i] = val
                              const updated = newOtp.join('')
                              setOtp(updated)
                              // Auto focus next
                              if (val && i < 5) {
                                const inputs = document.querySelectorAll('.otp-input')
                                const next = inputs[i + 1] as HTMLInputElement
                                next?.focus()
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !otp[i] && i > 0) {
                                const inputs = document.querySelectorAll('.otp-input')
                                const prev = inputs[i - 1] as HTMLInputElement
                                prev?.focus()
                              }
                            }}
                            className="otp-input h-14 w-full max-w-[52px] rounded-xl border-[2px] border-[#151515] bg-white text-center text-xl font-bold shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                          />
                        ))}
                      </div>
                      
                      {/* Resend Timer */}
                      <div className="mt-3 flex items-center justify-between">
                        {seconds > 0 ? (
                          <p className="text-sm text-[#151515]/60">
                            Gửi lại mã sau <span className="font-bold text-[#151515]">{seconds}s</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={onSendOtp}
                            disabled={loading}
                            className="text-sm font-bold text-[#059669] hover:underline disabled:opacity-50"
                          >
                            Gửi lại mã OTP
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <span className="text-sm text-red-500">⚠️</span>
                      <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); setError('') }}
                      className="font-bold text-[#151515]/70 hover:text-[#151515]"
                    >
                      ← Đổi số điện thoại
                    </button>
                    <Link 
                      href="/dang-ky" 
                      className="font-bold text-[#059669] hover:underline"
                    >
                      Đăng ký →
                    </Link>
                  </div>

                  {/* Submit Button */}
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={onSendOtp}
                      disabled={loading || !phone.trim()}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          Gửi mã OTP
                          <ArrowRight className="size-5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onLoginOtp}
                      disabled={loading || otp.length < 6}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                          Đang xác minh...
                        </>
                      ) : (
                        <>
                          Xác minh & Đăng nhập
                          <ArrowRight className="size-5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Note */}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#151515]/50">
              <ShieldCheck className="size-3.5 text-[#059669]" />
              THIÊN DỮ TRÚ ĐỒ xác thực SĐT để chống tài khoản ảo.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Branding Panel ── */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">
            
            {/* Heading */}
            <h2 
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl" 
              style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
              Tìm phòng thật — thuê đúng người.
            </h2>

            {/* Logo Badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              <ShieldCheck className="size-5" />
              THIÊN DỮ TRÚ ĐỒ
            </div>

            {/* Description */}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Thiên Dữ Trú Đồ kết nối người thuê với chủ trọ đã qua kiểm định, giúp hàng nghìn sinh viên và người đi làm thuê đúng phòng, đúng giá.
            </p>

            {/* Illustration - Larger */}
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
                  <User className="size-6 text-[#151515]" />
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
