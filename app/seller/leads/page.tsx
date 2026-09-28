'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SellerLayout } from '@/components/seller-portal'
import { PageHeader } from '@/components/portal-sidebar'
import { sellerLeads } from '@/lib/data'

export default function LeadsPage() {
  const [rows, setRows] = useState(sellerLeads)
  const setStatus = (id: string, status: string) => setRows((items) => items.map((r) => (r.id === id ? { ...r, status } : r)))
  return (
    <SellerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader eyebrow="Khách hàng" title="Quản lý lịch hẹn & khách thuê" desc="Yêu cầu hẹn xem nhà từ Tenant: chấp nhận, đổi giờ hoặc hủy." />
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>{['Khách', 'SĐT', 'Tin', 'Ngày giờ', 'Trạng thái', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">{r.phone}</td>
                  <td className="px-4 py-3">{r.listing}</td>
                  <td className="px-4 py-3">{r.when}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-emerald-600" onClick={() => setStatus(r.id, 'Đã chấp nhận')}>Chấp nhận</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'Đổi giờ')}>Đổi giờ</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'Đã hủy')}>Hủy</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </SellerLayout>
  )
}
