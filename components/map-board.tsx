'use client'

import { MapPin, Navigation } from 'lucide-react'
import { amenitiesAround } from '@/lib/data'
import { cn } from '@/lib/utils'

export function MapBoard({
  pins,
  selectedId,
  onSelect,
  showRadius = false,
  height = 'h-full min-h-[420px]',
  hint = 'Ghim toạ độ thực tế — không phải ước lượng khu vực',
}: {
  pins: { id: string; x: number; y: number; label: string }[]
  selectedId?: string
  onSelect?: (id: string) => void
  showRadius?: boolean
  height?: string
  hint?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-[#e8f1e9]', height)}>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(32deg, transparent 46%, #fff 47%, #fff 49%, transparent 50%), linear-gradient(120deg, transparent 40%, #d1e0d5 41%, #d1e0d5 43%, transparent 44%)',
          backgroundSize: '180px 180px, 230px 230px',
        }}
      />
      <div className="absolute left-[12%] top-[18%] h-24 w-48 rotate-12 rounded-[45%] bg-emerald-200/70" />
      <div className="absolute right-[8%] bottom-[12%] h-28 w-36 -rotate-12 rounded-[45%] bg-emerald-100/80" />
      <span className="absolute left-[8%] top-[58%] text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">Thảo Điền</span>
      <span className="absolute right-[8%] top-[14%] text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">An Phú</span>
      {showRadius && (
        <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-emerald-500/50 bg-emerald-400/10" />
      )}
      {showRadius &&
        amenitiesAround.map((a) => (
          <div
            key={a.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold shadow"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            {a.type}: {a.name}
          </div>
        ))}
      {pins.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect?.(p.id)}
          className={cn(
            'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-3 py-1.5 text-xs font-bold text-white shadow-md',
            selectedId === p.id ? 'bg-slate-900 ring-4 ring-emerald-300' : 'bg-emerald-600',
          )}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.label}
        </button>
      ))}
      <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold shadow-sm">
        <MapPin className="mr-1 inline size-3.5 text-emerald-600" />
        TP. Hồ Chí Minh · Bản đồ tương tác
      </div>
      <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/90 p-3 text-xs text-slate-600 shadow-sm">
        <Navigation className="mr-1 inline size-3.5 text-emerald-600" />
        {hint}
      </div>
    </div>
  )
}
