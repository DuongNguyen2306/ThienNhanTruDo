'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, KeyRound, Phone, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { DEMO_OTP, findAccountByPhone } from '@/lib/auth'
import { PublicFooter, PublicHeader } from '@/components/shells'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { updateAccount, signOutEverywhere } = useAuth()
  const [step, setStep] = useState(0) // 0: phone, 1: otp, 2: mk mới, 3: done
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 1) return
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [step, seconds])

  const onSubmitPhone = () => {
    setError('')
    const acc = findAccountByPhone(phone)
    if (!acc) return setError('Số điện thoại chưa đăng ký')
    setAccountId(acc.id)
    setStep(1)
    setSeconds(60)
  }

  const onSubmitOtp = () => {
    if (otp !== DEMO_OTP) return setError('Mã OTP không đúng. Vui lòng thử lại.')
    setError('')
    setStep(2)
  }

  const onSubmitPassword = () => {
    setError('')
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Mật khẩu tối thiểu 8 ký tự, có chữ hoa và số')
    }
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp')
    if (accountId) {
      updateAccount(accountId, { password })
      // Theo spec: tự động đăng xuất khỏi tất cả phiên cũ
      signOutEverywhere()
    }
    setStep(3)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      <div className="mx-auto max-w-lg px-5 py-10">
        <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">Bước {step + 1} / 4</Badge>
        <h1 className="mt-3 text-2xl font-bold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">Đặt lại mật khẩu qua SĐT đã định danh. Mọi phiên đăng nhập cũ sẽ tự động bị đăng xuất.</p>

        <Card className="mt-6 rounded-2xl border-slate-200">
          <CardContent className="p-6">
            {step === 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onSubmitPhone()
                }}
                className="grid gap-3"
              >
                <label className="text-sm font-semibold">Số điện thoại
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 w-full rounded-xl border pl-9 pr-3" placeholder="0918 334 221" />
                  </div>
                </label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <Button type="submit" className="h-11 rounded-xl bg-emerald-600">Gửi OTP</Button>
                <Link href="/dang-nhap" className="text-center text-sm text-slate-500">Quay lại đăng nhập</Link>
              </form>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Đã gửi mã OTP 6 chữ số tới <b>{phone}</b> qua SMS / Zalo ZNS.</p>
                <label className="text-sm font-semibold">Nhập mã OTP
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="mt-1 h-11 w-full rounded-xl border px-3 font-mono text-lg" placeholder="123456" />
                </label>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" disabled={seconds > 0} onClick={() => setSeconds(60)} className="text-emerald-700 disabled:text-slate-400">{seconds > 0 ? `Gửi lại sau ${seconds}s` : 'Gửi lại mã'}</button>
                  <button type="button" onClick={() => setStep(0)} className="text-slate-500 inline-flex items-center gap-1"><ChevronLeft className="size-4" /> Sửa SĐT</button>
                </div>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <Button className="h-11 rounded-xl bg-slate-900" onClick={onSubmitOtp}>Xác nhận</Button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3">
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><KeyRound className="mr-1 inline size-4" /> Tạo mật khẩu mới tối thiểu 8 ký tự, có chữ hoa và số.</p>
                <label className="text-sm font-semibold">Mật khẩu mới
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" />
                </label>
                <label className="text-sm font-semibold">Nhập lại mật khẩu
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" />
                </label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <Button className="h-11 rounded-xl bg-emerald-600" onClick={onSubmitPassword}>Cập nhật & đăng xuất các phiên cũ</Button>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-7" /></span>
                <h2 className="text-xl font-bold">Mật khẩu đã được cập nhật</h2>
                <p className="max-w-md text-sm text-slate-600">Mọi phiên đăng nhập cũ đã bị đăng xuất để bảo vệ tài khoản.</p>
                <Button className="h-11 rounded-xl bg-slate-900" onClick={() => router.push('/dang-nhap')}>Về trang đăng nhập <ArrowRight data-icon="inline-end" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="size-3.5" /> Quá 5 lần sai OTP trong 24h sẽ tạm khoá chức năng đặt lại mật khẩu.
        </p>
      </div>
      <PublicFooter />
    </main>
  )
}
