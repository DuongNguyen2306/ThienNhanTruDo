'use client'

/**
 * Website review system (Task 3) — a rating for the PLATFORM itself.
 *
 * This is deliberately SEPARATE from room reviews (`Review` rates a listing).
 * The two systems never interact and never share storage.
 *
 * ELIGIBILITY
 * ───────────
 * The eligibility decision is made by the BACKEND (`GET /api/website-reviews/eligibility`),
 * which checks for a qualifying completed transaction. The frontend only
 * RENDERS that answer — it never decides eligibility on its own, and the
 * POST endpoint re-checks eligibility server-side regardless of what the
 * client sends.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Lock, MessageSquare, Send, Star,
} from 'lucide-react'
import { websiteReviewApi, type QualifyingTransaction, type WebsiteReview, type WebsiteReviewSummary } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { useAuth } from '@/components/auth-provider'

function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= rounded ? 'fill-[#FDE047] text-[#151515]' : 'text-[#151515]/20'
          }`}
        />
      ))}
    </span>
  )
}

export function WebsiteReviewSection() {
  const { user } = useAuth()
  const router = useRouter()

  // Public aggregate + list
  const [summary, setSummary] = useState<WebsiteReviewSummary | null>(null)
  const [reviews, setReviews] = useState<WebsiteReview[]>([])
  const [demoReviews, setDemoReviews] = useState<WebsiteReview[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Pagination (client-side — the whole list is small enough to hold in memory)
  const [page, setPage] = useState(1)
  const listTopRef = useRef<HTMLDivElement | null>(null)

  // Eligibility (server-decided)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [eligibilityReason, setEligibilityReason] = useState('')
  const [qualifying, setQualifying] = useState<QualifyingTransaction[]>([])
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)

  // Form
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(5)
  const [hoverScore, setHoverScore] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadPublic = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const [sum, list] = await Promise.all([
        websiteReviewApi.getSummary(),
        websiteReviewApi.getList({ limit: 50 }),
      ])
      setSummary(sum)
      setReviews(list.reviews ?? [])
      setDemoReviews(list.demoReviews ?? [])
    } catch (err: any) {
      setListError(err?.message || 'Không thể tải đánh giá')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadEligibility = useCallback(async () => {
    if (!user) {
      setEligible(null)
      return
    }
    try {
      const data = await websiteReviewApi.getEligibility()
      setEligible(data.eligible)
      setEligibilityReason(data.reason)
      setQualifying(data.qualifyingTransactions ?? [])
      setExistingReviewId(data.existingReviewId ?? null)
      // Default to the most recent qualifying transaction that is not yet used.
      if (data.qualifyingTransactions?.length) {
        setTransactionId((prev) => prev || data.qualifyingTransactions[0].id)
      }
    } catch {
      setEligible(false)
      setEligibilityReason('Không thể kiểm tra điều kiện đánh giá lúc này.')
    }
  }, [user])

  useEffect(() => {
    loadPublic()
  }, [loadPublic])

  useEffect(() => {
    loadEligibility()
  }, [loadEligibility])

  const submit = async () => {
    setFormError(null)
    setSuccess(null)
    if (!transactionId) {
      setFormError('Vui lòng chọn giao dịch đủ điều kiện.')
      return
    }
    if (content.trim().length < 10) {
      setFormError('Nội dung đánh giá phải có ít nhất 10 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      const res = await websiteReviewApi.submitReview({
        transactionId,
        score,
        title: title.trim() || undefined,
        content: content.trim(),
      })
      setSuccess(res.message || 'Cảm ơn bạn đã đánh giá website!')
      setContent('')
      setTitle('')
      setOpen(false)
      await Promise.all([loadPublic(), loadEligibility()])
    } catch (err: any) {
      setFormError(err?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // The demo mode is driven by the backend. When it is on, the public section
  // shows the illustrative sample data (clearly labelled); the real
  // statistics are never mixed with it.
  const demoMode = Boolean(summary?.demo?.enabled) && demoReviews.length > 0
  const displayAverage = demoMode ? summary!.demo!.average! : (summary?.average ?? 0)
  const displayTotal = demoMode ? summary!.demo!.totalReviews! : (summary?.totalReviews ?? 0)

  // ── Pagination ───────────────────────────────────────────────────────────
  // The list is paginated on the client: the whole list is small, so no extra
  // round-trip is needed and switching pages never reloads the site.
  const PAGE_SIZE = 6

  // Demo mode shows the sample reviews; otherwise the real ones.
  const sourceReviews = useMemo(
    () => (demoMode ? demoReviews : reviews),
    [demoMode, demoReviews, reviews]
  )

  // Newest first — a review's `createdAt` decides the order.
  const sortedReviews = useMemo(
    () =>
      [...sourceReviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [sourceReviews]
  )

  const totalItems = sortedReviews.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  // Keep the current page inside the valid range (e.g. after a review is added
  // or removed and the last page disappears).
  useEffect(() => {
    setPage((prev) => (prev > totalPages ? totalPages : prev < 1 ? 1 : prev))
  }, [totalPages])

  const currentPage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageItems = sortedReviews.slice(startIndex, startIndex + PAGE_SIZE)
  const rangeStart = totalItems === 0 ? 0 : startIndex + 1
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, totalItems)

  // Scroll only to the top of the review list — never to the top of the page.
  const goToPage = useCallback((next: number) => {
    setPage(next)
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const top = listTopRef.current?.getBoundingClientRect().top ?? 0
        window.scrollTo({ top: window.scrollY + top - 16, behavior: 'smooth' })
      })
    }
  }, [])

  return (
    <section className="border-t-[2px] border-[#151515] bg-white py-12" id="danh-gia-website">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2
              className="text-2xl font-black text-[#151515] lg:text-3xl"
              
            >
              ĐÁNH GIÁ WEBSITE
            </h2>
            <p className="mt-1 text-sm text-[#151515]/60">
              Chỉ những tài khoản có giao dịch hoàn tất mới được đánh giá.
            </p>
          </div>

          {/* Average rating + count */}
          <div className="flex items-center gap-4 rounded-2xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-3 shadow-[3px_3px_0_#151515]">
            <span className="font-mono text-3xl font-black tabular-nums">
              {(displayAverage).toFixed(1)}
            </span>
            <div>
              <Stars value={displayAverage} />
              <p className="mt-0.5 text-xs font-semibold text-[#151515]/60">
                {displayTotal} đánh giá
              </p>
            </div>
          </div>
        </div>

        {/* Write a review */}
        <div className="mb-8 rounded-2xl border-[2px] border-[#151515] bg-[#F5F5F0] p-5 shadow-[4px_4px_0_#151515]">
          {!user ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-[#151515]/70">
                <Lock className="size-4" />
                Đăng nhập để gửi đánh giá của bạn.
              </p>
              <button
                type="button"
                onClick={() => router.push('/dang-nhap')}
                className="rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
              >
                Đăng nhập
              </button>
            </div>
          ) : eligible === null ? (
            <div className="flex items-center gap-2 text-sm text-[#151515]/50">
              <Loader2 className="size-4 animate-spin" />
              Đang kiểm tra điều kiện đánh giá...
            </div>
          ) : existingReviewId ? (
            <div className="flex items-start gap-2 text-sm text-[#151515]/70">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>
                Bạn đã có một đánh giá đang hiển thị. Cảm ơn bạn đã góp ý!
              </span>
            </div>
          ) : eligible ? (
            <>
              {!open ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-[#151515]/70">
                    {eligibilityReason}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
                  >
                    <Send className="size-4" />
                    Viết đánh giá
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rating */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Chấm điểm
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setScore(i)}
                          onMouseEnter={() => setHoverScore(i)}
                          onMouseLeave={() => setHoverScore(0)}
                          aria-label={`${i} sao`}
                          className="p-0.5 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`size-7 ${
                              i <= (hoverScore || score)
                                ? 'fill-[#FDE047] text-[#151515]'
                                : 'text-[#151515]/20'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-mono text-sm font-bold text-[#151515]">
                        {hoverScore || score}/5
                      </span>
                    </div>
                  </div>

                  {/* Qualifying transaction */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Giao dịch đủ điều kiện
                    </label>
                    <select
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="h-11 w-full cursor-pointer rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm font-medium text-[#151515] focus:border-[#FDE047] focus:outline-none"
                    >
                      {qualifying.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.description || 'Giao dịch'} — {formatVnd(t.amount)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[#151515]/50">
                      Đánh giá được gắn với giao dịch này để quản trị viên đối soát.
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Tiêu đề <span className="font-normal text-[#151515]/50">(tuỳ chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                      className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 text-sm text-[#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="Tóm tắt trải nghiệm của bạn"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                      Nội dung đánh giá
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-3 py-2.5 text-sm text-[#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                      placeholder="Chia sẻ trải nghiệm của bạn với Thiên Nhãn Trú Đồ..."
                    />
                    <p className="mt-1 text-right text-xs text-[#151515]/45">
                      {content.trim().length}/2000
                    </p>
                  </div>

                  {formError ? (
                    <div className="flex items-start gap-2 rounded-xl border-[2px] border-red-400 bg-red-50 p-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <p className="text-sm font-medium text-red-700">{formError}</p>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border-[2px] border-[#151515] bg-white px-5 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 text-sm text-[#151515]/70">
              <Lock className="mt-0.5 size-4 shrink-0 text-[#151515]/40" />
              <span>{eligibilityReason}</span>
            </div>
          )}

          {success ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border-[2px] border-emerald-400 bg-emerald-50 p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700">{success}</p>
            </div>
          ) : null}
        </div>

        {/* List */}
        <div ref={listTopRef}>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[#151515]/50">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang tải đánh giá...
            </div>
          ) : listError ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-red-600">
              <AlertTriangle className="size-4" />
              {listError}
            </div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <MessageSquare className="size-9 text-[#151515]/20" />
              <p className="text-sm font-medium text-[#151515]/55">
                Chưa có đánh giá nào cho website.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((r) => (
                  <article
                    key={r.id}
                    className="flex flex-col gap-3 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[3px_3px_0_#151515]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-xs font-black text-[#151515]/70">
                          {r.reviewerInitials || r.reviewerName?.slice(0, 2)?.toUpperCase() || '??'}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#151515]">
                            {r.reviewerName || 'Người dùng'}
                          </p>
                          <p className="text-[11px] text-[#151515]/50">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : ''}
                          </p>
                        </div>
                      </div>
                      <Stars value={r.score} />
                    </div>

                    {r.title ? (
                      <p className="text-sm font-bold text-[#151515]">{r.title}</p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-[#151515]/70">{r.content}</p>

                    {r.adminReply ? (
                      <div className="mt-auto rounded-xl border-[2px] border-[#FDE047] bg-[#FDE047]/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/50">
                          Phản hồi từ Thiên Nhãn
                        </p>
                        <p className="mt-1 text-sm text-[#151515]/80">{r.adminReply}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold text-[#151515]/60">
                  Hiển thị {rangeStart}–{rangeEnd} trong tổng số {totalItems} đánh giá
                </p>

                {totalPages > 1 ? (
                  <nav
                    className="flex flex-wrap items-center justify-center gap-2"
                    aria-label="Phân trang đánh giá website"
                  >
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex h-10 items-center gap-1 rounded-lg border-[2px] border-[#151515] bg-white px-3 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      <ChevronLeft className="size-4" />
                      Trước
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                      const isCurrent = n === currentPage
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => goToPage(n)}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`h-10 min-w-10 rounded-lg border-[2px] border-[#151515] px-3 text-sm font-black shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none ${
                            isCurrent
                              ? 'bg-[#FDE047] text-[#151515]'
                              : 'bg-white text-[#151515]'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex h-10 items-center gap-1 rounded-lg border-[2px] border-[#151515] bg-white px-3 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      Tiếp
                      <ChevronRight className="size-4" />
                    </button>
                  </nav>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
