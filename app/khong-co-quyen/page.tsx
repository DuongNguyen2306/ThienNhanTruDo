'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { ROLE_HOME, ROLE_NAV, type Role } from '@/lib/auth'

const labels: Record<Role, string> = {
  tenant: 'Người thuê',
  seller: 'Chủ đăng tin',
  manager: 'Ban quản lý',
  admin: 'Quản trị viên',
}

function DeniedInner() {
  const params = useSearchParams()
  const { user } = useAuth()
  const need = (params.get('need') as Role) || 'tenant'
  const home = user ? ROLE_HOME[user.role] : '/dang-nhap'

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <ShieldAlert className="mx-auto size-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold">Không có quyền truy cập</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Trang này chỉ dành cho vai trò <b>{labels[need]}</b>.
            {user ? (
              <>
                {' '}Bạn đang đăng nhập với vai trò <b>{labels[user.role]}</b> nên không xem được cổng này.
              </>
            ) : (
              <> Hãy đăng nhập đúng tài khoản.</>
            )}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href={home} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
              {user ? `Về cổng ${labels[user.role]}` : 'Đăng nhập'}
            </Link>
            <Link href="/" className="rounded-xl border px-4 py-3 text-sm">Về trang chủ công khai</Link>
          </div>
          {user && (
            <p className="mt-6 text-left text-xs text-slate-400">
              Navbar của bạn gồm: {ROLE_NAV[user.role].map((i) => i.label).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <PublicFooter />
    </main>
  )
}

export default function ForbiddenPage() {
  return (
    <Suspense>
      <DeniedInner />
    </Suspense>
  )
}
