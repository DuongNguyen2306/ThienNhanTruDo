'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  BarChart3, Check, Download, FileCheck2, Landmark, MoreHorizontal, Plus, ReceiptText,
  ShieldCheck, Users, WalletCards, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { PortalSidebar } from '@/components/portal-sidebar'
import { PortalShell } from '@/components/shells'
import { PageHeader } from '@/components/portal-sidebar'
import {
  amenityCatalog, auditLogs, cashflow, formatVnd, packages, platformUsers, roomTypes, transactions,
} from '@/lib/data'
import { adminNav } from '@/lib/nav'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allow="admin">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <PortalSidebar
          items={adminNav}
          footer={
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Trạng thái hệ thống</p>
              <p className="mt-2 flex items-center gap-2 text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> API VNPay · Mọi dịch vụ ổn định</p>
              <p className="mt-1 flex items-center gap-2 text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> Map tile · 99,8% uptime</p>
              <p className="mt-1 flex items-center gap-2 text-amber-600"><span className="size-2 rounded-full bg-amber-500" /> OTP queue · đang xử lý</p>
            </div>
          }
        />
        <div>{children}</div>
      </div>
    </PortalShell>
  )
}


const chartConfig = {
  inflow: { label: 'Doanh thu VNPay', color: 'var(--chart-2)' },
  refunds: { label: 'Hoàn tiền', color: 'var(--chart-4)' },
} satisfies ChartConfig

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
        <p className="mt-2 text-xs font-medium text-emerald-600">{detail}</p>
      </CardContent>
    </Card>
  )
}

