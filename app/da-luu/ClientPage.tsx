'use client'

import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { BrutalFooter } from '@/components/brutal-footer'
import { SavedListings } from '@/components/saved-listings'
import { useAuth } from '@/components/auth-provider'

export default function SavedPage() {
  const { user, authState } = useAuth()

  return (
    <main className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border-[2.5px] border-[#151515] bg-[#FEE2E2] shadow-[3px_3px_0_#151515]">
            <Heart className="size-5 fill-[#EF4444] text-[#EF4444]" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-[#151515] sm:text-3xl">Tin đã lưu</h1>
            <p className="text-sm text-slate-500">Những phòng bạn đã lưu để xem lại và so sánh.</p>
          </div>
        </div>

        {authState === 'initializing' ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Đang tải...
          </div>
        ) : !user ? (
          // Normally proxy.ts redirects guests to login; this covers an expired session.
          <div className="flex flex-col items-center rounded-2xl border-[2.5px] border-dashed border-[#151515]/30 bg-white px-6 py-16 text-center">
            <p className="font-bold text-[#151515]">Đăng nhập để xem tin đã lưu</p>
            <Link
              href="/dang-nhap?next=%2Fda-luu"
              className="mt-4 rounded-xl border-[2.5px] border-[#151515] bg-[#FDE047] px-6 py-3 font-bold text-[#151515] shadow-[4px_4px_0_#151515]"
            >
              Đăng nhập
            </Link>
          </div>
        ) : (
          <SavedListings />
        )}
      </section>

      <BrutalFooter />
    </main>
  )
}
