/**
 * Domain types for the SELLER (chủ trọ) screens.
 *
 * Every shape here mirrors what `backend/src/routes/seller.js` actually
 * returns. Fields the backend may omit are optional; fields the backend
 * does not have at all are simply absent — the UI never invents them.
 */

import type { Listing } from '@/types/listing';

/** A seller listing is the public listing plus the review fields. */
export interface SellerListing extends Listing {
  rejectReason?: string | null;
  reviewedAt?: string | null;
}

/** Listing status values used by the backend (`Listing.status`). */
export type SellerListingStatus = 'draft' | 'pending' | 'active' | 'rejected' | 'inactive';

/** A seller lead (`model SellerLead`). */
export interface SellerLead {
  id: string;
  listingId: string | null;
  sellerId: string;
  name: string;
  phone: string;
  message?: string | null;
  when?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  listing?: { id: string; title: string } | null;
}

/** Lead status values used by the backend. */
export type SellerLeadStatus = 'new' | 'contacted' | 'interested' | 'not_interested';

/** A seller appointment — the tenant appointment plus the two relations. */
export interface SellerAppointment {
  id: string;
  listingId: string;
  tenantId: string;
  when: string;
  status: string;
  phone?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  listing?: { id: string; title: string } | null;
  tenant?: { id: string; fullName: string; phone?: string | null } | null;
}

/** `GET /api/seller/dashboard`. */
export interface SellerDashboardStats {
  listings: {
    draft: number;
    pending: number;
    active: number;
    rejected: number;
    inactive: number;
  };
  newLeads: number;
  pendingAppointments: number;
  totalViews: number;
}

/** `GET /api/seller/profile` — the seller profile joined with the account. */
export interface SellerProfile {
  id?: string;
  userId?: string;
  idNumber?: string | null;
  brand?: string | null;
  address?: string | null;
  docs?: string | null;
  status?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  responseRate?: number;
  trustScore?: number;
  user?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
  };
}

/**
 * The writable fields of a listing.
 *
 * This is exactly the set `POST /api/seller/listings` reads and the set
 * `PUT /api/seller/listings/:id` allows — nothing else is ever sent.
 */
export interface SellerListingInput {
  title: string;
  roomType: string;
  rent: number;
  city?: string;
  district?: string;
  ward?: string;
  street?: string;
  houseNumber?: string;
  alley?: string;
  lat?: number;
  lng?: number;
  depositMonths?: number;
  electricity?: number;
  electricityType?: string;
  water?: number;
  waterType?: string;
  internet?: number;
  sanitation?: number;
  parkingBike?: number;
  parkingCar?: number;
  managementFee?: number;
  area?: number;
  direction?: string;
  floor?: number;
  totalFloors?: number;
  furniture?: boolean;
  pets?: boolean;
  availableFrom?: string | null;
  vacantNow?: boolean;
  photos?: string[];
  amenities?: string[];
  roadWidth?: number;
  carAccess?: boolean;
  truckAccess?: boolean;
}

/** `POST /api/seller/upload` — one uploaded file. */
export interface SellerUploadedFile {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

/** A notification (`GET /api/notifications`). */
export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}
