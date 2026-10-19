import {
  BarChart3, CalendarClock, CalendarDays, Compass, FileSearch, Flag, Image as ImageIcon, KeyRound, ListChecks,
  MapPin, Megaphone, PackagePlus, ScanSearch, Settings2, ShieldCheck, UserPlus, Users2, WalletCards,
  Activity, Bot, Layers, History, Building2, FileWarning,
} from 'lucide-react'
import type { SidebarItem } from '@/components/portal-sidebar'

export const sellerNav: SidebarItem[] = [
  { href: '/seller', label: 'Tổng quan', icon: BarChart3 },
  { group: 'Tin đăng', href: '/seller/listings', label: 'Quản lý tin', icon: ListChecks, hint: '12' },
  { href: '/seller/appointments', label: 'Lịch hẹn xem phòng', icon: CalendarDays },
  { href: '/seller/listings/new', label: 'Tạo tin mới', icon: PackagePlus, badge: 'new' },
  { href: '/seller/listings/promotions', label: 'Lịch sử đẩy tin', icon: Megaphone },
  { group: 'Khách hàng', href: '/seller/leads', label: 'Leads & nhắn tin', icon: CalendarClock, hint: '4' },
  { href: '/seller/leads/templates', label: 'Mẫu tin nhắn', icon: Bot },
  { group: 'Tài chính', href: '/seller/billing', label: 'Ví & Giao dịch', icon: WalletCards },
  { href: '/seller/billing/packages', label: 'Gói dịch vụ', icon: PackagePlus },
  { group: 'Hồ sơ', href: '/seller/profile', label: 'Hồ sơ Seller', icon: Users2 },
  { href: '/seller/profile/verification', label: 'Xác minh danh tính', icon: KeyRound, badge: 'beta' },
]

export const managerNav: SidebarItem[] = [
  { href: '/manager', label: 'Tổng quan', icon: BarChart3 },
  { href: '/manager/accounts', label: 'Quản lý tài khoản', icon: Users2 },
  { href: '/manager/account-proposals', label: 'Đề xuất xử lý', icon: FileWarning },
  { href: '/manager/approvals', label: 'Duyệt tin đăng', icon: ScanSearch },
  { href: '/manager/seller-requests', label: 'Duyệt chủ trọ', icon: UserPlus },
  { href: '/manager/payment-reviews', label: 'Xác nhận thanh toán QR', icon: WalletCards },
  { href: '/manager/reports', label: 'Báo cáo vi phạm', icon: Flag },
  { href: '/manager/audit', label: 'Nhật ký hoạt động', icon: Activity },
  { group: 'Tài khoản', href: '/manager/profile', label: 'Hồ sơ & Bảo mật', icon: ShieldCheck },
]

export const adminNav: SidebarItem[] = [
  { href: '/admin', label: 'Điều hành', icon: Compass },
  { group: 'Vận hành', href: '/admin/users', label: 'Tài khoản & RBAC', icon: Users2 },
  { href: '/admin/managers', label: 'Quản lý Manager & vùng', icon: Building2 },
  { href: '/admin/sellers', label: 'Duyệt nâng quyền Seller', icon: UserPlus },
  { href: '/admin/account-proposals', label: 'Đề xuất xử lý', icon: FileWarning },
  { group: 'Tài chính', href: '/admin/finance', label: 'Dòng tiền VNPay', icon: WalletCards },
  { href: '/admin/finance/disputes', label: 'Tranh chấp hoàn tiền', icon: FileSearch, badge: 'beta' },
  { group: 'Hệ thống', href: '/admin/config', label: 'Cấu hình', icon: Settings2 },
  { group: 'Minh bạch', href: '/admin/audit', label: 'Nhật ký hoạt động', icon: History },
  { href: '/admin/audit/retention', label: 'Chính sách lưu trữ', icon: ImageIcon },
]
