'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Phone, Search, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PortalShell } from '@/components/shells'

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

interface Appointment {
  id: string
  tenantName: string
  tenantPhone: string
  listingTitle: string
  listingAddress: string
  date: string
  time: string
  status: AppointmentStatus
  note?: string
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    tenantName: 'Nguyễn Văn A',
    tenantPhone: '0901 234 567',
    listingTitle: 'Phòng trọ cao cấp Quận 1',
    listingAddress: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    date: '2026-09-30',
    time: '10:00',
    status: 'pending',
    note: 'Muốn xem phòng vào buổi sáng',
  },
  {
    id: '2',
    tenantName: 'Trần Thị B',
    tenantPhone: '0902 345 678',
    listingTitle: 'Căn hộ mini Thảo Điền',
    listingAddress: '45 Võ Văn Kiệt, Thủ Đức, TP.HCM',
    date: '2026-09-30',
    time: '14:00',
    status: 'confirmed',
    note: 'Khách đã xác nhận',
  },
  {
    id: '3',
    tenantName: 'Lê Văn C',
    tenantPhone: '0903 456 789',
    listingTitle: 'Studio Q7 gần trung tâm',
    listingAddress: '78 Lê Văn Lợi, Quận 7, TP.HCM',
    date: '2026-09-29',
    time: '09:00',
    status: 'completed',
  },
  {
    id: '4',
    tenantName: 'Phạm Thị D',
    tenantPhone: '0904 567 890',
    listingTitle: 'Phòng trọ sinh viên Bình Thạnh',
    listingAddress: '56 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    date: '2026-09-28',
    time: '11:00',
    status: 'cancelled',
    note: 'Khách hủy lịch',
  },
]

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Hoàn thành', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-800' },
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.listingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.tenantPhone.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleConfirm = (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'confirmed' as AppointmentStatus } : apt))
    )
  }

  const handleCancel = (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'cancelled' as AppointmentStatus } : apt))
    )
  }

  const handleComplete = (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: 'completed' as AppointmentStatus } : apt))
    )
  }

  return (
    <PortalShell allow="seller">
      <main className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Lịch hẹn xem phòng</h1>
            <p className="mt-1 text-slate-500">Quản lý các lịch hẹn xem phòng từ người thuê</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm kiếm theo tên, phòng, số điện thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'Tất cả' : STATUS_CONFIG[status].label}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Tổng lịch hẹn</p>
                <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Chờ xác nhận</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {appointments.filter((a) => a.status === 'pending').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Đã xác nhận</p>
                <p className="text-2xl font-bold text-blue-600">
                  {appointments.filter((a) => a.status === 'confirmed').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">
                  {appointments.filter((a) => a.status === 'completed').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Calendar className="mb-3 size-12 text-slate-300" />
                  <p>Không có lịch hẹn nào</p>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((apt) => (
                <Card key={apt.id} className="overflow-hidden">
                  <CardHeader className="border-b bg-slate-50 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{apt.listingTitle}</CardTitle>
                        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="size-3" />
                          {apt.listingAddress}
                        </div>
                      </div>
                      <Badge className={STATUS_CONFIG[apt.status].className}>
                        {STATUS_CONFIG[apt.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="size-4 text-slate-400" />
                          <span className="font-medium">{apt.tenantName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="size-4 text-slate-400" />
                          {apt.tenantPhone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="size-4 text-slate-400" />
                          {new Date(apt.date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="size-4 text-slate-400" />
                          {apt.time}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {apt.note && (
                          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                            <p className="font-medium text-slate-700">Ghi chú:</p>
                            <p>{apt.note}</p>
                          </div>
                        )}
                        {apt.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleConfirm(apt.id)}
                            >
                              Xác nhận
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleCancel(apt.id)}
                            >
                              <X className="mr-1 size-3" />
                              Hủy
                            </Button>
                          </div>
                        )}
                        {apt.status === 'confirmed' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleComplete(apt.id)}
                            >
                              Hoàn thành
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleCancel(apt.id)}
                            >
                              <X className="mr-1 size-3" />
                              Hủy
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </PortalShell>
  )
}
