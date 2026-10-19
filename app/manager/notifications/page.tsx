export const dynamic = 'force-dynamic'

import { NotificationCenter } from '@/components/manager-portal'

export default function ManagerNotificationsPage() {
  return (
    <NotificationCenter
      eyebrow="Cổng quản trị"
      title="Trung tâm thông báo"
      description="Theo dõi các yêu cầu xét duyệt và hoạt động quản lý quan trọng."
    />
  )
}
