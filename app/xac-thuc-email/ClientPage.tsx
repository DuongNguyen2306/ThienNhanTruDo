'use client'

/**
 * Standalone e-mail verification page (Task 7).
 *
 * Reached from:
 *  • the login page when an account exists but its e-mail is unproven, and
 *  • the registration page's "Gửi lại mã" flow.
 *
 * SECURITY NOTES
 * ──────────────
 *  • The OTP arrives by e-mail only. It is never displayed on this page and
 *    is never embedded in the URL.
 *  • The resend action is rate limited server-side and mirrored here with a
 *    visible cooldown.
 *  • Verification is delegated entirely to the backend; this page performs
 *    no eligibility logic of its own.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck,
} from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { authApi, ApiError } from '@/lib/api'

function VerifyEmailInner() {
  const router = useRouter()
  const params = useSearchParams()

  const [email, setEmail] = useState(params.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [verified, setVerified] = useState(false)

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

  // ── Consume the OTP ──────────────────────────────────────────────────
  const onVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Mã xác thực phải gồm đúng 6 chữ số.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await authApi.verifyEmail({ email: email.trim(), otp })
      setVerified(true)
      setOtp('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xác thực thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // ── Re-send the code ─────────────────────────────────────────────────
  const onResend = async () => {
    if (resendIn > 0 || resendLoading) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }

    setResendLoading(true)
    setError('')
    try {
      const res = await authApi.resendVerification({ email: email.trim() })
      if (res.alreadyVerified) {
        setVerified(true)
      } else {
        setNotice(res.message || 'Đã gửi lại mã xác thực.')
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
        {/* LEFT: Form */}
        <div className="flex justify-center bg-white px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1
                className="text-2xl font-black text-[#151515] lg:text-3xl"
                
              >
                {verified ? 'XÁC THỰC THÀNH CÔNG' : 'XÁC THỰC EMAIL'}
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                {verified
                  ? 'Email đã được xác thực. Bạn có thể đăng nhập ngay.'
                  : 'Nhập mã 6 chữ số được gửi tới email để hoàn tất xác thực.'}
              </p>
            </div>

            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-6 shadow-[5px_5px_0_#151515]">
              {verified ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border-[2px] border-emerald-400 bg-emerald-50 p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">
                        Email đã được xác thực.
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Tài khoản của bạn đã có thể đăng nhập bình thường.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/dang-nhap')}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
                  >
                    Đăng nhập
                    <ArrowRight className="size-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 rounded-xl border-2 border-[#FDE047] bg-[#FDE047]/20 p-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#151515]" />
                    <p className="text-sm text-[#151515]/75">
                      Mã xác thực có hiệu lực 10 phút và chỉ dùng được một lần.
                      Nếu bạn không nhận được, hãy kiểm tra thư mục thư rác.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="email@example.com"
                        autoComplete="email"
                      />
                    </div>
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
                      onKeyDown={(e) => e.key === 'Enter' && onVerify()}
                      className="h-14 w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-[#151515] shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="000000"
                    />
                  </div>

                  {notice ? (
                    <p className="text-sm font-medium text-emerald-700">{notice}</p>
                  ) : null}

                  {error ? (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={onVerify}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang xác thực...
                      </>
                    ) : (
                      <>
                        Xác thực
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href="/dang-nhap"
                      className="font-bold text-[#151515]/60 hover:text-[#151515]"
                    >
                      ← Quay lại đăng nhập
                    </Link>
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={resendIn > 0 || resendLoading}
                      className="font-bold text-[#059669] disabled:cursor-not-allowed disabled:text-[#151515]/35 hover:underline"
                    >
                      {resendIn > 0
                        ? `Gửi lại sau ${resendIn}s`
                        : resendLoading
                          ? 'Đang gửi...'
                          : 'Gửi lại mã'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-[#151515]/20 bg-white p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#059669]" />
              <p className="text-xs text-[#151515]/60">
                Mã xác thực được sinh ngẫu nhiên bằng thuật toán mật mã, lưu ở dạng băm
                và không bao giờ hiển thị trong phản hồi API.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Branding Panel */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">
            <h2
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl"
              
            >
              Một email thật — một tài khoản thật.
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" >
              <ShieldCheck className="size-5" />
              THIÊN NHÃN TRÚ ĐỒ
            </div>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Xác thực email giúp nền tảng loại bỏ tài khoản giả và bảo vệ cả người thuê
              lẫn chủ trọ trong mọi giao dịch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  )
}
