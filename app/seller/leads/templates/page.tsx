'use client'

import { useState } from 'react'
import { Bot, MessageSquare, Plus, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'

const templates = [
  { id: 't1', name: 'Xác nhận lịch hẹn', channel: 'Zalo · SMS', preview: 'Chào anh/chị, lịch hẹn xem phòng Lumière Thảo Điền 29/09 · 10:00 đã được xác nhận. Cảm ơn!', sent: 412, ctr: 92 },
  { id: 't2', name: 'Đổi giờ hẹn', channel: 'Zalo', preview: 'Rất tiếc vì sự bất tiện, mình xin phép dời sang 30/09 · 14:00. Nếu phù hợp mình gửi lại địa chỉ nhé.', sent: 87, ctr: 78 },
  { id: 't3', name: 'Gửi địa chỉ chi tiết', channel: 'Zalo', preview: 'Địa chỉ: 24B Nguyễn Văn Hưởng, Thảo Điền. Hẻm 12, đối diện trạm xe buýt 141. Có chỗ để ô tô.', sent: 145, ctr: 88 },
  { id: 't4', name: 'Cảm ơn sau xem phòng', channel: 'SMS', preview: 'Cảm ơn anh/chị đã ghé xem phòng. Mình sẵn sàng hỗ trợ thêm thông tin hợp đồng & bảng giá điện nước.', sent: 320, ctr: 95 },
]

export default function LeadTemplatesPage() {
  const [items, setItems] = useState(templates)
  const [editing, setEditing] = useState<(typeof items)[number] | null>(null)
  const [draft, setDraft] = useState('')

  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Khách hàng"
          title="Mẫu tin nhắn & chatbot"
          desc="Các mẫu trả lời nhanh cho lead, hỗ trợ tạo bằng AI từ tin đăng."
          actions={<Button className="bg-slate-900" onClick={() => { setEditing({ id: '', name: 'Mẫu mới', channel: 'Zalo', preview: '', sent: 0, ctr: 0 }); setDraft('') }}><Plus data-icon="inline-start" /> Tạo mẫu mới</Button>}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="size-4 text-emerald-600" /> {t.name}</CardTitle>
                    <CardDescription>{t.channel} · Đã gửi {t.sent} · Tỉ lệ phản hồi {t.ctr}%</CardDescription>
                  </div>
                  <Badge variant="outline">Mẫu</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 text-slate-600">{t.preview}</div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline"><Wand2 data-icon="inline-start" /> Gợi ý bằng AI</Button>
                  <Button size="sm" className="bg-slate-900" onClick={() => { setEditing(t); setDraft(t.preview) }}>Sửa</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5">
            <Card className="w-full max-w-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="size-4 text-emerald-600" /> {editing.id ? 'Sửa mẫu' : 'Tạo mẫu'}</CardTitle>
                <CardDescription>Có thể dùng biến: {'{tenant_name}'}, {'{listing_title}'}, {'{when}'}.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <input className="h-11 rounded-xl border px-3" defaultValue={editing.name} placeholder="Tên mẫu" />
                <select className="h-11 rounded-xl border px-3" defaultValue={editing.channel}><option>Zalo</option><option>SMS</option><option>Zalo · SMS</option></select>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-32 rounded-xl border p-3" placeholder="Nội dung mẫu" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)}>Huỷ</Button>
                  <Button className="bg-emerald-600" onClick={() => {
                    if (editing.id) {
                      setItems((rows) => rows.map((r) => r.id === editing.id ? { ...r, preview: draft } : r))
                    } else {
                      setItems((rows) => [...rows, { ...editing, preview: draft, id: `t${Date.now()}` }])
                    }
                    setEditing(null)
                  }}>Lưu mẫu</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </SellerLayout>
  )
}
