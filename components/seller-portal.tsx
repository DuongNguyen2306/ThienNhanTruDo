'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleDollarSign,
  Clock3, FileCheck2, ImagePlus, Info, MapPin, Navigation, QrCode, ShieldCheck, Sparkles, UploadCloud, WalletCards, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PortalSidebar, PageHeader } from '@/components/portal-sidebar'
import { PortalShell } from '@/components/shells'
import { sellerNav } from '@/lib/nav'
import { formatVnd, packages } from '@/lib/data'

export function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allow="seller">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <PortalSidebar
          items={sellerNav}
          footer={
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Gợi ý</p>
              <p className="mt-2 text-sm font-semibold">Nâng cấp gói VIP để được Manager duyệt ưu tiên trong 24h.</p>
            </div>
          }
        />
        <div>{children}</div>
      </div>
    </PortalShell>
  )
}

const steps = [
  { label: 'Địa chỉ chính xác', icon: MapPin, note: 'Ghim cửa vào thật' },
  { label: 'Biểu phí minh bạch', icon: CircleDollarSign, note: 'Không phí ẩn' },
  { label: 'Ảnh & bằng chứng', icon: ImagePlus, note: 'Không dùng ảnh mạng' },
  { label: 'Tình trạng phòng', icon: FileCheck2, note: 'Trống / ngày trống' },
]

const feeFields = [
  ['Giá thuê / tháng', 'rent'],
  ['Tiền cọc (VNĐ)', 'deposit'],
  ['Đơn giá điện / kWh', 'electricity'],
  ['Đơn giá nước', 'water'],
  ['Internet / tháng', 'internet'],
  ['Phí giữ xe máy', 'parking'],
  ['Phí giữ ô tô', 'parkingCar'],
  ['Phí rác / quản lý', 'management'],
]

