const express = require('express');
const { body, query } = require('express-validator');
const prisma = require('../db');
const { validate } = require('../middleware/errorHandler');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/listings - Public listings search
// ============================================
router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('roomType').optional().isIn(['phong-tro', 'chung-cu-mini', 'nha-tro', 'can-ho']),
    query('minRent').optional().isFloat({ min: 0 }).toFloat(),
    query('maxRent').optional().isFloat({ min: 0 }).toFloat(),
    query('minArea').optional().isFloat({ min: 0 }).toFloat(),
    query('maxArea').optional().isFloat({ min: 0 }).toFloat(),
    query('district').optional().isString(),
    query('ward').optional().isString(),
    query('vip').optional().isBoolean().toBoolean(),
    query('furniture').optional().isBoolean().toBoolean(),
    query('pets').optional().isBoolean().toBoolean(),
    query('vacantNow').optional().isBoolean().toBoolean(),
    query('availableFrom').optional().isISO8601(),
    query('direction').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'rent', 'area', 'views', 'rating']).withMessage('Sắp xếp không hợp lệ'),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        roomType,
        minRent,
        maxRent,
        minArea,
        maxArea,
        district,
        ward,
        vip,
        furniture,
        pets,
        verified,
        vacantNow,
        availableFrom,
        direction,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        status: 'active',
      };

      if (roomType) where.roomType = roomType;
      if (district) where.district = { contains: district };
      if (ward) where.ward = { contains: ward };
      if (vip !== undefined) where.vip = vip;
      if (furniture !== undefined) where.furniture = furniture;
      if (pets !== undefined) where.pets = pets;
      if (verified !== undefined) where.verified = verified === 'true' || verified === true;
      if (vacantNow !== undefined) where.vacantNow = vacantNow === 'true' || vacantNow === true;
      if (availableFrom) where.availableFrom = { lte: availableFrom };
      if (direction) where.direction = direction;

      // Price range
      if (minRent || maxRent) {
        where.rent = {};
        if (minRent) where.rent.gte = minRent;
        if (maxRent) where.rent.lte = maxRent;
      }

      // Area range
      if (minArea || maxArea) {
        where.area = {};
        if (minArea) where.area.gte = minArea;
        if (maxArea) where.area.lte = maxArea;
      }

      // Build orderBy - VIP listings with active expiration come first
      // When sorting by views, put active VIPs at top regardless of sort
      let orderBy;
      if (sortBy === 'views' || sortBy === 'rating') {
        // For views/rating: active VIPs first, then normal sort
        // Note: This requires a subquery or raw query for full SQL sorting
        // For MongoDB/Prisma, we'll do post-processing
        orderBy = [{ vip: 'desc' }, { [sortBy]: sortOrder }];
      } else if (sortBy === 'createdAt') {
        // For createdAt: active VIPs first, then by date
        orderBy = [{ vip: 'desc' }, { [sortBy]: sortOrder }];
      } else {
        orderBy = { [sortBy]: sortOrder };
      }

      const [listings, total] = await Promise.all([
        prisma.listing.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                sellerProfile: {
                  select: {
                    trustScore: true,
                    responseRate: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
        prisma.listing.count({ where }),
      ]);

      // Mark VIP status based on expiration (no filtering by VIP)
      const now = new Date();
      const formattedListings = listings
        .map((l) => ({
          ...l,
          photos: l.photos ? JSON.parse(l.photos) : [],
          amenities: l.amenities ? JSON.parse(l.amenities) : [],
          // Mark VIP status based on expiration
          isVipActive: l.vip && l.vipExpiresAt && l.vipExpiresAt > now,
        }));
      // All listings visible regardless of VIP status

      res.json({
        listings: formattedListings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/listings/featured - Featured listings
// ============================================
router.get('/featured', optionalAuth, async (req, res, next) => {
  try {
    const now = new Date();
    
    const listings = await prisma.listing.findMany({
      where: { 
        status: 'active',
        OR: [
          { vip: false },
          { vip: true, vipExpiresAt: { gte: now } },
        ],
      },
      take: 10,
      orderBy: [{ vip: 'desc' }, { views: 'desc' }],
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            sellerProfile: {
              select: { trustScore: true, status: true },
            },
          },
        },
      },
    });

    const formatted = listings.map((l) => ({
      ...l,
      photos: l.photos ? JSON.parse(l.photos) : [],
      amenities: l.amenities ? JSON.parse(l.amenities) : [],
      isVipActive: l.vip && l.vipExpiresAt && l.vipExpiresAt > now,
    }));

    res.json({ listings: formatted });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/listings/:id - Get single listing
// ============================================
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            sellerProfile: {
              select: {
                trustScore: true,
                responseRate: true,
                status: true,
                brand: true,
              },
            },
          },
        },
        reviews: {
          include: {
            author: {
              select: { id: true, fullName: true, initials: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    // Increment view count
    await prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    res.json({
      listing: {
        ...listing,
        photos: listing.photos ? JSON.parse(listing.photos) : [],
        amenities: listing.amenities ? JSON.parse(listing.amenities) : [],
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
