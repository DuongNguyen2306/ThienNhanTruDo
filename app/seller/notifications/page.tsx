export const dynamic = 'force-dynamic'

import { NotificationCenter } from '@/components/manager-portal'

export default function SellerNotificationsPage() {
  return (
    <NotificationCenter
      eyebrow="Khu vực chủ trọ"
      title="Thông báo chủ trọ"
      description="Theo dõi tin đăng, lịch hẹn và các cập nhật liên quan đến hoạt động cho thuê."
    />
  )
}
