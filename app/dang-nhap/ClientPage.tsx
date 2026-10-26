'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, Lock, MapPin, ShieldCheck, Star, User, UserRound } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { useAuth } from '@/components/auth-provider'
import { ROLE_HOME, ROLE_PREFIX, DEMO_ACCOUNTS, toSession, type Role } from '@/lib/auth'
import { authApi, ApiError } from '@/lib/api'

/** Kiểm tra next URL có an toàn và user có quyền truy cập không */
function isAllowedNext(next: string, role: Role): boolean {
  if (!next) return false
  if (!next.startsWith('/')) return false
  if (next.startsWith('//') || next.includes('://')) return false
  const allowed = ROLE_PREFIX[role]
  return allowed.some((prefix) => next === prefix || next.startsWith(prefix + '/'))
}

/** Redirect sau đăng nhập thành công - export để tái sử dụng */
export function getRedirectUrl(sessionUser: { role: Role; sellerStatus?: string }, next: string): string {
  if (next && isAllowedNext(next, sessionUser.role)) {
    return next
  }
  if (sessionUser.role === 'seller' && sessionUser.sellerStatus === 'pending') {
    return '/seller/profile/verification'
  }
  return ROLE_HOME[sessionUser.role] ?? '/'
}

const highlights = [
  { icon: ShieldCheck, label: 'Cam kết hoàn cọc 100%', detail: 'Nếu thông tin phòng khác thực tế' },
  { icon: BadgeCheck, label: 'Manager kiểm định từng tin', detail: 'Địa chỉ, giá, ảnh đều đối soát' },
  { icon: CheckCircle2, label: 'Thanh toán an toàn qua VNPay', detail: 'Không chuyển tiền trực tiếp cho chủ nhà' },
]

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, ready, login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const next = params.get('next') || ''

  // Resend cooldown countdown (mirrors the backend cooldown).
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!user) return
    if (pathname !== '/dang-nhap') return
    if (redirecting) return
    const dest = getRedirectUrl(user, next)
    if (window.location.pathname === dest) return
    setRedirecting(true)
    router.replace(dest)
  }, [ready, user, next, pathname, router, redirecting])

  const onLogin = async () => {
    const clean = identifier.trim()
    if (!clean) return setError('Vui lòng nhập số điện thoại hoặc email.')
    if (!password) return setError('Vui lòng nhập mật khẩu.')

    setError('')
    setLoading(true)

    try {
      const { user: apiUser, token } = await authApi.login(clean, password)
      localStorage.setItem('token', token)
      const sessionUser = {
        id: apiUser.id,
        role: apiUser.role,
        fullName: apiUser.fullName,
        name: apiUser.fullName,
        email: apiUser.email,
        phone: apiUser.phone,
        initials: apiUser.initials,
        title: apiUser.title,
        sellerStatus: apiUser.sellerStatus ?? 'none',
        sellerProfile: apiUser.sellerProfile,
      }
      setLoading(false)
      login(sessionUser)
      const dest = getRedirectUrl(sessionUser, next)
      router.replace(dest)
    } catch (err) {
      setLoading(false)
      if (err instanceof Error && 'status' in err) {
        const apiErr = err as {
          status: number
          data?: {
            retryAfter?: number
            error?: string
            code?: string
            requiresVerification?: boolean
            email?: string
          }
        }

        if (apiErr.status === 429) {
          const retryAfter = apiErr.data?.retryAfter ?? 900
          setError(`Quá nhiều lần đăng nhập. Vui lòng chờ ${retryAfter} giây.`)
          return
        }

        if (apiErr.status === 408) {
          setError('Yêu cầu hết thời gian. Vui lòng thử lại.')
          return
        }

        // ── Task 7: the account exists but the e-mail is not proven yet ──
        if (apiErr.status === 403 && apiErr.data?.requiresVerification) {
          setPendingEmail(apiErr.data.email ?? '')
          setError(
            apiErr.data.error || 'Vui lòng xác thực email trước khi đăng nhập.'
          )
          return
        }
      }

      setError('Số điện thoại/email hoặc mật khẩu không chính xác.')
    }
  }

  // ── Task 7: re-send the verification OTP for an unverified account ────
  const onResendVerification = async () => {
    if (!pendingEmail || resendIn > 0 || resendLoading) return
    setResendLoading(true)
    try {
      const res = await authApi.resendVerification({ email: pendingEmail })
      if (res.alreadyVerified) {
        setPendingEmail('')
        setError('Email đã được xác thực. Vui lòng đăng nhập.')
      } else {
        setError(res.message || 'Đã gửi lại mã xác thực.')
        setResendIn(res.resendAvailableIn || 60)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi lại mã. Vui lòng thử lại.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />
      
      <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[58%_42%]">
        
        {/* LEFT: Login Form */}
        <div className="flex justify-center bg-white px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">
            
            <div className="mb-6">
              <h1 
                className="text-2xl font-black text-[#151515] lg:text-3xl" 
                
              >
                ĐĂNG NHẬP
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                Chào mừng bạn trở lại. Đăng nhập để tiếp tục.
              </p>
            </div>

            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-5 shadow-[5px_5px_0_#151515]">
              
              {/* Identifier Field — phone number OR e-mail address */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                  Số điện thoại hoặc Email
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                    className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                    placeholder="Nhập số điện thoại hoặc email"
                    autoComplete="username"
                    inputMode="text"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onLogin()}
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
                <div className="mb-4 flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                  <span className="text-sm text-red-500">⚠️</span>
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              {/* ── Task 7: unverified account gate ───────────────────────── */}
              {pendingEmail && (
                <div className="mb-4 rounded-xl border-[2px] border-[#FDE047] bg-[#FDE047]/20 p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#151515]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#151515]">
                        Chưa xác thực email
                      </p>
                      <p className="mt-1 text-sm text-[#151515]/70">
                        Tài khoản <b className="break-all">{pendingEmail}</b> chưa được
                        xác thực. Vui lòng nhập mã 6 chữ số đã gửi tới email để tiếp tục.
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Link
                          href={`/xac-thuc-email?email=${encodeURIComponent(pendingEmail)}`}
                          className="inline-flex h-9 items-center rounded-lg border-[2px] border-[#151515] bg-white px-3 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          Nhập mã xác thực
                        </Link>
                        <button
                          type="button"
                          onClick={onResendVerification}
                          disabled={resendIn > 0 || resendLoading}
                          className="text-sm font-bold text-[#059669] disabled:cursor-not-allowed disabled:text-[#151515]/35 hover:underline"
                        >
                          {resendIn > 0
                            ? `Gửi lại sau ${resendIn}s`
                            : resendLoading
                              ? 'Đang gửi...'
                              : 'Gửi lại mã'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="mb-4 flex items-center justify-between text-sm">
                <Link
                  href="/quen-mat-khau"
                  className="font-bold text-[#059669] hover:underline"
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
                onClick={onLogin}
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

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#151515]/50">
              <ShieldCheck className="size-3.5 text-[#059669]" />
              THIÊN NHÃN TRÚ ĐỒ — Hệ thống xác thực bảo mật.
            </p>
          </div>
        </div>

        {/* RIGHT: Branding Panel */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">
            
            <h2 
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl" 
              
            >
              Tìm phòng thật — thuê đúng người.
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" >
              <ShieldCheck className="size-5" />
              THIÊN NHÃN TRÚ ĐỒ
            </div>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Thiên Nhãn Trú Đồ kết nối người thuê với chủ trọ đã qua kiểm định, giúp hàng nghìn sinh viên và người đi làm thuê đúng phòng, đúng giá.
            </p>

            <div className="mt-8 flex items-center justify-start">
              <div className="relative">
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
