'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, User, Building2, Calendar, Clock, AlertTriangle,
  FileText, Info, Send, Edit2, CheckCircle2, XCircle,
  Loader2, Activity, Flag, ChevronRight
} from 'lucide-react'
import { managerApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LinkedReport {
  id: string
  title: string
  reason: string
  severity: string
  status: string
  createdAt: string
}

interface ProposalDetail {
  id: string
  type: string
  reason: string
  description: string | null
  priority: string
  status: string
  evidence: string | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewNote: string | null
  manager: { id: string; fullName: string; initials: string; role: string }
  targetUser: { id: string; fullName: string; role: string; phone: string | null }
  reviewer: { id: string; fullName: string; initials: string } | null
  linkedReports: LinkedReport[]
}

// ─── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    low: { label: 'Thấp', class: 'bg-blue-100 text-blue-700 border-blue-300' },
    medium: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    high: { label: 'Cao', class: 'bg-red-100 text-red-700 border-red-300' },
  }
  const config = configs[priority] || { label: priority, class: 'bg-gray-100 text-gray-700 border-gray-300' }
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border ${config.class}`}>
      {config.label}
    </span>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: any; class: string }> = {
    draft: { label: 'Bản nháp', icon: FileText, class: 'bg-gray-100 text-gray-700 border-gray-300' },
    pending: { label: 'Chờ xử lý', icon: Clock, class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    approved: { label: 'Đã duyệt', icon: CheckCircle2, class: 'bg-green-100 text-green-700 border-green-300' },
    rejected: { label: 'Từ chối', icon: XCircle, class: 'bg-red-100 text-red-700 border-red-300' },
  }
  const config = configs[status] || { label: status, icon: Clock, class: 'bg-gray-100 text-gray-700 border-gray-300' }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold border ${config.class}`}>
      <Icon className="size-4" />
      {config.label}
    </span>
  )
}

// ─── Type Label ──────────────────────────────────────────────────────────────
function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    inspection: 'Kiểm tra tài khoản',
    warning: 'Cảnh báo tài khoản',
    suspension_request: 'Đề nghị khóa tài khoản',
  }
  return <span className="text-[#151515]">{labels[type] || type}</span>
}

