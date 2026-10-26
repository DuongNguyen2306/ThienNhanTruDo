'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity, AlertTriangle, BadgeCheck, BarChart3, Bell, BellOff, Check, CheckCircle2, Clock3, FileText, FileSearch, Flag, Home,
  Image as ImageIcon, ListChecks, MapPin, MessageSquareWarning, Megaphone, Package, RefreshCw,
  ScanSearch, ShieldAlert, ShieldCheck, Trash2, Users2, X, ZoomIn,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/portal-sidebar'
import { formatVnd } from '@/lib/data'
import { getBackendUrl, managerApi, notificationApi, type AuditLog, type Listing, type Notification, type Report, type SellerRequest } from '@/lib/api'

// Helper to get the first/cover photo URL
function getListingImage(listing: any): string {
  if (!listing) return ''
  // Use first photo from photos array, or image field
  if (listing.photos && listing.photos.length > 0) {
    const firstPhoto = listing.photos[0]
    if (typeof firstPhoto === 'string') {
      return getBackendUrl(firstPhoto)
    }
    return getBackendUrl(firstPhoto.src || '')
  }
  if (listing.image) {
    return getBackendUrl(listing.image)
  }
  return ''
}

// NOTE: ManagerLayout đã được thay thế bằng ManagerPortalShell
// Component này KHÔNG wrap content - chỉ render nội dung trang
// Layout được handle bởi app/manager/layout.tsx → ManagerPortalShell

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
    <main className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Thẩm định"
        title="Hàng đợi duyệt bài"
        desc="Sắp xếp theo thời gian. Cảnh báo giá bất thường và toạ độ không khớp địa chỉ."
        actions={<Link href="/manager/approvals" className="inline-flex h-9 items-center rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none">Mở workspace duyệt</Link>}
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
                      <Link href="/manager/approvals" className="inline-flex h-7 items-center rounded-lg border-[2px] border-[#151515] bg-white px-2 text-xs font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none">Mở workspace</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
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
      <main className="flex h-96 items-center justify-center">
        <p className="text-[#151515]/50">Đang tải...</p>
      </main>
    )
  }

  if (!selectedListing) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-20">
          <CheckCircle2 className="size-16 text-emerald-500" />
          <h2 className="text-2xl font-bold">Không có tin nào cần duyệt</h2>
          <p className="text-[#151515]/50">Tất cả tin đăng đã được xử lý.</p>
          <Link href="/manager" className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none">Quay lại</Link>
        </main>
    )
  }

  const listing = selectedListing

  return (
    <main className="flex flex-col gap-6">
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#151515]/50">{listings.length} tin chờ duyệt</p>
          <h1 className="text-3xl font-bold">Workspace thẩm định tin đăng</h1>
          <p className="mt-2 text-sm text-[#151515]/60">Đối soát ảnh, giá, địa chỉ trước khi cấp badge Manager Verified.</p>
        </div>
        <Badge variant="outline" className="gap-2 border-[2px] border-[#151515] bg-white py-2"><Clock3 className="text-amber-600" /> SLA còn 3h 18m</Badge>
      </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(350px,.7fr)]">
          <Card className="rounded-2xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                {listing.title} <Badge className="bg-emerald-50 text-emerald-700">Chờ duyệt</Badge>
              </CardTitle>
              <CardDescription>{listing.district}, {listing.city}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.2fr_.8fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Đối soát hình ảnh</h3>
                  <Button variant="outline" size="sm"><ScanSearch /> Reverse image</Button>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                  {getListingImage(listing) ? (
                    <img src={getListingImage(listing)} alt="Ảnh thẩm định" className="h-[360px] w-full object-cover" />
                  ) : (
                    <div className="flex h-[360px] w-full items-center justify-center bg-slate-800 text-white">
                      Không có ảnh
                    </div>
                  )}
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
  )
}

