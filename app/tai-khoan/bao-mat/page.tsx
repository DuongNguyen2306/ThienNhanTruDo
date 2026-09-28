'use client'

import { useState } from 'react'
import { Check, KeyRound, Laptop, Lock, ShieldAlert, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountShell } from '@/components/account-shell'

const sessions = [
  { id: 's1', device: 'iPhone 15 Pro · iOS 17', location: 'Quận 1, TP.HCM', last: 'Đang hoạt động', current: true },
  { id: 's2', device: 'MacBook Air · Chrome 130', location: 'Quận Bình Thạnh', last: '2 giờ trước', current: false },
  { id: 's3', device: 'iPad · Safari', location: 'Quận 7', last: '3 ngày trước', current: false },
]

const logs = [
  { id: 'L-21', action: 'Đăng nhập OTP', device: 'iPhone 15 Pro', ip: '113.161.x.x', time: '28/09 · 09:12', location: 'Quận 1, TP.HCM' },
  { id: 'L-20', action: 'Đổi mật khẩu', device: 'iPhone 15 Pro', ip: '113.161.x.x', time: '21/09 · 22:30', location: 'Quận 1, TP.HCM' },
  { id: 'L-18', action: 'Bật 2FA', device: 'MacBook Air', ip: '14.161.x.x', time: '12/09 · 18:45', location: 'Quận Bình Thạnh' },
]

export default function SecurityPage() {
  const [twoFa, setTwoFa] = useState(true)
  return (
    <AccountShell title="Bảo mật & đăng nhập" desc="Quản lý mật khẩu, 2FA, các thiết bị đang đăng nhập và lịch sử hoạt động đáng ngờ.">
      <Tabs defaultValue="password">
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="password">Mật khẩu</TabsTrigger>
          <TabsTrigger value="2fa">2FA</TabsTrigger>
          <TabsTrigger value="devices">Thiết bị</TabsTrigger>
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="size-4 text-emerald-600" /> Đổi mật khẩu</CardTitle>
              <CardDescription>Mật khẩu mạnh ≥ 10 ký tự, có chữ hoa, số và ký tự đặc biệt.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <PasswordField label="Mật khẩu hiện tại" />
              <PasswordField label="Mật khẩu mới" />
              <PasswordField label="Nhập lại mật khẩu mới" />
              <Button className="h-11 w-fit rounded-xl bg-emerald-600">Cập nhật mật khẩu</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="2fa">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-emerald-600" /> Xác thực 2 yếu tố</CardTitle>
              <CardDescription>Luôn yêu cầu OTP khi đăng nhập từ thiết bị lạ.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
                <div>
                  <p className="font-semibold">Bật 2FA cho tài khoản</p>
                  <p className="text-xs text-slate-500">Nhận mã qua ứng dụng Authenticator hoặc SMS.</p>
                </div>
                <Switch checked={twoFa} onChange={setTwoFa} />
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="font-semibold">Khôi phục 2FA</p>
                <p className="text-xs text-slate-500">Đã lưu 8 mã dự phòng · Còn 6 lượt dùng.</p>
              </div>
              <Button className="h-11 w-fit rounded-xl bg-emerald-600"><KeyRound data-icon="inline-start" /> Tạo lại mã dự phòng</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="devices">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="size-4 text-emerald-600" /> Thiết bị đã đăng nhập</CardTitle>
              <CardDescription>Đăng xuất khỏi các thiết bị lạ ngay khi phát hiện.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border bg-white p-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Laptop className="size-4" /></span>
                    <div>
                      <p className="font-semibold">{s.device}</p>
                      <p className="text-xs text-slate-500">{s.location} · {s.last}</p>
                    </div>
                  </div>
                  {s.current ? <Badge className="bg-emerald-600">Thiết bị này</Badge> : <Button size="sm" variant="outline">Đăng xuất</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader>
              <CardTitle>Nhật ký bảo mật</CardTitle>
              <CardDescription>30 ngày gần nhất. Mọi hành vi đăng nhập/đổi thông tin đều ghi lại.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                  <tr>{['Hành động', 'Thiết bị', 'IP', 'Vị trí', 'Thời gian'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-semibold">{l.action}</td>
                      <td className="px-3 py-3">{l.device}</td>
                      <td className="px-3 py-3 font-mono text-xs">{l.ip}</td>
                      <td className="px-3 py-3">{l.location}</td>
                      <td className="px-3 py-3 text-xs">{l.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AccountShell>
  )
}

function PasswordField({ label }: { label: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input type="password" className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" />
    </label>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-0.5'}`}>{checked && <Check className="m-auto mt-1 size-4 text-emerald-600" />}</span>
    </button>
  )
}
