/**
 * Domain types for the tenant screens.
 *
 * They mirror the shapes the Express backend already returns, so no backend
 * change is required. Every field is optional where the backend may omit it
 * (a listing without photos, an appointment without a note, and so on).
 */

export type RoomType = 'phong-tro' | 'chung-cu-mini' | 'nha-tro' | 'can-ho';

export interface ListingSeller {
  id: string;
  fullName: string;
  phone?: string;
  sellerProfile?: {
    trustScore?: number | null;
    responseRate?: number | null;
    status?: string | null;
    brand?: string | null;
  } | null;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  roomType: string;

  houseNumber?: string | null;
  alley?: string | null;
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;

  rent: number;
  depositMonths?: number;
  electricity?: number | null;
  electricityType?: string | null;
  water?: number | null;
  waterType?: string | null;
  internet?: number | null;
  sanitation?: number | null;
  parkingBike?: number | null;
  parkingCar?: number | null;
  managementFee?: number | null;

  area?: number | null;
  direction?: string | null;
  floor?: number | null;
  totalFloors?: number | null;
  furniture?: boolean;
  pets?: boolean;

  availableFrom?: string | null;
  vacantNow?: boolean;

  verified?: boolean;
  vip?: boolean;
  isVipActive?: boolean;
  highTrust?: boolean;

  status?: string;
  views?: number;
  rating?: number | null;
  reviewCount?: number;

  image?: string | null;
  photos?: string[];
  amenities?: string[];

  roadWidth?: number | null;
  carAccess?: boolean;
  truckAccess?: boolean;

  createdAt?: string;
  updatedAt?: string;

  seller?: ListingSeller;
  reviews?: ListingReview[];

  /** Only present on the "saved listings" endpoint. */
  savedAt?: string;
}

export interface ListingReview {
  id: string;
  listingId: string;
  authorId: string;
  score: number;
  photoMatch?: number | null;
  landlord?: number | null;
  security?: number | null;
  hygiene?: number | null;
  text?: string | null;
  verifiedStay?: boolean;
  sellerResponse?: string | null;
  createdAt?: string;
  author?: {
    id: string;
    fullName: string;
    initials?: string;
  } | null;
}

export interface ReviewStats {
  totalReviews: number;
  avgRating: number;
  starDistribution: Record<string, number>;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  listingId: string;
  tenantId: string;
  when: string;
  status: AppointmentStatus | string;
  phone?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  listing?: {
    id: string;
    title: string;
    image?: string | null;
    rent?: number | null;
    houseNumber?: string | null;
    alley?: string | null;
    street?: string | null;
    ward?: string | null;
    district?: string | null;
    city?: string | null;
  } | null;
}

export interface TenantProfile {
  id: string;
  phone: string;
  email?: string | null;
  fullName: string;
  role: string;
  initials?: string | null;
  createdAt?: string;
}

export interface TenantStats {
  appointments: number;
  savedListings: number;
  reviews: number;
}

export interface ListingSearchParams {
  page?: number;
  limit?: number;
  roomType?: RoomType | string;
  minRent?: number;
  maxRent?: number;
  minArea?: number;
  maxArea?: number;
  district?: string;
  ward?: string;
  vip?: boolean;
  /** Only the listings a manager has checked. */
  verified?: boolean;
  furniture?: boolean;
  pets?: boolean;
  vacantNow?: boolean;
  availableFrom?: string;
  direction?: string;
  sortBy?: 'createdAt' | 'rent' | 'area' | 'views' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ListingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListingSearchResponse {
  listings: Listing[];
  pagination: ListingPagination;
}

/** A saved listing carries an extra timestamp. */
export interface SavedListingsResponse {
  listings: Listing[];
}

export interface SellerApplicationStatus {
  hasApplied: boolean;
  status: string | null;
  canApply?: boolean;
  message?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  sellerProfile?: {
    id: string;
    status: string;
    brand?: string | null;
    address?: string | null;
    submittedAt?: string;
    reviewedAt?: string;
    reviewNote?: string | null;
  } | null;
}
