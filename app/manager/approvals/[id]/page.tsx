export const dynamic = 'force-dynamic'

import { ApprovalDetail } from '@/components/manager-portal'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ApprovalDetail listingId={id} />
}
