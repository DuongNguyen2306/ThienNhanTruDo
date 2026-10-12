const express = require('express');
const { body } = require('express-validator');
const prisma = require('../db');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ============================================
// GET /api/tenant/saved - Saved listings
// ============================================
router.get('/saved', async (req, res, next) => {
  try {
    const saved = await prisma.savedListing.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: {
            seller: {
              select: { id: true, fullName: true, sellerProfile: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      listings: saved.map((s) => ({
        ...s.listing,
        photos: s.listing.photos ? JSON.parse(s.listing.photos) : [],
        amenities: s.listing.amenities ? JSON.parse(s.listing.amenities) : [],
        savedAt: s.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/tenant/saved/:listingId - Save listing
// ============================================
router.post('/saved/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    const existing = await prisma.savedListing.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Tin đăng đã được lưu trước đó' });
    }

    await prisma.savedListing.create({
      data: {
        userId: req.user.id,
        listingId,
      },
    });

    res.json({ message: 'Đã lưu tin đăng' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/tenant/saved/:listingId - Unsave listing
// ============================================
router.delete('/saved/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;

    await prisma.savedListing.deleteMany({
      where: {
        userId: req.user.id,
        listingId,
      },
    });

    res.json({ message: 'Đã bỏ lưu tin đăng' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/tenant/appointments - Book appointment
// ============================================
router.post(
  '/appointments',
  [
    body('listingId').notEmpty().withMessage('ID tin đăng không được trống'),
    body('when').isISO8601().withMessage('Thời gian hẹn không hợp lệ'),
    body('phone').optional().isMobilePhone('vi-VN'),
    body('note').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, when, phone, note } = req.body;

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }
      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Tin đăng không còn hoạt động' });
      }

      const appointment = await prisma.appointment.create({
        data: {
          listingId,
          tenantId: req.user.id,
          when: new Date(when),
          phone: phone || req.user.phone,
          note,
        },
      });

      res.status(201).json({
        message: 'Đặt lịch hẹn thành công',
        appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/tenant/appointments - My appointments
// ============================================
router.get('/appointments', async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = { tenantId: req.user.id };
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true, image: true, rent: true, address: true },
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
// DELETE /api/tenant/appointments/:id - Cancel appointment
// ============================================
router.delete('/appointments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    }
    if (appointment.tenantId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy lịch hẹn này' });
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Hủy lịch hẹn thành công' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/tenant/leads - Send lead to seller
// ============================================
router.post(
  '/leads',
  [
    body('listingId').optional().isString(),
    body('name').notEmpty().withMessage('Tên không được trống'),
    body('phone').isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
    body('message').optional().isString(),
    body('when').optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, name, phone, message, when } = req.body;

      // Find seller from listing if listingId provided
      let sellerId;
      if (listingId) {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
          select: { sellerId: true },
        });
        if (!listing) {
          return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
        }
        sellerId = listing.sellerId;
      }

      if (!sellerId) {
        return res.status(400).json({ error: 'Không xác định được người nhận' });
      }

      const lead = await prisma.sellerLead.create({
        data: {
          listingId,
          sellerId,
          name,
          phone,
          message,
          when: when ? new Date(when) : null,
        },
      });

      res.status(201).json({
        message: 'Đã gửi liên hệ thành công',
        lead,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/tenant/reviews - Create review
// ============================================
router.post(
  '/reviews',
  [
    body('listingId').notEmpty().withMessage('ID tin đăng không được trống'),
    body('score').isFloat({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải từ 1-5'),
    body('photoMatch').optional().isFloat({ min: 1, max: 5 }),
    body('landlord').optional().isFloat({ min: 1, max: 5 }),
    body('security').optional().isFloat({ min: 1, max: 5 }),
    body('hygiene').optional().isFloat({ min: 1, max: 5 }),
    body('text').optional().isString(),
    body('verifiedStay').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, score, photoMatch, landlord, security, hygiene, text, verifiedStay } = req.body;

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }

      // Check if user already reviewed
      const existing = await prisma.review.findFirst({
        where: { listingId, authorId: req.user.id },
      });

      if (existing) {
        return res.status(409).json({ error: 'Bạn đã đánh giá tin đăng này' });
      }

      const review = await prisma.review.create({
        data: {
          listingId,
          authorId: req.user.id,
          score,
          photoMatch,
          landlord,
          security,
          hygiene,
          text,
          verifiedStay: verifiedStay || false,
        },
      });

      // Update listing rating
      const allReviews = await prisma.review.findMany({
        where: { listingId },
        select: { score: true },
      });

      const avgRating = allReviews.reduce((sum, r) => sum + r.score, 0) / allReviews.length;

      await prisma.listing.update({
        where: { id: listingId },
        data: {
          rating: avgRating,
          reviewCount: allReviews.length,
        },
      });

      res.status(201).json({
        message: 'Cảm ơn bạn đã đánh giá',
        review,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/tenant/reports - Report listing
// ============================================
router.post(
  '/reports',
  [
    body('listingId').optional().isString(),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Mức độ không hợp lệ'),
    body('title').notEmpty().withMessage('Tiêu đề không được trống'),
    body('reason').notEmpty().withMessage('Lý do không được trống'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, severity, title, reason, tone } = req.body;

      const report = await prisma.report.create({
        data: {
          listingId,
          reporterId: req.user.id,
          severity,
          title,
          reason,
          tone,
        },
      });

      res.status(201).json({
        message: 'Đã gửi báo cáo, chúng tôi sẽ xử lý sớm nhất',
        report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/tenant/profile - Get tenant profile
// ============================================
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        role: true,
        initials: true,
        createdAt: true,
      },
    });

    const stats = await Promise.all([
      prisma.appointment.count({ where: { tenantId: req.user.id } }),
      prisma.savedListing.count({ where: { userId: req.user.id } }),
      prisma.review.count({ where: { authorId: req.user.id } }),
    ]);

    res.json({
      user,
      stats: {
        appointments: stats[0],
        savedListings: stats[1],
        reviews: stats[2],
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
