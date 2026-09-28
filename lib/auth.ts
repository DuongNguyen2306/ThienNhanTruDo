export type Role = 'tenant' | 'seller' | 'manager' | 'admin'

export type SellerStatus = 'none' | 'pending' | 'active' | 'rejected'

export type SellerProfile = {
  idNumber: string
  brand?: string
  address: string
  docs: string[]
  submittedAt: string
  reviewedAt?: string
  reviewer?: string
  reviewNote?: string
}

export type SessionUser = {
  id: string
  role: Role
  fullName: string
  name: string
  email: string
  phone: string
  initials: string
  title: string
  /** Trạng thái nâng cấp Seller — luôn 'none' với manager/admin */
  sellerStatus: SellerStatus
  sellerProfile?: SellerProfile
  /** Ngày sinh (tuỳ chọn) */
  dob?: string
  /** Bật 2FA demo */
  twoFactor?: boolean
}

export type AccountRecord = {
  id: string
  role: Role
  fullName: string
  email: string
  phone: string
  password: string
  otp: string
  initials: string
  title: string
  sellerStatus: SellerStatus
  sellerProfile?: SellerProfile
  createdAt: string
  twoFactor?: boolean
}

export const SESSION_COOKIE = 'verirent_session'

/** Server-side demo accounts — reads from env vars for production safety.
 * Credentials are compiled-in for local dev; override via .env.local for staging. */
export const DEMO_ACCOUNTS: AccountRecord[] = [
  {
    id: 'u-tenant',
    role: 'tenant',
    fullName: 'Nguyễn Hà',
    name: 'Nguyễn Hà',
    email: process.env.DEMO_TENANT_EMAIL ?? 'ha.nguyen@email.vn',
    phone: process.env.DEMO_TENANT_PHONE ?? '0918 334 221',
    password: process.env.DEMO_TENANT_PASSWORD ?? 'tenant123',
    otp: process.env.DEMO_OTP ?? '123456',
    initials: 'NH',
    title: 'Người thuê (Tenant)',
    sellerStatus: 'none',
    createdAt: '2026-06-18',
  },
  {
    id: 'u-seller',
    role: 'seller',
    fullName: 'Trần Minh Anh',
    name: 'Minh Anh Realty',
    email: process.env.DEMO_SELLER_EMAIL ?? 'hello@minhanh.vn',
    phone: process.env.DEMO_SELLER_PHONE ?? '0903 112 334',
    password: process.env.DEMO_SELLER_PASSWORD ?? 'seller123',
    otp: process.env.DEMO_OTP ?? '123456',
    initials: 'MA',
    title: 'Chủ đăng tin (Seller)',
    sellerStatus: 'active',
    sellerProfile: {
      idNumber: '079204001111',
      brand: 'Minh Anh Realty',
      address: '24B Nguyễn Văn Hưởng, Thảo Điền, Thủ Đức, TP.HCM',
      docs: ['cccd-front.jpg', 'cccd-back.jpg', 'so-do-nha.pdf'],
      submittedAt: '2026-06-10',
      reviewedAt: '2026-06-12',
      reviewer: 'Mai Linh (Manager)',
    },
    createdAt: '2026-06-17',
  },
  {
    id: 'u-seller-pending',
    role: 'tenant',
    fullName: 'Phạm Vy',
    name: 'Phạm Vy',
    email: process.env.DEMO_SELLER_PENDING_EMAIL ?? 'vy.pham@email.vn',
    phone: process.env.DEMO_SELLER_PENDING_PHONE ?? '0938 445 110',
    password: process.env.DEMO_SELLER_PENDING_PASSWORD ?? 'pending123',
    otp: process.env.DEMO_OTP ?? '123456',
    initials: 'PV',
    title: 'Chủ đăng tin (đang chờ duyệt)',
    sellerStatus: 'pending',
    sellerProfile: {
      idNumber: '079201998765',
      brand: 'Vy HomeStay',
      address: '45 Nguyễn Hữu Thọ, Tân Phong, Quận 7, TP.HCM',
      docs: ['cccd-front.jpg', 'cccd-back.jpg'],
      submittedAt: '2026-09-26',
    },
    createdAt: '2026-09-26',
  },
  {
    id: 'u-manager',
    role: 'manager',
    fullName: 'Mai Linh',
    name: 'Mai Linh',
    email: process.env.DEMO_MANAGER_EMAIL ?? 'mai.linh@verirent.vn',
    phone: process.env.DEMO_MANAGER_PHONE ?? '0909 000 111',
    password: process.env.DEMO_MANAGER_PASSWORD ?? 'manager123',
    otp: process.env.DEMO_OTP ?? '123456',
    initials: 'ML',
    title: 'Ban quản lý (Manager)',
    sellerStatus: 'none',
    createdAt: '2026-06-16',
  },
  {
    id: 'u-admin',
    role: 'admin',
    fullName: 'Thảo Nguyễn',
    name: 'Thảo Nguyễn',
    email: process.env.DEMO_ADMIN_EMAIL ?? 'thao.nguyen@verirent.vn',
    phone: process.env.DEMO_ADMIN_PHONE ?? '0908 000 222',
    password: process.env.DEMO_ADMIN_PASSWORD ?? 'admin123',
    otp: process.env.DEMO_OTP ?? '123456',
    initials: 'TN',
    title: 'Quản trị viên (Admin)',
    sellerStatus: 'none',
    createdAt: '2026-01-01',
  },
]

