# THIÊN NHÃN TRÚ ĐỒ — Ứng dụng di động (Expo + React Native + TypeScript)

Ứng dụng di động cho nền tảng THIÊN NHÃN TRÚ ĐỒ. Ứng dụng dùng **chung hệ thống
đăng nhập** và **chung backend Express** với website Next.js — không có backend riêng.

> Giai đoạn hiện tại: SCENE 001–019 đã triển khai (auth đầy đủ + toàn bộ luồng
> người thuê). Các SCENE còn lại được triển khai dần.

---

## 1. Công nghệ

| Thành phần | Phiên bản thực tế |
| --- | --- |
| Expo SDK | **58.0.19** (latest stable) |
| React Native | **0.88.0** |
| React | **19.3.0** |
| Expo Router | **58.0.26** |
| TypeScript | **6.0.3** (strict mode) |
| Axios | **1.20.0** |
| expo-secure-store | **58.0.2** |
| lucide-react-native | **1.61.0** |
| react-native-safe-area-context | **5.10.1** |
| react-native-screens | **4.30.0** |
| react-native-svg | **15.16.0** |
| @expo-google-fonts/be-vietnam-pro | **0.4.1** |

## 2. Chạy ứng dụng

```bash
cd mobile
npm install

# Trỏ tới backend Express (mặc định là http://localhost:3005)
cp .env.example .env

npm start          # Metro bundler + Expo Dev Server
npm run android    # Mở trên Android emulator/device
npm run ios        # Mở trên iOS simulator (macOS)
npm run web        # Mở trên trình duyệt
```

Kiểm tra chất lượng:

```bash
npm run typecheck  # tsc --noEmit
npm run doctor     # expo-doctor
```

## 3. Cấu trúc thư mục

```
mobile/
├── app/                        # Expo Router — file _layout.tsx là route
│   ├── _layout.tsx             # Root: font, AuthProvider, Stack
│   ├── index.tsx               # Điểm vào — điều hướng theo session/role
│   ├── (auth)/
│   │   ├── _layout.tsx         # Guard: đã đăng nhập → về home
│   │   ├── onboarding.tsx      # SCENE 002
│   │   ├── dang-nhap.tsx       # SCENE 003
│   │   ├── dang-ky.tsx         # SCENE 004
│   │   ├── xac-thuc-email.tsx  # SCENE 005 — OTP xác thực email
│   │   ├── quen-mat-khau.tsx   # SCENE 006 — quên mật khẩu
│   │   └── dat-lai-mat-khau.tsx# SCENE 007 — đặt lại mật khẩu
│   ├── (tenant)/
│   │   ├── _layout.tsx         # Guard role TENANT + Stack (màn hình phụ)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Bottom Navigation — đúng 5 tab
│   │   │   ├── trang-chu.tsx   # SCENE 008
│   │   │   ├── tim-phong.tsx   # SCENE 009
│   │   │   ├── da-luu.tsx      # SCENE 015
│   │   │   ├── lich-hen.tsx    # SCENE 016
│   │   │   └── tai-khoan.tsx   # SCENE 017
│   │   ├── ban-do.tsx          # SCENE 010  ─┐
│   │   ├── chi-tiet-phong.tsx  # SCENE 011   │
│   │   ├── thu-vien.tsx        # SCENE 012   │ pushed trên Stack,
│   │   ├── dat-hen-xem.tsx     # SCENE 013   │ KHÔNG phải tab
│   │   ├── dat-hen-thanh-cong.tsx # SCENE 014│
│   │   ├── sua-ho-so.tsx       # SCENE 018   │
│   │   └── dang-ky-chu-tro.tsx # SCENE 019  ─┘
│   └── (seller)/
│       ├── _layout.tsx         # Guard role: SELLER
│       ├── tong-quan.tsx
│       ├── tin-dang.tsx
│       ├── lich-hen.tsx
│       ├── khach-hang.tsx
│       └── tai-khoan.tsx
├── src/
│   ├── components/
│   │   ├── ui/                 # Thư viện component dùng chung
│   │   │   ├── app-button.tsx
│   │   │   ├── app-input.tsx
│   │   │   ├── app-card.tsx
│   │   │   ├── app-header.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── otp-input.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── loading-state.tsx
│   │   │   ├── error-state.tsx
│   │   │   └── index.ts        # Barrel export
│   │   ├── brand/              # Logo + splash (SCENE 001)
│   │   ├── tenant/             # Component riêng cho người thuê
│   │   │   ├── listing-card.tsx
│   │   │   ├── filter-chip.tsx
│   │   │   ├── section-title.tsx
│   │   │   └── index.ts
│   │   └── placeholder-screen.tsx
│   ├── constants/
│   │   └── theme.ts            # Design tokens (màu, typography, spacing…)
│   ├── hooks/
│   │   ├── use-app-fonts.ts    # Nạp Be Vietnam Pro
│   │   ├── use-auth-guard.tsx  # Bảo vệ route theo session + role
│   │   └── use-async-data.ts   # Loading / error / reload cho mọi màn danh sách
│   ├── lib/
│   │   ├── api-client.ts       # Axios instance + interceptor token
│   │   ├── secure-token-store.ts
│   │   └── format.ts           # Định dạng tiền, diện tích, ngày, địa chỉ
│   ├── providers/
│   │   └── auth-provider.tsx   # Session: đăng nhập / đăng xuất / khôi phục
│   └── types/
│       ├── auth.ts             # Role, SessionUser, ApiUser…
│       └── listing.ts          # Listing, Appointment, TenantProfile…
├── assets/images/              # Icon + splash (sinh tự động)
├── scripts/
│   ├── generate-assets.js      # Sinh lại icon từ brand mark
│   ├── check-routes.js         # In cây route + kiểm tra resolve
│   └── check-render*.js        # Kiểm tra render thực tế
├── app.json
├── tsconfig.json
└── package.json
```

