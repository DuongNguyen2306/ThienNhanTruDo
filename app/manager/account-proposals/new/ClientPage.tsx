'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, User, Building2, AlertTriangle,
  FileText, Info, Send, Save, X, CheckCircle2, Loader2
} from 'lucide-react'
import { managerApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AccountOption {
  id: string
  fullName: string
  role: string
  phone: string | null
}

interface FormData {
  targetUserId: string
  type: string
  reason: string
  description: string
  priority: string
  evidence: string[]
}

interface ValidationErrors {
  targetUserId?: string
  type?: string
  reason?: string
  description?: string
}

// ─── Proposal Type Options ────────────────────────────────────────────────────
const PROPOSAL_TYPES = [
  { value: 'inspection', label: 'Kiểm tra tài khoản', description: 'Yêu cầu kiểm tra thông tin và hoạt động của tài khoản' },
  { value: 'warning', label: 'Cảnh báo tài khoản', description: 'Đề nghị gửi cảnh báo đến tài khoản vi phạm' },
  { value: 'suspension_request', label: 'Đề nghị khóa tài khoản', description: 'Yêu cầu Admin xem xét và tạm khóa tài khoản vi phạm nghiêm trọng' },
]

const PROPOSAL_REASONS = [
  { value: 'spam', label: 'Spam / Quảng cáo' },
  { value: 'fake_listing', label: 'Tin đăng giả / Ảnh lừa đảo' },
  { value: 'violation', label: 'Vi phạm nội quy' },
  { value: 'fraud', label: 'Lừa đảo / Trộm cắp' },
  { value: 'suspicious', label: 'Hoạt động đáng ngờ' },
  { value: 'harassment', label: 'Quấy rối / Lăng mạ' },
  { value: 'other', label: 'Khác' },
]

const PRIORITIES = [
  { value: 'low', label: 'Thấp', description: 'Không cần xử lý gấp' },
  { value: 'medium', label: 'Trung bình', description: 'Cần xử lý trong vài ngày' },
  { value: 'high', label: 'Cao', description: 'Cần xử lý ngay' },
]

// ─── Account Selector ────────────────────────────────────────────────────────
function AccountSelector({
  value,
  onChange,
  error,
}: {
  value: AccountOption | null
  onChange: (account: AccountOption | null) => void
  error?: string
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [results, setResults] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open || debouncedSearch.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    managerApi.getAccountsForProposal({ search: debouncedSearch, limit: 10 })
      .then((res) => setResults(res.accounts || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch, open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="mb-2 block text-sm font-semibold text-[#151515]">
        Tài khoản liên quan <span className="text-red-500">*</span>
      </label>
      
      {value ? (
        <div className="flex items-center justify-between rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047] text-sm font-black">
              {value.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[#151515]">{value.fullName}</p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                  value.role === 'seller' ? 'bg-[#FDE047] text-[#151515]' : 'bg-blue-100 text-blue-700'
                }`}>
                  {value.role === 'seller' ? <Building2 className="size-3" /> : <User className="size-3" />}
                  {value.role === 'seller' ? 'Chủ trọ' : 'Người thuê'}
                </span>
                <span className="text-xs text-[#151515]/50">{value.phone}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setSearch(''); }}
            className="rounded-lg p-2 text-[#151515]/50 hover:bg-[#151515]/10 transition"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Tìm kiếm tài khoản..."
              className="h-12 w-full rounded-xl border-[2px] border-[#151515]/20 bg-white pl-10 pr-4 text-sm font-medium text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 transition"
            />
          </div>
          
          {open && (
            <div className="absolute z-50 mt-2 w-full rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="size-5 animate-spin text-[#151515]/40" />
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-sm text-[#151515]/50">
                  {debouncedSearch.length < 2 ? 'Nhập ít nhất 2 ký tự để tìm kiếm' : 'Không tìm thấy tài khoản'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {results.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => { onChange(account); setOpen(false); setSearch(''); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F5F0] transition border-b border-[#151515]/10 last:border-0"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg border-[2px] border-[#151515] bg-[#FDE047] text-xs font-black">
                        {account.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#151515]">{account.fullName}</p>
                        <p className="text-xs text-[#151515]/50">{account.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function NewProposalPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    targetUserId: '',
    type: '',
    reason: '',
    description: '',
    priority: 'medium',
    evidence: [],
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)

  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}
    if (!selectedAccount) newErrors.targetUserId = 'Vui lòng chọn tài khoản'
    if (!formData.type) newErrors.type = 'Vui lòng chọn loại đề xuất'
    if (!formData.reason) newErrors.reason = 'Vui lòng chọn lý do'
    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = 'Mô tả phải có ít nhất 10 ký tự'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [selectedAccount, formData])

  const handleSubmit = async (saveDraft = false) => {
    if (!saveDraft && !validate()) return
    
    setApiError(null)
    setSubmitting(true)
    
    try {
      const payload = {
        targetUserId: selectedAccount?.id || formData.targetUserId,
        type: formData.type,
        reason: formData.reason,
        description: formData.description,
        priority: formData.priority,
        evidence: formData.evidence,
      }
      
      if (draftId) {
        await managerApi.updateProposal(draftId, payload)
        if (!saveDraft) {
          await managerApi.submitProposal(draftId)
          router.push('/manager/account-proposals')
        }
      } else {
        const res = await managerApi.createProposal(payload)
        if (!saveDraft) {
          await managerApi.submitProposal(res.proposal.id)
          router.push('/manager/account-proposals')
        } else {
          setDraftId(res.proposal.id)
        }
      }
    } catch (err: any) {
      console.error('[NewProposal] Submit error:', err)
      setApiError(err?.response?.data?.error || err?.message || 'Đã xảy ra lỗi khi gửi đề xuất')
    } finally {
      setSubmitting(false)
      setSavingDraft(false)
    }
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    await handleSubmit(true)
  }

  const handleSend = () => {
    handleSubmit(false)
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-black text-[#151515] lg:text-3xl"
          
        >
          TẠO ĐỀ XUẤT XỬ LÝ
        </h1>
        <p className="mt-1 text-sm font-medium text-[#151515]/50">
          Gửi đề xuất xử lý tài khoản vi phạm cho Admin xem xét
        </p>
      </div>

      {/* ── Info Banner ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-xl border-[2px] border-blue-300 bg-blue-50 p-4">
        <Info className="size-5 shrink-0 text-blue-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-800">Lưu ý quan trọng</p>
          <ul className="mt-1 space-y-1 text-blue-700">
            <li>• Đề xuất sẽ được gửi đến Admin để xem xét</li>
            <li>• Manager không có quyền tự khóa hoặc xóa tài khoản</li>
            <li>• Vui lòng cung cấp thông tin và bằng chứng đầy đủ, chính xác</li>
          </ul>
        </div>
      </div>

      {/* ── API Error ─────────────────────────────────────────────────────── */}
      {apiError && (
        <div className="flex items-start gap-3 rounded-xl border-[2px] border-red-300 bg-red-50 p-4">
          <AlertTriangle className="size-5 shrink-0 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
        
        {/* Account Selector */}
        <div className="border-b-[2px] border-[#151515] p-6">
          <AccountSelector
            value={selectedAccount}
            onChange={(account) => {
              setSelectedAccount(account)
              setFormData(prev => ({ ...prev, targetUserId: account?.id || '' }))
              if (errors.targetUserId) setErrors(prev => ({ ...prev, targetUserId: undefined }))
            }}
            error={errors.targetUserId}
          />
        </div>

        {/* Proposal Type */}
        <div className="border-b-[2px] border-[#151515] p-6">
          <label className="mb-3 block text-sm font-semibold text-[#151515]">
            Loại đề xuất <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-3 lg:grid-cols-3">
            {PROPOSAL_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, type: option.value }))
                  if (errors.type) setErrors(prev => ({ ...prev, type: undefined }))
                }}
                className={`flex flex-col items-start gap-2 rounded-xl border-[2px] p-4 text-left transition ${
                  formData.type === option.value
                    ? 'border-[#151515] bg-[#FDE047] shadow-[3px_3px_0_#151515]'
                    : 'border-[#151515]/20 bg-white hover:border-[#151515]/50'
                }`}
              >
                <span className="font-semibold text-[#151515]">{option.label}</span>
                <span className="text-xs text-[#151515]/60">{option.description}</span>
              </button>
            ))}
          </div>
          {errors.type && <p className="mt-2 text-sm text-red-500">{errors.type}</p>}
        </div>

        {/* Reason */}
        <div className="border-b-[2px] border-[#151515] p-6">
          <label className="mb-3 block text-sm font-semibold text-[#151515]">
            Lý do <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-2 lg:grid-cols-2">
            {PROPOSAL_REASONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, reason: option.value }))
                  if (errors.reason) setErrors(prev => ({ ...prev, reason: undefined }))
                }}
                className={`flex items-center gap-2 rounded-lg border-[2px] px-4 py-3 text-left text-sm transition ${
                  formData.reason === option.value
                    ? 'border-[#151515] bg-[#FDE047] font-semibold text-[#151515]'
                    : 'border-[#151515]/20 bg-white hover:border-[#151515]/50 text-[#151515]'
                }`}
              >
                <div className={`size-5 rounded-full border-[2px] flex items-center justify-center ${
                  formData.reason === option.value ? 'border-[#151515] bg-[#151515]' : 'border-[#151515]/30'
                }`}>
                  {formData.reason === option.value && (
                    <CheckCircle2 className="size-3 text-[#FDE047]" />
                  )}
                </div>
                {option.label}
              </button>
            ))}
          </div>
          {errors.reason && <p className="mt-2 text-sm text-red-500">{errors.reason}</p>}
        </div>

        {/* Description */}
        <div className="border-b-[2px] border-[#151515] p-6">
          <label className="mb-2 block text-sm font-semibold text-[#151515]">
            Mô tả chi tiết <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, description: e.target.value }))
              if (errors.description) setErrors(prev => ({ ...prev, description: undefined }))
            }}
            placeholder="Mô tả chi tiết vấn đề, bao gồm thông tin cụ thể về hành vi vi phạm..."
            rows={5}
            className="w-full rounded-xl border-[2px] border-[#151515]/20 bg-[#F5F5F0] p-4 text-sm text-[#151515] placeholder:text-[#151515]/40 focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30 transition resize-none"
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.description ? (
              <p className="text-sm text-red-500">{errors.description}</p>
            ) : (
              <span className="text-xs text-[#151515]/40">Ít nhất 10 ký tự</span>
            )}
            <span className="text-xs text-[#151515]/40">{formData.description.length} ký tự</span>
          </div>
        </div>

        {/* Priority */}
        <div className="p-6">
          <label className="mb-3 block text-sm font-semibold text-[#151515]">
            Mức ưu tiên
          </label>
          <div className="grid gap-3 lg:grid-cols-3">
            {PRIORITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                className={`flex flex-col items-start gap-1 rounded-xl border-[2px] p-4 text-left transition ${
                  formData.priority === option.value
                    ? option.value === 'high' ? 'border-red-500 bg-red-100 shadow-[3px_3px_0_#151515]'
                    : option.value === 'medium' ? 'border-yellow-500 bg-yellow-100 shadow-[3px_3px_0_#151515]'
                    : 'border-blue-500 bg-blue-100 shadow-[3px_3px_0_#151515]'
                    : 'border-[#151515]/20 bg-white hover:border-[#151515]/50'
                }`}
              >
                <span className={`font-semibold ${
                  formData.priority === option.value ? 'text-[#151515]' : 'text-[#151515]'
                }`}>
                  {option.label}
                </span>
                <span className="text-xs text-[#151515]/60">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/manager/account-proposals"
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515]/20 bg-white px-6 py-3 text-sm font-semibold text-[#151515] transition hover:border-[#151515]"
        >
          Hủy
        </Link>
        <button
          onClick={handleSaveDraft}
          disabled={submitting || savingDraft}
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-6 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-50"
        >
          {savingDraft ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu bản nháp
        </button>
        <button
          onClick={handleSend}
          disabled={submitting || savingDraft}
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-3 text-sm font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#FBBF24] disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Gửi đề xuất
        </button>
      </div>
    </main>
  )
}
