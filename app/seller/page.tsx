'use client'

import { Eye, PhoneCall, BedDouble, Megaphone, WalletCards } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { listings } from '@/lib/data'

export default function SellerDashboard() {
  const mine = listings.filter((l) => l.sellerId === 's1')
  const vacant = mine.filter((l) => l.vacantNow && l.status === 'active').length
  const live = mine.filter((l) => l.status === 'active').length
  const views = mine.reduce((s, l) => s + l.views, 0)
  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader eyebrow="Cổng chủ trọ" title="Tổng quan chủ trọ" desc="Số phòng trống, tin đang hiển thị, lượt xem và yêu cầu hẹn xem phòng." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={BedDouble} label="Phòng trống" value={String(vacant)} />
          <Stat icon={Megaphone} label="Tin đang hiển thị" value={String(live)} />
          <Stat icon={Eye} label="Lượt xem" value={views.toLocaleString('vi-VN')} />
          <Stat icon={PhoneCall} label="Yêu cầu hẹn xem" value="12" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Thông báo duyệt bài</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">VR-1052 Lumière — Chờ Manager duyệt (đã nộp đủ 3 khối dữ liệu).</p>
              <p className="rounded-xl bg-red-50 p-3 text-red-800">VR-0972 Studio Tân Phong — Bị từ chối: Ảnh không đúng thực tế, bảng giá chưa rõ, địa chỉ chung chung.</p>
              <p className="rounded-xl bg-slate-50 p-3">VR-0980 — Đang ở trạng thái Nháp, chưa gửi duyệt.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="text-emerald-600" /> Ví & gói tin</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>Số dư ví: <b>1.250.000đ</b></p>
              <p className="mt-2">Lượt tin thường còn: <b>3</b> · Tin VIP còn: <b>1</b></p>
              <p className="mt-3 text-slate-500">Chi tiêu gần nhất: 299.000đ gói VIP · 14/09/2026</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </SellerLayout>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon /></span>
      </CardContent>
    </Card>
  )
}
