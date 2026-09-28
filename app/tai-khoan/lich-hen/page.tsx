'use client'

import { Badge } from '@/components/ui/badge'
import { AccountShell } from '@/components/account-shell'
import { appointments } from '@/lib/data'

const tone: Record<string, string> = {
  'Chờ duyệt': 'border-amber-200 bg-amber-50 text-amber-800',
  'Đã chốt': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Đã hủy': 'border-slate-200 bg-slate-50 text-slate-600',
}

export default function AppointmentsPage() {
  return (
    <AccountShell title="Lịch sử xem phòng" desc="Theo dõi lịch hẹn đã đặt với Seller: Chờ duyệt, Đã chốt, Đã hủy.">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-widest text-slate-400">
            <tr>{['Mã', 'Phòng', 'Chủ nhà', 'Thời gian', 'Trạng thái'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                <td className="px-4 py-3 font-semibold">{a.listingTitle}</td>
                <td className="px-4 py-3">{a.seller}</td>
                <td className="px-4 py-3">{a.when}</td>
                <td className="px-4 py-3"><Badge className={tone[a.status]}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountShell>
  )
}
