'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Check, Loader2, Trash2, X } from 'lucide-react'
import { notificationApi, type Notification } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { user, ready } = useAuth()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const data = await notificationApi.getUnreadCount()
      setUnreadCount(data.count)
    } catch (err: any) {
      // Ignore 401 (invalid token) - just show 0 notifications
      if (err?.status === 401) {
        setUnreadCount(0)
        return
      }
      console.error('[NotificationBell] Unread count error:', err)
    }
  }, [user])

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await notificationApi.getAll({ limit: 10 })
      setNotifications(data.notifications || [])
    } catch (err: any) {
      // Ignore 401 (invalid token) - show empty list
      if (err?.status === 401) {
        setNotifications([])
        return
      }
      console.error('[NotificationBell] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch and polling
  useEffect(() => {
    // Wait for auth to be ready
    if (!ready) {
      setUnreadCount(0)
      setNotifications([])
      return
    }
    if (!user) {
      setUnreadCount(0)
      setNotifications([])
      return
    }

    fetchUnreadCount()

    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [user, ready, fetchUnreadCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await notificationApi.markAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (err) {
        console.error('[NotificationBell] Mark read error:', err)
      }
    }

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  // Mark all as read
  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('[NotificationBell] Mark all error:', err)
    } finally {
      setMarkingAll(false)
    }
  }

  // Delete notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await notificationApi.delete(id)
      const notification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('[NotificationBell] Delete error:', err)
    }
  }

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins}p`
    if (diffHours < 24) return `${diffHours}g`
    if (diffDays < 7) return `${diffDays}ng`
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  // Get icon by type
  const getIcon = (type: string) => {
    switch (type) {
      case 'tin': return '📢'
      case 'hen':
      case 'appointment': return '📅'
      case 'canhbao': return '⚠️'
      case 'system': return '🔔'
      case 'hopdong': return '📄'
      case 'coc': return '🔒'
      default: return '🔔'
    }
  }

  // Don't render bell until auth is ready
  if (!ready) return null
  if (!user) return null

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center justify-center rounded-lg p-2 transition-all',
          'border-2 border-transparent hover:border-[#151515]/20',
          'hover:bg-[#151515]/5'
        )}
        aria-label="Thông báo"
      >
        <Bell className="size-5 text-[#151515]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border-[2px] border-[#151515] bg-white shadow-[4px_4px_0_#151515]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#151515]/10 px-4 py-3">
            <h3 className="font-bold text-[#151515]">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {markingAll ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Đọc hết
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[#151515]/50 hover:bg-[#151515]/5 hover:text-[#151515]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="size-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-[#151515]/5">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'group relative cursor-pointer px-4 py-3 transition',
                      notification.read
                        ? 'hover:bg-[#151515]/5'
                        : 'bg-emerald-50/50 hover:bg-emerald-50'
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <span className="text-xl">{getIcon(notification.type)}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm',
                            notification.read ? 'font-medium text-[#151515]/70' : 'font-semibold text-[#151515]'
                          )}>
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                          {notification.body || notification.message}
                        </p>
                        {notification.link && (
                          <p className="mt-1 text-xs font-medium text-emerald-600">
                            Xem chi tiết →
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="absolute right-2 top-2 rounded-lg p-1 text-[#151515]/30 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        aria-label="Xóa"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="absolute left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#151515]/10 px-4 py-2">
            <button
              onClick={() => {
                setIsOpen(false)
                
                // Only navigate for known roles
                const role = user?.role?.toLowerCase()
                
                if (role === 'manager') {
                  router.push('/manager/notifications')
                } else if (role === 'seller') {
                  router.push('/seller/notifications')
                } else if (role === 'admin') {
                  router.push('/admin/notifications')
                } else if (role === 'tenant') {
                  router.push('/tai-khoan/thong-bao')
                }
                // Unknown role: do nothing (no default to tenant)
              }}
              className="w-full rounded-lg py-2 text-center text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
