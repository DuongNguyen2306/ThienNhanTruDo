'use client'

import { useState } from 'react'
import { Check, CircleHelp, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicFooter, PublicHeader } from '@/components/shells'

const faqs = [
  { q: 'Làm sao tôi biết tin đăng đã được kiểm định thực tế?', a: 'Tin có huy hiệu Manager Verified nghĩa là Manager đã đến tận nơi đối soát ảnh, địa chỉ và biểu phí trong vòng 7 ngày gần nhất.' },
  { q: 'Phí ẩn có bị tính thêm sau khi ký hợp đồng không?', a: 'Không. Mọi khoản (điện, nước, xe, internet, quản lý) đều công khai trên trang chi tiết phòng. Nếu chủ nhà đòi thêm, bạn báo cáo để Manager xử lý và hoàn cọc 100%.' },
  { q: 'Cọc giữ chỗ có an toàn không?', a: 'Tiền cọc được ký quỹ tại Thiên Nhãn trú đồ, không chuyển thẳng cho chủ nhà. Hoàn 100% nếu Manager phát hiện tin vi phạm hoặc sau 72h không ký hợp đồng.' },
  { q: 'Tôi muốn trở thành chủ trọ thì làm sao?', a: 'Đăng ký tài khoản Tenant, sau đó vào "Nâng cấp Seller" để gửi CCCD + giấy tờ nhà. Manager duyệt trong 24h.' },
  { q: 'Thiên Nhãn trú đồ có hỗ trợ ngoài giờ hành chính không?', a: 'Có. Đội ngũ CSKH hoạt động 7h-23h mỗi ngày qua hotline 1900 6868 và Zalo OA.' },
]

export default function SupportPage() {
  const [filter, setFilter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [topic, setTopic] = useState('tin-dang')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  const visible = faqs.filter((f) => !filter || f.q.toLowerCase().includes(filter.toLowerCase()) || f.a.toLowerCase().includes(filter.toLowerCase()))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !desc.trim()) return
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <PublicHeader />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 py-16 lg:px-10">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 right-0 size-[500px] rounded-full bg-emerald-200/40 blur-[120px]" />
          <div className="absolute bottom-0 -left-32 size-[400px] rounded-full bg-teal-200/40 blur-[100px]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
            <ShieldCheck className="size-4" />
            Trung tâm hỗ trợ
          </div>
          <h1 className="mt-5 text-4xl font-bold text-slate-900">
            Chúng tôi giúp bạn<br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">thuê phòng an toàn</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Đội ngũ Thiên Nhãn trú đồ hỗ trợ 7h–23h mỗi ngày. Ngoài giờ, hệ thống phản hồi trong 30 phút.
          </p>
        </div>

        {/* Contact cards */}
        <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MessageCircle, title: 'Live chat', desc: 'Trả lời trong ~2 phút', cta: 'Mở chat', href: '#' },
            { icon: Phone, title: 'Hotline 1900 6868', desc: '7h–23h mỗi ngày', cta: 'Gọi ngay', href: 'tel:19006868' },
            { icon: Mail, title: 'Email', desc: 'support@thiennhan.vn · phản hồi 4h', cta: 'Gửi email', href: 'mailto:support@thiennhan.vn' },
          ].map(({ icon: Icon, title, desc, cta, href }) => (
            <Card key={title} className="rounded-2xl border-emerald-100 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="shrink-0 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                >
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{cta}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ + Form */}
      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">

          {/* FAQ */}
          <Card className="rounded-2xl border-emerald-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CircleHelp className="size-5" />
                </span>
                Câu hỏi thường gặp
              </CardTitle>
              <CardDescription className="text-slate-500">
                Tìm nhanh bằng từ khoá hoặc đọc chi tiết bên dưới.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  className="h-11 w-full rounded-xl border border-emerald-100 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Tìm câu hỏi..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              {visible.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">Không tìm thấy câu hỏi phù hợp.</p>
              )}
              {visible.map((f, i) => (
                <details key={i} className="group rounded-xl border border-emerald-100 bg-slate-50/50 p-4 transition-colors hover:bg-emerald-50/50">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    <span>{f.q}</span>
                    <span className="text-emerald-600 transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </CardContent>
          </Card>

          {/* Support form */}
          <Card className="rounded-2xl border-emerald-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Gửi yêu cầu hỗ trợ</CardTitle>
              <CardDescription className="text-slate-500">
                Manager/Admin phản hồi qua email đăng ký trong 4h làm việc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="size-6" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900">Yêu cầu đã gửi thành công!</p>
                  <p className="text-xs text-slate-500">Chúng tôi sẽ phản hồi qua email trong vòng 4h.</p>
                  <Button
                    variant="outline"
                    className="mt-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => { setSubmitted(false); setTitle(''); setDesc('') }}
                  >
                    Gửi yêu cầu khác
                  </Button>
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={onSubmit}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Chủ đề</span>
                    <select
                      className="h-11 rounded-xl border border-emerald-100 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      <option value="tin-dang">Vấn đề về tin đăng</option>
                      <option value="thanh-toan">Vấn đề thanh toán</option>
                      <option value="tai-khoan">Vấn đề tài khoản</option>
                      <option value="bao-cao">Báo cáo vi phạm</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Tiêu đề</span>
                    <input
                      className="h-11 rounded-xl border border-emerald-100 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Mô tả ngắn gọn vấn đề..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Mô tả chi tiết</span>
                    <textarea
                      className="min-h-28 rounded-xl border border-emerald-100 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Cho chúng tôi biết thêm chi tiết..."
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                  </label>
                  <Button
                    type="submit"
                    className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 font-semibold text-white hover:from-emerald-700 hover:to-teal-600"
                  >
                    Gửi yêu cầu hỗ trợ
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
