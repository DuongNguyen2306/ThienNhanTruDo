export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import ClientPage from './ClientPage'

export default function Page() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F5F5F0]">
        <div className="mx-auto max-w-[1440px] px-5 py-6 lg:px-10">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-full rounded-xl bg-[#151515]/10" />
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-[#151515]/10" />
              ))}
            </div>
          </div>
        </div>
      </main>
    }>
      <ClientPage />
    </Suspense>
  )
}
