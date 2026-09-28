'use client'

import Link from 'next/link'
import { ArrowRight, Building2, CheckCircle2, Crown, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { formatVnd, packages } from '@/lib/data'

const addons = [
  { name: 'Xác minh tận nơi (gói lẻ)', price: 799000, desc: '1 phòng · ảnh Manager chụp · đối soát đồng hồ điện/nước', features: ['Chụp tối thiểu 8 ảnh thực tế', 'Kiểm tra GPS ghim cửa vào', 'Đối soát biểu phí với hợp đồng thật'] },
  { name: 'Đẩy tin Top tìm kiếm 3 ngày', price: 199000, desc: 'Tăng lượt xem gấp 2.4 lần (số liệu tháng trước)', features: ['Pin trên đầu trang tìm kiếm', 'Badge "Đang được đẩy"', 'Báo cáo hiệu quả sau 7 ngày'] },
  { name: 'Dịch vụ ký hợp đồng điện tử', price: 99000, desc: 'Ký OTP với tenant, lưu trữ 5 năm', features: ['Chữ ký số VNPT-CA', 'Đối soát CCCD hai bên', 'Tự động hoá đơn VAT'] },
]

const compare = [
  { feature: 'Hiển thị tối đa', standard: '30 ngày', vip: '60 ngày + đẩy', verify: '60 ngày + Manager Verified' },
  { feature: 'Thứ tự tìm kiếm', standard: 'Tiêu chuẩn', vip: 'Ưu tiên', verify: 'Ưu tiên cao nhất' },
  { feature: 'Huy hiệu', standard: '—', vip: 'VIP', verify: 'Manager Verified + VIP' },
  { feature: 'Hỗ trợ CSKH', standard: 'Email', vip: 'Zalo + Email', verify: 'Điện thoại ưu tiên' },
  { feature: 'Xác minh tận nơi', standard: '—', vip: '—', verify: 'Có' },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />
      <section className="relative mx-auto max-w-6xl px-5 py-16 text-center lg:px-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="relative">
          <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">Bảng giá minh bạch</Badge>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Một lần đăng, nhiều lợi ích</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-500">Không thu phí ẩn. Mọi gói đều có hoá đơn VAT điện tử và có thể huỷ trong 7 ngày đầu.</p>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-8 lg:px-10">
        <div className="relative grid gap-5 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={`relative flex flex-col rounded-2xl border ${p.popular ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              {p.popular && <Badge className="absolute -top-3 left-5 bg-emerald-500 text-white shadow">Phổ biến nhất</Badge>}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">{p.id === 'vip' && <Crown className="size-4 text-amber-500" />} {p.name}</CardTitle>
                <CardDescription className="text-slate-500">{p.desc}</CardDescription>
                <p className="pt-3 font-mono text-3xl font-bold text-emerald-600">{formatVnd(p.price)}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {p.features.map((f) => (
                  <p key={f} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> {f}</p>
                ))}
              </CardContent>
              <CardContent>
                <Button className="w-full rounded-xl bg-emerald-500 font-semibold text-white hover:bg-emerald-400">Mua ngay</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 lg:px-10">
        <Card className="rounded-2xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-900">Add-on mua thêm</CardTitle>
            <CardDescription className="text-slate-500">Chỉ trả khi cần — không bắt buộc.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {addons.map((a) => (
              <Card key={a.name} className="rounded-2xl border-slate-200 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900">{a.name}</CardTitle>
                  <CardDescription className="text-slate-500">{a.desc}</CardDescription>
                  <p className="font-mono text-2xl font-bold text-emerald-600">{formatVnd(a.price)}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {a.features.map((f) => <p key={f} className="flex items-center gap-2 text-slate-600"><Sparkles className="size-4 text-emerald-500" /> {f}</p>)}
                  <Button className="mt-3 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">Thêm vào giỏ</Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-10">
        <Card className="rounded-2xl border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-900">Bảng so sánh</CardTitle>
            <CardDescription className="text-slate-500">Chọn gói phù hợp quy mô phòng trọ.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tính năng</th>
                  <th className="px-4 py-3">Tin thường</th>
                  <th className="px-4 py-3">Tin VIP</th>
                  <th className="px-4 py-3">Xác minh tận nơi</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => (
                  <tr key={c.feature} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.feature}</td>
                    <td className="px-4 py-3 text-slate-500">{c.standard}</td>
                    <td className="px-4 py-3 text-emerald-600">{c.vip}</td>
                    <td className="px-4 py-3 text-emerald-600">{c.verify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"><ShieldCheck className="size-4 text-emerald-500" /> Hoàn tiền trong 7 ngày nếu tin không đạt cam kết.</p>
      </section>
      <PublicFooter />
    </main>
  )
}
