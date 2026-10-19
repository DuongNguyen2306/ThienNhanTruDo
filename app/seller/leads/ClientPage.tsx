'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Phone, MessageSquare, Calendar, User, Eye, MessageCircle,
  Search, Filter, Clock, Users, Star, XCircle, CheckCircle2, Loader2
} from 'lucide-react'
import { sellerApi, type SellerLead } from '@/lib/api'
import { cn } from '@/lib/utils'

type FilterStatus = 'all' | 'new' | 'contacted' | 'interested' | 'not_interested'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  new: { label: 'Mới', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]', border: 'border-[#fde047]' },
  contacted: { label: 'Đã liên hệ', bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', border: 'border-[#93c5fd]' },
  interested: { label: 'Quan tâm', bg: 'bg-[#dcfce7]', text: 'text-[#166534]', border: 'border-[#86efac]' },
  not_interested: { label: 'Không quan tâm', bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', border: 'border-[#fca5a5]' },
}

const FILTER_OPTIONS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'new', label: 'Mới' },
  { id: 'contacted', label: 'Đã liên hệ' },
  { id: 'interested', label: 'Quan tâm' },
  { id: 'not_interested', label: 'Không quan tâm' },
]

export default function ClientPage() {
  const [leads, setLeads] = useState<SellerLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<SellerLead | null>(null)

  useEffect(() => {
    sellerApi.getLeads()
      .then(({ leads: l }) => setLeads(l))
      .catch(() => setError('Không thể tải danh sách khách hàng'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter((lead) => {
    const matchFilter = filter === 'all' || lead.status === filter
    const matchSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      (lead.listing?.title || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const counts: Record<string, number> = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    interested: leads.filter((l) => l.status === 'interested').length,
    not_interested: leads.filter((l) => l.status === 'not_interested').length,
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await sellerApi.updateLead(id, status)
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: status as SellerLead['status'] } : l))
      )
      setSelectedLead(null)
    } catch {
      alert('Không thể cập nhật trạng thái')
    } finally {
      setUpdating(null)
    }
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
    <main className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#151515]/60">
        <Link href="/seller" className="hover:text-[#151515]">Trang chủ</Link>
        <span>/</span>
        <span className="text-[#151515]">Khách hàng quan tâm</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#151515]">Khách hàng quan tâm</h1>
        <p className="mt-1 text-sm text-[#151515]/60">Quản lý thông tin và trạng thái khách hàng quan tâm đến tin đăng của bạn</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-sm font-semibold transition-all',
              filter === opt.id
                ? 'border-[#151515] bg-[#151515] text-white'
                : 'border-[#151515]/30 bg-white text-[#151515] hover:border-[#151515]/60'
            )}
          >
            {opt.label}
            <span className={cn(
              'ml-1 rounded-full px-2 py-0.5 text-xs',
              filter === opt.id ? 'bg-white/20' : 'bg-[#151515]/10'
            )}>
              {counts[opt.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#F5F5F0]">
            <Users className="size-5 text-[#151515]/50" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Tổng</p>
            <p className="text-xl font-black text-[#151515]">{counts.all || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#fef9c3]">
            <Clock className="size-5 text-[#854d0e]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Mới</p>
            <p className="text-xl font-black text-[#854d0e]">{counts.new || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#dbeafe]">
            <Phone className="size-5 text-[#1e40af]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Đã liên hệ</p>
            <p className="text-xl font-black text-[#1e40af]">{counts.contacted || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-[2px] border-[#151515] bg-white p-4 shadow-[2px_2px_0_#151515]">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#dcfce7]">
            <Star className="size-5 text-[#166534]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Quan tâm</p>
            <p className="text-xl font-black text-[#166534]">{counts.interested || 0}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#151515]/40" />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, SĐT, tin đăng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border-[2px] border-[#151515] bg-white pl-11 pr-4 shadow-[2px_2px_0_#151515] focus:border-[#FDE047] focus:outline-none focus:ring-[3px] focus:ring-[#FDE047]/30"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border-[2px] border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-[2px] border-[#151515] bg-white p-12 shadow-[3px_3px_0_#151515]">
          <Users className="size-16 text-[#151515]/20" />
          <p className="mt-4 text-[#151515]/60">Chưa có khách hàng quan tâm nào</p>
        </div>
      )}

      {/* Leads Table */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-[2px] border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-[2px] border-[#151515] bg-[#F5F5F0] text-xs uppercase tracking-wider text-[#151515]/60">
                <th className="px-5 py-4 font-bold">Khách hàng</th>
                <th className="px-5 py-4 font-bold">SĐT</th>
                <th className="px-5 py-4 font-bold">Tin đăng</th>
                <th className="px-5 py-4 font-bold">Thời gian</th>
                <th className="px-5 py-4 font-bold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                return (
                  <tr key={lead.id} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDE047]">
                          <User className="size-5 text-[#151515]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#151515]">{lead.name}</p>
                          {lead.message && (
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-[#151515]/60">
                              {lead.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-[#151515]/40" />
                        <span className="font-medium text-[#151515]">{lead.phone}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.listingId ? (
                        <Link
                          href={`/seller/listings/${lead.listingId}`}
                          className="font-medium text-[#059669] hover:underline"
                        >
                          {lead.listing?.title || 'Tin đăng'}
                        </Link>
                      ) : (
                        <span className="text-[#151515]/50">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-[#151515]/40" />
                        <span className="text-[#151515]">
                          {lead.when
                            ? new Date(lead.when).toLocaleDateString('vi-VN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date(lead.createdAt).toLocaleDateString('vi-VN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-semibold',
                        statusCfg.bg, statusCfg.text, statusCfg.border
                      )}>
                        {lead.status === 'contacted' && <Phone className="size-3" />}
                        {lead.status === 'interested' && <Star className="size-3" />}
                        {lead.status === 'new' && <Clock className="size-3" />}
                        {lead.status === 'not_interested' && <XCircle className="size-3" />}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="flex h-9 items-center gap-1.5 rounded-lg border-[2px] border-[#151515] bg-white px-3 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          <Eye className="size-3.5" />
                          Xem
                        </button>
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex h-9 items-center gap-1.5 rounded-lg border-[2px] border-[#151515] bg-[#059669] px-3 text-xs font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
                        >
                          <Phone className="size-3.5" />
                          Liên hệ
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151515]/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
            <div className="flex items-center justify-between border-b-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <h3 className="text-lg font-bold text-[#151515]">Chi tiết khách hàng</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-[#151515]/10"
              >
                <XCircle className="size-5 text-[#151515]/50" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#FDE047]">
                  <User className="size-7 text-[#151515]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-[#151515]">{selectedLead.name}</h4>
                  <p className="mt-1 flex items-center gap-2 text-[#151515]/60">
                    <Phone className="size-4" />
                    {selectedLead.phone}
                  </p>
                </div>
              </div>

              {selectedLead.listingId && (
                <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60">Tin đăng quan tâm</p>
                  <Link
                    href={`/seller/listings/${selectedLead.listingId}`}
                    className="mt-1 block font-bold text-[#059669] hover:underline"
                  >
                    {selectedLead.listing?.title || 'Tin đăng'}
                  </Link>
                </div>
              )}

              {selectedLead.message && (
                <div className="mt-4 rounded-xl bg-[#F5F5F0] p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#151515]/60">
                    <MessageSquare className="size-4" />
                    Lời nhắn
                  </p>
                  <p className="mt-1 text-[#151515]">{selectedLead.message}</p>
                </div>
              )}

              {selectedLead.when && (
                <div className="mt-4 flex items-center gap-3">
                  <Calendar className="size-5 text-[#151515]/40" />
                  <span className="text-sm text-[#151515]">
                    Mong xem phòng: {new Date(selectedLead.when).toLocaleDateString('vi-VN', {
                      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              <div className="mt-6">
                <p className="mb-3 text-sm font-bold text-[#151515]">Cập nhật trạng thái</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedLead.id, 'contacted')}
                    disabled={updating === selectedLead.id}
                    className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#dbeafe] px-4 py-2 text-sm font-bold text-[#1e40af] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:opacity-50"
                  >
                    {updating === selectedLead.id ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
                    Đã liên hệ
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedLead.id, 'interested')}
                    disabled={updating === selectedLead.id}
                    className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#dcfce7] px-4 py-2 text-sm font-bold text-[#166534] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:opacity-50"
                  >
                    {updating === selectedLead.id ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
                    Quan tâm
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedLead.id, 'not_interested')}
                    disabled={updating === selectedLead.id}
                    className="flex items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#fee2e2] px-4 py-2 text-sm font-bold text-[#991b1b] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515] disabled:opacity-50"
                  >
                    {updating === selectedLead.id ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                    Không quan tâm
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t-[2px] border-[#151515] bg-[#F5F5F0] px-5 py-4">
              <a
                href={`tel:${selectedLead.phone}`}
                className="flex h-11 items-center gap-2 rounded-xl border-[2px] border-[#151515] bg-[#059669] px-5 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#151515]"
              >
                <Phone className="size-4" />
                Gọi ngay
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
