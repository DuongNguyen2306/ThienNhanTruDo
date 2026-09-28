import { AccountShell } from '@/components/account-shell'
import { ListingCard } from '@/components/listing-card'
import { listings } from '@/lib/data'

export default function SavedPage() {
  const saved = listings.filter((l) => ['vr-1052', 'vr-1031', 'vr-1022'].includes(l.id))
  return (
    <AccountShell title="Tin đăng đã lưu" desc="Danh sách phòng yêu thích để so sánh tổng chi phí và đặt lịch xem.">
      <div className="grid gap-5 sm:grid-cols-2">
        {saved.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </AccountShell>
  )
}
