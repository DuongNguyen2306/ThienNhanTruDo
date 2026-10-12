'use client'

import { useEffect, useState } from 'react'
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
import { formatVnd } from '@/lib/data'
import { managerApi, type Listing, type Report, type SellerRequest } from '@/lib/api'

export function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allow="manager">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <PortalSidebar
          items={[
            { href: '/manager/approvals', label: 'Duyệt tin' },
            { href: '/manager/seller-requests', label: 'Duyệt chủ nhà' },
            { href: '/manager/reports', label: 'Khiếu nại' },
          ]}
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

export function ApprovalQueue() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerApi.getApprovals('pending')
      .then(({ listings: data }) => setListings(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Không có tin nào chờ duyệt</td></tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{l.id.slice(0, 12).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <b>{l.title}</b>
                      <span className="block text-xs text-slate-400">{l.district}, {l.city}</span>
                      <span className="block font-mono text-xs">{formatVnd(l.rent)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {l.priceAlert && <Badge className="w-fit bg-red-100 text-red-700">Giá bất thường — nghi lừa đảo cọc</Badge>}
                        {l.coordMismatch && <Badge className="w-fit bg-amber-100 text-amber-800">Toạ độ không khớp chuỗi địa chỉ</Badge>}
                        {!l.priceAlert && !l.coordMismatch && <span className="text-slate-400">Không có cảnh báo</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        l.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        l.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        l.status === 'rejected' ? 'bg-red-50 text-red-700' : ''
                      }>
                        {l.status === 'pending' ? 'Chờ duyệt' : l.status === 'active' ? 'Đang hiển thị' : l.status === 'rejected' ? 'Đã từ chối' : l.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/manager/approivals" className="inline-flex h-7 items-center rounded-lg bg-slate-900 px-2 text-xs text-white">Mở workspace</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </ManagerLayout>
  )
}

export function ApprovalWorkspace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [checks, setChecks] = useState([true, true, false])
  const [approved, setApproved] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [reason, setReason] = useState('Ảnh không đúng thực tế')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerApi.getApprovals('pending')
      .then(({ listings: data }) => {
        setListings(data)
        if (data.length > 0) setSelectedListing(data[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggle = (index: number) => setChecks((items) => items.map((value, i) => (i === index ? !value : value)))

  const handleApprove = async () => {
    if (!selectedListing) return
    try {
      await managerApi.approveListing(selectedListing.id, {
        verified: true,
        vip: true,
        highTrust: checks[2],
      })
      setApproved(true)
      // Refresh list
      const { listings: updated } = await managerApi.getApprovals('pending')
      setListings(updated)
      setSelectedListing(updated[0] || null)
    } catch (err) {
      console.error('Approve error:', err)
    }
  }

  const handleReject = async () => {
    if (!selectedListing) return
    try {
      await managerApi.rejectListing(selectedListing.id, `${reason}. ${note}`)
      setRejected(true)
      // Refresh list
      const { listings: updated } = await managerApi.getApprovals('pending')
      setListings(updated)
      setSelectedListing(updated[0] || null)
    } catch (err) {
      console.error('Reject error:', err)
    }
  }

  if (loading) {
    return (
      <ManagerLayout>
        <main className="flex h-96 items-center justify-center">
          <p className="text-slate-400">Đang tải...</p>
        </main>
      </ManagerLayout>
    )
  }

  if (!selectedListing) {
    return (
      <ManagerLayout>
        <main className="flex flex-col items-center justify-center gap-4 py-20">
          <CheckCircle2 className="size-16 text-emerald-500" />
          <h2 className="text-2xl font-bold">Không có tin nào cần duyệt</h2>
          <p className="text-slate-500">Tất cả tin đăng đã được xử lý.</p>
          <Link href="/manager" className="rounded-xl bg-slate-900 px-4 py-2 text-white">Quay lại</Link>
        </main>
      </ManagerLayout>
    )
  }

  const listing = selectedListing

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{listings.length} tin chờ duyệt</p>
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
              <CardDescription>{listing.district}, {listing.city}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.2fr_.8fr]}>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Đối soát hình ảnh</h3>
                  <Button variant="outline" size="sm"><ScanSearch /> Reverse image</Button>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                  <img src={listing.image || '/placeholder.jpg'} alt="Ảnh thẩm định" className="h-[360px] w-full object-cover" />
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
                  <div className="mb-3 flex justify-between"><h3 className="font-bold">Metadata</h3><Badge className="bg-emerald-50 text-emerald-700">{listing.lat && listing.lng ? 'Có GPS' : 'Không có GPS'}</Badge></div>
                  <p>Thiết bị: iPhone 15 Pro</p>
                  <p className="mt-1 font-mono">{listing.lat?.toFixed(6)}, {listing.lng?.toFixed(6)}</p>
                  <p className="mt-1">Toàn vẹn: không phát hiện chỉnh sửa</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <AlertTriangle className="mb-1 inline size-4" /> Thông tin cơ bản đã khai báo đầy đủ.
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
                <p className="text-sm">{[listing.houseNumber, listing.alley, listing.street, listing.ward, listing.district, listing.city].filter(Boolean).join(', ')}</p>
                <p className="font-mono text-xs text-slate-400">{listing.lat?.toFixed(6)}, {listing.lng?.toFixed(6)}</p>
                <Separator />
                {[
                  ['Thuê tháng', formatVnd(listing.rent)],
                  ['Điện', listing.electricity ? `${formatVnd(listing.electricity)}/kWh` : 'Miễn phí'],
                  ['Nước', listing.water ? formatVnd(listing.water) : 'Miễn phí'],
                  ['Quản lý', listing.managementFee ? formatVnd(listing.managementFee) : 'Miễn phí'],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-mono font-semibold">{v}</span></div>
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
                <Button disabled={!checks.every(Boolean) || approved} onClick={handleApprove} className="w-full rounded-xl bg-emerald-600 py-6">
                  <BadgeCheck data-icon="inline-start" /> {approved ? 'Đã cấp Manager Verified' : 'Phê duyệt & cấp Verified'}
                </Button>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-xl border px-3 text-xs">
                  <option>Ảnh không đúng thực tế</option>
                  <option>Địa chỉ sai / không tìm thấy</option>
                  <option>Bảng giá chưa rõ ràng</option>
                </select>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16 rounded-xl border p-2 text-sm" placeholder="Ghi chú gửi Seller..." />
                <Button variant="outline" onClick={handleReject} className="w-full border-red-200 text-red-700">
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
  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerApi.getReports()
      .then(({ reports: data }) => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleResolve = async (actionType: string) => {
    if (!selected) return
    try {
      await managerApi.resolveReport(selected.id, actionType, actionType.includes('cấm') ? 'resolved' : 'resolved')
      setAction(actionType)
      // Refresh
      const { reports: updated } = await managerApi.getReports()
      setReports(updated)
      setSelected(null)
    } catch (err) {
      console.error('Resolve error:', err)
    }
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-800',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-700',
  }

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Xử lý khiếu nại & báo cáo</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Tenant bấm "Báo cáo vi phạm". Manager có thể cảnh cáo, tạm khóa, gỡ bài hoặc chuyển Admin cấm tài khoản.</p>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Mở</p><p className="mt-2 text-3xl font-bold">{reports.filter(r => r.status === 'pending').length}</p></CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Nghiêm trọng</p><p className="mt-2 text-3xl font-bold text-red-700">{reports.filter(r => r.severity === 'critical').length}</p></CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-slate-400">Đã xử lý</p><p className="mt-2 text-3xl font-bold text-emerald-700">{reports.filter(r => r.status === 'resolved').length}</p></CardContent></Card>
        </div>
        <Card className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Đang tải...</div>
            ) : reports.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Không có khiếu nại nào</div>
            ) : (
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>{['Mức', 'Sự việc', 'Lý do', 'Người báo', ''].map((h) => <th key={h} className="px-6 py-4">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((issue) => (
                    <tr key={issue.id}>
                      <td className="px-6 py-4"><Badge className={severityColors[issue.severity] || 'bg-slate-100'}>{issue.severity}</Badge></td>
                      <td className="px-6 py-4"><b>{issue.title}</b><span className="block font-mono text-xs text-slate-400">{issue.id}</span></td>
                      <td className="px-6 py-4">{issue.reason}</td>
                      <td className="px-6 py-4">{issue.reporter?.fullName || '-'}</td>
                      <td className="px-6 py-4 text-right"><Button variant="outline" size="sm" onClick={() => { setSelected(issue); setAction('') }}>Xử lý</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                <p className="mt-1 text-xs text-slate-400">{selected.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X /></Button>
            </div>
            <div className="flex flex-col gap-4 p-6 text-sm">
              <p className="rounded-xl bg-slate-50 p-4">"{selected.title}. {selected.reason}"</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3"><FileSearch className="mb-2 size-4" /> Bằng chứng từ tenant</div>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t p-6">
              <Button onClick={() => handleResolve('Đã gửi cảnh cáo Seller')} className="bg-amber-600 hover:bg-amber-700">Cảnh cáo Seller</Button>
              <Button variant="outline" onClick={() => handleResolve('Đã tạm khóa bài đăng')}>Tạm khóa bài đăng</Button>
              <Button variant="outline" onClick={() => handleResolve('Đã gỡ bài đăng')}>Gỡ bài đăng</Button>
              <Button variant="outline" className="border-red-200 text-red-700" onClick={() => handleResolve('Đã chuyển Admin cấm tài khoản')}>
                <ShieldAlert data-icon="inline-start" /> Chuyển Admin cấm tài khoản
              </Button>
            </div>
          </aside>
        </div>
      )}
    </ManagerLayout>
  )
}

export function SellerRequestQueue() {
  const [requests, setRequests] = useState<SellerRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerApi.getSellerRequests()
      .then(({ requests: data }) => setRequests(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id: string) => {
    try {
      await managerApi.approveSeller(id)
      setRequests(requests.filter(r => r.id !== id))
    } catch (err) {
      console.error('Approve error:', err)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await managerApi.rejectSeller(id)
      setRequests(requests.filter(r => r.id !== id))
    } catch (err) {
      console.error('Reject error:', err)
    }
  }

  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Phê duyệt nâng quyền đối tác</h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">Kiểm tra CCCD/Hộ chiếu, liên hệ, giấy tờ nhà để chặn tài khoản ảo spam lừa đảo.</p>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>{['Mã', 'Người dùng', 'CCCD', 'Khu vực', 'Trạng thái', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Không có yêu cầu nào</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3"><b>{r.user?.fullName}</b><span className="block text-xs text-slate-400">{r.user?.phone}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{r.idNumber || '-'}</td>
                    <td className="px-4 py-3">{r.brand || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        r.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : ''
                      }>
                        {r.status === 'pending' ? 'Chờ duyệt' : r.status === 'active' ? 'Đã duyệt' : r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-emerald-600" onClick={() => handleApprove(r.id)}>Duyệt</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(r.id)}>Từ chối</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </ManagerLayout>
  )
}
