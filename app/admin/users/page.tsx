export const dynamic = 'force-dynamic'

import { Suspense } from 'react'

import { UserManagementPage } from '@/components/admin-portal'

// The user list reads the `role` query param so dashboard user-count metrics
// can deep-link into a pre-filtered list. Next.js requires a Suspense
// boundary around `useSearchParams` for production builds.
export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <UserManagementPage />
    </Suspense>
  )
}