export function ExecutiveOverview() {
  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Vận hành"
          title="Dashboard điều hành"
          desc="Chỉ số nền tảng và dòng tiền từ cổng VNPay (gói tin, kiểm định, quảng cáo)."
        />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tổng user" value="12.480" detail="+6.2% so với tháng trước" />
          <Metric label="Tin đang hoạt động" value="1.240" detail="68% đã kiểm định" />
          <Metric label="Tỷ lệ kiểm định" value="68%" detail="Manager Verified / tổng tin live" />
          <Metric label="Tỷ lệ khiếu nại" value="0,84%" detail="−0,18% so với tháng trước" />
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Biểu đồ dòng tiền</CardTitle>
                <CardDescription>Doanh thu theo ngày từ VNPay · tháng 09/2026</CardDescription>
              </div>
              <div className="flex gap-2 text-xs">
                {['Ngày', 'Tuần', 'Tháng', 'Quý'].map((x) => (
                  <Badge key={x} variant="outline" className={x === 'Ngày' ? 'bg-slate-900 text-white' : ''}>{x}</Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart accessibilityLayer data={cashflow} margin={{ left: -18, right: 8, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}tr`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="inflow" stroke="var(--color-inflow)" fill="var(--color-inflow)" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="refunds" stroke="var(--color-refunds)" fill="var(--color-refunds)" fillOpacity={0.06} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  )
}

export function FinanceHub() {
  const [reconcile, setReconcile] = useState<string | null>(null)
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState('2026-09-28')
  const [query, setQuery] = useState('')
  const rows = transactions.filter((t) => t.seller.toLowerCase().includes(query.toLowerCase()) || t.sys.includes(query) || t.vnpay.includes(query))

  const exportCsv = () => {
    const header = 'Ma he thong,Ma VNPay,Seller,So tien,Thoi gian,Trang thai\n'
    const body = rows.map((t) => `${t.sys},${t.vnpay},${t.seller},${t.amount},${t.time},${t.status}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'thiennhan-trudo-finance.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold">Quản lý dòng tiền & đối soát VNPay</h1>
            <p className="mt-2 text-sm text-slate-500">Mã hệ thống, mã VNPay, Seller, số tiền, thời gian, trạng thái.</p>
          </div>
          <Button variant="outline" className="bg-white" onClick={exportCsv}><Download data-icon="inline-start" /> Xuất Excel/CSV</Button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tổng GMV" value="1,84 tỷ" detail="+18,4% so với tháng trước" />
          <Metric label="Giao dịch VNPay" value="1,62 tỷ" detail="96,8% thành công" />
          <Metric label="Gói đang hiệu lực" value="2.418" detail="+12,1% tháng này" />
          <Metric label="Timeout chờ đối soát" value="1" detail="Công cụ Reconcile thủ công" />
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã GD / Seller..." className="h-10 max-w-xs" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border px-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border px-2 text-sm" />
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sổ giao dịch</CardTitle>
                <CardDescription>Lọc {from} → {to}</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Landmark data-icon="inline-start" /> Đối soát thủ công</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                <tr>{['Mã hệ thống', 'Mã VNPay', 'Seller', 'Số tiền', 'Thời gian', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.sys} className="border-b last:border-0">
                    <td className="px-3 py-4 font-mono text-xs font-semibold">{t.sys}</td>
                    <td className="px-3 py-4 font-mono text-xs">{t.vnpay}</td>
                    <td className="px-3 py-4">{t.seller}</td>
                    <td className="px-3 py-4 font-mono font-semibold">{formatVnd(t.amount)}</td>
                    <td className="px-3 py-4 text-slate-600">{t.time}</td>
                    <td className="px-3 py-4">
                      <Badge variant="outline" className={t.status === 'Timeout' ? 'border-amber-200 bg-amber-50 text-amber-700' : t.status === 'Hoàn tiền' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      {t.status === 'Timeout' && (
                        <Button size="icon" variant="ghost" onClick={() => setReconcile(t.sys)} aria-label="Đối soát">
                          <MoreHorizontal />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {reconcile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-md rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Đối soát thủ công</CardTitle>
                    <CardDescription>Timeout mạng giữa VNPay và webhook · {reconcile}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReconcile(null)}><X /></Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input placeholder="Mã settlement VNPay" defaultValue="VNPAY-SETTLED-98231" />
                <Button className="bg-emerald-600" onClick={() => setReconcile(null)}>Đánh dấu đã đối soát</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

export function UsersHub() {
  const [role, setRole] = useState('Tất cả')
  const [createManager, setCreateManager] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const filtered = useMemo(() => (role === 'Tất cả' ? platformUsers : platformUsers.filter((u) => u.role === role)), [role])
  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold">Quản lý tài khoản & phân quyền</h1>
            <p className="mt-2 text-sm text-slate-500">Lọc Admin / Manager / Seller / Tenant. Gán khu vực duyệt cho Manager.</p>
          </div>
          <Button className="bg-slate-900" onClick={() => setCreateManager(true)}><Plus data-icon="inline-start" /> Tạo tài khoản Manager</Button>
        </div>
        {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Danh bạ hệ thống</CardTitle>
            <CardDescription>RBAC: đổi role, khóa, mở khóa, reset bảo mật</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={setRole}>
              <TabsList className="mb-4 bg-slate-100">
                {['Tất cả', 'Tenant', 'Seller', 'Manager', 'Admin'].map((r) => (
                  <TabsTrigger key={r} value={r}>{r}</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={role} className="mt-0 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase text-slate-400">
                    <tr>{['Người dùng', 'Vai trò', 'Khu vực', 'Trạng thái', 'Tham gia', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user.email} className="border-b last:border-0">
                        <td className="px-3 py-4"><b>{user.name}</b><span className="mt-1 block text-xs text-slate-400">{user.email}</span></td>
                        <td className="px-3 py-4"><Badge variant="outline">{user.role}</Badge></td>
                        <td className="px-3 py-4">{user.area}</td>
                        <td className="px-3 py-4">
                          <span className={user.status === 'Đã khóa' ? 'text-red-600' : 'text-emerald-600'}>{user.status}</span>
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-500">{user.joined}</td>
                        <td className="relative px-3 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => setMenu(menu === user.email ? null : user.email)}><MoreHorizontal /></Button>
                          {menu === user.email && (
                            <div className="absolute right-3 top-12 z-10 w-56 rounded-xl border bg-white p-1.5 text-left shadow-lg">
                              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setNotice(`Đã đổi role ${user.name}`); setMenu(null) }}>Đổi role (Tenant ↔ Seller)</button>
                              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setNotice(`Đã gán khu vực cho ${user.name}`); setMenu(null) }}>Gán khu vực quản lý</button>
                              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setNotice(`Đã reset bảo mật ${user.name}`); setMenu(null) }}>Reset bảo mật</button>
                              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { setNotice(`Đã khóa/mở khóa ${user.name}`); setMenu(null) }}>Khóa / Mở khóa</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        {createManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-lg rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Tạo Manager</CardTitle>
                    <CardDescription>Ví dụ: Manager A duyệt Quận 9, Manager B duyệt Thủ Đức.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCreateManager(false)}><X /></Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input placeholder="Họ tên" />
                <Input placeholder="Email công việc" type="email" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input placeholder="Khu vực" defaultValue="Quận 9" />
                  <Input placeholder="Thành phố" defaultValue="TP.HCM" />
                </div>
                <Button className="bg-emerald-600" onClick={() => { setCreateManager(false); setNotice('Đã tạo Manager và gán khu vực.') }}>Tạo & gán khu vực</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

export function ConfigHub() {
  const [saved, setSaved] = useState(false)
  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Cấu hình danh mục & biểu phí</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Giá gói tin, loại hình phòng, tiện ích, khóa API tích hợp.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Giá gói tin</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {packages.map((p) => (
                <label key={p.id} className="text-sm font-semibold">
                  {p.name}
                  <input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" defaultValue={p.price} />
                </label>
              ))}
              <label className="text-sm font-semibold">Tin VIP 2<input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" defaultValue="399000" /></label>
              <label className="text-sm font-semibold">Tin VIP 3<input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" defaultValue="499000" /></label>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Danh mục BĐS & tiện ích</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs font-bold uppercase text-slate-400">Loại hình phòng</p>
              <div className="mt-2 flex flex-wrap gap-2">{roomTypes.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
              <p className="mt-4 text-xs font-bold uppercase text-slate-400">Tiện ích</p>
              <div className="mt-2 flex flex-wrap gap-2">{amenityCatalog.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader><CardTitle>Thông số API tích hợp</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Map API key<input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" defaultValue="GOONG_MAP_KEY_••••" /></label>
              <label className="text-sm font-semibold">VNPay Terminal ID<input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" defaultValue="VERIRENT001" /></label>
              <label className="text-sm font-semibold">VNPay Secret Hash<input className="mt-1 h-11 w-full rounded-xl border px-3 font-mono font-normal" type="password" defaultValue="hashed-secret" /></label>
              <label className="text-sm font-semibold">SMS/OTP Provider<input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" defaultValue="ESMS / Twilio VN" /></label>
              <Button className="h-11 w-fit rounded-xl bg-emerald-600" onClick={() => setSaved(true)}>Lưu cấu hình</Button>
              {saved && <p className="self-center text-sm text-emerald-700">Đã lưu — thao tác được ghi vào nhật ký audit.</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminLayout>
  )
}

export function AuditHub() {
  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Nhật ký hoạt động</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Ghi thao tác nhạy cảm để chống thông đồng nội bộ: duyệt tin, xóa khiếu nại, đổi quyền, sửa giá gói.</p>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-emerald-600" /> Audit log</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-400">
                <tr>{['Mã', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Loại', 'Thời gian'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-mono text-xs">{l.id}</td>
                    <td className="px-3 py-3">{l.actor}</td>
                    <td className="px-3 py-3">{l.action}</td>
                    <td className="px-3 py-3">{l.target}</td>
                    <td className="px-3 py-3"><Badge variant="outline">{l.type}</Badge></td>
                    <td className="px-3 py-3 text-slate-500">{l.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  )
}
