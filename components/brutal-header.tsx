'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tìm phòng', href: '/tim-kiem' },
  { label: 'Đăng tin', href: '/tin-dang' },
]

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M14 2L2 10V26H10V18H18V26H26V10L14 2Z" fill="#151515" stroke="#151515" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="14" cy="10" r="3" fill="#FDE047"/>
    </svg>
  )
}

export function BrutalHeader() {
  const pathname = usePathname()
  const { user, ready } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b-[2px] border-[#151515] bg-[#F5F5F0]">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <LogoIcon />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
              THIÊN
            </span>
            <span className="text-lg font-black italic tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
              DỮ
            </span>
            <span className="text-lg font-black tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 900 }}>
              TRÚ ĐỒ
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#FDE047] text-[#151515] border-[2px] border-[#151515] shadow-[2px_2px_0_#151515]'
                    : 'text-[#151515]/70 hover:bg-[#151515]/5 hover:text-[#151515] border-2 border-transparent'
                )}
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {!ready ? (
            <div className="h-10 w-32 animate-pulse rounded-lg bg-[#151515]/10" />
          ) : user ? (
            <Link
              href="/tai-khoan"
              className="flex items-center gap-2 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-[#FDE047] text-sm font-black text-[#151515]">
                {user.initials}
              </span>
              <span className="hidden text-sm font-semibold text-[#151515] sm:block" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                {user.name}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/dang-nhap"
                className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/dang-ky"
                className="rounded-lg border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
