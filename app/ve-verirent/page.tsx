'use client'

import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, Heart, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicFooter, PublicHeader } from '@/components/shells'

const milestones = [
  { year: '2023', title: 'Ra mắt bản Beta', detail: 'Phục vụ 3.000 sinh viên tại TP.HCM, hợp tác với 12 chủ nhà.' },
  { year: '2024', title: 'Mở rộng Hà Nội · Đà Nẵng', detail: 'Hơn 18.000 phòng được đăng · 320 Manager định danh.' },
  { year: '2025', title: 'Tích hợp VNPay · eKYC', detail: 'Thanh toán an toàn, xác minh CCCD gắn chip.' },
  { year: '2026', title: 'AI phát hiện ảnh mạng', detail: 'Giảm 71% số tin có ảnh stock trên nền tảng.' },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <PublicHeader />
      <section className="relative mx-auto max-w-5xl px-5 py-16 text-center lg:px-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-emerald-200/40 blur-[120px]" />
        </div>
        <div className="relative">
          <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">Câu chuyện Thiên Nhãn trú đồ</Badge>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Chúng tôi xây "bảo hiểm niềm tin" cho thị trường phòng trọ</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">Thiên Nhãn trú đồ được thành lập bởi một nhóm kỹ sư từng là sinh viên đi thuê trọ. Mỗi sản phẩm được thiết kế để giải quyết đúng nỗi đau: địa chỉ ảo, phí ẩn, ảnh mạng.</p>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-5xl gap-6 px-5 py-6 lg:grid-cols-3 lg:px-10">
        {[
          { icon: ShieldCheck, title: 'Minh bạch', desc: 'Mọi khoản phí, mọi điều khoản đều công khai trước khi thuê.' },
          { icon: BadgeCheck, title: 'Đã kiểm định', desc: 'Manager tới tận nơi, đối soát ảnh, giá và hợp đồng thật.' },
          { icon: Heart, title: 'Lấy người thuê làm trung tâm', desc: 'Hệ thống báo cáo mạnh, hoàn cọc 100% nếu tin vi phạm.' },
        ].map((v) => (
          <Card key={v.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><v.icon /></span>
              <CardTitle className="mt-3 text-slate-900">{v.title}</CardTitle>
              <CardDescription className="text-slate-600">{v.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="relative mx-auto max-w-5xl px-5 py-12 lg:px-10">
        <h2 className="text-2xl font-bold text-slate-900">Cột mốc</h2>
        <p className="mt-2 text-sm text-slate-500">Hành trình 3 năm từ ý tưởng sinh viên tới nền tảng kiểm định #1 Việt Nam.</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {milestones.map((m) => (
            <Card key={m.year} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit border-emerald-300 text-emerald-700 bg-emerald-50">{m.year}</Badge>
                <CardTitle className="mt-3 text-base text-slate-900">{m.title}</CardTitle>
                <CardDescription className="text-slate-600">{m.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </ol>
      </section>

      <section className="relative mx-auto max-w-5xl px-5 pb-16 lg:px-10">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="grid gap-4 p-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Bắt đầu dùng Thiên Nhãn trú đồ</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-900">Bạn đang tìm phòng hay muốn đăng tin?</h3>
              <p className="mt-2 text-slate-600">Tạo tài khoản trong 30 giây — đối với chủ trọ cần Manager duyệt trong 24h.</p>
              <div className="mt-4 flex gap-2">
                <Button asChild={false} className="bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400">Đăng ký miễn phí</Button>
                <Button asChild={false} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50"><Link href="/ho-tro">Nói chuyện với CSKH</Link></Button>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
              <Sparkles className="text-amber-500" />
              <p className="mt-3 text-lg font-bold text-slate-900">Cam kết của chúng tôi</p>
              <p className="mt-2 text-sm text-slate-600">Nếu tin đăng Manager Verified có khác biệt ≥ 10% so với thực tế, bạn được hoàn cọc 100% + bù 200.000đ.</p>
            </div>
          </CardContent>
        </Card>
      </section>
      <PublicFooter />
    </main>
  )
}
