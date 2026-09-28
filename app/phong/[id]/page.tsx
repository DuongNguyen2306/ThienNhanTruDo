'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  AlertTriangle, BadgeCheck, Calendar, Flag, MapPin, MessageCircle, Phone, QrCode, ShieldCheck, Star, Truck, X,
} from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapBoard } from '@/components/map-board'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { formatVnd, getListing, getSeller, reviews, totalMonthly } from '@/lib/data'

const reportReasons = [
  'Sai giá / đòi thêm phí ẩn',
  'Ảnh mạng / ảnh ảo',
  'Sai địa chỉ',
  'Phòng đã hết mà vẫn để tin',
  'Số điện thoại giả',
]

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const listing = getListing(id)
  const seller = listing ? getSeller(listing.sellerId) : undefined
  const [photo, setPhoto] = useState(0)
  const [people, setPeople] = useState(1)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [report, setReport] = useState(false)
  const [reportReason, setReportReason] = useState(reportReasons[0])
  const [reported, setReported] = useState(false)
  const [qr, setQr] = useState(false)

  const listingReviews = useMemo(() => reviews.filter((r) => r.listingId === listing?.id), [listing?.id])

  if (!listing || !seller) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PublicHeader />
        <p className="p-10 text-center">Không tìm thấy tin đăng.</p>
      </main>
    )
  }

  const sim = totalMonthly(listing, people)
  const current = listing.photos[photo] || { src: listing.image, label: 'Tổng quan', source: 'host' as const }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </button>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          {listing.district} / {listing.ward} / {listing.id.toUpperCase()}
        </p>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{listing.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="size-4 text-emerald-600" /> {listing.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {listing.verified && (
              <Badge className="gap-1 bg-emerald-50 text-emerald-700">
                <BadgeCheck /> Manager Verified
              </Badge>
            )}
            {listing.vip && <Badge className="bg-amber-500 text-white">Tin VIP</Badge>}
            <Button variant="outline" className="rounded-xl" onClick={() => setReport(true)}>
              <Flag data-icon="inline-start" /> Báo cáo vi phạm
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900">
              <Image src={current.src} alt={current.label} width={1200} height={720} className="h-[420px] w-full object-cover" unoptimized />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="-rotate-12 text-5xl font-black text-white/25">THIÊN NHÃN trú đồ</span>
              </div>
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge className={current.source === 'manager' ? 'bg-emerald-600 text-white' : 'bg-white/90 text-slate-800'}>
                  {current.source === 'manager' ? 'Ảnh do Manager kiểm định thực tế' : 'Ảnh do chủ nhà chụp'}
                </Badge>
                {current.highTrust && <Badge className="bg-amber-500 text-white">High Trust · GPS</Badge>}
              </div>
              <p className="absolute bottom-4 left-4 text-xs text-white/80">Watermark hệ thống chống sao chép ảnh</p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {listing.photos.map((p, i) => (
                <button key={p.label} type="button" onClick={() => setPhoto(i)} className={`overflow-hidden rounded-lg border-2 ${i === photo ? 'border-emerald-500' : 'border-transparent'}`}>
                  <Image src={p.src} alt={p.label} width={200} height={120} className="aspect-video w-full object-cover" unoptimized />
                </button>
              ))}
            </div>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle>Bảng minh bạch chi phí</CardTitle>
                <CardDescription>Mọi khoản định kỳ phải công khai. Không còn "liên hệ chủ nhà".</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Tiền thuê hàng tháng', formatVnd(listing.rent)],
                    ['Tiền cọc', `${listing.depositMonths} tháng · ${formatVnd(listing.rent * listing.depositMonths)}`],
                    ['Đơn giá điện', `${formatVnd(listing.electricity)}/kWh · ${listing.electricityType}`],
                    ['Tiền nước', listing.waterType === 'Đầu người' ? `${formatVnd(listing.water)}/người/tháng` : `${formatVnd(listing.water)}/m³`],
                    ['Internet', listing.internet === 0 ? 'Miễn phí' : formatVnd(listing.internet)],
                    ['Phí vệ sinh', listing.sanitation === 0 ? 'Miễn phí' : formatVnd(listing.sanitation)],
                    ['Phí gửi xe máy', listing.parkingBike === 0 ? 'Miễn phí' : formatVnd(listing.parkingBike)],
                    ['Phí gửi ô tô', listing.parkingCar === 0 ? 'Không hỗ trợ' : formatVnd(listing.parkingCar)],
                    ['Phí quản lý', listing.managementFee === 0 ? 'Miễn phí' : formatVnd(listing.managementFee)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-semibold text-slate-800">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-transparent shadow-none">
              <CardContent className="rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#022c22] p-8 text-white shadow-xl shadow-emerald-900/30">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-emerald-300">Mô phỏng chi phí hàng tháng</p>
                      <div className="flex gap-2">
                        {[1, 2].map((n) => (
                          <button key={n} type="button" onClick={() => setPeople(n)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${people === n ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                            {n} người
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="mt-6 font-mono text-5xl font-black tracking-tight">{formatVnd(sim)}</p>
                    <p className="mt-3 text-sm text-white/50">Gồm tiền phòng + điện ước lượng {people === 1 ? '80' : '140'} kWh + nước + phí cố định.</p>
                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <ShieldCheck className="size-5 text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-200">
                        Cam kết hoàn cọc 100% + bù 200.000đ nếu chi phí thực tế khác bảng giá trên web.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    {[
                      ['Tiền phòng', formatVnd(listing.rent)],
                      ['Điện (~80 kWh)', formatVnd(listing.electricity * (people === 1 ? 80 : 140))],
                      ['Nước', formatVnd(listing.water * people)],
                      ['Internet', formatVnd(listing.internet)],
                      ['Phí cố định', formatVnd(listing.sanitation + listing.parkingBike + listing.managementFee)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-8">
                        <span className="text-white/50">{k}</span>
                        <span className="font-medium text-white">{v}</span>
                      </div>
                    ))}
                    <div className="mt-2 h-px bg-white/10" />
                    <div className="flex justify-between gap-8 font-bold">
                      <span>Tổng cộng</span>
                      <span className="text-emerald-300">{formatVnd(sim)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle>Vị trí & địa chỉ chính xác</CardTitle>
                <CardDescription>
                  Số nhà {listing.houseNumber || '—'} · {listing.alley || 'Không có hẻm'} · {listing.street} · {listing.ward} · {listing.district}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <MapBoard
                  height="h-[420px]"
                  pins={[{ id: listing.id, x: 55, y: 42, label: 'Cửa vào' }]}
                  selectedId={listing.id}
                  hint={`Đường rộng ${listing.roadWidth} m · Ô tô ${listing.carAccess ? 'vào được' : 'không vào được'} · Xe tải ${listing.truckAccess ? 'vào được' : 'không vào được'}`}
                />
                <div className="flex flex-col gap-3 text-sm">
                  <p className="flex items-center gap-2"><Truck className="size-4 text-emerald-600" /> Lộ trình tiếp cận: đường {listing.roadWidth} mét.</p>
                  <p>Tiện ích: {listing.amenities.join(', ')}</p>
                  <p>Hướng phòng: {listing.direction} · Diện tích {listing.area} m²</p>
                  <p>Thú cưng: {listing.pets ? 'Được phép' : 'Không cho nuôi'}</p>
                  <p className="font-mono text-xs text-slate-400">{listing.lat.toFixed(6)}, {listing.lng.toFixed(6)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle>Đánh giá & phản hồi</CardTitle>
                <CardDescription>Chỉ tenant đã từng liên hệ/ở thực tế mới được để lại đánh giá.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {listingReviews.length === 0 && <p className="text-sm text-slate-500">Chưa có đánh giá đủ điều kiện.</p>}
                {listingReviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <b>{r.author}</b>
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star className="size-3.5 fill-amber-500" /> {r.score}.0
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{r.text}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-4">
                      <span>Giống ảnh: {r.photoMatch}/5</span>
                      <span>Thái độ chủ: {r.landlord}/5</span>
                      <span>An ninh: {r.security}/5</span>
                      <span>Vệ sinh: {r.hygiene}/5</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
              {/* Price header */}
              <div className="rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">Giá thuê / tháng</p>
                <p className="mt-1 font-mono text-3xl font-black">{formatVnd(listing.rent)}</p>
                <p className="mt-1 text-sm text-emerald-100">Cọc {listing.depositMonths} tháng · {formatVnd(listing.rent * listing.depositMonths)}</p>
              </div>
              {/* Seller */}
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 font-bold text-white shadow-md">
                    {seller.name.slice(0, 2)}
                  </span>
                  <div>
                    <b className="text-base">{seller.name}</b>
                    {seller.verified && (
                      <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <BadgeCheck className="size-3.5" /> Seller đã định danh
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <p className="text-xs text-slate-400">Phản hồi</p>
                    <p className="font-bold text-emerald-600">{seller.responseRate}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <p className="text-xs text-slate-400">Điểm uy tín</p>
                    <p className="font-bold text-amber-600">{seller.trustScore}/5</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button className="h-11 flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500" onClick={() => setBooking(true)}>
                    <Calendar className="mr-2 size-4" /> Đặt hẹn
                  </Button>
                  <Button variant="outline" className="h-11 w-11 rounded-xl p-0" onClick={() => window.location.href = `tel:${seller.phone}`}>
                    <Phone className="size-4" />
                  </Button>
                  <Button variant="outline" className="h-11 w-11 rounded-xl p-0" onClick={() => setQr(true)}>
                    <MessageCircle className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" />
                <p className="font-semibold text-emerald-800">Cam kết minh bạch</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                Nếu chi phí thực tế khác bảng giá, bạn được hoàn cọc <b>100%</b> + bù <b>200.000đ</b>.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <PublicFooter />

      {booking && (
        <Modal title="Đặt lịch hẹn xem phòng" onClose={() => setBooking(false)}>
          <p className="text-sm text-slate-500">Yêu cầu sẽ gửi tới {seller.name}. Trạng thái: Chờ duyệt.</p>
          <input className="h-11 rounded-xl border px-3" defaultValue="29/09/2026" />
          <input className="h-11 rounded-xl border px-3" defaultValue="10:00" />
          <input className="h-11 rounded-xl border px-3" placeholder="Số điện thoại liên hệ (OTP)" defaultValue="0918 334 221" />
          <Button className="h-11 rounded-xl bg-emerald-600" onClick={() => { setBooked(true); setBooking(false); router.push('/tai-khoan/lich-hen') }}>
            Gửi yêu cầu hẹn
          </Button>
        </Modal>
      )}
      {qr && (
        <Modal title="Tải app để chat realtime" onClose={() => setQr(false)}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-40 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <QrCode className="size-24" />
            </div>
            <p className="text-center text-sm text-slate-500">Quét mã VietQR/App Thiên Nhãn trú đồ để nhắn tin với chủ nhà đã định danh.</p>
          </div>
        </Modal>
      )}
      {report && (
        <Modal title="Báo cáo vi phạm tin đăng" onClose={() => setReport(false)}>
          <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="h-11 rounded-xl border px-3">
            {reportReasons.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea className="min-h-24 rounded-xl border p-3" placeholder="Mô tả chi tiết..." />
          <Button className="h-11 rounded-xl bg-red-600 text-white hover:bg-red-700" onClick={() => { setReported(true); setReport(false) }}>
            Gửi báo cáo
          </Button>
        </Modal>
      )}
      {reported && (
        <div className="fixed bottom-5 right-5 z-40 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg">
          <AlertTriangle className="mt-0.5 size-4" /> Đã gửi báo cáo. Manager sẽ xem trong hàng đợi khiếu nại.
          <button type="button" onClick={() => setReported(false)}><X className="size-4" /></button>
        </div>
      )}
      {booked && null}
    </main>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng"><X /></Button>
        </div>
        {children}
      </div>
    </div>
  )
}
