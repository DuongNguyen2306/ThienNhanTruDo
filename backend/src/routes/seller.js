const express = require('express');
const { body } = require('express-validator');
const prisma = require('../db');
const { validate } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply auth to all seller routes
router.use(authenticate);
router.use(authorize('seller'));

// ============================================
// GET /api/seller/listings - My listings
// ============================================
router.get('/listings', async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = { sellerId: req.user.id };
    if (status) where.status = status;

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      listings: listings.map((l) => ({
        ...l,
        photos: l.photos ? JSON.parse(l.photos) : [],
        amenities: l.amenities ? JSON.parse(l.amenities) : [],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/seller/listings - Create listing
// ============================================
router.post(
  '/listings',
  [
    body('title').notEmpty().withMessage('Tiêu đề không được trống'),
    body('roomType').isIn(['phong-tro', 'chung-cu-mini', 'nha-tro', 'can-ho']).withMessage('Loại phòng không hợp lệ'),
    body('rent').isFloat({ min: 0 }).withMessage('Giá thuê phải lớn hơn 0'),
    body('city').optional().isString(),
    body('district').optional().isString(),
    body('ward').optional().isString(),
    body('street').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        title,
        roomType,
        houseNumber,
        alley,
        street,
        ward,
        district,
        city = 'TP Hồ Chí Minh',
        lat,
        lng,
        rent,
        depositMonths = 1,
        electricity,
        electricityType,
        water,
        waterType,
        internet,
        sanitation,
        parkingBike,
        parkingCar,
        managementFee,
        area,
        direction,
        floor,
        totalFloors,
        furniture = false,
        pets = false,
        availableFrom,
        vacantNow = true,
        photos = [],
        amenities = [],
        roadWidth,
        carAccess = false,
        truckAccess = false,
      } = req.body;

      const listing = await prisma.listing.create({
        data: {
          sellerId: req.user.id,
          title,
          roomType,
          houseNumber,
          alley,
          street,
          ward,
          district,
          city,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          rent: parseFloat(rent),
          depositMonths,
          electricity: electricity ? parseFloat(electricity) : null,
          electricityType,
          water: water ? parseFloat(water) : null,
          waterType,
          internet: internet ? parseFloat(internet) : null,
          sanitation: sanitation ? parseFloat(sanitation) : null,
          parkingBike: parkingBike ? parseFloat(parkingBike) : null,
          parkingCar: parkingCar ? parseFloat(parkingCar) : null,
          managementFee: managementFee ? parseFloat(managementFee) : null,
          area: area ? parseFloat(area) : null,
          direction,
          floor: floor ? parseInt(floor) : null,
          totalFloors: totalFloors ? parseInt(totalFloors) : null,
          furniture,
          pets,
          availableFrom,
          vacantNow,
          photos: JSON.stringify(photos),
          amenities: JSON.stringify(amenities),
          roadWidth: roadWidth ? parseFloat(roadWidth) : null,
          carAccess,
          truckAccess,
          status: 'pending', // Always pending for review
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'created',
          target: listing.id,
          targetType: 'listing',
          details: JSON.stringify({ title }),
        },
      });

      res.status(201).json({
        message: 'Tạo tin đăng thành công, đang chờ duyệt',
        listing: {
          ...listing,
          photos: JSON.parse(listing.photos),
          amenities: JSON.parse(listing.amenities),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// PUT /api/seller/listings/:id - Update listing
// ============================================
router.put(
  '/listings/:id',
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.listing.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }
      if (existing.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền sửa tin này' });
      }

      const allowedFields = [
        'title', 'roomType', 'houseNumber', 'alley', 'street', 'ward', 'district', 'city',
        'lat', 'lng', 'rent', 'depositMonths', 'electricity', 'electricityType',
        'water', 'waterType', 'internet', 'sanitation', 'parkingBike', 'parkingCar',
        'managementFee', 'area', 'direction', 'floor', 'totalFloors', 'furniture', 'pets',
        'availableFrom', 'vacantNow', 'photos', 'amenities', 'roadWidth', 'carAccess', 'truckAccess',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          let value = req.body[field];
          if (['rent', 'electricity', 'water', 'internet', 'sanitation', 'parkingBike', 'parkingCar', 'managementFee', 'area', 'roadWidth', 'lat', 'lng'].includes(field)) {
            value = value ? parseFloat(value) : null;
          }
          if (['floor', 'totalFloors', 'depositMonths'].includes(field)) {
            value = value ? parseInt(value) : null;
          }
          if (['photos', 'amenities'].includes(field)) {
            value = JSON.stringify(value);
          }
          updateData[field] = value;
        }
      }

      // If listing was rejected, set back to pending
      if (existing.status === 'rejected' || existing.status === 'inactive') {
        updateData.status = 'pending';
        updateData.rejectReason = null;
      }

      const listing = await prisma.listing.update({
        where: { id },
        data: updateData,
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'updated',
          target: listing.id,
          targetType: 'listing',
        },
      });

      res.json({
        message: 'Cập nhật tin đăng thành công',
        listing: {
          ...listing,
          photos: JSON.parse(listing.photos),
          amenities: JSON.parse(listing.amenities),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// DELETE /api/seller/listings/:id - Delete listing
// ============================================
router.delete('/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }
    if (existing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tin này' });
    }

    await prisma.listing.delete({ where: { id } });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'deleted',
        target: id,
        targetType: 'listing',
      },
    });

    res.json({ message: 'Xóa tin đăng thành công' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/profile - Get seller profile
// ============================================
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Hồ sơ seller không tìm thấy' });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/seller/profile - Update seller profile
// ============================================
router.put(
  '/profile',
  async (req, res, next) => {
    try {
      const { idNumber, brand, address, docs } = req.body;

      const profile = await prisma.sellerProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          idNumber,
          brand,
          address,
          docs: docs ? JSON.stringify(docs) : null,
          status: 'pending',
          submittedAt: new Date(),
        },
        update: {
          idNumber,
          brand,
          address,
          docs: docs ? JSON.stringify(docs) : null,
          status: 'pending', // Reset to pending on update
          submittedAt: new Date(),
        },
      });

      res.json({
        message: 'Cập nhật hồ sơ thành công',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/seller/leads - Get leads
// ============================================
router.get('/leads', async (req, res, next) => {
  try {
    const leads = await prisma.sellerLead.findMany({
      where: { sellerId: req.user.id },
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leads });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/seller/leads/:id - Update lead status
// ============================================
router.put('/leads/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lead = await prisma.sellerLead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead không tìm thấy' });
    }
    if (lead.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật lead này' });
    }

    const updated = await prisma.sellerLead.update({
      where: { id },
      data: { status },
    });

    res.json({ message: 'Cập nhật thành công', lead: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/appointments - Get appointments
// ============================================
router.get('/appointments', async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = {
      listing: { sellerId: req.user.id },
    };
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true },
        },
        tenant: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { when: 'asc' },
    });

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/seller/appointments/:id - Update appointment
// ============================================
router.put('/appointments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Lịch hẹn không tìm thấy' });
    }
    if (appointment.listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật lịch hẹn này' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    res.json({ message: 'Cập nhật thành công', appointment: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/dashboard - Dashboard stats
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const [listings, leads, appointments] = await Promise.all([
      prisma.listing.groupBy({
        by: ['status'],
        where: { sellerId: req.user.id },
        _count: true,
      }),
      prisma.sellerLead.count({
        where: { sellerId: req.user.id, status: 'new' },
      }),
      prisma.appointment.count({
        where: {
          listing: { sellerId: req.user.id },
          status: 'pending',
        },
      }),
    ]);

    const listingStats = {
      draft: 0,
      pending: 0,
      active: 0,
      rejected: 0,
      inactive: 0,
    };

    listings.forEach((l) => {
      listingStats[l.status] = l._count;
    });

    const totalViews = await prisma.listing.aggregate({
      where: { sellerId: req.user.id },
      _sum: { views: true },
    });

    res.json({
      stats: {
        listings: listingStats,
        newLeads: leads,
        pendingAppointments: appointments,
        totalViews: totalViews._sum.views || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
