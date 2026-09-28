'use client'

import { useState } from 'react'
import { Check, ShieldCheck, ShieldAlert, Star, WalletCards, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { sellerRequests } from '@/lib/data'

const additional = [
  { id: 'SR-205', name: 'Lê Khôi', phone: '0908 112 998', idNumber: '079201998765', docs: 'CCCD + Giấy tờ nhà', area: 'Quận 7', submitted: '20/09/2026', status: 'Chờ duyệt' },
  { id: 'SR-198', name: 'Trúc Linh', phone: '0938 776 110', idNumber: '079302001872', docs: 'Hợp đồng ủy quyền', area: 'Bình Thạnh', submitted: '19/09/2026', status: 'Đã duyệt Seller' },
  { id: 'SR-192', name: 'Quang Hà', phone: '0977 005 442', idNumber: '001199008123', docs: 'CCCD (thiếu giấy tờ nhà)', area: 'Quận 9', submitted: '17/09/2026', status: 'Từ chối' },
]

export default function AdminSellersPage() {
  const [rows, setRows] = useState([...sellerRequests, ...additional])
  const [detail, setDetail] = useState<(typeof rows)[number] | null>(null)
  const [tab, setTab] = useState('pending')

  const approve = (id: string) => setRows((items) => items.map((r) => r.id === id ? { ...r, status: 'Đã duyệt Seller' } : r))
  const reject = (id: string) => setRows((items) => items.map((r) => r.id === id ? { ...r, status: 'Từ chối' } : r))

  const visible = rows.filter((r) => {
    if (tab === 'pending') return r.status === 'Chờ duyệt' || r.status === 'Yêu cầu bổ sung'
    if (tab === 'approved') return r.status === 'Đã duyệt Seller'
    if (tab === 'rejected') return r.status === 'Từ chối'
    return true
  })

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Vận hành"
          title="Duyệt nâng quyền Seller"
          desc="Sau khi Manager xác minh CCCD + giấy tờ nhà, Admin cấp quyền đăng tin. Mọi thao tác được audit log."
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="pending">Đang chờ</TabsTrigger>
            <TabsTrigger value="approved">Đã cấp Seller</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <Card className="rounded-2xl">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Mã', 'Người dùng', 'CCCD', 'Giấy tờ', 'Khu vực', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" onClick={() => setDetail(r)}>
                        <td className="px-3 py-4 font-mono text-xs">{r.id}</td>
                        <td className="px-3 py-4"><b>{r.name}</b><span className="mt-1 block text-xs text-slate-400">{r.phone}</span></td>
                        <td className="px-3 py-4 font-mono text-xs">{r.idNumber}</td>
                        <td className="px-3 py-4">{r.docs}</td>
                        <td className="px-3 py-4">{r.area}</td>
                        <td className="px-3 py-4"><Badge variant="outline">{r.status}</Badge></td>
                        <td className="px-3 py-4 text-right text-xs text-emerald-700">Mở hồ sơ →</td>
                      </tr>
                    ))}
                    {visible.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">Không có yêu cầu nào trong mục này.</td></tr>
                    )}
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
                  <CardTitle>Hồ sơ {detail.id}</CardTitle>
                  <CardDescription>{detail.name} · {detail.phone} · CCCD {detail.idNumber}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDetail(null)}><X /></Button>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Khu vực" value={detail.area} />
                  <Detail label="Giấy tờ đính kèm" value={detail.docs} />
                  <Detail label="Ngày nộp" value={detail.submitted} />
                  <Detail label="Trạng thái hiện tại" value={detail.status} />
                </div>
                <div className="rounded-2xl border border-dashed p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ảnh CCCD + giấy tờ nhà (Manager đã xác minh)</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {['CCCD mặt trước', 'CCCD mặt sau', 'Giấy tờ nhà'].map((label) => (
                      <div key={label} className="flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">{label}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Manager đã thẩm định: Khớp CCCD · Khớp địa chỉ nhà · Không có trong blacklist.
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { reject(detail.id); setDetail(null) }}><ShieldAlert data-icon="inline-start" /> Từ chối</Button>
                  <Button className="bg-emerald-600" onClick={() => { approve(detail.id); setDetail(null) }}><ShieldCheck data-icon="inline-start" /> Cấp quyền Seller</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
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
