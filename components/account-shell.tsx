'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarCheck, ChevronRight, FileText, Heart, History, KeyRound, Lock, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PublicFooter, PublicHeader, RoleGate } from '@/components/shells'
import { cn } from '@/lib/utils'

const items = [
  { href: '/tai-khoan', label: 'Hồ sơ cá nhân', icon: ShieldCheck },
  { href: '/tai-khoan/lich-hen', label: 'Lịch hẹn xem phòng', icon: CalendarCheck, hint: '2' },
  { href: '/tai-khoan/da-luu', label: 'Tin đã lưu', icon: Heart, hint: '5' },
  { href: '/tai-khoan/danh-gia', label: 'Lịch sử đánh giá', icon: Star },
  { href: '/tai-khoan/hop-dong', label: 'Hợp đồng thuê', icon: FileText },
  { href: '/tai-khoan/coc-giu-cho', label: 'Đặt cọc giữ chỗ', icon: CalendarCheck },
  { href: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
  { href: '/tai-khoan/bao-mat', label: 'Bảo mật & đăng nhập', icon: Lock },
  { href: '/tai-khoan/nang-cap', label: 'Nâng cấp Seller', icon: TrendingUp, badge: 'hot' },
]

export function AccountShell({ children, title, desc }: { children: React.ReactNode; title: string; desc: string }) {
  const pathname = usePathname()

  return (
    <RoleGate allow="tenant">
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* Sidebar */}
          <aside className="sticky top-[68px] hidden h-[calc(100vh-68px-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:flex">
            {items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                    active ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {Icon ? <Icon className={cn('size-4 shrink-0', active ? 'text-white' : 'text-slate-400')} /> : null}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {item.badge && (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        item.badge === 'hot' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {item.badge === 'hot' ? 'Hot' : 'Mới'}
                      </span>
                    )}
                    {item.hint ? (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        active ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-700'
                      )}>
                        {item.hint}
                      </span>
                    ) : null}
                    <ChevronRight className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
                  </span>
                </Link>
              )
            })}
          </aside>

          {/* Main content */}
          <section>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </div>
            {children}
          </section>
        </div>
      </div>
      <PublicFooter />
    </main>
    </RoleGate>
  )
}
