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

      // Gửi thông báo cho chủ phòng (seller)
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: 'hen',
          title: 'Yêu cầu xem phòng mới',
          body: `${req.user.fullName} muốn xem phòng "${listing.title}" vào lúc ${new Date(when).toLocaleString('vi-VN')}`,
          link: `/seller/appointments`,
          metadata: JSON.stringify({ appointmentId: appointment.id, listingId }),
        },
      });

      // Gửi thông báo cho tenant đã đặt hẹn
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          type: 'hen',
          title: 'Đặt hẹn xem phòng thành công',
          body: `Bạn đã đặt hẹn xem phòng "${listing.title}" vào lúc ${new Date(when).toLocaleString('vi-VN')}. Vui lòng chờ chủ phòng xác nhận.`,
          link: `/tai-khoan/lich-hen`,
          metadata: JSON.stringify({ appointmentId: appointment.id, listingId }),
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
    
    console.log('[tenant/appointments] userId:', req.user?.id);

    const where = { tenantId: req.user.id };
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        listing: {
          select: { 
            id: true, 
            title: true, 
            image: true, 
            rent: true, 
            houseNumber: true,
            alley: true,
            street: true,
            ward: true,
            district: true,
            city: true,
          },
        },
      },
      orderBy: { when: 'asc' },
    });

    res.json({ appointments, total: appointments.length });
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
// GET /api/tenant/reviews - Get current user's reviews
// ============================================
router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { authorId: req.user.id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            image: true,
            district: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/tenant/reviews/eligibility/:listingId - Check if user can review
// ============================================
router.get('/reviews/eligibility/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    // Check if user is the seller (cannot review own listing)
    if (listing.sellerId === userId) {
      return res.json({
        eligible: false,
        reason: 'Bạn không thể đánh giá tin đăng của chính mình',
      });
    }

    // Check for confirmed/completed appointment (seller confirmed the viewing)
    const confirmedAppointment = await prisma.appointment.findFirst({
      where: {
        listingId,
        tenantId: userId,
        status: { in: ['confirmed', 'completed'] },
      },
    });
    
    // Alias for clarity
    const completedAppointment = confirmedAppointment;

    // Check for existing review
    const existingReview = await prisma.review.findFirst({
      where: { listingId, authorId: userId },
      select: { id: true },
    });

    // Check for active reservation (rental verification)
    const activeReservation = await prisma.reservation.findFirst({
      where: {
        listingId,
        tenantId: userId,
        status: 'approved',
      },
    });

    // Determine eligibility
    const hasVerifiedStay = !!completedAppointment || !!activeReservation;
    const eligible = hasVerifiedStay && !existingReview;
    let reason = '';

    if (existingReview) {
      reason = 'Bạn đã đánh giá tin đăng này';
    } else if (!hasVerifiedStay) {
      reason = 'Bạn cần chờ chủ trọ xác nhận lịch hẹn trước khi đánh giá';
    }

    res.json({
      eligible,
      reason,
      hasCompletedAppointment: !!completedAppointment,
      hasActiveReservation: !!activeReservation,
      hasExistingReview: !!existingReview,
      existingReviewId: existingReview?.id || null,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/tenant/reviews/listing/:listingId - Get reviews for a listing
// ============================================
router.get('/reviews/listing/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { listingId },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            initials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate rating stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.score, 0) / totalReviews
      : 0;

    // Star distribution
    const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.round(r.score);
      if (star >= 1 && star <= 5) {
        starDistribution[star]++;
      }
    });

    res.json({
      reviews,
      stats: {
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        starDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/tenant/reviews/:id - Update own review
// ============================================
router.patch(
  '/reviews/:id',
  [
    body('score').optional().isFloat({ min: 1, max: 5 }),
    body('photoMatch').optional().isFloat({ min: 1, max: 5 }),
    body('landlord').optional().isFloat({ min: 1, max: 5 }),
    body('security').optional().isFloat({ min: 1, max: 5 }),
    body('hygiene').optional().isFloat({ min: 1, max: 5 }),
    body('text').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { score, photoMatch, landlord, security, hygiene, text } = req.body;

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
      }

      if (review.authorId !== req.user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền sửa đánh giá này' });
      }

      const updated = await prisma.review.update({
        where: { id },
        data: {
          ...(score !== undefined && { score }),
          ...(photoMatch !== undefined && { photoMatch }),
          ...(landlord !== undefined && { landlord }),
          ...(security !== undefined && { security }),
          ...(hygiene !== undefined && { hygiene }),
          ...(text !== undefined && { text }),
        },
      });

      // Recalculate listing rating
      const allReviews = await prisma.review.findMany({
        where: { listingId: review.listingId },
        select: { score: true },
      });

      const avgRating = allReviews.reduce((sum, r) => sum + r.score, 0) / allReviews.length;

      await prisma.listing.update({
        where: { id: review.listingId },
        data: {
          rating: avgRating,
          reviewCount: allReviews.length,
        },
      });

      res.json({
        message: 'Đã cập nhật đánh giá',
        review: updated,
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
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, score, photoMatch, landlord, security, hygiene, text } = req.body;
      const userId = req.user.id;

      // Check if user is tenant
      if (req.user.role !== 'tenant') {
        return res.status(403).json({ error: 'Chỉ người thuê mới có thể đánh giá' });
      }

      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true },
      });
      if (!listing) {
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }

      // Cannot review own listing
      if (listing.sellerId === userId) {
        return res.status(403).json({ error: 'Bạn không thể đánh giá tin đăng của chính mình' });
      }

      // Check eligibility: seller confirmed appointment OR active reservation
      const confirmedAppointment = await prisma.appointment.findFirst({
        where: { 
          listingId, 
          tenantId: userId, 
          status: { in: ['confirmed', 'completed'] } 
        },
      });

      const activeReservation = await prisma.reservation.findFirst({
        where: { listingId, tenantId: userId, status: 'approved' },
      });

      if (!confirmedAppointment && !activeReservation) {
        return res.status(403).json({
          error: 'Bạn cần chờ chủ trọ xác nhận lịch hẹn trước khi đánh giá.',
        });
      }

      // Check if user already reviewed
      const existing = await prisma.review.findFirst({
        where: { listingId, authorId: userId },
      });

      if (existing) {
        return res.status(409).json({ error: 'Bạn đã đánh giá tin đăng này. Bạn có thể chỉnh sửa đánh giá hiện tại.' });
      }

      const verifiedStay = !!(confirmedAppointment || activeReservation);

      const review = await prisma.review.create({
        data: {
          listingId,
          authorId: userId,
          score,
          photoMatch,
          landlord,
          security,
          hygiene,
          text,
          verifiedStay,
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

// ============================================
// POST /api/tenant/upgrade - Request seller upgrade
// ============================================
router.post(
  '/upgrade',
  [
    body('idNumber').notEmpty().withMessage('Số CCCD không được trống'),
    body('brand').optional().isString(),
    body('address').optional().isString(),
    body('docs').optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { idNumber, brand, address, docs } = req.body;

      // Check if user is already a seller or has pending request
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { sellerProfile: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Người dùng không tồn tại' });
      }

      if (user.role === 'seller' || user.role === 'manager' || user.role === 'admin') {
        return res.status(400).json({ error: 'Bạn đã là người đăng tin' });
      }

      if (user.sellerProfile) {
        if (user.sellerProfile.status === 'pending') {
          return res.status(409).json({ error: 'Yêu cầu đang được xử lý. Vui lòng chờ.' });
        }
        if (user.sellerProfile.status === 'active') {
          // Update role to seller
          await prisma.user.update({
            where: { id: req.user.id },
            data: { role: 'seller' },
          });
          return res.json({ 
            message: 'Tài khoản đã là người đăng tin',
            status: 'active' 
          });
        }
        // If rejected or none, update existing profile
        const updated = await prisma.sellerProfile.update({
          where: { id: user.sellerProfile.id },
          data: {
            idNumber,
            brand,
            address,
            docs: docs ? JSON.stringify(docs) : null,
            status: 'pending',
            submittedAt: new Date(),
          },
        });
        return res.json({
          message: 'Yêu cầu đã được gửi lại',
          profile: updated,
        });
      }

      // Create new seller profile
      const profile = await prisma.sellerProfile.create({
        data: {
          userId: req.user.id,
          idNumber,
          brand,
          address,
          docs: docs ? JSON.stringify(docs) : null,
          status: 'pending',
          submittedAt: new Date(),
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'requested_upgrade',
          target: profile.id,
          targetType: 'seller_profile',
        },
      });

      res.status(201).json({
        message: 'Yêu cầu nâng cấp đã được gửi. Vui lòng chờ Manager duyệt.',
        profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/tenant/upgrade - Get upgrade status
// ============================================
router.get('/upgrade', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { sellerProfile: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    if (user.role === 'seller' || user.role === 'manager' || user.role === 'admin') {
      return res.json({
        status: 'active',
        role: user.role,
        message: 'Bạn đã là người đăng tin',
      });
    }

    if (!user.sellerProfile) {
      return res.json({
        status: 'none',
        role: user.role,
        message: 'Bạn chưa gửi yêu cầu nâng cấp',
      });
    }

    res.json({
      status: user.sellerProfile.status,
      role: user.role,
      submittedAt: user.sellerProfile.submittedAt,
      reviewedAt: user.sellerProfile.reviewedAt,
      reviewNote: user.sellerProfile.reviewNote,
      message: user.sellerProfile.status === 'pending'
        ? 'Yêu cầu đang được xử lý'
        : user.sellerProfile.status === 'rejected'
          ? 'Yêu cầu bị từ chối'
          : 'Không xác định',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/tenant/reservations - Create reservation request
// ============================================
router.post(
  '/reservations',
  [
    body('listingId').notEmpty().withMessage('ID phòng không được trống'),
    body('note').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { listingId, note } = req.body;

      // Get listing info
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { seller: true },
      });

      if (!listing) {
        return res.status(404).json({ error: 'Phòng không tồn tại' });
      }

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Phòng không nhận giữ chỗ' });
      }

      // Check for existing pending reservation
      const existing = await prisma.reservation.findFirst({
        where: {
          tenantId: req.user.id,
          listingId,
          status: 'pending',
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'Bạn đã có yêu cầu giữ chỗ đang chờ' });
      }

      // Check for approved reservation (prevent duplicates)
      const existingApproved = await prisma.reservation.findFirst({
        where: {
          tenantId: req.user.id,
          listingId,
          status: 'approved',
        },
      });

      if (existingApproved) {
        return res.status(409).json({ error: 'Bạn đã có yêu cầu giữ chỗ được chấp thuận cho phòng này' });
      }

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          tenantId: req.user.id,
          sellerId: listing.sellerId,
          listingId,
          note,
          status: 'pending',
        },
      });

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: 'coc',
          title: 'Yêu cầu giữ chỗ mới',
          body: `Có người muốn giữ chỗ phòng "${listing.title}".`,
          link: `/seller/reservations`,
          metadata: JSON.stringify({ reservationId: reservation.id, listingId }),
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'created',
          target: reservation.id,
          targetType: 'reservation',
        },
      });

      res.status(201).json({
        message: 'Yêu cầu giữ chỗ đã được gửi',
        reservation,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/tenant/reservations - Get tenant's reservations
// ============================================
router.get('/reservations', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: { tenantId: req.user.id },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              image: true,
              district: true,
              city: true,
              rent: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.reservation.count({ where: { tenantId: req.user.id } }),
    ]);

    res.json({
      reservations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/tenant/reservations/:id - Get reservation detail
// ============================================
router.get('/reservations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            image: true,
            district: true,
            city: true,
            rent: true,
            street: true,
            houseNumber: true,
          },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
    }

    if (reservation.tenantId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem yêu cầu này' });
    }

    res.json({ reservation });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/tenant/reservations/:id/cancel - Cancel reservation
// ============================================
router.patch('/reservations/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
    }

    if (reservation.tenantId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy yêu cầu này' });
    }

    if (!['pending', 'approved'].includes(reservation.status)) {
      return res.status(400).json({ error: 'Không thể hủy yêu cầu ở trạng thái này' });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'tenant',
        sellerNote: reason || null,
      },
    });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: reservation.sellerId,
        type: 'coc',
        title: 'Yêu cầu giữ chỗ đã bị hủy',
        body: `Người thuê đã hủy yêu cầu giữ chỗ phòng.`,
        link: `/seller/reservations`,
        metadata: JSON.stringify({ reservationId: id }),
      },
    });

    res.json({
      message: 'Đã hủy yêu cầu giữ chỗ',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/tenant/contracts - Get tenant's contracts
// ============================================
router.get('/contracts', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where: { tenantId: req.user.id },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              image: true,
              district: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.contract.count({ where: { tenantId: req.user.id } }),
    ]);

    res.json({
      contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/tenant/contracts/:id - Get contract detail
// ============================================
router.get('/contracts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            image: true,
            district: true,
            city: true,
            street: true,
            houseNumber: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
    }

    if (contract.tenantId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem hợp đồng này' });
    }

    res.json({ contract });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
