'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, Eye, EyeOff, KeyRound, Lock, MapPin, Phone, ShieldCheck, Smartphone, Star, User, Verified } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PublicHeader } from '@/components/shells'
import { useAuth } from '@/components/auth-provider'
import { DEMO_OTP, findAccountByPhone, ROLE_HOME, type Role } from '@/lib/auth'
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
  const { user, ready, loginById } = useAuth()
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
    document.body.style.overflow = 'hidden'
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

  const run = (fn: () => void) => {
    setError('')
    setLoading(true)
    setTimeout(() => { fn(); setLoading(false) }, 400)
  }

  const onLoginPassword = () => {
    run(() => {
      const acc = findAccountByPhone(phone)
      if (!acc) return setError('Không tìm thấy tài khoản với số điện thoại này.')
      if (acc.password !== password) return setError('Mật khẩu không đúng. Vui lòng thử lại.')
      loginById(acc.id)
    })
  }

  const onSendOtp = () => {
    if (!phone.trim()) return setError('Vui lòng nhập số điện thoại.')
    const acc = findAccountByPhone(phone)
    if (!acc) return setError('Số điện thoại chưa được đăng ký.')
    setError('')
    setOtpSent(true)
    setSeconds(60)
    setOtp('')
  }

  const onLoginOtp = () => {
    run(() => {
      const acc = findAccountByPhone(phone)
      if (!acc) return setError('Số điện thoại chưa được đăng ký.')
      if (otp !== DEMO_OTP) return setError('Mã OTP không đúng. Vui lòng thử lại.')
      loginById(acc.id)
    })
  }

  return (
    <div>
      <PublicHeader />
      <div className="flex min-h-[calc(100vh-68px)]">

        {/* ── LEFT: Branding ── */}
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-10 py-12 lg:px-16 relative overflow-hidden">

          {/* Orb glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-emerald-200/60 blur-[120px]" />
            <div className="absolute bottom-0 -left-32 size-[400px] rounded-full bg-teal-200/50 blur-[100px]" />
          </div>

          <div className="relative max-w-md">

            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
              <ShieldCheck className="size-4" />
              Kiểm định #1 Việt Nam
            </div>

            {/* Heading */}
            <h2 className="text-4xl font-bold leading-tight text-slate-900">
              Tìm phòng thật —<br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                thuê đúng người.
              </span>
            </h2>

            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
              Thiên Nhãn trú đồ kết nối người thuê với chủ trọ đã qua kiểm định, giúp hàng nghìn sinh viên và người đi làm thuê đúng phòng, đúng giá.
            </p>

            {/* SVG Illustration */}
            <div className="mt-8 flex items-center justify-center">
              <svg width="340" height="220" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Building */}
                <rect x="60" y="60" width="100" height="140" rx="8" fill="white" stroke="#a7f3d0" strokeWidth="1.5"/>
                {/* Windows row 1 */}
                <rect x="72" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.8"/>
                <rect x="100" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.6"/>
                <rect x="128" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.9"/>
                {/* Windows row 2 */}
                <rect x="72" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="0.7"/>
                <rect x="100" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="1"/>
                <rect x="128" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="0.5"/>
                {/* Windows row 3 */}
                <rect x="72" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.9"/>
                <rect x="100" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.6"/>
                <rect x="128" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.8"/>
                {/* Door */}
                <rect x="92" y="164" width="36" height="36" rx="4" fill="white"/>
                <rect x="92" y="164" width="36" height="36" rx="4" stroke="#a7f3d0" strokeWidth="1.5"/>
                <circle cx="120" cy="182" r="2.5" fill="#10b981"/>
                {/* Roof */}
                <path d="M50 65 L110 30 L170 65" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round"/>
                {/* Decorative tree */}
                <ellipse cx="28" cy="160" rx="18" ry="22" fill="#10b981" opacity="0.7"/>
                <rect x="24" y="178" width="8" height="22" rx="3" fill="#065f46"/>
                {/* Flag */}
                <line x1="110" y1="30" x2="110" y2="15" stroke="#6ee7b7" strokeWidth="1.5"/>
                <path d="M110 15 L128 21 L110 27 Z" fill="#10b981"/>
                {/* Checkmarks floating */}
                <circle cx="250" cy="60" r="16" fill="#d1fae5" opacity="0.6"/>
                <circle cx="250" cy="60" r="16" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M243 60 L248 65 L258 54" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                {/* User avatar */}
                <circle cx="250" cy="110" r="20" fill="#d1fae5" opacity="0.6"/>
                <circle cx="250" cy="110" r="20" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <circle cx="250" cy="104" r="6" fill="#059669" opacity="0.9"/>
                <path d="M238 118 Q250 112 262 118" stroke="#059669" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9"/>
                {/* Verified badge */}
                <circle cx="268" cy="108" r="10" fill="#d1fae5" opacity="0.7"/>
                <circle cx="268" cy="108" r="10" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M264 108 L266.5 111 L272.5 104.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Map pin */}
                <circle cx="260" cy="165" r="14" fill="#d1fae5" opacity="0.6"/>
                <circle cx="260" cy="165" r="14" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M260 157 C263.3 157 266 159.7 266 163 C266 167.4 260 175 260 175 C260 175 254 167.4 254 163 C254 159.7 256.7 157 260 157Z" fill="#10b981" opacity="0.6"/>
                <circle cx="260" cy="163" r="3" fill="#059669" opacity="0.9"/>
                {/* Connection lines */}
                <path d="M170 110 Q200 90 230 110" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
                <path d="M170 130 Q200 145 240 155" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
                {/* Dots */}
                <circle cx="200" cy="100" r="3" fill="#10b981" opacity="0.5"/>
                <circle cx="220" cy="120" r="3" fill="#10b981" opacity="0.5"/>
                <circle cx="185" cy="140" r="3" fill="#10b981" opacity="0.5"/>
                <circle cx="210" cy="145" r="3" fill="#10b981" opacity="0.5"/>
              </svg>
            </div>

            {/* Highlights */}
            <div className="mt-6 flex flex-col gap-3">
              {highlights.map((h) => (
                <div key={h.label} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white/80 p-3.5 shadow-sm backdrop-blur-sm">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                    <h.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{h.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{h.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="mt-6 rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="mb-1.5 flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}
              </div>
              <p className="text-xs italic text-slate-600">"Mình từng bị lừa 2 lần. Qua Thiên Nhãn trú đồ, Manager kiểm tra tận nơi, yên tâm hẳn."</p>
              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <User className="size-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Nguyễn Thảo</p>
                  <p className="text-xs text-slate-500">SV năm 3, ĐH Bách Khoa TP.HCM</p>
                </div>
              </div>
            </div>

            {/* CTA bottom */}
            <div className="mt-6 flex items-center gap-2">
              <Link href="/ve-verirent" className="text-xs text-slate-500 hover:text-emerald-600 transition-colors">
                Tìm hiểu thêm về Thiên Nhãn trú đồ
              </Link>
              <ArrowRight className="size-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form white ── */}
        <div className="flex flex-1 flex-col justify-center bg-white px-10 py-12 lg:px-16">
          <div className="mx-auto w-full max-w-sm">

            {/* Logo + Badge */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                <ShieldCheck className="size-4" />
                Thiên Nhãn trú đồ
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">Chào mừng bạn trở lại</h1>
              <p className="mt-1.5 text-sm text-slate-500">Đăng nhập để tìm phòng, quản lý tin hoặc hẹn xem phòng.</p>
            </div>

            {/* Card */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-7">

                {/* Method tabs */}
                <div className="mb-6 grid grid-cols-2 gap-2">
                  {methodTabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => { setMethod(tab.id); setError(''); setOtpSent(false) }}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                          method === tab.id
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        <Icon className="size-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* ── PASSWORD ── */}
                {method === 'password' && (
                  <div className="grid gap-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && onLoginPassword()}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="Nhập số điện thoại..."
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && onLoginPassword()}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="Nhập mật khẩu..."
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <Link href="/quen-mat-khau" className="font-medium text-emerald-700 hover:underline">
                        Quên mật khẩu?
                      </Link>
                      <Link href="/dang-ky" className="font-medium text-slate-500 hover:text-emerald-700">
                        Tạo tài khoản →
                      </Link>
                    </div>

                    <Button
                      className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                      onClick={onLoginPassword}
                      disabled={loading}
                    >
                      {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                      {!loading && <ArrowRight className="ml-2 size-5" />}
                    </Button>
                  </div>
                )}

                {/* ── OTP ── */}
                {method === 'otp' && (
                  <div className="grid gap-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="Nhập số điện thoại..."
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {otpSent && (
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mã OTP <span className="font-normal text-slate-400">(demo: 123456)</span></label>
                        <div className="relative">
                          <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onLoginOtp()}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Nhập mã OTP..."
                            maxLength={6}
                          />
                        </div>
                        {seconds > 0 && (
                          <p className="mt-1.5 text-xs text-slate-400">Gửi lại mã sau {seconds}s</p>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(''); setError('') }}
                        className="font-medium text-slate-500 hover:text-emerald-700"
                      >
                        ← Đổi số điện thoại
                      </button>
                      <Link href="/dang-ky" className="font-medium text-slate-500 hover:text-emerald-700">
                        Tạo tài khoản →
                      </Link>
                    </div>

                    {!otpSent ? (
                      <Button
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                        onClick={onSendOtp}
                        disabled={!phone.trim()}
                      >
                        Gửi mã OTP
                      </Button>
                    ) : (
                      <Button
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                        onClick={onLoginOtp}
                        disabled={loading || otp.length < 6}
                      >
                        {loading ? 'Đang đăng nhập...' : 'Xác minh & Đăng nhập'}
                        {!loading && <ArrowRight className="ml-2 size-5" />}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="size-3.5" />
              Thiên Nhãn trú đồ xác thực SĐT để chống tài khoản ảo.
            </p>
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
