import {
  BarChart3, CalendarClock, Compass, FileSearch, Flag, Image as ImageIcon, KeyRound, ListChecks,
  MapPin, Megaphone, PackagePlus, ScanSearch, Settings2, ShieldCheck, UserPlus, Users2, WalletCards,
  Activity, Bot, Layers, History, Building2,
} from 'lucide-react'
import type { SidebarItem } from '@/components/portal-sidebar'

export const sellerNav: SidebarItem[] = [
  { href: '/seller', label: 'Tổng quan', icon: BarChart3 },
  { group: 'Tin đăng', href: '/seller/listings', label: 'Quản lý tin', icon: ListChecks, hint: '12' },
  { href: '/seller/listings/new', label: 'Tạo tin mới', icon: PackagePlus, badge: 'new' },
  { href: '/seller/listings/promotions', label: 'Lịch sử đẩy tin', icon: Megaphone },
  { group: 'Khách hàng', href: '/seller/leads', label: 'Leads & nhắn tin', icon: CalendarClock, hint: '4' },
  { href: '/seller/leads/templates', label: 'Mẫu tin nhắn', icon: Bot },
  { group: 'Tài chính', href: '/seller/billing', label: 'Nạp tiền & gói', icon: WalletCards },
  { group: 'Hồ sơ', href: '/seller/profile', label: 'Hồ sơ Seller', icon: Users2 },
  { href: '/seller/profile/verification', label: 'Xác minh danh tính', icon: KeyRound, badge: 'beta' },
]

export const managerNav: SidebarItem[] = [
  { href: '/manager/approvals', label: 'Hàng đợi duyệt', icon: ListChecks, hint: 3 },
  { group: 'Thẩm định', href: '/manager/approvals', label: 'Workspace duyệt tin', icon: ScanSearch },
  { href: '/manager/seller-requests', label: 'Nâng quyền Seller', icon: UserPlus },
  { href: '/manager/verifications', label: 'Lịch sử cấp Verified', icon: ShieldCheck },
  { href: '/manager/field-visits', label: 'Lịch đi kiểm định', icon: MapPin },
  { group: 'Vận hành', href: '/manager/reports', label: 'Khiếu nại', icon: Flag, hint: 5 },
  { href: '/manager/areas', label: 'Phân vùng phụ trách', icon: Layers },
  { group: 'Minh bạch', href: '/manager/audit', label: 'Audit của Manager', icon: Activity },
]

export const adminNav: SidebarItem[] = [
  { href: '/admin', label: 'Điều hành', icon: Compass },
  { group: 'Vận hành', href: '/admin/users', label: 'Tài khoản & RBAC', icon: Users2 },
  { href: '/admin/managers', label: 'Quản lý Manager & vùng', icon: Building2 },
  { href: '/admin/sellers', label: 'Duyệt nâng quyền Seller', icon: UserPlus },
  { group: 'Tài chính', href: '/admin/finance', label: 'Dòng tiền VNPay', icon: WalletCards },
  { href: '/admin/finance/disputes', label: 'Tranh chấp hoàn tiền', icon: FileSearch, badge: 'beta' },
  { group: 'Hệ thống', href: '/admin/config', label: 'Cấu hình', icon: Settings2 },
  { group: 'Minh bạch', href: '/admin/audit', label: 'Nhật ký hoạt động', icon: History },
  { href: '/admin/audit/retention', label: 'Chính sách lưu trữ', icon: ImageIcon },
]
