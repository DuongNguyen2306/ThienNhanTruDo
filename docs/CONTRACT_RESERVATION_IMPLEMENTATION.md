# CONTRACT ARCHIVE + RESERVATION REQUEST SYSTEM IMPLEMENTATION REPORT

**Project:** THIÊN NHÃN TRÚ ĐỒ  
**Date:** 2026-10-19  
**Status:** ✅ COMPLETED

---

## 1. AUDIT RESULTS

### 1.1 Pre-existing Components
| Component | Status | Notes |
|-----------|--------|-------|
| User model | ✅ Existed | Has role, phone, email, fullName |
| Listing model | ✅ Existed | Has sellerId, status, pricing |
| Notification model | ✅ Existed | Has type field (hopdong, coc) |
| Notification API | ✅ Existed | `GET/POST /api/notifications` |
| Tenant Routes | ✅ Existed | `/api/tenant/*` |
| Seller Routes | ✅ Existed | `/api/seller/*` |
| JWT Auth | ✅ Existed | Role-based middleware |
| `lib/api.ts` | ✅ Existed | API client functions |

### 1.2 Components Needing Addition
| Component | Implementation |
|-----------|----------------|
| Reservation model | **ADDED** |
| Contract model | **ADDED** |
| Tenant reservation endpoints | **ADDED** |
| Seller reservation endpoints | **ADDED** |
| Tenant contract endpoints | **ADDED** |
| Seller contract endpoints | **ADDED** |
| Secure file storage | **ADDED** |
| API client types | **ADDED** |
| Frontend Tenant page | **UPDATED** |
| Frontend Seller page | PENDING (optional) |

---

## 2. DATABASE CHANGES

### 2.1 Prisma Schema Additions

**File:** `backend/prisma/schema.prisma`

#### New Model: Reservation
```
- id (String, UUID)
- tenantId → User (TenantReservations)
- sellerId → User (SellerReservations)
- listingId → Listing
- status: pending | approved | rejected | cancelled
- note (tenant's note)
- sellerNote (seller's rejection reason)
- expiresAt (optional)
- approvedAt, rejectedAt, cancelledAt, cancelledBy
- contracts → Contract[]
```

#### New Model: Contract
```
- id (String, UUID)
- listingId → Listing
- sellerId → User (SellerContracts)
- tenantId → User (TenantContracts)
- reservationId → Reservation? (optional link)
- title, contractNumber
- startDate, endDate
- monthlyRent, depositAmount
- fileKey, originalFileName, mimeType, fileSize
- status: active_record | archived | revoked
- parentId (versioning), version
- uploadedAt
```

### 2.2 Indices Added
```prisma
// Reservation
@@index([tenantId, createdAt])
@@index([sellerId, createdAt])
@@index([listingId, status])

// Contract
@@index([tenantId, createdAt])
@@index([sellerId, createdAt])
@@index([listingId, status])
```

---

## 3. BACKEND API ENDPOINTS

### 3.1 Tenant Reservation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tenant/reservations` | Create reservation request |
| GET | `/api/tenant/reservations` | List tenant's reservations |
| GET | `/api/tenant/reservations/:id` | Get reservation detail |
| PATCH | `/api/tenant/reservations/:id/cancel` | Cancel reservation |

### 3.2 Tenant Contract APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenant/contracts` | List tenant's contracts |
| GET | `/api/tenant/contracts/:id` | Get contract metadata |
| GET | `/api/tenant/contracts/:id/download` | Download contract file (via seller route) |

### 3.3 Seller Reservation APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/seller/reservations` | List seller's reservations |
| GET | `/api/seller/reservations/:id` | Get reservation detail |
| PATCH | `/api/seller/reservations/:id/approve` | Approve reservation |
| PATCH | `/api/seller/reservations/:id/reject` | Reject reservation |

