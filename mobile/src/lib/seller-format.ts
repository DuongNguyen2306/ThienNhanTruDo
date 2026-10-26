/**
 * Labels and badge variants for the seller screens.
 *
 * The status strings are the ones the backend actually stores
 * (`Listing.status`, `SellerLead.status`, `Appointment.status`), so a new
 * status added server-side still renders — it just falls back to the raw
 * value and the neutral badge.
 */

import type { StatusBadgeVariant } from '@/components/ui';

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  pending: 'Chờ duyệt',
  active: 'Đang hiển thị',
  rejected: 'Bị từ chối',
  inactive: 'Đã ẩn',
};

export const LISTING_STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hiển thị' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'rejected', label: 'Bị từ chối' },
  { key: 'inactive', label: 'Đã ẩn' },
] as const;

export function listingStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return LISTING_STATUS_LABELS[status] ?? status;
}

export function listingStatusVariant(status: string | null | undefined): StatusBadgeVariant {
  if (status === 'active') return 'verified';
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  if (status === 'draft') return 'info';
  return 'neutral';
}

/* ------------------------------------------------------------------ */
/* Lead                                                                */
/* ------------------------------------------------------------------ */

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  interested: 'Quan tâm',
  not_interested: 'Không phù hợp',
};

export const LEAD_STATUS_OPTIONS = [
  { key: 'new', label: 'Mới' },
  { key: 'contacted', label: 'Đã liên hệ' },
  { key: 'interested', label: 'Quan tâm' },
  { key: 'not_interested', label: 'Không phù hợp' },
] as const;

export function leadStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return LEAD_STATUS_LABELS[status] ?? status;
}

export function leadStatusVariant(status: string | null | undefined): StatusBadgeVariant {
  if (status === 'new') return 'pending';
  if (status === 'contacted') return 'info';
  if (status === 'interested') return 'verified';
  if (status === 'not_interested') return 'neutral';
  return 'neutral';
}

/* ------------------------------------------------------------------ */
/* Appointment                                                         */
/* ------------------------------------------------------------------ */

export const SELLER_APPOINTMENT_STATUS_OPTIONS = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'completed', label: 'Đã xem' },
  { key: 'cancelled', label: 'Đã hủy' },
] as const;

export function appointmentStatusVariant(status: string | null | undefined): StatusBadgeVariant {
  if (status === 'confirmed' || status === 'completed') return 'verified';
  if (status === 'pending') return 'pending';
  if (status === 'cancelled') return 'rejected';
  return 'neutral';
}

/** The label of an appointment status, re-exported for the seller screens. */
export { appointmentStatusLabel } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Form options                                                        */
/* ------------------------------------------------------------------ */

export const ROOM_TYPE_OPTIONS = [
  { key: 'phong-tro', label: 'Phòng trọ' },
  { key: 'chung-cu-mini', label: 'Chung cư mini' },
  { key: 'nha-tro', label: 'Nhà trọ' },
  { key: 'can-ho', label: 'Căn hộ' },
] as const;

export const DIRECTION_OPTIONS = [
  { key: 'north', label: 'Bắc' },
  { key: 'south', label: 'Nam' },
  { key: 'east', label: 'Đông' },
  { key: 'west', label: 'Tây' },
  { key: 'northeast', label: 'Đông Bắc' },
  { key: 'northwest', label: 'Tây Bắc' },
  { key: 'southeast', label: 'Đông Nam' },
  { key: 'southwest', label: 'Tây Nam' },
] as const;

/** The amenity vocabulary the web app already uses for listings. */
export const AMENITY_OPTIONS = [
  'Máy lạnh',
  'Thang máy',
  'Giờ giấc tự do',
  'PCCC đạt chuẩn',
  'Cho nuôi thú cưng',
  'Nội thất có sẵn',
  'Wifi',
  'Camera an ninh',
] as const;

/** A phone number that `Linking.openURL('tel:…')` can actually dial. */
export function dialablePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.length >= 9 ? digits : null;
}
