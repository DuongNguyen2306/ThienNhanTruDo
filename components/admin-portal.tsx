'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { PieChart } from 'lucide-react'
import {
  BarChart3, Check, Download, FileCheck2, Landmark, Loader2, MoreHorizontal, Plus, ReceiptText,
  ShieldCheck, Users, WalletCards, X, ChevronLeft, ChevronRight, Eye, RefreshCw, TrendingUp, Clock, CheckCircle2,
  Settings, Bell, Lock, Plug, FileText, Building2, Palette, Save, RotateCcw, AlertCircle, BellOff, ScanSearch,
  Home, Clock3, AlertTriangle, Package, Trash2, User as UserIcon, KeyRound, ShieldAlert, Smartphone, Laptop, EyeOff, Camera, Landmark as LandmarkIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { PortalSidebar, PageHeader } from '@/components/portal-sidebar'
import { PortalShell } from '@/components/shells'
import { formatVnd } from '@/lib/data'
import { adminApi, notificationApi, authApi, type AdminDashboardStats, type Transaction, type AuditLog, type User as AdminUser, type Notification } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

const chartConfig = {
  inflow: { label: 'Doanh thu VNPay', color: 'var(--chart-2)' },
  refunds: { label: 'Hoàn tiền', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
      <PortalSidebar
        items={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/users', label: 'Quản lý user' },
          { href: '/admin/sellers', label: 'Quản lý Seller' },
          { href: '/admin/listings', label: 'Quản lý tin đăng' },
          { href: '/admin/account-proposals', label: 'Đề xuất xử lý', hint: 3 },
          { href: '/admin/finance', label: 'Báo cáo tài chính' },
          { href: '/admin/finance/transactions', label: 'Giao dịch' },
          { href: '/admin/audit', label: 'Nhật ký hệ thống' },
          { href: '/admin/config', label: 'Cấu hình hệ thống' },
          { href: '/admin/notifications', label: 'Thông báo' },
        ]}
        footer={
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Trạng thái hệ thống</p>
            <p className="mt-2 flex items-center gap-2 text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> API VNPay · Mọi dịch vụ ổn định</p>
            <p className="mt-1 flex items-center gap-2 text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> Map tile · 99,8% uptime</p>
            <p className="mt-1 flex items-center gap-2 text-amber-600"><span className="size-2 rounded-full bg-amber-500" /> OTP queue · đang xử lý</p>
          </div>
        }
      />
      <div>{children}</div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
        <p className="mt-2 text-xs font-medium text-emerald-600">{detail}</p>
      </CardContent>
    </Card>
  )
}

