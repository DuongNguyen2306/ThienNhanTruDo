export const dynamic = 'force-dynamic'

import { ReportDetail } from '@/components/manager-portal'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ReportDetail reportId={id} />
}
