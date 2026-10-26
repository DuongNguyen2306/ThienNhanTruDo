/**
 * Formatting helpers for the Vietnamese UI.
 *
 * Prices, areas and dates are formatted the same way everywhere in the
 * app, so a number never looks like it came from two different sources.
 */

/** Format a number with a thin space as the thousands separator. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('vi-VN').format(value);
}

/** Format a monthly rent, e.g. "4.500.000đ". */
export function formatRent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

/** Format an area in square metres, e.g. "22 m²". */
export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(value)} m²`;
}

/**
 * Build a one-line address from the parts of a listing.
 *
 * The parts the backend may omit are skipped, so the result is never full
 * of dangling commas.
 */
export function formatAddress(listing: {
  houseNumber?: string | null;
  alley?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  const parts = [
    listing.houseNumber,
    listing.alley,
    listing.street,
    listing.ward,
    listing.district,
    listing.city,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.join(', ');
}

/** The short address used on a card: ward/district only. */
export function formatShortAddress(listing: {
  ward?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  return [listing.ward, listing.district, listing.city]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');
}

/** Format a date as "dd/MM/yyyy". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Format a date and time as "dd/MM/yyyy HH:mm". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Format a relative time, e.g. "3 giây trước". */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'vừa xong';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} ngày trước`;

  return formatDate(value);
}

/** The Vietnamese label for a room type key. */
export const ROOM_TYPE_LABELS: Record<string, string> = {
  'phong-tro': 'Phòng trọ',
  'chung-cu-mini': 'Chung cư mini',
  'nha-tro': 'Nhà trọ',
  'can-ho': 'Căn hộ',
};

/** The label of a room type, with the raw value as the fallback. */
export function roomTypeLabel(roomType: string | null | undefined): string {
  if (!roomType) return '—';
  return ROOM_TYPE_LABELS[roomType] ?? roomType;
}

/** The Vietnamese label for an appointment status. */
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Đã xem',
};

export function appointmentStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}
