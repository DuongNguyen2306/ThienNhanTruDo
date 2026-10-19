'use client'

import { useState, useEffect, useCallback } from 'react'
import { BadgeCheck, Bell, Building2, CalendarClock, Loader2, Megaphone, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notificationApi, type Notification } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

const iconMap: Record<string, React.ElementType> = {
  tin: Megaphone,
  hen: CalendarClock,
  canhbao: ShieldAlert,
  system: Building2,
  hopdong: Building2,
  coc: Bell,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await notificationApi.getAll({ limit: 50 })
      setNotifications(data.notifications || [])
    } catch (err: any) {
      console.error('[Notifications] Fetch error:', err)
      setError(err.message || 'Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err: any) {
      console.error('[Notifications] Mark all error:', err)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleMarkOne = async (id: string) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (err: any) {
      console.error('[Notifications] Mark one error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err: any) {
      console.error('[Notifications] Delete error:', err)
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (tab === 'all') return true
    if (tab === 'unread') return !n.read
    return n.type === tab
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN')
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Bell className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem thông báo.</p>
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
        <Bell className="size-12 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchNotifications}
          className="rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_#151515] transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#151515]"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <>
      <Card className="mb-4 rounded-2xl border-slate-200">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-bold text-[#151515]">Cài đặt nhận thông báo</h3>
            <p className="text-xs text-slate-500">Chọn kênh nhận: email · push · Zalo · SMS.</p>
          </div>
          <div className="flex gap-2">
            {['Tin mới', 'Lịch hẹn', 'Cảnh báo', 'Điều khoản'].map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-xs cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-emerald-600" />
                {t}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">
            Chưa đọc
            {unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tin">Tin mới</TabsTrigger>
          <TabsTrigger value="hen">Lịch hẹn</TabsTrigger>
          <TabsTrigger value="canhbao">Cảnh báo</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-0 flex flex-col gap-3">
          <div className="flex justify-end">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleMarkAll}
              disabled={markingAll || unreadCount === 0}
            >
              <BadgeCheck className="mr-1 size-4" />
              {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
            </Button>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Bell className="size-12 text-slate-300" />
              <p className="text-sm text-slate-500">Không có thông báo nào.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const Icon = iconMap[n.type] || Bell
              return (
                <Card 
                  key={n.id} 
                  className={`rounded-2xl border ${n.read ? 'border-slate-200' : 'border-emerald-300 bg-emerald-50/40'}`}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <b className="text-[#151515]">{n.title}</b>
                        <span className="shrink-0 text-xs text-slate-400">{formatTime(n.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                      {n.link && (
                        <a 
                          href={n.link} 
                          className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          Xem chi tiết →
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {n.read ? (
                        <Button size="sm" variant="ghost" className="text-xs text-slate-400">
                          Đã đọc
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleMarkOne(n.id)}
                          className="text-xs text-emerald-600"
                        >
                          Đánh dấu đã đọc
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(n.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Xóa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
