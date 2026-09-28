'use client'

import { useState } from 'react'
import { Building2, Phone, ShieldCheck, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'

export default function SellerProfilePage() {
  const [saved, setSaved] = useState(false)
  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Hồ sơ"
          title="Hồ sơ công khai của Seller"
          desc="Thông tin này hiển thị với Tenant khi họ mở chi tiết phòng trọ."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Thông tin doanh nghiệp</CardTitle>
              <CardDescription>Đã định danh bởi Admin · Cập nhật 12/09/2026</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Tên đầy đủ" value="Minh Anh Realty" />
              <Field label="Mã số thuế" value="0316-XXX-999" />
              <Field label="Người đại diện" value="Trần Minh Anh" />
              <Field label="Số điện thoại hiển thị" value="0903 112 334" />
              <Field label="Khu vực hoạt động" value="TP. Thủ Đức · Quận 1 · Bình Thạnh" />
              <Field label="Tài khoản VNPay nhận tiền" value="0903***334 · Vietcombank" />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline">Hủy</Button>
                <Button className="bg-emerald-600" onClick={() => setSaved(true)}>Lưu thay đổi</Button>
                {saved && <p className="self-center text-sm text-emerald-700">Đã lưu.</p>}
              </div>
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" /> Uy tín</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Stat icon={Star} label="Trust score" value="4.8 / 5" />
                <Stat icon={Building2} label="Phòng đang quản lý" value="18" />
                <Stat icon={Phone} label="Tỉ lệ phản hồi" value="96%" />
                <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700">Đã định danh</Badge>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900">
              <CardContent className="p-5 text-sm">
                <p className="font-bold">Mẹo tăng uy tín</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  <li>Trả lời yêu cầu hẹn trong 1h.</li>
                  <li>Mua gói “Xác minh tận nơi” cho các tin VIP.</li>
                  <li>Bổ sung giấy tờ nhà để Admin cấp huy hiệu “Seller đã định danh đầy đủ”.</li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </SellerLayout>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="mt-1 h-11 w-full rounded-xl border px-3 font-normal" defaultValue={value} />
    </label>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-500"><Icon className="size-4" /> {label}</span>
      <b>{value}</b>
    </div>
  )
}
