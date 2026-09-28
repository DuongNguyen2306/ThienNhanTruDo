'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, LogIn, MapPin, ShieldCheck, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublicFooter, PublicHeader } from '@/components/shells'

const facilities = ['Máy lạnh', 'Gác lửng', 'Nấu ăn', 'Giặt sấy', 'Camera', 'Thẻ từ', 'Wifi', 'Giữ xe máy', 'Giữ xe ô tô', 'Thú cưng']
const provinces = ['TP.HCM', 'Hà Nội', 'Đà Nẵng']
const districts: Record<string, string[]> = {
  'TP.HCM': ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 10', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Thủ Đức'],
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy', 'Thanh Xuân', 'Long Biên', 'Nam Từ Liêm'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu'],
}

export default function PostListingPage() {
  const [loggedIn] = useState(true)
  const [step, setStep] = useState(1)
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [vip, setVip] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PublicHeader />
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="size-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-800">Đăng nhập để tiếp tục</h1>
          <p className="mt-3 text-slate-500">
            Bạn cần đăng nhập tài khoản để đăng tin. Nếu chưa có, hãy đăng ký — hoàn toàn miễn phí.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/dang-nhap">
              <Button className="h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/dang-ky">
              <Button variant="outline" className="h-12 w-full text-base">
                Tạo tài khoản mới
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-500" />
            <p className="text-sm text-slate-500">
              Chỉ <b>chủ nhà</b> mới được đăng tin. Người thuê không cần đăng ký — chỉ cần duyệt tin là đủ.
            </p>
          </div>
        </div>
        <PublicFooter />
      </main>
    )
  }

  const toggleFacility = (f: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    )
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PublicHeader />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-800">Tin đăng đã được gửi!</h1>
          <p className="mt-3 text-slate-500">
            Chủ nhà sẽ nhận thông báo. Tin sẽ được duyệt trong <b>24 giờ</b>. Kiểm tra trạng thái tại <a href="/tai-khoan/tin-cua-toi" className="text-emerald-600 underline">Tài khoản</a>.
          </p>
          <Button className="mt-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => window.location.href = '/'}>
            Về trang chủ
          </Button>
        </div>
        <PublicFooter />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Đăng tin mới</h1>
          <p className="mt-1 text-sm text-slate-500">Tin đăng phải được Manager duyệt trước khi lên web.</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(s)}
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step === s ? 'bg-emerald-600 text-white' : step > s ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 className="size-4" /> : s}
              </button>
              <span className={`text-sm ${step === s ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Địa chỉ' : s === 2 ? 'Phòng & giá' : 'Hoàn tất'}
              </span>
              {s < 3 && <div className="h-px w-8 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tỉnh / Thành phố</label>
              <select
                value={province}
                onChange={(e) => { setProvince(e.target.value); setDistrict('') }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">— Chọn tỉnh/thành —</option>
                {provinces.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            {province && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Quận / Huyện</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">— Chọn quận/huyện —</option>
                  {(districts[province] || []).map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Địa chỉ chi tiết</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Số nhà, đường, phường..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiện ích</label>
              <div className="flex flex-wrap gap-2">
                {facilities.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      selectedFacilities.includes(f)
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <Button className="h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700" onClick={() => setStep(2)}>
              Tiếp tục
            </Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Diện tích (m²)</label>
                <input type="number" placeholder="25" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Số người ở tối đa</label>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n} người</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Giá thuê / tháng</label>
                <input type="text" placeholder="5.000.000 đ" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiền cọc (tháng)</label>
                <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  {[1, 2, 3].map((n) => <option key={n}>{n} tháng</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Đơn giá điện</label>
              <input type="text" placeholder="3.500 đ/kWh" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Ảnh phòng (tối thiểu 3)</label>
              <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload className="size-8" />
                  <p className="text-sm">Kéo thả ảnh hoặc nhấn để tải lên</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-800">Tin VIP</p>
                <p className="text-sm text-slate-500">Đẩy lên đầu trong 7 ngày · 99.000đ</p>
              </div>
              <button
                type="button"
                onClick={() => setVip(!vip)}
                className={`relative size-11 rounded-full transition-colors ${vip ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 size-[18px] rounded-full bg-white transition-all ${vip ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="h-12 flex-1" onClick={() => setStep(1)}>Quay lại</Button>
              <Button className="h-12 flex-1 bg-emerald-600 text-base font-semibold hover:bg-emerald-700" onClick={() => setStep(3)}>
                Xem trước
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-800">Tin của bạn</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="text-slate-400">Địa chỉ:</span> {district || '—'}, {province || '—'}</p>
                <p><span className="text-slate-400">Tiện ích:</span> {selectedFacilities.length > 0 ? selectedFacilities.join(', ') : '—'}</p>
                <p><span className="text-slate-400">Tin VIP:</span> {vip ? 'Có' : 'Không'}</p>
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Tin sẽ được Manager duyệt trong <b>24 giờ</b>. Bạn sẽ nhận thông báo khi tin lên web.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="h-12 flex-1" onClick={() => setStep(2)}>Sửa lại</Button>
              <Button className="h-12 flex-1 bg-emerald-600 text-base font-semibold hover:bg-emerald-700" onClick={() => setSubmitted(true)}>
                Gửi tin đăng
              </Button>
            </div>
          </div>
        )}
      </div>
      <PublicFooter />
    </main>
  )
}
