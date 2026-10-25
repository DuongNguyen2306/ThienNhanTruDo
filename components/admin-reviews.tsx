'use client'

/**
 * Admin review history (Task 5) + source traceability (Task 6).
 *
 * Shows BOTH review systems in one place:
 *   • website reviews — the rating for the PLATFORM (Task 3)
 *   • room reviews    — the rating for a LISTING
 *
 * Every website-review row links back to the QUALIFYING TRANSACTION that
 * earned it, so a rating is always traceable to the money behind it.
 *
 * The page is only reachable from the admin portal, and the API enforces
 * `authorize(ROLES.ADMIN)` server-side — the UI is not the security boundary.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, Flag, Loader2,
  MessageSquare, Search, Star, Trash2, TrendingUp,
} from 'lucide-react'
import {
  adminApi,
  type AdminReviewItem,
} from '@/lib/api'
import { formatVnd } from '@/lib/data'

type ReviewType = 'all' | 'website' | 'room'

const TYPE_LABELS: Record<ReviewType, string> = {
  all: 'Tất cả',
  website: 'Đánh giá website',
  room: 'Đánh giá phòng',
}

function StatusPill({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
        <Eye className="size-3" />
        Hiển thị
      </span>
    )
  }
  if (status === 'hidden') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border-2 border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
        <EyeOff className="size-3" />
        Đã ẩn
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border-2 border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
      <Flag className="size-3" />
      Bị gắn cờ
    </span>
  )
}

/** Renders 1-5 stars, supporting a decimal average. */
function Stars({ value }: { value: number }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i <= rounded ? 'fill-[#FDE047] text-[#151515]' : 'text-[#151515]/25'
          }`}
        />
      ))}
    </span>
  )
}

export default function AdminReviewsPage() {
  const searchParams = useSearchParams()

  // Filters — seeded from the URL so the dashboard can deep-link here (Task 6).
  const [type, setType] = useState<ReviewType>(
    (searchParams.get('type') as ReviewType) || 'all'
  )
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [score, setScore] = useState(searchParams.get('score') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const [items, setItems] = useState<AdminReviewItem[]>([])
  const [counts, setCounts] = useState({ website: 0, room: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getAdminReviews({
        type,
        status: status || undefined,
        score: score ? Number(score) : undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      })
      setItems(data.reviews ?? [])
      setCounts(data.counts ?? { website: 0, room: 0 })
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 1 })
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử đánh giá')
    } finally {
      setLoading(false)
    }
  }, [type, status, score, search, startDate, endDate, page, limit])

  useEffect(() => {
    load()
  }, [load])

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1)
  }, [type, status, score, search, startDate, endDate])

  // ── Moderation (website reviews only) ──────────────────────────────────
  const moderate = async (id: string, action: 'hide' | 'unhide' | 'flag', reason?: string) => {
    setActionError(null)
    setActionNote(null)
    try {
      await adminApi.moderateWebsiteReview(id, action, reason)
      setActionNote(
        action === 'hide'
          ? 'Đã ẩn đánh giá.'
          : action === 'unhide'
            ? 'Đã hiển thị lại đánh giá.'
            : 'Đã gắn cờ đánh giá.'
      )
      load()
    } catch (err: any) {
      setActionError(err?.message || 'Không thể cập nhật đánh giá')
    }
  }

  const hasFilters = Boolean(search || status || score || startDate || endDate || type !== 'all')

  const summary = useMemo(() => {
    const total = pagination.total
    return { total }
  }, [pagination.total])

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#151515]/45">
            Kiểm duyệt
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#151515] lg:text-3xl">
            Lịch sử đánh giá
          </h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Toàn bộ đánh giá website và đánh giá phòng, kèm giao dịch đủ điều kiện tương ứng.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl border-2 border-[#151515] bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#151515]">
            Website: <span className="font-mono">{counts.website}</span>
          </span>
          <span className="rounded-xl border-2 border-[#151515] bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#151515]">
            Phòng: <span className="font-mono">{counts.room}</span>
          </span>
          <span className="rounded-xl border-2 border-[#151515] bg-[#FDE047] px-3 py-2 text-xs font-bold shadow-[2px_2px_0_#151515]">
            Tổng: <span className="font-mono">{summary.total}</span>
          </span>
        </div>
      </div>

      {actionNote ? (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {actionNote}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border-2 border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#151515]/35" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên người đánh giá, nội dung, mã giao dịch..."
            className="h-10 w-full rounded-lg border-2 border-[#151515]/20 bg-[#F5F5F0] pl-10 pr-3 text-sm font-medium text-[#151515] placeholder:text-[#151515]/35 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as ReviewType)}
          className="h-10 cursor-pointer rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none"
        >
          {(Object.keys(TYPE_LABELS) as ReviewType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 cursor-pointer rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none"
        >
          <option value="">Mọi trạng thái</option>
          <option value="published">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
          <option value="flagged">Bị gắn cờ</option>
        </select>

        <select
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="h-10 cursor-pointer rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none"
        >
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>
              {s} sao
            </option>
          ))}
        </select>

        <div className="flex items-end gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
            Từ
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block h-8 rounded-lg border-2 border-[#151515]/20 px-2 text-xs focus:border-[#FDE047] focus:outline-none"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
            Đến
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block h-8 rounded-lg border-2 border-[#151515]/20 px-2 text-xs focus:border-[#FDE047] focus:outline-none"
            />
          </label>
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setType('all')
              setStatus('')
              setScore('')
              setSearch('')
              setStartDate('')
              setEndDate('')
            }}
            className="h-10 rounded-lg border-2 border-[#151515] bg-white px-3 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            Xóa lọc
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#151515]/40" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <AlertTriangle className="size-12 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-lg border-2 border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <MessageSquare className="size-12 text-[#151515]/20" />
            <p className="text-sm font-medium text-[#151515]/55">
              {hasFilters
                ? 'Không có đánh giá nào phù hợp với bộ lọc.'
                : 'Chưa có đánh giá nào trên hệ thống.'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#151515] bg-[#F5F5F0]">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Người đánh giá
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Điểm
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Nội dung
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Giao dịch đủ điều kiện
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Ngày gửi
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const isOpen = expanded === r.id
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/5"
                    >
                      {/* Reviewer */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#151515] bg-[#F5F5F0] text-xs font-black text-[#151515]/70">
                            {r.reviewerInitials || r.reviewerName?.slice(0, 2)?.toUpperCase() || '??'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#151515]">
                              {r.reviewerName || '—'}
                            </p>
                            <p className="text-[11px] text-[#151515]/50">
                              {r.reviewType === 'website' ? 'Đánh giá website' : 'Đánh giá phòng'}
                              {r.reviewerRole ? ` · ${r.reviewerRole}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Stars value={r.score} />
                          <span className="font-mono text-xs font-bold tabular-nums">
                            {r.score}
                          </span>
                        </div>
                      </td>

                      {/* Content */}
                      <td className="px-4 py-4">
                        {r.title ? (
                          <p className="mb-0.5 font-bold text-[#151515]">{r.title}</p>
                        ) : null}
                        <p
                          className={`text-[#151515]/70 ${
                            isOpen ? '' : 'line-clamp-2 max-w-xs'
                          }`}
                        >
                          {r.content}
                        </p>
                      </td>

                      {/* Qualifying transaction (Task 6 traceability) */}
                      <td className="px-4 py-4">
                        {r.transaction ? (
                          <Link
                            href={`/admin/finance/transactions/${r.transaction.id}`}
                            className="group inline-flex flex-col gap-0.5"
                            title="Mở giao dịch đầy đủ"
                          >
                            <span className="font-mono text-xs font-bold text-[#151515] underline decoration-[#151515]/25 underline-offset-2 group-hover:decoration-[#151515]">
                              {formatVnd(r.transaction.amount)}
                            </span>
                            <span className="max-w-[180px] truncate text-[11px] text-[#151515]/50">
                              {r.transaction.description || r.transaction.id}
                            </span>
                          </Link>
                        ) : r.listing ? (
                          <Link
                            href={`/phong/${r.listing.id}`}
                            className="inline-flex max-w-[200px] flex-col gap-0.5"
                          >
                            <span className="truncate text-xs font-bold text-[#151515] underline decoration-[#151515]/25 underline-offset-2">
                              {r.listing.title}
                            </span>
                            <span className="text-[11px] text-[#151515]/50">
                              {r.listing.district || 'Tin đăng'}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-[#151515]/35">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-xs text-[#151515]/60">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusPill status={r.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : r.id)}
                            className="rounded-lg border-2 border-[#151515] bg-white px-2.5 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
                          >
                            {isOpen ? 'Thu gọn' : 'Chi tiết'}
                          </button>

                          {r.reviewType === 'website' ? (
                            r.status === 'published' ? (
                              <button
                                type="button"
                                onClick={() => moderate(r.id, 'hide', 'Vi phạm điều khoản')}
                                className="rounded-lg border-2 border-[#151515] bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_#151515] transition hover:bg-amber-200"
                              >
                                Ẩn
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => moderate(r.id, 'unhide')}
                                className="rounded-lg border-2 border-[#151515] bg-emerald-100 px-2.5 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_#151515] transition hover:bg-emerald-200"
                              >
                                Hiện
                              </button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isOpen ? (
                      <tr className="border-b border-[#151515]/10 bg-[#F5F5F0]">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#151515]/45">
                                Toàn bộ nội dung
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-[#151515]/75">
                                {r.content}
                              </p>
                              {r.hiddenReason ? (
                                <p className="mt-2 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                  Lý do ẩn: {r.hiddenReason}
                                </p>
                              ) : null}
                            </div>

                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#151515]/45">
                                Nguồn đánh giá
                              </p>
                              {r.reviewType === 'website' && r.transaction ? (
                                <div className="rounded-lg border-2 border-[#151515]/15 bg-white p-3">
                                  <p className="text-sm font-bold text-[#151515]">
                                    Giao dịch đủ điều kiện
                                  </p>
                                  <dl className="mt-1.5 space-y-1 text-xs text-[#151515]/65">
                                    <div className="flex justify-between gap-3">
                                      <dt>Mã giao dịch</dt>
                                      <dd className="font-mono">{r.transaction.id}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <dt>Số tiền</dt>
                                      <dd className="font-mono font-bold">
                                        {formatVnd(r.transaction.amount)}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <dt>Phương thức</dt>
                                      <dd>{r.transaction.method || '—'}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                      <dt>Ngày giao dịch</dt>
                                      <dd>
                                        {r.transaction.createdAt
                                          ? new Date(r.transaction.createdAt).toLocaleDateString('vi-VN')
                                          : '—'}
                                      </dd>
                                    </div>
                                  </dl>
                                  <Link
                                    href={`/admin/finance/transactions/${r.transaction.id}`}
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold underline"
                                  >
                                    Mở giao dịch <TrendingUp className="size-3" />
                                  </Link>
                                </div>
                              ) : r.listing ? (
                                <div className="rounded-lg border-2 border-[#151515]/15 bg-white p-3">
                                  <p className="text-sm font-bold text-[#151515]">{r.listing.title}</p>
                                  <p className="mt-0.5 text-xs text-[#151515]/55">
                                    {r.listing.district || 'Tin đăng'}
                                  </p>
                                  <Link
                                    href={`/phong/${r.listing.id}`}
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold underline"
                                  >
                                    Mở tin đăng
                                  </Link>
                                </div>
                              ) : (
                                <p className="text-xs text-[#151515]/45">Không có nguồn liên kết.</p>
                              )}

                              {r.adminReply ? (
                                <div className="mt-3 rounded-lg border-2 border-[#FDE047] bg-[#FDE047]/20 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
                                    Phản hồi quản trị
                                  </p>
                                  <p className="mt-1 text-sm text-[#151515]/80">{r.adminReply}</p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#151515]/55">
            Hiển thị{' '}
            <span className="font-bold text-[#151515]">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            trong <span className="font-bold text-[#151515]">{pagination.total}</span> đánh giá
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="flex size-9 items-center justify-center rounded-lg border-2 border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 text-sm font-medium">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex size-9 items-center justify-center rounded-lg border-2 border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
