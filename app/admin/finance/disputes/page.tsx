'use client'

import { useMemo, useState } from 'react'
import { ArrowDownToLine, BadgeCheck, ReceiptText, ShieldAlert, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { formatVnd } from '@/lib/data'

const initial = [
  { id: 'DSP-2401', order: 'VR-98231', seller: 'Green Nest Homes', tenant: 'Lê Anh', amount: 4500000, opened: '15/09/2026 · 11:02', reason: 'Phí ẩn ngoài web', status: 'Đang xử lý' },
  { id: 'DSP-2398', order: 'VR-98196', seller: 'The Park View', tenant: 'Phạm Vy', amount: 1200000, opened: '12/09/2026 · 09:18', reason: 'Sai giá so với hợp đồng', status: 'Cần bổ sung' },
  { id: 'DSP-2385', order: 'VR-98170', seller: 'Riverside Home', tenant: 'Đỗ Khoa', amount: 6700000, opened: '10/09/2026 · 17:44', reason: 'Hủy trong 24h', status: 'Đã hoàn tiền' },
  { id: 'DSP-2370', order: 'VR-98012', seller: 'Minh Anh Realty', tenant: 'Trần Minh', amount: 8500000, opened: '07/09/2026 · 14:01', reason: 'Phòng không đúng ảnh', status: 'Từ chối hoàn' },
]

export default function FinanceDisputesPage() {
  const [rows, setRows] = useState(initial)
  const [active, setActive] = useState<(typeof rows)[number] | null>(null)
  const [tab, setTab] = useState('open')
  const [log, setLog] = useState<string>('')

  const visible = useMemo(() => rows.filter((r) => {
    if (tab === 'open') return r.status === 'Đang xử lý' || r.status === 'Cần bổ sung'
    if (tab === 'resolved') return r.status === 'Đã hoàn tiền' || r.status === 'Từ chối hoàn'
    return true
  }), [rows, tab])

  const update = (id: string, status: string, log?: string) => {
    setRows((items) => items.map((r) => r.id === id ? { ...r, status } : r))
    if (log) setLog(log)
  }

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Tài chính"
          title="Tranh chấp hoàn tiền"
          desc="Hoàn tiền qua VNPay khi khiếu nại của tenant được Manager xác nhận có vi phạm."
          actions={<Button variant="outline" className="bg-white"><ArrowDownToLine data-icon="inline-start" /> Xuất báo cáo dispute</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="Đang mở" value="6" tone="amber" />
          <Summary label="Đã hoàn tiền tháng này" value="184.500.000đ" tone="emerald" />
          <Summary label="Từ chối hoàn (có bằng chứng)" value="3" tone="rose" />
        </div>

        {log && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{log}</p>}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="open">Đang mở</TabsTrigger>
            <TabsTrigger value="resolved">Đã xử lý</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <Card className="rounded-2xl">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Mã', 'Đơn hàng', 'Seller', 'Tenant', 'Số tiền', 'Lý do', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" onClick={() => setActive(r)}>
                        <td className="px-3 py-4 font-mono text-xs">{r.id}</td>
                        <td className="px-3 py-4 font-mono text-xs">{r.order}</td>
                        <td className="px-3 py-4">{r.seller}</td>
                        <td className="px-3 py-4">{r.tenant}</td>
                        <td className="px-3 py-4 font-mono font-semibold">{formatVnd(r.amount)}</td>
                        <td className="px-3 py-4 text-xs">{r.reason}</td>
                        <td className="px-3 py-4"><Badge variant="outline">{r.status}</Badge></td>
                        <td className="px-3 py-4 text-right text-xs text-emerald-700">Xem →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-2xl rounded-2xl">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Dispute {active.id}</CardTitle>
                  <CardDescription>Mở {active.opened} · {active.reason}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setActive(null)}><X /></Button>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Seller" value={active.seller} />
                  <Detail label="Tenant" value={active.tenant} />
                  <Detail label="Số tiền" value={formatVnd(active.amount)} />
                  <Detail label="Đơn hàng" value={active.order} />
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Hồ sơ Manager</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                    <li>Ảnh Manager chụp khác ảnh Seller đăng (ngày 12/09/2026).</li>
                    <li>Biên bản đối soát với tenant kèm chữ ký.</li>
                    <li>Lịch sử chat: Seller đòi thêm phí giữ xe 300k ngoài web.</li>
                  </ul>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { update(active.id, 'Từ chối hoàn', `Đã từ chối hoàn ${active.id}`); setActive(null) }}><ShieldAlert data-icon="inline-start" /> Từ chối hoàn</Button>
                  <Button variant="outline" onClick={() => { update(active.id, 'Cần bổ sung', `Đã yêu cầu bổ sung chứng từ ${active.id}`); setActive(null) }}><Sparkles data-icon="inline-start" /> Yêu cầu bổ sung</Button>
                  <Button className="bg-emerald-600" onClick={() => { update(active.id, 'Đã hoàn tiền', `Đã hoàn ${formatVnd(active.amount)} cho ${active.tenant}`); setActive(null) }}><BadgeCheck data-icon="inline-start" /> Hoàn tiền VNPay</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' | 'rose' }) {
  const toneClass = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`mt-2 inline-block rounded-xl px-3 py-1 font-mono text-lg font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
