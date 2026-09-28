'use client'

import { useState } from 'react'
import { BadgeCheck, Calendar, FileSignature, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountShell } from '@/components/account-shell'

const contracts = [
  { id: 'CT-2026-031', listing: 'Căn hộ Lumière Thảo Điền', seller: 'Minh Anh Realty', start: '01/09/2026', end: '31/08/2027', deposit: 8500000, rent: 8500000, status: 'Đang hiệu lực', signed: true },
  { id: 'CT-2025-088', listing: 'KTX gần ĐH FPT', seller: 'The Park View', start: '01/09/2025', end: '31/05/2026', deposit: 2200000, rent: 2200000, status: 'Đã kết thúc', signed: true },
]

export default function ContractsPage() {
  return (
    <AccountShell title="Hợp đồng thuê" desc="Hợp đồng điện tử được ký bằng OTP, có hiệu lực pháp lý theo luật giao dịch điện tử VN.">
      <div className="flex flex-col gap-4">
        {contracts.map((c) => (
          <Card key={c.id} className="rounded-2xl border-slate-200">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{c.listing}</CardTitle>
                <CardDescription>Mã hợp đồng {c.id} · {c.seller}</CardDescription>
              </div>
              <Badge variant="outline" className={c.status === 'Đang hiệu lực' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>{c.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat icon={Calendar} label="Thời hạn" value={`${c.start} → ${c.end}`} />
                <Stat icon={Wallet} label="Tiền thuê/tháng" value={c.rent.toLocaleString('vi-VN') + 'đ'} />
                <Stat icon={Wallet} label="Tiền cọc" value={c.deposit.toLocaleString('vi-VN') + 'đ'} />
                <Stat icon={BadgeCheck} label="Chữ ký số" value={c.signed ? 'Đã ký OTP' : 'Chưa ký'} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline">Xem PDF</Button>
                <Button variant="outline">Tải hoá đơn VAT</Button>
                <Button className="bg-emerald-600"><FileSignature data-icon="inline-start" /> Gia hạn hợp đồng</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
