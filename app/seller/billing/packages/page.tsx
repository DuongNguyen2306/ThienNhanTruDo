'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package, Check, Star, Shield, Sparkles, Phone, Loader2, Info, CreditCard,
  WalletCards, QrCode, CheckCircle2, X
} from 'lucide-react'
import { paymentApi, type Package as PackageType, type Wallet } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageType[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mySubscription, setMySubscription] = useState<{packageName: string} | null>(null)

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank_transfer'>('wallet')
  const [processing, setProcessing] = useState(false)
  const [orderData, setOrderData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pkgRes, walletRes, subRes] = await Promise.all([
        paymentApi.getPackages(),
        paymentApi.getWallet(),
        paymentApi.getMySubscription(),
      ])
      setPackages(pkgRes.packages || [])
      setWallet(walletRes.wallet)
      setMySubscription(subRes.subscriptions?.[0] || null)
      // Auto-select first available (non-owned) package if user has subscription
      if (subRes.subscriptions?.[0]) {
        // User already has subscription - don't auto-select
      } else if (pkgRes.packages?.length > 0) {
        setSelected(pkgRes.packages[0].id)
      }
    } catch {
      setError('Không thể tải danh sách gói dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  const selectedPackage = packages.find((p) => p.id === selected)

  const handleSelectPackage = (pkgId: string) => {
    setSelected(pkgId)
    // Reset payment state
    setShowPaymentModal(false)
    setOrderData(null)
    setPaymentMethod('wallet')
  }

  // Create order for bank transfer
  const handleShowQRCode = async () => {
    if (!selectedPackage) return
    
    setProcessing(true)
    try {
      // Create real order on backend first
      const res = await paymentApi.createOrder(selectedPackage.id)
      if (res.success && res.order) {
        setOrderData({
          ...res.order,
          packageName: selectedPackage.name,
          bankAccount: {
            bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
            bankBin: '970436',
            accountNumber: '1234567890',
            accountHolder: 'CONG TY TNHH THIEN NHAN',
          },
        })
      }
    } catch (err: any) {
      alert(err.message || 'Không thể tạo đơn hàng')
    } finally {
      setProcessing(false)
    }
  }

  // Submit payment proof to backend
  const handleSubmitProof = async () => {
    if (!orderData) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setSubmitting(true)
      try {
        await paymentApi.uploadProof(orderData.id, file)
        alert('Đã gửi minh chứng thanh toán. Vui lòng chờ quản lý xác nhận.')
        setShowPaymentModal(false)
        resetPaymentState()
      } catch (err: any) {
        alert(err.message || 'Lỗi khi gửi minh chứng')
      } finally {
        setSubmitting(false)
      }
    }
    input.click()
  }

  // Purchase using wallet
  const handleWalletPurchase = async () => {
    if (!selectedPackage) return
    setProcessing(true)
    try {
      await paymentApi.purchaseWallet(selectedPackage.id)
      alert(`Đã kích hoạt gói "${selectedPackage.name}" thành công!`)
      setShowPaymentModal(false)
      resetPaymentState()
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Không thể thanh toán qua ví')
    } finally {
      setProcessing(false)
    }
  }

  const resetPaymentState = () => {
    setOrderData(null)
    setPaymentMethod('wallet')
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ'

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <div className="size-8 animate-spin rounded-full border-[3px] border-[#151515] border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <Link href="/seller/billing" className="hover:text-[#151515]">Ví & Giao dịch</Link>
        <span>/</span>
        <span className="text-[#151515]">Gói dịch vụ</span>
      </nav>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border-[2px] border-[#FDE047] bg-[#fef9c3] px-4 py-1.5">
          <Sparkles className="size-4 text-[#854d0e]" />
          <span className="text-sm font-bold text-[#854d0e]">Chọn gói phù hợp với nhu cầu</span>
        </div>
        <h1 className="mt-4 text-2xl font-black text-[#151515]">Gói dịch vụ</h1>
        <p className="mt-2 text-sm text-[#151515]/60">Nâng cao hiệu quả đăng tin của bạn với các gói dịch vụ của Thiên Nhãn Trú Đồ</p>
      </div>

      {/* Star Allocation Info */}
      <div className="rounded-2xl border-[2px] border-[#FDE047] bg-gradient-to-r from-[#fef9c7] to-[#fef3c7] p-5 shadow-[3px_3px_0_#151515]">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#FDE047]">
            <Star className="size-6 text-[#92400e]" />
          </div>
          <div>
            <p className="font-bold text-[#92400e]">Nhận Stars khi mua gói</p>
            <p className="mt-1 text-sm text-[#92400e]/80">
              Mỗi gói đi kèm Stars để sử dụng đẩy VIP tin đăng. Standard: <strong>20 Stars</strong> · VIP: <strong>75 Stars</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="flex items-center justify-between rounded-2xl border-[2px] border-[#059669] bg-gradient-to-r from-[#059669] to-[#047857] p-4 shadow-[3px_3px_0_#151515]">
        <div className="flex items-center gap-3">
          <WalletCards className="size-8 text-white" />
          <div>
            <p className="text-sm font-medium text-white/80">Số dư ví của bạn</p>
            <p className="font-mono text-2xl font-bold text-white">
              {wallet ? formatMoney(wallet.balance) : '0đ'}
            </p>
          </div>
        </div>
        <Link
          href="/seller/billing"
          className="flex items-center gap-2 rounded-xl border-[2px] border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
        >
          Nạp thêm
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && packages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <Package className="size-16 text-[#151515]/20" />
          <p className="mt-4 text-[#151515]/60">Chưa có gói dịch vụ nào</p>
        </div>
      )}

      {/* Packages Grid */}
      {packages.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isOwned = mySubscription?.packageName === pkg.name
            const isUnavailable = pkg.id === 'verify' // Verify package đang triển khai
            return (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border-[2px] bg-white p-6 transition-all',
                  isOwned ? 'border-[#059669] bg-[#f0fdf4]' : selected === pkg.id
                    ? 'border-[#151515] shadow-[3px_3px_0_#151515]'
                    : 'border-[#151515]/20 shadow-[2px_2px_0_#151515]/20 hover:border-[#151515]/40',
                  pkg.popular && 'ring-2 ring-[#FDE047] ring-offset-2',
                  (isOwned || isUnavailable) && 'opacity-90'
                )}
              >
                {/* Unavailable Overlay */}
                {isUnavailable && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[1px]">
                    <span className="rounded-full bg-[#f59e0b] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                      Đang triển khai
                    </span>
                  </div>
                )}

                {/* Owned Badge */}
                {isOwned && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#059669] px-4 py-1 shadow-lg">
                      <CheckCircle2 className="size-3.5 text-white" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Đã mua</span>
                    </div>
                  </div>
                )}

                {/* Package Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-black text-[#151515]">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-black text-[#151515]">
                      {new Intl.NumberFormat('vi-VN').format(pkg.price)}
                    </span>
                    <span className="text-sm text-[#151515]/60">đ</span>
                  </div>
                  {pkg.id === 'verify' ? (
                    <p className="mt-1 text-xs font-medium text-[#151515]/60">Dịch vụ một lần</p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-[#151515]/60">/tháng</p>
                  )}
                  {/* Stars Allocation */}
                  {(pkg.id === 'standard' || pkg.id === 'vip') && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fef9c7] p-2">
                      <Star className="size-4 text-[#92400e]" />
                      <span className="text-sm font-bold text-[#92400e]">
                        {pkg.id === 'vip' ? '+75 Stars' : '+20 Stars'}
                      </span>
                      <span className="text-xs text-[#92400e]/70">/tháng</span>
                    </div>
                  )}
                  {/* Key Stats */}
                  {(pkg.weeklyPosts || pkg.vipBoosts) && (
                    <div className="mt-3 flex flex-col gap-1.5 rounded-lg bg-[#F5F5F0] p-3">
                      {pkg.weeklyPosts && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#151515]/70">Tin đăng/tuần</span>
                          <span className="font-bold text-[#151515]">
                            {pkg.weeklyPosts >= 100 ? 'Không giới hạn' : pkg.weeklyPosts + ' tin'}
                          </span>
                        </div>
                      )}
                      {pkg.vipBoosts !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#151515]/70">Đẩy VIP/tuần</span>
                          <span className="font-bold text-[#151515]">
                            {pkg.vipBoosts + ' lần'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mb-4 text-sm text-[#151515]/70">
                  {pkg.features.join(' · ')}
                </p>

                {/* Features List */}
                <ul className="mb-6 flex flex-col gap-2.5">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
                        <Check className="size-3 text-[#166534]" />
                      </div>
                      <span className="text-sm text-[#151515]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Select Button */}
                {isUnavailable ? (
                  <button
                    disabled
                    className="mt-auto flex h-11 items-center justify-center rounded-xl border-[2px] border-[#d1d5db] bg-white font-bold text-[#9ca3af] cursor-not-allowed"
                  >
                    Đang triển khai
                  </button>
                ) : isOwned ? (
                  <button
                    disabled
                    className="mt-auto flex h-11 items-center justify-center rounded-xl border-[2px] border-[#059669] bg-[#059669]/20 font-bold text-[#059669] cursor-not-allowed"
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Đã sở hữu
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPackage(pkg.id)}
                    className={cn(
                      'mt-auto flex h-11 items-center justify-center rounded-xl border-[2px] font-bold transition-all',
                      selected === pkg.id
                        ? 'border-[#151515] bg-[#151515] text-white shadow-[2px_2px_0_#151515]'
                        : 'border-[#151515] bg-white text-[#151515] hover:bg-[#F5F5F0]'
                    )}
                  >
                    {selected === pkg.id ? (
                      <>
                        <Check className="mr-2 size-4" />
                        Đã chọn
                      </>
                    ) : (
                      'Chọn gói này'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedPackage && !mySubscription && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-[2px] border-[#151515] bg-[#F5F5F0] p-6">
          <div className="text-center">
            <p className="text-sm text-[#151515]/60">Gói đã chọn:</p>
            <p className="text-xl font-black text-[#151515]">{selectedPackage.name}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#059669]">
              {formatMoney(selectedPackage.price)}
            </p>
          </div>
          <button
            onClick={() => {
              // Set initial payment method based on wallet balance
              if (wallet && wallet.balance >= selectedPackage.price) {
                setPaymentMethod('wallet')
              } else {
                setPaymentMethod('bank_transfer')
              }
              setShowPaymentModal(true)
            }}
            className="flex h-12 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-8 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
          >
            <CreditCard className="size-5" />
            Mua ngay
          </button>
        </div>
      )}

      {/* Info Note */}
      <div className="rounded-xl border-[2px] border-[#dbeafe] bg-[#eff6ff] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-[#1e40af]" />
          <div>
            <p className="font-bold text-[#1e40af]">Lưu ý</p>
            <ul className="mt-2 space-y-1 text-sm text-[#1e40af]/80">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#1e40af]" />
                Thanh toán qua ví hoặc chuyển khoản ngân hàng
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#1e40af]" />
                Gói sẽ được kích hoạt ngay sau khi thanh toán thành công
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#1e40af]" />
                Liên hệ hotline <span className="font-bold">1900-xxxx</span> để được hỗ trợ
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#151515]">Thanh toán gói dịch vụ</h3>
                <p className="text-xs text-[#151515]/60">{selectedPackage.name}</p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-[#151515]/10"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Order Summary */}
              <div className="rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#151515]/60">Gói</span>
                  <span className="font-bold text-[#151515]">{selectedPackage.name}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-[#151515]/60">Thời hạn</span>
                  <span className="font-bold text-[#151515]">
                    {selectedPackage.days >= 30 ? `${Math.floor(selectedPackage.days / 30)} tháng` : `${selectedPackage.days} ngày`}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-[#151515]/60">Số tiền</span>
                  <span className="font-mono text-xl font-bold text-[#059669]">
                    {formatMoney(selectedPackage.price)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              {!orderData && (
                <>
                  <h4 className="font-bold text-[#151515]">Chọn phương thức thanh toán</h4>
                  
                  {/* Wallet option */}
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    disabled={!!wallet && wallet.balance < selectedPackage.price}
                    className={cn(
                      'relative flex w-full flex-col items-start rounded-xl border-[2px] p-4 text-left transition-all',
                      paymentMethod === 'wallet'
                        ? 'border-[#059669] bg-[#dcfce7]'
                        : 'border-[#151515]/30 hover:border-[#151515]',
                      wallet && wallet.balance < selectedPackage.price && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        'size-5 rounded-full border-2 flex items-center justify-center',
                        paymentMethod === 'wallet' ? 'border-[#059669] bg-[#059669]' : 'border-gray-300'
                      )}>
                        {paymentMethod === 'wallet' && <Check className="size-3 text-white" />}
                      </div>
                      <WalletCards className="size-5 text-[#059669]" />
                      <span className="font-bold text-[#151515]">Thanh toán qua ví</span>
                    </div>
                    <p className="text-sm text-[#151515]/60">
                      Số dư: {wallet ? formatMoney(wallet.balance) : '0đ'}
                    </p>
                    {wallet && wallet.balance < selectedPackage.price && (
                      <span className="mt-1 text-xs text-red-600 font-medium">
                        Số dư không đủ. Vui lòng chọn phương thức khác hoặc nạp thêm tiền.
                      </span>
                    )}
                  </button>

                  {/* Bank transfer option */}
                  <button
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={cn(
                      'relative flex w-full flex-col items-start rounded-xl border-[2px] p-4 text-left transition-all',
                      paymentMethod === 'bank_transfer'
                        ? 'border-[#1e40af] bg-[#eff6ff]'
                        : 'border-[#151515]/30 hover:border-[#151515]'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        'size-5 rounded-full border-2 flex items-center justify-center',
                        paymentMethod === 'bank_transfer' ? 'border-[#1e40af] bg-[#1e40af]' : 'border-gray-300'
                      )}>
                        {paymentMethod === 'bank_transfer' && <Check className="size-3 text-white" />}
                      </div>
                      <QrCode className="size-5 text-[#1e40af]" />
                      <span className="font-bold text-[#151515]">Chuyển khoản ngân hàng</span>
                    </div>
                    <p className="text-sm text-[#151515]/60">
                      Quét QR hoặc chuyển khoản thủ công. Quản lý sẽ xác nhận khi nhận được tiền.
                    </p>
                  </button>

                  {/* Continue Button */}
                  <button
                    onClick={() => {
                      if (paymentMethod === 'wallet') {
                        // For wallet, directly process payment
                        handleWalletPurchase()
                      } else {
                        // For bank transfer, just show QR code
                        handleShowQRCode()
                      }
                    }}
                    disabled={processing || (paymentMethod === 'wallet' && !!wallet && wallet.balance < selectedPackage.price)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : paymentMethod === 'wallet' ? (
                      <>
                        <WalletCards className="size-5" />
                        Thanh toán qua ví
                      </>
                    ) : (
                      <>
                        <QrCode className="size-5" />
                        Hiển thị mã QR
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Bank Transfer Order Details */}
              {orderData && paymentMethod === 'bank_transfer' && (
                <div className="space-y-4">
                  {/* Amount Display */}
                  <div className="rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4 text-center">
                    <p className="text-sm text-[#166534]">Số tiền cần chuyển</p>
                    <p className="font-mono text-3xl font-black text-[#166534]">
                      {formatMoney(orderData.amount)}
                    </p>
                  </div>

                  {/* QR Code - Static Image */}
                  <div className="text-center">
                    <p className="mb-2 text-sm font-bold text-[#151515]">Quét mã QR</p>
                    <img
                      src="/images/payment/vnp.jpg"
                      alt="QR Code"
                      className="mx-auto max-w-64 rounded-xl border-[2px] border-[#151515]"
                    />
                  </div>

                      {/* Bank Transfer Info */}
                      <div className="rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
                        <h4 className="mb-3 font-bold text-[#151515]">Thông tin chuyển khoản:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#151515]/60">Ngân hàng:</span>
                            <span className="font-semibold text-[#151515]">{orderData.bankAccount?.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#151515]/60">Số TK:</span>
                            <span className="font-mono font-bold text-[#151515]">{orderData.bankAccount?.accountNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#151515]/60">Tên TK:</span>
                            <span className="font-semibold text-[#151515]">{orderData.bankAccount?.accountHolder}</span>
                          </div>
                          <div className="flex justify-between border-t border-[#151515]/20 pt-2">
                            <span className="text-[#151515]/60">Số tiền:</span>
                            <span className="font-mono font-bold text-[#059669]">{formatMoney(orderData.amount)}</span>
                          </div>
                          <div className="flex justify-between border-t border-[#151515]/20 pt-2">
                            <span className="text-[#151515]/60">Nội dung CK:</span>
                            <span className="font-mono font-bold text-[#1e40af]">{orderData.transferRef}</span>
                          </div>
                        </div>
                      </div>

                  {/* Instructions */}
                  <div className="rounded-xl border-[2px] border-[#dbeafe] bg-[#eff6ff] p-4">
                    <h4 className="mb-2 font-bold text-[#1e40af]">Hướng dẫn:</h4>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-[#1e40af]/80">
                      <li>Quét mã QR hoặc chuyển khoản thủ công</li>
                      <li>Nội dung: <strong>{orderData.transferRef}</strong></li>
                      <li>Ấn nút "Tôi đã chuyển khoản" bên dưới để gửi minh chứng</li>
                    </ol>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmitProof}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-3 font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="size-5" />
                          Tôi đã chuyển khoản
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowPaymentModal(false); resetPaymentState(); }}
                      className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-3 font-bold text-red-600 shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Back to Package Selection */}
              {orderData && (
                <button
                  onClick={() => { resetPaymentState(); }}
                  className="flex w-full items-center justify-center gap-2 text-sm text-[#151515]/60 hover:text-[#151515]"
                >
                  ← Chọn gói khác
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

