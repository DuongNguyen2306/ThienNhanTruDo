'use client'

import { useState } from 'react'
import { Calendar, Car, Check, MapPin, Navigation, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManagerLayout } from '@/components/manager-portal'
import { PageHeader } from '@/components/portal-sidebar'

const initial = [
  { id: 'FV-91', listing: 'Căn hộ Lumière Thảo Điền', seller: 'Minh Anh Realty', when: '29/09/2026 · 09:30', area: 'Thủ Đức', status: 'Đã đi', distance: '8.4 km' },
  { id: 'FV-90', listing: 'Sunrise Studio Quận 1', seller: 'Minh Anh Realty', when: '30/09/2026 · 14:00', area: 'Quận 1', status: 'Đang đi', distance: '12.1 km' },
  { id: 'FV-89', listing: 'Green Nest Bình Thạnh', seller: 'Green Nest Homes', when: '01/10/2026 · 10:30', area: 'Bình Thạnh', status: 'Lên lịch', distance: '6.2 km' },
  { id: 'FV-88', listing: 'KTX gần ĐH FPT', seller: 'The Park View', when: '02/10/2026 · 08:45', area: 'Thủ Đức', status: 'Lên lịch', distance: '14.7 km' },
]

export default function FieldVisitsPage() {
  const [rows, setRows] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab] = useState('today')

  const today = rows.filter((r) => r.status === 'Đang đi' || r.status === 'Đã đi')
  const upcoming = rows.filter((r) => r.status === 'Lên lịch')

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Thẩm định"
          title="Lịch đi kiểm định thực địa"
          desc="Lên lịch đến tận nơi cho gói 'Xác minh tận nơi'. Tối ưu tuyến đường để giảm thời gian di chuyển."
          actions={<Button className="bg-slate-900" onClick={() => setShowNew(true)}><Plus data-icon="inline-start" /> Lên lịch mới</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary icon={Calendar} label="Tổng lịch tuần này" value="14" detail="Đã đi 7 · Đang đi 2 · Lên lịch 5" />
          <Summary icon={Navigation} label="Quãng đường ước tính" value="126 km" detail="3 quận nội thành" />
          <Summary icon={MapPin} label="Khu vực đang phụ trách" value="Thủ Đức · Q1 · BThạnh" detail="Đã gán tự động theo SLA" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="today">Hôm nay</TabsTrigger>
            <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            <VisitList rows={today} />
          </TabsContent>
          <TabsContent value="upcoming" className="mt-4">
            <VisitList rows={upcoming} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <VisitList rows={rows} />
          </TabsContent>
        </Tabs>

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-xl rounded-2xl">
              <CardHeader>
                <CardTitle>Lên lịch kiểm định</CardTitle>
                <CardDescription>Tự động đề xuất tuyến đường tối ưu cho Manager.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <select className="h-11 rounded-xl border px-3"><option>VR-1052 · Căn hộ Lumière Thảo Điền</option><option>VR-1048 · Sunrise Studio Quận 1</option><option>VR-1018 · Green Nest Bình Thạnh</option></select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" className="h-11 rounded-xl border px-3" defaultValue="2026-10-03" />
                  <input type="time" className="h-11 rounded-xl border px-3" defaultValue="10:00" />
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" defaultChecked /> Đề xuất tuyến đường tối ưu</label>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowNew(false)}>Huỷ</Button>
                  <Button className="bg-emerald-600" onClick={() => { setShowNew(false); setRows((rs) => [{ id: 'FV-92', listing: 'Căn hộ Lumière Thảo Điền', seller: 'Minh Anh Realty', when: '03/10/2026 · 10:00', area: 'Thủ Đức', status: 'Lên lịch', distance: '8.4 km' }, ...rs]) }}>Lưu lịch</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </ManagerLayout>
  )
}

function VisitList({ rows }: { rows: typeof initial }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
            <tr>{['Mã', 'Tin đăng', 'Khu vực', 'Thời gian', 'Quãng đường', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-4 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-4"><b>{r.listing}</b><span className="mt-1 block text-xs text-slate-400">{r.seller}</span></td>
                <td className="px-3 py-4">{r.area}</td>
                <td className="px-3 py-4">{r.when}</td>
                <td className="px-3 py-4"><span className="flex items-center gap-1 text-xs text-slate-500"><Car className="size-3.5" /> {r.distance}</span></td>
                <td className="px-3 py-4"><Badge variant="outline">{r.status}</Badge></td>
                <td className="px-3 py-4 text-right"><Button size="sm" variant="outline"><Check data-icon="inline-start" /> Check-in</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">Không có lịch trong mục này.</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function Summary({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon /></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold">{value}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}
