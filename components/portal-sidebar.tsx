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

export function PortalSidebar({ items, footer }: { items: SidebarItem[]; footer?: ReactNode }) {
  const pathname = usePathname()
  const groups = items.reduce<Record<string, SidebarItem[]>>((acc, item) => {
    const key = item.group ?? 'Mặc định'
    acc[key] = acc[key] ? [...acc[key], item] : [item]
    return acc
  }, {})

  return (
    <aside className="sticky top-[88px] flex h-[calc(100vh-104px)] flex-col gap-6 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-5">
        {Object.entries(groups).map(([group, rows]) => (
          <div key={group}>
            {group !== 'Mặc định' && (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group}</p>
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
                      'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                      active ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {Icon ? <Icon className={cn('size-4 shrink-0', active ? 'text-white' : 'text-slate-400')} /> : null}
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
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', active ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-700')}>
                          {item.hint}
                        </span>
                      ) : null}
                      <ChevronRight className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
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
  if (href === '/') return pathname === '/'
  if (href.endsWith('/overview') || href.endsWith('/dashboard')) return pathname === href
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
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