export function ReportsCenter() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch reports
  const fetchReports = async (status = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const data = await managerApi.getReports(status) as { reports: Report[] }
      setReports(data.reports || [])
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error?.status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else if (error?.status === 403) {
        setError('Bạn không có quyền xem danh sách báo cáo.')
      } else {
        setError('Không thể tải danh sách báo cáo. Vui lòng thử lại.')
      }
      console.error('Fetch reports error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [statusFilter])

  // Filter by search
  const filteredReports = debouncedSearch
    ? reports.filter(r =>
        r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.reason.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.reporter?.fullName?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : reports

  // Stats
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    investigating: reports.filter(r => r.status === 'investigating').length,
    resolved: reports.filter(r => r.status === 'resolved' || r.status === 'dismissed').length,
  }

  // Severity badge styles
  const severityStyles: Record<string, string> = {
    critical: 'bg-red-500 text-white font-bold',
    high: 'bg-amber-500 text-white font-bold',
    medium: 'bg-blue-500 text-white font-bold',
    low: 'bg-slate-400 text-white font-bold',
  }

  // Status badge styles
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    investigating: 'bg-blue-100 text-blue-800 border-blue-300',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dismissed: 'bg-slate-100 text-slate-600 border-slate-300',
  }

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    investigating: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    dismissed: 'Đã đóng',
  }

  // Filter tabs
  const filterTabs = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chờ xử lý', count: stats.pending },
    { key: 'investigating', label: 'Đang xử lý', count: stats.investigating },
    { key: 'resolved', label: 'Đã giải quyết', count: stats.resolved },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Cổng quản trị</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#151515]">Quản lý báo cáo vi phạm</h1>
        <p className="mt-1 text-sm text-[#151515]/60">
          Theo dõi và xử lý các phản ánh về tin đăng, chủ trọ và hoạt động trên hệ thống.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Tổng báo cáo */}
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <div className="flex items-center gap-3 border-b border-[#151515]/10 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#151515] text-white">
              <Flag className="size-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Tổng báo cáo</span>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-[#151515]">{stats.total}</p>
            <p className="mt-1 text-xs text-[#151515]/50">Tin đăng, chủ trọ, hoạt động</p>
          </div>
        </div>

        {/* Chờ xử lý */}
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <div className="flex items-center gap-3 border-b border-[#151515]/10 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Clock3 className="size-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Chờ xử lý</span>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-amber-600">{stats.pending}</p>
            <p className="mt-1 text-xs text-[#151515]/50">Cần ưu tiên xử lý</p>
          </div>
        </div>

        {/* Đang xử lý */}
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <div className="flex items-center gap-3 border-b border-[#151515]/10 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500 text-white">
              <ScanSearch className="size-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Đang xử lý</span>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-blue-600">{stats.investigating}</p>
            <p className="mt-1 text-xs text-[#151515]/50">Đang xác minh thông tin</p>
          </div>
        </div>

        {/* Đã giải quyết */}
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <div className="flex items-center gap-3 border-b border-[#151515]/10 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <CheckCircle2 className="size-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Đã giải quyết</span>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-emerald-600">{stats.resolved}</p>
            <p className="mt-1 text-xs text-[#151515]/50">Đã xử lý hoặc bác bỏ</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm mã báo cáo, tin đăng, người gửi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] py-3 pl-11 pr-10 text-sm outline-none placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:ring-2 focus:ring-[#FDE047]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-[#151515]/10"
            >
              <X className="size-4 text-[#151515]/40" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                statusFilter === tab.key
                  ? 'border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                  : 'border-[2px] border-[#151515]/20 bg-white text-[#151515]/60 hover:border-[#151515]/40 hover:bg-[#F5F5F0]'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                statusFilter === tab.key ? 'bg-[#151515] text-white' : 'bg-[#151515]/10'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {/* Table Header */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 flex-col gap-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex animate-pulse gap-4">
                  <div className="h-12 w-24 rounded-lg bg-slate-200" />
                  <div className="h-12 flex-1 rounded-lg bg-slate-200" />
                  <div className="h-12 w-32 rounded-lg bg-slate-200" />
                  <div className="h-12 w-24 rounded-lg bg-slate-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 p-6">
              <AlertTriangle className="size-12 text-red-500" />
              <p className="text-center text-sm text-[#151515]/60">{error}</p>
              <Button
                onClick={() => fetchReports()}
                className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
              >
                Thử lại
              </Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6">
              <Flag className="size-12 text-[#151515]/20" />
              <p className="text-center text-sm text-[#151515]/60">
                {searchQuery || statusFilter !== 'all'
                  ? 'Không có báo cáo vi phạm phù hợp.'
                  : 'Không có báo cáo vi phạm nào.'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="text-sm font-semibold text-emerald-600 underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">BÁO CÁO</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">ĐỐI TƯỢNG</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">NGƯỜI GỬI</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">NGÀY GỬI</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">MỨC ĐỘ</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">TRẠNG THÁI</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151515]/10">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-[#F5F5F0]/50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-[#151515]">{report.title}</p>
                        <p className="mt-0.5 font-mono text-xs text-[#151515]/40">{report.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {report.listingId ? (
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          Tin đăng
                        </span>
                      ) : (
                        <span className="text-xs text-[#151515]/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-[#151515]">{report.reporter?.fullName || '—'}</p>
                        <p className="text-xs text-[#151515]/40">{report.reporter?.phone || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-[#151515]/70">
                        {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-lg px-2 py-1 text-xs font-bold uppercase ${severityStyles[report.severity] || 'bg-slate-400 text-white'}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[report.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[report.status] || report.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/manager/reports/${report.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border-[2px] border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
                      >
                        <ZoomIn className="size-3.5" />
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filteredReports.length > 0 && (
          <div className="flex items-center justify-between border-t-[2px] border-[#151515] px-4 py-3">
            <p className="text-sm text-[#151515]/60">
              Hiển thị <span className="font-semibold">{filteredReports.length}</span> trong <span className="font-semibold">{reports.length}</span> báo cáo
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled
                className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/40 cursor-not-allowed"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="rounded-lg bg-[#FDE047] px-3 py-1 text-sm font-bold">1</span>
              <button
                disabled
                className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/40 cursor-not-allowed"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Report Detail Component
// ============================================
interface ReportDetailProps {
  reportId: string
}

export function ReportDetail({ reportId }: ReportDetailProps) {
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolveAction, setResolveAction] = useState<'resolve' | 'dismiss'>('resolve')
  const [resolveNote, setResolveNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch report detail
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await managerApi.getReportDetail(reportId) as { report: Report }
        setReport(data.report)
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error?.status === 404) {
          setError('Không tìm thấy báo cáo này.')
        } else if (error?.status === 401) {
          setError('Phiên xác thực không hợp lệ. Vui lòng đăng nhập lại.')
        } else if (error?.status === 403) {
          setError('Bạn không có quyền xem báo cáo này.')
        } else {
          setError('Không thể tải chi tiết báo cáo. Vui lòng thử lại.')
        }
        console.error('Fetch report error:', err)
      } finally {
        setLoading(false)
      }
    }
    if (reportId) {
      fetchDetail()
    }
  }, [reportId])

  // Handle resolve/dismiss
  const handleResolve = async () => {
    if (!report) return
    setSubmitting(true)
    try {
      await managerApi.resolveReport(report.id, resolveNote, resolveAction === 'dismiss' ? 'dismiss' : 'resolve')
      setResolveModalOpen(false)
      // Refresh data
      const data = await managerApi.getReportDetail(reportId) as { report: Report }
      setReport(data.report)
      setResolveNote('')
    } catch (err) {
      console.error('Resolve error:', err)
      alert('Không thể xử lý báo cáo. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Severity badge styles
  const severityStyles: Record<string, string> = {
    critical: 'bg-red-500 text-white font-bold',
    high: 'bg-amber-500 text-white font-bold',
    medium: 'bg-blue-500 text-white font-bold',
    low: 'bg-slate-400 text-white font-bold',
  }

  // Status badge styles
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    investigating: 'bg-blue-100 text-blue-800 border-blue-300',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dismissed: 'bg-slate-100 text-slate-600 border-slate-300',
  }

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    investigating: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    dismissed: 'Đã đóng',
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex animate-pulse items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-200" />
          <div className="h-8 w-48 rounded-lg bg-slate-200" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-48 rounded-xl bg-slate-200" />
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
          <div className="space-y-4">
            <div className="h-32 rounded-xl bg-slate-200" />
            <div className="h-48 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <AlertTriangle className="size-16 text-red-500" />
        <p className="text-center text-lg font-semibold text-[#151515]">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/manager/reports')}
            className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
          >
            ← Quay lại danh sách
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // Not found
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <Flag className="size-16 text-[#151515]/20" />
        <p className="text-center text-lg font-semibold text-[#151515]">Không tìm thấy báo cáo</p>
        <button
          onClick={() => router.push('/manager/reports')}
          className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
        >
          ← Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push('/manager/reports')}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-[#151515]/60 transition-colors hover:text-[#151515]"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          ← Quay lại danh sách
        </button>
        
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#151515]">Chi tiết báo cáo vi phạm</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#F5F5F0] px-2 py-1 font-mono text-xs text-[#151515]/60">
                {report.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-sm text-[#151515]/60">
                {new Date(report.createdAt).toLocaleDateString('vi-VN', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </span>
              <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusStyles[report.status] || 'bg-slate-100 text-slate-600'}`}>
                {statusLabels[report.status] || report.status}
              </span>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${severityStyles[report.severity] || 'bg-slate-400 text-white'}`}>
                {report.severity}
              </span>
            </div>
          </div>
          
          {report.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setResolveAction('dismiss'); setResolveModalOpen(true); }}
                className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
              >
                Bác bỏ
              </Button>
              <Button
                onClick={() => { setResolveAction('resolve'); setResolveModalOpen(true); }}
                className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
              >
                Xử lý báo cáo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Report Info Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin báo cáo</h2>
            </div>
            <div className="p-5">
              <div className="grid gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Tiêu đề phản ánh</p>
                  <p className="mt-1 font-semibold text-[#151515]">{report.title}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Nội dung phản ánh</p>
                  <p className="mt-1 text-sm text-[#151515]/80 whitespace-pre-wrap">{report.reason}</p>
                </div>
                {report.tone && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Giọng điệu</p>
                    <p className="mt-1 text-sm text-[#151515]/80">
                      {report.tone === 'urgent' ? 'Khẩn cấp' : report.tone === 'emotional' ? 'Cảm xúc' : 'Trung lập'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reported Object Card */}
          {report.listing && (
            <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
              <div className="border-b border-[#151515]/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Đối tượng bị báo cáo</h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {report.listing && (
                    <>
                      {getListingImage(report.listing) ? (
                        <div className="size-20 rounded-lg bg-slate-100 overflow-hidden">
                          <img 
                            src={getListingImage(report.listing)}
                            alt={report.listing.title}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-20 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="size-8 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-[#151515]">{report.listing.title}</p>
                        <p className="mt-1 text-sm text-[#151515]/60">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.listing.price)}
                        </p>
                        <p className="mt-1 text-xs text-[#151515]/50">
                          Mã: {report.listing.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className={`mt-2 inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          report.listing.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          report.listing.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {report.listing.status === 'active' ? 'Đang hiển thị' :
                           report.listing.status === 'pending' ? 'Chờ duyệt' : report.listing.status}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/listings/${report.listing.id}`}
                    target="_blank"
                    className="rounded-lg border border-[#151515]/20 px-3 py-1.5 text-xs font-semibold text-[#151515]/70 hover:bg-[#F5F5F0]"
                  >
                    Xem tin đăng
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* No Object */}
          {!report.listing && (
            <div className="rounded-xl border-[2px] border-[#151515] bg-white p-8 text-center shadow-[4px_4px_0_#151515]">
              <Flag className="mx-auto size-12 text-[#151515]/20" />
              <p className="mt-3 text-sm text-[#151515]/50">Không có đối tượng cụ thể được liên kết</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Reporter Info Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Người gửi báo cáo</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#FDE047] text-lg font-bold text-[#151515]">
                  {report.reporter?.fullName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-[#151515]">{report.reporter?.fullName || '—'}</p>
                  <p className="text-xs text-[#151515]/50">{report.reporter?.phone || ''}</p>
                </div>
              </div>
              {report.reporter?.role && (
                <div className="mt-3 rounded-lg bg-[#F5F5F0] px-2 py-1 text-xs text-[#151515]/60">
                  Vai trò: {report.reporter.role}
                </div>
              )}
            </div>
          </div>

          {/* Processing Status Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Trạng thái xử lý</h2>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#151515]/60">Trạng thái</span>
                  <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${statusStyles[report.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabels[report.status] || report.status}
                  </span>
                </div>
                {report.resolvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#151515]/60">Ngày xử lý</span>
                    <span className="text-sm text-[#151515]">
                      {new Date(report.resolvedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
                {report.resolution && (
                  <div className="mt-3 rounded-lg bg-[#F5F5F0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Kết quả xử lý</p>
                    <p className="mt-1 text-sm text-[#151515]/80">{report.resolution}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Processing History Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Lịch sử xử lý</h2>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                {/* Report Created */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-2 rounded-full bg-[#151515]" />
                    <div className="h-full w-px bg-[#151515]/20" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#151515]">Báo cáo được gửi</p>
                    <p className="text-[10px] text-[#151515]/50">
                      {new Date(report.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                
                {/* Resolution (if any) */}
                {(report.status === 'resolved' || report.status === 'dismissed') && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-600">
                        {report.status === 'resolved' ? 'Đã xử lý' : 'Đã đóng báo cáo'}
                      </p>
                      {report.resolvedAt && (
                        <p className="text-[10px] text-[#151515]/50">
                          {new Date(report.resolvedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* No history */}
                {report.status === 'pending' && (
                  <p className="text-sm text-[#151515]/50">Chưa có lịch sử xử lý</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h3 className="text-lg font-bold text-[#151515]">
                {resolveAction === 'resolve' ? 'Xử lý báo cáo' : 'Bác bỏ báo cáo'}
              </h3>
            </div>
            <div className="p-5">
              <p className="mb-4 text-sm text-[#151515]/70">
                {resolveAction === 'resolve' 
                  ? 'Bạn đã xác minh nội dung phản ánh và xử lý đối tượng liên quan.'
                  : 'Báo cáo không có cơ sở hoặc không vi phạm chính sách.'}
              </p>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Ghi chú xử lý (không bắt buộc)
                </label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Nhập ghi chú về quyết định xử lý..."
                  rows={3}
                  className="mt-2 w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-3 text-sm outline-none placeholder:text-[#151515]/40"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#151515]/10 px-5 py-4">
              <Button
                variant="outline"
                onClick={() => setResolveModalOpen(false)}
                disabled={submitting}
                className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                Hủy
              </Button>
              <Button
                onClick={handleResolve}
                disabled={submitting}
                className={`rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50 ${
                  resolveAction === 'resolve' 
                    ? 'bg-[#FDE047] text-[#151515]' 
                    : 'bg-slate-200 text-[#151515]'
                }`}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Audit Log Viewer Component
// ============================================
interface AuditLogViewerProps {
  initialPage?: number
}

export function AuditLogViewer({ initialPage = 1 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch audit logs
  const fetchLogs = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await managerApi.getAudit(page) as { logs: AuditLog[]; pagination: typeof pagination }
      setLogs(data.logs || [])
      setPagination(data.pagination)
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error?.status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else if (error?.status === 403) {
        setError('Bạn không có quyền xem nhật ký hoạt động.')
      } else {
        setError('Không thể tải nhật ký hoạt động. Vui lòng thử lại.')
      }
      console.error('Fetch audit logs error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(pagination.page)
  }, [])

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = debouncedSearch
      ? (log.actor?.fullName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
         log.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
         log.target?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
         log.targetType?.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : true
    const matchesAction = actionFilter === 'all' || log.action === actionFilter || log.targetType === actionFilter
    return matchesSearch && matchesAction
  })

  // Action labels mapping
  const actionLabels: Record<string, string> = {
    approved: 'Duyệt',
    rejected: 'Từ chối',
    created: 'Tạo mới',
    updated: 'Cập nhật',
    deleted: 'Xóa',
    resolved: 'Xử lý',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
  }

  // Action badge styles
  const actionStyles: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
    created: 'bg-blue-100 text-blue-700 border-blue-300',
    updated: 'bg-amber-100 text-amber-700 border-amber-300',
    deleted: 'bg-red-100 text-red-700 border-red-300',
    resolved: 'bg-purple-100 text-purple-700 border-purple-300',
    login: 'bg-slate-100 text-slate-600 border-slate-300',
    logout: 'bg-slate-100 text-slate-600 border-slate-300',
  }

  // Target type labels
  const targetTypeLabels: Record<string, string> = {
    listing: 'Tin đăng',
    user: 'Người dùng',
    seller_profile: 'Chủ trọ',
    report: 'Báo cáo',
    transaction: 'Giao dịch',
  }

  // Unique actions for filter
  const uniqueActions = [...new Set(logs.map(log => log.action))]

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Cổng quản trị</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#151515]">Nhật ký hoạt động</h1>
        <p className="mt-1 text-sm text-[#151515]/60">
          Theo dõi lịch sử thao tác và các thay đổi quan trọng trên hệ thống.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm người thực hiện, hành động, đối tượng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] py-3 pl-11 pr-10 text-sm outline-none placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:ring-2 focus:ring-[#FDE047]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-[#151515]/10"
            >
              <X className="size-4 text-[#151515]/40" />
            </button>
          )}
        </div>

        {/* Action Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              actionFilter === 'all'
                ? 'border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                : 'border-[2px] border-[#151515]/20 bg-white text-[#151515]/60 hover:border-[#151515]/40'
            }`}
          >
            Tất cả
          </button>
          {uniqueActions.map(action => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                actionFilter === action
                  ? 'border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                  : 'border-[2px] border-[#151515]/20 bg-white text-[#151515]/60 hover:border-[#151515]/40'
              }`}
            >
              {actionLabels[action] || action}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col gap-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex animate-pulse gap-4">
                  <div className="h-12 w-32 rounded-lg bg-slate-200" />
                  <div className="h-12 w-24 rounded-lg bg-slate-200" />
                  <div className="h-12 flex-1 rounded-lg bg-slate-200" />
                  <div className="h-12 w-24 rounded-lg bg-slate-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 p-6">
              <AlertTriangle className="size-12 text-red-500" />
              <p className="text-center text-sm text-[#151515]/60">{error}</p>
              <Button
                onClick={() => fetchLogs(pagination.page)}
                className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
              >
                Thử lại
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6">
              <Activity className="size-12 text-[#151515]/20" />
              <p className="text-center text-sm text-[#151515]/60">
                {searchQuery || actionFilter !== 'all'
                  ? 'Không có nhật ký hoạt động phù hợp.'
                  : 'Chưa có nhật ký hoạt động nào.'}
              </p>
              {(searchQuery || actionFilter !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setActionFilter('all'); }}
                  className="text-sm font-semibold text-emerald-600 underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b-[2px] border-[#151515] bg-[#F5F5F0]">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">THỜI GIAN</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">NGƯỜI THỰC HIỆN</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">HÀNH ĐỘNG</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">ĐỐI TƯỢNG</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#151515]/60">CHI TIẾT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151515]/10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F5F0]/50">
                    <td className="px-4 py-4">
                      <span className="text-sm text-[#151515]/70">
                        {new Date(log.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </span>
                      <span className="ml-2 text-xs text-[#151515]/40">
                        {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-[#FDE047] text-xs font-bold text-[#151515]">
                          {log.actor?.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-[#151515]">{log.actor?.fullName || '—'}</p>
                          <p className="text-xs text-[#151515]/40">{log.actor?.role || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-lg border px-2 py-1 text-xs font-semibold ${actionStyles[log.action] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-[#151515]">
                          {targetTypeLabels[log.targetType || ''] || log.targetType || '—'}
                        </p>
                        {log.target && (
                          <p className="font-mono text-xs text-[#151515]/40">{log.target.slice(0, 8).toUpperCase()}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-[#151515]/20 px-2 py-1 text-xs font-semibold text-[#151515]/70 hover:bg-[#F5F5F0]"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="flex items-center justify-between border-t-[2px] border-[#151515] px-4 py-3">
            <p className="text-sm text-[#151515]/60">
              Hiển thị <span className="font-semibold">{filteredLogs.length}</span> / <span className="font-semibold">{pagination.total}</span> bản ghi
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515] transition-all hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="rounded-lg bg-[#FDE047] px-3 py-1 text-sm font-bold">{pagination.page}</span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515] transition-all hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="w-full max-w-lg rounded-xl border-[2px] border-[#151515] bg-white shadow-[8px_8px_0_#151515]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#151515]/10 px-5 py-4">
              <h3 className="text-lg font-bold text-[#151515]">Chi tiết nhật ký</h3>
              <button onClick={() => setSelectedLog(null)} className="rounded-full p-1 hover:bg-[#F5F5F0]">
                <X className="size-5 text-[#151515]/60" />
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Thời gian</p>
                    <p className="mt-1 text-sm text-[#151515]">
                      {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Hành động</p>
                    <span className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-xs font-semibold ${actionStyles[selectedLog.action] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Người thực hiện</p>
                  <p className="mt-1 text-sm font-medium text-[#151515]">{selectedLog.actor?.fullName || '—'}</p>
                  <p className="text-xs text-[#151515]/40">{selectedLog.actor?.role || ''}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Đối tượng</p>
                    <p className="mt-1 text-sm text-[#151515]">
                      {targetTypeLabels[selectedLog.targetType || ''] || selectedLog.targetType || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">ID đối tượng</p>
                    <p className="mt-1 font-mono text-xs text-[#151515]/60">{selectedLog.target || '—'}</p>
                  </div>
                </div>
                {selectedLog.details && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">Chi tiết</p>
                    <div className="mt-1 rounded-lg bg-[#F5F5F0] p-3">
                      <pre className="text-xs text-[#151515]/70 whitespace-pre-wrap break-words">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                          } catch {
                            return selectedLog.details
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Notification Center Component
// ============================================
interface NotificationCenterProps {
  initialPage?: number
  title?: string
  description?: string
  eyebrow?: string
}

export function NotificationCenter({ initialPage = 1, title, description, eyebrow }: NotificationCenterProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [markingAllLoading, setMarkingAllLoading] = useState(false)

  // Fetch notifications
  const fetchNotifications = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params: { page: number; type?: string; unreadOnly?: boolean } = { page }
      if (activeTab === 'unread') {
        params.unreadOnly = true
      } else if (activeTab !== 'all') {
        params.type = activeTab
      }
      
      const data = await notificationApi.getAll(params) as {
        notifications: Notification[]
        unreadCount: number
        pagination: typeof pagination
      }
      setNotifications(data.notifications || [])
      setPagination(data.pagination)
      setUnreadCount(data.unreadCount)
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error?.status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else if (error?.status === 403) {
        setError('Bạn không có quyền xem thông báo.')
      } else {
        setError('Không thể tải thông báo. Vui lòng thử lại.')
      }
      console.error('Fetch notifications error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(pagination.page)
  }, [activeTab])

  // Mark as read
  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
      if (link) {
        router.push(link)
      }
    } catch (err) {
      console.error('Mark as read error:', err)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAllLoading(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Mark all as read error:', err)
    } finally {
      setMarkingAllLoading(false)
    }
  }

  // Delete notification
  const handleDelete = async (id: string, wasUnread: boolean) => {
    try {
      await notificationApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Delete notification error:', err)
    }
  }

  // Notification type icons
  const typeIcons: Record<string, React.ReactNode> = {
    tin: <Home className="size-5" />,
    hen: <Clock3 className="size-5" />,
    canhbao: <AlertTriangle className="size-5" />,
    system: <Bell className="size-5" />,
    hopdong: <FileText className="size-5" />,
    coc: <Package className="size-5" />,
  }

  // Notification type labels
  const typeLabels: Record<string, string> = {
    tin: 'Tin đăng',
    hen: 'Lịch hẹn',
    canhbao: 'Cảnh báo',
    system: 'Hệ thống',
    hopdong: 'Hợp đồng',
    coc: 'Đặt chỗ',
  }

  // Notification type colors
  const typeColors: Record<string, string> = {
    tin: 'bg-blue-100 text-blue-600 border-blue-200',
    hen: 'bg-purple-100 text-purple-600 border-purple-200',
    canhbao: 'bg-red-100 text-red-600 border-red-200',
    system: 'bg-slate-100 text-slate-600 border-slate-200',
    hopdong: 'bg-amber-100 text-amber-600 border-amber-200',
    coc: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  }

  // Tab filters
  const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc', count: unreadCount },
    { key: 'tin', label: 'Tin đăng' },
    { key: 'system', label: 'Hệ thống' },
    { key: 'canhbao', label: 'Cảnh báo' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          {eyebrow || 'Cổng quản trị'}
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#151515]">
              {title || 'Trung tâm thông báo'}
            </h1>
            <p className="mt-1 text-sm text-[#151515]/60">
              {description || 'Cập nhật các yêu cầu và hoạt động quan trọng cần bạn theo dõi.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
            >
              <RefreshCw className="size-4" />
              Làm mới
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllLoading}
                className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                {markingAllLoading ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#151515]/10 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                : 'border-[2px] border-[#151515]/20 bg-white text-[#151515]/60 hover:border-[#151515]/40'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border-[2px] border-[#151515] bg-white p-4">
              <div className="flex gap-4">
                <div className="size-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border-[2px] border-red-300 bg-red-50 p-6">
            <AlertTriangle className="size-12 text-red-500" />
            <p className="text-center text-sm text-red-600">{error}</p>
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
            >
              Thử lại
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border-[2px] border-[#151515]/20 bg-white p-6">
            {activeTab === 'unread' ? (
              <>
                <CheckCircle2 className="size-12 text-emerald-500" />
                <p className="text-center text-sm font-medium text-[#151515]">Tất cả thông báo đã được đọc!</p>
              </>
            ) : (
              <>
                <BellOff className="size-12 text-[#151515]/20" />
                <p className="text-center text-sm text-[#151515]/60">
                  {activeTab !== 'all' ? 'Không có thông báo phù hợp.' : 'Bạn chưa có thông báo nào.'}
                </p>
              </>
            )}
            {activeTab !== 'all' && (
              <button
                onClick={() => setActiveTab('all')}
                className="text-sm font-semibold text-emerald-600 underline"
              >
                Xem tất cả thông báo
              </button>
            )}
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`group relative rounded-xl border-[2px] p-4 transition-all ${
                notification.read
                  ? 'border-[#151515]/10 bg-white hover:border-[#151515]/20'
                  : 'border-[#FDE047] bg-[#FDE047]/10 hover:border-[#FDE047]'
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${typeColors[notification.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {typeIcons[notification.type] || <Bell className="size-5" />}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="size-2 shrink-0 rounded-full bg-[#FDE047]" />
                        )}
                        <h3 className={`text-sm ${notification.read ? 'font-medium text-[#151515]/70' : 'font-bold text-[#151515]'}`}>
                          {notification.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-[#151515]/60">{notification.body}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-[#151515]/40">
                          {new Date(notification.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeColors[notification.type] || 'bg-slate-100 text-slate-600'}`}>
                          {typeLabels[notification.type] || notification.type}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id, notification.link)}
                          className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/60 opacity-0 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id, !notification.read)}
                        className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/60 opacity-0 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read indicator hover */}
              {notification.read && notification.link && (
                <button
                  onClick={() => router.push(notification.link!)}
                  className="absolute inset-0 rounded-xl focus:ring-2 focus:ring-[#FDE047] focus:ring-offset-2"
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && notifications.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border-[2px] border-[#151515] bg-white px-4 py-3">
          <p className="text-sm text-[#151515]/60">
            Hiển thị <span className="font-semibold">{notifications.length}</span> / <span className="font-semibold">{pagination.total}</span> thông báo
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515] transition-all hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="rounded-lg bg-[#FDE047] px-3 py-1 text-sm font-bold">{pagination.page}</span>
            <button
              onClick={() => fetchNotifications(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515] transition-all hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
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
  )
}

// ===========================================
// MANAGER DASHBOARD - UI-23
// ===========================================

// NOTE: ManagerDashboard now uses REAL data from API (managerApi)
// - Stats from managerApi.getStats()
// - Pending listings from managerApi.getApprovals('pending')
// - Pending sellers from managerApi.getSellerRequests('pending')
// - Pending reports from managerApi.getReports('pending')
// - Recent activities from managerApi.getAudit()

// Removed: managerDashboardFixtures (mock data) - NO LONGER USED

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">{label}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FDE047] text-sm">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-black text-[#151515]">{value}</div>
    </div>
  )
}

function PriorityTaskCard({ icon, count, label, href }: { icon: string; count: number; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-xl border-[2px] border-[#151515] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#151515]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FDE047] text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-[#151515]">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">{count}</span>
        <svg className="size-4 shrink-0 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  )
}

function ActivityItem({ time, user, action }: { time: string; user: string; action: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[10px] font-bold text-white">{time}</div>
        <div className="mt-1 h-6 w-[2px] bg-[#151515]/10 last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <p className="text-sm text-[#151515]">
          <span className="font-semibold">{user}</span>{' '}
          <span className="text-[#151515]/60">{action}</span>
        </p>
      </div>
    </div>
  )
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium text-[#151515]/60">{label}</span>
      <div className="h-6 flex-1 rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] p-0.5">
        <div
          className="h-full rounded bg-[#FDE047]"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-bold text-[#151515]">{value}%</span>
    </div>
  )
}

export function ManagerDashboard() {
  const [stats, setStats] = useState<{ pendingListings: number; pendingSellers: number; pendingReports: number; processedToday: number } | null>(null)
  const [pendingListings, setPendingListings] = useState<Listing[]>([])
  const [pendingSellers, setPendingSellers] = useState<SellerRequest[]>([])
  const [pendingReports, setPendingReports] = useState<Report[]>([])
  const [recentActivities, setRecentActivities] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all data in parallel
      const [statsData, listingsData, sellersData, reportsData, auditData] = await Promise.allSettled([
        managerApi.getStats(),
        managerApi.getApprovals('pending'),
        managerApi.getSellerRequests('pending'),
        managerApi.getReports('pending'),
        managerApi.getAudit(1),
      ])

      // Process stats
      if (statsData.status === 'fulfilled') {
        const s = statsData.value
        setStats({
          pendingListings: s.pending ?? 0,
          pendingSellers: (sellersData.status === 'fulfilled' ? sellersData.value.requests?.length ?? 0 : 0),
          pendingReports: (reportsData.status === 'fulfilled' ? reportsData.value.reports?.length ?? 0 : 0),
          processedToday: (s.approvedToday ?? 0) + (s.rejectedToday ?? 0),
        })
      }

      // Process pending listings
      if (listingsData.status === 'fulfilled') {
        setPendingListings(listingsData.value.listings?.slice(0, 6) ?? [])
      }

      // Process pending sellers
      if (sellersData.status === 'fulfilled') {
        setPendingSellers(sellersData.value.requests?.slice(0, 5) ?? [])
      }

      // Process pending reports
      if (reportsData.status === 'fulfilled') {
        setPendingReports(reportsData.value.reports?.slice(0, 5) ?? [])
      }

      // Process recent activities
      if (auditData.status === 'fulfilled') {
        setRecentActivities(auditData.value.logs?.slice(0, 8) ?? [])
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/40">
            Trang quản trị <span className="mx-1.5 text-[#151515]/20">/</span> <span className="text-[#151515]/70">Tổng quan</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#151515]">Tổng quan</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border-[2px] border-[#151515] bg-white p-5 shadow-[4px_4px_0_#151515]">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="mt-3 h-8 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="flex h-64 items-center justify-center">
          <p className="text-[#151515]/50">Đang tải dữ liệu...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-col gap-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/40">
            Trang quản trị <span className="mx-1.5 text-[#151515]/20">/</span> <span className="text-[#151515]/70">Tổng quan</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#151515]">Tổng quan</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-[2px] border-red-300 bg-red-50 p-8">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Thử lại
          </button>
        </div>
      </main>
    )
  }

  const safeStats = stats ?? { pendingListings: 0, pendingSellers: 0, pendingReports: 0, processedToday: 0 }

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/40">
          Trang quản trị <span className="mx-1.5 text-[#151515]/20">/</span> <span className="text-[#151515]/70">Tổng quan</span>
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#151515]" >
          Tổng quan
        </h1>
        <p className="mt-2 text-sm text-[#151515]/50">
          Theo dõi hoạt động và xử lý công việc cần duyệt trên hệ thống.
        </p>
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Tin chờ duyệt"
          value={safeStats.pendingListings}
          icon={<ListChecks className="size-4" />}
        />
        <StatCard
          label="Chủ trọ chờ duyệt"
          value={safeStats.pendingSellers}
          icon={<Users2 className="size-4" />}
        />
        <StatCard
          label="Báo cáo chưa xử lý"
          value={safeStats.pendingReports}
          icon={<Flag className="size-4" />}
        />
        <StatCard
          label="Đã xử lý hôm nay"
          value={safeStats.processedToday}
          icon={<Check className="size-4" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Pending Listings Card */}
          <div className="overflow-hidden rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="flex items-center justify-between border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Tin đăng cần duyệt</h2>
              <a href="/manager/approvals" className="text-sm font-semibold text-emerald-600 hover:underline">
                Xem tất cả →
              </a>
            </div>
            <div className="flex gap-4 overflow-x-auto overscroll-x-contain p-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
              {pendingListings.length > 0 ? (
                pendingListings.map((listing) => (
                  <a
                    key={listing.id}
                    href={`/manager/approvals?id=${listing.id}`}
                    className="w-44 shrink-0 rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] transition-all hover:-translate-y-1 hover:border-[#151515] hover:shadow-[3px_3px_0_#151515]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                      <img
                        src={getListingImage(listing)}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                        onError={(e) => { 
                          const target = e.target as HTMLImageElement
                          if (!getListingImage(listing)) {
                            target.style.display = 'none'
                          }
                        }}
                      />
                      {getListingImage(listing) ? null : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-xs text-slate-400">
                          Không có ảnh
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Chờ duyệt
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-[#151515]">{listing.title}</p>
                      <p className="mt-1 text-xs text-[#151515]/40">
                        {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        }) : '-'}
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                <div className="flex w-full items-center justify-center py-8 text-sm text-[#151515]/40">
                  Không có tin đăng nào cần duyệt
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Hoạt động gần đây</h2>
            </div>
            <div className="p-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    time={activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    user={activity.actor?.fullName || 'Hệ thống'}
                    action={activity.action}
                  />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-[#151515]/40">Chưa có hoạt động nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Priority Tasks Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Công việc ưu tiên</h2>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {safeStats.pendingListings > 0 && (
                <PriorityTaskCard
                  icon="📋"
                  count={safeStats.pendingListings}
                  label="Tin đăng chờ duyệt"
                  href="/manager/approvals"
                />
              )}
              {safeStats.pendingSellers > 0 && (
                <PriorityTaskCard
                  icon="👤"
                  count={safeStats.pendingSellers}
                  label="Yêu cầu nâng cấp chủ trọ"
                  href="/manager/seller-requests"
                />
              )}
              {safeStats.pendingReports > 0 && (
                <PriorityTaskCard
                  icon="🚨"
                  count={safeStats.pendingReports}
                  label="Báo cáo vi phạm cần xử lý"
                  href="/manager/reports"
                />
              )}
              {safeStats.pendingListings === 0 && safeStats.pendingSellers === 0 && safeStats.pendingReports === 0 && (
                <p className="py-4 text-center text-sm text-[#151515]/50">Không có công việc ưu tiên</p>
              )}
            </div>
          </div>

          {/* Processing Progress Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Tổng quan hệ thống</h2>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#151515]/60">Tin đăng chờ duyệt</span>
                <span className="font-semibold">{safeStats.pendingListings}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#151515]/60">Chủ trọ chờ duyệt</span>
                <span className="font-semibold">{safeStats.pendingSellers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#151515]/60">Báo cáo chưa xử lý</span>
                <span className="font-semibold">{safeStats.pendingReports}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#151515]/60">Đã xử lý hôm nay</span>
                <span className="font-semibold">{safeStats.processedToday}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ===========================================
// APPROVALS LIST - UI-24
// ===========================================

type ApprovalStatus = 'all' | 'pending' | 'active' | 'rejected'

interface ApprovalListing extends Listing {
  sellerName?: string
  sellerAvatar?: string
}

interface ApprovalsStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

export function ApprovalsList() {
  const router = useRouter()
  const [listings, setListings] = useState<ApprovalListing[]>([])
  const [stats, setStats] = useState<ApprovalsStats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState<ApprovalListing | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchListings = async (status: ApprovalStatus = statusFilter, pageNum: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await managerApi.getApprovals(status === 'all' ? 'pending' : status, pageNum) as { listings: ApprovalListing[]; pagination?: { total: number; totalPages: number } }
      setListings(data.listings || [])
      setTotalPages(data.pagination?.totalPages || 1)

      // Calculate stats from listings
      const all = data.listings || []
      setStats({
        pending: all.filter(l => l.status === 'pending').length,
        approved: all.filter(l => l.status === 'active').length,
        rejected: all.filter(l => l.status === 'rejected').length,
        total: all.length,
      })
    } catch (err) {
      setError('Không thể tải danh sách tin đăng. Vui lòng thử lại.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleRefresh = () => {
    fetchListings(statusFilter, page)
  }

  const handleStatusChange = (newStatus: ApprovalStatus) => {
    setStatusFilter(newStatus)
    setPage(1)
    fetchListings(newStatus, 1)
  }

  const handleApprove = async () => {
    if (!selectedListing) return
    setActionLoading(true)
    try {
      await managerApi.approveListing(selectedListing.id)
      setApproveModalOpen(false)
      setSelectedListing(null)
      fetchListings(statusFilter, page)
    } catch (err) {
      console.error('Approve error:', err)
      alert('Không thể duyệt tin. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedListing || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await managerApi.rejectListing(selectedListing.id, rejectReason)
      setRejectModalOpen(false)
      setRejectReason('')
      setSelectedListing(null)
      fetchListings(statusFilter, page)
    } catch (err) {
      console.error('Reject error:', err)
      alert('Không thể từ chối tin. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const openRejectModal = (listing: ApprovalListing) => {
    setSelectedListing(listing)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const openApproveModal = (listing: ApprovalListing) => {
    setSelectedListing(listing)
    setApproveModalOpen(true)
  }

  // Client-side search filter
  const filteredListings = listings.filter(l =>
    !search ||
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.district?.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase()) ||
    l.sellerName?.toLowerCase().includes(search.toLowerCase())
  )

  const tabs: { key: ApprovalStatus; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'active', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Đã từ chối' },
  ]

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      pending: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-800 border-amber-300' },
      active: { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      rejected: { label: 'Đã từ chối', class: 'bg-red-100 text-red-800 border-red-300' },
    }
    const config = statusConfig[status || 'pending'] || statusConfig.pending
    return (
      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.class}`}>
        {config.label}
      </span>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/40">
            Trang quản trị <span className="mx-1.5 text-[#151515]/20">/</span> <span className="text-[#151515]/70">Duyệt tin đăng</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#151515]" >
            Quản lý duyệt tin
          </h1>
          <p className="mt-2 text-sm text-[#151515]/50">
            Kiểm tra và phê duyệt các tin đăng phòng trọ mới.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          className="shrink-0 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
        >
          Làm mới danh sách
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-[#FDE047] p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Chờ duyệt</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.pending}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Đã duyệt</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.approved}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Đã từ chối</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.rejected}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Tổng tin đăng</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.total}</span>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tên phòng, địa chỉ, chủ trọ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-[2px] border-[#151515] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#FDE047]"
          />
        </div>
        <div className="flex gap-1 rounded-xl border-[2px] border-[#151515] bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                statusFilter === tab.key
                  ? 'bg-[#FDE047] text-[#151515]'
                  : 'text-[#151515]/50 hover:bg-[#F5F5F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#151515]/20 border-t-[#151515]" />
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={handleRefresh} variant="outline" className="rounded-xl border-[2px] border-[#151515]">
              Thử lại
            </Button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <svg className="size-12 text-[#151515]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm text-[#151515]/50">Không có tin đăng phù hợp</p>
            {search && (
              <Button onClick={() => setSearch('')} variant="outline" className="rounded-xl border-[2px] border-[#151515] text-xs">
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[#151515]/10 bg-[#F5F5F0] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Tin đăng</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Chủ trọ</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Giá thuê</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Ngày gửi</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-bold text-[#151515]/60">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151515]/5">
                {filteredListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-[#F5F5F0]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-[#151515]/10">
                          {getListingImage(listing) ? (
                            <img
                              src={getListingImage(listing)}
                              alt={listing.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                              Không có ảnh
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#151515]">{listing.title || 'Không có tiêu đề'}</p>
                          <p className="truncate text-xs text-[#151515]/50">
                            {[listing.houseNumber, listing.street, listing.ward, listing.district].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FDE047] text-[10px] font-bold text-[#151515]">
                          {listing.sellerName?.charAt(0) || 'S'}
                        </div>
                        <span className="text-sm text-[#151515]">{listing.sellerName || 'Chủ trọ'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[#151515]">
                      {listing.rent ? formatVnd(listing.rent) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#151515]/60">
                      {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(listing.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/manager/approvals/${listing.id}`)}
                          className="h-8 rounded-lg border-[2px] border-[#151515] bg-white px-3 text-xs font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
                        >
                          Chi tiết
                        </Button>
                        {listing.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openApproveModal(listing)}
                              className="h-8 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectModal(listing)}
                              className="h-8 rounded-lg border-[2px] border-red-300 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#151515]/50">
            Trang {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(p => Math.max(1, p - 1)); fetchListings(statusFilter, page - 1) }}
              disabled={page === 1}
              className="h-9 rounded-xl border-[2px] border-[#151515] px-3 text-sm font-semibold disabled:opacity-50"
            >
              ← Trước
            </Button>
            <span className="flex h-9 items-center px-3 text-sm font-semibold text-[#151515]">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchListings(statusFilter, page + 1) }}
              disabled={page === totalPages}
              className="h-9 rounded-xl border-[2px] border-[#151515] px-3 text-sm font-semibold disabled:opacity-50"
            >
              Sau →
            </Button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Xác nhận duyệt tin</h2>
            <p className="mt-2 text-sm text-[#151515]/60">
              Bạn có chắc muốn duyệt tin &quot;{selectedListing.title}&quot;?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-xl border-[2px] border-[#151515] bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Duyệt'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Từ chối tin đăng</h2>
            <p className="mt-2 text-sm text-[#151515]/60">
              Vui lòng nhập lý do từ chối cho tin &quot;{selectedListing.title}&quot;:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="mt-4 w-full rounded-xl border-[2px] border-[#151515] p-3 text-sm outline-none focus:border-[#FDE047]"
              rows={4}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ===========================================
// APPROVAL DETAIL - UI-25
// ===========================================

interface ApprovalDetailProps {
  listingId: string
}

// Extended listing type for detail view
interface ListingDetail extends Listing {
  seller?: {
    id: string
    fullName: string
    phone: string
    sellerProfile?: {
      trustScore?: number
      responseRate?: number
      verified?: boolean
    }
  }
}

// Checklist item type
interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export function ApprovalDetail({ listingId }: ApprovalDetailProps) {
  const router = useRouter()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'images', label: 'Hình ảnh rõ nét', checked: false },
    { id: 'description', label: 'Mô tả đầy đủ', checked: false },
    { id: 'price', label: 'Giá hợp lý', checked: false },
    { id: 'address', label: 'Địa chỉ chính xác', checked: false },
    { id: 'amenities', label: 'Tiện ích thực tế', checked: false },
  ])
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch listing detail
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await managerApi.getApprovalDetail(listingId) as { listing: ListingDetail }
        if (data.listing) {
          setListing(data.listing)
          // Reset checklist for new listing
          setChecklist([
            { id: 'images', label: 'Hình ảnh rõ nét', checked: false },
            { id: 'description', label: 'Mô tả đầy đủ', checked: false },
            { id: 'price', label: 'Giá hợp lý', checked: false },
            { id: 'address', label: 'Địa chỉ chính xác', checked: false },
            { id: 'amenities', label: 'Tiện ích thực tế', checked: false },
          ])
        } else {
          setError('Không tìm thấy tin đăng này.')
        }
      } catch (err) {
        setError('Không thể tải thông tin tin đăng. Vui lòng thử lại.')
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    if (listingId) {
      fetchDetail()
    }
  }, [listingId])

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const handleApprove = async () => {
    if (!listing) return
    setActionLoading(true)
    try {
      await managerApi.approveListing(listing.id)
      setApproveModalOpen(false)
      // Update local state
      setListing(prev => prev ? { ...prev, status: 'active' } : null)
    } catch (err) {
      console.error('Approve error:', err)
      alert('Không thể duyệt tin. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!listing || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await managerApi.rejectListing(listing.id, rejectReason)
      setRejectModalOpen(false)
      setRejectReason('')
      // Update local state
      setListing(prev => prev ? { ...prev, status: 'rejected' } : null)
    } catch (err) {
      console.error('Reject error:', err)
      alert('Không thể từ chối tin. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { label: string; class: string }> = {
      pending: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-800 border-amber-300' },
      active: { label: 'Đã duyệt', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      rejected: { label: 'Đã từ chối', class: 'bg-red-100 text-red-800 border-red-300' },
    }
    const c = config[status || 'pending'] || config.pending
    return (
      <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${c.class}`}>
        {c.label}
      </span>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  // Get images array from photos or single image
  const images = listing?.photos?.length 
    ? listing.photos.map((p: any) => typeof p === 'string' ? getBackendUrl(p) : getBackendUrl(p.src || ''))
    : (listing?.image ? [getBackendUrl(listing.image)] : [])
  const canApprove = listing?.status === 'pending'
  const canReject = listing?.status === 'pending'

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#151515]/10" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-80 animate-pulse rounded-xl bg-[#151515]/10" />
            <div className="h-64 animate-pulse rounded-xl bg-[#151515]/10" />
          </div>
          <div className="h-96 animate-pulse rounded-xl bg-[#151515]/10" />
        </div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="flex flex-col items-center justify-center gap-6 py-20">
        <svg className="size-16 text-[#151515]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        <h2 className="text-xl font-bold text-[#151515]">{error || 'Không tìm thấy tin đăng'}</h2>
        <a href="/manager/approvals" className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none">
          Quay lại danh sách
        </a>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <a href="/manager/approvals" className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none">
              <svg className="size-5 text-[#151515]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-[#151515]" >
                  Chi tiết tin đăng
                </h1>
                {getStatusBadge(listing.status)}
              </div>
              <p className="mt-1 text-sm text-[#151515]/50">
                Yêu cầu duyệt lúc: {formatDate(listing.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#151515]/40">Mã tin</p>
          <p className="font-mono text-sm font-bold text-[#151515]">{listing.id?.slice(0, 12).toUpperCase()}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Image Gallery */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Hình ảnh tin đăng</h2>
            </div>
            <div className="p-5">
              {/* Main Image */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#F5F5F0]">
                <img
                  src={images[selectedImage]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-[#151515] px-2 py-1 text-xs font-bold text-white">
                  {selectedImage + 1} / {images.length}
                </span>
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`size-16 overflow-hidden rounded-lg border-2 transition-all ${
                        idx === selectedImage ? 'border-[#151515] shadow-[2px_2px_0_#151515]' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Listing Details */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin chi tiết</h2>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-[#151515]">{listing.title}</h3>
              <p className="mt-2 flex items-center gap-1 text-sm text-[#151515]/60">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {[listing.houseNumber, listing.street, listing.ward, listing.district, listing.city].filter(Boolean).join(', ')}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#F5F5F0] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Giá thuê</p>
                  <p className="mt-1 text-xl font-black text-[#151515]">{formatVnd(listing.rent)}</p>
                  <p className="text-xs text-[#151515]/40">/tháng</p>
                </div>
                {listing.area && (
                  <div className="rounded-xl bg-[#F5F5F0] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Diện tích</p>
                    <p className="mt-1 text-xl font-black text-[#151515]">{listing.area} m²</p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#151515]/10 p-3 text-center">
                  <p className="text-lg">🏠</p>
                  <p className="mt-1 text-xs text-[#151515]/60">{listing.roomType || 'Phòng trọ'}</p>
                </div>
                {listing.furniture && (
                  <div className="rounded-lg border border-[#151515]/10 p-3 text-center">
                    <p className="text-lg">🛋️</p>
                    <p className="mt-1 text-xs text-[#151515]/60">Có nội thất</p>
                  </div>
                )}
              </div>

              {/* Description - using title/roomType as description */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Thông tin</p>
                <div className="mt-2 space-y-2 text-sm text-[#151515]/80">
                  <p>Loại phòng: <span className="font-semibold">{listing.roomType || 'Phòng trọ'}</span></p>
                  <p>Tầng: <span className="font-semibold">{listing.floor ? `${listing.floor}/${listing.totalFloors || '?'}` : 'Không có thông tin'}</span></p>
                  <p>Chỗ để xe: <span className="font-semibold">{listing.parkingBike ? 'Có' : 'Không'}</span></p>
                  <p>Thú cưng: <span className="font-semibold">{listing.pets ? 'Được phép' : 'Không'}</span></p>
                  <p>Trạng thái: <span className="font-semibold">{listing.vacantNow ? 'Còn trống' : 'Đã thuê'}</span></p>
                  {listing.availableFrom && (
                    <p>Có thể nhận: <span className="font-semibold">{new Date(listing.availableFrom).toLocaleDateString('vi-VN')}</span></p>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Tiện ích</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {listing.amenities.map((amenity, idx) => (
                      <span key={idx} className="rounded-full bg-[#FDE047]/30 px-3 py-1 text-xs font-medium text-[#151515]">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Map Placeholder */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Vị trí</p>
                <div className="mt-2 flex h-40 items-center justify-center rounded-xl border border-[#151515]/10 bg-[#F5F5F0]">
                  {listing.lat && listing.lng ? (
                    <div className="text-center">
                      <svg className="mx-auto size-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="mt-2 text-xs text-[#151515]/60">
                        {listing.lat.toFixed(6)}, {listing.lng.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#151515]/40">Chưa có thông tin vị trí</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Seller Info */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin chủ nhà</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#FDE047] text-lg font-bold text-[#151515]">
                  {listing.seller?.fullName?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#151515]">{listing.seller?.fullName || 'Chủ nhà'}</p>
                    {listing.seller?.sellerProfile?.verified && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Đã xác minh</span>
                    )}
                  </div>
                  <p className="text-xs text-[#151515]/50">Chủ trọ</p>
                </div>
              </div>
              {listing.seller?.phone && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F5F5F0] p-3">
                  <svg className="size-4 text-[#151515]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-mono text-sm">{listing.seller.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Danh sách kiểm tra</h2>
            </div>
            <div className="flex flex-col gap-2 p-5">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className="flex items-center gap-3 rounded-xl border border-[#151515]/10 p-3 text-left transition-all hover:border-[#151515]/30"
                >
                  <span className={`flex size-6 items-center justify-center rounded-lg border-2 ${
                    item.checked 
                      ? 'border-emerald-500 bg-emerald-500 text-white' 
                      : 'border-[#151515]/30'
                  }`}>
                    {item.checked && (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm font-medium ${item.checked ? 'text-emerald-700' : 'text-[#151515]/70'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Decision */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Quyết định duyệt</h2>
            </div>
            <div className="p-5">
              {canApprove || canReject ? (
                <>
                  <p className="mb-4 text-xs text-[#151515]/50">
                    Quyết định sẽ được gửi thông báo đến chủ nhà.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => setApproveModalOpen(true)}
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-[#FDE047] py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
                    >
                      <svg className="mr-2 size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Phê duyệt tin đăng
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      className="w-full rounded-xl border-[2px] border-[#151515] py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                    >
                      <svg className="mr-2 size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Từ chối / Hoàn trả
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-[#F5F5F0] p-4 text-center">
                  <p className="text-sm font-medium text-[#151515]/60">
                    Tin đăng đã được xử lý
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {approveModalOpen && listing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Xác nhận duyệt tin</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{listing.title}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{listing.id?.slice(0, 12).toUpperCase()}</p>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Bạn có chắc muốn phê duyệt tin đăng này?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-xl border-[2px] border-[#151515] bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && listing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Từ chối tin đăng</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{listing.title}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{listing.id?.slice(0, 12).toUpperCase()}</p>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Vui lòng nhập lý do từ chối:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="mt-3 w-full rounded-xl border-[2px] border-[#151515] p-3 text-sm outline-none focus:border-[#FDE047]"
              rows={4}
            />
            {rejectReason && rejectReason.trim().length > 0 && (
              <p className="mt-1 text-xs text-[#151515]/40">
                {rejectReason.length} / 500 ký tự
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ===========================================
// SELLER REQUESTS LIST - UI-26
// ===========================================

type SellerRequestStatus = 'all' | 'pending' | 'active' | 'rejected'

export function SellerRequestsList() {
  const [requests, setRequests] = useState<SellerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SellerRequestStatus>('all')

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SellerRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch requests
  const fetchRequests = async (status: SellerRequestStatus = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const data = await managerApi.getSellerRequests(status === 'all' ? '' : status) as { requests: SellerRequest[] }
      setRequests(data.requests || [])
    } catch (err) {
      setError('Không thể tải danh sách yêu cầu. Vui lòng thử lại.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const handleRefresh = () => {
    fetchRequests(statusFilter)
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    setActionLoading(true)
    try {
      await managerApi.approveSeller(selectedRequest.id)
      setApproveModalOpen(false)
      setSelectedRequest(null)
      fetchRequests(statusFilter)
    } catch (err) {
      console.error('Approve error:', err)
      alert('Không thể chấp thuận yêu cầu. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await managerApi.rejectSeller(selectedRequest.id, rejectReason)
      setRejectModalOpen(false)
      setRejectReason('')
      setSelectedRequest(null)
      fetchRequests(statusFilter)
    } catch (err) {
      console.error('Reject error:', err)
      alert('Không thể từ chối yêu cầu. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const openApproveModal = (request: SellerRequest) => {
    setSelectedRequest(request)
    setApproveModalOpen(true)
  }

  const openRejectModal = (request: SellerRequest) => {
    setSelectedRequest(request)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  // Calculate stats
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => r.status === 'active').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
  }

  // Client-side search filter
  const filteredRequests = requests.filter(r => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      r.user?.fullName?.toLowerCase().includes(searchLower) ||
      r.user?.phone?.includes(search) ||
      r.id?.toLowerCase().includes(searchLower)
    )
  })

  const tabs: { key: SellerRequestStatus; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'active', label: 'Đã chấp thuận' },
    { key: 'rejected', label: 'Đã từ chối' },
  ]

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { label: string; class: string }> = {
      pending: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-800 border-amber-300' },
      active: { label: 'Đã chấp thuận', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      rejected: { label: 'Đã từ chối', class: 'bg-red-100 text-red-800 border-red-300' },
    }
    const c = config[status || 'pending'] || config.pending
    return (
      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.class}`}>
        {c.label}
      </span>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/40">
            Trang quản trị <span className="mx-1.5 text-[#151515]/20">/</span> <span className="text-[#151515]/70">Duyệt chủ trọ</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#151515]" >
            Duyệt yêu cầu chủ trọ
          </h1>
          <p className="mt-2 text-sm text-[#151515]/50">
            Xét duyệt tài khoản đăng ký trở thành người cho thuê trên hệ thống.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          className="shrink-0 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
        >
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-[#FDE047] p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Chờ duyệt</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.pending}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Đã chấp thuận</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.active}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Đã từ chối</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.rejected}</span>
        </div>
        <div className="flex flex-col rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Tổng yêu cầu</span>
          <span className="mt-2 text-3xl font-black text-[#151515]">{stats.total}</span>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tên, số điện thoại, mã yêu cầu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-[2px] border-[#151515] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#FDE047]"
          />
        </div>
        <div className="flex gap-1 rounded-xl border-[2px] border-[#151515] bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                statusFilter === tab.key
                  ? 'bg-[#FDE047] text-[#151515]'
                  : 'text-[#151515]/50 hover:bg-[#F5F5F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#151515]/20 border-t-[#151515]" />
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={handleRefresh} variant="outline" className="rounded-xl border-[2px] border-[#151515]">
              Thử lại
            </Button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <svg className="size-12 text-[#151515]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="text-sm text-[#151515]/50">Không có yêu cầu chủ trọ phù hợp</p>
            {search && (
              <Button onClick={() => setSearch('')} variant="outline" className="rounded-xl border-[2px] border-[#151515] text-xs">
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-[#151515]/10 bg-[#F5F5F0] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Người đăng ký</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Số điện thoại</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Ngày gửi</th>
                  <th className="px-4 py-3 font-bold text-[#151515]/60">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-bold text-[#151515]/60">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151515]/5">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-[#F5F5F0]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDE047] text-sm font-bold text-[#151515]">
                          {request.user?.fullName?.charAt(0) || 'N'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#151515]">{request.user?.fullName || 'Không có tên'}</p>
                          <p className="truncate font-mono text-[10px] text-[#151515]/40">{request.id?.slice(0, 16).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#151515]">
                      {request.user?.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#151515]/60">
                      {formatDate(request.submittedAt || request.user?.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/manager/seller-requests/${request.id}`}
                          className="inline-flex h-8 items-center rounded-lg border-[2px] border-[#151515] bg-white px-3 text-xs font-semibold shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
                        >
                          Xem hồ sơ
                        </Link>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openApproveModal(request)}
                              className="h-8 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectModal(request)}
                              className="h-8 rounded-lg border-[2px] border-red-300 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {filteredRequests.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#151515]/50">
            Hiển thị {filteredRequests.length} / {filteredRequests.length} yêu cầu
          </p>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Xác nhận chấp thuận</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{selectedRequest.user?.fullName}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{selectedRequest.id?.slice(0, 16).toUpperCase()}</p>
              <p className="mt-2 text-sm text-[#151515]/60">{selectedRequest.user?.phone}</p>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Xác nhận nâng cấp tài khoản này thành người cho thuê?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-xl border-[2px] border-[#151515] bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận chấp thuận'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Từ chối yêu cầu chủ trọ</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{selectedRequest.user?.fullName}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{selectedRequest.id?.slice(0, 16).toUpperCase()}</p>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Vui lòng nhập lý do từ chối:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="mt-3 w-full rounded-xl border-[2px] border-[#151515] p-3 text-sm outline-none focus:border-[#FDE047]"
              rows={4}
            />
            {rejectReason && rejectReason.trim().length > 0 && (
              <p className="mt-1 text-xs text-[#151515]/40">
                {rejectReason.length} / 500 ký tự
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}



