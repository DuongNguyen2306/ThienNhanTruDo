'use client'

// Address search box overlaid on Leaflet maps (listing form + search page).
// VIETMAP autocomplete when NEXT_PUBLIC_VIETMAP_API_KEY is set, backend
// geocoder (/api/geocode/search) as fallback.

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, Search, X } from 'lucide-react'
import { geocodeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { hasVietmapKey, vietmapAutocomplete, vietmapPlace, type VietmapPlace } from '@/lib/vietmap'

interface AddressSuggestion {
  id: string
  name: string
  address: string
  display: string
  /** Present when the provider already returned coordinates (backend). */
  lat?: number
  lng?: number
}

async function searchAddresses(
  text: string,
  focus: { lat: number; lng: number },
  signal: AbortSignal
): Promise<AddressSuggestion[]> {
  if (hasVietmapKey()) {
    try {
      const res = await vietmapAutocomplete(text, { focus, signal })
      if (res.length > 0) {
        return res.map((s) => ({ id: s.refId, name: s.name, address: s.address, display: s.display }))
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err
      // VIETMAP unavailable (quota, key, network) -> try the backend geocoder.
    }
  }
  const res = await geocodeApi.search({ query: text, limit: 8 })
  return (res?.results || []).map((r, i) => {
    const [first, ...rest] = String(r.displayName || '').split(',')
    return {
      id: `geo:${i}:${r.lat},${r.lng}`,
      name: (first || '').trim(),
      address: rest.join(',').trim(),
      display: r.displayName,
      lat: r.lat,
      lng: r.lng,
    }
  })
}

export function MapAddressSearch({
  focus,
  disabled,
  onPick,
  className,
  placeholder = 'Tìm địa chỉ, VD: 12 Nguyễn Huệ, Quận 1',
}: {
  /** Point to bias results toward; a function is read at query time (e.g. map centre). */
  focus: { lat: number; lng: number } | (() => { lat: number; lng: number })
  disabled?: boolean
  onPick: (place: VietmapPlace) => void
  /** Positioning classes; defaults to top-left overlay. */
  className?: string
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<AddressSuggestion[]>([])
  const [active, setActive] = useState(-1)
  const focusRef = useRef(focus)
  focusRef.current = focus
  const rootRef = useRef<HTMLDivElement>(null)
  // Set when the input text is filled in by a pick, so that change does not
  // trigger a new search (which would reopen the dropdown).
  const skipSearchRef = useRef(false)

  // Close the dropdown when clicking/tapping anywhere outside the box.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setError(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  // Debounced autocomplete
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return
    }
    const q = text.trim()
    if (q.length < 2) {
      setItems([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const f = focusRef.current
        const res = await searchAddresses(q, typeof f === 'function' ? f() : f, controller.signal)
        if (controller.signal.aborted) return
        setItems(res)
        setActive(-1)
        setOpen(true)
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError('Không tìm được địa chỉ, vui lòng thử lại')
          setOpen(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text])

  const pick = async (s: AddressSuggestion) => {
    // Close right away; the previous results stay so focusing the input
    // again reopens them.
    setOpen(false)
    setActive(-1)
    setPicking(s.id)
    setError(null)
    // Short label only (name, or the part before the first comma).
    skipSearchRef.current = true
    setText((s.name || s.display.split(',')[0] || s.display).trim())
    try {
      const place: VietmapPlace | null =
        typeof s.lat === 'number' && typeof s.lng === 'number'
          ? { lat: s.lat, lng: s.lng, display: s.display }
          : await vietmapPlace(s.id)
      if (!place) throw new Error('no coordinates')
      onPick(place)
    } catch {
      setError('Không lấy được vị trí của địa chỉ này')
      setOpen(true)
    } finally {
      setPicking(null)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(items[active >= 0 ? active : 0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={className ??'absolute left-3 right-3 top-3 z-[1000] sm:right-auto sm:w-[380px]'}
      // Keep clicks/scrolls on the box from moving the map underneath.
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-3 shadow-[3px_3px_0_#151515] focus-within:ring-[3px] focus-within:ring-[#FDE047]/60">
        {loading || picking ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[#151515]/60" />
        ) : (
          <Search className="size-4 shrink-0 text-[#151515]/60" />
        )}
        <input
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onClick={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#151515] outline-none placeholder:text-[#151515]/40"
          autoComplete="off"
        />
        {text && (
          <button
            type="button"
            onClick={() => { setText(''); setItems([]); setOpen(false); setError(null) }}
            className="rounded p-1 text-[#151515]/50 hover:bg-[#151515]/10 hover:text-[#151515]"
            aria-label="Xóa"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (error || items.length > 0 || (!loading && text.trim().length >= 2)) ? (
        <div className="mt-1 max-h-72 overflow-y-auto rounded-xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          {error ? (
            <p className="px-3 py-3 text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[#151515]/60">Không tìm thấy địa chỉ phù hợp</p>
          ) : (
            items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-start gap-2 border-b border-[#151515]/10 px-3 py-2.5 text-left last:border-b-0',
                  i === active ? 'bg-[#FDE047]/40' : 'hover:bg-[#fef9c3]'
                )}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#dcfce7]">
                  {picking === s.id ? (
                    <Loader2 className="size-3.5 animate-spin text-[#059669]" />
                  ) : (
                    <MapPin className="size-3.5 text-[#059669]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#151515]">{s.name || s.display}</span>
                  <span className="block truncate text-xs text-[#151515]/60">{s.address}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
