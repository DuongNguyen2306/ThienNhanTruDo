import ClientPage from './ClientPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ClientPage params={{ id }} />
}
