import { AccountShell } from '@/components/account-shell'
import { reviews, listings } from '@/lib/data'

export default function ReviewHistoryPage() {
  return (
    <AccountShell title="Lịch sử đánh giá" desc="Các đánh giá bạn đã để lại trên phòng trọ (chỉ sau khi liên hệ/ở thực tế).">
      <div className="flex flex-col gap-4">
        {reviews.map((r) => {
          const listing = listings.find((l) => l.id === r.listingId)
          return (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between gap-3">
                <b>{listing?.title}</b>
                <span className="text-sm text-amber-600 font-bold">{r.score}/5</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.text}</p>
              <p className="mt-2 text-xs text-slate-400">{r.date} · Đã xác nhận ở/liên hệ</p>
            </div>
          )
        })}
      </div>
    </AccountShell>
  )
}
