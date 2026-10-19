'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Wallet as WalletIcon, CreditCard, Calendar, CheckCircle2, Clock3, XCircle, Loader2,
  ArrowUpRight, ArrowDownRight, MinusCircle, RefreshCw, Plus, QrCode, Copy, X, Check, Star
} from 'lucide-react'
import { paymentApi, walletDepositApi, starsApi, type Wallet as WalletType, type Transaction, type WalletDeposit, type StarBalance, type StarTransaction } from '@/lib/api'
import { cn } from '@/lib/utils'

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast {
  id: string
  message: string
  type: ToastType
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  completed: { label: 'Thành công', bg: 'bg-[#dcfce7]', text: 'text-[#166534]', icon: <CheckCircle2 className="size-4" /> },
  pending: { label: 'Đang xử lý', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', icon: <Clock3 className="size-4 animate-pulse" /> },
  failed: { label: 'Thất bại', bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', icon: <XCircle className="size-4" /> },
}

const DEPOSIT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Chờ thanh toán', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', icon: <Clock3 className="size-4 animate-pulse" /> },
  PENDING_REVIEW: { label: 'Chờ duyệt', bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', icon: <Clock3 className="size-4 animate-pulse" /> },
  APPROVED: { label: 'Đã nạp', bg: 'bg-[#dcfce7]', text: 'text-[#166534]', icon: <CheckCircle2 className="size-4" /> },
  REJECTED: { label: 'Từ chối', bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', icon: <XCircle className="size-4" /> },
  CANCELLED: { label: 'Đã hủy', bg: 'bg-gray-100', text: 'text-gray-600', icon: <XCircle className="size-4" /> },
  EXPIRED: { label: 'Hết hạn', bg: 'bg-orange-100', text: 'text-orange-700', icon: <XCircle className="size-4" /> },
}

export default function ClientPage() {
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deposits, setDeposits] = useState<WalletDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits' | 'stars'>('transactions')
  const [mySubscription, setMySubscription] = useState<{packageName: string; expiresAt: string} | null>(null)

  // Star balance state
  const [starBalance, setStarBalance] = useState<StarBalance | null>(null)
  const [starTransactions, setStarTransactions] = useState<StarTransaction[]>([])
  const [starFilter, setStarFilter] = useState<'all' | 'GRANT' | 'SPEND' | 'EXPIRE' | 'REFUND'>('all')

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [currentDeposit, setCurrentDeposit] = useState<WalletDeposit | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [copied, setCopied] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast helper
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-[#dcfce7]', border: 'border-[#166534]', icon: <CheckCircle2 className="size-5 text-[#166534]" /> },
    error: { bg: 'bg-[#fee2e2]', border: 'border-[#991b1b]', icon: <XCircle className="size-5 text-[#991b1b]" /> },
    info: { bg: 'bg-[#dbeafe]', border: 'border-[#1e40af]', icon: <CreditCard className="size-5 text-[#1e40af]" /> },
    warning: { bg: 'bg-[#fef9c3]', border: 'border-[#854d0e]', icon: <Clock3 className="size-5 text-[#854d0e]" /> },
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes, depositRes, subRes, starRes] = await Promise.all([
        paymentApi.getWallet(),
        paymentApi.getHistory(),
        walletDepositApi.getMyDeposits(),
        paymentApi.getMySubscription(),
        starsApi.getBalance().catch(() => null),
      ])
      setWallet(walletRes.wallet)
      setTransactions(txRes.transactions)
      setDeposits(depositRes.deposits)
      setMySubscription(subRes.subscriptions?.[0] || null)
      setStarBalance(starRes)
      // Load star transactions separately (needs type filter)
      if (starRes) {
        const starTxRes = await starsApi.getTransactions({ limit: 50 })
        setStarTransactions(starTxRes.transactions)
      }
    } catch {
      setError('Không thể tải thông tin ví')
    } finally {
      setLoading(false)
    }
  }

  // Load star transactions when tab changes
  const loadStarTransactions = async () => {
    try {
      const res = await starsApi.getTransactions({ limit: 50 })
      setStarTransactions(res.transactions)
    } catch {
      console.error('Failed to load star transactions')
    }
  }

  useEffect(() => {
    if (activeTab === 'stars') {
      loadStarTransactions()
    }
  }, [activeTab])

  // Filtered star transactions
  const filteredStarTransactions = starFilter === 'all'
    ? starTransactions
    : starTransactions.filter((tx) => tx.type === starFilter)

  const filteredTransactions = transactions.filter((tx) => {
    // Exclude pending deposits - they are shown in the "Yêu cầu nạp tiền" tab to avoid duplication
    if (tx.type === 'deposit' && tx.status === 'pending') return false
    if (filter === 'all') return true
    return tx.status === filter
  })

  const totalDeposited = transactions
    .filter((tx) => tx.status === 'completed' && tx.type === 'deposit')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes, depositRes] = await Promise.all([
        paymentApi.getWallet(),
        paymentApi.getHistory(),
        walletDepositApi.getMyDeposits(),
      ])
      setWallet(walletRes.wallet)
      setTransactions(txRes.transactions)
      setDeposits(depositRes.deposits)
    } catch {
      setError('Không thể làm mới dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDeposit = async () => {
    const amount = parseInt(depositAmount.replace(/[^0-9]/g, ''))
      if (!amount || amount < 10000) {
        showToast('Số tiền nạp tối thiểu là 10.000đ', 'warning')
        return
      }
      if (amount > 100000000) {
        showToast('Số tiền nạp tối đa là 100.000.000đ', 'warning')
        return
      }

    setSubmitting(true)
    try {
      const res = await walletDepositApi.createDeposit(amount)
      if (res.success) {
        setCurrentDeposit(res.deposit)
        await fetchQRCode(res.deposit.id)
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể tạo yêu cầu nạp tiền', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchQRCode = async (depositId: string) => {
    try {
      const res = await walletDepositApi.getVietQR(depositId)
      setQrUrl(res.qrUrl)
    } catch (err) {
      console.error('Error fetching QR:', err)
    }
  }

  const handleSubmitProof = async () => {
    if (!currentDeposit) return

    // Create a simple file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setSubmitting(true)
      try {
        // Convert to base64
        const reader = new FileReader()
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1]
          if (base64) {
            await walletDepositApi.submitProof(currentDeposit.id, base64, file.type)
            showToast('Đã gửi minh chứng thanh toán. Vui lòng chờ quản lý xác nhận.', 'success')
            setShowDepositModal(false)
            setCurrentDeposit(null)
            setDepositAmount('')
            setQrUrl('')
            fetchData()
          }
        }
        reader.readAsDataURL(file)
      } catch (err: any) {
        showToast(err.message || 'Lỗi khi gửi minh chứng', 'error')
      } finally {
        setSubmitting(false)
      }
    }
    input.click()
  }

  const handleCancelDeposit = async (depositId: string) => {
    if (!confirm('Bạn có chắc muốn hủy yêu cầu này?')) return

    try {
      await walletDepositApi.cancelDeposit(depositId)
      showToast('Đã hủy yêu cầu nạp tiền', 'success')
      fetchData()
      if (currentDeposit?.id === depositId) {
        setShowDepositModal(false)
        setCurrentDeposit(null)
        setDepositAmount('')
        setQrUrl('')
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi hủy yêu cầu', 'error')
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(''), 2000)
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ'

  const formatDate = (date: string) => new Date(date).toLocaleString('vi-VN')

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setDepositAmount(value ? parseInt(value).toLocaleString('vi-VN') : '')
  }

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
    <>
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <span className="text-[#151515]">Ví & Giao dịch</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Ví & Giao dịch</h1>
          <p className="mt-1 text-sm text-[#151515]/60">Quản lý số dư và lịch sử giao dịch của bạn</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white px-4 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
          >
            <Plus className="size-4" />
            Nạp tiền
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="flex flex-col gap-4 rounded-2xl border-[2px] border-[#151515] bg-gradient-to-br from-[#059669] to-[#047857] p-6 shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/20">
                <WalletIcon className="size-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Số dư ví</p>
              </div>
            </div>
          </div>
          <div className="mt-auto">
            <p className="font-mono text-3xl font-black text-white">
              {wallet ? formatMoney(wallet.balance) : '0đ'}
            </p>
          </div>
        </div>

        {/* Spent Card */}
        <div className="flex flex-col gap-4 rounded-2xl border-[2px] border-[#151515] bg-white p-6 shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#fee2e2]">
                <ArrowUpRight className="size-6 text-[#991b1b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#151515]/60">Đã chi tiêu</p>
              </div>
            </div>
          </div>
          <div className="mt-auto">
            <p className="font-mono text-3xl font-black text-[#991b1b]">
              {wallet ? formatMoney(wallet.totalSpent) : '0đ'}
            </p>
          </div>
        </div>

        {/* Total Deposited Card */}
        <div className="flex flex-col gap-4 rounded-2xl border-[2px] border-[#151515] bg-white p-6 shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#dcfce7]">
                <ArrowDownRight className="size-6 text-[#166534]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#151515]/60">Tổng nạp</p>
              </div>
            </div>
          </div>
          <div className="mt-auto">
            <p className="font-mono text-3xl font-black text-[#166534]">
              {formatMoney(totalDeposited)}
            </p>
          </div>
        </div>

        {/* Star Balance Card */}
        {starBalance && (
          <div className="flex flex-col gap-4 rounded-2xl border-[2px] border-[#FDE047] bg-gradient-to-br from-[#fef3c7] to-[#fef9c7] p-6 shadow-[3px_3px_0_#151515]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#FDE047]">
                  <Star className="size-6 text-[#92400e]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#92400e]/80">Sao của tôi</p>
                </div>
              </div>
            </div>
            <div className="mt-auto">
              <p className="font-mono text-3xl font-black text-[#92400e]">
                {starBalance.balance} <span className="text-lg">⭐</span>
              </p>
              <p className="mt-1 text-xs text-[#92400e]/70">
                Đã kiếm: {starBalance.totalEarned} · Đã dùng: {starBalance.totalSpent}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Current Package Display */}
      {mySubscription && (
        <div className="rounded-2xl border-[2px] border-[#059669] bg-gradient-to-r from-[#dcfce7] to-[#d1fae5] p-5 shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#059669]">
                <CheckCircle2 className="size-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#166534]">Gói dịch vụ hiện tại</p>
                <p className="text-xl font-black text-[#166534]">{mySubscription.packageName}</p>
                <p className="text-xs text-[#166534]/70">
                  Hết hạn: {new Date(mySubscription.expiresAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
            <Link
              href="/seller/billing/packages"
              className="rounded-xl border-[2px] border-[#059669] bg-white px-4 py-2 text-sm font-bold text-[#059669] shadow-[2px_2px_0_#059669] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
            >
              Nâng cấp
            </Link>
          </div>
        </div>
      )}
      {!mySubscription && (
        <div className="rounded-2xl border-[2px] border-[#F59E0B] bg-gradient-to-r from-[#fef3c7] to-[#fde68a] p-5 shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#F59E0B]">
                <Clock3 className="size-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#92400e]">Gói dịch vụ</p>
                <p className="text-xl font-black text-[#92400e]">Chưa có gói</p>
                <p className="text-xs text-[#92400e]/70">Mua gói để đăng tin không giới hạn</p>
              </div>
            </div>
            <Link
              href="/seller/billing/packages"
              className="rounded-xl border-[2px] border-[#F59E0B] bg-white px-4 py-2 text-sm font-bold text-[#F59E0B] shadow-[2px_2px_0_#F59E0B] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
            >
              Mua ngay
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold transition-all',
            activeTab === 'transactions'
              ? 'bg-[#151515] text-white'
              : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
          )}
        >
          Lịch sử giao dịch
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold transition-all',
            activeTab === 'deposits'
              ? 'bg-[#151515] text-white'
              : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
          )}
        >
          Yêu cầu nạp tiền
        </button>
        <button
          onClick={() => setActiveTab('stars')}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-bold transition-all',
            activeTab === 'stars'
              ? 'bg-[#FDE047] text-[#92400e]'
              : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
          )}
        >
          ⭐ Sao của tôi
        </button>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
            <h2 className="text-lg font-bold text-[#151515]">Lịch sử giao dịch</h2>
            <div className="flex gap-2">
              {(['all', 'completed', 'pending', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    filter === f
                      ? 'bg-[#151515] text-white'
                      : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
                  )}
                >
                  {f === 'all' ? 'Tất cả' :
                   f === 'completed' ? 'Thành công' :
                   f === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MinusCircle className="size-16 text-[#151515]/20" />
              <p className="mt-4 text-[#151515]/60">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#151515]/10 text-xs uppercase tracking-wider text-[#151515]/60">
                  <th className="px-5 py-4 font-bold">Ngày</th>
                  <th className="px-5 py-4 font-bold">Mô tả</th>
                  <th className="px-5 py-4 text-right font-bold">Số tiền</th>
                  <th className="px-5 py-4 text-right font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending
                  // Wallet semantics: deposits are credits (+), payments are debits (-)
                  const isCredit = tx.type === 'deposit'
                  const isDebit = tx.type === 'payment' || tx.type === 'boost'
                  return (
                    <tr key={tx.id} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-[#151515]/40" />
                          <span className="text-[#151515]">
                            {new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-[#151515]">
                            {tx.description || (tx.type === 'deposit' ? 'Nạp tiền' : 'Thanh toán')}
                          </p>
                          <p className="mt-0.5 text-xs text-[#151515]/60">
                            {tx.method === 'vnpay' ? 'VNPay' : tx.method || 'Ví'}
                            {tx.vnpayTxRef && <span className="ml-2 font-mono">{tx.vnpayTxRef}</span>}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn(
                          'font-mono text-base font-bold',
                          isCredit ? 'text-[#166534]' : isDebit ? 'text-[#991b1b]' : 'text-[#151515]'
                        )}>
                          {isCredit ? '+' : isDebit ? '-' : ''}{formatMoney(tx.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                          statusCfg.bg, statusCfg.text
                        )}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
            <h2 className="text-lg font-bold text-[#151515]">Yêu cầu nạp tiền</h2>
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex h-9 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
            >
              <Plus className="size-4" />
              Nạp tiền mới
            </button>
          </div>

          {deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <WalletIcon className="size-16 text-[#151515]/20" />
              <p className="mt-4 text-[#151515]/60">Chưa có yêu cầu nạp tiền nào</p>
              <button
                onClick={() => setShowDepositModal(true)}
                className="mt-4 flex h-10 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                <Plus className="size-4" />
                Nạp tiền ngay
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#151515]/10">
              {deposits.map((deposit) => {
                const statusCfg = DEPOSIT_STATUS_CONFIG[deposit.status] || DEPOSIT_STATUS_CONFIG.PENDING
                return (
                  <div key={deposit.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#151515]">{deposit.depositRef}</span>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                            statusCfg.bg, statusCfg.text
                          )}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-2xl font-black text-[#059669]">
                          {formatMoney(deposit.amount)}
                        </p>
                        <p className="mt-1 text-xs text-[#151515]/60">
                          Tạo: {formatDate(deposit.createdAt)}
                          {deposit.expiresAt && ` · Hết hạn: ${formatDate(deposit.expiresAt)}`}
                        </p>
                        <p className="text-xs text-[#151515]/60">
                          Nội dung CK: <span className="font-mono font-bold text-[#1e40af]">{deposit.transferRef}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {deposit.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setCurrentDeposit(deposit)
                                fetchQRCode(deposit.id)
                                setShowDepositModal(true)
                              }}
                              className="flex h-9 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-4 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                            >
                              <QrCode className="size-4" />
                              Thanh toán
                            </button>
                            <button
                              onClick={() => handleCancelDeposit(deposit.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Hủy yêu cầu
                            </button>
                          </>
                        )}
                        {deposit.status === 'PENDING_REVIEW' && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#1e40af]">Đã gửi minh chứng</p>
                            <p className="text-xs text-[#151515]/60">Đang chờ quản lý duyệt</p>
                          </div>
                        )}
                        {deposit.status === 'APPROVED' && (
                          <CheckCircle2 className="size-8 text-[#166534]" />
                        )}
                        {(deposit.status === 'REJECTED' || deposit.status === 'CANCELLED' || deposit.status === 'EXPIRED') && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-red-600">
                              {deposit.status === 'REJECTED' && 'Đã từ chối'}
                              {deposit.status === 'CANCELLED' && 'Đã hủy'}
                              {deposit.status === 'EXPIRED' && 'Đã hết hạn'}
                            </p>
                            {deposit.reviewerNote && (
                              <p className="text-xs text-[#151515]/60">{deposit.reviewerNote}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Stars Tab */}
      {activeTab === 'stars' && (
        <div className="space-y-4">
          {/* Star Balance Summary */}
          {starBalance && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-2xl border-[2px] border-[#FDE047] bg-gradient-to-br from-[#fef3c7] to-[#fef9c7] p-5 shadow-[3px_3px_0_#151515]">
                <div className="flex items-center gap-2">
                  <Star className="size-5 text-[#92400e]" />
                  <p className="font-bold text-[#92400e]">Số dư</p>
                </div>
                <p className="font-mono text-3xl font-black text-[#92400e]">
                  {starBalance.balance} <span className="text-lg">⭐</span>
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[3px_3px_0_#151515]">
                <p className="text-sm text-[#151515]/60">Tổng kiếm được</p>
                <p className="font-mono text-2xl font-black text-[#166534]">
                  +{starBalance.totalEarned} <span className="text-base">⭐</span>
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border-[2px] border-[#151515] bg-white p-5 shadow-[3px_3px_0_#151515]">
                <p className="text-sm text-[#151515]/60">Tổng đã dùng</p>
                <p className="font-mono text-2xl font-black text-[#991b1b]">
                  -{starBalance.totalSpent} <span className="text-base">⭐</span>
                </p>
              </div>
            </div>
          )}

          {/* Expiring Batches */}
          {starBalance && starBalance.batches.length > 0 && (
            <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <div className="border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
                <h2 className="text-lg font-bold text-[#151515]">Stars sắp hết hạn</h2>
              </div>
              <div className="divide-y divide-[#151515]/10">
                {starBalance.batches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex size-10 items-center justify-center rounded-xl',
                        batch.daysUntilExpiry <= 7 ? 'bg-[#fee2e2]' : 'bg-[#fef9c7]'
                      )}>
                        <Star className={cn(
                          'size-5',
                          batch.daysUntilExpiry <= 7 ? 'text-[#991b1b]' : 'text-[#92400e]'
                        )} />
                      </div>
                      <div>
                        <p className="font-bold text-[#151515]">{batch.remainingAmount} Stars</p>
                        <p className="text-xs text-[#151515]/60">
                          Hết hạn: {new Date(batch.expiresAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      batch.daysUntilExpiry <= 7
                        ? 'bg-[#fee2e2] text-[#991b1b]'
                        : 'bg-[#fef9c7] text-[#92400e]'
                    )}>
                      {batch.daysUntilExpiry <= 0 ? 'Hết hạn' : `Còn ${batch.daysUntilExpiry} ngày`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Star Transactions */}
          <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <h2 className="text-lg font-bold text-[#151515]">Lịch sử Stars</h2>
              <div className="flex gap-2">
                {(['all', 'GRANT', 'SPEND', 'EXPIRE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStarFilter(f)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                      starFilter === f
                        ? 'bg-[#151515] text-white'
                        : 'bg-white text-[#151515] hover:bg-[#F5F5F0]'
                    )}
                  >
                    {f === 'all' ? 'Tất cả' :
                     f === 'GRANT' ? 'Nhận' :
                     f === 'SPEND' ? 'Dùng' : 'Hết hạn'}
                  </button>
                ))}
              </div>
            </div>
            {filteredStarTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Star className="size-16 text-[#151515]/20" />
                <p className="mt-4 text-[#151515]/60">Chưa có giao dịch Stars nào</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#151515]/10 text-xs uppercase tracking-wider text-[#151515]/60">
                    <th className="px-5 py-4 font-bold">Ngày</th>
                    <th className="px-5 py-4 font-bold">Mô tả</th>
                    <th className="px-5 py-4 text-right font-bold">Số sao</th>
                    <th className="px-5 py-4 text-right font-bold">Số dư</th>
                  </tr>
                </thead>
                <tbody>
                  {starTransactions.map((tx) => {
                    const isGrant = tx.type === 'GRANT';
                    const isExpire = tx.type === 'EXPIRE';
                    return (
                      <tr key={tx.id} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50">
                        <td className="px-5 py-4">
                          <span className="text-[#151515]">
                            {new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium text-[#151515]">{tx.description}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={cn(
                            'font-mono text-base font-bold',
                            isGrant ? 'text-[#166534]' : isExpire ? 'text-[#991b1b]' : 'text-[#151515]'
                          )}>
                            {isGrant ? '+' : isExpire ? '-' : ''}{tx.amount} ⭐
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[#151515]/60">{tx.balanceAfter} ⭐</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="rounded-xl border-[2px] border-[#FDE047] bg-[#fef9c3] p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-5 shrink-0 text-[#854d0e]" />
          <div>
            <p className="font-bold text-[#854d0e]">Thông tin thanh toán</p>
            <p className="mt-1 text-sm text-[#854d0e]/80">
              Nạp tiền qua chuyển khoản ngân hàng. Sau khi thanh toán, vui lòng gửi minh chứng để quản lý xác nhận. Số dư ví dùng để mua gói tin đăng và các dịch vụ khác.
            </p>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#151515]">
                  {currentDeposit ? 'Thanh toán nạp tiền' : 'Nạp tiền vào ví'}
                </h3>
                <p className="text-xs text-[#151515]/60">
                  {currentDeposit ? `Mã: ${currentDeposit.depositRef}` : 'Chuyển khoản ngân hàng để nạp tiền'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDepositModal(false)
                  setCurrentDeposit(null)
                  setDepositAmount('')
                  setQrUrl('')
                }}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-[#151515]/10"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {/* Amount Input (if no deposit yet) */}
              {!currentDeposit && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-bold text-[#151515]">
                    Số tiền nạp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={handleAmountInput}
                      placeholder="0"
                      className="w-full rounded-xl border-[2px] border-[#151515] bg-white px-4 py-3 pr-12 font-mono text-2xl font-bold text-[#151515] focus:border-[#059669] focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-[#151515]/60">
                      đ
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#151515]/60">
                    Tối thiểu 10.000đ - Tối đa 100.000.000đ
                  </p>
                </div>
              )}

              {/* Deposit Info (if deposit exists) */}
              {currentDeposit && (
                <>
                  {/* Amount Display */}
                  <div className="mb-6 rounded-xl border-[2px] border-[#059669] bg-[#dcfce7] p-4 text-center">
                    <p className="text-sm text-[#166534]">Số tiền nạp</p>
                    <p className="font-mono text-3xl font-black text-[#166534]">
                      {formatMoney(currentDeposit.amount)}
                    </p>
                  </div>

                  {/* QR Code */}
                  {qrUrl && (
                    <div className="mb-6 text-center">
                      <p className="mb-2 text-sm font-bold text-[#151515]">Quét mã QR</p>
                      <img
                        src={qrUrl}
                        alt="VietQR"
                        className="mx-auto max-w-64 rounded-xl border-[2px] border-[#151515]"
                        onError={() => setQrUrl('')}
                      />
                    </div>
                  )}

                  {/* Bank Transfer Info */}
                  <div className="mb-6 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] p-4">
                    <h4 className="mb-3 font-bold text-[#151515]">Chuyển khoản đến:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#151515]/60">Ngân hàng:</span>
                        <span className="font-semibold text-[#151515]">{currentDeposit.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#151515]/60">Số TK:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#151515]">{currentDeposit.accountNumber}</span>
                          <button
                            onClick={() => copyToClipboard(currentDeposit.accountNumber, 'account')}
                            className="rounded bg-white px-2 py-0.5 text-xs font-semibold hover:bg-gray-100"
                          >
                            {copied === 'account' ? <Check className="size-3" /> : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#151515]/60">Tên TK:</span>
                        <span className="font-semibold text-[#151515]">{currentDeposit.accountHolder}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#151515]/20 pt-2">
                        <span className="text-[#151515]/60">Số tiền:</span>
                        <span className="font-mono font-bold text-[#059669]">{formatMoney(currentDeposit.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#151515]/20 pt-2">
                        <span className="text-[#151515]/60">Nội dung CK:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1e40af]">{currentDeposit.transferRef}</span>
                          <button
                            onClick={() => copyToClipboard(currentDeposit.transferRef, 'ref')}
                            className="rounded bg-white px-2 py-0.5 text-xs font-semibold hover:bg-gray-100"
                          >
                            {copied === 'ref' ? <Check className="size-3" /> : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 rounded bg-red-100 p-2 text-xs text-red-700">
                      ⚠️ <strong>Lưu ý:</strong> Nội dung chuyển khoản phải chính xác: <strong>{currentDeposit.transferRef}</strong>
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="mb-6 rounded-xl border-[2px] border-[#dbeafe] bg-[#eff6ff] p-4">
                    <h4 className="mb-2 font-bold text-[#1e40af]">Hướng dẫn:</h4>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-[#1e40af]/80">
                      <li>Chuyển khoản đúng số tiền <strong>{formatMoney(currentDeposit.amount)}</strong></li>
                      <li>Ghi đúng nội dung: <strong>{currentDeposit.transferRef}</strong></li>
                      <li>Chụp ảnh/screenshot biên lai chuyển tiền</li>
                      <li>Ấn nút "Tôi đã chuyển khoản" bên dưới và tải lên minh chứng</li>
                    </ol>
                  </div>

                  {/* Expiration */}
                  <p className="mb-4 text-center text-xs text-[#151515]/60">
                    Yêu cầu hết hạn: {formatDate(currentDeposit.expiresAt)}
                  </p>
                </>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {!currentDeposit ? (
                  <button
                    onClick={handleCreateDeposit}
                    disabled={!depositAmount || submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="size-5" />
                        Tạo yêu cầu nạp tiền
                      </>
                    )}
                  </button>
                ) : currentDeposit.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={handleSubmitProof}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515] disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="size-5" />
                          Tôi đã chuyển khoản - Gửi minh chứng
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCancelDeposit(currentDeposit.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-white py-3 font-bold text-[#991b1b] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                    >
                      Hủy yêu cầu
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowDepositModal(false)
                      setCurrentDeposit(null)
                      setDepositAmount('')
                      setQrUrl('')
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#151515] py-4 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>

    {/* Toast Notifications */}
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border-[2px] px-4 py-3 shadow-lg animate-in slide-in-from-right',
            toastStyles[toast.type].bg,
            toastStyles[toast.type].border
          )}
        >
          {toastStyles[toast.type].icon}
          <span className="font-medium text-[#151515]">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 rounded hover:bg-black/10">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
    </>
  )
}
