import { Suspense } from 'react'

import ClientPage from './ClientPage'

// The client page reads query params (date range / status / type) so that
// dashboard metrics can deep-link into a pre-filtered transaction list.
// Next.js requires a Suspense boundary around `useSearchParams` for
// production builds, otherwise the route fails to prerender.
export default function TransactionManagementPage() {
  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  )
}
