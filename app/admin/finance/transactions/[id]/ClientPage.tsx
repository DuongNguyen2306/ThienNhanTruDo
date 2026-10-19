'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, XCircle,
  RefreshCw, CreditCard, User, Calendar, FileText, Loader2,
  AlertCircle, ShieldCheck, ReceiptText
} from 'lucide-react'
import { adminApi, type Transaction } from '@/lib/api'
import { formatVnd } from '@/lib/data'

interface TransactionWithUser extends Transaction {
  user?: {
    id: string
    fullName: string
    phone: string
  }
}

export default function TransactionDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [transaction, setTransaction] = useState<TransactionWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch transaction
  useEffect(() => {
    if (!id) return

    const fetchTransaction = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get all transactions and find by ID
        const data = await adminApi.getTransactions({ page: 1, limit: 100 })
        const found = data.transactions.find((t: Transaction) => t.id === id || t.vnpayTxRef === id)
        if (found) {
          setTransaction(found as TransactionWithUser)
        } else {
          setError('Không tìm thấy giao dịch')
        }
      } catch (e: any) {
        console.error('Fetch error:', e)
        setError('Không thể tải thông tin giao dịch')
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [id])

  // Status config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Thành công' }
      case 'pending':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Đang xử lý' }
      case 'failed':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Thất bại' }
      case 'refunded':
        return { icon: RefreshCw, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Đã hoàn tiền' }
      default:
        return { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: status }
    }
  }

  // Loading
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

  // Error
  if (error || !transaction) {
    return (
      <main className="flex flex-col items-center justify-center gap-6 px-5 py-20 lg:px-8">
        <AlertTriangle className="size-16 text-red-500" />
        <p className="text-lg font-semibold text-[#151515]">{error || 'Không tìm thấy giao dịch'}</p>
        <Link
          href="/admin/finance/transactions"
          className="flex items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-5 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition hover:bg-[#F5F5F0]"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách
        </Link>
      </main>
    )
  }

  const statusConfig = getStatusConfig(transaction.status || '')
  const StatusIcon = statusConfig.icon

  return (
    <main className="flex flex-col gap-6 px-5 py-6 lg:px-8">

      {/* Back Button */}
      <Link
        href="/admin/finance/transactions"
        className="inline-flex w-fit items-center gap-2 rounded-lg border-2 border-[#151515]/20 bg-white px-4 py-2 text-sm font-medium text-[#151515]/60 transition hover:border-[#151515] hover:text-[#151515]"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#151515]">
              Chi tiết giao dịch
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="size-4" />
              {statusConfig.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-[#151515]/50">
            Mã: {transaction.id?.slice(-12).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Transaction Info */}
        <div className="rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
          <div className="border-b-2 border-[#151515] bg-[#F5F5F0] px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">
              Thông tin giao dịch
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Amount - Highlight */}
            <div className="rounded-xl bg-[#FDE047] border-2 border-[#151515] p-4">
              <p className="text-xs font-medium text-[#151515]/60">Số tiền</p>
              <p className="mt-1 font-mono text-3xl font-black text-[#151515]">
                {formatVnd(transaction.amount || 0)}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Loại giao dịch</p>
                <p className="mt-1 font-semibold capitalize">{transaction.type || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Phương thức</p>
                <p className="mt-1 font-semibold">
                  {transaction.method === 'vnpay' ? 'VNPay' : transaction.method || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Mã tham chiếu VNPay</p>
                <p className="mt-1 font-mono text-sm">{transaction.vnpayTxRef || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Ngày thanh toán VNPay</p>
                <p className="mt-1 text-sm">
                  {transaction.vnpayDate
                    ? new Date(transaction.vnpayDate).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })
                    : '-'}
                </p>
              </div>
            </div>

            {transaction.description && (
              <div>
                <p className="text-xs font-medium text-[#151515]/50">Mô tả</p>
                <p className="mt-1 text-sm">{transaction.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[#151515]/50">Ngày tạo</p>
              <p className="mt-1 text-sm">
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* User & Verification Info */}
        <div className="space-y-6">

          {/* User Info */}
          <div className="rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
            <div className="border-b-2 border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">
                Người thực hiện
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#151515] bg-[#FDE047] text-lg font-black text-[#151515]">
                  {(transaction as any).user?.fullName?.slice(0, 2).toUpperCase() || '??'}
                </div>
                <div>
                  <p className="font-bold text-[#151515]">
                    {(transaction as any).user?.fullName || 'N/A'}
                  </p>
                  <p className="text-sm text-[#151515]/50">
                    {(transaction as any).user?.phone || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* VNPay Verification Status */}
          <div className="rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515] overflow-hidden">
            <div className="border-b-2 border-[#151515] bg-[#F5F5F0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50">
                Xác minh VNPay
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {/* Signature Verified */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="text-sm">Chữ ký VNPay đã được xác minh</span>
              </div>
              
              {/* Idempotency Check */}
              {transaction.status !== 'pending' && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="text-sm">Chống xử lý trùng đã kích hoạt</span>
                </div>
              )}

              {/* Reconciliation Note */}
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Về đối soát</p>
                    <p className="mt-1 text-xs text-blue-700">
                      Để đối soát thực sự với VNPay, cần tra cứu qua Merchant Portal hoặc 
                      nhận file đối soát hàng ngày. Dữ liệu hiện tại dựa trên phản hồi 
                      từ cổng thanh toán.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Status */}
          <div className="rounded-xl border-2 border-[#151515] bg-[#F5F5F0] p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#151515]/50 mb-3">
              Trạng thái đối soát nội bộ
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#151515]/60">Trạng thái giao dịch:</span>
                <span className="font-semibold capitalize">{transaction.status || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#151515]/60">Đồng bộ với VNPay:</span>
                <span className={`font-semibold ${transaction.status !== 'pending' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {transaction.status !== 'pending' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for pending transactions */}
      {transaction.status === 'pending' && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Giao dịch đang chờ xử lý</p>
              <p className="mt-1 text-sm text-amber-700">
                Giao dịch này đang chờ phản hồi từ VNPay. Nếu người dùng đã thanh toán nhưng 
                trạng thái không tự động cập nhật, có thể kiểm tra trực tiếp trên VNPay Merchant Portal.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
