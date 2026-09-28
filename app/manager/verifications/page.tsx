'use client'

import { useState } from 'react'
import { BadgeCheck, Clock, MapPin, ShieldCheck, Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManagerLayout } from '@/components/manager-portal'
import { PageHeader } from '@/components/portal-sidebar'

const verifications = [
  { id: 'VR-1052', title: 'Căn hộ Lumière Thảo Điền', manager: 'Mai Linh', time: '28/09/2026 · 14:20', sla: '2h 11m', score: 4.9, photos: 12, gpsMatch: true },
  { id: 'VR-1031', title: 'The Marq Residences', manager: 'Thanh Sơn', time: '24/09/2026 · 09:45', sla: '3h 02m', score: 4.8, photos: 8, gpsMatch: true },
  { id: 'VR-1022', title: 'Thảo Điền Garden Studio', manager: 'Mai Linh', time: '20/09/2026 · 16:11', sla: '2h 48m', score: 4.7, photos: 10, gpsMatch: true },
  { id: 'VR-0972', title: 'Studio Tân Phong (từ chối)', manager: 'Mai Linh', time: '26/09/2026 · 18:33', sla: '—', score: 0, photos: 1, gpsMatch: false },
]

export default function ManagerVerificationsPage() {
  const [detail, setDetail] = useState<(typeof verifications)[number] | null>(null)
  const [tab, setTab] = useState('approved')

  const visible = verifications.filter((v) => {
    if (tab === 'approved') return v.score > 0
    if (tab === 'rejected') return v.score === 0
    return true
  })

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Thẩm định"
          title="Lịch sử cấp Verified"
          desc="Mọi lần cấp/huỷ Manager Verified được ghi nhận, kèm thời gian SLA và chất lượng ảnh."
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="approved">Đã cấp</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <Card className="rounded-2xl">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Mã tin', 'Tin đăng', 'Manager', 'Thời điểm', 'SLA', 'Điểm', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visible.map((v) => (
                      <tr key={v.id} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" onClick={() => setDetail(v)}>
                        <td className="px-3 py-4 font-mono text-xs">{v.id.toUpperCase()}</td>
                        <td className="px-3 py-4"><b>{v.title}</b></td>
                        <td className="px-3 py-4">{v.manager}</td>
                        <td className="px-3 py-4 text-xs text-slate-500">{v.time}</td>
                        <td className="px-3 py-4 text-xs text-emerald-700">{v.sla}</td>
                        <td className="px-3 py-4">{v.score > 0 ? <span className="flex items-center gap-1 text-amber-600"><Star className="size-3.5 fill-amber-500" /> {v.score}</span> : <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-4 text-right text-xs text-emerald-700">Xem báo cáo →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-2xl rounded-2xl">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Báo cáo thẩm định {detail.id.toUpperCase()}</CardTitle>
                  <CardDescription>{detail.title} · {detail.manager} · {detail.time}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDetail(null)}><X /></Button>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat icon={Clock} label="SLA" value={detail.sla} />
                  <Stat icon={Star} label="Điểm chất lượng" value={detail.score > 0 ? `${detail.score}/5` : '—'} />
                  <Stat icon={MapPin} label="Khớp GPS" value={detail.gpsMatch ? 'Khớp' : 'Không khớp'} />
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Checklist</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-emerald-600" /> Địa chỉ khớp toạ độ</li>
                    <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-emerald-600" /> Ảnh không trùng mạng</li>
                    <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-emerald-600" /> Đồng hồ điện/nước có ảnh chụp cận</li>
                    <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-emerald-600" /> Bảng giá khớp hợp đồng</li>
                  </ul>
                </div>
                <p className="rounded-xl bg-slate-900 p-4 text-sm text-white"><ShieldCheck className="mr-2 inline size-4 text-emerald-400" /> Đã cấp Manager Verified. Tin được ưu tiên trong tìm kiếm và có thể tham gia chương trình “Phòng Verified · Giá đúng”.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </ManagerLayout>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-semibold"><Icon className="size-4 text-emerald-600" /> {value}</p>
    </div>
  )
}
