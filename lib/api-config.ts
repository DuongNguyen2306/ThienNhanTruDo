/**
 * The ONE place where the backend base URL is defined.
 *
 * Every API consumer in the app imports `API_BASE` from here, so there is
 * never a second hardcoded URL that can drift.
 *
 * Resolution order:
 *
 *   1. `NEXT_PUBLIC_API_URL` — set in `.env.local` for local development and
 *      in the Vercel project settings for production. This is the only
 *      value a deployment should rely on.
 *   2. Local development fallback — `http://localhost:3005`, the port the
 *      Express backend listens on (`backend/.env` → `PORT=3005`).
 *   3. Production without `NEXT_PUBLIC_API_URL` — the API layer raises a
 *      clear, catchable error instead of silently calling the wrong host
 *      (see `lib/api.ts`).
 *
 * VỀ VIỆC DÙNG `localhost:3005` TRONG PRODUCTION
 *  Backend của dự án chạy LOCAL trên máy của người quản trị, và website
 *  Vercel được mở bằng trình duyệt trên ĐÚNG máy đó. Khi đó trình duyệt
 *  gọi `http://localhost:3005` chính là gọi vào backend local ⇒ hoạt động
 *  bình thường. Vì vậy KHÔNG chặn URL loopback ở production.
 *
 *  Hệ quả (chấp nhận được và có kiểm soát): khách thật mở website từ máy
 *  KHÔNG chạy backend sẽ thấy request thất bại. Lỗi đó được báo rõ ràng
 *  qua `API_CONFIG_ERROR_MESSAGE` thay vì gọi nhầm đích.
 *
 * The trailing slash is stripped so callers can always join with `/`.
 */

/** URL backend local — dùng khi phát triển trên máy VÀ khi production
 *  cố tình trỏ về backend local của người quản trị. */
const DEV_API_URL = 'http://localhost:3005';

/**
 * Hostname này có trỏ về chính máy của người dùng không?
 *
 * Dùng để gợi ý trong thông báo lỗi (xem `API_CONFIG_ERROR_MESSAGE`).
 * KHÔNG dùng để chặn — backend local là một cấu hình hợp lệ.
 */
function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    const normalized = configured.replace(/\/+$/, '');

    // KHÔNG chặn URL loopback ở production: backend local là một cấu hình
    // hợp lệ (website Vercel được mở trên máy đang chạy backend local).
    // URL nào cũng được dùng nguyên vẹn — không tự thay bằng URL khác.
    return normalized;
  }

  if (process.env.NODE_ENV === 'production') {
    // Không có URL nào cấu hình cho bản build này.
    return '';
  }

  return DEV_API_URL;
}

/** The backend base URL, without a trailing slash. */
export const API_BASE = resolveApiBase();

/** True khi production mà KHÔNG có `NEXT_PUBLIC_API_URL` dùng được. */
export const IS_API_BASE_MISSING = API_BASE.length === 0;

/** True khi API có thể dùng được (dev local, hoặc production đã trỏ đúng). */
export const IS_API_BASE_USABLE = API_BASE.length > 0;

/**
 * Thông báo lỗi khi API chưa cấu hình.
 *
 * Phân biệt hai nguyên nhân để người quản trị biết cần sửa gì:
 *  • thiếu hẳn biến môi trường;
 *  • có biến nhưng trỏ về localhost (file `.env` được commit có sẵn giá trị
 *    này, và nó được nạp lúc build ⇒ production cũng nhận giá trị đó).
 */
export const API_CONFIG_ERROR_MESSAGE = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured && isLoopbackUrl(configured.replace(/\/+$/, ''))) {
    return (
      'NEXT_PUBLIC_API_URL đang trỏ về localhost. ' +
      'Điều này chỉ hoạt động khi mở website trên đúng máy đang chạy backend ' +
      '(http://localhost:3005). Nếu cần dùng từ máy khác, hãy đặt ' +
      'NEXT_PUBLIC_API_URL = https://<backend-công-khai> trong Vercel rồi deploy lại.'
    );
  }

  return (
    'Chưa cấu hình NEXT_PUBLIC_API_URL cho môi trường này. ' +
    'Vui lòng kiểm tra biến môi trường.'
  );
})();

/** Join a path onto the API base URL. */
export function apiUrl(path: string): string {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
