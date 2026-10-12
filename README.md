# Thiên Nhãn trú đồ — Tài Khoản Demo

> **⚠️ Lưu giữ riêng — không chia sẻ công khai**

## Link test

- **Production:** https://thiennhantudo.vercel.app
- **Preview:** https://vercel.com/DuongNguyen2306/ThienNhanTruDo/deployments

---

## Tài khoản đăng nhập

| Vai trò | Số điện thoại | Mật khẩu |
|---------|---------------|----------|
| Người thuê (Tenant) | `0918 334 221` | `tenant123` |
| Chủ đăng tin (Seller) | `0903 112 334` | `seller123` |
| Ban quản lý (Manager) | `0909 000 111` | `manager123` |
| Quản trị viên (Admin) | `0908 000 222` | `admin123` |

**OTP:** `123456` (dùng chung cho mọi tài khoản)

---

## Luồng test UI

### 1. Luồng đăng nhập (chung)

1. Truy cập **https://thiennhantudo.vercel.app/dang-nhap**
2. Chọn tab **"ĐT + Mật khẩu"**
3. Nhập số điện thoại + mật khẩu
4. Nhấn **Đăng nhập** → OTP `123456` → Xác nhận

---

### 2. Luồng Người thuê (Tenant)

**Tài khoản:** `0918 334 221` / `tenant123`

**Sau đăng nhập → `/profile`**

| STT | Hành động | URL/Path |
|-----|-----------|----------|
| 1 | Xem thông tin cá nhân | `/profile` |
| 2 | Cập nhật profile | `/profile/edit` |
| 3 | Xem danh sách phòng đã thuê | `/profile/rooms` |
| 4 | Xem lịch sử thanh toán | `/profile/payments` |

---

### 3. Luồng Chủ đăng tin (Seller)

**Tài khoản:** `0903 112 334` / `seller123`

**Sau đăng nhập → `/seller/dashboard`**

| STT | Hành động | URL/Path |
|-----|-----------|----------|
| 1 | Xem dashboard | `/seller/dashboard` |
| 2 | Tạo bài đăng mới | `/seller/post/create` |
| 3 | Quản lý bài đăng | `/seller/posts` |
| 4 | Xem tin nhắn | `/seller/messages` |

---

### 4. Luồng Ban quản lý (Manager)

**Tài khoản:** `0909 000 111` / `manager123`

**Sau đăng nhập → `/manager/approvals`**

| STT | Hành động | URL/Path |
|-----|-----------|----------|
| 1 | Duyệt bài đăng | `/manager/approvals` |
| 2 | Quản lý người dùng | `/manager/users` |
| 3 | Thống kê | `/manager/stats` |

---

### 5. Luồng Quản trị viên (Admin)

**Tài khoản:** `0908 000 222` / `admin123`

**Sau đăng nhập → `/admin/dashboard`**

| STT | Hành động | URL/Path |
|-----|-----------|----------|
| 1 | Dashboard quản trị | `/admin/dashboard` |
| 2 | Quản lý toàn bộ bài đăng | `/admin/posts` |
| 3 | Quản lý người dùng | `/admin/users` |
| 4 | Cài đặt hệ thống | `/admin/settings` |

---

### 6. Luồng bài đăng (cross-role)

1. **Seller** tạo bài đăng → `/seller/post/create`
2. **Manager** duyệt bài → `/manager/approvals`
3. **Bài được duyệt** hiển thị ở trang chủ `/`
4. **Tenant** xem và đăng ký thuê
