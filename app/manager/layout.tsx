// app/manager/layout.tsx — wraps ALL /manager/* pages with ManagerPortalShell
import { ManagerPortalShell } from '@/components/manager-portal-shell'

export default function ManagerLayoutGroup({
  children,
}: {
  children: React.ReactNode
}) {
  return <ManagerPortalShell>{children}</ManagerPortalShell>
}
