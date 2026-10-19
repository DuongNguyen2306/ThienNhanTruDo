'use client'

import { useEffect, useState } from 'react'
import { BrutalHeader } from '@/components/brutal-header'
import { PublicFooter, RoleGate } from '@/components/shells'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarCheck, ChevronRight, FileText, Heart, Lock, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'

type SidebarItemDef = {
  href: string
  label: string
  icon: React.ElementType
  hint?: number | undefined
  badge?: string | undefined
}

const sidebarItems: SidebarItemDef[] = [
  { href: '/tai-khoan', label: 'Hồ sơ cá nhân', icon: ShieldCheck },
  { href: '/tai-khoan/lich-hen', label: 'Lịch hẹn xem phòng', icon: CalendarCheck },
  { href: '/tai-khoan/da-luu', label: 'Tin đã lưu', icon: Heart },
  { href: '/tai-khoan/danh-gia', label: 'Lịch sử đánh giá', icon: Star },
  { href: '/tai-khoan/hop-dong', label: 'Hợp đồng thuê', icon: FileText },
  { href: '/tai-khoan/coc-giu-cho', label: 'Đặt cọc giữ chỗ', icon: CalendarCheck },
  { href: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
  { href: '/tai-khoan/bao-mat', label: 'Bảo mật & đăng nhập', icon: Lock },
  { href: '/tai-khoan/nang-cap', label: 'Nâng cấp Seller', icon: TrendingUp, badge: 'hot' },
]

function TenantSidebar() {
  const pathname = usePathname()
  const { user, ready } = useAuth()
  const [lichHenCount, setLichHenCount] = useState<number | undefined>(undefined)

  useEffect(() => {
    // Only fetch when auth is ready and user is authenticated
    if (!ready || !user) {
      setLichHenCount(undefined)
      return
    }
    
    const token = localStorage.getItem('token') || ''
    if (!token) {
      setLichHenCount(undefined)
      return
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
    fetch(`${API_URL}/api/tenant/appointments?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLichHenCount(data.total || 0) })
      .catch(() => {})
  }, [ready, user])

  const items: SidebarItemDef[] = sidebarItems.map(item => {
    if (item.href === '/tai-khoan/lich-hen' && lichHenCount !== undefined) {
      return { ...item, hint: lichHenCount }
    }
    return item
  })

  return (
    <aside className="sticky top-[68px] hidden h-[calc(100vh-68px-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-[#151515]/10 bg-white p-3 lg:flex">
      {items.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition',
              active
                ? 'border-[2px] border-[#151515] bg-[#FDE047] font-bold text-[#151515] shadow-[2px_2px_0_#151515]'
                : 'border-[2px] border-transparent text-[#151515]/60 hover:border-[#FDE047]/50 hover:bg-[#FDE047]/20 hover:text-[#151515]',
            )}
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          >
            <span className="flex min-w-0 items-center gap-2">
              {Icon ? <Icon className={cn('size-4 shrink-0', active ? 'text-[#151515]' : 'text-[#151515]/50')} /> : null}
              <span className="truncate text-[13px]">{item.label}</span>
            </span>
            <span className="flex items-center gap-2">
              {item.badge === 'hot' && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Hot</span>
              )}
              {(item.hint ?? 0) > 0 && (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', active ? 'bg-[#151515]/15 text-[#151515]' : 'bg-amber-100 text-amber-700')}>
                  {item.hint}
                </span>
              )}
              {active && <ChevronRight className="size-3.5 shrink-0 text-[#151515]" />}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}

export function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allow={['tenant', 'seller', 'manager', 'admin']}>
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <BrutalHeader />
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <TenantSidebar />
            <section>
              {children}
            </section>
          </div>
        </div>
        <PublicFooter />
      </main>
    </RoleGate>
  )
}
