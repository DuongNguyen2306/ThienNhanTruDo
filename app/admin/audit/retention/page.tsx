'use client'

import { Archive, Database, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin-portal'
import { PageHeader } from '@/components/portal-sidebar'

const policies = [
  { id: 'audit', name: 'Audit log hoạt động', retention: '24 tháng', location: 'PostgreSQL + S3', legal: 'Tuân thủ Nghị định 13/2023 về dữ liệu cá nhân' },
  { id: 'listings', name: 'Ảnh & dữ liệu tin đăng', retention: '12 tháng sau khi ngừng đăng', location: 'S3 + CloudFront', legal: 'Có thể xoá theo yêu cầu của Seller' },
  { id: 'reports', name: 'Khiếu nại / report', retention: '36 tháng', location: 'PostgreSQL', legal: 'Phục vụ điều tra khi có yêu cầu của cơ quan có thẩm quyền' },
  { id: 'payments', name: 'Lịch sử thanh toán VNPay', retention: '60 tháng', location: 'Postgres', legal: 'Tuân thủ yêu cầu lưu trữ chứng từ kế toán' },
]

export default function AuditRetentionPage() {
  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Minh bạch"
          title="Chính sách lưu trữ dữ liệu"
          desc="Cấu hình bao lâu dữ liệu được giữ, ở đâu, và vì lý do gì."
          actions={<Button variant="outline" className="bg-white"><Archive data-icon="inline-start" /> Xuất chính sách PDF</Button>}
        />

        <Tabs defaultValue="policy">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="policy">Chính sách</TabsTrigger>
            <TabsTrigger value="requests">Yêu cầu xoá dữ liệu</TabsTrigger>
            <TabsTrigger value="legal">Cơ sở pháp lý</TabsTrigger>
          </TabsList>
          <TabsContent value="policy" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {policies.map((p) => (
                <Card key={p.id} className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Database className="size-4 text-emerald-600" /> {p.name}</CardTitle>
                    <CardDescription>Lưu trữ: {p.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm">
                    <Detail label="Thời hạn lưu" value={p.retention} />
                    <Detail label="Cơ sở pháp lý" value={p.legal} />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">Sửa</Button>
                      <Button size="sm" className="bg-slate-900">Lưu</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="requests" className="mt-4">
            <Card className="rounded-2xl">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Mã', 'Người yêu cầu', 'Loại dữ liệu', 'Ngày', 'Trạng thái'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'DR-120', who: 'Quang Bùi (Tenant)', kind: 'Xoá tài khoản', date: '20/09/2026', status: 'Đã xoá' },
                      { id: 'DR-118', who: 'Minh Anh Realty', kind: 'Xoá ảnh tin đăng VR-1048', date: '18/09/2026', status: 'Đã xoá' },
                      { id: 'DR-115', who: 'Phương Trần (Manager)', kind: 'Xuất dữ liệu cá nhân', date: '14/09/2026', status: 'Đã xuất' },
                    ].map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-4 font-mono text-xs">{r.id}</td>
                        <td className="px-3 py-4">{r.who}</td>
                        <td className="px-3 py-4">{r.kind}</td>
                        <td className="px-3 py-4">{r.date}</td>
                        <td className="px-3 py-4"><Badge variant="outline">{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="legal" className="mt-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> Cơ sở pháp lý áp dụng</CardTitle>
                <CardDescription>Được đội ngũ pháp chế rà soát định kỳ mỗi quý.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                <p>• Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</p>
                <p>• Luật An ninh mạng 2018 · Nghị định 53/2022.</p>
                <p>• Quy định của Ngân hàng Nhà nước về lưu trữ chứng từ thanh toán điện tử.</p>
                <p>• Tiêu chuẩn ISO/IEC 27001 cho hệ thống quản lý an toàn thông tin.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  )
}