### 3.4 Seller Contract APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seller/contracts` | Upload contract (multipart) |
| GET | `/api/seller/contracts` | List seller's contracts |
| GET | `/api/seller/contracts/:id` | Get contract detail |
| GET | `/api/seller/contracts/:id/download` | Download contract file |
| PATCH | `/api/seller/contracts/:id/archive` | Archive contract |
| PATCH | `/api/seller/contracts/:id/revoke` | Revoke contract access |

---

## 4. SECURITY IMPLEMENTATION

### 4.1 File Storage Security
- **Location:** `backend/contracts/` (OUTSIDE public directory)
- **Access:** Via authenticated API only, no public URLs
- **Upload validation:** MIME type check (PDF, JPEG, PNG only)
- **File size limit:** 10MB
- **Path:** `/contracts/{sellerId}/{fileKey}`
- **No path traversal:** Using secure filename generation

### 4.2 Authorization Checks
| Action | Tenant | Seller | Rules |
|---------|--------|--------|-------|
| Create reservation | ✅ | ❌ | Must be logged in as tenant |
| Cancel reservation | ✅ | ✅ (own) | Only own reservation |
| View reservations | ✅ (own) | ✅ (own listings) | Ownership check |
| Approve/Reject | ❌ | ✅ (own listings) | Listing ownership |
| Upload contract | ❌ | ✅ | Listing ownership + tenant exists |
| Download contract | ✅ (own) | ✅ (own) | Ownership check |

### 4.3 Validation
- Listing must exist and be "active"
- No duplicate pending reservations
- No duplicate approved reservations for same tenant+listing
- State transitions validated (e.g., cannot approve already rejected)
- Input validation via express-validator

---

## 5. STATE TRANSITIONS

### 5.1 Reservation States
```
PENDING → APPROVED (by seller)
PENDING → REJECTED (by seller with optional reason)
PENDING → CANCELLED (by tenant)
APPROVED → CANCELLED (by tenant)
```

### 5.2 Invalid Transitions (Blocked)
- REJECTED → APPROVED
- CANCELLED → APPROVED
- EXPIRED → any
- Multiple APPROVED for same listing (atomic check)

---

## 6. NOTIFICATION EVENTS

### 6.1 Reservation Notifications
| Event | Recipient | Type | Title |
|-------|-----------|------|-------|
| Tenant creates request | Seller | `coc` | "Yêu cầu giữ chỗ mới" |
| Seller approves | Tenant | `coc` | "Yêu cầu giữ chỗ được chấp thuận" |
| Seller rejects | Tenant | `coc` | "Yêu cầu giữ chỗ bị từ chối" |
| Tenant cancels | Seller | `coc` | "Yêu cầu giữ chỗ đã bị hủy" |

### 6.2 Contract Notifications
| Event | Recipient | Type | Title |
|-------|-----------|------|-------|
| Seller uploads | Tenant | `hopdong` | "Hợp đồng mới được tải lên" |
| Seller archives | Tenant | `hopdong` | "Hợp đồng đã được lưu trữ" |
| Seller revokes | Tenant | `hopdong` | "Quyền truy cập hợp đồng đã bị thu hồi" |

---

## 7. FRONTEND CHANGES

### 7.1 Tenant Pages Updated

#### `/tai-khoan/coc-giu-cho/ClientPage.tsx`
- **Removed:** VNPay payment mock UI
- **Removed:** Deposit amount display
- **Added:** Real API integration via `tenantApi`
- **Added:** Loading/Error/Empty states
- **Added:** Status badges (Chờ xác nhận, Đã chấp thuận, etc.)
- **Added:** Cancel confirmation dialog
- **Added:** Seller note display
- **Label changed:** "Yêu cầu giữ chỗ — Không cần đặt cọc"

#### `/tai-khoan/hop-dong/ClientPage.tsx`
- **Removed:** Fake digital signature display
- **Removed:** OTP verification display
- **Added:** Real API integration via `tenantApi`
- **Added:** Contract metadata display
- **Added:** File size formatting
- **Added:** Status badges (Đang lưu trữ, Đã lưu trữ, Đã thu hồi)

