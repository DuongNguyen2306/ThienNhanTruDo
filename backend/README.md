# Thiên Nhãn Backend API

Backend API cho ứng dụng **Thiên Nhãn Trú Đồ** - Nền tảng cho thuê phòng trọ.

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** SQLite (via Prisma ORM)
- **Auth:** JWT
- **Validation:** express-validator

## Setup

```bash
# 1. Di chuyển vào folder backend
cd backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo database và generate Prisma client
npm run db:push

# 4. Seed data demo
npm run db:seed

# 5. Chạy server
npm run dev
```

Server sẽ chạy tại **http://localhost:3001**

## Demo Accounts

| Role | Số điện thoại | Mật khẩu |
|------|---------------|----------|
| Tenant | `0918334221` | `tenant123` |
| Seller | `0903112334` | `seller123` |
| Manager | `0909000111` | `manager123` |
| Admin | `0908000222` | `admin123` |

**OTP:** `123456` (dùng chung)

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/register` | Đăng ký tài khoản mới |
| POST | `/login` | Đăng nhập bằng phone + password |
| POST | `/otp/send` | Gửi mã OTP |
| POST | `/otp/verify` | Xác thực OTP |
| GET | `/me` | Lấy thông tin user hiện tại |
| PUT | `/profile` | Cập nhật profile |
| PUT | `/password` | Đổi mật khẩu |
| POST | `/logout` | Đăng xuất |

### Listings (`/api/listings`)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/` | Tìm kiếm tin đăng (public) |
| GET | `/featured` | Tin nổi bật |
| GET | `/:id` | Chi tiết tin đăng |

**Query params cho GET /:**
- `page`, `limit` - Phân trang
- `roomType` - Loại phòng
- `minRent`, `maxRent` - Khoảng giá
- `minArea`, `maxArea` - Khoảng diện tích
- `district`, `ward` - Quận/phường
- `verified`, `vip`, `furniture`, `pets` - Bộ lọc
- `sortBy`, `sortOrder` - Sắp xếp

### Seller (`/api/seller`) - Yêu cầu đăng nhập + role: seller

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/dashboard` | Thống kê dashboard |
| GET | `/listings` | Danh sách tin đăng của tôi |
| POST | `/listings` | Tạo tin đăng mới |
| PUT | `/listings/:id` | Cập nhật tin đăng |
| DELETE | `/listings/:id` | Xóa tin đăng |
| GET | `/profile` | Xem hồ sơ seller |
| PUT | `/profile` | Cập nhật hồ sơ seller |
| GET | `/leads` | Danh sách lead |
| PUT | `/leads/:id` | Cập nhật lead |
| GET | `/appointments` | Danh sách lịch hẹn |
| PUT | `/appointments/:id` | Cập nhật lịch hẹn |

### Manager (`/api/manager`) - Yêu cầu role: manager hoặc admin

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/approvals` | Danh sách tin chờ duyệt |
| PUT | `/approvals/:id/approve` | Duyệt tin |
| PUT | `/approvals/:id/reject` | Từ chối tin |
| GET | `/seller-requests` | Yêu cầu nâng cấp seller |
| PUT | `/seller-requests/:id/approve` | Duyệt seller |
| PUT | `/seller-requests/:id/reject` | Từ chối seller |
| GET | `/reports` | Báo cáo từ tenant |
| PUT | `/reports/:id/resolve` | Xử lý báo cáo |
| GET | `/stats` | Thống kê |
| GET | `/audit` | Nhật ký hoạt động |

### Admin (`/api/admin`) - Yêu cầu role: admin

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/dashboard` | Dashboard tổng quan |
| GET | `/users` | Quản lý người dùng |
| PUT | `/users/:id/role` | Thay đổi vai trò |
| DELETE | `/users/:id` | Xóa người dùng |
| GET | `/listings` | Tất cả tin đăng |
| DELETE | `/listings/:id` | Xóa tin đăng |
| GET | `/transactions` | Lịch sử giao dịch |
| GET | `/config` | Lấy cấu hình hệ thống |
| PUT | `/config` | Cập nhật cấu hình |
| GET | `/audit` | Nhật ký hệ thống |

### Tenant (`/api/tenant`) - Yêu cầu đăng nhập

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/profile` | Xem profile |
| GET | `/saved` | Tin đã lưu |
| POST | `/saved/:listingId` | Lưu tin |
| DELETE | `/saved/:listingId` | Bỏ lưu tin |
| POST | `/appointments` | Đặt lịch hẹn |
| GET | `/appointments` | Lịch sử lịch hẹn |
| DELETE | `/appointments/:id` | Hủy lịch hẹn |
| POST | `/leads` | Gửi liên hệ cho seller |
| POST | `/reviews` | Đánh giá tin đăng |
| POST | `/reports` | Báo cáo tin đăng |

## Authentication

API sử dụng JWT Bearer Token:

```
Authorization: Bearer <token>
```

## Response Format

**Thành công:**
```json
{
  "message": "Thành công",
  "data": { ... }
}
```

**Lỗi:**
```json
{
  "error": "Mô tả lỗi"
}
```

## Environment Variables

| Variable | Mặc định | Mô tả |
|----------|----------|--------|
| `PORT` | 3001 | Port server |
| `NODE_ENV` | development | Môi trường |
| `JWT_SECRET` | (required) | Secret key cho JWT |
| `JWT_EXPIRES_IN` | 7d | Thời hạn token |
| `DATABASE_URL` | file:./dev.db | SQLite database path |
| `DEMO_OTP` | 123456 | Mã OTP demo |
| `FRONTEND_URL` | http://localhost:3000 | URL frontend (CORS) |
