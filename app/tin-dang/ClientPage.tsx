'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicFooter, PublicHeader } from '@/components/shells'
import { useAuth } from '@/components/auth-provider'

export default function PostListingPage() {
  const router = useRouter()
  const { user, authState } = useAuth()

  // Check if user can post listing
  const canPostListing = user?.role === 'seller' && user?.sellerStatus === 'active'

  useEffect(() => {
    // If user can post listing, redirect to seller portal
    if (canPostListing) {
      router.replace('/seller/listings/new')
    }
  }, [canPostListing, router])

  // Still loading auth
  if (authState === 'initializing') {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PublicHeader />
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto size-16 rounded-full bg-slate-200" />
            <div className="h-8 w-48 mx-auto rounded-lg bg-slate-200" />
            <div className="h-4 w-64 mx-auto rounded-lg bg-slate-200" />
          </div>
        </div>
        <PublicFooter />
      </main>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <PublicHeader />
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="size-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-800">Đăng nhập để tiếp tục</h1>
          <p className="mt-3 text-slate-500">
            Bạn cần đăng nhập tài khoản để đăng tin. Nếu chưa có, hãy đăng ký — hoàn toàn miễn phí.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/dang-nhap">
              <Button className="h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/dang-ky">
              <Button variant="outline" className="h-12 w-full text-base">
                Tạo tài khoản mới
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-500" />
            <p className="text-sm text-slate-500">
              Chỉ <b>chủ nhà đã được phê duyệt</b> mới được đăng tin. Người thuê không cần đăng ký — chỉ cần duyệt tin là đủ.
            </p>
          </div>
        </div>
        <PublicFooter />
      </main>
    )
  }

  // Logged in but not an approved seller
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <PublicHeader />
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100">
          <ShieldCheck className="size-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-800">Bạn không có quyền đăng tin</h1>
        <p className="mt-3 text-slate-500">
          Chỉ <b>chủ nhà đã được phê duyệt</b> mới có thể đăng tin. Nếu bạn muốn đăng ký làm chủ nhà, hãy làm theo hướng dẫn bên dưới.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {user.sellerStatus === 'pending' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-sm font-semibold text-amber-800">Tài khoản của bạn đang chờ duyệt</p>
              <p className="mt-1 text-sm text-amber-700">
                Chúng tôi sẽ thông báo khi tài khoản được phê duyệt. Thường mất 1-2 ngày làm việc.
              </p>
            </div>
          ) : (
            <Link href="/dang-ky">
              <Button className="h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700">
                Đăng ký làm chủ nhà
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="outline" className="h-12 w-full text-base">
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
      <PublicFooter />
    </main>
  )
}
