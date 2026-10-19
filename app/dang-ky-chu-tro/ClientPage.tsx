'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { 
  ArrowLeft, BadgeCheck, Building2, CheckCircle2, Clock, 
  MapPin, ShieldCheck, User as UserIcon, AlertCircle, Home
} from 'lucide-react'
import { BrutalHeader } from '@/components/brutal-header'
import { BrutalFooter } from '@/components/brutal-footer'
import { useAuth } from '@/components/auth-provider'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected'

interface SellerApplication {
  hasApplied: boolean
  status: ApplicationStatus
  canApply: boolean
  rejectionReason?: string
}

export default function ApplySellerPage() {
  const router = useRouter()
  const { user, loading: authLoading, refresh } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<SellerApplication | null>(null)
  
  // Form fields
  const [idNumber, setIdNumber] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Check authentication and application status
  useEffect(() => {
    if (authLoading) return
    
    // Not logged in - redirect to login
    if (!user) {
      router.push('/dang-nhap?redirect=/dang-ky-chu-tro')
      return
    }
    
    // Not a tenant - redirect back
    if (user.role !== 'tenant') {
      router.push('/')
      return
    }
    
    // Check application status
    authApi.getSellerApplication()
      .then((res: any) => {
        setApplicationStatus({
          hasApplied: res.hasApplied,
          status: res.status || 'none',
          canApply: res.canApply,
          rejectionReason: res.sellerProfile?.rejectionReason,
        })
      })
      .catch(() => {
        setApplicationStatus({ hasApplied: false, status: 'none', canApply: true })
      })
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  // CCCD validation - only allow 12 digits
  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12)
    setIdNumber(value)
  }

  const validateForm = () => {
    if (idNumber.length !== 12) {
      return 'CCCD phải đủ 12 số'
    }
    if (!/^\d{12}$/.test(idNumber)) {
      return 'CCCD chỉ được chứa số'
    }
    if (permanentAddress.trim().length < 10) {
      return 'Địa chỉ thường trú phải có ít nhất 10 ký tự'
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) return setError(validationError)

    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await authApi.applySeller({
        idNumber,
        permanentAddress: permanentAddress.trim(),
      })
      
      setSuccess('Hồ sơ đã được gửi thành công! Đang chờ Manager duyệt.')
      setApplicationStatus({ hasApplied: true, status: 'pending', canApply: false })
      
      // Refresh auth state to update sellerStatus
      refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <BrutalHeader />
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-6 shadow-[4px_4px_0_#151515]">
            <span className="size-6 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
            <span className="font-bold text-[#151515]">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  // Already a seller
  if (user?.role === 'seller' || user?.sellerStatus === 'active') {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <BrutalHeader />
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border-[3px] border-[#151515] bg-white p-8 text-center shadow-[6px_6px_0_#151515]">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#059669]">
              <CheckCircle2 className="size-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-[#151515]">Bạn đã là Chủ trọ</h2>
            <p className="mt-2 text-sm text-[#151515]/60">
              Tài khoản của bạn đã được kích hoạt quyền đăng tin.
            </p>
            <Link
              href="/seller"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-6 py-3 font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
            >
              <Building2 className="size-5" />
              Vào trang quản lý Chủ trọ
            </Link>
          </div>
        </div>
        <BrutalFooter />
      </div>
    )
  }

  // Pending application
  if (applicationStatus?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <BrutalHeader />
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border-[3px] border-[#151515] bg-white p-8 text-center shadow-[6px_6px_0_#151515]">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#F59E0B]">
              <Clock className="size-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-[#151515]">Hồ sơ đang chờ xét duyệt</h2>
            <p className="mt-2 text-sm text-[#151515]/60">
              Hồ sơ của bạn đang được Manager xem xét. Thời gian duyệt: 24-48 giờ.
            </p>
            <Link
              href="/tai-khoan"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-3 font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
            >
              <ArrowLeft className="size-5" />
              Quay lại tài khoản
            </Link>
          </div>
        </div>
        <BrutalFooter />
      </div>
    )
  }

  // Rejected application
  if (applicationStatus?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <BrutalHeader />
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border-[3px] border-[#151515] bg-white p-8 text-center shadow-[6px_6px_0_#151515]">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-500">
              <AlertCircle className="size-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-[#151515]">Hồ sơ bị từ chối</h2>
            {applicationStatus.rejectionReason && (
              <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-left">
                <p className="text-sm font-semibold text-red-700">Lý do:</p>
                <p className="mt-1 text-sm text-red-600">{applicationStatus.rejectionReason}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-[#151515]/60">
              Bạn có thể chỉnh sửa và gửi lại hồ sơ.
            </p>
            <Link
              href="/tai-khoan"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-6 py-3 font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
            >
              <ArrowLeft className="size-5" />
              Quay lại tài khoản
            </Link>
          </div>
        </div>
        <BrutalFooter />
      </div>
    )
  }

  // Application form
  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <BrutalHeader />
      
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Back link */}
        <Link 
          href="/tai-khoan"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#151515]/60 transition-colors hover:text-[#151515]"
        >
          <ArrowLeft className="size-4" />
          Quay lại tài khoản
        </Link>

        {/* Page Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-4 py-2 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515]">
            <Building2 className="size-4" />
            Đăng ký làm Chủ trọ
          </div>
          <h1 
            className="mt-4 text-3xl font-black text-[#151515] lg:text-4xl"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
          >
            ĐĂNG KÝ TRỞ THÀNH CHỦ TRỌ
          </h1>
          <p className="mt-2 text-sm text-[#151515]/60">
            Bổ sung thông tin cần thiết để bắt đầu đăng tin cho thuê.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border-[3px] border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-green-500 bg-green-50 p-4">
              <CheckCircle2 className="size-6 shrink-0 text-green-500" />
              <div>
                <p className="font-bold text-green-700">{success}</p>
                <p className="mt-1 text-sm text-green-600">
                  Bạn sẽ được thông báo khi hồ sơ được duyệt.
                </p>
              </div>
            </div>
          )}

          {/* Account Info Section */}
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#151515]">
              <UserIcon className="size-4" />
              Thông tin tài khoản của bạn
            </h2>
            <div className="grid gap-3 rounded-xl border-2 border-[#151515] bg-[#F5F5F0] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#151515]/60">Họ tên</span>
                <span className="font-semibold text-[#151515]">{user?.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#151515]/60">Số điện thoại</span>
                <span className="font-semibold text-[#151515]">{user?.phone}</span>
              </div>
              {user?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#151515]/60">Email</span>
                  <span className="font-semibold text-[#151515]">{user.email}</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-[#151515]/50">
              Thông tin này được lấy từ tài khoản hiện tại của bạn.
            </p>
          </div>

          {/* Additional Info Section */}
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#151515]">
              <ShieldCheck className="size-4" />
              Thông tin cần bổ sung
            </h2>
            
            {/* CCCD */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                CCCD <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                <input
                  type="text"
                  value={idNumber}
                  onChange={handleIdNumberChange}
                  className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                  placeholder="Nhập 12 số CCCD"
                  maxLength={12}
                />
              </div>
              <p className="mt-1 text-xs text-[#151515]/50">
                {idNumber.length}/12 số • CCCD phải trùng khớp với giấy tờ thật
              </p>
            </div>

            {/* Permanent Address */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-bold text-[#151515]">
                Địa chỉ thường trú <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#151515]/40" />
                <input
                  type="text"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="h-12 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 text-sm shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
                  placeholder="VD: 123 Nguyễn Trãi, Q1, TP.HCM"
                />
              </div>
              <p className="mt-1 text-xs text-[#151515]/50">
                Địa chỉ đăng ký hộ khẩu thường trú của bạn
              </p>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
              <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold">Lưu ý:</p>
                <p className="mt-1">
                  Hồ sơ sẽ được Manager xem xét trong 24-48 giờ. Bạn sẽ nhận được thông báo khi có kết quả.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border-2 border-red-500 bg-red-50 p-3">
              <AlertCircle className="size-5 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || idNumber.length !== 12 || permanentAddress.trim().length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] py-4 text-base font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="size-5 animate-spin rounded-full border-2 border-[#151515] border-t-transparent" />
                Đang gửi...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5" />
                Gửi yêu cầu đăng ký Chủ trọ
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#151515]/50">
          <ShieldCheck className="size-4 text-[#059669]" />
          <span>Thông tin CCCD của bạn được bảo mật và chỉ dùng để xác minh danh tính.</span>
        </div>
      </div>

      <BrutalFooter />
    </div>
  )
}
