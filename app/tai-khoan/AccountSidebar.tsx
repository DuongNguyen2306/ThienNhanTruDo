'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarCheck, ChevronRight, FileText, Heart, Lock, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
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

export function AccountSidebar() {
  const pathname = usePathname()

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
                : 'text-[#151515]/60 hover:border-[2px] hover:border-[#FDE047]/50 hover:bg-[#FDE047]/20 hover:text-[#151515]',
            )}
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          >
            <span className="flex min-w-0 items-center gap-2">
              {Icon ? <Icon className={cn('size-4 shrink-0', active ? 'text-[#151515]' : 'text-[#151515]/50')} /> : null}
              <span className="truncate text-[13px]">{item.label}</span>
            </span>
            <span className="flex items-center gap-2">
              {item.badge && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                  Hot
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

// ── Shared page header for tai-khoan pages ─────────────────────────
export function AccountPageHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        {title}
      </h1>
      {desc && (
        <p className="mt-1 text-sm text-[#151515]/60">{desc}</p>
      )}
    </div>
  )
}
