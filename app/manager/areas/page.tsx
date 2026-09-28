'use client'

import { useState } from 'react'
import { Layers, MapPin, Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ManagerLayout } from '@/components/manager-portal'
import { PageHeader } from '@/components/portal-sidebar'

const areas = [
  { id: 'a1', name: 'TP. Thủ Đức', managers: ['Mai Linh'], listings: 412, sla: '3h 18m', coverage: 92 },
  { id: 'a2', name: 'Quận 1', managers: ['Thanh Sơn'], listings: 358, sla: '3h 55m', coverage: 88 },
  { id: 'a3', name: 'Quận 7', managers: ['Phương Trần'], listings: 281, sla: '4h 02m', coverage: 86 },
  { id: 'a4', name: 'Bình Thạnh', managers: ['Thanh Sơn'], listings: 198, sla: '3h 32m', coverage: 90 },
  { id: 'a5', name: 'Gò Vấp · Tân Bình', managers: ['Khánh Vy'], listings: 165, sla: '5h 11m', coverage: 70 },
]

export default function ManagerAreasPage() {
  const [rows] = useState(areas)
  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Vận hành"
          title="Phân vùng phụ trách"
          desc="Phân chia khu vực duyệt giữa các Manager, đảm bảo không có vùng 'trống' và cân bằng SLA."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((a) => (
            <Card key={a.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><MapPin className="size-4 text-emerald-600" /> {a.name}</CardTitle>
                    <CardDescription>{a.listings} tin đang phụ trách · SLA {a.sla}</CardDescription>
                  </div>
                  <Badge variant="outline" className={a.coverage > 85 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}>{a.coverage}% phủ</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="flex items-center gap-2 text-slate-500"><Users2 className="size-3.5" /> Manager phụ trách: <b className="ml-1 text-slate-700">{a.managers.join(', ')}</b></p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${a.coverage}%` }} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline"><Layers data-icon="inline-start" /> Gán lại vùng</Button>
                  <Button size="sm" className="bg-slate-900">Điều chỉnh SLA</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </ManagerLayout>
  )
}