// ─── Reason Label ────────────────────────────────────────────────────────────
function ReasonLabel({ reason }: { reason: string }) {
  const labels: Record<string, string> = {
    spam: 'Spam / Quảng cáo',
    fake_listing: 'Tin đăng giả / Ảnh lừa đảo',
    violation: 'Vi phạm nội quy',
    fraud: 'Lừa đảo / Trộm cắp',
    suspicious: 'Hoạt động đáng ngờ',
    harassment: 'Quấy rối / Lăng mạ',
    other: 'Khác',
  }
  return <span className="text-[#151515]">{labels[reason] || reason}</span>
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProposalDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string

  const [proposal, setProposal] = useState<ProposalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    managerApi.getProposalDetail(id)
      .then((data) => setProposal(data))
      .catch((err) => {
        console.error('[ProposalDetail] Fetch error:', err)
        setError('Không thể tải thông tin đề xuất. Vui lòng thử lại.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async () => {
    if (!proposal || proposal.status !== 'draft') return
    setSubmitting(true)
    try {
      const res = await managerApi.submitProposal(id)
      setProposal({ ...proposal, status: 'pending', submittedAt: new Date().toISOString() })
    } catch (err) {
      console.error('[ProposalDetail] Submit error:', err)
      setError('Không thể gửi đề xuất. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="size-10 animate-pulse rounded-xl bg-[#F5F5F0]" />
          <div className="h-8 w-64 animate-pulse rounded bg-[#F5F5F0]" />
        </div>
        <div className="h-96 animate-pulse rounded-xl border-2 border-[#151515] bg-white" />
      </main>
    )
  }

  if (error || !proposal) {
    return (
      <main className="flex flex-col items-center justify-center gap-6 px-5 py-20 lg:px-8">
        <AlertTriangle className="size-16 text-red-500" />
        <p className="text-lg font-semibold text-[#151515]">{error || 'Không tìm thấy đề xuất'}</p>
        <Link
          href="/manager/account-proposals"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-5 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* ── Back button ────────────────────────────────────────────────────── */}
      <Link
        href="/manager/account-proposals"
        className="inline-flex w-fit items-center gap-2 rounded-lg border-[2px] border-[#151515]/20 bg-white px-4 py-2 text-sm font-medium text-[#151515]/60 transition hover:border-[#151515] hover:text-[#151515]"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      {/* ── Header Card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl border-[2px] border-[#151515] bg-[#FDE047] text-lg font-black text-[#151515]">
              {proposal.targetUser.fullName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-[#151515]" >
                  ĐỀ XUẤT XỬ LÝ TÀI KHOẢN
                </h1>
                <StatusBadge status={proposal.status} />
              </div>
              <p className="mt-1 text-sm text-[#151515]/50">
                Mã đề xuất: <span className="font-mono font-medium">{proposal.id.slice(-8).toUpperCase()}</span>
              </p>
            </div>
          </div>
          
          {/* Actions */}
          {proposal.status === 'draft' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#FBBF24] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Gửi đề xuất
            </button>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Target User */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
              <User className="size-4 text-[#151515]/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#151515]/50">Tài khoản</p>
              <p className="font-semibold text-[#151515]">{proposal.targetUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                  proposal.targetUser.role === 'seller' ? 'bg-[#FDE047] text-[#151515]' : 'bg-blue-100 text-blue-700'
                }`}>
                  {proposal.targetUser.role === 'seller' ? <Building2 className="size-3" /> : <User className="size-3" />}
                  {proposal.targetUser.role === 'seller' ? 'Chủ trọ' : 'Người thuê'}
                </span>
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
              <AlertTriangle className="size-4 text-[#151515]/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#151515]/50">Loại đề xuất</p>
              <TypeLabel type={proposal.type} />
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
              <Flag className="size-4 text-[#151515]/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#151515]/50">Mức ưu tiên</p>
              <PriorityBadge priority={proposal.priority} />
            </div>
          </div>

          {/* Reason */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0]">
              <Info className="size-4 text-[#151515]/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#151515]/50">Lý do</p>
              <ReasonLabel reason={proposal.reason} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Details Card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
        <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">Chi tiết đề xuất</h2>
        </div>
        <div className="p-6 space-y-6">
          
          {/* Description */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#151515]/50">Mô tả chi tiết</h3>
            <p className="rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4 text-[#151515]">
              {proposal.description || 'Không có mô tả'}
            </p>
          </div>

          {/* Timestamps */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
              <div className="flex items-center gap-2 text-[#151515]/50 mb-1">
                <Calendar className="size-4" />
                <span className="text-xs font-medium">Ngày tạo</span>
              </div>
              <p className="font-semibold text-[#151515]">
                {new Date(proposal.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-[#151515]/50">
                {new Date(proposal.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            {proposal.submittedAt && (
              <div className="rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
                <div className="flex items-center gap-2 text-[#151515]/50 mb-1">
                  <Send className="size-4" />
                  <span className="text-xs font-medium">Ngày gửi</span>
                </div>
                <p className="font-semibold text-[#151515]">
                  {new Date(proposal.submittedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-[#151515]/50">
                  {new Date(proposal.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            
            {proposal.reviewedAt && (
              <div className="rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
                <div className="flex items-center gap-2 text-[#151515]/50 mb-1">
                  <CheckCircle2 className="size-4" />
                  <span className="text-xs font-medium">Ngày xử lý</span>
                </div>
                <p className="font-semibold text-[#151515]">
                  {new Date(proposal.reviewedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-[#151515]/50">
                  {new Date(proposal.reviewedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Linked Reports ───────────────────────────────────────────────── */}
      {proposal.linkedReports && proposal.linkedReports.length > 0 && (
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
          <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">
              Báo cáo liên quan ({proposal.linkedReports.length})
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {proposal.linkedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Flag className={`size-4 shrink-0 ${
                    report.severity === 'high' ? 'text-red-500' :
                    report.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="font-semibold text-[#151515]">{report.title}</p>
                    <p className="text-xs text-[#151515]/50">
                      {report.reason} · {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin Review ──────────────────────────────────────────────────── */}
      {(proposal.reviewNote || proposal.status === 'pending' || proposal.status === 'approved' || proposal.status === 'rejected') && (
        <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
          <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">Phản hồi của Admin</h2>
          </div>
          <div className="p-6">
            {proposal.reviewNote ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4">
                  {proposal.status === 'approved' ? (
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-[#151515]">
                      {proposal.status === 'approved' ? 'Đề xuất đã được chấp thuận' : 'Đề xuất đã bị từ chối'}
                    </p>
                    <p className="mt-2 text-[#151515]/70">{proposal.reviewNote}</p>
                  </div>
                </div>
                {proposal.reviewer && (
                  <p className="text-sm text-[#151515]/50">
                    Được xử lý bởi: <span className="font-medium">{proposal.reviewer.fullName}</span>
                  </p>
                )}
              </div>
            ) : proposal.status === 'pending' ? (
              <div className="flex items-center gap-3 text-[#151515]/60">
                <Clock className="size-5 animate-pulse" />
                <p>Đang chờ Admin xem xét...</p>
              </div>
            ) : (
              <p className="text-[#151515]/50">Chưa có phản hồi</p>
            )}
          </div>
        </div>
      )}

      {/* ── Info Banner ──────────────────────────────────────────────────── */}
      {proposal.status === 'draft' && (
        <div className="flex items-start gap-3 rounded-xl border-[2px] border-yellow-300 bg-yellow-50 p-4">
          <Info className="size-5 shrink-0 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Đây là bản nháp</p>
            <p className="mt-1 text-yellow-700">
              Đề xuất chưa được gửi. Nhấn "Gửi đề xuất" để gửi đến Admin xem xét.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
