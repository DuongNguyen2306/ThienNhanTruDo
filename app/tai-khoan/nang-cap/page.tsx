'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AccountShell } from '@/components/account-shell'

export default function UpgradePage() {
  const [sent, setSent] = useState(false)
  return (
    <AccountShell title="Yêu cầu nâng cấp tài khoản" desc="Gửi hồ sơ định danh/sở hữu BĐS để lên role User đăng tin (Seller).">
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="flex flex-col gap-4 p-6">
          <label className="text-sm font-semibold">Họ tên trên CCCD<input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" defaultValue="Nguyễn Hà" /></label>
          <label className="text-sm font-semibold">Số CCCD / Hộ chiếu<input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Khu vực quản lý phòng<input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" placeholder="VD: Quận 9, Thủ Đức" /></label>
          <label className="text-sm font-semibold">Giấy tờ nhà / hợp đồng ủy quyền
            <div className="mt-1 rounded-xl border border-dashed p-6 text-sm font-normal text-slate-500">Kéo thả PDF/JPG — chỉ Manager/Admin thấy khi duyệt.</div>
          </label>
          <Button disabled={sent} className="h-11 w-fit rounded-xl bg-emerald-600" onClick={() => setSent(true)}>
            {sent ? 'Đã gửi — chờ Manager duyệt' : 'Gửi yêu cầu nâng quyền'}
          </Button>
        </CardContent>
      </Card>
    </AccountShell>
  )
}
