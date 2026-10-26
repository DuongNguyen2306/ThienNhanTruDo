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
 *   3. Production without `NEXT_PUBLIC_API_URL` — deliberately NOT a
 *      hardcoded `localhost` and deliberately NOT a legacy host. A request
 *      would silently hit the wrong origin, so the API layer raises a
 *      clear error instead (see `lib/api.ts`).
 *
 * The trailing slash is stripped so callers can always join with `/`.
 */

const DEV_API_URL = 'http://localhost:3005';

function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
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
