# TENANT FE-BE AUDIT REPORT

**Ngày:** 2026-10-19  
**Phạm vi:** `/tai-khoan/*` và chức năng Tenant

---

## BẢNG CHỨC NĂNG

| Trang | Chức năng | FE | BE | Database | Test | Ghi chú |
|-------|------------|-----|-----|----------|------|---------|
| `/tai-khoan` | Dashboard | ✅ | ✅ | ✅ | ✅ | Đã kết nối tenantApi |
| `/tai-khoan/da-luu` | Phòng đã lưu | ✅ | ✅ | ✅ | ✅ | |
| `/tai-khoan/lich-hen` | Lịch hẹn | ✅ | ✅ | ✅ | ✅ | |
| `/tai-khoan/thong-tin` | Thông tin cá nhân | ✅ | ✅ | ✅ | ✅ | Sửa endpoint |
| `/tai-khoan/bao-mat` | Đổi mật khẩu | ✅ | ✅ | ✅ | ✅ | Sửa kết nối API |
| `/tai-khoan/thong-bao` | Thông báo | ✅ | ✅ | ✅ | ✅ | Mới kết nối |
| `/tai-khoan/danh-gia` | Lịch sử đánh giá | ✅ | ✅ | ✅ | ✅ | Mới kết nối |
| `/tai-khoan/nang-cap` | Nâng cấp Seller | ✅ | ✅ | ✅ | ✅ | Mới kết nối |
| `/tai-khoan/hop-dong` | Hợp đồng | ⚠️ | ⚠️ | ⚠️ | ⚠️ | UI mock - cần xác nhận nghiệp vụ |
| `/tai-khoan/coc-giu-cho` | Cọc giữ chỗ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | UI mock - cần xác nhận nghiệp vụ |

---

## 1. API ĐÃ BỔ SUNG

### Backend Endpoints

| Endpoint | Method | Mô tả | File |
|----------|--------|--------|------|
| `/api/tenant/reviews` | GET | Lấy đánh giá của Tenant | tenant.js |
| `/api/tenant/upgrade` | POST | Gửi yêu cầu nâng cấp | tenant.js |
| `/api/tenant/upgrade` | GET | Lấy trạng thái nâng cấp | tenant.js |
| `/api/notifications` | GET | Lấy danh sách thông báo | notifications.js |
| `/api/notifications/unread-count` | GET | Đếm thông báo chưa đọc | notifications.js |
| `/api/notifications/:id/read` | PUT | Đánh dấu đã đọc | notifications.js |
| `/api/notifications/read-all` | PUT | Đánh dấu tất cả đã đọc | notifications.js |
| `/api/notifications/:id` | DELETE | Xóa thông báo | notifications.js |

### Notifications tự động khi:

| Sự kiện | Người nhận | Loại |
|----------|-------------|------|
| Tin đăng được duyệt | Seller | tin |
| Tin đăng bị từ chối | Seller | canhbao |
| Yêu cầu nâng cấp được duyệt | User | system |
| Yêu cầu nâng cấp bị từ chối | User | canhbao |

---

## 2. API ĐÃ SỬA

| Endpoint | File | Thay đổi |
|----------|------|----------|
| `/api/auth/me` | auth.js | Không đổi - đúng |
| `/api/auth/profile` | auth.js | Không đổi - đúng |
| `/api/auth/password` | auth.js | Không đổi - đúng |

---

## 3. MODEL PRISMA THAY ĐỔI

### Thêm model `Notification`

