'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ShieldAlert, RefreshCw, Wallet, Home } from 'lucide-react'
import { paymentApi, type VnpayCallbackResult, type VnpayCreateParams } from '@/lib/api'
import { cn } from '@/lib/utils'

type ViewState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; data: VnpayCallbackResult }

const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ'

// VNPay date format: yyyyMMddHHmmss (GMT+7)
function formatVnpDate(value?: string | null) {
  if (!value || !/^\d{14}$/.test(value)) return null
  return `${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)} ${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`
}

export default function ClientPage() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ViewState>({ kind: 'loading' })
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const verifiedRef = useRef(false)

  useEffect(() => {
    // Verify once (React StrictMode runs effects twice in development).
    if (verifiedRef.current) return
    verifiedRef.current = true

    const query = searchParams.toString()
    if (!searchParams.get('vnp_TxnRef') || !searchParams.get('vnp_SecureHash')) {
      setState({ kind: 'missing' })
      return
    }

    paymentApi
      .verifyVnpayCallback(query)
      .then((data) => setState({ kind: 'result', data }))
      .catch((err: unknown) =>
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Không thể xác thực kết quả thanh toán',
        })
      )
  }, [searchParams])

  // Pay the same deposit/order again when the backend says it is still
  // payable; otherwise send the user back to where they started.
  const handleRetry = async (params: VnpayCreateParams | null, fallbackPath: string) => {
    if (!params) {
      window.location.href = fallbackPath
      return
    }
    setRetrying(true)
    setRetryError(null)
    try {
      const res = await paymentApi.createVnpayUrl(params)
      window.location.href = res.paymentUrl
    } catch (err: unknown) {
      setRetryError(err instanceof Error ? err.message : 'Không thể tạo lại thanh toán')
      setRetrying(false)
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#F5F5F0] px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        {state.kind === 'loading' && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Loader2 className="size-12 animate-spin text-[#005BAA]" />
            <h1 className="mt-5 text-xl font-bold text-[#151515]">Đang xác thực giao dịch...</h1>
            <p className="mt-2 text-sm text-[#151515]/60">Vui lòng không đóng trang này.</p>
          </div>
        )}

        {state.kind === 'missing' && (
          <StatusBlock
            tone="warning"
            title="Không có thông tin giao dịch"
            message="Trang này chỉ hiển thị kết quả sau khi bạn thanh toán qua VNPay."
          >
            <PrimaryLink href="/seller/billing" icon={<Wallet className="size-5" />}>Về trang ví</PrimaryLink>
          </StatusBlock>
        )}

        {state.kind === 'error' && (
          <StatusBlock tone="error" title="Không thể xác thực giao dịch" message={state.message}>
            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#151515] py-3.5 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
            >
              <RefreshCw className="size-5" />
              Thử xác thực lại
            </button>
            <SecondaryLink href="/seller/billing">Về trang ví</SecondaryLink>
          </StatusBlock>
        )}

        {state.kind === 'result' && state.data.success && (
          <StatusBlock
            tone="success"
            title="Thanh toán thành công"
            message={
              state.data.purpose === 'package_order'
                ? `Gói "${state.data.order?.packageName ?? ''}" đã được kích hoạt.`
                : 'Tiền đã được cộng vào ví của bạn.'
            }
          >
            <Details
              rows={[
                ['Số tiền', <span key="a" className="font-mono text-lg font-black text-[#059669]">{formatMoney(state.data.amount)}</span>],
                ['Mã giao dịch', <span key="t" className="font-mono font-bold">{state.data.txnRef}</span>],
                state.data.order ? ['Gói dịch vụ', <span key="p" className="font-bold">{state.data.order.packageName}</span>] : null,
                state.data.subscription
                  ? ['Hiệu lực đến', new Date(state.data.subscription.expiresAt).toLocaleDateString('vi-VN')]
                  : null,
                state.data.transactionNo ? ['Mã GD VNPay', <span key="n" className="font-mono">{state.data.transactionNo}</span>] : null,
                state.data.bankCode ? ['Ngân hàng', state.data.bankCode] : null,
                formatVnpDate(state.data.payDate) ? ['Thời gian', formatVnpDate(state.data.payDate)] : null,
                state.data.purpose !== 'package_order' && typeof state.data.walletBalance === 'number'
                  ? ['Số dư ví', <span key="b" className="font-mono font-bold">{formatMoney(state.data.walletBalance)}</span>]
                  : null,
              ]}
            />
            <PrimaryLink href="/tim-kiem" icon={<Home className="size-5" />}>Về danh sách phòng</PrimaryLink>
            <SecondaryLink href={state.data.retryPath}>
              {state.data.purpose === 'package_order' ? 'Xem gói & đơn hàng của tôi' : 'Xem ví & lịch sử giao dịch'}
            </SecondaryLink>
          </StatusBlock>
        )}

        {state.kind === 'result' && !state.data.success && (
          <StatusBlock
            tone={state.data.isValid ? 'error' : 'warning'}
            title={state.data.responseCode === '24' ? 'Bạn đã hủy thanh toán' : 'Thanh toán không thành công'}
            message={state.data.message}
          >
            <Details
              rows={[
                state.data.txnRef ? ['Mã giao dịch', <span key="t" className="font-mono font-bold">{state.data.txnRef}</span>] : null,
                state.data.amount ? ['Số tiền', <span key="a" className="font-mono font-bold">{formatMoney(state.data.amount)}</span>] : null,
                state.data.responseCode ? ['Mã phản hồi', <span key="c" className="font-mono">{state.data.responseCode}</span>] : null,
              ]}
            />
            {retryError && (
              <p className="rounded-lg border-[2px] border-red-300 bg-red-50 p-3 text-sm text-red-700">{retryError}</p>
            )}
            <button
              onClick={() => handleRetry(state.data.retryParams ?? null, state.data.retryPath || '/seller/billing')}
              disabled={retrying}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#005BAA] py-3.5 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-60"
            >
              {retrying ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
              Thử thanh toán lại
            </button>
            <SecondaryLink href={state.data.retryPath || '/seller/billing'}>
              {state.data.purpose === 'package_order' ? 'Về trang gói dịch vụ' : 'Về trang ví'}
            </SecondaryLink>
          </StatusBlock>
        )}
      </div>
    </main>
  )
}

