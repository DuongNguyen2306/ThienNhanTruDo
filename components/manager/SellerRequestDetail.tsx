'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { managerApi, type SellerProfile } from '@/lib/api'

interface SellerRequestDetailProps {
  requestId: string
}

// Extended type for API response with user relation
interface SellerRequestDetail extends SellerProfile {
  user?: {
    id: string
    fullName: string
    phone: string
    email: string
    createdAt: string
  }
}

// Checklist item type
interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export function SellerRequestDetail({ requestId }: SellerRequestDetailProps) {
  const router = useRouter()
  const [request, setRequest] = useState<SellerRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'fullname', label: 'Thông tin người đăng ký đầy đủ', checked: false },
    { id: 'phone', label: 'Số điện thoại hợp lệ', checked: false },
    { id: 'brand', label: 'Thông tin đăng ký hợp lệ', checked: false },
    { id: 'docs', label: 'Tài liệu hồ sơ đã cung cấp', checked: false },
    { id: 'notes', label: 'Không có vấn đề cần bổ sung', checked: false },
  ])
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch request detail
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await managerApi.getSellerRequestDetail(requestId) as { request: SellerProfile }
        if (data.request) {
          setRequest(data.request)
          // Reset checklist for new request
          setChecklist([
            { id: 'fullname', label: 'Thông tin người đăng ký đầy đủ', checked: false },
            { id: 'phone', label: 'Số điện thoại hợp lệ', checked: false },
            { id: 'brand', label: 'Thông tin đăng ký hợp lệ', checked: false },
            { id: 'docs', label: 'Tài liệu hồ sơ đã cung cấp', checked: false },
            { id: 'notes', label: 'Không có vấn đề cần bổ sung', checked: false },
          ])
        } else {
          setError('Không tìm thấy hồ sơ đăng ký chủ trọ này.')
        }
      } catch (err: unknown) {
        const error = err as { message?: string }
        setError(error?.message || 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.')
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    if (requestId) {
      fetchDetail()
    }
  }, [requestId])

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const handleApprove = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await managerApi.approveSeller(request.id)
      setApproveModalOpen(false)
      // Update local state
      setRequest(prev => prev ? { ...prev, status: 'active' } : null)
    } catch (err) {
      console.error('Approve error:', err)
      alert('Không thể chấp thuận yêu cầu. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!request || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await managerApi.rejectSeller(request.id, rejectReason)
      setRejectModalOpen(false)
      setRejectReason('')
      // Update local state
      setRequest(prev => prev ? { ...prev, status: 'rejected', reviewNote: rejectReason } : null)
    } catch (err) {
      console.error('Reject error:', err)
      alert('Không thể từ chối yêu cầu. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { label: string; class: string }> = {
      pending: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-800 border-amber-300' },
      active: { label: 'Đã chấp thuận', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      rejected: { label: 'Đã từ chối', class: 'bg-red-100 text-red-800 border-red-300' },
    }
    const c = config[status || 'pending'] || config.pending
    return (
      <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${c.class}`}>
        {c.label}
      </span>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const canTakeAction = request?.status === 'pending'

  // Loading state
  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#151515]/10" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-xl bg-[#151515]/10" />
            <div className="h-48 animate-pulse rounded-xl bg-[#151515]/10" />
          </div>
          <div className="h-96 animate-pulse rounded-xl bg-[#151515]/10" />
        </div>
      </main>
    )
  }

  // Error state
  if (error || !request) {
    return (
      <main className="flex flex-col items-center justify-center gap-6 py-20">
        <svg className="size-16 text-[#151515]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        <h2 className="text-xl font-bold text-[#151515]">{error || 'Không tìm thấy hồ sơ đăng ký chủ trọ'}</h2>
        <button 
          onClick={() => router.push('/manager/seller-requests')}
          className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
        >
          Quay lại danh sách
        </button>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.push('/manager/seller-requests')}
            className="flex w-fit items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-[#151515]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Chi tiết hồ sơ chủ trọ
              </h1>
              {getStatusBadge(request.status)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-[#151515]/50">
              <span>Mã yêu cầu: <span className="font-mono font-semibold">{request.id?.slice(0, 16).toUpperCase()}</span></span>
              <span>Ngày gửi: {formatDate(request.submittedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* User Info Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin người đăng ký</h2>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#FDE047] text-2xl font-bold text-[#151515]">
                  {request.user?.fullName?.charAt(0) || 'N'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-[#151515]">{request.user?.fullName || 'Không có tên'}</h3>
                  <p className="mt-1 font-mono text-xs text-[#151515]/40">{request.user?.id?.slice(0, 16).toUpperCase()}</p>
                  
                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center gap-2">
                      <svg className="size-4 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span className="font-mono text-sm">{request.user?.phone || '-'}</span>
                    </div>
                    {request.user?.email && (
                      <div className="flex items-center gap-2">
                        <svg className="size-4 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span className="text-sm">{request.user.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="size-4 text-[#151515]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span className="text-sm">Ngày tham gia: {formatDate(request.user?.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#151515]/60">Vai trò hiện tại:</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Người thuê</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Info Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Thông tin đăng ký chủ trọ</h2>
            </div>
            <div className="p-5">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Loại hình cho thuê</p>
                    <p className="mt-1 font-semibold text-[#151515]">
                      {request.brand ? 'Phòng trọ / Nhà trọ' : 'Chưa cung cấp'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Thương hiệu / Tên gian hàng</p>
                    <p className="mt-1 font-semibold text-[#151515]">
                      {request.brand || 'Chưa cung cấp'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Địa chỉ liên hệ</p>
                  <p className="mt-1 font-semibold text-[#151515]">
                    {request.address || 'Chưa cung cấp'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Số CCCD/CMND</p>
                  <p className="mt-1 font-mono text-sm text-[#151515]">
                    {request.idNumber ? `••••••••${request.idNumber.slice(-4)}` : 'Chưa cung cấp'}
                  </p>
                </div>

                {request.docs && request.docs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Tài liệu hồ sơ</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(typeof request.docs === 'string' ? JSON.parse(request.docs) : request.docs).map((doc: string, idx: number) => (
                        <span key={idx} className="rounded-lg bg-[#F5F5F0] px-3 py-1 text-xs text-[#151515]/70">
                          Tài liệu {idx + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Checklist Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Kiểm tra hồ sơ</h2>
            </div>
            <div className="flex flex-col gap-2 p-5">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className="flex items-center gap-3 rounded-xl border border-[#151515]/10 p-3 text-left transition-all hover:border-[#151515]/30"
                >
                  <span className={`flex size-6 items-center justify-center rounded-lg border-2 ${
                    item.checked 
                      ? 'border-emerald-500 bg-emerald-500 text-white' 
                      : 'border-[#151515]/30'
                  }`}>
                    {item.checked && (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm font-medium ${item.checked ? 'text-emerald-700' : 'text-[#151515]/70'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Decision Card */}
          <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="border-b border-[#151515]/10 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#151515]">Quyết định xét duyệt</h2>
            </div>
            <div className="p-5">
              {canTakeAction ? (
                <>
                  <div className="mb-4 rounded-xl bg-[#F5F5F0] p-4">
                    <p className="text-sm text-[#151515]/60">
                      Sau khi xét duyệt, tài khoản sẽ được nâng cấp thành người cho thuê và có thể đăng tin cho thuê trọ.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => setApproveModalOpen(true)}
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-[#FDE047] py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none"
                    >
                      <svg className="mr-2 size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Chấp thuận chủ trọ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      className="w-full rounded-xl border-[2px] border-[#151515] py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                    >
                      <svg className="mr-2 size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Từ chối yêu cầu
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#F5F5F0] p-4">
                    <p className="text-sm font-medium text-[#151515]/60">Trạng thái hồ sơ</p>
                    <div className="mt-2">{getStatusBadge(request.status)}</div>
                    {request.status === 'rejected' && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-semibold text-red-700">Lý do từ chối:</p>
                        <p className="mt-1 text-sm text-red-600">{request.reviewNote || 'Không có thông tin'}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[#151515]/40">
                    Hồ sơ này đã được xử lý trước đó.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {approveModalOpen && request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Xác nhận chấp thuận</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{request.user?.fullName}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{request.id?.slice(0, 16).toUpperCase()}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#151515]/60">
                <span>Vai trò hiện tại:</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">Người thuê</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-emerald-600">
                <span>→ Sau khi duyệt:</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5">Người cho thuê</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Bạn có chắc chắn muốn chấp thuận yêu cầu trở thành chủ trọ của tài khoản này?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setApproveModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-xl border-[2px] border-[#151515] bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận chấp thuận'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[8px_8px_0_#151515]">
            <h2 className="text-lg font-bold text-[#151515]">Từ chối yêu cầu chủ trọ</h2>
            <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
              <p className="font-semibold text-[#151515]">{request.user?.fullName}</p>
              <p className="mt-1 font-mono text-xs text-[#151515]/50">{request.id?.slice(0, 16).toUpperCase()}</p>
            </div>
            <p className="mt-4 text-sm text-[#151515]/60">
              Vui lòng nhập lý do từ chối để người đăng ký biết cần bổ sung hoặc điều chỉnh thông tin...
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="mt-3 w-full rounded-xl border-[2px] border-[#151515] p-3 text-sm outline-none focus:border-[#FDE047]"
              rows={4}
            />
            {rejectReason && rejectReason.trim().length > 0 && (
              <p className="mt-1 text-xs text-[#151515]/40">
                {rejectReason.length} / 500 ký tự
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border-[2px] border-[#151515] px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-xl border-[2px] border-[#151515] bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#151515] disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
