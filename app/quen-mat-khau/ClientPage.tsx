'use client'

/**
 * Forgot / reset password (Task 7).
 *
 * Flow: email → (backend emails an OTP) → OTP + new password → done.
 *
 * SECURITY NOTES
 * ──────────────
 *  • The backend NEVER reveals whether an e-mail address is registered — the
 *    same generic message is returned in every case, so this page cannot be
 *    used to enumerate accounts.
 *  • The OTP is delivered by e-mail only. It is never displayed here, and
 *    the resend button is rate limited with a visible cooldown.
 *  • After a successful reset, ALL sessions for that account are invalidated
 *    server-side, so the user must sign in again.
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff,
  Lock, Mail, ShieldCheck, KeyRound,
} from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { authApi, ApiError } from '@/lib/api'

type Stage = 'email' | 'otp'

// Matches the backend's e-mail validation closely enough to catch typos
// before a request is made, without duplicating the server's rules.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [done, setDone] = useState(false)

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

  // ── Step 1: request the OTP ──────────────────────────────────────────
  const onRequest = async () => {
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError('Email không hợp lệ. Vui lòng nhập địa chỉ email đầy đủ.')
      return
    }

    setError('')
    setNotice('')
    setLoading(true)

    try {
      const res = await authApi.forgotPassword(clean)
      // The same generic message is shown whether or not the account exists.
      setNotice(res.message)
      setResendIn(res.resendAvailableIn || 60)
      // Only move to the OTP step when the backend actually accepted the
      // request. A delivery failure (5xx) is surfaced as an error and the
      // user stays on this screen.
      setStage('otp')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể gửi mã. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: consume the OTP and set the new password ─────────────────
  const onReset = async () => {
    const clean = email.trim().toLowerCase()

    if (!/^\d{6}$/.test(otp)) {
      setError('Mã xác thực phải gồm đúng 6 chữ số.')
      return
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa và chữ số.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await authApi.resetPassword({ email: clean, otp, newPassword })
      setDone(true)
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể đặt lại mật khẩu. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Resend the OTP ───────────────────────────────────────────────────
  const onResend = async () => {
    if (resendIn > 0) return
    setResendLoading(true)
    setError('')
    try {
      const res = await authApi.resendPasswordReset(email.trim().toLowerCase())
      setNotice(res.message)
      setResendIn(res.resendAvailableIn || 60)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Không thể gửi lại mã. Vui lòng thử lại.')
      }
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
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                {done ? 'ĐẶT LẠI THÀNH CÔNG' : stage === 'otp' ? 'NHẬP MÃ XÁC THỰC' : 'QUÊN MẬT KHẨU'}
              </h1>
              <p className="mt-1 text-sm text-[#151515]/60">
                {done
                  ? 'Mật khẩu đã được cập nhật. Đăng nhập lại bằng mật khẩu mới.'
                  : stage === 'otp'
                    ? 'Nhập mã 6 chữ số được gửi tới email của tài khoản.'
                    : 'Khôi phục tài khoản bằng mã xác thực gửi qua email.'}
              </p>
            </div>

            <div className="rounded-2xl border-[3px] border-[#151515] bg-[#F5F5F0] p-6 shadow-[5px_5px_0_#151515]">
              {done ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border-[2px] border-emerald-400 bg-emerald-50 p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">
                        Mật khẩu đã được đặt lại thành công.
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Tất cả phiên đăng nhập cũ đã bị vô hiệu hoá. Bạn cần đăng nhập lại.
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
              ) : stage === 'email' ? (
                <div className="space-y-4">
                  <div className="mb-4 flex items-start gap-2 rounded-xl border-2 border-[#FDE047] bg-[#FDE047]/20 p-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#151515]" />
                    <p className="text-sm text-[#151515]/75">
                      Mã xác thực sẽ được gửi tới email đã đăng ký của tài khoản.
                      Mã có hiệu lực 10 phút và chỉ dùng được một lần.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Địa chỉ email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onRequest()}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="example@gmail.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={onRequest}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang gửi mã...
                      </>
                    ) : (
                      <>
                        Gửi mã xác thực
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/dang-nhap')}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
                  >
                    <ArrowLeft className="size-5" />
                    Quay lại đăng nhập
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 rounded-xl border-[2px] border-[#FDE047] bg-[#FDE047]/20 p-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#151515]" />
                    <p className="text-sm text-[#151515]/75">
                      {notice || 'Nếu email đã được đăng ký, chúng tôi sẽ gửi mã xác thực.'}
                      {email.trim() ? (
                        <>
                          {' '}
                          Địa chỉ nhận: <b>{email.trim().toLowerCase()}</b>.
                        </>
                      ) : null}
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
                      className="h-14 w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-[#151515] shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="000000"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-12 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
                        autoComplete="new-password"
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

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onReset()}
                        className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-12 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
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

                  {error ? (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-500 bg-red-50 p-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={onReset}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                        Đang đặt lại...
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-5" />
                        Đặt lại mật khẩu
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStage('email')
                        setOtp('')
                        setError('')
                        setNotice('')
                      }}
                      className="font-bold text-[#151515]/60 hover:text-[#151515]"
                    >
                      ← Đổi email
                    </button>
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
                Thông báo chung luôn được trả về dù email có tồn tại hay không,
                để không ai có thể dò tìm tài khoản trên hệ thống.
              </p>
            </div>

            <p className="mt-4 text-center text-sm text-[#151515]/60">
              Nhớ mật khẩu?{' '}
              <Link href="/dang-nhap" className="font-bold text-[#059669] hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT: Branding Panel */}
        <div className="hidden lg:flex lg:w-full lg:min-w-0 flex-col items-start bg-[#FDE047] px-12 py-12">
          <div className="w-full max-w-2xl">
            <h2
              className="text-4xl font-black leading-tight text-[#151515] xl:text-5xl"
              style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
              Khôi phục tài khoản — an toàn và nhanh chóng.
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border-[3px] border-[#151515] bg-white px-5 py-2.5 text-sm font-black text-[#151515] shadow-[3px_3px_0_#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              <ShieldCheck className="size-5" />
              THIÊN NHÃN TRÚ ĐỒ
            </div>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#151515]/70">
              Mã xác thực được gửi riêng tới email của bạn, có thời hạn ngắn và chỉ dùng
              được một lần. Sau khi đặt lại, mọi phiên đăng nhập cũ sẽ tự động bị vô hiệu hoá.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <Mail className="size-5 text-[#151515]" />
                </span>
                <div>
                  <p className="font-bold text-[#151515]">Mã xác thực tự sinh</p>
                  <p className="text-sm text-[#151515]/60">
                    6 chữ số ngẫu nhiên bằng thuật toán mật mã, hết hạn sau 10 phút.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <ShieldCheck className="size-5 text-[#151515]" />
                </span>
                <div>
                  <p className="font-bold text-[#151515]">Giới hạn số lần thử</p>
                  <p className="text-sm text-[#151515]/60">
                    Tối đa 5 lần nhập sai, kèm giới hạn tần suất gửi mã theo IP.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]">
                  <Lock className="size-5 text-[#151515]" />
                </span>
                <div>
                  <p className="font-bold text-[#151515]">Vô hiệu hoá phiên cũ</p>
                  <p className="text-sm text-[#151515]/60">
                    Mọi token đăng nhập cũ ngừng hoạt động ngay khi đổi mật khẩu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
