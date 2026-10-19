'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, Calendar, Download, FileText, Loader2, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tenantApi, type Contract } from '@/lib/api'
import { formatVnd } from '@/lib/data'
import { useAuth } from '@/components/auth-provider'

const statusLabels: Record<string, { label: string; className: string }> = {
  active_record: { label: 'Đang lưu trữ', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  archived: { label: 'Đã lưu trữ', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  revoked: { label: 'Đã thu hồi', className: 'border-red-200 bg-red-50 text-red-700' },
}

export default function ContractsPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchContracts = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await tenantApi.getContracts()
        setContracts(data.contracts || [])
      } catch (err: any) {
        console.error('[Contracts] Fetch error:', err)
        setError(err.message || 'Không thể tải danh sách hợp đồng')
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [user])

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <ShieldAlert className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem hợp đồng.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldAlert className="size-12 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <FileText className="size-12 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Bạn chưa có hợp đồng nào được lưu trên hệ thống.</p>
        <p className="text-xs text-slate-400">
          Hợp đồng sẽ được chủ phòng tải lên sau khi bạn ký bên ngoài.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {contracts.map((c) => {
        const status = statusLabels[c.status] || { label: c.status, className: '' }

        return (
          <Card key={c.id} className="rounded-2xl border-slate-200">
            <CardHeader className="flex-row items-start justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="line-clamp-1">{c.title}</CardTitle>
                <CardDescription className="mt-1">
                  {c.listing?.title || 'Phòng liên quan'}
                  {c.contractNumber && ` · Mã ${c.contractNumber}`}
                </CardDescription>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-4">
                {c.startDate && (
                  <Stat
                    icon={Calendar}
                    label="Ngày bắt đầu"
                    value={formatDate(c.startDate)}
                  />
                )}
                {c.endDate && (
                  <Stat
                    icon={Calendar}
                    label="Ngày kết thúc"
                    value={formatDate(c.endDate)}
                  />
                )}
                {c.monthlyRent && (
                  <Stat
                    icon={BadgeCheck}
                    label="Tiền thuê"
                    value={formatVnd(c.monthlyRent) + '/tháng'}
                  />
                )}
                <Stat
                  icon={FileText}
                  label="File"
                  value={`${c.originalFileName.split('.').pop()?.toUpperCase() || 'FILE'} · ${formatFileSize(c.fileSize)}`}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={c.status === 'revoked'}>
                  Xem chi tiết
                </Button>
                {c.status !== 'revoked' && (
                  <Button variant="outline">
                    <Download className="mr-1 size-4" />
                    Tải xuống
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Tải lên: {formatDate(c.uploadedAt)}
                {c.version > 1 && ` · Phiên bản ${c.version}`}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}
