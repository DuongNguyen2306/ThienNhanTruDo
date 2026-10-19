'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Star, Calendar, CheckCircle2 } from 'lucide-react'
import { tenantApi, type TenantReview } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { useAuth } from '@/components/auth-provider'

export default function ReviewHistoryPage() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<TenantReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await tenantApi.getReviews()
        setReviews(data.reviews || [])
      } catch (err: any) {
        console.error('[Reviews] Fetch error:', err)
        setError(err.message || 'Không thể tải danh sách đánh giá')
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      fetchReviews()
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <AlertCircle className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem đánh giá.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded bg-slate-200" />
            </div>
            <div className="mt-2 h-4 w-full rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Star className="size-12 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Bạn chưa có đánh giá nào</p>
        <p className="text-xs text-slate-400">
          Sau khi thuê phòng, bạn có thể đánh giá để giúp người khác tìm được phòng tốt.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[#151515] line-clamp-1">
                {review.listing?.title || 'Phòng đã đánh giá'}
              </h3>
              {review.listing?.district && (
                <p className="mt-1 text-xs text-slate-500">
                  {review.listing.district}, {review.listing.city || 'TP. Hồ Chí Minh'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5">
              <Star className="size-4 fill-amber-400 text-amber-500" />
              <span className="text-sm font-bold text-amber-700">{review.score}/5</span>
            </div>
          </div>

          {review.text && (
            <p className="mt-3 text-sm text-slate-600">{review.text}</p>
          )}

          {/* Sub-scores */}
          {(review.photoMatch || review.landlord || review.security || review.hygiene) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.photoMatch && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                  Ảnh đúng: {review.photoMatch}/5
                </span>
              )}
              {review.landlord && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                  Chủ nhà: {review.landlord}/5
                </span>
              )}
              {review.security && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                  An ninh: {review.security}/5
                </span>
              )}
              {review.hygiene && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                  Vệ sinh: {review.hygiene}/5
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="size-3.5" />
            <span>
              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
            </span>
            {review.verifiedStay && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                <CheckCircle2 className="size-3" />
                Đã xác nhận ở
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