export function ExecutiveOverview() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard()
      .then(({ stats }) => setStats(stats))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const cashflowData = [
    { day: '01/09', inflow: 420, refunds: 14 },
    { day: '05/09', inflow: 510, refunds: 18 },
    { day: '09/09', inflow: 680, refunds: 22 },
    { day: '13/09', inflow: 760, refunds: 19 },
    { day: '17/09', inflow: 820, refunds: 25 },
    { day: '21/09', inflow: 940, refunds: 28 },
    { day: '25/09', inflow: 890, refunds: 16 },
    { day: '28/09', inflow: 1010, refunds: 21 },
  ]

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Vận hành"
        title="Dashboard điều hành"
        desc="Chỉ số nền tảng và dòng tiền từ cổng VNPay (gói tin, kiểm định, quảng cáo)."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Tổng user"
          value={loading ? '...' : stats?.totalUsers?.toLocaleString('vi-VN') ?? '-'}
          detail={loading ? '...' : `+${stats?.newUsersThisWeek ?? 0} user tuần này`}
        />
        <Metric
          label="Tin đang hoạt động"
          value={loading ? '...' : stats?.activeListings?.toLocaleString('vi-VN') ?? '-'}
          detail={loading ? '...' : `${Math.round((stats?.activeListings ?? 0) / (stats?.totalListings ?? 1) * 100)}% đã kiểm định`}
        />
        <Metric
          label="Tổng Seller"
          value={loading ? '...' : stats?.totalSellers?.toLocaleString('vi-VN') ?? '-'}
          detail={loading ? '...' : `${stats?.pendingListings ?? 0} tin chờ duyệt`}
        />
        <Metric
          label="Giao dịch"
          value={loading ? '...' : (stats?.totalTransactions ?? 0).toLocaleString('vi-VN')}
          detail={loading ? '...' : `Doanh thu: ${formatVnd(stats?.totalRevenue ?? 0)}`}
        />
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Biểu đồ dòng tiền</CardTitle>
              <CardDescription>Doanh thu theo ngày từ VNPay · tháng 09/2026</CardDescription>
            </div>
            <div className="flex gap-2 text-xs">
              {['Ngày', 'Tuần', 'Tháng', 'Quý'].map((x) => (
                <Badge key={x} variant="outline" className={x === 'Ngày' ? 'bg-slate-900 text-white' : ''}>{x}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart accessibilityLayer data={cashflowData} margin={{ left: -18, right: 8, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}tr`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="inflow" stroke="var(--color-inflow)" fill="var(--color-inflow)" fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="refunds" stroke="var(--color-refunds)" fill="var(--color-refunds)" fillOpacity={0.06} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </main>
  )
}

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    adminApi.getUsers({ search: search || undefined, role: filterRole || undefined })
      .then(({ users: data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, filterRole])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Đổi vai trò thành "${newRole}"?`)) return
    try {
      await adminApi.changeUserRole(userId, newRole)
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert('Không thể đổi vai trò')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Xóa người dùng này?')) return
    try {
      await adminApi.deleteUser(userId)
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      alert('Không thể xóa người dùng')
    }
  }

  const roleLabel: Record<string, string> = {
    tenant: 'Người thuê',
    seller: 'Chủ đăng tin',
    manager: 'Ban quản lý',
    admin: 'Quản trị viên',
  }

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Quản lý"
        title="Quản lý tài khoản"
        desc="Xem, phân quyền và khóa tài khoản người dùng."
      />
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email, SĐT..."
          className="h-10 max-w-xs"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="h-10 rounded-lg border px-3 text-sm"
        >
          <option value="">Tất cả vai trò</option>
          <option value="tenant">Người thuê</option>
          <option value="seller">Chủ đăng tin</option>
          <option value="manager">Ban quản lý</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </div>
      <Card className="rounded-2xl">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400">Đang tải...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">SĐT</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-center">Chi tiết</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <b>{u.fullName}</b>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{roleLabel[u.role] || u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-[#151515] bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
                      >
                        <Eye className="size-3.5" />
                        Xem
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="h-7 rounded border px-1 text-xs"
                        >
                          <option value="tenant">Người thuê</option>
                          <option value="seller">Chủ đăng tin</option>
                          <option value="manager">Ban quản lý</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(u.id)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Không có người dùng nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export function FinanceHub() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [exporting, setExporting] = useState(false)
  
  // Date range
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'month' | 'custom'>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Stats
  const [overview, setOverview] = useState<{
    totalRevenue: number
    periodRevenue: number
    completedCount: number
    totalRefunded: number
    netRevenue: number
    pendingCount: number
    transactionCount: number
  } | null>(null)
  
  // Chart
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('day')
  const [chartData, setChartData] = useState<Array<{ label: string; revenue: number; count: number }>>([])
  const [chartLoading, setChartLoading] = useState(true)
  
  // Sources
  const [sources, setSources] = useState<Array<{ type: string; total: number; count: number; percentage: number }>>([])

  // Calculate success rate
  const successRate = overview && overview.transactionCount > 0
    ? Math.round((overview.completedCount / overview.transactionCount) * 100)
    : 0

  // Mock growth rate (would need backend support for real comparison)
  const growthRate = 12.5 // Placeholder - would need previous period data

  // Fetch overview stats
  const fetchOverview = async () => {
    try {
      const data = await adminApi.getFinanceOverview()
      setOverview(data)
    } catch (e) {
      console.error('Failed to fetch overview:', e)
    }
  }

  // Fetch chart data
  const fetchChart = async () => {
    setChartLoading(true)
    try {
      const data = await adminApi.getFinanceChart({ period: chartPeriod })
      setChartData(data)
    } catch (e) {
      console.error('Failed to fetch chart:', e)
    } finally {
      setChartLoading(false)
    }
  }

  // Fetch sources
  const fetchSources = async () => {
    try {
      const data = await adminApi.getFinanceSources()
      setSources(data)
    } catch (e) {
      console.error('Failed to fetch sources:', e)
    }
  }

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getTransactions({
        search: query || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit: 20,
      })
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch (e: any) {
      console.error('Failed to fetch transactions:', e)
      setError('Không thể tải danh sách giao dịch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
    fetchChart()
    fetchSources()
  }, [])

  useEffect(() => {
    fetchChart()
  }, [chartPeriod])

  useEffect(() => {
    fetchTransactions()
  }, [query, statusFilter, typeFilter, page])

  const filtered = transactions.filter((t) =>
    query === '' ||
    t.id?.toLowerCase().includes(query.toLowerCase()) ||
    t.vnpayTxRef?.toLowerCase().includes(query.toLowerCase()) ||
    t.description?.toLowerCase().includes(query.toLowerCase())
  )

  // Format VND
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  // Format percentage
  const formatPercent = (value: number) => {
    return value.toFixed(1).replace('.', ',') + '%'
  }

  // Export Excel
  const exportExcel = async () => {
    setExporting(true)
    try {
      // Prepare data
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      
      const sheet1 = {
        title: 'Tổng quan tài chính',
        data: [
          ['BÁO CÁO TÀI CHÍNH'],
          ['Ngày tạo báo cáo:', new Date().toLocaleDateString('vi-VN')],
          ['Từ ngày:', startDate.toLocaleDateString('vi-VN')],
          ['Đến ngày:', new Date().toLocaleDateString('vi-VN')],
          [],
          ['CHỈ SỐ', 'GIÁ TRỊ'],
          ['Tổng doanh thu gộp', overview?.totalRevenue || 0],
          ['Số giao dịch thành công', overview?.completedCount || 0],
          ['Tổng hoàn tiền', overview?.totalRefunded || 0],
          ['Doanh thu thuần', overview?.netRevenue || 0],
          ['Giao dịch đang chờ', overview?.pendingCount || 0],
          ['Tổng giao dịch', overview?.transactionCount || 0],
        ]
      }
      
      const sheet2 = {
        title: 'Danh sách giao dịch',
        headers: ['Mã GD', 'Loại', 'Số tiền (VND)', 'Trạng thái', 'Mô tả', 'Ngày'],
        data: transactions.map(t => [
          t.id?.slice(-12).toUpperCase() || '',
          t.type || '',
          t.amount || 0,
          t.status || '',
          t.description || '',
          t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '',
        ])
      }
      
      // Create CSV content (simplified for browser)
      const csvContent = [
        ['BÁO CÁO TÀI CHÍNH'],
        ['Ngày tạo:', new Date().toLocaleDateString('vi-VN')],
        [],
        ['TỔNG QUAN'],
        ['Chỉ số', 'Giá trị'],
        ['Tổng doanh thu gộp', overview?.totalRevenue || 0],
        ['Số giao dịch thành công', overview?.completedCount || 0],
        ['Tổng hoàn tiền', overview?.totalRefunded || 0],
        ['Doanh thu thuần', overview?.netRevenue || 0],
        [],
        ['DANH SÁCH GIAO DỊCH'],
        ['Mã GD', 'Loại', 'Số tiền', 'Trạng thái', 'Mô tả', 'Ngày'],
        ...transactions.map(t => [
          t.id?.slice(-12).toUpperCase() || '',
          t.type || '',
          t.amount || 0,
          t.status || '',
          t.description || '',
          t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '',
        ])
      ].map(row => row.join(',')).join('\n')
      
      // Add BOM for UTF-8 Excel compatibility
      const BOM = '\ufeff'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thiennhan-finance-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert('Không thể xuất báo cáo')
    } finally {
      setExporting(false)
    }
  }

  // Status colors
  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'refunded': return 'bg-gray-100 text-gray-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Thành công'
      case 'pending': return 'Đang xử lý'
      case 'failed': return 'Thất bại'
      case 'refunded': return 'Đã hoàn tiền'
      default: return status
    }
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Báo cáo & phân tích tài chính</h1>
          <p className="mt-1 text-sm text-[#151515]/60">Theo dõi doanh thu và giao dịch từ cổng thanh toán VNPay</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex rounded-xl border-2 border-[#151515] bg-white shadow-[2px_2px_0_#151515] overflow-hidden">
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7d', label: '7 ngày' },
              { key: '30d', label: '30 ngày' },
              { key: 'month', label: 'Tháng này' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDateRange(opt.key as typeof dateRange)}
                className={`px-3 py-2 text-xs font-bold transition-all ${
                  dateRange === opt.key
                    ? 'bg-[#151515] text-white'
                    : 'text-[#151515] hover:bg-[#F5F5F0]'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-2 text-xs font-bold transition-all border-l-2 border-[#151515] ${
                dateRange === 'custom'
                  ? 'bg-[#151515] text-white'
                  : 'text-[#151515] hover:bg-[#F5F5F0]'
              }`}
            >
              Tùy chỉnh
            </button>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => { fetchOverview(); fetchChart(); fetchSources(); }}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          
          <Button 
            variant="outline" 
            className="bg-[#FDE047] border-2 border-[#151515] shadow-[2px_2px_0_#151515] hover:bg-[#f5e03c]"
            onClick={exportExcel}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Download className="size-4 mr-2" />
            )}
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-[#151515] bg-white p-4 shadow-[3px_3px_0_#151515]">
          <span className="text-sm font-medium text-[#151515]">Từ ngày:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="h-9 rounded-lg border-2 border-[#151515]/20 px-3 text-sm focus:border-[#FDE047] focus:outline-none"
          />
          <span className="text-sm font-medium text-[#151515]">Đến ngày:</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="h-9 rounded-lg border-2 border-[#151515]/20 px-3 text-sm focus:border-[#FDE047] focus:outline-none"
          />
        </div>
      )}

      {/* Stats Cards - 5 columns to match reference */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Doanh thu nền tảng</p>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {overview ? formatVnd(overview.netRevenue) : '...'}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-600">Doanh thu thuần</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-[#FDE047] shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Tổng giao dịch</p>
              <ReceiptText className="size-4 text-[#151515]/60" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {overview ? overview.transactionCount.toLocaleString('vi-VN') : '...'}
            </p>
            <p className="mt-2 text-xs font-medium text-[#151515]/60">
              {overview ? `${overview.completedCount} thành công` : 'Đang tải...'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Đang xử lý</p>
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-amber-600">
              {overview ? overview.pendingCount.toLocaleString('vi-VN') : '...'}
            </p>
            <p className="mt-2 text-xs font-medium text-amber-600">Chờ xác nhận</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Thành công</p>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-600">
              {overview ? overview.completedCount.toLocaleString('vi-VN') : '...'}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-600">
              {successRate > 0 ? `${successRate}% tỷ lệ thành công` : 'Đang tính...'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-emerald-50 shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Tăng trưởng</p>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-700">
              +{growthRate.toFixed(1).replace('.', ',')}%
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-600">So với kỳ trước</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Doanh thu theo thời gian</CardTitle>
                <CardDescription>Biểu đồ doanh thu từ giao dịch hoàn tất</CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                {(['day', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={chartPeriod === p ? 'default' : 'outline'}
                    onClick={() => setChartPeriod(p)}
                    className={chartPeriod === p ? 'bg-[#151515] text-white' : ''}
                  >
                    {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : p === 'quarter' ? 'Quý' : 'Năm'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex h-[250px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[#151515]/40" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[250px] flex-col items-center justify-center text-[#151515]/40">
                <BarChart3 className="size-12" />
                <p className="mt-2 text-sm">Chưa có dữ liệu doanh thu</p>
              </div>
            ) : (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={12} />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="rounded-lg border-2 border-[#151515] bg-white p-3 shadow-lg">
                            <p className="font-bold">{payload[0].payload.label}</p>
                            <p className="text-sm text-emerald-600">Doanh thu: {formatVnd(payload[0].value as number)}</p>
                            <p className="text-sm text-[#151515]/60">Số GD: {payload[0].payload.count}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="revenue" fill="#FDE047" stroke="#151515" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Sources */}
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          <CardHeader>
            <CardTitle>Doanh thu theo dịch vụ</CardTitle>
            <CardDescription>Tỷ trọng các nguồn thu nhập</CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center text-[#151515]/40">
                <PieChart className="size-12" />
                <p className="mt-2 text-sm">Chưa có dữ liệu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((s) => (
                  <div key={s.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{s.type}</span>
                      <span className="font-mono font-bold">{formatVnd(s.total)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F0]">
                      <div 
                        className="h-full rounded-full bg-[#FDE047] border border-[#151515]" 
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#151515]/50">
                      <span>{s.count} giao dịch</span>
                      <span>{s.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách giao dịch</CardTitle>
              <CardDescription>Tất cả giao dịch trên hệ thống</CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Tìm mã GD, mô tả..."
              className="h-9 max-w-xs border-2 border-[#151515]/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border-2 border-[#151515]/20 px-3 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="completed">Thành công</option>
              <option value="pending">Đang xử lý</option>
              <option value="failed">Thất bại</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border-2 border-[#151515]/20 px-3 text-sm"
            >
              <option value="">Tất cả loại</option>
              <option value="payment">Thanh toán</option>
              <option value="deposit">Nạp tiền</option>
              <option value="withdrawal">Rút tiền</option>
              <option value="refund">Hoàn tiền</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-[#151515]/40" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" onClick={fetchTransactions}>Thử lại</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-[#151515]/40">
              <ReceiptText className="size-12" />
              <p className="mt-2 text-sm">Không có giao dịch nào</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b-2 bg-[#F5F5F0]">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Mã GD</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Loại</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Số tiền</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Trạng thái</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Mô tả</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id} className="border-b border-[#151515]/10 last:border-0 hover:bg-[#FDE047]/5">
                        <td className="px-4 py-3 font-mono text-xs">{t.id?.slice(-12).toUpperCase()}</td>
                        <td className="px-4 py-3 capitalize">{t.type || '-'}</td>
                        <td className="px-4 py-3 font-mono font-bold">{formatVnd(t.amount || 0)}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusColor(t.status || '')}>
                            {statusLabel(t.status || '')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[#151515]/70">{t.description || '-'}</td>
                        <td className="px-4 py-3 text-[#151515]/50">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t-2 border-[#151515]/10 px-4 py-3">
                  <p className="text-sm text-[#151515]/50">
                    Trang {pagination.page} / {pagination.totalPages} · {pagination.total} giao dịch
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export function AuditHub() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Summary stats (calculated from real data)
  const [stats, setStats] = useState({
    total: 0,
    adminActions: 0,
    recentEvents: 0,
    failedActions: 0,
  })

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getAudit({
        action: actionFilter || undefined,
        targetType: roleFilter || undefined,
        page,
      })
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      
      // Calculate stats from real data
      const allLogs = data.logs || []
      setStats({
        total: data.pagination?.total || allLogs.length,
        adminActions: allLogs.filter(l => l.actor?.role === 'admin').length,
        recentEvents: allLogs.filter(l => {
          const logDate = new Date(l.createdAt)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return logDate > dayAgo
        }).length,
        failedActions: allLogs.filter(l => l.action?.toLowerCase().includes('fail') || l.details?.toLowerCase().includes('failed')).length,
      })
    } catch (e: any) {
      console.error('Failed to fetch audit logs:', e)
      setError('Không thể tải nhật ký hoạt động')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, roleFilter, statusFilter])

  const resetFilters = () => {
    setSearch('')
    setActionFilter('')
    setRoleFilter('')
    setStatusFilter('')
    setPage(1)
  }

  // Client-side search filter
  const filteredLogs = search
    ? logs.filter(log => 
        log.actor?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.target?.toLowerCase().includes(search.toLowerCase()) ||
        log.id?.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  // Status badge colors
  const getStatusBadge = (log: AuditLog) => {
    const isFailed = log.action?.toLowerCase().includes('fail') || log.details?.toLowerCase().includes('failed')
    const isSuccess = log.action?.toLowerCase().includes('success') || log.action?.toLowerCase().includes('completed')
    
    if (isFailed) {
      return <Badge className="bg-red-100 text-red-700 border-red-300">Thất bại</Badge>
    }
    if (isSuccess) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Thành công</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Bình thường</Badge>
  }

  // Action badge colors
  const getActionBadge = (action: string) => {
    const lower = action?.toLowerCase() || ''
    if (lower.includes('create') || lower.includes('add') || lower.includes('đăng')) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{action}</Badge>
    }
    if (lower.includes('update') || lower.includes('edit') || lower.includes('sửa')) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300">{action}</Badge>
    }
    if (lower.includes('delete') || lower.includes('remove') || lower.includes('xóa')) {
      return <Badge className="bg-red-100 text-red-700 border-red-300">{action}</Badge>
    }
    if (lower.includes('login') || lower.includes('đăng nhập')) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">{action}</Badge>
    }
    if (lower.includes('approve') || lower.includes('duyệt')) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">{action}</Badge>
    }
    if (lower.includes('reject') || lower.includes('từ chối')) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300">{action}</Badge>
    }
    return <Badge variant="outline">{action}</Badge>
  }

  const actionTypes = [
    { value: '', label: 'Tất cả hành động' },
    { value: 'login', label: 'Đăng nhập' },
    { value: 'create', label: 'Tạo mới' },
    { value: 'update', label: 'Cập nhật' },
    { value: 'delete', label: 'Xóa' },
    { value: 'approve', label: 'Phê duyệt' },
    { value: 'reject', label: 'Từ chối' },
  ]

  const roles = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'manager', label: 'Quản lý' },
    { value: 'seller', label: 'Người bán' },
    { value: 'tenant', label: 'Người thuê' },
  ]

  const statuses = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'success', label: 'Thành công' },
    { value: 'failed', label: 'Thất bại' },
  ]

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Nhật ký hoạt động hệ thống</h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Theo dõi và giám sát các thao tác trên hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/audit/retention"
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            <Settings className="size-4" />
            Cài đặt lưu trữ
          </Link>
          <button
            onClick={() => fetchLogs()}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Tổng sự kiện</p>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {loading ? '...' : stats.total.toLocaleString('vi-VN')}
            </p>
            <p className="mt-2 text-xs font-medium text-[#151515]/60">Tất cả nhật ký</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-[#FDE047] shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Hoạt động quản trị</p>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {loading ? '...' : stats.adminActions.toLocaleString('vi-VN')}
            </p>
            <p className="mt-2 text-xs font-medium text-[#151515]/60">Hành động admin</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Sự kiện gần đây</p>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-600">
              {loading ? '...' : stats.recentEvents.toLocaleString('vi-VN')}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-600">24 giờ qua</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Hoạt động thất bại</p>
            <p className="mt-2 font-mono text-2xl font-black text-red-600">
              {loading ? '...' : stats.failedActions.toLocaleString('vi-VN')}
            </p>
            <p className="mt-2 text-xs font-medium text-red-600">Cần kiểm tra</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Tìm kiếm nhật ký..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border-2 border-[#151515]/20 bg-white pl-10 focus:border-[#FDE047]"
              />
              <Eye className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#151515]/40" />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm focus:border-[#FDE047]"
            >
              {actionTypes.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm focus:border-[#FDE047]"
            >
              {roles.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border-2 border-[#151515]/20 bg-white px-3 text-sm focus:border-[#FDE047]"
            >
              {statuses.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              type="button"
              onClick={() => setPage(1)}
              className="h-10 bg-[#FDE047] text-[#151515] hover:bg-[#f5e03c]"
            >
              Tìm kiếm
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="h-10 border-2 border-[#151515] hover:bg-[#F5F5F0]"
            >
              Đặt lại
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#151515]/40" />
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-red-600">
              <AlertCircle className="size-6" />
              <p>{error}</p>
              <Button onClick={fetchLogs} variant="outline" className="mt-2">Thử lại</Button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-[#151515]/10 bg-[#F5F5F0]">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#151515]">Người thực hiện</th>
                  <th className="px-4 py-3 font-bold text-[#151515]">Hành động</th>
                  <th className="px-4 py-3 font-bold text-[#151515]">Đối tượng</th>
                  <th className="px-4 py-3 font-bold text-[#151515]">Trạng thái</th>
                  <th className="px-4 py-3 font-bold text-[#151515]">Thời gian</th>
                  <th className="px-4 py-3 font-bold text-[#151515]">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr 
                    key={log.id || idx} 
                    className="border-b border-[#151515]/10 last:border-0 hover:bg-[#F5F5F0]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-[#151515]">{log.actor?.fullName || 'Hệ thống'}</p>
                        <p className="text-xs text-[#151515]/50">{log.actor?.role || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getActionBadge(log.action || 'Không xác định')}
                    </td>
                    <td className="px-4 py-3 text-[#151515]/70">
                      <div>
                        <p>{log.target || '-'}</p>
                        <p className="text-xs text-[#151515]/40">{log.targetType || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log)}
                    </td>
                    <td className="px-4 py-3 text-[#151515]/70">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-[#151515]/20 px-3 py-1 text-xs font-medium hover:bg-[#F5F5F0] transition-colors"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-[#151515]/40">
                        <FileText className="size-12" />
                        <p className="font-medium">Không có nhật ký nào</p>
                        <p className="text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
        
        {/* Pagination */}
        {!loading && filteredLogs.length > 0 && (
          <div className="flex items-center justify-between border-t-2 border-[#151515]/10 px-4 py-3">
            <p className="text-sm text-[#151515]/60">
              Trang {pagination.page} / {pagination.totalPages || 1} • {pagination.total} kết quả
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="border-2 border-[#151515] hover:bg-[#F5F5F0]"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-3 text-sm font-medium">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={pagination.page >= (pagination.totalPages || 1)}
                className="border-2 border-[#151515] hover:bg-[#F5F5F0]"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-lg w-full rounded-xl border-2 border-[#151515] bg-white shadow-[6px_6px_0_#151515]">
            <CardHeader className="flex flex-row items-center justify-between border-b-2 border-[#151515]/10">
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Chi tiết nhật ký
              </CardTitle>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 hover:bg-[#F5F5F0] transition-colors"
              >
                <X className="size-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">ID sự kiện:</span>
                  <span className="font-mono text-sm font-medium">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Người thực hiện:</span>
                  <span className="font-medium">{selectedLog.actor?.fullName || 'Hệ thống'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Vai trò:</span>
                  <Badge variant="outline">{selectedLog.actor?.role || '-'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Hành động:</span>
                  {getActionBadge(selectedLog.action || 'Không xác định')}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Đối tượng:</span>
                  <span className="font-medium">{selectedLog.target || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Loại đối tượng:</span>
                  <span>{selectedLog.targetType || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Trạng thái:</span>
                  {getStatusBadge(selectedLog)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#151515]/60">Thời gian:</span>
                  <span>{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                {selectedLog.details && (
                  <div className="mt-4 rounded-lg border border-[#151515]/20 bg-[#F5F5F0] p-3">
                    <p className="mb-2 text-xs font-bold uppercase text-[#151515]/50">Chi tiết:</p>
                    <p className="whitespace-pre-wrap text-sm">{selectedLog.details}</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setSelectedLog(null)} 
                className="w-full bg-[#FDE047] text-[#151515] hover:bg-[#f5e03c]"
              >
                Đóng
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}

export function ConfigHub() {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'THIÊN NHÃN TRÚ ĐỒ',
    platformDescription: 'Nền tảng cho thuê phòng trọ hàng đầu',
    contactEmail: 'support@thiennhan.vn',
    contactPhone: '1900 1234',
    maintenanceMode: false,
  })
  
  // Listing settings state
  const [listingSettings, setListingSettings] = useState({
    maxListings: 10,
    listingDuration: 30,
    requireVerification: true,
    autoApprove: false,
    featuredLimit: 3,
  })
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    newUserRegistration: true,
    newListing: true,
    bookingConfirmation: true,
    paymentReceived: true,
    systemAlert: true,
    marketing: false,
  })

  const settingsNav = [
    { id: 'general', label: 'Cài đặt chung', icon: Building2 },
    { id: 'listing', label: 'Cấu hình tin đăng', icon: FileText },
    { id: 'policies', label: 'Chính sách nền tảng', icon: ShieldCheck },
    { id: 'notifications', label: 'Thông báo hệ thống', icon: Bell },
    { id: 'security', label: 'Bảo mật', icon: Lock },
    { id: 'integrations', label: 'Tích hợp dịch vụ', icon: Plug },
    { id: 'banking', label: 'Tài khoản ngân hàng', icon: Landmark },
  ]

  const handleSettingChange = (section: string, key: string, value: any) => {
    setHasChanges(true)
    if (section === 'general') {
      setGeneralSettings(prev => ({ ...prev, [key]: value }))
    } else if (section === 'listing') {
      setListingSettings(prev => ({ ...prev, [key]: value }))
    } else if (section === 'notifications') {
      setNotificationSettings(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate save - actual backend integration needed
    setTimeout(() => {
      setSaving(false)
      setHasChanges(false)
    }, 1000)
  }

  const handleReset = () => {
    setGeneralSettings({
      platformName: 'THIÊN NHÃN TRÚ ĐỒ',
      platformDescription: 'Nền tảng cho thuê phòng trọ hàng đầu',
      contactEmail: 'support@thiennhan.vn',
      contactPhone: '1900 1234',
      maintenanceMode: false,
    })
    setListingSettings({
      maxListings: 10,
      listingDuration: 30,
      requireVerification: true,
      autoApprove: false,
      featuredLimit: 3,
    })
    setNotificationSettings({
      newUserRegistration: true,
      newListing: true,
      bookingConfirmation: true,
      paymentReceived: true,
      systemAlert: true,
      marketing: false,
    })
    setHasChanges(false)
  }

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-black text-[#151515]">Cấu hình hệ thống</h1>
          <p className="mt-1 text-sm text-[#151515]/60">
            Quản lý cài đặt và tham số hoạt động của nền tảng
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
              <AlertCircle className="size-4" />
              Có thay đổi chưa lưu
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0] disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
            Đặt lại
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-[#FDE047] px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#f5e03c] disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Settings Navigation */}
        <div className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <div className="flex flex-col p-2">
            {settingsNav.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${
                    activeTab === item.id
                      ? 'bg-[#FDE047] text-[#151515]'
                      : 'text-[#151515]/60 hover:bg-[#F5F5F0]'
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  Cài đặt chung
                </CardTitle>
                <CardDescription>Cấu hình thông tin cơ bản của nền tảng</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Tên nền tảng</label>
                    <Input
                      value={generalSettings.platformName}
                      onChange={(e) => handleSettingChange('general', 'platformName', e.target.value)}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Email liên hệ</label>
                    <Input
                      type="email"
                      value={generalSettings.contactEmail}
                      onChange={(e) => handleSettingChange('general', 'contactEmail', e.target.value)}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Số điện thoại hỗ trợ</label>
                    <Input
                      value={generalSettings.contactPhone}
                      onChange={(e) => handleSettingChange('general', 'contactPhone', e.target.value)}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#151515]">Mô tả nền tảng</label>
                  <textarea
                    value={generalSettings.platformDescription}
                    onChange={(e) => handleSettingChange('general', 'platformDescription', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-2 border-[#151515]/20 bg-white px-4 py-3 font-medium focus:border-[#FDE047] focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4">
                  <div>
                    <p className="font-semibold text-[#151515]">Chế độ bảo trì</p>
                    <p className="text-sm text-[#151515]/60">Tắt nền tảng để bảo trì hệ thống</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('general', 'maintenanceMode', !generalSettings.maintenanceMode)}
                    className={`relative h-8 w-14 rounded-full transition-colors ${
                      generalSettings.maintenanceMode ? 'bg-red-500' : 'bg-[#151515]/20'
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${
                        generalSettings.maintenanceMode ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listing Settings */}
          {activeTab === 'listing' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  Cấu hình tin đăng
                </CardTitle>
                <CardDescription>Thiết lập quy tắc và giới hạn cho tin đăng</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Số tin đăng tối đa/người bán</label>
                    <Input
                      type="number"
                      value={listingSettings.maxListings}
                      onChange={(e) => handleSettingChange('listing', 'maxListings', parseInt(e.target.value))}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Thời hạn tin đăng (ngày)</label>
                    <Input
                      type="number"
                      value={listingSettings.listingDuration}
                      onChange={(e) => handleSettingChange('listing', 'listingDuration', parseInt(e.target.value))}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#151515]">Số tin nổi bật tối đa</label>
                    <Input
                      type="number"
                      value={listingSettings.featuredLimit}
                      onChange={(e) => handleSettingChange('listing', 'featuredLimit', parseInt(e.target.value))}
                      className="rounded-lg border-2 border-[#151515]/20 bg-white font-medium focus:border-[#FDE047]"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4">
                    <div>
                      <p className="font-semibold text-[#151515]">Yêu cầu xác thực</p>
                      <p className="text-sm text-[#151515]/60">Người bán phải xác thực trước khi đăng tin</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('listing', 'requireVerification', !listingSettings.requireVerification)}
                      className={`relative h-8 w-14 rounded-full transition-colors ${
                        listingSettings.requireVerification ? 'bg-emerald-500' : 'bg-[#151515]/20'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${
                          listingSettings.requireVerification ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4">
                    <div>
                      <p className="font-semibold text-[#151515]">Duyệt tự động</p>
                      <p className="text-sm text-[#151515]/60">Tin đăng được đăng ngay mà không cần duyệt</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('listing', 'autoApprove', !listingSettings.autoApprove)}
                      className={`relative h-8 w-14 rounded-full transition-colors ${
                        listingSettings.autoApprove ? 'bg-emerald-500' : 'bg-[#151515]/20'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${
                          listingSettings.autoApprove ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Policies */}
          {activeTab === 'policies' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" />
                  Chính sách nền tảng
                </CardTitle>
                <CardDescription>Cấu hình các quy định và chính sách của nền tảng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="rounded-lg border-2 border-[#151515]/20 p-4">
                  <p className="mb-2 font-semibold text-[#151515]">Chính sách đang được phát triển</p>
                  <p className="text-sm text-[#151515]/60">
                    Các cài đặt chính sách sẽ được cập nhật trong phiên bản tiếp theo.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="size-5" />
                  Thông báo hệ thống
                </CardTitle>
                <CardDescription>Cấu hình các thông báo trong ứng dụng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {[
                  { key: 'newUserRegistration', label: 'Đăng ký người dùng mới', desc: 'Thông báo khi có người dùng đăng ký mới' },
                  { key: 'newListing', label: 'Tin đăng mới', desc: 'Thông báo khi có tin đăng mới được tạo' },
                  { key: 'bookingConfirmation', label: 'Xác nhận đặt chỗ', desc: 'Thông báo khi có đặt chỗ được xác nhận' },
                  { key: 'paymentReceived', label: 'Thanh toán thành công', desc: 'Thông báo khi có khoản thanh toán được ghi nhận' },
                  { key: 'systemAlert', label: 'Cảnh báo hệ thống', desc: 'Thông báo về các sự cố hoặc bảo trì' },
                  { key: 'marketing', label: 'Tin nhắn tiếp thị', desc: 'Các thông báo khuyến mãi và tiếp thị' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4">
                    <div>
                      <p className="font-semibold text-[#151515]">{item.label}</p>
                      <p className="text-sm text-[#151515]/60">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('notifications', item.key, !notificationSettings[item.key as keyof typeof notificationSettings])}
                      className={`relative h-8 w-14 rounded-full transition-colors ${
                        notificationSettings[item.key as keyof typeof notificationSettings] ? 'bg-emerald-500' : 'bg-[#151515]/20'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${
                          notificationSettings[item.key as keyof typeof notificationSettings] ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Bảo mật
                </CardTitle>
                <CardDescription>Cấu hình bảo mật và quản lý phiên</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="rounded-lg border-2 border-[#151515]/20 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck className="size-5 text-emerald-600" />
                    <p className="font-semibold text-[#151515]">Xác thực hai yếu tố (2FA)</p>
                  </div>
                  <p className="text-sm text-[#151515]/60">
                    Bảo vệ tài khoản quản trị bằng xác thực hai yếu tố. Tính năng đang được phát triển.
                  </p>
                </div>
                <div className="rounded-lg border-2 border-[#151515]/20 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="size-5 text-amber-600" />
                    <p className="font-semibold text-[#151515]">Hết hạn phiên</p>
                  </div>
                  <p className="text-sm text-[#151515]/60">
                    Phiên đăng nhập hiện tại: 24 giờ. Tính năng thay đổi đang được phát triển.
                  </p>
                </div>
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">Bảo mật tài khoản</p>
                      <p className="mt-1 text-sm text-blue-700">
                        Các cài đặt bảo mật nâng cao đang được phát triển. Không lưu trữ mật khẩu hoặc 
                        khóa API ở đây vì lý do bảo mật.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <Plug className="size-5" />
                  Tích hợp dịch vụ
                </CardTitle>
                <CardDescription>Quản lý các dịch vụ tích hợp với nền tảng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <Link
                  href="/admin/config/integrations"
                  className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4 transition hover:bg-[#F5F5F0]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#151515] bg-white">
                      <Building2 className="size-6 text-[#151515]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#151515]">VNPay Gateway</p>
                      <p className="text-sm text-[#151515]/60">Cổng thanh toán trực tuyến</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-[#151515]/40" />
                </Link>
                <div className="rounded-lg border-2 border-[#151515]/20 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#151515]/20 bg-[#F5F5F0]">
                      <Settings className="size-6 text-[#151515]/40" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#151515]/60">Các tích hợp khác</p>
                      <p className="text-sm text-[#151515]/40">Đang được phát triển</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Banking Settings */}
          {activeTab === 'banking' && (
            <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
              <CardHeader className="border-b-2 border-[#151515]/10">
                <CardTitle className="flex items-center gap-2">
                  <LandmarkIcon className="size-5" />
                  Tài khoản ngân hàng
                </CardTitle>
                <CardDescription>Quản lý tài khoản nhận thanh toán chuyển khoản</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <Link
                  href="/admin/config/bank-accounts"
                  className="flex items-center justify-between rounded-lg border-2 border-[#151515]/20 p-4 transition hover:bg-[#F5F5F0]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#151515] bg-white">
                      <LandmarkIcon className="size-6 text-[#151515]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#151515]">Quản lý tài khoản</p>
                      <p className="text-sm text-[#151515]/60">Thêm, sửa tài khoản nhận thanh toán</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-[#151515]/40" />
                </Link>
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">Thanh toán chuyển khoản</p>
                      <p className="text-sm text-blue-700">
                        Người dùng có thể chọn thanh toán bằng chuyển khoản ngân hàng thay vì VNPay. 
                        Manager sẽ xác minh thủ công trước khi kích hoạt gói.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

// ===========================================
// ADMIN NOTIFICATION CENTER - UI-45
// ===========================================

export function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [markingAllLoading, setMarkingAllLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Summary stats
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    important: 0,
  })

  // Notification type icons
  const typeIcons: Record<string, React.ReactNode> = {
    tin: <Home className="size-5" />,
    hen: <Clock3 className="size-5" />,
    canhbao: <AlertTriangle className="size-5" />,
    system: <Bell className="size-5" />,
    hopdong: <FileText className="size-5" />,
    coc: <Package className="size-5" />,
  }

  // Notification type labels
  const typeLabels: Record<string, string> = {
    tin: 'Tin đăng',
    hen: 'Lịch hẹn',
    canhbao: 'Cảnh báo',
    system: 'Hệ thống',
    hopdong: 'Hợp đồng',
    coc: 'Đặt chỗ',
  }

  // Notification type colors
  const typeColors: Record<string, string> = {
    tin: 'bg-blue-100 text-blue-600 border-blue-200',
    hen: 'bg-purple-100 text-purple-600 border-purple-200',
    canhbao: 'bg-red-100 text-red-600 border-red-200',
    system: 'bg-slate-100 text-slate-600 border-slate-200',
    hopdong: 'bg-amber-100 text-amber-600 border-amber-200',
    coc: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  }

  // Fetch notifications
  const fetchNotifications = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params: { page: number; type?: string; unreadOnly?: boolean } = { page }
      if (activeTab === 'unread') {
        params.unreadOnly = true
      } else if (activeTab !== 'all') {
        params.type = activeTab
      }
      
      const data = await notificationApi.getAll(params) as {
        notifications: Notification[]
        unreadCount: number
        pagination: typeof pagination
      }
      setNotifications(data.notifications || [])
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      setUnreadCount(data.unreadCount || 0)
      
      // Calculate stats
      const allNotifications = data.notifications || []
      setStats({
        total: data.pagination?.total || allNotifications.length,
        unread: data.unreadCount || 0,
        read: (data.pagination?.total || allNotifications.length) - (data.unreadCount || 0),
        important: allNotifications.filter((n: Notification) => n.type === 'canhbao' || n.type === 'tin').length,
      })
    } catch (err: any) {
      console.error('Fetch notifications error:', err)
      setError('Không thể tải thông báo. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(pagination.page)
  }, [activeTab])

  // Filtered notifications based on search
  const filteredNotifications = searchQuery
    ? notifications.filter(n => 
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notifications

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Mark as read error:', err)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAllLoading(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Mark all as read error:', err)
    } finally {
      setMarkingAllLoading(false)
    }
  }

  // Delete notification
  const handleDelete = async (id: string, wasUnread: boolean) => {
    try {
      await notificationApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Delete notification error:', err)
    }
  }

  // Tab filters
  const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc', count: unreadCount },
    { key: 'tin', label: 'Tin đăng' },
    { key: 'system', label: 'Hệ thống' },
    { key: 'canhbao', label: 'Cảnh báo' },
  ]

  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#151515]/50">
          Khu vực quản trị
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#151515]">
              Trung tâm thông báo
            </h1>
            <p className="mt-1 text-sm text-[#151515]/60">
              Theo dõi các cập nhật và hoạt động quan trọng của hệ thống.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              <ScanSearch className="size-4" />
              Tìm kiếm
            </button>
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-white px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              <RefreshCw className="size-4" />
              Làm mới
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllLoading}
                className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#151515] bg-[#FDE047] px-4 text-sm font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition hover:bg-[#f5e03c] disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                {markingAllLoading ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards - Matching 45.jpg */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Tổng thông báo</p>
              <Bell className="size-4 text-[#151515]/40" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {loading ? '...' : stats.total.toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-[#FDE047] shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/60">Chưa đọc</p>
              <div className="flex size-6 items-center justify-center rounded-full bg-[#151515]">
                <span className="text-[10px] font-bold text-white">{stats.unread}</span>
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-[#151515]">
              {loading ? '...' : stats.unread.toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Đã đọc</p>
              <Check className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-emerald-600">
              {loading ? '...' : stats.read.toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#151515]/50">Quan trọng</p>
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-black text-red-600">
              {loading ? '...' : stats.important.toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
          <CardContent className="p-4">
            <div className="relative">
              <ScanSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#151515]/40" />
              <Input
                placeholder="Tìm kiếm thông báo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border-2 border-[#151515]/20 bg-white pl-10 focus:border-[#FDE047]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[#151515]/10 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'border-2 border-[#151515] bg-[#FDE047] text-[#151515] shadow-[2px_2px_0_#151515]'
                : 'border-2 border-[#151515]/20 bg-white text-[#151515]/60 hover:border-[#151515]/40'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border-2 border-[#151515] bg-white p-4">
              <div className="flex gap-4">
                <div className="size-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border-2 border-red-300 bg-red-50 p-6">
            <AlertTriangle className="size-12 text-red-500" />
            <p className="text-center text-sm text-red-600">{error}</p>
            <button
              onClick={() => fetchNotifications(pagination.page)}
              className="rounded-xl border-2 border-[#151515] bg-white px-4 py-2 text-sm font-semibold shadow-[2px_2px_0_#151515] transition hover:bg-[#F5F5F0]"
            >
              Thử lại
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-[#151515]/20 bg-white p-6">
            {activeTab === 'unread' ? (
              <>
                <CheckCircle2 className="size-12 text-emerald-500" />
                <p className="text-center font-semibold text-[#151515]">Tất cả thông báo đã được đọc!</p>
              </>
            ) : (
              <>
                <BellOff className="size-12 text-[#151515]/20" />
                <p className="text-center text-sm text-[#151515]/60">
                  {activeTab !== 'all' ? 'Không có thông báo phù hợp.' : 'Bạn chưa có thông báo nào.'}
                </p>
              </>
            )}
            {activeTab !== 'all' && (
              <button
                onClick={() => setActiveTab('all')}
                className="text-sm font-semibold text-emerald-600 underline"
              >
                Xem tất cả thông báo
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`group relative rounded-xl border-2 p-4 transition-all ${
                notification.read
                  ? 'border-[#151515]/10 bg-white hover:border-[#151515]/20'
                  : 'border-[#FDE047] bg-[#FDE047]/10 hover:border-[#FDE047]'
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${typeColors[notification.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {typeIcons[notification.type] || <Bell className="size-5" />}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="size-2 shrink-0 rounded-full bg-[#FDE047]" />
                        )}
                        <h3 className={`text-sm ${notification.read ? 'font-medium text-[#151515]/70' : 'font-bold text-[#151515]'}`}>
                          {notification.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-[#151515]/60">{notification.body}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-[#151515]/40">
                          {new Date(notification.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeColors[notification.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {typeLabels[notification.type] || notification.type}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/60 opacity-0 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id, !notification.read)}
                        className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 bg-white text-[#151515]/60 opacity-0 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && filteredNotifications.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border-2 border-[#151515] bg-white px-4 py-3">
          <p className="text-sm text-[#151515]/60">
            Trang {pagination.page} / {pagination.totalPages || 1} • {pagination.total} kết quả
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newPage = Math.max(1, pagination.page - 1)
                setPagination(prev => ({ ...prev, page: newPage }))
                fetchNotifications(newPage)
              }}
              disabled={pagination.page <= 1}
              className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 text-[#151515]/60 transition hover:bg-[#F5F5F0] disabled:opacity-50"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-3 text-sm font-medium">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => {
                const newPage = pagination.page + 1
                setPagination(prev => ({ ...prev, page: newPage }))
                fetchNotifications(newPage)
              }}
              disabled={pagination.page >= (pagination.totalPages || 1)}
              className="flex size-8 items-center justify-center rounded-lg border border-[#151515]/20 text-[#151515]/60 transition hover:bg-[#F5F5F0] disabled:opacity-50"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// ===========================================
// ADMIN PROFILE PAGE - UI-46
// ===========================================

export function AdminProfilePage() {
  const { user, updateAccount } = useAuth()
  const [saving, setSaving] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  
  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Sync with user data
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
    }
  }, [user])
  
  const hasProfileChanges = fullName !== (user?.fullName || '') || 
                           email !== (user?.email || '') || 
                           phone !== (user?.phone || '')
  
  // Handle profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasProfileChanges) return
    
    setProfileError(null)
    setProfileSuccess(false)
    setSaving(true)
    
    try {
      const result = await authApi.updateProfile({ fullName, email })
      updateAccount(user!.id, result.user)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err: any) {
      setProfileError(err.message || 'Không thể cập nhật hồ sơ')
    } finally {
      setSaving(false)
    }
  }
  
  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    
    // Client-side validation
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('Mật khẩu mới phải có ít nhất 1 chữ hoa')
      return
    }
    
    if (!/\d/.test(newPassword)) {
      setPasswordError('Mật khẩu mới phải có ít nhất 1 số')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp')
      return
    }
    
    setPasswordLoading(true)
    
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message || 'Không thể đổi mật khẩu')
    } finally {
      setPasswordLoading(false)
    }
  }
  
  // Role display
  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Manager',
    seller: 'Seller',
    tenant: 'Người thuê',
  }
  
  return (
    <main className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#151515]/50">
          Khu vực quản trị
        </p>
        <h1 className="text-2xl font-black text-[#151515]">
          Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-[#151515]/60">
          Quản lý thông tin tài khoản và bảo mật
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column - Profile Form */}
        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <CardHeader className="border-b-2 border-[#151515]/10">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="size-5 text-emerald-600" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>Cập nhật thông tin hồ sơ của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {profileSuccess && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">Cập nhật hồ sơ thành công!</p>
                </div>
              )}
              
              {profileError && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                  <AlertCircle className="size-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">{profileError}</p>
                </div>
              )}
              
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Họ và tên</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 focus:border-[#FDE047]"
                    placeholder="Nhập họ và tên"
                  />
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 focus:border-[#FDE047]"
                    placeholder="Nhập email"
                  />
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Số điện thoại</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 focus:border-[#FDE047]"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!hasProfileChanges || saving}
                    className="flex items-center gap-2 rounded-xl border-2 border-[#151515] bg-[#FDE047] px-6 py-2.5 text-sm font-bold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  
                  {hasProfileChanges && (
                    <button
                      type="button"
                      onClick={() => {
                        setFullName(user?.fullName || '')
                        setEmail(user?.email || '')
                        setPhone(user?.phone || '')
                        setProfileError(null)
                      }}
                      className="flex items-center gap-2 rounded-xl border-2 border-[#151515]/20 bg-white px-6 py-2.5 text-sm font-semibold text-[#151515]/60 transition hover:border-[#151515]/40"
                    >
                      <RotateCcw className="size-4" />
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Security Card */}
          <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <CardHeader className="border-b-2 border-[#151515]/10">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-emerald-600" />
                Bảo mật tài khoản
              </CardTitle>
              <CardDescription>Đổi mật khẩu để bảo vệ tài khoản</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">Đổi mật khẩu thành công!</p>
                </div>
              )}
              
              {passwordError && (
                <div className="flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                  <AlertCircle className="size-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">{passwordError}</p>
                </div>
              )}
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 pr-10 focus:border-[#FDE047]"
                      placeholder="Nhập mật khẩu hiện tại"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Mật khẩu mới</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 pr-10 focus:border-[#FDE047]"
                      placeholder="Ít nhất 8 ký tự, có chữ hoa và số"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#151515]">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2.5 pr-10 focus:border-[#FDE047]"
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#151515]/40 hover:text-[#151515]"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center gap-2 rounded-xl border-2 border-[#151515] bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-[2px_2px_0_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-none disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </CardContent>
          </Card>
          
          {/* Two-Factor Auth Card - Placeholder */}
          <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <CardHeader className="border-b-2 border-[#151515]/10">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Xác thực 2 yếu tố (2FA)
              </CardTitle>
              <CardDescription>Bảo vệ tài khoản với lớp bảo mật bổ sung</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-[#151515]/20 bg-[#F5F5F0] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#151515]/10">
                    <Smartphone className="size-5 text-[#151515]/60" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#151515]">2FA chưa được kích hoạt</p>
                    <p className="text-xs text-[#151515]/60">Tính năng đang được phát triển</p>
                  </div>
                </div>
                <button
                  disabled
                  className="rounded-xl border-2 border-[#151515]/20 bg-white px-4 py-2 text-sm font-semibold text-[#151515]/40 cursor-not-allowed"
                >
                  Kích hoạt 2FA
                </button>
              </div>
              <p className="mt-3 text-xs text-[#151515]/50">
                Liên hệ bộ phận hỗ trợ để được kích hoạt xác thực 2 yếu tố cho tài khoản.
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Profile Summary */}
        <div className="space-y-6">
          {/* Account Overview Card */}
          <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <CardHeader className="border-b-2 border-[#151515]/10 pb-4">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="size-5 text-emerald-600" />
                Tài khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-[#FDE047] text-2xl font-black text-[#151515]">
                  {user?.initials || user?.fullName?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <p className="mt-3 font-bold text-[#151515]">{user?.fullName || 'Admin'}</p>
                <p className="text-sm text-[#151515]/60">{user?.email || 'admin@verirent.vn'}</p>
              </div>
              
              {/* Account Info */}
              <div className="space-y-3 border-t-2 border-[#151515]/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#151515]/60">Vai trò</span>
                  <span className="rounded-full bg-[#FDE047] px-3 py-1 text-xs font-bold text-[#151515]">
                    {roleLabels[user?.role || 'admin'] || 'Quản trị viên'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#151515]/60">Trạng thái</span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">Hoạt động</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#151515]/60">ID tài khoản</span>
                  <span className="font-mono text-xs text-[#151515]/60">{user?.id?.slice(0, 8) || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Session Info Card */}
          <Card className="rounded-xl border-2 border-[#151515] bg-white shadow-[3px_3px_0_#151515]">
            <CardHeader className="border-b-2 border-[#151515]/10 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Laptop className="size-5 text-emerald-600" />
                Phiên đăng nhập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#151515]/5">
                  <Laptop className="size-5 text-[#151515]/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#151515]">Thiết bị hiện tại</p>
                  <p className="text-xs text-[#151515]/60">Đang hoạt động</p>
                </div>
              </div>
              <div className="rounded-xl border border-[#151515]/10 bg-[#F5F5F0] p-3">
                <p className="text-xs text-[#151515]/50">
                  <span className="font-semibold">Lưu ý:</span> Các tính năng theo dõi thiết bị và phiên đăng nhập đang được phát triển.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
