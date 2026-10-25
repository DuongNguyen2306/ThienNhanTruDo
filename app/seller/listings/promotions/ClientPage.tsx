'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowUp, Crown, Megaphone, WalletCards, Loader2, Plus, X, Check, Clock, ChevronDown, QrCode, CheckCircle2, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatVnd } from '@/lib/data'
import { sellerApi, paymentApi, walletDepositApi, starsApi, type Listing, type BoostPackage, type Wallet as WalletType, type BoostOrder, type BankAccount, type StarBalance } from '@/lib/api'
import { cn } from '@/lib/utils'

interface BoostRecord {
  listingId: string
  listingTitle: string
  startedAt: string
  expiresAt: string
  status: string
}

interface BoostWithListing extends BoostRecord {
  listing: Listing
}

export default function SellerPromotionsPage() {
  const [tab, setTab] = useState<'active' | 'expired' | 'all'>('active')
  const [packages, setPackages] = useState<BoostPackage[]>([])
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [boostHistory, setBoostHistory] = useState<BoostRecord[]>([])
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [starBalance, setStarBalance] = useState<StarBalance | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Boost modal state
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState<{vipExpiresAt: string; starsSpent: number; remainingStars: number} | null>(null)

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank_transfer' | 'stars'>('wallet')
  
  // Bank transfer state
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [currentOrder, setCurrentOrder] = useState<BoostOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pkgRes, listingRes, walletRes, boostRes, bankRes, starRes] = await Promise.all([
        sellerApi.getBoostPackages(),
        sellerApi.getListings('active'),
        paymentApi.getWallet(),
        sellerApi.getBoostHistory(),
        sellerApi.getBoostBankAccount().catch(() => ({ bankAccount: null })),
        starsApi.getBalance().catch(() => null),
      ])
      
      setPackages(pkgRes.packages || [])
      setMyListings(listingRes.listings || [])
      setWallet(walletRes.wallet)
      setBoostHistory(boostRes.boosts || [])
      setStarBalance(starRes)
      if (bankRes.bankAccount) {
        setBankAccount(bankRes.bankAccount)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  
  // Get active and expired boosts
  const activeBoosts = boostHistory.filter(b => 
    b.status === 'active' && new Date(b.expiresAt) > now
  )
  const expiredBoosts = boostHistory.filter(b => 
    b.status === 'active' && new Date(b.expiresAt) <= now
  )
  
  const displayedBoosts = tab === 'active' ? activeBoosts 
    : tab === 'expired' ? expiredBoosts 
    : [...activeBoosts, ...expiredBoosts]

  // Stats
  const totalSpent = boostHistory.length > 0 
    ? packages.reduce((sum, pkg) => sum + pkg.price, 0)
    : 0
  const activeCount = activeBoosts.length

  // Handle purchase with wallet
  const handlePurchaseBoostWallet = async () => {
    if (!selectedListing || !selectedPackage || !wallet) return
    
    setPurchasing(true)
    setPurchaseError(null)
    
    try {
      const requestId = pendingRequestId || `boost_${selectedListing.id}_${selectedPackage.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`
      if (!pendingRequestId) {
        setPendingRequestId(requestId)
      }
      
      const result = await sellerApi.purchaseBoost(selectedListing.id, selectedPackage.id, requestId)
      
      if (result.idempotent) {
        alert('Yêu cầu đã được xử lý trước đó')
      } else {
        alert(`Đã kích hoạt "${selectedPackage.name}" cho "${selectedListing.title}"`)
      }
      setShowBoostModal(false)
      resetModal()
      fetchData()
    } catch (err: any) {
      if (err.message?.includes('Số dư không đủ')) {
        setPurchaseError('Số dư không đủ. Vui lòng nạp thêm tiền hoặc chọn thanh toán chuyển khoản.')
        setPaymentMethod('bank_transfer')
      } else {
        setPurchaseError(err.message || 'Không thể mua boost')
      }
    } finally {
      setPurchasing(false)
    }
  }

  // Handle purchase with Stars
  const handlePurchaseBoostStars = async () => {
    if (!selectedListing || !selectedPackage || !starBalance) return
    
    setPurchasing(true)
    setPurchaseError(null)
    
    try {
      // Generate new UUID for every NEW purchase (only if not retrying)
      // Reuse pendingRequestId for retries - this survives network retries
      const requestId = pendingRequestId || crypto.randomUUID()
      if (!pendingRequestId) {
        setPendingRequestId(requestId)
      }
      
      const result = await starsApi.purchaseBoost(selectedListing.id, selectedPackage.days, requestId)
      
      // Show success state with details
      setPurchaseSuccess({
        vipExpiresAt: result.vip.expiresAt,
        starsSpent: result.stars.spent,
        remainingStars: result.stars.remaining,
      })
      
      // Update local star balance
      setStarBalance(prev => prev ? {
        ...prev,
        balance: result.stars.remaining,
        totalSpent: prev.totalSpent + result.stars.spent,
      } : null)
      
    } catch (err: any) {
      if (err.message?.includes('Không đủ Stars')) {
        setPurchaseError('Số Stars không đủ. Vui lòng mua thêm gói để nhận Stars.')
      } else {
        setPurchaseError(err.message || 'Không thể đẩy VIP bằng Stars')
      }
    } finally {
      setPurchasing(false)
    }
  }

  // Create boost order
  const handleShowBoostQRCode = async () => {
    if (!selectedListing || !selectedPackage) return
    
    setPurchasing(true)
    try {
      // Create real order on backend first
      const res = await sellerApi.createBoostOrder(selectedListing.id, selectedPackage.id)
      if (res.success && res.order) {
        setCurrentOrder({
          ...res.order,
          listingTitle: selectedListing.title,
          packageName: selectedPackage.name,
          packageDays: selectedPackage.days,
          bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
          bankBin: '970436',
          accountNumber: '1234567890',
          accountHolder: 'CONG TY TNHH THIEN NHAN',
        })
      }
    } catch (err: any) {
      alert(err.message || 'Không thể tạo đơn hàng')
    } finally {
      setPurchasing(false)
    }
  }

  const resetModal = () => {
    setSelectedListing(null)
    setSelectedPackage(null)
    setPendingRequestId(null)
    setPaymentMethod('wallet')
    setCurrentOrder(null)
    setPurchaseError(null)
    setPurchaseSuccess(null)
  }

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing)
    setSelectedPackage(null)
    setPendingRequestId(null)
    setPaymentMethod('wallet')
    setCurrentOrder(null)
    setPurchaseError(null)
  }

  const handleSelectPackage = (pkg: BoostPackage) => {
    setSelectedPackage(pkg)
    setPendingRequestId(null)
    setCurrentOrder(null)
    setPurchaseError(null)
    // Prefer Stars if available, else Wallet if can afford, else bank transfer
    if (starBalance && starBalance.balance >= pkg.days) {
      setPaymentMethod('stars')
    } else if (wallet && wallet.balance >= pkg.price) {
      setPaymentMethod('wallet')
    } else {
      setPaymentMethod('bank_transfer')
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN')

  // Handle submit payment proof for bank transfer
  const handleSubmitProof = async () => {
    if (!currentOrder) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setSubmitting(true)
      try {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const base64 = (ev.target?.result as string)?.split(',')[1]
          if (base64) {
            await sellerApi.submitBoostProof(currentOrder.id, base64, file.type)
            alert('Đã gửi minh chứng thanh toán. Vui lòng chờ quản lý xác nhận.')
            setShowBoostModal(false)
            resetModal()
            fetchData()
          }
        }
        reader.readAsDataURL(file)
      } catch (err: any) {
        alert(err.message || 'Lỗi khi gửi minh chứng')
      } finally {
        setSubmitting(false)
      }
    }
    input.click()
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-8 animate-spin text-[#151515]" />
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Đẩy tin & Boost VIP</h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Tăng lượt xem và đưa tin của bạn lên đầu kết quả tìm kiếm
          </p>
        </div>
        <button
          onClick={() => setShowBoostModal(true)}
          className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] px-5 py-3 font-bold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          <Plus className="size-5" />
          Mua boost
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard 
          icon={Megaphone} 
          label="Boost đang chạy" 
          value={String(activeCount)}
          detail={activeCount > 0 ? 'Đang hiển thị badge VIP' : 'Chưa có boost nào'}
        />
        <SummaryCard 
          icon={ArrowUp} 
          label="Lượt xem tăng" 
          value="+150%"
          detail="So với tin thường"
        />
        <SummaryCard 
          icon={WalletCards} 
          label="Số dư ví" 
          value={wallet ? formatVnd(wallet.balance) : '0đ'}
          detail="Dùng để mua boost"
          highlight
        />
        <SummaryCard 
          icon={Star} 
          label="Sao của tôi" 
          value={starBalance ? `${starBalance.balance} ⭐` : '0 ⭐'}
          detail={starBalance ? `Đã kiếm: ${starBalance.totalEarned}` : 'Mua gói để nhận Stars'}
          highlightYellow
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['active', 'expired', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition-all',
              tab === t
                ? 'bg-[#151515] text-white'
                : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
            )}
          >
            {t === 'active' ? 'Đang chạy' : t === 'expired' ? 'Đã hết hạn' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Boost History Table */}
      <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
        {displayedBoosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Megaphone className="size-16 text-[#151515]/20" />
            <p className="mt-4 text-[#151515]/60">
              {tab === 'active' ? 'Chưa có boost nào đang chạy' : 'Chưa có boost nào'}
            </p>
            <button
              onClick={() => setShowBoostModal(true)}
              className="mt-4 flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 py-2 font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
            >
              <Plus className="size-4" />
              Mua boost đầu tiên
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#151515]/10 bg-[#F5F5F0] text-xs uppercase tracking-wider text-[#151515]/60">
                <th className="px-5 py-4 font-bold">Tin đăng</th>
                <th className="px-5 py-4 font-bold">Gói</th>
                <th className="px-5 py-4 font-bold">Ngày mua</th>
                <th className="px-5 py-4 font-bold">Hết hạn</th>
                <th className="px-5 py-4 font-bold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {displayedBoosts.map((boost, idx) => {
                const isExpired = new Date(boost.expiresAt) <= now
                return (
                  <tr key={`${boost.listingId}-${idx}`} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50">
                    <td className="px-5 py-4">
                      <Link 
                        href={`/phong/${boost.listingId}`}
                        className="font-medium text-[#151515] hover:text-[#059669] hover:underline cursor-pointer"
                      >
                        {boost.listingTitle}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE047] px-3 py-1 text-xs font-bold text-[#151515]">
                        <Crown className="size-3" />
                        VIP
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#151515]/70">
                      {formatDate(boost.startedAt)}
                    </td>
                    <td className="px-5 py-4 text-[#151515]/70">
                      {formatDate(boost.expiresAt)}
                    </td>
                    <td className="px-5 py-4">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          <Clock className="size-3" />
                          Đã hết hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">
                          <Check className="size-3" />
                          Đang chạy
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Boost Purchase Modal */}
      {showBoostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#151515]">Mua Boost VIP</h2>
                <p className="text-xs text-[#151515]/60">Chọn tin đăng và gói boost</p>
              </div>
              <button
                onClick={() => { setShowBoostModal(false); resetModal(); }}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-[#151515]/10"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Wallet Balance */}
              <div className="flex items-center justify-between rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
                <div className="flex items-center gap-3">
                  <WalletCards className="size-6 text-[#059669]" />
                  <div>
                    <p className="text-sm text-[#151515]/60">Số dư ví</p>
                    <p className="font-mono text-xl font-bold text-[#059669]">
                      {wallet ? formatVnd(wallet.balance) : '0đ'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/seller/billing"
                  className="text-sm font-semibold text-[#1e40af] underline hover:text-[#1e3a8a]"
                >
                  Nạp thêm →
                </Link>
              </div>

              {/* Select Listing */}
              <div>
                <h3 className="mb-2 font-bold text-[#151515]">1. Chọn tin đăng</h3>
                {myListings.length === 0 ? (
                  <p className="text-sm text-[#151515]/60">Bạn chưa có tin đăng nào đã duyệt.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border-[2px] border-[#151515]">
                    {myListings.map(listing => (
                      <button
                        key={listing.id}
                        onClick={() => handleSelectListing(listing)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b border-[#151515]/10 px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#F5F5F0]',
                          selectedListing?.id === listing.id && 'bg-[#FDE047]'
                        )}
                      >
                        <div className={cn(
                          'flex size-5 items-center justify-center rounded-full border-2',
                          selectedListing?.id === listing.id 
                            ? 'border-[#151515] bg-[#151515] text-white' 
                            : 'border-[#151515]/30'
                        )}>
                          {selectedListing?.id === listing.id && <Check className="size-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-[#151515]">{listing.title}</p>
                          <p className="text-xs text-[#151515]/60">{listing.district}</p>
                        </div>
                        {listing.vip && listing.vipExpiresAt && new Date(listing.vipExpiresAt) > now && (
                          <span 
                            className="rounded-full bg-gradient-to-r from-emerald-500 to-green-400 px-2.5 py-0.5 text-[10px] font-black text-white border-[1.5px] border-[#151515]"
                            style={{ boxShadow: '0 0 8px 2px rgba(34, 197, 94, 0.4)' }}
                          >
                            ⭐ VIP
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Select Package */}
              {selectedListing && (
                <div>
                  <h3 className="mb-2 font-bold text-[#151515]">2. Chọn gói boost</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {packages.map(pkg => {
                      const canAffordWallet = wallet && wallet.balance >= pkg.price
                      const canAffordStars = starBalance && starBalance.balance >= pkg.days
                      const useStars = canAffordStars
                      
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => (canAffordWallet || canAffordStars) && handleSelectPackage(pkg)}
                          disabled={!canAffordWallet && !canAffordStars}
                          className={cn(
                            'relative flex flex-col rounded-xl border-[2px] p-4 text-left transition-all',
                            selectedPackage?.id === pkg.id
                              ? 'border-[#151515] bg-[#FDE047] shadow-[2px_2px_0_#151515]'
                              : canAffordWallet || canAffordStars
                                ? 'border-[#151515]/30 hover:border-[#151515]'
                                : 'border-gray-200 opacity-50 cursor-not-allowed',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[#151515]">{pkg.name}</p>
                            {useStars && canAffordStars && (
                              <span className="rounded-full bg-[#FDE047] px-2 py-0.5 text-xs font-bold text-[#92400e] flex items-center gap-1">
                                <Star className="size-3" />
                                Khuyến mãi
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#151515]/60 mt-1">{pkg.description}</p>
                          <div className="mt-2 flex items-baseline gap-2">
                            {useStars && canAffordStars ? (
                              <>
                                <p className="font-mono text-lg font-black text-[#92400e]">
                                  {pkg.days} Stars ⭐
                                </p>
                                <p className="text-xs text-[#151515]/40 line-through">
                                  {formatVnd(pkg.price)}
                                </p>
                              </>
                            ) : (
                              <p className={cn(
                                'font-mono text-lg font-black',
                                canAffordWallet ? 'text-[#059669]' : 'text-gray-400'
                              )}>
                                {formatVnd(pkg.price)}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              {selectedListing && selectedPackage && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[#151515]">3. Chọn phương thức thanh toán</h3>
                  
                  {/* Payment options */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Wallet option */}
                    <button
                      onClick={() => setPaymentMethod('wallet')}
                      disabled={!wallet || wallet.balance < selectedPackage.price}
                      className={cn(
                        'relative flex flex-col items-start rounded-xl border-[2px] p-4 text-left transition-all',
                        paymentMethod === 'wallet'
                          ? 'border-[#059669] bg-[#dcfce7]'
                          : 'border-[#151515]/30 hover:border-[#151515]',
                        (wallet?.balance || 0) < selectedPackage.price && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          'size-5 rounded-full border-2 flex items-center justify-center',
                          paymentMethod === 'wallet' ? 'border-[#059669] bg-[#059669]' : 'border-gray-300'
                        )}>
                          {paymentMethod === 'wallet' && <Check className="size-3 text-white" />}
                        </div>
                        <WalletCards className="size-5 text-[#059669]" />
                        <span className="font-bold text-[#151515]">Thanh toán qua ví</span>
                      </div>
                      <p className="text-xs text-[#151515]/60">
                        Số dư: {wallet ? formatVnd(wallet.balance) : '0đ'}
                      </p>
                      {wallet && wallet.balance < selectedPackage.price && (
                        <span className="mt-1 text-xs text-red-600 font-medium">
                          Số dư không đủ
                        </span>
                      )}
                    </button>

                    {/* Stars option - highlight when user has enough */}
                    <button
                      onClick={() => setPaymentMethod('stars')}
                      disabled={!starBalance || starBalance.balance < selectedPackage.days}
                      className={cn(
                        'relative flex flex-col items-start rounded-xl border-[2px] p-4 text-left transition-all',
                        paymentMethod === 'stars'
                          ? 'border-[#92400e] bg-[#fef3c7] shadow-[2px_2px_0_#92400e]'
                          : starBalance && starBalance.balance >= selectedPackage.days
                            ? 'border-[#FDE047] bg-[#fef9c7] hover:border-[#92400e]'
                            : 'border-[#151515]/30 hover:border-[#151515]',
                        (!starBalance || starBalance.balance < selectedPackage.days) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          'size-5 rounded-full border-2 flex items-center justify-center',
                          paymentMethod === 'stars' ? 'border-[#92400e] bg-[#92400e]' : 'border-gray-300'
                        )}>
                          {paymentMethod === 'stars' && <Check className="size-3 text-white" />}
                        </div>
                        <Star className="size-5 text-[#92400e]" />
                        <span className={cn(
                          'font-bold',
                          paymentMethod === 'stars' || (starBalance && starBalance.balance >= selectedPackage.days) ? 'text-[#92400e]' : 'text-[#151515]'
                        )}>
                          Đẩy bằng Sao ⭐
                        </span>
                        {starBalance && starBalance.balance >= selectedPackage.days && (
                          <span className="rounded-full bg-[#059669] px-2 py-0.5 text-[10px] font-bold text-white">
                            Khuyến mãi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#151515]/60">
                        Cần: <strong className="text-[#92400e]">{selectedPackage.days} Stars</strong>
                      </p>
                      {starBalance && (
                        <p className="text-xs text-[#151515]/60">
                          Có: <strong className="text-[#059669]">{starBalance.balance} Stars</strong>
                        </p>
                      )}
                      {starBalance && starBalance.balance < selectedPackage.days && (
                        <span className="mt-1 text-xs text-red-600 font-medium">
                          Không đủ Stars
                        </span>
                      )}
                    </button>

                    {/* Bank transfer option */}
                    <button
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={cn(
                        'relative flex flex-col items-start rounded-xl border-[2px] p-4 text-left transition-all',
                        paymentMethod === 'bank_transfer'
                          ? 'border-[#1e40af] bg-[#eff6ff]'
                          : 'border-[#151515]/30 hover:border-[#151515]'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          'size-5 rounded-full border-2 flex items-center justify-center',
                          paymentMethod === 'bank_transfer' ? 'border-[#1e40af] bg-[#1e40af]' : 'border-gray-300'
                        )}>
                          {paymentMethod === 'bank_transfer' && <Check className="size-3 text-white" />}
                        </div>
                        <QrCode className="size-5 text-[#1e40af]" />
                        <span className="font-bold text-[#151515]">Chuyển khoản ngân hàng</span>
                      </div>
                      <p className="text-xs text-[#151515]/60">
                        Quét QR hoặc chuyển khoản thủ công
                      </p>
                    </button>
                  </div>

                  {/* Bank Transfer Order Flow */}
                  {paymentMethod === 'bank_transfer' && !currentOrder && (
                    <div className="rounded-xl border-[2px] border-[#1e40af] bg-[#eff6ff] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="size-5 text-[#1e40af]" />
                        <h4 className="font-bold text-[#1e40af]">Thanh toán qua ngân hàng</h4>
                      </div>
                      <p className="text-sm text-[#1e40af]/80 mb-4">
                        Sau khi tạo đơn, bạn sẽ nhận được thông tin chuyển khoản. 
                        Quản lý sẽ xác nhận khi nhận được tiền.
                      </p>
                      <button
                        onClick={handleShowBoostQRCode}
                        disabled={purchasing}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#1e40af] py-3 font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-50"
                      >
                        {purchasing ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="size-5" />
                            Hiển thị mã QR
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Order Details & QR */}
                  {paymentMethod === 'bank_transfer' && currentOrder && (
                    <div className="space-y-4">
                      {/* Amount Display */}
                      <div className="rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4 text-center">
                        <p className="text-sm text-[#166534]">Số tiền cần chuyển</p>
                        <p className="font-mono text-3xl font-black text-[#166534]">
                          {formatVnd(currentOrder.amount)}
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
                            <span className="font-semibold text-[#151515]">{currentOrder.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#151515]/60">Số TK:</span>
                            <span className="font-mono font-bold text-[#151515]">{currentOrder.accountNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#151515]/60">Tên TK:</span>
                            <span className="font-semibold text-[#151515]">{currentOrder.accountHolder}</span>
                          </div>
                          <div className="flex justify-between border-t border-[#151515]/20 pt-2">
                            <span className="text-[#151515]/60">Số tiền:</span>
                            <span className="font-mono font-bold text-[#059669]">{formatVnd(currentOrder.amount)}</span>
                          </div>
                          <div className="flex justify-between border-t border-[#151515]/20 pt-2">
                            <span className="text-[#151515]/60">Nội dung CK:</span>
                            <span className="font-mono font-bold text-[#1e40af]">{currentOrder.transferRef}</span>
                          </div>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="rounded-xl border-[2px] border-[#dbeafe] bg-[#eff6ff] p-4">
                        <h4 className="mb-2 font-bold text-[#1e40af]">Hướng dẫn:</h4>
                        <ol className="list-inside list-decimal space-y-1 text-sm text-[#1e40af]/80">
                          <li>Quét mã QR hoặc chuyển khoản thủ công</li>
                          <li>Nội dung: <strong>{currentOrder.transferRef}</strong></li>
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
                          onClick={() => { setShowBoostModal(false); resetModal(); }}
                          className="rounded-xl border-[2px] border-[#151515] bg-white px-4 py-3 font-bold text-red-600 shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary & Confirm (Wallet) */}
              {selectedListing && selectedPackage && paymentMethod === 'wallet' && wallet && (
                <div className="space-y-3 rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4">
                  <h3 className="font-bold text-[#166534]">Xác nhận mua boost</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#166534]/70">Tin đăng:</span>
                      <span className="font-medium text-[#166534]">{selectedListing.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#166534]/70">Gói:</span>
                      <span className="font-medium text-[#166534]">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#166534]/70">Thời hạn:</span>
                      <span className="font-medium text-[#166534]">{selectedPackage.days} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#166534]/70">Hết hạn:</span>
                      <span className="font-medium text-[#166534]">
                        {formatDate(new Date(now.getTime() + selectedPackage.days * 24 * 60 * 60 * 1000).toISOString())}
                      </span>
                    </div>
                    <div className="border-t border-[#166534]/20 pt-2 flex justify-between">
                      <span className="text-[#166534]/70">Thanh toán:</span>
                      <span className="font-mono font-bold text-[#166534]">{formatVnd(selectedPackage.price)}</span>
                    </div>
                    <div className="border-t border-[#166534]/20 pt-2 flex justify-between">
                      <span className="text-[#166534]/70">Số dư còn lại:</span>
                      <span className="font-mono font-bold text-[#166534]">
                        {formatVnd(wallet.balance - selectedPackage.price)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {purchaseError && (
                <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{purchaseError}</p>
                  {purchaseError.includes('Số dư không đủ') && (
                    <div className="mt-2 flex gap-2">
                      <Link href="/seller/billing" className="text-sm font-semibold text-[#1e40af] underline">
                        Nạp thêm tiền →
                      </Link>
                      <button 
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className="text-sm font-semibold text-[#059669] underline"
                      >
                        Hoặc chọn chuyển khoản
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons (Wallet) */}
              {paymentMethod === 'wallet' && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePurchaseBoostWallet}
                    disabled={!selectedListing || !selectedPackage || purchasing || (!!wallet && wallet.balance < (selectedPackage?.price || 0))}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                  >
                    {purchasing ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="size-5" />
                        Xác nhận thanh toán qua ví
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowBoostModal(false); resetModal(); }}
                    className="rounded-xl border-[2px] border-[#151515] bg-white px-6 py-4 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {/* Stars Purchase Confirmation */}
              {paymentMethod === 'stars' && selectedPackage && (
                <div className="space-y-4">
                  <div className="rounded-xl border-[2px] border-[#FDE047] bg-[#fef9c7] p-4">
                    <h3 className="font-bold text-[#92400e]">Xác nhận đẩy VIP bằng Stars</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#92400e]/70">Tin đăng:</span>
                        <span className="font-medium text-[#92400e]">{selectedListing?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#92400e]/70">Thời hạn:</span>
                        <span className="font-medium text-[#92400e]">{selectedPackage.days} ngày</span>
                      </div>
                      <div className="flex justify-between border-t border-[#92400e]/20 pt-2">
                        <span className="text-[#92400e]/70">Thanh toán:</span>
                        <span className="font-mono font-bold text-[#92400e]">{selectedPackage.days} Stars ⭐</span>
                      </div>
                      {starBalance && (
                        <div className="flex justify-between">
                          <span className="text-[#92400e]/70">Stars còn lại:</span>
                          <span className="font-mono font-bold text-[#92400e]">{starBalance.balance - selectedPackage.days} Stars</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error */}
                  {purchaseError && (
                    <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4">
                      <p className="text-sm text-red-700">{purchaseError}</p>
                    </div>
                  )}

                  {/* Success */}
                  {purchaseSuccess && (
                    <div className="rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-5 text-[#166534]" />
                        <h3 className="font-bold text-[#166534]">Đẩy VIP thành công!</h3>
                      </div>
                      <div className="space-y-1 text-sm text-[#166534]">
                        <p>Đã sử dụng: <strong>{purchaseSuccess.starsSpent} Stars</strong></p>
                        <p>Stars còn lại: <strong>{purchaseSuccess.remainingStars} Stars</strong></p>
                        <p>VIP hết hạn: <strong>{new Date(purchaseSuccess.vipExpiresAt).toLocaleDateString('vi-VN')}</strong></p>
                      </div>
                    </div>
                  )}

                  {/* Stars Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handlePurchaseBoostStars}
                      disabled={purchasing || !starBalance || starBalance.balance < selectedPackage.days}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#FDE047] py-4 font-bold text-[#92400e] shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                    >
                      {purchasing ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          <Star className="size-5" />
                          Xác nhận đẩy VIP bằng Stars
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowBoostModal(false); resetModal(); }}
                      className="rounded-xl border-[2px] border-[#151515] bg-white px-6 py-4 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons (Bank Transfer) */}
              {paymentMethod === 'bank_transfer' && !currentOrder && !purchaseSuccess && (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowBoostModal(false); resetModal(); }}
                    className="flex-1 rounded-xl border-[2px] border-[#151515] bg-white px-6 py-4 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                  >
                    Đóng
                  </button>
                </div>
              )}

              {/* Success state - show close button */}
              {purchaseSuccess && (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowBoostModal(false); resetModal(); fetchData(); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
                  >
                    <Check className="size-5" />
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function SummaryCard({ icon: Icon, label, value, detail, highlight, highlightYellow }: {
  icon: React.ElementType
  label: string
  value: string
  detail: string
  highlight?: boolean
  highlightYellow?: boolean
}) {
  return (
    <Card className={cn(
      'rounded-2xl',
      highlight && 'bg-[#059669]',
      highlightYellow && 'bg-[#fef3c7]'
    )}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn(
          'flex size-11 items-center justify-center rounded-xl',
          highlight && 'bg-white/20',
          highlightYellow && 'bg-[#FDE047]'
        )}>
          <Icon className={cn(
            'size-6',
            highlight && 'text-white',
            highlightYellow && 'text-[#92400e]'
          )} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#151515]/50">{label}</p>
          <p className={cn(
            'mt-1 text-lg font-bold',
            highlight && 'text-white',
            highlightYellow && 'text-[#92400e]'
          )}>
            {value}
          </p>
          <p className={cn(
            'text-xs',
            highlight && 'text-white/70',
            highlightYellow && 'text-[#92400e]/70'
          )}>
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
