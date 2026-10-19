// app/tai-khoan/layout.tsx — wraps ALL /tai-khoan/* pages with TenantLayout
import { TenantLayout } from '@/components/tenant-layout'

export default function TaiKhoanLayoutGroup({
  children,
}: {
  children: React.ReactNode
}) {
  return <TenantLayout>{children}</TenantLayout>
}