function StatusBlock({
  tone,
  title,
  message,
  children,
}: {
  tone: 'success' | 'error' | 'warning'
  title: string
  message: string
  children: React.ReactNode
}) {
  const styles = {
    success: { band: 'bg-[#dcfce7]', icon: <CheckCircle2 className="size-16 text-[#059669]" /> },
    error: { band: 'bg-[#fee2e2]', icon: <XCircle className="size-16 text-[#dc2626]" /> },
    warning: { band: 'bg-[#fef9c3]', icon: <ShieldAlert className="size-16 text-[#b45309]" /> },
  }[tone]

  return (
    <>
      <div className={cn('flex flex-col items-center border-b-[2px] border-[#151515] px-6 py-8 text-center', styles.band)}>
        {styles.icon}
        <h1 className="mt-4 text-2xl font-black text-[#151515]">{title}</h1>
        <p className="mt-2 text-sm text-[#151515]/70">{message}</p>
      </div>
      <div className="flex flex-col gap-3 p-6">{children}</div>
      <p className="border-t border-[#151515]/10 px-6 py-3 text-center text-xs text-[#151515]/50">
        Giao dịch được xử lý bởi cổng thanh toán VNPay (môi trường Sandbox)
      </p>
    </>
  )
}

function Details({ rows }: { rows: ([string, React.ReactNode] | null)[] }) {
  const items = rows.filter((r): r is [string, React.ReactNode] => r !== null)
  if (items.length === 0) return null
  return (
    <div className="mb-2 divide-y divide-[#151515]/10 rounded-xl border-[2px] border-[#151515] bg-[#F5F5F0] px-4">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span className="text-[#151515]/60">{label}</span>
          <span className="text-right text-[#151515]">{value}</span>
        </div>
      ))}
    </div>
  )
}

function PrimaryLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] py-3.5 font-bold text-white shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
    >
      {icon}
      {children}
    </Link>
  )
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center rounded-xl border-[2px] border-[#151515] bg-white py-3 font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
    >
      {children}
    </Link>
  )
}
