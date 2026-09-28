'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountShell } from '@/components/account-shell'
import { CheckCircle2, Edit3, ShieldCheck, Smartphone, UploadCloud, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleSave = () => {
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AccountShell
      title="Hồ sơ cá nhân"
      desc="Cập nhật họ tên, CCCD/eKYC và số điện thoại liên hệ để tăng độ uy tín khi thuê trọ."
    >

      {/* Profile card */}
      <Card className="mb-5 rounded-2xl border-slate-200 overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="absolute -bottom-10 left-6">
            <div className="relative">
              <div className="size-20 rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                NH
              </div>
              <button className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-slate-700 text-white shadow hover:bg-slate-600">
                <Edit3 className="size-3" />
              </button>
            </div>
          </div>
        </div>
        <CardContent className="pt-14 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nguyễn Hà</h2>
              <p className="mt-1 text-sm text-slate-500">Người thuê phòng · Tham gia 2026</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 font-medium">
                  <Smartphone className="mr-1 size-3" /> Đã xác minh SĐT
                </Badge>
                <Badge className="bg-slate-50 text-slate-500 font-medium">
                  <ShieldCheck className="mr-1 size-3" /> Chờ duyệt CCCD
                </Badge>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" className="h-9 rounded-xl border-slate-300 text-sm font-medium" onClick={() => setEditing(true)}>
                <Edit3 className="mr-2 size-4" /> Chỉnh sửa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold">Thông tin cơ bản</CardTitle>
          {editing && (
            <div className="flex gap-2">
              <Button variant="ghost" className="h-9 rounded-xl text-sm" onClick={() => setEditing(false)}>Huỷ</Button>
              <Button className="h-9 rounded-xl bg-emerald-600 text-sm font-medium hover:bg-emerald-700" onClick={handleSave}>
                Lưu thay đổi
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <InfoField label="Họ và tên" value="Nguyễn Hà" editing={editing} />
            <InfoField label="Số điện thoại" value="0918 334 221" editing={editing} />
            <InfoField label="Email" value="ha.nguyen@email.vn" editing={editing} />
            <InfoField label="CCCD / eKYC" value="079204001111" editing={editing} />
          </div>

          {/* eKYC status */}
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <User className="size-5 text-slate-400" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">Xác minh danh tính eKYC</p>
                  <Badge className="bg-amber-50 text-amber-700 font-medium text-xs">Đang chờ duyệt</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">Tải ảnh CCCD mặt trước và mặt sau để tăng độ tin cậy. Hồ sơ eKYC được duyệt trong 24h bởi đội ngũ Thiên Nhãn trú đồ.</p>
                <div className="mt-3 flex gap-3">
                  <Button size="sm" className="h-9 rounded-xl bg-slate-900 text-sm font-medium hover:bg-slate-800">
                    <UploadCloud className="mr-2 size-4" /> Tải CCCD mặt trước
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-xl border-slate-300 text-sm">
                    <UploadCloud className="mr-2 size-4" /> Mặt sau
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Smartphone, label: 'Xác minh SĐT', done: true, desc: 'Đã xác minh' },
              { icon: ShieldCheck, label: 'Xác minh CCCD', done: false, desc: 'Đang chờ duyệt' },
              { icon: CheckCircle2, label: 'Hồ sơ eKYC', done: false, desc: 'Chưa thực hiện' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
                <span className={cn(
                  'flex size-9 items-center justify-center rounded-xl',
                  item.done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                )}>
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className={cn('text-xs', item.done ? 'text-emerald-600' : 'text-slate-400')}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              Đã lưu thông tin cá nhân.
            </div>
          )}
        </CardContent>
      </Card>
    </AccountShell>
  )
}

function InfoField({ label, value, editing }: { label: string; value: string; editing: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {editing ? (
        <input
          defaultValue={value}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      ) : (
        <p className="flex h-11 items-center rounded-xl border border-transparent bg-slate-50 px-4 text-sm font-medium text-slate-900">{value}</p>
      )}
    </div>
  )
}
