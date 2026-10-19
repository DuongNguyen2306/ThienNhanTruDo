'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, FileText,
  AlertTriangle, AlertCircle, Eye, User, Users,
  Calendar, ShieldAlert, MessageSquare, Paperclip,
  Check, X, Loader2, ChevronDown, Info
} from 'lucide-react'
import { adminApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proposal {
  id: string
  type: string
  reason: string
  description: string | null
  priority: string
  status: string
  evidenceCount: number
  createdAt: string
  submittedAt: string | null
  reviewedAt: string | null
  manager: { id: string; fullName: string; initials: string }
  targetUser: { id: string; fullName: string; role: string; phone: string | null; status: string }
  evidence?: Array<{ id: string; type: string; description: string; url: string }>
  reviewHistory?: Array<{
    id: string
    action: string
    reviewer: { fullName: string }
    note: string | null
    createdAt: string
  }>
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: any; class: string; bgClass: string }> = {
  inspection: { label: 'Kiểm tra', icon: Eye, class: 'text-blue-700 border-blue-200', bgClass: 'bg-blue-50' },
  warning: { label: 'Cảnh cáo', icon: AlertCircle, class: 'text-yellow-700 border-yellow-200', bgClass: 'bg-yellow-50' },
  suspension_request: { label: 'Yêu cầu đình chỉ', icon: AlertTriangle, class: 'text-orange-700 border-orange-200', bgClass: 'bg-orange-50' },
}

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  low: { label: 'Thấp', class: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Trung bình', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'Cao', class: 'bg-red-100 text-red-700 border-red-200' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  draft: { label: 'Bản nháp', icon: FileText, class: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { label: 'Chờ duyệt', icon: Clock, class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: 'Đã chấp thuận', icon: CheckCircle2, class: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Đã từ chối', icon: XCircle, class: 'bg-red-100 text-red-700 border-red-200' },
}

const ROLE_LABELS: Record<string, string> = {
  tenant: 'Người thuê',
  seller: 'Chủ đăng tin',
  manager: 'Ban quản lý',
  admin: 'Quản trị viên',
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Tạo đề xuất',
  submitted: 'Gửi duyệt',
  approved: 'Chấp thuận',
  rejected: 'Từ chối',
  info_requested: 'Yêu cầu bổ sung',
}

