'use client'

import { useState } from 'react'
import { Check, KeyRound, Laptop, Lock, ShieldAlert, Smartphone, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authApi } from '@/lib/api'

// NOTE: Sessions and security logs would require backend tracking
// For now, display placeholder state

export default function SecurityPage() {
  const [twoFa, setTwoFa] = useState(false)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  
  return (
    <Tabs defaultValue="password">
      <TabsList className="mb-4 bg-slate-100">
        <TabsTrigger value="password">Mật khẩu</TabsTrigger>
        <TabsTrigger value="2fa">2FA</TabsTrigger>
        <TabsTrigger value="devices">Thiết bị</TabsTrigger>
        <TabsTrigger value="logs">Nhật ký</TabsTrigger>
      </TabsList>
      
      <TabsContent value="password">
        <PasswordChangeCard />
      </TabsContent>
      
      <TabsContent value="2fa">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="size-5 text-emerald-600" />
            <h3 className="text-lg font-bold">Xác thực 2 yếu tố</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">Luôn yêu cầu OTP khi đăng nhập từ thiết bị lạ.</p>
          
          <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
            <div>
              <p className="font-semibold">Bật 2FA cho tài khoản</p>
              <p className="text-xs text-slate-500">Nhận mã qua ứng dụng Authenticator hoặc SMS.</p>
            </div>
            <button
              onClick={() => setTwoFaLoading(true)}
              disabled={twoFaLoading}
              className="flex items-center gap-2 rounded-lg border-2 border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
            >
              {twoFaLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {twoFa ? 'Tắt 2FA' : 'Bật 2FA'}
            </button>
          </div>
          
          <p className="mt-4 text-xs text-slate-400">
            Tính năng 2FA đang được phát triển. Liên hệ hỗ trợ để kích hoạt.
          </p>
        </div>
      </TabsContent>
      
      <TabsContent value="devices">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone className="size-5 text-emerald-600" />
            <h3 className="text-lg font-bold">Thiết bị đã đăng nhập</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">Đăng xuất khỏi các thiết bị lạ ngay khi phát hiện.</p>
          
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Laptop className="size-12 text-slate-300" />
            <p className="text-sm text-slate-500">Chưa có dữ liệu thiết bị</p>
            <p className="text-xs text-slate-400">Tính năng theo dõi thiết bị đang được phát triển</p>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="logs">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="size-5 text-emerald-600" />
            <h3 className="text-lg font-bold">Nhật ký bảo mật</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">30 ngày gần nhất. Mọi hành vi đăng nhập/đổi thông tin đều ghi lại.</p>
          
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Lock className="size-12 text-slate-300" />
            <p className="text-sm text-slate-500">Chưa có nhật ký hoạt động</p>
            <p className="text-xs text-slate-400">Nhật ký bảo mật sẽ hiển thị khi có hoạt động</p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

// Password Change Component
function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Không thể đổi mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="size-5 text-emerald-600" />
        <h3 className="text-lg font-bold">Đổi mật khẩu</h3>
      </div>
      <p className="mb-4 text-sm text-slate-500">Mật khẩu mạnh ≥ 6 ký tự, có chữ hoa, số và ký tự đặc biệt.</p>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <CheckCircle className="size-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-700">Đổi mật khẩu thành công!</p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <AlertCircle className="size-5 text-red-600" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nhập lại mật khẩu mới</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-black bg-emerald-600 px-6 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  )
}

// Switch Component
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-0.5'}`}>
        {checked && <Check className="m-auto mt-1 size-4 text-emerald-600" />}
      </span>
    </button>
  )
}