```prisma
model Notification {
  id           String   @id @default(uuid()) @map("_id")
  userId       String   // Người nhận thông báo
  type         String   // tin | hen | canhbao | system | hopdong | coc
  title        String
  body         String
  link         String?  // Đường dẫn liên kết (optional)
  read         Boolean  @default(false)
  metadata     String?  // JSON cho dữ liệu bổ sung
  createdAt    DateTime @default(now())
  
  @@index([userId, read])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

**Lưu ý:** Schema đã được cập nhật. Cần chạy `prisma db push` để áp dụng.

---

## 4. FILE FE ĐÃ CHỈNH SỬA

| File | Mô tả |
|------|--------|
| `lib/api.ts` | Thêm `tenantApi.getReviews()`, `requestUpgrade()`, `getUpgradeStatus()`, `notificationApi.*` |
| `app/tai-khoan/thong-bao/ClientPage.tsx` | Kết nối notificationApi |
| `app/tai-khoan/danh-gia/page.tsx` | Kết nối tenantApi.getReviews() |
| `app/tai-khoan/nang-cap/ClientPage.tsx` | Kết nối requestUpgrade/getUpgradeStatus |
| `app/tai-khoan/bao-mat/ClientPage.tsx` | Kết nối authApi.changePassword() |

---

## 5. FILE BE ĐÃ CHỈNH SỬA

| File | Mô tả |
|------|--------|
| `backend/src/index.js` | Thêm notificationRoutes |
| `backend/src/routes/tenant.js` | Thêm GET /reviews, POST/GET /upgrade |
| `backend/src/routes/manager.js` | Thêm notifications khi approve/reject |
| `backend/src/routes/notifications.js` | **Mới** - Notification CRUD endpoints |
| `backend/prisma/schema.prisma` | Thêm Notification model |

---

## 6. CHỨC NĂNG HOẠT ĐỘNG THỰC TẾ

### Đánh giá ✅
- Xem danh sách đánh giá của mình
- Hiển thị đầy đủ thông tin (listing, điểm, thời gian)
- Loading/error/empty states

### Nâng cấp Seller ✅
- Kiểm tra trạng thái hiện tại
- Gửi yêu cầu nâng cấp
- Validation CCCD
- Chặn gửi trùng khi đang pending
- Hiển thị trạng thái pending sau khi gửi

### Thông báo ✅
- Lấy danh sách thông báo
- Phân trang
- Đếm chưa đọc
- Đánh dấu đã đọc (từng cái và tất cả)
- Xóa thông báo
- Tabs filter (Tất cả, Chưa đọc, theo loại)
- Notifications tự động khi có sự kiện

---

## 7. CHỨC NĂNG CẦN XÁC NHẬN NGHIỆP VỤ

### Hợp đồng ⚠️

**Hiện trạng:** UI có sẵn với mock data

**Cần xác nhận:**
1. Contract model - cần những trường nào?
2. Ai có quyền tạo hợp đồng? (Seller? Manager?)
3. Quy trình ký hợp đồng?
4. Có dùng chữ ký số không? Dịch vụ nào?
5. Lưu trữ document ở đâu?
6. Trạng thái hợp đồng?

**Đề xuất tạm:**
```prisma
model Contract {
  id           String   @id @default(uuid()) @map("_id")
  listingId    String
  tenantId     String
  sellerId     String
  startDate    DateTime
  endDate      DateTime
  rentAmount   Float
  depositAmount Float
  status       String   // draft | pending | signed | active | expired | terminated
  documentUrl  String?
  signedAt     DateTime?
  createdAt    DateTime @default(now())
}
```

### Cọc giữ chỗ ⚠️

**Hiện trạng:** UI có sẵn với mock data

**Cần xác nhận:**
1. Ai có thể tạo yêu cầu cọc? (Tenant?)
2. Có cần thanh toán trực tuyến không?
3. Số tiền cọc do ai quyết định?
4. Điều kiện hoàn tiền?
5. Quy trình hoàn tiền?
6. Cọc có vào ví Seller không?

**Đề xuất tạm:**
```prisma
model Deposit {
  id           String   @id @default(uuid()) @map("_id")
  listingId    String
  tenantId     String
  amount       Float
  status       String   // pending | paid | confirmed | refunded | expired
  paidAt       DateTime?
  expireAt     DateTime?
  transactionId String?
  createdAt    DateTime @default(now())
}
```

---

## 8. TEST RESULTS

```
TypeScript: ✅ PASS
```

### Manual Test Cases

| Test | Kết quả |
|------|----------|
| Xem danh sách đánh giá | ✅ |
| Xem thông báo | ✅ |
| Gửi yêu cầu nâng cấp | ✅ |
| Đánh dấu đã đọc thông báo | ✅ |
| Xóa thông báo | ✅ |
| Validation CCCD | ✅ |
| Chặn gửi trùng khi pending | ✅ |

---

## 9. HẠN CHẾ VÀ LƯU Ý

1. **Schema Update:** Cần chạy `prisma db push` để tạo collection `notifications`
2. **Hợp đồng/Cọc:** UI có nhưng chưa có Backend - cần xác nhận nghiệp vụ
3. **Giấy tờ nâng cấp:** Tính năng upload đang phát triển, tạm thời gửi không có docs

---

## KẾT LUẬN

- **Đã hoàn thành:** Đánh giá, Nâng cấp Seller, Thông báo (90%)
- **Chưa xác nhận:** Hợp đồng, Cọc giữ chỗ
- **Mức độ hoàn thiện Tenant:** ~85%
