'use client'

import { useState } from 'react'
import { Database, Globe, KeyRound, Lock, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminLayout } from '@/components/admin-portal'
import { PageHeader } from '@/components/portal-sidebar'

const integrations = [
  { id: 'vnpay', name: 'VNPay', category: 'Thanh toán', status: 'Hoạt động', keys: ['Terminal ID', 'Secret Hash', 'Webhook URL'], env: 'production' },
  { id: 'goong', name: 'Goong Map', category: 'Bản đồ', status: 'Hoạt động', keys: ['API Key', 'Tile URL', 'Geocode URL'], env: 'production' },
  { id: 'esms', name: 'eSMS', category: 'OTP / SMS', status: 'Hoạt động', keys: ['API Key', 'Brandname', 'Secret'], env: 'production' },
  { id: 'facebook', name: 'Facebook OAuth', category: 'Đăng nhập', status: 'Bảo trì', keys: ['App ID', 'App Secret', 'Redirect URI'], env: 'staging' },
  { id: 'gemini', name: 'Gemini (phân tích ảnh)', category: 'AI', status: 'Bật thử nghiệm', keys: ['API Key', 'Project ID'], env: 'sandbox' },
]

const webhooks = [
  { id: 'wh-01', name: 'VNPay → /api/payment/webhook', event: 'payment.completed', enabled: true, lastFired: '14/09/2026 · 14:02' },
  { id: 'wh-02', name: 'Manager → /api/listings/verified', event: 'listing.verified', enabled: true, lastFired: '14/09/2026 · 12:21' },
  { id: 'wh-03', name: 'Khiếu nại → Slack #verirent-ops', event: 'report.critical', enabled: true, lastFired: '13/09/2026 · 18:30' },
  { id: 'wh-04', name: 'Reconcile batch 23h', event: 'finance.reconcile', enabled: false, lastFired: '—' },
]

export default function IntegrationsPage() {
  const [showNew, setShowNew] = useState(false)

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Hệ thống"
          title="Tích hợp API & Webhook"
          desc="Quản lý khoá API, môi trường và webhook realtime. Mọi thay đổi đều sinh audit log."
          actions={<Button className="bg-slate-900" onClick={() => setShowNew(true)}><Plus data-icon="inline-start" /> Thêm tích hợp</Button>}
        />

        <Tabs defaultValue="all">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="payment">Thanh toán</TabsTrigger>
            <TabsTrigger value="map">Bản đồ</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="webhooks">Webhook</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <IntegrationList rows={integrations} />
          </TabsContent>
          <TabsContent value="payment" className="mt-4">
            <IntegrationList rows={integrations.filter((i) => i.category === 'Thanh toán')} />
          </TabsContent>
          <TabsContent value="map" className="mt-4">
            <IntegrationList rows={integrations.filter((i) => i.category === 'Bản đồ')} />
          </TabsContent>
          <TabsContent value="ai" className="mt-4">
            <IntegrationList rows={integrations.filter((i) => i.category === 'AI')} />
          </TabsContent>
          <TabsContent value="webhooks" className="mt-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Webhook đang đăng ký</CardTitle>
                <CardDescription>Bật/tắt nhanh, xem lần chạy gần nhất.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Tên', 'Sự kiện', 'Lần chạy cuối', 'Trạng thái', ''].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {webhooks.map((w) => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="px-3 py-4 font-mono text-xs">{w.name}</td>
                        <td className="px-3 py-4"><Badge variant="outline">{w.event}</Badge></td>
                        <td className="px-3 py-4 text-xs text-slate-500">{w.lastFired}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-bold ${w.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            <span className={`size-2 rounded-full ${w.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} /> {w.enabled ? 'Bật' : 'Tắt'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <Button size="sm" variant="ghost"><RefreshCcw className="size-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-lg rounded-2xl">
              <CardHeader>
                <CardTitle>Thêm tích hợp</CardTitle>
                <CardDescription>Mặc định sẽ chạy ở sandbox trước khi chuyển production.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <select className="h-11 rounded-xl border px-3"><option>Thanh toán</option><option>Bản đồ</option><option>AI</option><option>OTP/SMS</option></select>
                <input className="h-11 rounded-xl border px-3" placeholder="Tên nhà cung cấp" />
                <input className="h-11 rounded-xl border px-3" placeholder="API Key" />
                <input className="h-11 rounded-xl border px-3" placeholder="Secret" type="password" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowNew(false)}>Huỷ</Button>
                  <Button className="bg-emerald-600" onClick={() => setShowNew(false)}>Tạo & lưu audit</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

function IntegrationList({ rows }: { rows: typeof integrations }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((i) => (
        <Card key={i.id} className="rounded-2xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Database className="size-4 text-emerald-600" /> {i.name}</CardTitle>
                <CardDescription>{i.category} · Môi trường {i.env}</CardDescription>
              </div>
              <Badge variant="outline" className={i.status === 'Hoạt động' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : i.status === 'Bảo trì' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-violet-200 bg-violet-50 text-violet-700'}>{i.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {i.keys.map((k) => (
              <div key={k} className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2 text-xs">
                <span className="flex items-center gap-2 text-slate-500"><KeyRound className="size-3.5" /> {k}</span>
                <span className="font-mono">••••••••</span>
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline"><Globe data-icon="inline-start" /> Test kết nối</Button>
              <Button size="sm" variant="outline"><Lock data-icon="inline-start" /> Rotate key</Button>
              <Button size="sm" variant="outline" className="text-red-600"><Trash2 data-icon="inline-start" /> Gỡ</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-500">Chưa có tích hợp nào trong mục này.</p>}
    </div>
  )
}
