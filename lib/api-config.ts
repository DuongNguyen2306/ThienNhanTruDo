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
 *   3. Production without a usable `NEXT_PUBLIC_API_URL` — deliberately NOT a
 *      hardcoded `localhost` and deliberately NOT a legacy host. A request
 *      would silently hit the wrong origin, so the API layer raises a
 *      clear error instead (see `lib/api.ts`).
 *
 * The trailing slash is stripped so callers can always join with `/`.
 */

const DEV_API_URL = 'http://localhost:3005';

/**
 * Hostname này có trỏ về chính máy của người dùng không?
 *
 * Backend chạy local ở `localhost:3005` — nếu bản build production dùng URL
 * đó thì mọi request của khách sẽ đi tới máy của khách (và hầu như luôn
 * thất bại). Vì vậy ở production, URL dạng loopback bị coi là "chưa cấu
 * hình" ⇒ `lib/api.ts` báo lỗi rõ ràng thay vì gọi sai chỗ.
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

    // Production: URL loopback không dùng được ⇒ coi như chưa cấu hình.
    // (Vẫn chạy được ở development vì đó là chính backend local.)
    if (process.env.NODE_ENV === 'production' && isLoopbackUrl(normalized)) {
      return '';
    }

    return normalized;
  }

  if (process.env.NODE_ENV === 'production') {
    // No URL configured for this deployment. `lib/api.ts` turns this into a
    // readable error rather than calling the wrong host.
    return '';
  }

  return DEV_API_URL;
}

/** The backend base URL, without a trailing slash. */
export const API_BASE = resolveApiBase();

/** True when this build has no usable API URL configured. */
export const IS_API_BASE_MISSING = API_BASE.length === 0;

/** Join a path onto the API base URL. */
export function apiUrl(path: string): string {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
