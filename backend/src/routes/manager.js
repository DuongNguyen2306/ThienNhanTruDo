const express = require('express');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('manager', 'admin'));

// ============================================
// GET /api/manager/approvals - Pending listings
// ============================================
router.get('/approvals', async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          seller: {
            select: { id: true, fullName: true, phone: true, sellerProfile: true },
          },
        },
        orderBy: { createdAt: 'asc' }, // Oldest first (FIFO)
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings: listings.map((l) => ({
        ...l,
        photos: l.photos ? JSON.parse(l.photos) : [],
        amenities: l.amenities ? JSON.parse(l.amenities) : [],
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/manager/approvals/:id/approve
// ============================================
router.put('/approvals/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified = false, vip = false, highTrust = false } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({ error: 'Tin đăng không ở trạng thái chờ duyệt' });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        status: 'active',
        verified,
        vip,
        highTrust,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        rejectReason: null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'approved',
        target: id,
        targetType: 'listing',
        details: JSON.stringify({ verified, vip, highTrust }),
      },
    });

    res.json({
      message: 'Duyệt tin thành công',
      listing: {
        ...updated,
        photos: JSON.parse(updated.photos),
        amenities: JSON.parse(updated.amenities),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/manager/approvals/:id/reject
// ============================================
router.put('/approvals/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({ error: 'Tin đăng không ở trạng thái chờ duyệt' });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason || 'Tin đăng không đạt yêu cầu',
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'rejected',
        target: id,
        targetType: 'listing',
        details: JSON.stringify({ reason }),
      },
    });

    res.json({
      message: 'Từ chối tin thành công',
      listing: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/manager/seller-requests - Seller upgrade requests
// ============================================
router.get('/seller-requests', async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;

    const profiles = await prisma.sellerProfile.findMany({
      where: { status },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, email: true, createdAt: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    res.json({ requests: profiles });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/manager/seller-requests/:id/approve
// ============================================
router.put('/seller-requests/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await prisma.sellerProfile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    await prisma.$transaction([
      prisma.sellerProfile.update({
        where: { id },
        data: {
          status: 'active',
          reviewedAt: new Date(),
          reviewerId: req.user.id,
        },
      }),
      prisma.user.update({
        where: { id: profile.userId },
        data: { role: 'seller' },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'approved',
        target: id,
        targetType: 'seller_profile',
      },
    });

    res.json({ message: 'Duyệt seller thành công' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/manager/seller-requests/:id/reject
// ============================================
router.put('/seller-requests/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const profile = await prisma.sellerProfile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    const updated = await prisma.sellerProfile.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewerId: req.user.id,
        reviewNote: note,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'rejected',
        target: id,
        targetType: 'seller_profile',
        details: JSON.stringify({ note }),
      },
    });

    res.json({ message: 'Từ chối thành công', profile: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/manager/reports - Tenant reports
// ============================================
router.get('/reports', async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;

    const reports = await prisma.report.findMany({
      where: status !== 'all' ? { status } : {},
      include: {
        reporter: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/manager/reports/:id/resolve
// ============================================
router.put('/reports/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, action } = req.body;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        resolution,
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'resolved',
        target: id,
        targetType: 'report',
      },
    });

    res.json({ message: 'Xử lý báo cáo thành công', report: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/manager/stats - Approval stats
// ============================================
router.get('/stats', async (req, res, next) => {
  try {
    const [pending, approvedToday, rejectedToday, totalUsers] = await Promise.all([
      prisma.listing.count({ where: { status: 'pending' } }),
      prisma.listing.count({
        where: {
          status: 'active',
          reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.listing.count({
        where: {
          status: 'rejected',
          reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      pending,
      approvedToday,
      rejectedToday,
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/manager/audit - Audit log
// ============================================
router.get('/audit', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          actor: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
