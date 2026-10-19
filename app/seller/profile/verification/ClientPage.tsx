'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/portal-sidebar'
import { useAuth } from '@/components/auth-provider'

export default function SellerVerificationPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(2) // Bắt đầu từ bước 2 vì đã xác minh SDT
  const [submitted, setSubmitted] = useState(false)

  // Nếu là seller active thì hiển thị trạng thái
  const isVerified = user?.role === 'seller' && user?.sellerStatus === 'active'

  if (isVerified) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Hồ sơ"
          title="Xác minh danh tính nâng cao"
          desc="Bổ sung eKYC cấp độ 2 để có huy hiệu 'Seller tin cậy'."
        />

        <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-emerald-700">Tài khoản đã xác minh</h3>
            <p className="text-sm text-emerald-600">
              Bạn đã là Người đăng tin được duyệt. 
              Các tính năng eKYC nâng cao đang trong phát triển.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">✓ Đã xác minh SDT</Badge>
              <Badge className="bg-emerald-100 text-emerald-700">✓ Đã duyệt Manager</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-emerald-600" /> Quyền lợi của bạn</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Benefit>Đăng tin không giới hạn</Benefit>
              <Benefit>Được duyệt nhanh bởi Manager</Benefit>
              <Benefit>Nhận thông báo khi có khách quan tâm</Benefit>
              <Benefit>Quản lý lịch hẹn xem phòng</Benefit>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>eKYC nâng cao (sắp ra mắt)</CardTitle>
              <CardDescription>Tính năng đang được phát triển</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-slate-500">
              <Benefit>Xác minh CCCD qua eKYC</Benefit>
              <Benefit>Xác minh sở hữu BĐS</Benefit>
              <Benefit>Huy hiệu "Seller tin cậy"</Benefit>
              <Benefit>Đẩy tin ưu tiên</Benefit>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Hồ sơ"
        title="Xác minh danh tính nâng cao"
        desc="Bổ sung eKYC cấp độ 2 để có huy hiệu 'Seller tin cậy'."
      />

      <ol className="grid gap-3 md:grid-cols-4">
        {[
          { n: 1, label: 'Xác minh SĐT', done: true },
          { n: 2, label: 'eKYC CCCD', done: step > 2 },
          { n: 3, label: 'Xác minh sở hữu BĐS', done: submitted && step === 4 },
          { n: 4, label: 'Xét duyệt', done: submitted },
        ].map((s) => (
          <li key={s.n} className={`flex items-center gap-3 rounded-2xl border p-4 ${s.n === step ? 'border-emerald-500 bg-emerald-50' : s.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
            <span className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{s.n}</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bước {s.n}</p>
              <p className="text-sm font-semibold">{s.label}</p>
            </div>
            {s.done && <CheckCircle2 className="ml-auto size-4 text-emerald-600" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{step === 2 ? 'eKYC CCCD' : step === 3 ? 'Xác minh sở hữu BĐS' : 'Hoàn tất'}</CardTitle>
            <CardDescription>Mọi tài liệu chỉ Manager/Admin thấy, không công khai với Tenant.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            {step === 2 && (
              <>
                <label className="text-sm font-semibold">
                  Số CCCD
                  <input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" defaultValue="079204001111" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">
                    Upload CCCD mặt trước
                  </div>
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">
                    Upload CCCD mặt sau
                  </div>
                </div>
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <ShieldCheck className="mr-1 inline size-4" /> 
                  Tính năng đang phát triển. Thông tin của bạn đã được bảo mật.
                </p>
                <Button className="h-11 w-fit rounded-xl bg-emerald-600" onClick={() => setStep(3)}>
                  Lưu tạm (Chức năng đang phát triển)
                </Button>
              </>
            )}
            {step === 3 && (
              <>
                <label className="text-sm font-semibold">
                  Loại giấy tờ
                  <select className="mt-1 h-11 w-full rounded-xl border px-3 font-normal">
                    <option>Sổ đỏ / Sổ hồng</option>
                    <option>Hợp đồng mua bán</option>
                    <option>Hợp đồng ủy quyền quản lý</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Địa chỉ BĐS đang quản lý
                  <input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" defaultValue="24B Nguyễn Văn Hưởng, Thảo Điền" />
                </label>
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">
                  Upload PDF / ảnh giấy tờ nhà
                </div>
                <Button className="h-11 w-fit rounded-xl bg-emerald-600" onClick={() => { setSubmitted(true); setStep(4) }}>
                  Lưu tạm (Chức năng đang phát triển)
                </Button>
              </>
            )}
            {step === 4 && (
              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <ShieldAlert className="text-amber-300" />
                <p className="mt-3 font-bold">Tính năng đang phát triển</p>
                <p className="mt-2 text-sm text-slate-300">
                  eKYC nâng cao đang được xây dựng. Bạn đã có thể đăng tin với tài khoản hiện tại.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-emerald-600" /> Quyền lợi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Benefit>Đẩy tin miễn phí 3 lượt/tháng</Benefit>
              <Benefit>Huy hiệu "Seller tin cậy"</Benefit>
              <Benefit>Được ưu tiên duyệt bởi Manager</Benefit>
              <Benefit>Mở khoá gói Xác minh tận nơi</Benefit>
            </CardContent>
          </Card>

          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Bảo mật theo chuẩn ISO 27001</Badge>
        </aside>
      </div>
    </main>
  )
}

function Benefit({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> {children}</p>
}
