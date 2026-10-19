'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Loader2, ShieldAlert, Wallet, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tenantApi, type Reservation } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { useAuth } from '@/components/auth-provider'

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Chờ xác nhận', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  approved: { label: 'Đã chấp thuận', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Đã từ chối', className: 'border-red-200 bg-red-50 text-red-700' },
  cancelled: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-50 text-slate-600' },
}

export default function DepositsPage() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchReservations = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await tenantApi.getReservations()
        setReservations(data.reservations || [])
      } catch (err: any) {
        console.error('[Reservations] Fetch error:', err)
        setError(err.message || 'Không thể tải danh sách yêu cầu')
      } finally {
        setLoading(false)
      }
    }
    fetchReservations()
  }, [user])

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    setShowCancelConfirm(null)
    try {
      await tenantApi.cancelReservation(id)
      // Refresh list
      const data = await tenantApi.getReservations()
      setReservations(data.reservations || [])
    } catch (err: any) {
      console.error('[Reservations] Cancel error:', err)
      alert(err.message || 'Không thể hủy yêu cầu')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <ShieldAlert className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem yêu cầu giữ chỗ.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldAlert className="size-12 text-red-400" />
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

  return (
    <>
      <Card className="mb-4 rounded-2xl bg-slate-900 text-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Gợi ý</p>
            <p className="mt-1 text-lg font-bold">Yêu cầu giữ chỗ — Không cần đặt cọc</p>
            <p className="mt-1 text-sm text-slate-300">
              Gửi yêu cầu giữ chỗ để Seller biết bạn quan tâm. Không phải thanh toán.
            </p>
          </div>
        </CardContent>
      </Card>

      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Wallet className="size-12 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Bạn chưa có yêu cầu giữ chỗ nào</p>
          <p className="text-xs text-slate-400">
            Tìm phòng và gửi yêu cầu giữ chỗ để thể hiện sự quan tâm.
          </p>
          <a
            href="/"
            className="rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
          >
            Tìm phòng ngay
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reservations.map((r) => {
            const status = statusLabels[r.status] || { label: r.status, className: '' }
            const canCancel = ['pending', 'approved'].includes(r.status)

            return (
              <Card key={r.id} className="rounded-2xl border-slate-200">
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle className="line-clamp-1">
                      {r.listing?.title || 'Phòng đã yêu cầu'}
                    </CardTitle>
                    <CardDescription>
                      {r.listing?.district}, {r.listing?.city}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {r.listing?.rent && (
                      <Stat
                        icon={Wallet}
                        label="Giá thuê"
                        value={formatVnd(r.listing.rent) + '/tháng'}
                      />
                    )}
                    <Stat
                      icon={Calendar}
                      label="Ngày gửi"
                      value={formatDate(r.createdAt)}
                    />
                    {r.expiresAt && (
                      <Stat
                        icon={Clock}
                        label="Hết hạn"
                        value={formatDate(r.expiresAt)}
                      />
                    )}
                  </div>

                  {r.note && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ghi chú của bạn</p>
                      <p className="mt-1 text-sm text-slate-600">{r.note}</p>
                    </div>
                  )}

                  {r.sellerNote && (
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Phản hồi từ chủ phòng</p>
                      <p className="mt-1 text-sm text-amber-800">{r.sellerNote}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    {r.listing?.id && (
                      <a href={`/phong/${r.listing.id}`}>
                        <Button variant="outline">Xem phòng</Button>
                      </a>
                    )}
                    {canCancel && (
                      showCancelConfirm === r.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelConfirm(null)}
                          >
                            Không
                          </Button>
                          <Button
                            className="bg-red-600"
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id}
                          >
                            {cancellingId === r.id ? 'Đang hủy...' : 'Xác nhận hủy'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="text-red-600"
                          onClick={() => setShowCancelConfirm(r.id)}
                        >
                          Hủy yêu cầu
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
