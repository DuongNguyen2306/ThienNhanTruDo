'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Filter, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapBoard } from '@/components/map-board'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { formatVnd, listings, totalMonthly } from '@/lib/data'

const RealMap = dynamic(() => import('@/components/RealMap').then(m => ({ default: m.RealMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
      Đang tải bản đồ...
    </div>
  ),
})

function SearchInner() {
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [verified, setVerified] = useState(params.get('verified') === '1')
  const [roomType, setRoomType] = useState(params.get('type') || 'Tất cả')
  const [elec, setElec] = useState('Tất cả')
  const [water, setWater] = useState('Tất cả')
  const [pets, setPets] = useState(false)
  const [furniture, setFurniture] = useState(false)
  const [direction, setDirection] = useState('Tất cả')
  const [selected, setSelected] = useState(listings[0]?.id)

  const results = useMemo(() => {
    return listings.filter((l) => {
      if (l.status !== 'active' && l.status !== 'pending') return false
      if (verified && !l.verified) return false
      if (roomType !== 'Tất cả' && l.roomType !== roomType) return false
      if (elec !== 'Tất cả' && l.electricityType !== elec) return false
      if (water !== 'Tất cả' && l.waterType !== water) return false
      if (pets && !l.pets) return false
      if (furniture && !l.furniture) return false
      if (direction !== 'Tất cả' && l.direction !== direction) return false
      if (q && !`${l.title} ${l.address} ${l.district}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [q, verified, roomType, elec, water, pets, furniture, direction])

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PublicHeader />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-4 lg:px-10">
          <div className="relative min-w-[220px] flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-emerald-600" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3"
              placeholder="Tìm theo khu vực, địa chỉ, trường học..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="accent-emerald-600" />
            Đã xác thực thực tế
          </label>
          <Badge variant="outline" className="bg-slate-50">
            {results.length} tin phù hợp
          </Badge>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[280px_1fr_2.2fr]">
        <aside className="border-r border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Filter className="size-4" /> Bộ lọc nâng cao
          </h2>
          <div className="flex flex-col gap-4 text-sm">
            <Field label="Loại hình phòng">
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="h-10 w-full rounded-xl border px-3">
                {['Tất cả', 'Ký túc xá', 'Phòng trọ khép kín', 'Chung cư mini', 'Căn hộ dịch vụ'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Đơn giá điện">
              <select value={elec} onChange={(e) => setElec(e.target.value)} className="h-10 w-full rounded-xl border px-3">
                {['Tất cả', 'Nhà nước', 'Kinh doanh'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Tiền nước">
              <select value={water} onChange={(e) => setWater(e.target.value)} className="h-10 w-full rounded-xl border px-3">
                {['Tất cả', 'Theo khối', 'Đầu người'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Hướng phòng">
              <select value={direction} onChange={(e) => setDirection(e.target.value)} className="h-10 w-full rounded-xl border px-3">
                {['Tất cả', 'Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Tây Bắc', 'Đông Bắc'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={furniture} onChange={(e) => setFurniture(e.target.checked)} className="accent-emerald-600" />
              Nội thất có sẵn
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} className="accent-emerald-600" />
              Cho phép nuôi thú cưng
            </label>
            <p className="text-xs text-slate-400">Phí giữ xe, phí quản lý, internet được hiển thị trên từng thẻ tin.</p>
          </div>
        </aside>

        <section className="max-h-[calc(100vh-140px)] overflow-y-auto border-r border-slate-200 p-4">
          <div className="flex flex-col gap-4">
            {results.map((l) => (
              <Link
                key={l.id}
                href={`/phong/${l.id}`}
                onMouseEnter={() => setSelected(l.id)}
                className={`flex gap-3 overflow-hidden rounded-2xl border bg-white p-3 shadow-sm ${selected === l.id ? 'border-emerald-500 ring-2 ring-emerald-500/15' : 'border-slate-200'}`}
              >
                <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-xl">
                  <Image src={l.image} alt={l.title} fill className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    {l.verified && <Badge className="bg-emerald-50 text-emerald-700">Đã xác thực</Badge>}
                    {l.vip && <Badge className="bg-amber-500 text-white">VIP</Badge>}
                    <Badge variant="outline">{l.vacantNow ? 'Còn phòng' : 'Sắp trống'}</Badge>
                  </div>
                  <h3 className="mt-1 truncate font-bold">{l.title}</h3>
                  <p className="truncate text-xs text-slate-500">{l.address}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{formatVnd(l.rent)}/tháng</p>
                  <p className="text-[11px] text-slate-500">
                    Phí cố định: {formatVnd(l.internet + l.managementFee + l.parkingBike + l.sanitation)} · Điện {formatVnd(l.electricity)}/{l.electricityType === 'Nhà nước' ? 'kWh NN' : 'kWh KD'}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-700">Ước tính tổng: {formatVnd(totalMonthly(l))}/tháng</p>
                </div>
              </Link>
            ))}
            {results.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Không có tin phù hợp bộ lọc.</p>}
          </div>
        </section>

        <div className="hidden min-h-[calc(100vh-140px)] p-4 lg:block">
          <RealMap listings={results} selectedId={selected} onSelect={setSelected} />
        </div>
      </div>
      <div className="lg:hidden">
        <PublicFooter />
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  )
}
