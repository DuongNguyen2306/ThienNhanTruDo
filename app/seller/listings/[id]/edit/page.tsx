import { ListingWizard } from '@/components/seller-portal'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  return <ListingWizard editListingId={id} />
}
