# Thiên Nhãn trú đồ — Tài Khoản Demo

> **⚠️ Lưu giữ riêng — không chia sẻ công khai**

## Tài khoản đăng nhập

### Người thuê (Tenant)
| Trường | Giá trị |
|---|---|
| Số điện thoại | `0918 334 221` |
| Mật khẩu | `tenant123` |

### Chủ đăng tin (Seller)
| Trường | Giá trị |
|---|---|
| Số điện thoại | `0903 112 334` |
| Mật khẩu | `seller123` |

### Ban quản lý (Manager)
| Trường | Giá trị |
|---|---|
| Số điện thoại | `0909 000 111` |
| Mật khẩu | `manager123` |

### Quản trị viên (Admin)
| Trường | Giá trị |
|---|---|
| Số điện thoại | `0908 000 222` |
| Mật khẩu | `admin123` |

---

## OTP (đăng nhập bằng SMS)
- Mã OTP: `123456` (dùng cho mọi tài khoản trong môi trường demo)

---

## Cách đăng nhập

1. Truy cập **http://localhost:3000/dang-nhap**
2. Chọn tab **ĐT + Mật khẩu**
3. Nhập số điện thoại và mật khẩu ở bảng trên
4. Nhấn **Đăng nhập**

---

## Thông tin thêm

- Sau khi đăng nhập, hệ thống tự chuyển vào đúng cổng theo vai trò:
  - **Tenant** → `/profile`
  - **Seller** → `/seller/dashboard`
  - **Manager** → `/manager/approvals`
  - **Admin** → `/admin/dashboard`
