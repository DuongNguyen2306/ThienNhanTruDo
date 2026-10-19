// app/seller/layout.tsx — wraps ALL /seller/* pages with SellerPortalShell
import { SellerPortalShell } from '@/components/shells'

export default function SellerLayoutGroup({
  children,
}: {
  children: React.ReactNode
}) {
  // SellerPortalShell already includes:
  // - Portal Header (white background, black text)
  // - PortalSidebar (light variant)
  // - Main content wrapper with max-width
  // Pages should just return their content, NOT wrap with SellerLayout again.
  return <SellerPortalShell>{children}</SellerPortalShell>
}
