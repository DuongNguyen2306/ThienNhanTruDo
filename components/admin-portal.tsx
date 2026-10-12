'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  BarChart3, Check, Download, FileCheck2, Landmark, MoreHorizontal, Plus, ReceiptText,
  ShieldCheck, Users, WalletCards, X,
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
import { adminApi, type AdminDashboardStats, type Transaction, type AuditLog, type User } from '@/lib/api'

const chartConfig = {
  inflow: { label: 'Doanh thu VNPay', color: 'var(--chart-2)' },
  refunds: { label: 'Hoàn tiền', color: 'var(--chart-4)' },
} satisfies ChartConfig

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell allow="admin">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <PortalSidebar
          items={[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/users', label: 'Quản lý user' },
            { href: '/admin/finance', label: 'Dòng tiền' },
            { href: '/admin/audit', label: 'Nhật ký hệ thống' },
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
    </PortalShell>
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
    <AdminLayout>
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
    </AdminLayout>
  )
}

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
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
    <AdminLayout>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Không có người dùng nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  )
}

export function FinanceHub() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    adminApi.getTransactions()
      .then(({ transactions: data }) => setTransactions(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = transactions.filter((t) =>
    query === '' ||
    t.vnpayTxRef?.includes(query) ||
    t.description?.toLowerCase().includes(query.toLowerCase())
  )

  const totalAmount = filtered.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
  const successRate = transactions.length > 0
    ? Math.round(filtered.filter(t => t.status === 'completed').length / filtered.length * 100)
    : 0

  const exportCsv = () => {
    const header = 'Mã hệ thống,Mã VNPay,Mô tả,Số tiền,Phương thức,Trạng thái,Ngày\n'
    const body = filtered.map((t) =>
      `${t.id},${t.vnpayTxRef || ''},${t.description || ''},${t.amount},${t.method || ''},${t.status},${new Date(t.createdAt).toLocaleDateString('vi-VN')}`
    ).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thiennhan-finance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold">Quản lý dòng tiền & đối soát VNPay</h1>
            <p className="mt-2 text-sm text-slate-500">Mã hệ thống, mã VNPay, số tiền, thời gian, trạng thái.</p>
          </div>
          <Button variant="outline" className="bg-white" onClick={exportCsv}><Download data-icon="inline-start" /> Xuất CSV</Button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tổng GMV" value={formatVnd(totalAmount)} detail={`${filtered.length} giao dịch`} />
          <Metric label="Giao dịch" value={filtered.length.toString()} detail={`${successRate}% thành công`} />
          <Metric label="Đang xử lý" value={filtered.filter(t => t.status === 'pending').length.toString()} detail="Chờ thanh toán" />
          <Metric label="Thất bại" value={filtered.filter(t => t.status === 'failed').length.toString()} detail="Cần hoàn tiền" />
        </div>
        <div className="mb-4 flex gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã GD..." className="h-10 max-w-xs" />
        </div>
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Đang tải...</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Mã hệ thống</th>
                    <th className="px-4 py-3">Mã VNPay</th>
                    <th className="px-4 py-3">Mô tả</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Phương thức</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{t.id.slice(0, 12)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.vnpayTxRef || '-'}</td>
                      <td className="px-4 py-3">{t.description || t.type}</td>
                      <td className="px-4 py-3 font-mono">{formatVnd(t.amount)}</td>
                      <td className="px-4 py-3">{t.method === 'vnpay' ? 'VNPay' : t.method || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }
                        >
                          {t.status === 'completed' ? 'Thành công' :
                           t.status === 'pending' ? 'Đang xử lý' :
                           t.status === 'failed' ? 'Thất bại' : t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Không có giao dịch nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  )
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAudit()
      .then(({ logs: data }) => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <main className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Hệ thống"
          title="Nhật ký hoạt động"
          desc="Lịch sử các thao tác trên hệ thống."
        />
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400">Đang tải...</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Người thực hiện</th>
                    <th className="px-4 py-3">Hành động</th>
                    <th className="px-4 py-3">Đối tượng</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{log.actor?.fullName || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{log.target || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{log.targetType || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Không có nhật ký nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </AdminLayout>
  )
}
