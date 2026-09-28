'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, ChevronLeft, Eye, EyeOff, Home, MapPin, ShieldCheck, Smartphone, Star, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PublicHeader } from '@/components/shells'
import { useAuth } from '@/components/auth-provider'
import { DEMO_OTP, ROLE_HOME } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Purpose = 'tenant' | 'seller'

const highlights = [
  { icon: ShieldCheck, label: 'Cam kết hoàn cọc 100%', detail: 'Nếu thông tin phòng khác thực tế' },
  { icon: BadgeCheck, label: 'Manager kiểm định từng tin', detail: 'Địa chỉ, giá, ảnh đều đối soát' },
  { icon: CheckCircle2, label: 'Thanh toán an toàn qua VNPay', detail: 'Không chuyển tiền trực tiếp cho chủ nhà' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginById, updateAccount } = useAuth()
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<Purpose>('tenant')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [idNumber, setIdNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [address, setAddress] = useState('')
  const [cccdFront, setCccdFront] = useState(false)
  const [cccdBack, setCccdBack] = useState(false)
  const [houseDoc, setHouseDoc] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isSeller = purpose === 'seller'

  const onSubmitForm = () => {
    setError('')
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên')
    if (phone.replace(/\s/g, '').length < 9) return setError('Số điện thoại không hợp lệ')
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Mật khẩu tối thiểu 8 ký tự, có chữ hoa và số')
    }
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp')
    setStep(1)
    setSeconds(60)
  }

  const onSendOtpAgain = () => {
    setOtp('')
    setSeconds(60)
  }

  const onSubmitOtp = () => {
    if (otp !== DEMO_OTP) return setError('Mã OTP không đúng. Vui lòng thử lại.')
    const result = register({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${phone.replace(/\s/g, '')}@thiennhan.vn`,
      password,
      role: purpose,
    })
    if (!result.ok) return setError(result.error)
    setPendingId(result.account.id)
    if (purpose === 'seller') {
      setStep(2)
    } else {
      loginById(result.account.id)
      setStep(3)
    }
  }

  const onSubmitSellerStep2 = () => {
    if (!pendingId) return
    if (!idNumber.trim()) return setError('Vui lòng nhập số CCCD/Hộ chiếu')
    if (!address.trim()) return setError('Vui lòng nhập địa chỉ thường trú')
    if (!cccdFront || !cccdBack) return setError('Cần tải ảnh CCCD mặt trước và mặt sau')
    loginById(pendingId)
    updateAccount(pendingId, {
      sellerStatus: 'pending',
      sellerProfile: {
        idNumber,
        brand: brand.trim() || undefined,
        address,
        docs: [
          cccdFront ? 'cccd-front.jpg' : null,
          cccdBack ? 'cccd-back.jpg' : null,
          houseDoc ? 'giay-to-nha.pdf' : null,
        ].filter(Boolean) as string[],
        submittedAt: new Date().toISOString().slice(0, 10),
      },
    })
    setStep(3)
  }

  const onGoToPortal = () => {
    if (purpose === 'seller') {
      router.push('/tai-khoan/nang-cap')
    } else {
      router.push(ROLE_HOME.tenant)
    }
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
              Thuê phòng thật —<br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                an tâm từ đầu.
              </span>
            </h2>

            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
              Thiên Nhãn trú đồ kết nối người thuê với chủ trọ đã qua kiểm định, giúp hàng nghìn sinh viên và người đi làm thuê đúng phòng, đúng giá.
            </p>

            {/* SVG Illustration */}
            <div className="mt-8 flex items-center justify-center">
              <svg width="340" height="220" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="60" y="60" width="100" height="140" rx="8" fill="white" stroke="#a7f3d0" strokeWidth="1.5"/>
                <rect x="72" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.8"/>
                <rect x="100" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.6"/>
                <rect x="128" y="74" width="20" height="16" rx="3" fill="#10b981" opacity="0.9"/>
                <rect x="72" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="0.7"/>
                <rect x="100" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="1"/>
                <rect x="128" y="102" width="20" height="16" rx="3" fill="#10b981" opacity="0.5"/>
                <rect x="72" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.9"/>
                <rect x="100" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.6"/>
                <rect x="128" y="130" width="20" height="16" rx="3" fill="#10b981" opacity="0.8"/>
                <rect x="92" y="164" width="36" height="36" rx="4" fill="white"/>
                <rect x="92" y="164" width="36" height="36" rx="4" stroke="#a7f3d0" strokeWidth="1.5"/>
                <circle cx="120" cy="182" r="2.5" fill="#10b981"/>
                <path d="M50 65 L110 30 L170 65" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round"/>
                <ellipse cx="28" cy="160" rx="18" ry="22" fill="#10b981" opacity="0.7"/>
                <rect x="24" y="178" width="8" height="22" rx="3" fill="#065f46"/>
                <line x1="110" y1="30" x2="110" y2="15" stroke="#6ee7b7" strokeWidth="1.5"/>
                <path d="M110 15 L128 21 L110 27 Z" fill="#10b981"/>
                <circle cx="250" cy="60" r="16" fill="#d1fae5" opacity="0.6"/>
                <circle cx="250" cy="60" r="16" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M243 60 L248 65 L258 54" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="250" cy="110" r="20" fill="#d1fae5" opacity="0.6"/>
                <circle cx="250" cy="110" r="20" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <circle cx="250" cy="104" r="6" fill="#059669" opacity="0.9"/>
                <path d="M238 118 Q250 112 262 118" stroke="#059669" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9"/>
                <circle cx="268" cy="108" r="10" fill="#d1fae5" opacity="0.7"/>
                <circle cx="268" cy="108" r="10" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M264 108 L266.5 111 L272.5 104.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="260" cy="165" r="14" fill="#d1fae5" opacity="0.6"/>
                <circle cx="260" cy="165" r="14" stroke="#10b981" strokeWidth="1.5" opacity="0.8"/>
                <path d="M260 157 C263.3 157 266 159.7 266 163 C266 167.4 260 175 260 175 C260 175 254 167.4 254 163 C254 159.7 256.7 157 260 157Z" fill="#10b981" opacity="0.6"/>
                <circle cx="260" cy="163" r="3" fill="#059669" opacity="0.9"/>
                <path d="M170 110 Q200 90 230 110" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
                <path d="M170 130 Q200 145 240 155" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
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
                  <UserIcon className="size-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Nguyễn Thảo</p>
                  <p className="text-xs text-slate-500">SV năm 3, ĐH Bách Khoa TP.HCM</p>
                </div>
              </div>
            </div>

            {/* CTA bottom */}
            <div className="mt-6 flex items-center gap-2">
              <Link href="/dang-nhap" className="text-xs text-slate-500 hover:text-emerald-600 transition-colors">
                Đã có tài khoản? Đăng nhập ngay
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
              <h1 className="mt-5 text-2xl font-bold text-slate-900">
                {step === 3 ? 'Đăng ký thành công!' : 'Tạo tài khoản mới'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {step === 0 && 'Chọn vai trò và điền thông tin để bắt đầu.'}
                {step === 1 && 'Chúng tôi đã gửi mã OTP đến số điện thoại của bạn.'}
                {step === 2 && 'Hoàn tất hồ sơ chủ trọ để được duyệt nhanh hơn.'}
                {step === 3 && 'Chào mừng bạn đến với Thiên Nhãn trú đồ!'}
              </p>
            </div>

            {/* Success state */}
            {step === 3 ? (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 p-7 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {purpose === 'seller' ? 'Hồ sơ đã được gửi!' : 'Tài khoản đã sẵn sàng!'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {purpose === 'seller'
                        ? 'Manager sẽ duyệt hồ sơ trong 24h. Bạn sẽ nhận thông báo qua email.'
                        : 'Khám phá hàng nghìn phòng trọ đã kiểm định ngay.'}
                    </p>
                  </div>
                  <Button
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                    onClick={onGoToPortal}
                  >
                    {purpose === 'seller' ? 'Xem trạng thái duyệt' : 'Khám phá phòng trọ'}
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-7">

                  {/* Step 0: Choose purpose */}
                  {step === 0 && (
                    <div className="grid gap-5">
                      <PurposeOption
                        active={purpose === 'tenant'}
                        onClick={() => setPurpose('tenant')}
                        icon={Home}
                        title="Tôi muốn thuê phòng"
                        desc="Tìm và đặt phòng trọ đã kiểm định"
                      />
                      <PurposeOption
                        active={purpose === 'seller'}
                        onClick={() => setPurpose('seller')}
                        icon={Building2}
                        title="Tôi là chủ trọ"
                        desc="Đăng tin và quản lý phòng trọ của tôi"
                      />

                      <div className="grid gap-4 pt-1">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Họ và tên</label>
                          <div className="relative">
                            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="VD: Nguyễn Văn A"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                          <div className="relative">
                            <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="0xxx xxx xxx"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email <span className="font-normal text-slate-400">(tuỳ chọn)</span></label>
                          <div className="relative">
                            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                          <div className="relative">
                            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
                          <div className="relative">
                            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={confirm}
                              onChange={(e) => setConfirm(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && onSubmitForm()}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                              placeholder="Nhập lại mật khẩu"
                            />
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                      )}

                      <Button
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                        onClick={onSubmitForm}
                      >
                        Tiếp tục
                        <ArrowRight className="ml-2 size-5" />
                      </Button>

                      <p className="text-center text-sm text-slate-500">
                        Đã có tài khoản?{' '}
                        <Link href="/dang-nhap" className="font-semibold text-emerald-700 hover:underline">
                          Đăng nhập
                        </Link>
                      </p>
                    </div>
                  )}

                  {/* Step 1: OTP */}
                  {step === 1 && (
                    <div className="grid gap-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mã OTP <span className="font-normal text-slate-400">(demo: 123456)</span></label>
                        <div className="relative">
                          <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSubmitOtp()}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Nhập mã 6 chữ số..."
                            maxLength={6}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {seconds > 0
                            ? `Gửi lại mã sau ${seconds}s`
                            : <button type="button" className="text-emerald-600 hover:underline" onClick={onSendOtpAgain}>Gửi lại mã OTP</button>
                          }
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                      )}

              <Button
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                        onClick={onSubmitOtp}
                        disabled={otp.length < 6}
                      >
                        Xác minh & Đăng ký
                        <ArrowRight className="ml-2 size-5" />
              </Button>

                      <button
                        type="button"
                        onClick={() => { setStep(0); setError(''); setOtp('') }}
                        className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-emerald-700"
                      >
                        <ChevronLeft className="size-4" />
                        Quay lại
                      </button>
                    </div>
                  )}

                  {/* Step 2: Seller profile */}
                  {step === 2 && (
                    <div className="grid gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên thương hiệu / chủ trọ <span className="font-normal text-slate-400">(tuỳ chọn)</span></label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="VD: Nhà trọ Bình An"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Số CCCD / Hộ chiếu</label>
                        <input
                          type="text"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="VD: 079123456789"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Địa chỉ thường trú</label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="VD: 123 Nguyễn Trãi, Q1, TP.HCM"
                          />
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-700">Ảnh CCCD</p>
                        <div className="grid grid-cols-2 gap-3">
                          <UploadSlot label="Mặt trước" uploaded={cccdFront} onClick={() => setCccdFront(!cccdFront)} />
                          <UploadSlot label="Mặt sau" uploaded={cccdBack} onClick={() => setCccdBack(!cccdBack)} />
                        </div>
                      </div>

                      <UploadSlot label="Giấy tờ nhà (tuỳ chọn)" uploaded={houseDoc} onClick={() => setHouseDoc(!houseDoc)} />

                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                      )}

                      <Button
                        className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white hover:from-emerald-700 hover:to-teal-600 transition-colors"
                        onClick={onSubmitSellerStep2}
                      >
                        Gửi hồ sơ
                        <ArrowRight className="ml-2 size-5" />
                      </Button>

                      <button
                        type="button"
                        onClick={() => { setStep(1); setError('') }}
                        className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-emerald-700"
                      >
                        <ChevronLeft className="size-4" />
                        Quay lại
          </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

function PurposeOption({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/15'
          : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
      )}
    >
      <span className={cn(
        'flex size-10 items-center justify-center rounded-xl transition-colors',
        active ? 'bg-gradient-to-br from-emerald-600 to-teal-500 text-white' : 'bg-slate-100 text-slate-600'
      )}>
        <Icon className="size-5" />
      </span>
      <span>
        <b className="block text-sm">{title}</b>
        <span className="mt-1 block text-xs text-slate-500">{desc}</span>
      </span>
    </button>
  )
}

function UploadSlot({ label, uploaded, onClick }: { label: string; uploaded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-sm transition-colors',
        uploaded
          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50'
      )}
    >
      {uploaded
        ? <CheckCircle2 className="size-6" />
        : <UserIcon className="size-6" />
      }
      <b className="text-sm">{label}</b>
      <small className="text-xs">{uploaded ? 'Đã tải lên' : 'Bấm để tải ảnh/PDF'}</small>
    </button>
  )
}
