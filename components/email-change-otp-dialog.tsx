'use client'

/**
 * Email-change confirmation dialog.
 *
 * Shown after the backend accepted an e-mail change and sent an OTP to the
 * NEW address. The address on file is only updated once the OTP is proven,
 * so the user can always fall back to the old address.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { authApi, ApiError } from '@/lib/api'

interface Props {
  pendingEmail: string
  resendAvailableIn?: number
  onVerified: (email: string) => void
  onCancel: () => void
}

export function EmailChangeOtpDialog({
  pendingEmail,
  resendAvailableIn = 60,
  onVerified,
  onCancel,
}: Props) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendIn, setResendIn] = useState(resendAvailableIn)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const onVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Mã xác thực phải gồm đúng 6 chữ số.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.verifyEmailChange({ email: pendingEmail, otp })
      setDone(true)
      onVerified(res.user?.email || pendingEmail)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xác thực thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (resendIn > 0 || resendLoading) return
    setResendLoading(true)
    setError(null)
    try {
      const res = await authApi.resendEmailChange()
      setResendIn(res.resendAvailableIn || 60)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi lại mã. Vui lòng thử lại.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border-[2px] border-[#151515] bg-white p-5 shadow-[6px_6px_0_#151515]">
        {done ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-[#151515]">Đã cập nhật email thành công.</p>
              <p className="mt-1 text-sm text-[#151515]/60">{pendingEmail}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-[#151515]" />
              <div>
                <p className="text-sm font-bold text-[#151515]">Xác nhận email mới</p>
                <p className="mt-1 break-all text-xs text-[#151515]/60">
                  Mã 6 chữ số đã được gửi tới <b>{pendingEmail}</b>. Email hiện tại chỉ được
                  cập nhật sau khi xác thực mã này.
                </p>
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && onVerify()}
              placeholder="000000"
              className="mt-4 h-14 w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-[#151515] shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            />

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border-2 border-red-500 bg-red-50 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] transition hover:bg-[#F5F5F0]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onVerify}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Xác thực
              </button>
            </div>

            <button
              type="button"
              onClick={onResend}
              disabled={resendIn > 0 || resendLoading}
              className="mt-3 w-full text-sm font-bold text-[#059669] disabled:cursor-not-allowed disabled:text-[#151515]/35 hover:underline"
            >
              {resendIn > 0
                ? `Gửi lại sau ${resendIn}s`
                : resendLoading
                  ? 'Đang gửi...'
                  : 'Gửi lại mã'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