export const DEMO_OTP = process.env.DEMO_OTP ?? '123456'

/** Map id -> public session */
export function toSession(acc: AccountRecord): SessionUser {
  const { fullName, name, email, phone, initials, title, role, sellerStatus, sellerProfile, twoFactor } = acc
  return { id: acc.id, role, fullName, name, email, phone, initials, title, sellerStatus, sellerProfile, twoFactor }
}

export function findAccountByPhone(phone: string): AccountRecord | undefined {
  return DEMO_ACCOUNTS.find((a) => a.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''))
}

export function findAccountByEmail(email: string): AccountRecord | undefined {
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
}

export function findAccountById(id: string): AccountRecord | undefined {
  return DEMO_ACCOUNTS.find((a) => a.id === id)
}

export function parseSession(raw: string | undefined | null): SessionUser | null {
  if (!raw) return null
  const value = (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })()
  const account = findAccountById(value)
  if (account) return toSession(account)
  try {
    const data = JSON.parse(value) as SessionUser
    if (!data?.role || !data?.id) return null
    return data
  } catch {
    return null
  }
}

/** Đường dẫn đích sau khi đăng nhập theo role */
export const ROLE_HOME: Record<Role, string> = {
  tenant: '/tai-khoan',
  seller: '/seller',
  manager: '/manager/approvals',
  admin: '/admin',
}

export const ROLE_PREFIX: Record<Role, string[]> = {
  tenant: ['/tai-khoan'],
  seller: ['/seller'],
  manager: ['/manager'],
  admin: ['/admin'],
}

/** Quyết định role yêu cầu cho một pathname (cho middleware) */
export function roleForPath(pathname: string): Role | null {
  if (pathname === '/tai-khoan' || pathname.startsWith('/tai-khoan/')) return 'tenant'
  if (pathname === '/seller' || pathname.startsWith('/seller/')) return 'seller'
  if (pathname === '/manager' || pathname.startsWith('/manager/')) return 'manager'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  return null
}

export type NavItem = { href: string; label: string; hint?: string }

export const GUEST_NAV: NavItem[] = [
  { href: '/tim-kiem', label: 'Tìm phòng' },
  { href: '/tin-dang', label: 'Đăng tin' },
  { href: '/ho-tro', label: 'Hỗ trợ' },
  { href: '/pricing', label: 'Bảng giá' },
  { href: '/ve-verirent', label: 'Giới thiệu' },
]

export const ROLE_NAV: Record<Role, NavItem[]> = {
  tenant: [
    { href: '/', label: 'Trang chủ' },
    { href: '/tim-kiem', label: 'Tìm phòng' },
    { href: '/tin-dang', label: 'Đăng tin' },
    { href: '/ho-tro', label: 'Hỗ trợ' },
    { href: '/pricing', label: 'Bảng giá' },
    { href: '/ve-verirent', label: 'Giới thiệu' },
  ],
  seller: [
    { href: '/seller', label: 'Tổng quan' },
    { href: '/seller/listings', label: 'Quản lý tin' },
    { href: '/seller/appointments', label: 'Lịch hẹn' },
    { href: '/seller/billing', label: 'Nạp tiền' },
    { href: '/', label: 'Xem trang công khai' },
  ],
  manager: [
    { href: '/manager/approvals', label: 'Duyệt tin', hint: '3' },
    { href: '/manager/seller-requests', label: 'Duyệt chủ nhà' },
    { href: '/manager/reports', label: 'Khiếu nại', hint: '5' },
    { href: '/', label: 'Xem trang công khai' },
  ],
  admin: [
    { href: '/admin', label: 'Điều hành' },
    { href: '/admin/users', label: 'Tài khoản' },
    { href: '/admin/finance', label: 'Tài chính' },
    { href: '/', label: 'Xem trang công khai' },
  ],
}

export const ROLE_BADGE: Record<Role, string> = {
  tenant: 'Cổng người thuê',
  seller: 'Cổng chủ trọ',
  manager: 'Cổng quản lý',
  admin: 'Cổng quản trị',
}

export const ROLE_LANDING: Record<Role, { title: string; description: string }> = {
  tenant: {
    title: 'Cổng người thuê',
    description: 'Tìm phòng đã kiểm định, đặt cọc an toàn, ký hợp đồng điện tử.',
  },
  seller: {
    title: 'Cổng chủ trọ',
    description: 'Đăng tin chuẩn hoá dữ liệu, quản lý khách hẹn, thanh toán VNPay-QR.',
  },
  manager: {
    title: 'Cổng quản lý',
    description: 'Thẩm định tin đăng, xử lý khiếu nại, cấp Verified Badge.',
  },
  admin: {
    title: 'Cổng quản trị',
    description: 'Giám sát nền tảng, phân quyền nhân sự, đối soát dòng tiền VNPay.',
  },
}
