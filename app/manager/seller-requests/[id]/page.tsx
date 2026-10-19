export const dynamic = 'force-dynamic'

import { SellerRequestDetail } from '@/components/manager/SellerRequestDetail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SellerRequestDetailPage({ params }: PageProps) {
  const { id } = await params
  return <SellerRequestDetail requestId={id} />
}