## 4. Design system — Sophisticated Neo Brutalism

Toàn bộ token nằm trong `src/constants/theme.ts`.

**Màu sắc**

| Token | Mã | Dùng cho |
| --- | --- | --- |
| `colors.primary` | `#FDE047` | Hành động chính, highlight |
| `colors.ink` | `#151515` | Viền, tiêu đề |
| `colors.background` | `#F5F5F0` | Nền ứng dụng |
| `colors.surface` | `#FFFFFF` | Card, input |
| `colors.successSurface` | `#BBF7D0` | Badge đã xác minh |
| `colors.warningSurface` | `#FED7AA` | Badge đang chờ |
| `colors.textMuted` | `#6B6B6B` | Text phụ |

**Quy tắc Neo Brutalism**

- Viền đen đậm (`borderWidth.md` = 2, `lg` = 3).
- Đổ bóng **cứng**: `shadowOffset` + `shadowRadius: 0` — không blur.
- Shadow **lùi vào** khi nhấn (`:active` dịch chuyển 2–3px).
- Font duy nhất: **Be Vietnam Pro** (5 weight: 400/500/600/700/800).

**Component dùng chung**

`AppButton` · `AppInput` · `AppCard` · `AppHeader` · `StatusBadge` ·
`OtpInput` · `EmptyState` · `LoadingState` · `ErrorState`

Component riêng cho người thuê (`src/components/tenant/`):
`ListingCard` · `FilterChip` · `SectionTitle`

## 5. Session & phân quyền

### Luồng đăng nhập

1. `app/(auth)/dang-nhap.tsx` gọi `authApi.login(identifier, password)`.
   Backend chấp nhận **số điện thoại hoặc email** qua trường `identifier`.
2. Backend trả về `{ user, token }` — `user.role` là `tenant` hoặc `seller`.
3. Token được lưu trong **keychain** qua `expo-secure-store` (`secure-token-store.ts`).
4. `AuthProvider` giữ session trong React state.
5. `app/index.tsx` điều hướng theo role:
   - `tenant` → `/(tenant)/(tabs)/trang-chu`
   - `seller` → `/(seller)/tong-quan`

### Cơ chế bảo vệ route

> **Route group trong Expo Router KHÔNG tự bảo vệ quyền truy cập.**
> `(tenant)` và `(seller)` chỉ là tổ chức file, người dùng vẫn có thể mở
> trực tiếp `/tong-quan` hay `/lich-hen` bằng deep link.

