'use client'

import { FileSignature, ShieldCheck, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PublicFooter, PublicHeader } from '@/components/shells'

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      <section className="relative mx-auto max-w-4xl px-5 py-16 lg:px-10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 size-[400px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Quy chế & điều khoản</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Điều khoản sử dụng & quy chế hoạt động</h1>
          <p className="mt-3 text-slate-400">Có hiệu lực từ 01/10/2026. Đọc kỹ trước khi đăng ký tài khoản.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-16 lg:px-10">
        <Tabs defaultValue="terms">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="terms" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Điều khoản</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Bảo mật</TabsTrigger>
            <TabsTrigger value="dispute" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Cơ chế tranh chấp</TabsTrigger>
            <TabsTrigger value="commission" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Phí & hoa hồng</TabsTrigger>
          </TabsList>
          {[
            { key: 'terms', icon: FileSignature, title: 'Điều khoản sử dụng', items: ['Thiện Nhân trú đồ là nền tảng kết nối người thuê và chủ trọ đã định danh.', 'Mọi hành vi đăng tin giả, ảnh mạng, địa chỉ ảo sẽ bị khoá tài khoản vĩnh viễn.', 'Tranh chấp hợp đồng thuê giải quyết theo Bộ luật Dân sự 2015.', 'Phí dịch vụ công khai trong mục Bảng giá và có hoá đơn VAT điện tử.'] },
            { key: 'privacy', icon: ShieldCheck, title: 'Chính sách bảo mật', items: ['Dữ liệu cá nhân được mã hoá AES-256 khi lưu trữ.', 'Mọi thao tác xoá dữ liệu đều được ghi nhận trong 24h.', 'Chia sẻ dữ liệu với cơ quan nhà nước chỉ khi có văn bản chính thức.', 'Người dùng có quyền yêu cầu xuất/xoá dữ liệu cá nhân bất kỳ lúc nào.'] },
            { key: 'dispute', icon: ShieldCheck, title: 'Cơ chế tranh chấp & khiếu nại', items: ['Bước 1: Người thuê gửi báo cáo trên phòng → Manager xử lý trong 12h.', 'Bước 2: Manager chuyển Admin nếu chủ nhà vi phạm nhiều lần.', 'Bước 3: Admin cấm tài khoản vi phạm, hoàn tiền qua VNPay.', 'Bước 4: Người dùng có quyền yêu cầu bồi thường theo thoả thuận người dùng.'] },
            { key: 'commission', icon: Wallet, title: 'Phí & hoa hồng', items: ['Tenant: miễn phí toàn bộ.', 'Seller: chỉ trả phí khi đăng tin hoặc mua gói Xác minh tận nơi.', 'Manager: nhận thưởng theo từng tin đạt Verified trong tháng.', 'Thiện Nhân trú đồ không thu phí đặt cọc — tiền cọc được ký quỹ tại ngân hàng đối tác.'] },
          ].map((s) => (
            <TabsContent key={s.key} value={s.key} className="mt-4">
              <Card className="rounded-2xl border-white/10 bg-white/[0.03]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white"><s.icon className="size-4 text-emerald-400" /> {s.title}</CardTitle>
                  <CardDescription className="text-slate-400">Cập nhật lần cuối: 18/09/2026</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-400">
                    {s.items.map((it) => <li key={it} className="text-slate-300">{it}</li>)}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </section>
      <PublicFooter />
    </main>
  )
}
