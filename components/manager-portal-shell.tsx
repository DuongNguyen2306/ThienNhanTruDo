'use client'

import { useAuth } from '@/components/auth-provider'
import { NotificationBell } from '@/components/notification-bell'
import { PortalSidebar } from '@/components/portal-sidebar'
import { managerNav } from '@/lib/nav'
import { RoleGate } from '@/components/shells'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, ShieldCheck } from 'lucide-react'

// ManagerPortalShell - Chỉ dùng trong app/manager/layout.tsx
// KHÔNG dùng trong các page components
export function ManagerPortalShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/dang-nhap'
  }

  return (
    <RoleGate allow="manager">
      <div className="flex min-h-screen flex-col overflow-hidden bg-[#F5F5F0]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center border-b-[2px] border-[#151515] bg-white px-5 lg:px-8">
          <div className="flex w-full items-center justify-between">
            {/* Logo */}
            <Link href="/manager" className="flex items-center gap-1.5">
              <span className="text-[1.35rem] font-black leading-none text-[#151515]" style={{ fontFamily: 'var(--font-be-vietnam-pro), Arial, sans-serif' }}>
                Thiên Nhãn
              </span>
              <span className="text-[1.35rem] font-black leading-none text-[#151515]/50" style={{ fontFamily: 'var(--font-be-vietnam-pro), Arial, sans-serif', fontStyle: 'italic' }}>
                Trú Đồ
              </span>
              <span className="ml-2 hidden items-center rounded-full bg-[#151515] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white sm:flex">
                MANAGER
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-[#151515]/50 lg:block">
                Trang chủ <span className="mx-1 text-[#151515]/30">/</span> Cổng quản trị
              </span>

              <NotificationBell />

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-sm font-black text-[#151515] transition-colors hover:bg-[#FBBF24]"
                >
                  {user?.initials || user?.fullName?.slice(0, 2).toUpperCase() || 'MG'}
                  <ChevronDown className={cn("ml-0.5 h-3 w-3", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border-[2px] border-[#151515] bg-white shadow-lg overflow-hidden z-50">
                    <div className="border-b border-[#151515]/10 px-4 py-3">
                      <p className="text-sm font-semibold text-[#151515]">{user?.fullName || user?.name}</p>
                      <p className="text-xs text-[#151515]/50">{user?.email}</p>
                    </div>
                    <Link
                      href="/manager/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[#151515] hover:bg-[#F5F5F0] transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Hồ sơ & Bảo mật
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1">
          {/* Sidebar */}
          <PortalSidebar
            variant="light"
            items={managerNav}
            footer={
              user ? (
                <Link href="/manager/profile" className="block">
                  <div className="flex items-center gap-3 rounded-2xl border border-[#151515]/20 bg-white p-4 transition-all hover:border-[#FDE047] hover:bg-[#FDE047]/5 hover:shadow-[2px_2px_0_#151515]">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#FDE047] text-sm font-black text-[#151515]">
                      {user.initials || user.fullName?.slice(0, 2).toUpperCase() || 'MG'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-[#151515]">{user.fullName || user.name}</p>
                      <p className="text-xs text-[#151515]/50">Quản lý</p>
                    </div>
                  </div>
                </Link>
              ) : null
            }
          />

          {/* Main Content */}
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-8">
            <div className="mx-auto min-w-0 max-w-[1200px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleGate>
  )
}
