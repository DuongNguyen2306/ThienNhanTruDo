'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { GUEST_NAV, ROLE_BADGE, ROLE_NAV, type NavItem, type Role } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function Brand({ href = '/', badge }: { href?: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 font-bold tracking-tight whitespace-nowrap"
    >
      <span className="text-[1.35rem] leading-none text-white" style={{ fontFamily: "'Allura', cursive" }}>
        Thiên Nhãn
      </span>
      <span className="text-[1.35rem] leading-none text-white/70" style={{ fontFamily: "'Allura', cursive", fontStyle: 'italic' }}>
        Trú Đồ
      </span>
      {badge ? (
        <span className="ml-2 hidden rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300 sm:inline">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

export function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/tai-khoan') return pathname === '/tai-khoan'
  if (href === '/seller') return pathname === '/seller'
  if (href === '/manager') return pathname === '/manager'
  if (href === '/admin') return pathname === '/admin'
  if (href === '/seller/listings') {
    return pathname === '/seller/listings' || (pathname.startsWith('/seller/listings/') && !pathname.endsWith('/new') && !pathname.endsWith('/create'))
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({ items, onClick, className }: { items: NavItem[]; onClick?: () => void; className?: string }) {
  const pathname = usePathname()
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            className,
            isNavActive(pathname, item.href)
              ? 'bg-white/15 font-semibold text-white shadow-sm'
              : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {item.label}
          {item.hint ? (
            <span className="ml-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{item.hint}</span>
          ) : null}
        </Link>
      ))}
    </>
  )
}

