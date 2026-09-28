import { AuditHub } from '@/components/admin-portal'
import { ManagerLayout } from '@/components/manager-portal'
import { PageHeader } from '@/components/portal-sidebar'

export default function ManagerAuditPage() {
  return (
    <ManagerLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Minh bạch"
          title="Audit log của Manager"
          desc="Các thao tác nhạy cảm của Manager (phê duyệt, từ chối, khoá tin, cấp Verified) đều được ghi để chống thông đồng."
        />
        <AuditHub />
      </main>
    </ManagerLayout>
  )
}