Cơ chế thật nằm ở `src/hooks/use-auth-guard.tsx`:

| Tình trạng | Kết quả |
| --- | --- |
| Chưa đăng nhập | → `/(auth)/dang-nhap` |
| Đăng nhập, role khác group | → tự redirect về home đúng role |
| `manager` / `admin` | Không có giao diện di động → từ chối |
| Đúng role | Cho phép |

Guard được áp dụng trong `app/(tenant)/_layout.tsx` và `app/(seller)/_layout.tsx`.

### Khôi phục session

Khi mở app, token trong keychain được kiểm chứng lại bằng `GET /api/auth/me`.
Token hết hạn hoặc bị thu hồi → session bị xoá, người dùng phải đăng nhập lại.

## 6. Kết nối backend

`src/lib/api-client.ts` dùng Axios với:

- `baseURL` = `process.env.EXPO_PUBLIC_API_URL` (mặc định `http://localhost:3005`).
- Request interceptor gắn `Authorization: Bearer <token>` từ SecureStore.
- Timeout 15 giây, `Content-Type: application/json`.
- Lỗi được chuẩn hoá về `ApiError` kèm `status` và thông báo tiếng Việt.

Các endpoint đang dùng (không thay đổi backend):

| Method | Path | Mục đích |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Đăng nhập |
| `GET` | `/api/auth/me` | Kiểm chứng session |
| `POST` | `/api/auth/register` | Đăng ký (tạo tài khoản UNVERIFIED) |
| `POST` | `/api/auth/verify-email` | Xác minh OTP đăng ký → trả token |
| `POST` | `/api/auth/resend-verification` | Gửi lại mã đăng ký |
| `POST` | `/api/auth/forgot-password` | Bắt đầu luồng quên mật khẩu |
| `POST` | `/api/auth/resend-password-reset` | Gửi lại mã quên mật khẩu |
| `POST` | `/api/auth/reset-password` | Hoàn tất đặt lại mật khẩu |
| `PUT` | `/api/auth/profile` | Sửa hồ sơ (đổi email cần OTP) |
| `POST` | `/api/auth/apply-seller` | Nộp hồ sơ đăng ký chủ trọ |
| `GET` | `/api/auth/seller-application` | Trạng thái hồ sơ chủ trọ |
| `GET` | `/api/listings` | Tìm kiếm / lọc phòng |
| `GET` | `/api/listings/featured` | Phòng nổi bật (trang chủ) |
| `GET` | `/api/listings/:id` | Chi tiết phòng + đánh giá |
| `GET` | `/api/tenant/profile` | Hồ sơ + 3 bộ đếm |
| `GET` | `/api/tenant/saved` | Phòng đã lưu |
| `POST` | `/api/tenant/saved/:id` | Lưu phòng |
| `DELETE` | `/api/tenant/saved/:id` | Bỏ lưu phòng |
| `GET` | `/api/tenant/appointments` | Lịch hẹn xem |
| `POST` | `/api/tenant/appointments` | Đặt hẹn xem |
| `DELETE` | `/api/tenant/appointments/:id` | Hủy lịch hẹn |

## 7. Kiểm tra

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | ✅ 0 lỗi |
| Expo Doctor | `npm run doctor` | ✅ 20/20 |
| Bundle Android | `npx expo export -p android` | ✅ 5 MB Hermes bundle |
| Render web | `npx expo export -p web` | ✅ 23 route |
| Render thực tế | `node scripts/check-render-browser.js` | ✅ 6/6 assertion |

## 8. Lệnh script

| Script | Công dụng |
| --- | --- |
| `npm start` | Khởi động Metro + Expo Dev Server |
| `npm run android` / `npm run ios` / `npm run web` | Mở trên nền tảng tương ứng |
| `npm run typecheck` | Kiểm tra TypeScript strict |
| `npm run doctor` | Kiểm tra cấu hình Expo |
| `node scripts/generate-assets.js` | Sinh lại icon/splash từ brand mark |
| `node scripts/check-routes.js` | In cây route và kiểm tra resolve |
| `node scripts/check-render-browser.js` | Kiểm tra render thật trong headless Chrome |
