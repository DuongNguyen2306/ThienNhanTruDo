// app/admin/layout.tsx — wraps ALL /admin/* pages with AdminLayout
import { AdminLayout } from '@/components/admin-portal'
import { PortalShell } from '@/components/shells'

export default function AdminLayoutGroup({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalShell allow="admin">
      <AdminLayout>{children}</AdminLayout>
    </PortalShell>
  )
}
