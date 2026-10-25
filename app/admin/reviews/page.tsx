export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import AdminReviewsPage from '@/components/admin-reviews'

export default function AdminReviewsRoute() {
  return (
    <Suspense fallback={null}>
      <AdminReviewsPage />
    </Suspense>
  )
}