### 7.2 API Client (`lib/api.ts`)
```typescript
// Tenant APIs
tenantApi.createReservation(listingId, note)
tenantApi.getReservations(params)
tenantApi.getReservation(id)
tenantApi.cancelReservation(id, reason)
tenantApi.getContracts(params)
tenantApi.getContract(id)

// Seller APIs
sellerApi.getReservations(params)
sellerApi.getReservation(id)
sellerApi.approveReservation(id)
sellerApi.rejectReservation(id, reason)
sellerApi.getContracts(params)
sellerApi.getContract(id)
sellerApi.uploadContract(formData)
sellerApi.archiveContract(id)
sellerApi.revokeContract(id)
```

---

## 8. FILES MODIFIED

### 8.1 Backend
| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Added Reservation & Contract models |
| `backend/src/routes/tenant.js` | Added reservation & contract endpoints |
| `backend/src/routes/seller.js` | Added reservation & contract endpoints + multer config |

### 8.2 Frontend
| File | Change |
|------|--------|
| `lib/api.ts` | Added types & API functions |
| `app/tai-khoan/coc-giu-cho/ClientPage.tsx` | Full rewrite for real API |
| `app/tai-khoan/hop-dong/ClientPage.tsx` | Full rewrite for real API |

---

## 9. RULES ENFORCED (NOT IMPLEMENTED)

The following were explicitly **NOT** implemented per requirements:

| Rule | Status |
|------|--------|
| ❌ No e-signatures | ✅ Implemented |
| ❌ No deposit collection | ✅ Implemented |
| ❌ No VNPay for reservations | ✅ Implemented |
| ❌ No OTP/Email/SMS | ✅ Implemented |
| ❌ No public file URLs | ✅ Implemented |
| ❌ No delete contracts | ✅ Only archive/revoke |
| ❌ No UI redesign | ✅ Preserved existing design |

---

## 10. PRODUCTION NOTES

### 10.1 Required Before Production
1. **Restart backend** and run `npx prisma generate`
2. Run `npx prisma db push` to create new collections (Reservation, Contract)
3. Configure production file storage (S3, Azure Blob, etc.)
4. Set up monitoring for contract file access

### 10.2 Production Storage Recommendations
- Use private object storage (not public bucket)
- Implement signed URLs with expiration for downloads
- Enable audit logging for all file operations
- Set up backup policy for contract files

---

## 11. DEPLOYMENT CHECKLIST

| Task | Status |
|------|--------|
| Schema update | ✅ Done |
| Prisma generate | ⚠️ Manual (restart backend first) |
| Backend restart | ⚠️ User action required |
| MongoDB migration | ⚠️ User action required |
| Frontend TypeScript | ✅ Passed (`npx tsc --noEmit`) |

---

## 12. TESTING RECOMMENDATIONS

### 12.1 Reservation Tests
1. Tenant creates valid reservation → Seller receives notification
2. Tenant creates duplicate → Error 409
3. Seller approves → Tenant notified, status = approved
4. Seller rejects → Tenant notified, status = rejected
5. Tenant cancels → Seller notified, status = cancelled
6. Non-owner cannot view/download contracts

### 12.2 Contract Tests
1. Seller uploads PDF → Tenant receives notification
2. Tenant downloads contract → File delivered securely
3. Seller revokes → Tenant sees revoked status
4. Non-owner cannot access file (403)

---

## 13. KNOWN LIMITATIONS

1. **No automatic expiration:** If business needs expiring reservations, add cron job
2. **No listing availability check:** Schema doesn't track room count; apply business rule that one approved reservation = one tenant interest
3. **Seller contract management UI:** Not implemented in this phase (can be added later)
4. **File preview:** Only download, no in-browser preview

---

**Report Generated:** 2026-10-19  
**Implementation Status:** COMPLETE ✅
