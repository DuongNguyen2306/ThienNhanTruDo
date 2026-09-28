'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { listings, type ListingStatus } from '@/lib/data'

const tabs: { id: ListingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Nháp' },
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'active', label: 'Đang hiển thị' },
  { id: 'rejected', label: 'Bị từ chối' },
  { id: 'inactive', label: 'Hết phòng / Ẩn' },
]

const statusLabel: Record<ListingStatus, string> = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  active: 'Đang hiển thị',
  rejected: 'Bị từ chối',
  inactive: 'Tạm ẩn',
}

export default function ListingManagementPage() {
  const [tab, setTab] = useState('all')
  const [rows, setRows] = useState(listings.filter((l) => l.sellerId === 's1'))
  const filtered = tab === 'all' ? rows : rows.filter((l) => l.status === tab)

  const mark = (id: string, status: ListingStatus) => setRows((items) => items.map((l) => (l.id === id ? { ...l, status } : l)))

  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Danh sách tin"
          title="Quản lý danh sách tin đăng"
          desc="Ẩn/hiện, đánh dấu đã cho thuê, đẩy tin, sửa nội dung."
          actions={<Link href="/seller/listings/new" className="inline-flex h-9 items-center rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">Tạo tin mới</Link>}
        />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 bg-slate-100">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} className="mt-0 overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-400">
                <tr>{['Tin', 'Trạng thái', 'Lượt xem', 'Thao tác'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <b>{l.title}</b>
                      <span className="block text-xs text-slate-400">{l.id.toUpperCase()}</span>
                      {l.status === 'rejected' && (
                        <span className="mt-1 block text-xs text-red-600" title={l.rejectReason}>Lý do: {l.rejectReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{statusLabel[l.status]}</Badge></td>
                    <td className="px-4 py-3">{l.views}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Link href={`/seller/listings/${l.id}/edit`} className="inline-flex h-7 items-center rounded-lg border border-slate-200 px-2 text-xs">Sửa</Link>
                        <Button size="sm" variant="outline" onClick={() => mark(l.id, l.status === 'inactive' ? 'active' : 'inactive')}>
                          {l.status === 'inactive' ? 'Hiện' : 'Ẩn'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => mark(l.id, 'inactive')}>Đã cho thuê</Button>
                        <Button size="sm" variant="outline">Đẩy tin</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
      </main>
    </SellerLayout>
  )
}
