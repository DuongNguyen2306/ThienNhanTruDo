'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SidebarItem = {
  href: string
  label: string
  hint?: string | number
  icon?: React.ComponentType<{ className?: string }>
  group?: string
  badge?: 'new' | 'beta'
}

export function PortalSidebar({ items, footer, variant = 'light' }: { items: SidebarItem[]; footer?: ReactNode; variant?: 'light' | 'dark' }) {
  const pathname = usePathname()
  const groups = items.reduce<Record<string, SidebarItem[]>>((acc, item) => {
    const key = item.group ?? 'Mặc định'
    acc[key] = acc[key] ? [...acc[key], item] : [item]
    return acc
  }, {})

  const isDark = variant === 'dark'

  return (
    <aside className={cn(
      'sticky top-[68px] flex w-[260px] shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden p-4',
      isDark
        ? 'h-[calc(100vh-68px)] rounded-none border-r border-white/10 bg-[#0f172a]'
        : 'h-[calc(100vh-68px)] top-[68px] rounded-none border-r border-[#151515]/10 bg-[#F5F5F0]',
    )}>
      {/* Navigation items */}
      <div className="flex flex-col gap-5">
        {Object.entries(groups).map(([group, rows]) => (
          <div key={group}>
            {group !== 'Mặc định' && (
              <p className={cn('mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em]', isDark ? 'text-white/40' : 'text-[#151515]/40')}>{group}</p>
            )}
            <nav className="flex flex-col gap-1">
              {rows.map((item) => {
                const active = isActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                      active
                        ? 'border-[2px] border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                        : isDark
                          ? 'border-[2px] border-transparent text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'
                          : 'border-[2px] border-transparent text-[#151515]/60 hover:border-[#FDE047]/50 hover:bg-[#FDE047]/20 hover:text-[#151515]',
                    )}
                    
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {Icon ? <Icon className={cn('size-4 shrink-0', active ? 'text-[#151515]' : isDark ? 'text-white/50' : 'text-[#151515]/50')} /> : null}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {item.badge === 'new' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Mới</span>
                      )}
                      {item.badge === 'beta' && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">Beta</span>
                      )}
                      {item.hint ? (
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', active ? 'bg-[#151515]/15 text-[#151515]' : 'bg-amber-100 text-amber-700')}>
                          {item.hint}
                        </span>
                      ) : null}
                      {active && <ChevronRight className="size-3.5 shrink-0 text-[#151515]" />}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </aside>
  )
}

function isActive(pathname: string, href: string) {
  // ===========================================
  // MANAGER ROUTES - Specific matching
  // ===========================================
  if (href === '/manager') {
    return pathname === '/manager'
  }

  if (href === '/manager/approvals') {
    return pathname === '/manager/approvals'
  }

  if (href === '/manager/seller-requests') {
    return pathname === '/manager/seller-requests'
  }

  if (href === '/manager/reports') {
    return pathname === '/manager/reports'
  }

  if (href === '/manager/audit') {
    return pathname === '/manager/audit'
  }

  if (href === '/manager/profile') {
    return pathname === '/manager/profile'
  }

  // ===========================================
  // SELLER ROUTES - Specific matching
  // ===========================================
  if (href === '/seller') {
    return pathname === '/seller'
  }

  if (href === '/seller/listings') {
    return pathname === '/seller/listings' ||
           (pathname.startsWith('/seller/listings/') && !pathname.endsWith('/new') && !pathname.endsWith('/create') && !pathname.endsWith('/promotions'))
  }

  if (href === '/seller/listings/new') {
    return pathname === '/seller/listings/new'
  }

  if (href === '/seller/listings/promotions') {
    return pathname === '/seller/listings/promotions'
  }

  if (href === '/seller/leads') {
    return pathname === '/seller/leads'
  }

  if (href === '/seller/leads/templates') {
    return pathname === '/seller/leads/templates'
  }

  if (href === '/seller/profile') {
    return pathname === '/seller/profile'
  }

  if (href === '/seller/profile/verification') {
    return pathname === '/seller/profile/verification'
  }

  if (href === '/seller/appointments') {
    return pathname === '/seller/appointments'
  }

  if (href === '/seller/billing') {
    return pathname === '/seller/billing'
  }

  if (href === '/seller/billing/packages') {
    return pathname === '/seller/billing/packages'
  }

  if (href === '/seller/billing/wallet') {
    return pathname === '/seller/billing/wallet'
  }

  if (href === '/seller/reservations') {
    return pathname === '/seller/reservations'
  }

  if (href === '/seller/contracts') {
    return pathname === '/seller/contracts'
  }

  // ===========================================
  // ADMIN ROUTES - Specific matching
  // ===========================================
  if (href === '/admin') {
    return pathname === '/admin'
  }

  if (href === '/admin/users') {
    return pathname === '/admin/users'
  }

  if (href === '/admin/managers') {
    return pathname === '/admin/managers'
  }

  if (href === '/admin/sellers') {
    return pathname === '/admin/sellers'
  }

  if (href === '/admin/finance') {
    return pathname === '/admin/finance'
  }

  if (href === '/admin/finance/disputes') {
    return pathname === '/admin/finance/disputes'
  }

  if (href === '/admin/reviews') {
    return pathname === '/admin/reviews'
  }

  if (href === '/admin/config') {
    return pathname === '/admin/config'
  }

  if (href === '/admin/audit') {
    return pathname === '/admin/audit'
  }

  if (href === '/admin/audit/retention') {
    return pathname === '/admin/audit/retention'
  }

  // ===========================================
  // Default: Exact match only
  // ===========================================
  return pathname === href
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow?: string
  title: string
  desc?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-slate-500">{desc}</p>}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
