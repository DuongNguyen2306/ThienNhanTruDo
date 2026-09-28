'use client'

import { useState } from 'react'
import { Calendar, Clock, Lock, Sparkles, Wallet, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AccountShell } from '@/components/account-shell'
import { formatVnd } from '@/lib/data'

const deposits = [
  { id: 'DG-2026-022', listing: 'Căn hộ Lumière Thảo Điền', seller: 'Minh Anh Realty', amount: 2000000, when: '28/09/2026 · 11:12', expire: '02/10/2026 · 11:12', status: 'Đang giữ chỗ' },
  { id: 'DG-2026-018', listing: 'The Marq Residences', seller: 'Minh Anh Realty', amount: 3000000, when: '24/09/2026 · 14:30', expire: '28/09/2026 · 14:30', status: 'Đã ký hợp đồng' },
  { id: 'DG-2026-011', listing: 'Green Nest Bình Thạnh', seller: 'Green Nest Homes', amount: 1500000, when: '15/09/2026 · 09:01', expire: '19/09/2026 · 09:01', status: 'Đã hoàn cọc' },
]

export default function DepositsPage() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  return (
    <AccountShell title="Đặt cọc giữ chỗ" desc="Cọc tạm giữ phòng trong 72h, hoàn 100% nếu Manager phát hiện tin vi phạm. Thanh toán qua VNPay.">
      <Card className="mb-4 rounded-2xl bg-slate-900 text-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Gợi ý</p>
            <p className="mt-1 text-lg font-bold">Đặt cọc chỉ 500.000đ — giữ phòng ưu tiên 72h trong khi chờ ký hợp đồng.</p>
            <p className="mt-1 text-sm text-slate-300">Nếu Manager phát hiện tin vi phạm (ảnh ảo, địa chỉ giả…), bạn được hoàn 100% kèm bù 200.000đ.</p>
          </div>
          <Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => setOpen(true)}><Lock data-icon="inline-start" /> Đặt cọc ngay</Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {deposits.map((d) => (
          <Card key={d.id} className="rounded-2xl border-slate-200">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{d.listing}</CardTitle>
                <CardDescription>Mã {d.id} · {d.seller}</CardDescription>
              </div>
              <Badge variant="outline" className={d.status === 'Đang giữ chỗ' ? 'border-amber-200 bg-amber-50 text-amber-800' : d.status === 'Đã ký hợp đồng' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>{d.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat icon={Wallet} label="Số tiền cọc" value={formatVnd(d.amount)} />
                <Stat icon={Calendar} label="Đặt lúc" value={d.when} />
                <Stat icon={Clock} label="Hết hạn giữ" value={d.expire} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Xem chi tiết</Button>
                {d.status === 'Đang giữ chỗ' && <Button className="bg-emerald-600">Ký hợp đồng</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5">
          <Card className="w-full max-w-lg rounded-2xl">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Đặt cọc giữ chỗ</CardTitle>
                <CardDescription>Tiền cọc được ký quỹ tại Thiện Nhân trú đồ, không chuyển thẳng cho chủ nhà.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X /></Button>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ol className="grid gap-2 text-xs">
                {['Chọn phòng', 'Nhập số tiền (500.000đ - 5.000.000đ)', 'Thanh toán VNPay · giữ phòng 72h', 'Ký hợp đồng điện tử hoặc hoàn cọc'].map((label, i) => (
                  <li key={label} className={`flex items-center gap-2 rounded-xl border p-3 ${step === i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                    <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              {step === 1 && <Input placeholder="Số tiền (VNĐ)" defaultValue="500000" />}
              {step === 2 && (
                <div className="rounded-xl border bg-slate-50 p-3 text-xs">
                  <p>Quét QR VNPay để thanh toán.</p>
                  <p className="mt-1 text-slate-400">Mã giao dịch: DG-2026-NEW</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Huỷ</Button>
                <Button className="bg-emerald-600" onClick={() => setStep((s) => Math.min(3, s + 1))}>
                  {step < 3 ? 'Tiếp tục' : 'Hoàn tất'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AccountShell>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400"><Icon className="size-3.5" /> {label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
