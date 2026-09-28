'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, BadgeCheck, Check, CheckCircle2, Clock3, FileSearch, Flag, Image as ImageIcon,
  MapPin, MessageSquareWarning, ScanSearch, ShieldAlert, ShieldCheck, X, ZoomIn,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PortalSidebar } from '@/components/portal-sidebar'
import { PortalShell } from '@/components/shells'
import { PageHeader } from '@/components/portal-sidebar'
import { formatVnd, listings, reports, sellerRequests } from '@/lib/data'
import { managerNav } from '@/lib/nav'

export function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allow="manager">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <PortalSidebar
          items={managerNav}
          footer={
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">SLA hôm nay</p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">3h 18m</p>
              <p className="mt-1 text-xs">Trung bình duyệt 1 tin Manager Verified.</p>
            </div>
          }
        />
        <div>{children}</div>
      </div>
    </PortalShell>
  )
}

export function ApprovalQueue() {
  const queue = listings.filter((l) => l.status === 'pending' || l.priceAlert || l.coordMismatch)
  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Thẩm định"
          title="Hàng đợi duyệt bài"
          desc="Sắp xếp theo thời gian. Cảnh báo giá bất thường và toạ độ không khớp địa chỉ."
          actions={<Link href="/manager/approvals" className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800">Mở workspace duyệt</Link>}
        />
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>{['Mã', 'Tin đăng', 'Cảnh báo thông minh', 'Trạng thái', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {listings.filter((l) => l.status === 'pending' || l.status === 'rejected').concat(listings.filter((l) => l.priceAlert && l.status === 'active')).map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{l.id.toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <b>{l.title}</b>
                    <span className="block text-xs text-slate-400">{l.address}</span>
                    <span className="block font-mono text-xs">{formatVnd(l.rent)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {l.priceAlert && <Badge className="w-fit bg-red-100 text-red-700">Giá bất thường — nghi lừa đảo cọc</Badge>}
                      {l.coordMismatch && <Badge className="w-fit bg-amber-100 text-amber-800">Toạ độ không khớp chuỗi địa chỉ</Badge>}
                      {!l.priceAlert && !l.coordMismatch && <span className="text-slate-400">Không có cảnh báo</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{l.status === 'pending' ? 'Chờ duyệt' : l.status === 'rejected' ? 'Đã từ chối' : 'Đang hiển thị'}</td>
                  <td className="px-4 py-3">
                    <Link href="/manager/approvals" className="inline-flex h-7 items-center rounded-lg bg-slate-900 px-2 text-xs text-white">Mở workspace</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </ManagerLayout>
  )
}

function PropertyMap() {
  return (
    <div className="relative h-[220px] overflow-hidden rounded-2xl border bg-[#e8f1e9] bg-[linear-gradient(35deg,transparent_46%,rgba(255,255,255,.9)_47%,rgba(255,255,255,.9)_49%,transparent_50%),linear-gradient(125deg,transparent_42%,rgba(255,255,255,.9)_43%,rgba(255,255,255,.9)_45%,transparent_46%)] bg-[length:130px_110px]">
      <span className="absolute left-[9%] top-[62%] text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">Thảo Điền</span>
      <div className="absolute left-[57%] top-[41%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="flex size-11 rotate-45 items-center justify-center rounded-full rounded-br-none bg-emerald-600 text-white shadow-lg">
          <MapPin className="-rotate-45" />
        </div>
        <span className="mt-3 rounded-full bg-white px-3 py-1 text-[10px] font-bold shadow">Cửa vào khai báo</span>
      </div>
    </div>
  )
}

export function ApprovalWorkspace() {
  const [checks, setChecks] = useState([true, true, false])
  const [approved, setApproved] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [reason, setReason] = useState('Ảnh không đúng thực tế')
  const [note, setNote] = useState('')
  const toggle = (index: number) => setChecks((items) => items.map((value, i) => (i === index ? !value : value)))
  const listing = listings[0]

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Thẩm định / VR-1052</p>
            <h1 className="text-3xl font-bold">Workspace thẩm định tin đăng</h1>
            <p className="mt-2 text-sm text-slate-500">Đối soát ảnh, giá, địa chỉ trước khi cấp badge Manager Verified.</p>
          </div>
          <Badge variant="outline" className="gap-2 bg-white py-2"><Clock3 className="text-amber-600" /> SLA còn 3h 18m</Badge>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(350px,.7fr)]">
          <Card className="rounded-2xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                {listing.title} <Badge className="bg-emerald-50 text-emerald-700">Chờ duyệt</Badge>
              </CardTitle>
              <CardDescription>Chủ nhà: Minh Anh Realty · Nộp 14/06/2026</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.2fr_.8fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Đối soát hình ảnh</h3>
                  <Button variant="outline" size="sm"><ScanSearch /> Reverse image</Button>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                  <img src={listing.image} alt="Ảnh thẩm định" className="h-[360px] w-full object-cover" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <Badge className="bg-emerald-600 text-white">Ảnh gốc</Badge>
                    <Badge variant="secondary" className="bg-white/90">Zoom · 1/5</Badge>
                  </div>
                  <Button size="icon" variant="secondary" className="absolute right-4 bottom-4 bg-white/90"><ZoomIn /></Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Khớp mạng: không phát hiện ảnh stock. Metadata GPS khớp ghim bản đồ.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border bg-slate-50 p-4 text-xs">
                  <div className="mb-3 flex justify-between"><h3 className="font-bold">Metadata</h3><Badge className="bg-emerald-50 text-emerald-700">Có GPS</Badge></div>
                  <p>Thiết bị: iPhone 15 Pro</p>
                  <p className="mt-1 font-mono">10.7769, 106.7009</p>
                  <p className="mt-1">Toàn vẹn: không phát hiện chỉnh sửa</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <AlertTriangle className="mb-1 inline size-4" /> Ảnh đồng hồ chụp sau ảnh phòng 12 phút — trong ngưỡng chấp nhận.
                </div>
              </div>
            </CardContent>
          </Card>
          <aside className="flex flex-col gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Đối soát giá & địa chỉ</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <PropertyMap />
                <p className="text-sm">{listing.address}</p>
                <p className="font-mono text-xs text-slate-400">{listing.lat}, {listing.lng}</p>
                <Separator />
                {[['Thuê tháng', formatVnd(listing.rent)], ['Điện', `${formatVnd(listing.electricity)}/kWh`], ['Nước', formatVnd(listing.water)], ['Quản lý', formatVnd(listing.managementFee)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-mono font-semibold">{v}</span></div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="text-amber-600" /> Hành động duyệt</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                {['Địa chỉ khớp toạ độ', 'Bảng giá đã rõ ràng', 'Ảnh vượt kiểm tra trùng mạng'].map((label, i) => (
                  <button key={label} type="button" onClick={() => toggle(i)} className="flex items-center gap-3 rounded-xl border p-3 text-left text-sm">
                    <span className={`flex size-5 items-center justify-center rounded-full ${checks[i] ? 'bg-emerald-600 text-white' : 'border'}`}>{checks[i] && <Check />}</span>
                    {label}
                  </button>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 bg-slate-50/70 p-5">
                <Button disabled={!checks.every(Boolean)} onClick={() => setApproved(true)} className="w-full rounded-xl bg-emerald-600 py-6">
                  <BadgeCheck data-icon="inline-start" /> {approved ? 'Đã cấp Manager Verified' : 'Phê duyệt & cấp Verified'}
                </Button>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-xl border px-3 text-xs">
                  <option>Ảnh không đúng thực tế</option>
                  <option>Địa chỉ sai / không tìm thấy</option>
                  <option>Bảng giá chưa rõ ràng</option>
                </select>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16 rounded-xl border p-2 text-sm" placeholder="Ghi chú gửi Seller..." />
                <Button variant="outline" onClick={() => setRejected(true)} className="w-full border-red-200 text-red-700">
                  <Flag data-icon="inline-start" /> Yêu cầu sửa / Từ chối
                </Button>
                {rejected && <p className="w-full rounded-lg bg-red-50 p-3 text-xs text-red-700"><b>Đã gửi phản hồi.</b> {reason}. {note}</p>}
              </CardFooter>
            </Card>
          </aside>
        </div>
      </main>
    </ManagerLayout>
  )
}

export function ReportsCenter() {
  const [selected, setSelected] = useState<(typeof reports)[number] | null>(null)
  const [action, setAction] = useState('')
  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Xử lý khiếu nại & báo cáo</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Tenant bấm “Báo cáo vi phạm”. Manager có thể cảnh cáo, tạm khóa, gỡ bài hoặc chuyển Admin cấm tài khoản.</p>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Mở</p><p className="mt-2 text-3xl font-bold">18</p></CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Nghiêm trọng</p><p className="mt-2 text-3xl font-bold text-red-700">2</p></CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Đã xử lý tuần này</p><p className="mt-2 text-3xl font-bold text-emerald-700">34</p></CardContent></Card>
        </div>
        <Card className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>{['Mức', 'Sự việc', 'Lý do', 'Tin', 'Người báo', ''].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-6 py-4"><Badge className={issue.tone === 'critical' ? 'bg-red-100 text-red-700' : issue.tone === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100'}>{issue.severity}</Badge></td>
                    <td className="px-6 py-4"><b>{issue.title}</b><span className="block font-mono text-xs text-slate-400">{issue.id}</span></td>
                    <td className="px-6 py-4">{issue.reason}</td>
                    <td className="px-6 py-4">{issue.listing}</td>
                    <td className="px-6 py-4">{issue.reporter}</td>
                    <td className="px-6 py-4 text-right"><Button variant="outline" size="sm" onClick={() => { setSelected(issue); setAction('') }}>Xử lý</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      {selected && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Đóng" className="absolute inset-0 bg-slate-950/25" onClick={() => setSelected(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{selected.id} · {selected.reason}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X /></Button>
            </div>
            <div className="flex flex-col gap-4 p-6 text-sm">
              <p className="rounded-xl bg-slate-50 p-4">“Báo cáo từ {selected.reporter}: {selected.title}.”</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3"><ImageIcon className="mb-2 size-4" /> Ảnh trên web<img src={listings[0].image} alt="" className="mt-2 aspect-video w-full rounded object-cover" /></div>
                <div className="rounded-xl border p-3"><FileSearch className="mb-2 size-4" /> Bằng chứng tenant<img src={listings[1].image} alt="" className="mt-2 aspect-video w-full rounded object-cover grayscale" /></div>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t p-6">
              <Button onClick={() => setAction('Đã gửi cảnh cáo Seller')} className="bg-amber-600 hover:bg-amber-700">Cảnh cáo Seller</Button>
              <Button variant="outline" onClick={() => setAction('Đã tạm khóa bài đăng')}>Tạm khóa bài đăng</Button>
              <Button variant="outline" onClick={() => setAction('Đã gỡ bài đăng')}>Gỡ bài đăng</Button>
              <Button variant="outline" className="border-red-200 text-red-700" onClick={() => setAction('Đã chuyển Admin cấm tài khoản')}>
                <ShieldAlert data-icon="inline-start" /> Chuyển Admin cấm tài khoản
              </Button>
              {action && <p className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700"><Check /> {action} · đã ghi nhật ký</p>}
            </div>
          </aside>
        </div>
      )}
    </ManagerLayout>
  )
}

export function SellerRequestQueue() {
  const [rows, setRows] = useState(sellerRequests)
  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Phê duyệt nâng quyền đối tác</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Kiểm tra CCCD/Hộ chiếu, liên hệ, giấy tờ nhà để chặn tài khoản ảo spam lừa đảo.</p>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>{['Mã', 'Người dùng', 'CCCD', 'Giấy tờ', 'Khu vực', 'Trạng thái', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3"><b>{r.name}</b><span className="block text-xs text-slate-400">{r.phone}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.idNumber}</td>
                  <td className="px-4 py-3">{r.docs}</td>
                  <td className="px-4 py-3">{r.area}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-emerald-600" onClick={() => setRows((items) => items.map((x) => x.id === r.id ? { ...x, status: 'Đã duyệt Seller' } : x))}>Duyệt</Button>
                      <Button size="sm" variant="outline" onClick={() => setRows((items) => items.map((x) => x.id === r.id ? { ...x, status: 'Từ chối' } : x))}>Từ chối</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </ManagerLayout>
  )
}
