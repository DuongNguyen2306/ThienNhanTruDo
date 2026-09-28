'use client'

import { useState } from 'react'
import { ArrowUp, Crown, Megaphone, WalletCards } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { formatVnd } from '@/lib/data'

const promotions = [
  { id: 'PR-301', listing: 'VR-1052 Lumière Thảo Điền', package: 'Tin VIP 7 ngày', cost: 299000, start: '28/09/2026', end: '05/10/2026', views: 412, contacts: 18 },
  { id: 'PR-298', listing: 'VR-1031 The Marq Residences', package: 'Top tìm kiếm 3 ngày', cost: 199000, start: '24/09/2026', end: '27/09/2026', views: 248, contacts: 11 },
  { id: 'PR-290', listing: 'VR-1022 Thảo Điền Garden Studio', package: 'Tin VIP 7 ngày', cost: 299000, start: '18/09/2026', end: '25/09/2026', views: 512, contacts: 22 },
]

export default function SellerPromotionsPage() {
  const [tab, setTab] = useState('active')
  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Tin đăng"
          title="Lịch sử đẩy tin & gói VIP"
          desc="Theo dõi các lượt đẩy tin VIP và kết quả (lượt xem, yêu cầu hẹn) sau khi đẩy."
          actions={<Button className="bg-amber-500 hover:bg-amber-600"><Crown data-icon="inline-start" /> Mua gói đẩy tin</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary icon={Megaphone} label="Tin đang đẩy" value="2" detail="VR-1052 · VR-1031" />
          <Summary icon={ArrowUp} label="Lượt xem từ VIP" value="1.172" detail="+38% so với tin thường" />
          <Summary icon={WalletCards} label="Tổng chi đẩy tin (tháng)" value={formatVnd(797000)} detail="3 lượt, trung bình 266k/lượt" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="active">Đang chạy</TabsTrigger>
            <TabsTrigger value="expired">Đã kết thúc</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <Card className="rounded-2xl">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-[11px] uppercase tracking-widest text-slate-400">
                    <tr>{['Mã', 'Tin', 'Gói', 'Thời gian', 'Chi phí', 'Lượt xem', 'Yêu cầu hẹn'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {promotions.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-3 py-4 font-mono text-xs">{p.id}</td>
                        <td className="px-3 py-4"><b>{p.listing}</b></td>
                        <td className="px-3 py-4"><Badge variant="outline">{p.package}</Badge></td>
                        <td className="px-3 py-4 text-xs">{p.start} → {p.end}</td>
                        <td className="px-3 py-4 font-mono">{formatVnd(p.cost)}</td>
                        <td className="px-3 py-4">{p.views}</td>
                        <td className="px-3 py-4 text-emerald-700">{p.contacts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </SellerLayout>
  )
}

function Summary({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon /></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold">{value}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}
