'use client'

import { useState } from 'react'
import { BadgeCheck, Bell, Building2, CalendarClock, Megaphone, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountShell } from '@/components/account-shell'

const initial = [
  { id: 1, type: 'tin', title: 'Có phòng mới tại Thảo Điền phù hợp', body: 'Căn hộ Lumière Thảo Điền vừa được cập nhật — 8,5 triệu/tháng, đã Verified.', time: '5 phút trước', read: false },
  { id: 2, type: 'hen', title: 'Lịch hẹn của bạn đã được xác nhận', body: 'Minh Anh Realty đã chấp nhận lịch hẹn 29/09 · 10:00.', time: '1 giờ trước', read: false },
  { id: 3, type: 'canhbao', title: 'Có 1 báo cáo vi phạm mới', body: 'Manager đã ghi nhận báo cáo về tin VR-1018 Green Nest Bình Thạnh.', time: 'Hôm qua', read: true },
  { id: 4, type: 'system', title: 'Cập nhật điều khoản bảo mật', body: 'Thiện Nhân trú đồ bổ sung chính sách lưu trữ dữ liệu — có hiệu lực từ 01/10/2026.', time: '2 ngày trước', read: true },
  { id: 5, type: 'tin', title: 'Giá phòng VR-1048 đã giảm', body: 'Sunrise Studio Quận 1 điều chỉnh từ 13,5tr xuống 12,5tr/tháng.', time: '3 ngày trước', read: true },
]

const icon = {
  tin: Megaphone,
  hen: CalendarClock,
  canhbao: ShieldAlert,
  system: Building2,
} as const

export default function NotificationsPage() {
  const [items, setItems] = useState(initial)
  const [tab, setTab] = useState('all')

  const markAll = () => setItems((rows) => rows.map((r) => ({ ...r, read: true })))
  const toggle = (id: number) => setItems((rows) => rows.map((r) => (r.id === id ? { ...r, read: !r.read } : r)))

  const visible = items.filter((i) => (tab === 'all' ? true : tab === 'unread' ? !i.read : i.type === tab))

  return (
    <AccountShell title="Thông báo" desc="Tin mới, lịch hẹn, cảnh báo và cập nhật điều khoản từ Thiện Nhân trú đồ.">
      <Card className="mb-4 rounded-2xl border-slate-200">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <CardTitle>Cài đặt nhận thông báo</CardTitle>
            <CardDescription>Chọn kênh nhận: email · push · Zalo · SMS.</CardDescription>
          </div>
          <div className="flex gap-2">
            {['Tin mới', 'Lịch hẹn', 'Cảnh báo', 'Điều khoản'].map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-xs">
                <input type="checkbox" defaultChecked className="accent-emerald-600" /> {t}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">Chưa đọc</TabsTrigger>
          <TabsTrigger value="tin">Tin mới</TabsTrigger>
          <TabsTrigger value="hen">Lịch hẹn</TabsTrigger>
          <TabsTrigger value="canhbao">Cảnh báo</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-0 flex flex-col gap-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={markAll}><BadgeCheck data-icon="inline-start" /> Đánh dấu tất cả đã đọc</Button>
          </div>
          {visible.map((n) => {
            const Icon = icon[n.type as keyof typeof icon]
            return (
              <Card key={n.id} className={`rounded-2xl border ${n.read ? 'border-slate-200' : 'border-emerald-300 bg-emerald-50/40'}`}>
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon /></span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <b>{n.title}</b>
                      <span className="text-xs text-slate-400">{n.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggle(n.id)}>{n.read ? 'Đã đọc' : 'Đánh dấu đã đọc'}</Button>
                </CardContent>
              </Card>
            )
          })}
          {visible.length === 0 && (
            <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500"><Bell className="mr-2 inline size-4" /> Không có thông báo nào.</p>
          )}
        </TabsContent>
      </Tabs>
    </AccountShell>
  )
}