// ─── Helper Components ────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-36 shrink-0 text-sm font-medium text-[#151515]/50">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#151515]' : 'text-[#151515]/80'}`}>{value}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, className = '' }: {
  title: string
  icon: any
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] ${className}`}>
      <div className="flex items-center gap-3 border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-3">
        <Icon className="size-5 text-[#151515]" />
        <h2 className="text-sm font-black uppercase tracking-wide text-[#151515]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PageProps {
  params: { id: string }
}

export default function AdminProposalDetailPage({ params }: PageProps) {
  const { id } = params
  const router = useRouter()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | null>(null)

  // Fetch proposal
  const fetchProposal = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getProposalDetail(id)
      setProposal(data.proposal || data)
    } catch (err: any) {
      console.error('[ProposalDetail] Fetch error:', err)
      if (err.message?.includes('Token')) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setError('Không thể tải thông tin đề xuất.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposal()
  }, [id])

  // Handle review action
  const handleReview = async (action: 'approve' | 'reject') => {
    setShowConfirmDialog(null)
    setActionLoading(action)
    try {
      await adminApi.reviewProposal(id, action, reviewNote || undefined)
      // Refresh data
      await fetchProposal()
      setReviewNote('')
    } catch (err: any) {
      console.error('[ProposalDetail] Review error:', err)
      alert(err.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.')
    } finally {
      setActionLoading(null)
    }
  }

  // Status badge
  const StatusIcon = proposal ? STATUS_CONFIG[proposal.status]?.icon || FileText : FileText
  const statusConfig = proposal ? STATUS_CONFIG[proposal.status] : STATUS_CONFIG.pending
  const typeConfig = proposal ? TYPE_CONFIG[proposal.type] : TYPE_CONFIG.inspection

  // Render
  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Breadcrumb & Back ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/account-proposals"
          className="flex size-10 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <ArrowLeft className="size-5 text-[#151515]" />
        </Link>
        <div>
          <p className="text-xs font-medium text-[#151515]/40">
            <Link href="/admin/account-proposals" className="hover:text-[#151515]/70">Đề xuất xử lý</Link>
            {' / '}
            <span className="text-[#151515]/60">{proposal?.id?.slice(-8).toUpperCase() || '...'}</span>
          </p>
        </div>
      </div>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-black text-[#151515] lg:text-3xl"
              style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
              CHI TIẾT ĐỀ XUẤT XỬ LÝ
            </h1>
            {proposal && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-sm font-bold ${statusConfig.class}`}>
                <StatusIcon className="size-4" />
                {statusConfig.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-[#151515]/50">
            Xem xét chi tiết đề xuất từ ban quản lý
          </p>
        </div>

        {/* Action Buttons - Only show if pending */}
        {proposal?.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmDialog('reject')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-5 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-red-50 disabled:opacity-50"
            >
              {actionLoading === 'reject' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Từ chối
            </button>
            <button
              onClick={() => setShowConfirmDialog('approve')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-2.5 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#FBE94E] disabled:opacity-50"
            >
              {actionLoading === 'approve' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Chấp thuận
            </button>
          </div>
        )}
      </div>

      {/* ── Loading State ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-4 w-36 animate-pulse rounded bg-[#F5F5F0]" />
                    <div className="h-4 w-48 animate-pulse rounded bg-[#F5F5F0]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">
              <div className="h-32 animate-pulse rounded bg-[#F5F5F0]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-[2px] border-red-200 bg-red-50 p-12 text-center">
          <AlertTriangle className="size-12 text-red-500" />
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={fetchProposal}
            className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Proposal Content ───────────────────────────────────────────────── */}
      {proposal && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left Column (2/3) ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-2">

            {/* Proposal Overview */}
            <SectionCard title="THÔNG TIN ĐỀ XUẤT" icon={FileText}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Loại đề xuất</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border-[2px] px-2 py-1 text-xs font-semibold ${typeConfig.class}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Mức ưu tiên</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border-[2px] px-2 py-1 text-xs font-semibold ${PRIORITY_CONFIG[proposal.priority]?.class || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {PRIORITY_CONFIG[proposal.priority]?.label || proposal.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <InfoRow label="Mã đề xuất" value={proposal.id} />
                  <InfoRow label="Ngày tạo" value={new Date(proposal.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  {proposal.submittedAt && (
                    <InfoRow label="Ngày gửi duyệt" value={new Date(proposal.submittedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  )}
                  {proposal.reviewedAt && (
                    <InfoRow label="Ngày duyệt" value={new Date(proposal.reviewedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  )}
                </div>

                <div className="border-t-[2px] border-[#F5F5F0] pt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Lý do đề xuất</p>
                  <p className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3 text-sm font-medium text-[#151515]/80">
                    {proposal.reason}
                  </p>
                </div>

                {proposal.description && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#151515]/40">Mô tả thêm</p>
                    <p className="rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-3 text-sm text-[#151515]/70">
                      {proposal.description}
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Evidence Section */}
            <SectionCard title="BẰNG CHỨNG" icon={Paperclip}>
              {proposal.evidence && proposal.evidence.length > 0 ? (
                <div className="space-y-3">
                  {proposal.evidence.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-lg border-[2px] border-[#F5F5F0] p-3">
                      <div className="flex size-10 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047]">
                        <Paperclip className="size-4 text-[#151515]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-[#151515]">{ev.description || 'Tệp đính kèm'}</p>
                        <p className="text-xs text-[#151515]/50">{ev.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Paperclip className="size-8 text-[#151515]/20" />
                  <p className="text-sm text-[#151515]/40">Không có bằng chứng đính kèm</p>
                </div>
              )}
            </SectionCard>

            {/* Review History */}
            <SectionCard title="LỊCH SỬ XỬ LÝ" icon={Clock}>
              {proposal.reviewHistory && proposal.reviewHistory.length > 0 ? (
                <div className="relative space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-2 h-[calc(100%-16px)] w-[2px] bg-[#151515]/10" />
                  
                  {proposal.reviewHistory.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4">
                      <div className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-[2px] border-[#151515] ${
                        event.action === 'approved' ? 'bg-green-100' :
                        event.action === 'rejected' ? 'bg-red-100' :
                        event.action === 'submitted' ? 'bg-yellow-100' :
                        'bg-[#F5F5F0]'
                      }`}>
                        {event.action === 'approved' && <CheckCircle2 className="size-4 text-green-700" />}
                        {event.action === 'rejected' && <XCircle className="size-4 text-red-700" />}
                        {event.action === 'submitted' && <Clock className="size-4 text-yellow-700" />}
                        {event.action === 'created' && <FileText className="size-4 text-[#151515]/60" />}
                        {event.action === 'info_requested' && <MessageSquare className="size-4 text-blue-700" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#151515]">
                            {ACTION_LABELS[event.action] || event.action}
                          </p>
                          <span className="text-xs text-[#151515]/40">bởi</span>
                          <span className="text-sm font-semibold text-[#151515]/80">{event.reviewer.fullName}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#151515]/50">
                          {new Date(event.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {event.note && (
                          <p className="mt-2 rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-2 text-sm text-[#151515]/70">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Clock className="size-8 text-[#151515]/20" />
                  <p className="text-sm text-[#151515]/40">Chưa có lịch sử xử lý</p>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Right Column (1/3) ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Target Account */}
            <SectionCard title="TÀI KHOẢN BỊ ĐỀ XUẤT" icon={User}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] text-lg font-black text-[#151515]/60">
                    {proposal.targetUser.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#151515]">{proposal.targetUser.fullName}</p>
                    <p className="text-xs text-[#151515]/50">{proposal.targetUser.phone || 'Không có SĐT'}</p>
                  </div>
                </div>
                
                <div className="space-y-2 border-t-[2px] border-[#F5F5F0] pt-4">
                  <InfoRow label="Vai trò" value={ROLE_LABELS[proposal.targetUser.role] || proposal.targetUser.role} />
                  <InfoRow label="Trạng thái" value={proposal.targetUser.status || 'Hoạt động'} />
                  <InfoRow label="Mã tài khoản" value={proposal.targetUser.id} />
                </div>

                <Link
                  href={`/admin/users?search=${proposal.targetUser.id}`}
                  className="block w-full rounded-lg border-[2px] border-[#151515] bg-[#F5F5F0] px-4 py-2 text-center text-sm font-semibold text-[#151515] transition hover:bg-[#FDE047]"
                >
                  Xem chi tiết tài khoản
                </Link>
              </div>
            </SectionCard>

            {/* Proposing Manager */}
            <SectionCard title="NGƯỜI ĐỀ XUẤT" icon={ShieldAlert}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-lg font-black text-[#151515]">
                    {proposal.manager.initials || proposal.manager.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#151515]">{proposal.manager.fullName}</p>
                    <p className="text-xs text-[#151515]/50">Ban quản lý</p>
                  </div>
                </div>
                <InfoRow label="Ngày gửi" value={proposal.submittedAt 
                  ? new Date(proposal.submittedAt).toLocaleDateString('vi-VN')
                  : new Date(proposal.createdAt).toLocaleDateString('vi-VN')
                } />
              </div>
            </SectionCard>

            {/* Review Note Input - Only for pending */}
            {proposal.status === 'pending' && (
              <SectionCard title="GHI CHÚ DUYỆT" icon={MessageSquare}>
                <div className="space-y-4">
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Nhập ghi chú (tùy chọn)..."
                    rows={4}
                    className="w-full resize-none rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-3 text-sm placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                  />
                  <p className="text-xs text-[#151515]/40">
                    Ghi chú này sẽ được lưu vào lịch sử xử lý
                  </p>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation Dialog ──────────────────────────────────────────────── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border-[2px] border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
            <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h3 className="text-lg font-black text-[#151515]">
                {showConfirmDialog === 'approve' ? 'Xác nhận chấp thuận' : 'Xác nhận từ chối'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#151515]/70">
                {showConfirmDialog === 'approve' 
                  ? 'Bạn có chắc chắn muốn chấp thuận đề xuất này? Hành động này sẽ áp dụng biện pháp xử lý đối với tài khoản.'
                  : 'Bạn có chắc chắn muốn từ chối đề xuất này?'
                }
              </p>
              {reviewNote && (
                <p className="mt-3 rounded-lg border-[2px] border-[#F5F5F0] bg-[#F5F5F0] p-2 text-sm text-[#151515]/70">
                  <span className="font-semibold">Ghi chú của bạn:</span> {reviewNote}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t-[2px] border-[#151515] px-6 py-4">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="rounded-lg border-[2px] border-[#151515] bg-white px-4 py-2 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
              >
                Hủy
              </button>
              <button
                onClick={() => handleReview(showConfirmDialog)}
                className={`rounded-lg border-[2px] border-[#151515] px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#151515] transition ${
                  showConfirmDialog === 'approve'
                    ? 'bg-[#FDE047] text-[#151515] hover:bg-[#FBE94E]'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {showConfirmDialog === 'approve' ? 'Chấp thuận' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
