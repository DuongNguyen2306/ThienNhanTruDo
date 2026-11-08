// /da-luu — "Tin đã lưu" for every signed-in role (tenant, seller, manager, admin).
// Access: proxy.ts requires a session but no specific role (see AUTH_ONLY_PATHS in lib/auth.ts).
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import ClientPage from './ClientPage'

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F5F0]" />}>
      <ClientPage />
    </Suspense>
  )
}
