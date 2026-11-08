export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import ClientPage from './ClientPage'

export const metadata = {
  title: 'Kết quả thanh toán | Thiên Nhãn Trú Đồ',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center bg-[#F5F5F0] px-4">
          <div className="size-10 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
        </main>
      }
    >
      <ClientPage />
    </Suspense>
  )
}
