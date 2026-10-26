'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { NotificationBell } from '@/components/notification-bell'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect, useMemo } from 'react'

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M14 2L2 10V26H10V18H18V26H26V10L14 2Z" fill="#151515" stroke="#151515" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="14" cy="10" r="3" fill="#FDE047"/>
    </svg>
  )
}

// Check if user can post listing
function canPostListing(user: { role: string; sellerStatus?: string } | null): boolean {
  return user?.role === 'seller' && user?.sellerStatus === 'active'
}

export function BrutalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, authState, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Determine nav items based on user role
  const navItems = useMemo(() => {
    const items = [
      { label: 'Trang chủ', href: '/' },
      { label: 'Tìm phòng', href: '/tim-kiem' },
      { label: 'Đã lưu', href: '/tai-khoan/da-luu', icon: 'bookmark' },
    ]
    
    // Only show "Đăng tin" for approved sellers
    if (canPostListing(user)) {
      items.push({ label: 'Đăng tin', href: '/seller/listings/new' })
    }
    
    return items
  }, [user])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    router.push('/dang-nhap')
  }

  // Render based on auth state
  const renderAuthSection = () => {
    // During initialization, show login button (conservative - assume not logged in until proven)
    // This prevents the "gray box" issue
    if (authState === 'initializing' || !user) {
      return (
        <Link
          href="/dang-nhap"
          className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          
        >
          Đăng nhập
        </Link>
      )
    }

    // Authenticated: show user avatar/menu
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 shadow-[2px_2px_0_#151515] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-[#FDE047] text-sm font-black text-[#151515]">
            {user.initials}
          </span>
          <span className="hidden text-sm font-semibold text-[#151515] sm:block" >
            {user.name}
          </span>
          <svg
            className={cn(
              'hidden size-4 text-[#151515] transition-transform sm:block',
              menuOpen && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515]">
            {/* User Info */}
            <div className="border-b border-[#151515]/20 px-4 py-3">
              <p className="text-sm font-semibold text-[#151515]">{user.fullName || user.name}</p>
              <p className="text-xs text-[#151515]/60">{user.email || user.phone}</p>
              <span className="mt-1 inline-block rounded bg-[#FDE047] px-2 py-0.5 text-xs font-semibold text-[#151515]">
                {user.title}
              </span>
            </div>

            {/* Menu Items - Role-based and Context-aware */}
            <div className="py-1">
              
              {/* Profile Link - based on role */}
              {user.role === 'tenant' && (
                <Link
                  href="/tai-khoan"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Tài khoản
                </Link>
              )}

              {user.role === 'seller' && (
                <Link
                  href="/seller/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hồ sơ Seller
                </Link>
              )}

              {user.role === 'manager' && (
                <Link
                  href="/manager/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hồ sơ quản lý
                </Link>
              )}

              {user.role === 'admin' && (
                <Link
                  href="/admin/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hồ sơ quản trị
                </Link>
              )}

              {/* TENANT specific: Seller registration flow */}
              {user.role === 'tenant' && (
                <>
                  {user.sellerStatus === 'pending' ? (
                    <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515]/50">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đang chờ duyệt Seller
                    </div>
                  ) : user.sellerStatus === 'active' ? (
                    <Link
                      href="/seller"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Cổng Chủ trọ
                    </Link>
                  ) : (
                    <Link
                      href="/dang-ky-chu-tro"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Đăng ký làm Chủ trọ
                    </Link>
                  )}
                </>
              )}

              {/* SELLER specific: Show Seller portal link (when not already inside /seller) */}
              {user.role === 'seller' && !pathname.startsWith('/seller') && (
                <Link
                  href="/seller"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Cổng Chủ trọ
                </Link>
              )}

              {/* MANAGER specific: Show Manager portal link */}
              {user.role === 'manager' && !pathname.startsWith('/manager') && (
                <Link
                  href="/manager"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-[#151515] hover:bg-[#151515]/5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Cổng Quản lý
                </Link>
              )}

              {/* ADMIN/MANAGER specific: Show Admin portal link when outside /admin */}
              </div>

            {/* Logout */}
            <div className="border-t border-[#151515]/20 py-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b-[2px] border-[#151515] bg-[#F5F5F0]">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <LogoIcon />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tracking-tight text-[#151515]" style={{ fontWeight: 900 }}>
              THIÊN
            </span>
            <span className="text-lg font-black italic tracking-tight text-[#151515]" style={{ fontWeight: 900 }}>
              NHÃN
            </span>
            <span className="text-lg font-black tracking-tight text-[#151515]" style={{ fontWeight: 900 }}>
              TRÚ ĐỒ
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const basePath = item.href.split('?')[0]
            const search = item.href.split('?')[1] ?? ''
            const itemParamKey = search.split('=')[0]
            const itemParamValue = search.split('=')[1]
            const currentParamValue = itemParamKey ? searchParams.get(itemParamKey) : null
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : basePath === pathname && (
                  !itemParamKey || currentParamValue === itemParamValue
                )
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#FDE047] text-[#151515] border-[2px] border-[#151515] shadow-[2px_2px_0_#151515]'
                    : 'text-[#151515]/70 hover:bg-[#151515]/5 hover:text-[#151515] border-2 border-transparent'
                )}
                
              >
                {item.icon === 'map' && (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                )}
                {item.icon === 'bookmark' && (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {/* Notification Bell - only show for authenticated users */}
          {user && <NotificationBell />}
          
          {/* Render auth section based on state */}
          {renderAuthSection()}
        </div>
      </div>
    </header>
  )
}