export function AppHeader({ variant = 'public' }: { variant?: 'public' | 'portal' }) {
  const { user, logout, ready } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const role = user?.role
  const items = role ? ROLE_NAV[role] : GUEST_NAV
  const home = role && role !== 'tenant' ? ROLE_NAV[role][0].href : '/'
  const badge = role ? ROLE_BADGE[role] : undefined

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const onLogout = () => {
    logout()
    setMenuOpen(false)
    setOpen(false)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f172a]">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        <Brand href={home} badge={variant === 'portal' ? badge : role ? badge : undefined} />
        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          {ready && <NavLinks items={items} className="rounded-xl px-4 py-2.5 whitespace-nowrap font-medium transition-all duration-200" />}
        </nav>
        <div className="flex items-center gap-3">
          {!ready ? (
            <div className="h-9 w-20 animate-pulse rounded-xl bg-white/10" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-white/10"
                aria-label="Menu tài khoản"
                aria-expanded={menuOpen}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  {user.initials}
                </span>
                <div className="hidden text-left sm:block">
                  <b className="block text-sm font-semibold text-white">{user.name}</b>
                  <span className="text-xs text-white">{user.title}</span>
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-white/10 bg-[#1e293b] py-1 shadow-xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/10"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/dang-nhap" className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white sm:inline-flex">
                Đăng nhập
              </Link>
              <Link href="/dang-ky" className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25">
                Đăng ký
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Mở menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open && ready && (
        <div className="border-t border-white/10 bg-[#0f172a] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            <NavLinks items={items} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm text-slate-300 [&amp;:hover]:bg-white/10" />
            {user ? (
              <button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-white/10">
                Đăng xuất
              </button>
            ) : (
              <Link href="/dang-nhap" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/10">
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export function PublicHeader() {
  const { user, logout, ready } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const onLogout = () => {
    logout()
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/50 bg-[#064E3B]">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        {/* Nav trái */}
        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          <Link href="/tim-kiem" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Tìm phòng
          </Link>
          <Link href="/tin-dang" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Đăng tin
          </Link>
          <Link href="/pricing" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Bảng giá
          </Link>
          <Link href="/ve-verirent" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Về chúng tôi
          </Link>
        </nav>

        {/* Logo giữa */}
        <Brand href="/" />

        {/* Nav phải */}
        <div className="hidden items-center gap-3 lg:flex">
          {!ready ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-white/10"
                aria-label="Menu tài khoản"
                aria-expanded={menuOpen}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  {user.initials}
                </span>
                <div className="hidden text-left sm:block">
                  <b className="block text-sm font-semibold text-white">{user.name}</b>
                  <span className="text-xs text-emerald-200/80">{user.title}</span>
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-emerald-900/50 bg-[#064E3B]/90 backdrop-blur-md py-1 shadow-xl">
                  <div className="border-b border-emerald-800/50 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-emerald-200/70">{user.email}</p>
                  </div>
                  <Link
                    href="/tai-khoan"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-emerald-100 transition-colors hover:bg-emerald-800/30"
                  >
                    Tài khoản
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-emerald-800/30"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/dang-nhap" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20">
                Đăng nhập
              </Link>
              <Link href="/dang-ky" className="rounded-lg bg-[#059669] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#10B981]">
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-white transition-colors duration-200 hover:bg-white/10 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-4" />
        </button>
      </div>
    </header>
  )
}

export function TransparentHeader() {
  const { user, logout, ready } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const onLogout = () => {
    logout()
    setMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        {/* Nav trái */}
        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          <Link href="/tim-kiem" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Tìm phòng
          </Link>
          <Link href="/tin-dang" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Đăng tin
          </Link>
          <Link href="/pricing" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Bảng giá
          </Link>
          <Link href="/ve-verirent" className="rounded-xl px-4 py-2.5 font-medium text-emerald-100/80 transition-all duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap">
            Về chúng tôi
          </Link>
        </nav>

        {/* Logo giữa */}
        <Brand href="/" />

        {/* Nav phải */}
        <div className="hidden items-center gap-3 lg:flex">
          {!ready ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-white/50"
                aria-label="Menu tài khoản"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  {user.initials}
                </span>
                <div className="hidden text-left sm:block">
                  <b className="block text-sm font-semibold text-white">{user.name}</b>
                  <span className="text-xs text-white">{user.title}</span>
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-emerald-900/50 bg-[#064E3B]/90 backdrop-blur-md py-1 shadow-xl">
                  <div className="border-b border-emerald-800/50 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-emerald-200/70">{user.email}</p>
                  </div>
                  <Link href="/tai-khoan" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-emerald-100 transition-colors hover:bg-emerald-800/30">
                    Tài khoản
                  </Link>
                  <button type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-emerald-800/30">
                    <LogOut className="size-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/dang-nhap" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20">
                Đăng nhập
              </Link>
              <Link href="/dang-ky" className="rounded-lg bg-[#059669] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#10B981]">
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200/60 text-slate-600 transition-colors duration-200 hover:bg-white/50 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-4" />
        </button>
      </div>
    </header>
  )
}

export function PortalShell({
  children,
  allow,
}: {
  children: React.ReactNode
  allow: Role
}) {
  return (
    <RoleGate allow={allow}>
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
        <AppHeader variant="portal" />
        {children}
      </div>
    </RoleGate>
  )
}

export function RoleGate({ allow, children }: { allow: Role | Role[]; children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const allowed = Array.isArray(allow) ? allow : [allow]
  const allowedKey = allowed.join(',')

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace(`/dang-nhap?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (!allowed.includes(user.role)) {
      router.replace(`/khong-co-quyen?need=${allowed[0]}`)
    }
  }, [ready, user, pathname, router, allowedKey])

  if (!ready || !user || !allowed.includes(user.role)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang kiểm tra quyền truy cập...</div>
  }

  return <>{children}</>
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm text-slate-500 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <p className="text-base font-bold text-slate-800" style={{ fontFamily: "'Allura', cursive", fontSize: '1.4rem' }}>
            Thiên Nhãn <em>trú đồ</em>
          </p>
          <p className="mt-2 leading-6">Nền tảng phòng trọ minh bạch tại Việt Nam. Mọi tin đăng đã được Manager kiểm định.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Về Thiên Nhãn trú đồ</p>
          <ul className="mt-2 space-y-1.5">
            <li><Link href="/ve-verirent" className="hover:text-white">Câu chuyện</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Bảng giá</Link></li>
            <li><Link href="/quy-che" className="hover:text-white">Điều khoản</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Hỗ trợ</p>
          <ul className="mt-2 space-y-1.5">
            <li><Link href="/ho-tro" className="hover:text-white">Trung tâm hỗ trợ</Link></li>
            <li><Link href="/ho-tro" className="hover:text-white">Câu hỏi thường gặp</Link></li>
            <li><Link href="/ho-tro" className="hover:text-white">Liên hệ CSKH</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Đối tác</p>
          <ul className="mt-2 space-y-1.5">
            <li>VNPay · VietQR</li>
            <li>Goong Map</li>
            <li>VNPT eKYC</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-6 text-center text-xs text-slate-400">
        © 2026 Thiên Nhãn trú đồ — Số ĐKKD 0316-999-111 · Cơ quan cấp: Sở KH&ĐT TP.HCM
      </div>
    </footer>
  )
}