function Stepper({ current }: { current: number }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon
        const done = index < current
        return (
          <div key={step.label} className={`flex items-center gap-3 rounded-xl p-3 ${index === current ? 'bg-slate-900 text-white' : done ? 'bg-emerald-50 text-emerald-800' : 'text-slate-400'}`}>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${index === current ? 'bg-white/15' : done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              {done ? <Check /> : <Icon />}
            </span>
            <span className="min-w-0">
              <b className="block text-xs">Bước {index + 1}</b>
              <span className="block truncate text-sm font-semibold">{step.label}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MapPinBoard({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState({ x: 53, y: 44 })
  const board = useRef<HTMLDivElement>(null)
  const move = (event: React.PointerEvent) => {
    if (!board.current) return
    const rect = board.current.getBoundingClientRect()
    const x = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(88, Math.max(12, ((event.clientY - rect.top) / rect.height) * 100))
    setPosition({ x, y })
    onChange(10.7769 + (y - 50) * 0.0007, 106.7009 + (x - 50) * 0.0007)
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#e9f1eb]">
      <div
        ref={board}
        onPointerMove={(e) => e.buttons === 1 && move(e)}
        onPointerDown={move}
        className="relative h-[300px] cursor-crosshair bg-[linear-gradient(35deg,transparent_46%,rgba(255,255,255,.8)_47%,rgba(255,255,255,.8)_49%,transparent_50%),linear-gradient(125deg,transparent_42%,rgba(255,255,255,.8)_43%,rgba(255,255,255,.8)_45%,transparent_46%)] bg-[length:130px_110px]"
      >
        <div className="absolute left-[12%] top-[22%] h-20 w-44 rotate-12 rounded-[45%] bg-emerald-200/70" />
        <span className="absolute left-[8%] top-[58%] text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">Thảo Điền</span>
        <div className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
          <div className="flex size-10 rotate-45 items-center justify-center rounded-full rounded-br-none bg-emerald-600 text-white shadow-lg">
            <MapPin className="-rotate-45" />
          </div>
          <div className="mt-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold shadow">Kéo ghim cửa vào</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t bg-white/80 px-4 py-3 text-xs">
        <span className="flex items-center gap-2 text-slate-600">
          <Navigation className="text-emerald-600" /> Đã ghim cửa/sảnh — không nhận địa chỉ “gần ngã tư X”
        </span>
      </div>
    </div>
  )
}

export function ListingWizard() {
  const [current, setCurrent] = useState(0)
  const [coords, setCoords] = useState([10.7769, 106.7009])
  const [fees, setFees] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<{ name: string; type: string }[]>([])
  const [vacant, setVacant] = useState(true)
  const [done, setDone] = useState(false)
  const requiredMedia = ['Tổng quan phòng', 'Nhà vệ sinh', 'Ban công/cửa sổ', 'Đồng hồ điện/nước']
  const hasRequired = requiredMedia.every((x) => files.some((f) => f.type === x))
  const addFile = (type: string) => setFiles((items) => [...items, { name: `${type}-${items.length + 1}.jpg`, type }])
  const next = () => {
    if (current === 1 && (!fees.electricity || !fees.water || !fees.rent)) return
    if (current === 2 && !hasRequired) return
    if (current === 3) {
      setDone(true)
      return
    }
    setCurrent((s) => Math.min(3, s + 1))
  }

  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Tạo / chỉnh sửa"
          title="Tạo / chỉnh sửa tin đăng"
          desc="Ba khối bắt buộc: địa chỉ thật, biểu phí rõ, ảnh gốc + giấy tờ quản lý."
        />
        <Stepper current={current} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>{steps[current].label}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {current === 0 && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Tỉnh/Thành"><option>TP. Hồ Chí Minh</option><option>Hà Nội</option><option>Đà Nẵng</option></Select>
                    <Select label="Quận/Huyện"><option>Thủ Đức</option><option>Quận 1</option><option>Quận 7</option></Select>
                    <Select label="Phường/Xã"><option>Thảo Điền</option><option>An Phú</option><option>Tân Phong</option></Select>
                    <label className="text-sm font-semibold">Tên đường / số nhà<input className="mt-2 h-11 w-full rounded-xl border px-3 font-normal" placeholder="VD: 24B Nguyễn Văn Hưởng" /></label>
                  </div>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Không cho phép địa chỉ chung chung kiểu “gần ngã tư X”. Phải chọn dropdown + ghim lat/long.</p>
                  <MapPinBoard onChange={(lat, lng) => setCoords([lat, lng])} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase text-slate-400">Vĩ độ</span><b className="mt-1 block font-mono text-sm">{coords[0].toFixed(6)}</b></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase text-slate-400">Kinh độ</span><b className="mt-1 block font-mono text-sm">{coords[1].toFixed(6)}</b></div>
                  </div>
                </div>
              )}
              {current === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mb-2 inline size-4" /> Điện và nước bắt buộc nhập số. Nếu miễn phí phải chọn rõ 0đ/Miễn phí.
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {feeFields.map(([label, key]) => (
                      <label key={key} className="text-sm font-semibold">
                        {label}
                        <div className="relative mt-2">
                          <input inputMode="numeric" value={fees[key] || ''} onChange={(e) => setFees({ ...fees, [key]: e.target.value })} className="h-11 w-full rounded-xl border px-3 pr-16 font-mono font-normal" placeholder="0" />
                          <button type="button" className="absolute right-2 top-2 text-[10px] font-bold text-emerald-700" onClick={() => setFees({ ...fees, [key]: '0' })}>0đ</button>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {current === 2 && (
                <div className="flex flex-col gap-4">
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Nếu ảnh có GPS lúc chụp, hệ thống tự gắn nhãn High Trust. Giấy tờ nhà chỉ Manager/Admin thấy.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {requiredMedia.map((type) => {
                      const added = files.some((f) => f.type === type)
                      return (
                        <button type="button" key={type} onClick={() => addFile(type)} className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 ${added ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                          {added ? <Check className="text-emerald-600" /> : <UploadCloud className="text-slate-400" />}
                          <b className="text-sm">{type}</b>
                          <small>{added ? 'Đã tải · High Trust' : 'Bấm để tải'}</small>
                        </button>
                      )
                    })}
                  </div>
                  <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Tải giấy tờ chứng minh quản lý/cho thuê (PDF) — ẩn với tenant.</div>
                </div>
              )}
              {current === 3 && (
                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vacant} onChange={(e) => setVacant(e.target.checked)} className="accent-emerald-600" /> Trống ngay</label>
                  {!vacant && <label className="text-sm font-semibold">Dự kiến trống từ ngày<input type="date" className="mt-2 h-11 w-full rounded-xl border px-3 font-normal" /></label>}
                  <div>
                    <h3 className="mb-2 text-sm font-bold">Tiện ích</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {['Máy lạnh', 'Thang máy', 'Giờ giấc tự do', 'PCCC đạt chuẩn', 'Cho nuôi thú cưng', 'Nội thất có sẵn'].map((item) => (
                        <label key={item} className="flex items-center gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" className="accent-emerald-600" />{item}</label>
                      ))}
                    </div>
                  </div>
                  {done && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Đã gửi tin vào hàng chờ duyệt của Manager.</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between bg-slate-50/70 p-6">
              <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((s) => s - 1)}>
                <ArrowLeft data-icon="inline-start" /> Quay lại
              </Button>
              <Button onClick={next} className="rounded-xl bg-emerald-600">
                {current === 3 ? 'Gửi duyệt' : 'Tiếp tục'} <ArrowRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
          <aside className="flex flex-col gap-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="text-emerald-600" /> Checklist minh bạch</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {['Ghim cửa vào', 'Điện/nước/cọc', 'Ảnh gốc + đồng hồ', 'Tình trạng phòng'].map((item, i) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className={`flex size-5 items-center justify-center rounded-full ${i < current ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{i < current ? <Check /> : i + 1}</span>
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <Sparkles className="text-amber-400" />
              <h3 className="mt-3 font-bold">Vì sao phải đủ 3 khối?</h3>
              <p className="mt-2 text-sm text-slate-300">Tin đủ dữ liệu được ưu tiên duyệt, gắn badge và xuất hiện cao hơn trên trang tìm kiếm.</p>
            </div>
          </aside>
        </div>
      </main>
    </SellerLayout>
  )
}

export function BillingPage() {
  const [selected, setSelected] = useState('vip')
  const [checkout, setCheckout] = useState(false)
  const [paid, setPaid] = useState(false)
  const [seconds, setSeconds] = useState(900)
  useEffect(() => {
    if (!checkout || paid || seconds <= 0) return
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [checkout, paid, seconds])
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const plan = packages.find((p) => p.id === selected)

  return (
    <SellerLayout>
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">Nạp tiền & mua gói tin</Badge>
          <h1 className="mt-4 text-4xl font-bold">Bảng giá dịch vụ</h1>
          <p className="mt-3 text-slate-500">Tin thường, Tin VIP (đẩy đầu trang), Gói xác minh tận nơi do Manager đến chụp.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={`relative flex flex-col rounded-2xl ${selected === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
              {p.popular && <Badge className="absolute -top-3 left-5 bg-emerald-600">Phổ biến</Badge>}
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
                <p className="pt-3 font-mono text-3xl font-bold">{formatVnd(p.price)}</p>
              </CardHeader>
              <CardContent className="flex-1">
                {p.features.map((f) => (
                  <div key={f} className="mb-2 flex gap-2 text-sm"><Check className="text-emerald-600" />{f}</div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full rounded-xl bg-emerald-600" onClick={() => { setSelected(p.id); setCheckout(true); setPaid(false) }}>
                  Thanh toán VNPay
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <Card className="mx-auto mt-10 max-w-6xl rounded-2xl">
          <CardHeader>
            <CardTitle>Lịch sử giao dịch & số dư ví</CardTitle>
            <CardDescription>Số dư hiện tại: 1.250.000đ · 8 lượt đăng tin còn lại</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr>{['Mã đơn', 'Gói', 'Số tiền', 'Cổng', 'Trạng thái'].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
              <tbody>
                <tr className="border-t"><td className="py-3 font-mono">VR-2026-0819</td><td>Tin VIP</td><td>299.000đ</td><td>VietQR</td><td>Thành công</td></tr>
                <tr className="border-t"><td className="py-3 font-mono">VR-2026-0801</td><td>Xác minh tận nơi</td><td>799.000đ</td><td>VNPay-QR</td><td>Thành công · Tải hóa đơn</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl rounded-2xl">
            <CardHeader className="flex-row items-start justify-between border-b">
              <div>
                <CardTitle>Thanh toán trực tuyến VNPay</CardTitle>
                <CardDescription>Mã VietQR động theo đơn hàng {plan?.name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCheckout(false)}><X /></Button>
            </CardHeader>
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_220px]">
              <div className="flex flex-col gap-4">
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${paid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  {paid ? <CheckCircle2 className="text-emerald-600" /> : <Clock3 className="animate-pulse text-amber-600" />}
                  <div>
                    <b>{paid ? 'Thanh toán thành công (Webhook)' : 'Đang chờ thanh toán...'}</b>
                    <span className="block text-xs">{paid ? 'Số dư/gói tin đã được cộng.' : `QR hết hạn sau ${time}`}</span>
                  </div>
                </div>
                <div className="rounded-xl border p-4 text-sm">
                  <div className="flex justify-between"><span>Mã đơn</span><b className="font-mono">VR-2026-0928</b></div>
                  <div className="mt-2 flex justify-between"><span>{plan?.name}</span><b>{plan ? formatVnd(plan.price) : ''}</b></div>
                </div>
                <p className="flex gap-2 text-xs text-slate-400"><Info className="size-4" /> Trạng thái polling realtime: chờ cổng VNPay / webhook backend.</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-8 border-slate-100 bg-slate-950 text-white">
                  <QrCode className="size-28" />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setPaid(true)}>
                  {paid ? 'Đã thanh toán' : 'Mô phỏng webhook thành công'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SellerLayout>
  )
}

function Select({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <span className="relative mt-2 block">
        <select className="h-11 w-full appearance-none rounded-xl border px-3 pr-8 font-normal">{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-slate-400" />
      </span>
    </label>
  )
}
