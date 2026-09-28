'use client'

import { useMemo, useState } from 'react'
import { Building2, MapPin, MoreHorizontal, Plus, Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin-portal'
import { PageHeader } from '@/components/portal-sidebar'

const initialManagers = [
  { id: 'm-01', name: 'Mai Linh', email: 'mai.linh@verirent.vn', areas: ['Quận 9', 'Thủ Đức'], listings: 412, sla: '3h 18m', status: 'Hoạt động' },
  { id: 'm-02', name: 'Thanh Sơn', email: 'son.tran@verirent.vn', areas: ['Bình Thạnh', 'Quận 1'], listings: 358, sla: '3h 55m', status: 'Hoạt động' },
  { id: 'm-03', name: 'Phương Trần', email: 'phuong.tran@verirent.vn', areas: ['Quận 7', 'Quận 4'], listings: 281, sla: '4h 02m', status: 'Hoạt động' },
  { id: 'm-04', name: 'Khánh Vy', email: 'khanh.vy@verirent.vn', areas: ['Gò Vấp', 'Tân Bình'], listings: 198, sla: '5h 11m', status: 'Tạm nghỉ' },
]

const cities = ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Cần Thơ']

export default function AdminManagersPage() {
  const [managers, setManagers] = useState(initialManagers)
  const [city, setCity] = useState('TP.HCM')
  const [showCreate, setShowCreate] = useState(false)
  const [notice, setNotice] = useState('')

  const totals = useMemo(() => ({
    active: managers.filter((m) => m.status === 'Hoạt động').length,
    listings: managers.reduce((s, m) => s + m.listings, 0),
    cities: new Set(managers.flatMap((m) => m.areas.map((a) => a.split(' ')[0]))).size,
  }), [managers])

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Vận hành"
          title="Quản lý Manager & phân vùng"
          desc="Tạo tài khoản Manager, gán khu vực phụ trách, theo dõi SLA."
          actions={
            <>
              <Button variant="outline" className="bg-white"><Building2 data-icon="inline-start" /> Thêm khu vực</Button>
              <Button className="bg-slate-900" onClick={() => setShowCreate(true)}><Plus data-icon="inline-start" /> Tạo Manager mới</Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary icon={Users2} label="Manager đang hoạt động" value={`${totals.active}`} detail="4 trên 4 tài khoản" />
          <Summary icon={Building2} label="Tổng tin phụ trách" value={totals.listings.toLocaleString('vi-VN')} detail="Tin active + pending" />
          <Summary icon={MapPin} label="Số khu vực đang phủ" value={`${totals.cities}`} detail="Đã gán tự động theo quận" />
        </div>

        {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <Tabs defaultValue="all">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
            <TabsTrigger value="paused">Tạm nghỉ</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Danh sách Manager</CardTitle>
                <CardDescription>Phân vùng tự động theo quận, có thể gán thủ công.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Manager', 'Khu vực', 'Tin đang phụ trách', 'SLA', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {managers.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="px-3 py-4">
                          <b>{m.name}</b>
                          <span className="mt-1 block text-xs text-slate-400">{m.email}</span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-1">
                            {m.areas.map((a) => <Badge key={a} variant="outline" className="bg-slate-50">{a}</Badge>)}
                          </div>
                        </td>
                        <td className="px-3 py-4 font-mono">{m.listings}</td>
                        <td className="px-3 py-4 text-xs text-emerald-700">{m.sla}</td>
                        <td className="px-3 py-4"><Badge variant="outline" className={m.status === 'Hoạt động' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}>{m.status}</Badge></td>
                        <td className="px-3 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => setManagers((rows) => rows.map((r) => r.id === m.id ? { ...r, status: r.status === 'Hoạt động' ? 'Tạm nghỉ' : 'Hoạt động' } : r))}>
                            {m.status === 'Hoạt động' ? 'Tạm nghỉ' : 'Kích hoạt'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <ManagerTable rows={managers.filter((m) => m.status === 'Hoạt động')} onToggle={(id) => setManagers((rows) => rows.map((r) => r.id === id ? { ...r, status: 'Tạm nghỉ' } : r))} />
          </TabsContent>
          <TabsContent value="paused" className="mt-4">
            <ManagerTable rows={managers.filter((m) => m.status !== 'Hoạt động')} onToggle={(id) => setManagers((rows) => rows.map((r) => r.id === id ? { ...r, status: 'Hoạt động' } : r))} />
          </TabsContent>
        </Tabs>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-lg rounded-2xl">
              <CardHeader>
                <CardTitle>Tạo Manager</CardTitle>
                <CardDescription>Manager phụ trách khu vực cụ thể, SLA đo theo giờ duyệt.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <input className="h-11 rounded-xl border px-3" placeholder="Họ tên" />
                <input className="h-11 rounded-xl border px-3" placeholder="Email công việc" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <select className="h-11 rounded-xl border px-3" value={city} onChange={(e) => setCity(e.target.value)}>
                    {cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input className="h-11 rounded-xl border px-3" placeholder="Quận/Huyện" defaultValue="Thủ Đức" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Quận 9', 'Bình Thạnh', 'Gò Vấp', 'Quận 7'].map((q) => (
                    <label key={q} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                      <input type="checkbox" className="accent-emerald-600" defaultChecked /> {q}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Huỷ</Button>
                  <Button className="bg-emerald-600" onClick={() => { setShowCreate(false); setNotice('Đã tạo Manager mới và gán khu vực.') }}>Tạo tài khoản</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

function ManagerTable({ rows, onToggle }: { rows: typeof initialManagers; onToggle: (id: string) => void }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
            <tr>{['Manager', 'Khu vực', 'SLA', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-3 py-4"><b>{m.name}</b></td>
                <td className="px-3 py-4">{m.areas.join(', ')}</td>
                <td className="px-3 py-4 text-xs text-emerald-700">{m.sla}</td>
                <td className="px-3 py-4 text-right"><Button size="sm" variant="outline" onClick={() => onToggle(m.id)}>Đổi trạng thái</Button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu.</td></tr>
            )}
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
        <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon /></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}
