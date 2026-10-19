const express = require('express');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('manager', 'admin'));

// ============================================
// VALIDATION CONSTANTS
// ============================================
const VALID_PROPOSAL_TYPES = ['inspection', 'warning', 'suspension_request'];
const VALID_PROPOSAL_REASONS = ['spam', 'fake_listing', 'violation', 'fraud', 'suspicious', 'harassment', 'other'];
const VALID_PROPOSAL_PRIORITIES = ['low', 'medium', 'high'];
const VALID_PROPOSAL_STATUSES = ['draft', 'pending', 'approved', 'rejected'];
const EXCLUDED_ROLES = ['admin', 'manager'];

// ============================================
// HELPERS
// ============================================
async function createNotification(userId, type, title, body, link = null, metadata = null) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      link,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

async function createAuditLog(actorId, action, target, targetType, details = null) {
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      target,
      targetType,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

function validateProposalInput(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!body.targetUserId) errors.push('targetUserId là bắt buộc');
    if (!body.type || !VALID_PROPOSAL_TYPES.includes(body.type)) {
      errors.push(`type phải là một trong: ${VALID_PROPOSAL_TYPES.join(', ')}`);
    }
    if (!body.reason || !VALID_PROPOSAL_REASONS.includes(body.reason)) {
      errors.push(`reason phải là một trong: ${VALID_PROPOSAL_REASONS.join(', ')}`);
    }
  } else {
    if (body.type && !VALID_PROPOSAL_TYPES.includes(body.type)) {
      errors.push(`type phải là một trong: ${VALID_PROPOSAL_TYPES.join(', ')}`);
    }
    if (body.reason && !VALID_PROPOSAL_REASONS.includes(body.reason)) {
      errors.push(`reason phải là một trong: ${VALID_PROPOSAL_REASONS.join(', ')}`);
    }
  }
  if (body.priority && !VALID_PROPOSAL_PRIORITIES.includes(body.priority)) {
    errors.push(`priority phải là một trong: ${VALID_PROPOSAL_PRIORITIES.join(', ')}`);
  }
  if (body.evidence) {
    try {
      const evidenceArr = typeof body.evidence === 'string' ? JSON.parse(body.evidence) : body.evidence;
      if (!Array.isArray(evidenceArr)) {
        errors.push('evidence phải là một mảng');
      }
    } catch (e) {
      errors.push('evidence phải là JSON array hợp lệ');
    }
  }
  return errors;
}

// ============================================
// GET /api/manager/account-proposals - List proposals by current manager
// ============================================
router.get('/account-proposals', async (req, res, next) => {
  try {
    const {
      search = '',
      status = '',
      type = '',
      priority = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const managerId = req.user.id;
    const where = { managerId };

    // Search by target user name
    if (search) {
      where.targetUser = { fullName: { contains: search, mode: 'insensitive' } };
    }

    // Filter by status
    if (status && VALID_PROPOSAL_STATUSES.includes(status)) {
      where.status = status;
    }

    // Filter by type
    if (type && VALID_PROPOSAL_TYPES.includes(type)) {
      where.type = type;
    }

    // Filter by priority
    if (priority && VALID_PROPOSAL_PRIORITIES.includes(priority)) {
      where.priority = priority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [proposals, total] = await Promise.all([
      prisma.accountModerationProposal.findMany({
        where,
        include: {
          manager: { select: { id: true, fullName: true, initials: true } },
          targetUser: { select: { id: true, fullName: true, role: true, phone: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      prisma.accountModerationProposal.count({ where }),
    ]);

    // Transform for safe display
    const formattedProposals = proposals.map((p) => ({
      id: p.id,
      type: p.type,
      reason: p.reason,
      description: p.description,
      priority: p.priority,
      status: p.status,
      evidenceCount: p.evidence ? (() => {
        try { return JSON.parse(p.evidence).length; } catch { return 0; }
      })() : 0,
      createdAt: p.createdAt,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
      manager: p.manager,
      targetUser: {
        id: p.targetUser.id,
        fullName: p.targetUser.fullName,
        role: p.targetUser.role,
        phone: p.targetUser.phone ? p.targetUser.phone.slice(0, 4) + '***' + p.targetUser.phone.slice(-3) : null,
      },
    }));

    res.json({
      proposals: formattedProposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// GET /api/manager/account-proposals/stats - Stats for current manager
// ============================================
router.get('/account-proposals/stats', async (req, res, next) => {
  try {
    const managerId = req.user.id;

    const [total, draft, pending, approved, rejected] = await Promise.all([
      prisma.accountModerationProposal.count({ where: { managerId } }),
      prisma.accountModerationProposal.count({ where: { managerId, status: 'draft' } }),
      prisma.accountModerationProposal.count({ where: { managerId, status: 'pending' } }),
      prisma.accountModerationProposal.count({ where: { managerId, status: 'approved' } }),
      prisma.accountModerationProposal.count({ where: { managerId, status: 'rejected' } }),
    ]);

    res.json({ total, draft, pending, approved, rejected });
  } catch (err) {
    next(err);
  }
});

// ============================================
// GET /api/manager/account-proposals/:id - Get single proposal
// ============================================
router.get('/account-proposals/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    const proposal = await prisma.accountModerationProposal.findFirst({
      where: { id, managerId },
      include: {
        manager: { select: { id: true, fullName: true, initials: true, role: true } },
        targetUser: { select: { id: true, fullName: true, role: true, phone: true, email: true, createdAt: true } },
        reviewer: { select: { id: true, fullName: true, initials: true } },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất hoặc bạn không có quyền xem' });
    }

    // Parse evidence to get report IDs
    let reportIds = [];
    if (proposal.evidence) {
      try {
        reportIds = JSON.parse(proposal.evidence);
      } catch { reportIds = []; }
    }

    // Fetch linked reports if any
    let linkedReports = [];
    if (reportIds.length > 0) {
      linkedReports = await prisma.report.findMany({
        where: { id: { in: reportIds } },
        select: { id: true, title: true, reason: true, severity: true, status: true, createdAt: true },
      });
    }

    res.json({
      ...proposal,
      phone: proposal.targetUser.phone ? proposal.targetUser.phone.slice(0, 4) + '***' + proposal.targetUser.phone.slice(-3) : null,
      linkedReports,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// POST /api/manager/account-proposals - Create new proposal
// ============================================
router.post('/account-proposals', async (req, res, next) => {
  try {
    const { targetUserId, type, reason, description, priority, evidence } = req.body;
    const managerId = req.user.id;

    // Validate input
    const errors = validateProposalInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Check target user exists and is not admin/manager
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản mục tiêu' });
    }
    if (EXCLUDED_ROLES.includes(targetUser.role)) {
      return res.status(403).json({ error: 'Không thể tạo đề xuất xử lý tài khoản Admin hoặc Manager' });
    }

    // Validate evidence report IDs exist
    let validEvidence = null;
    if (evidence && evidence.length > 0) {
      const evidenceArr = typeof evidence === 'string' ? JSON.parse(evidence) : evidence;
      const reports = await prisma.report.findMany({
        where: { id: { in: evidenceArr } },
        select: { id: true },
      });
      const validIds = reports.map((r) => r.id);
      validEvidence = JSON.stringify(validIds);
    }

    const proposal = await prisma.accountModerationProposal.create({
      data: {
        managerId,
        targetUserId,
        type,
        reason,
        description,
        priority: priority || 'medium',
        evidence: validEvidence,
        status: 'draft',
      },
    });

    // Audit log
    await createAuditLog(managerId, 'created', proposal.id, 'proposal', {
      targetUserId,
      type,
      reason,
    });

    res.status(201).json({ proposal });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PUT /api/manager/account-proposals/:id - Update draft proposal
// ============================================
router.put('/account-proposals/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;
    const { type, reason, description, priority, evidence } = req.body;

    // Check ownership and status
    const existing = await prisma.accountModerationProposal.findFirst({
      where: { id, managerId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất hoặc bạn không có quyền sửa' });
    }
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Chỉ có thể sửa đề xuất ở trạng thái bản nháp' });
    }

    // Validate input
    const errors = validateProposalInput(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Validate evidence report IDs
    let validEvidence = existing.evidence;
    if (evidence !== undefined) {
      if (evidence && evidence.length > 0) {
        const evidenceArr = typeof evidence === 'string' ? JSON.parse(evidence) : evidence;
        const reports = await prisma.report.findMany({
          where: { id: { in: evidenceArr } },
          select: { id: true },
        });
        const validIds = reports.map((r) => r.id);
        validEvidence = JSON.stringify(validIds);
      } else {
        validEvidence = null;
      }
    }

    const proposal = await prisma.accountModerationProposal.update({
      where: { id },
      data: {
        type: type || existing.type,
        reason: reason || existing.reason,
        description: description !== undefined ? description : existing.description,
        priority: priority || existing.priority,
        evidence: validEvidence,
      },
    });

    await createAuditLog(managerId, 'updated', id, 'proposal', { changes: req.body });

    res.json({ proposal });
  } catch (err) {
    next(err);
  }
});

// ============================================
// POST /api/manager/account-proposals/:id/submit - Submit draft to pending
// ============================================
router.post('/account-proposals/:id/submit', async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    // Check ownership and status
    const existing = await prisma.accountModerationProposal.findFirst({
      where: { id, managerId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất hoặc bạn không có quyền gửi' });
    }
    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Chỉ có thể gửi đề xuất ở trạng thái bản nháp' });
    }

    // Use transaction for atomic update + audit + notification
    const proposal = await prisma.$transaction(async (tx) => {
      // Atomic update with status check (prevents race condition)
      const updateResult = await tx.accountModerationProposal.updateMany({
        where: {
          id,
          managerId,
          status: 'draft', // Only update if still draft
        },
        data: {
          status: 'pending',
          submittedAt: new Date(),
        },
      });

      // Check if update was successful
      if (updateResult.count === 0) {
        throw new Error('CONFLICT: Đề xuất đã được gửi bởi người khác');
      }

      // Get target user
      const targetUser = await tx.user.findUnique({
        where: { id: existing.targetUserId },
        select: { fullName: true },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: managerId,
          action: 'submitted',
          target: id,
          targetType: 'proposal',
          details: JSON.stringify({
            targetUserId: existing.targetUserId,
            type: existing.type,
            reason: existing.reason,
          }),
        },
      });

      // Find all admins
      const admins = await tx.user.findMany({
        where: { role: 'admin' },
        select: { id: true },
      });

      // Create notifications for all admins
      await Promise.all(
        admins.map((admin) =>
          tx.notification.create({
            data: {
              userId: admin.id,
              type: 'system',
              title: 'Đề xuất xử lý tài khoản mới',
              body: `Manager ${req.user.fullName || 'N/A'} đã gửi đề xuất xử lý tài khoản "${targetUser?.fullName || 'N/A'}"`,
              link: `/admin/account-proposals/${id}`,
              metadata: JSON.stringify({ proposalId: id, type: existing.type, priority: existing.priority }),
            },
          })
        )
      );

      // Return updated proposal
      return tx.accountModerationProposal.findUnique({ where: { id } });
    });

    res.json({ proposal });
  } catch (err) {
    if (err.message.includes('CONFLICT')) {
      return res.status(409).json({ error: err.message.replace('CONFLICT: ', '') });
    }
    next(err);
  }
});

// ============================================
// GET /api/manager/accounts - List all users (Tenant & Seller)
// ============================================
router.get('/accounts', async (req, res, next) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where = {};
    
    // Search by name or phone
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Filter by role (only tenant or seller for manager)
    if (role && ['tenant', 'seller'].includes(role)) {
      where.role = role;
    } else {
      // Manager can only see tenants and sellers
      where.role = { in: ['tenant', 'seller'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          initials: true,
          title: true,
          twoFactor: true,
          createdAt: true,
          updatedAt: true,
          sellerProfile: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
            },
          },
          _count: {
            select: {
              listings: true,
              appointments: true,
              reports: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    // Transform to safe display format
    const accounts = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone ? u.phone.slice(0, 4) + '***' + u.phone.slice(-3) : null,
      phoneRaw: u.phone,
      email: u.email,
      role: u.role,
      initials: u.initials || u.fullName?.slice(0, 2).toUpperCase(),
      title: u.title,
      twoFactor: u.twoFactor,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      sellerStatus: u.sellerProfile?.status || null,
      sellerSubmittedAt: u.sellerProfile?.submittedAt || null,
      sellerReviewedAt: u.sellerProfile?.reviewedAt || null,
      listingsCount: u._count.listings,
      appointmentsCount: u._count.appointments,
      reportsCount: u._count.reports,
    }));

    res.json({
      accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// GET /api/manager/accounts/stats - Account statistics
// ============================================
router.get('/accounts/stats', async (req, res, next) => {
  try {
    const [total, tenants, sellers, pendingReviews] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['tenant', 'seller'] } } }),
      prisma.user.count({ where: { role: 'tenant' } }),
      prisma.user.count({ where: { role: 'seller' } }),
      // Accounts needing review: sellers with pending status
      prisma.user.count({
        where: {
          role: 'seller',
          sellerProfile: { status: 'pending' },
        },
      }),
    ]);

    res.json({
      total,
      tenants,
      sellers,
      pendingReviews,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// GET /api/manager/accounts/:id - Account detail
// ============================================
router.get('/accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        initials: true,
        title: true,
        twoFactor: true,
        createdAt: true,
        updatedAt: true,
        sellerProfile: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            reviewerId: true,
            reviewNote: true,
            address: true,
            idNumber: true,
            brand: true,
          },
        },
        _count: {
          select: {
            listings: true,
            appointments: true,
            reports: true,
            savedListings: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    // Get listings with status
    const listings = await prisma.listing.findMany({
      where: { sellerId: id },
      select: {
        id: true,
        title: true,
        status: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get recent activity from audit logs
    const activities = await prisma.auditLog.findMany({
      where: { actorId: id },
      select: {
        id: true,
        action: true,
        targetType: true,
        target: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get reports where this user is the reporter OR the report is about their listings
    // Get user's listings first
    const userListingIds = listings.map((l) => l.id);
    
    const reports = await prisma.report.findMany({
      where: {
        OR: [
          { reporterId: id },
          { listingId: { in: userListingIds } },
        ],
      },
      select: {
        id: true,
        reason: true,
        severity: true,
        status: true,
        title: true,
        createdAt: true,
        listingId: true,
        reporter: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone ? user.phone.slice(0, 4) + '***' + user.phone.slice(-3) : null,
      phoneRaw: user.phone,
      email: user.email,
      role: user.role,
      initials: user.initials,
      title: user.title,
      twoFactor: user.twoFactor,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sellerProfile: user.sellerProfile ? {
        id: user.sellerProfile.id,
        status: user.sellerProfile.status,
        submittedAt: user.sellerProfile.submittedAt,
        reviewedAt: user.sellerProfile.reviewedAt,
        reviewNote: user.sellerProfile.reviewNote,
        address: user.sellerProfile.address,
        idNumber: user.sellerProfile.idNumber ? user.sellerProfile.idNumber.slice(0, 4) + '****' + user.sellerProfile.idNumber.slice(-3) : null,
        brand: user.sellerProfile.brand,
      } : null,
      listings,
      activities,
      reports: reports.map(r => ({
        ...r,
        listing: r.listingId ? listings.find(l => l.id === r.listingId) || { id: r.listingId, title: 'Tin đã xóa' } : null,
      })),
      stats: {
        totalListings: user._count.listings,
        activeListings: listings.filter((l) => l.status === 'active').length,
        totalAppointments: user._count.appointments,
        totalReports: user._count.reports,
        savedListings: user._count.savedListings,
      },
    });
  } catch (err) {
    next(err);
  }
});

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
// GET /api/manager/approvals/:id - Get single listing detail
// ============================================
router.get('/approvals/:id', async (req, res, next) => {
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
            email: true,
            sellerProfile: true,
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

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

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'tin',
        title: 'Tin đăng đã được duyệt!',
        body: `Tin "${listing.title}" đã được duyệt và hiển thị công khai.`,
        link: `/seller/listings/${listing.id}`,
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

    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'canhbao',
        title: 'Tin đăng bị từ chối',
        body: `Tin "${listing.title}" không được duyệt. Lý do: ${reason || 'Không đạt yêu cầu'}.`,
        link: `/seller/listings/${listing.id}`,
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

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const profiles = await prisma.sellerProfile.findMany({
      where,
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
// GET /api/manager/seller-requests/:id - Get single request detail
// ============================================
router.get('/seller-requests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, email: true, createdAt: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    res.json({ request: profile });
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

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'system',
        title: 'Yêu cầu nâng cấp đã được duyệt!',
        body: 'Bạn đã trở thành Người đăng tin. Bây giờ bạn có thể đăng tin cho thuê.',
        link: '/seller',
      },
    });

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

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'canhbao',
        title: 'Yêu cầu nâng cấp bị từ chối',
        body: `Yêu cầu của bạn bị từ chối. Lý do: ${note || 'Không đạt yêu cầu'}.`,
        link: '/tai-khoan/nang-cap',
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
// GET /api/manager/reports/:id - Get single report detail
// ============================================
router.get('/reports/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch report with reporter
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, fullName: true, phone: true, email: true, role: true },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    // Fetch related listing if listingId exists
    let listing = null;
    if (report.listingId) {
      const listingData = await prisma.listing.findUnique({
        where: { id: report.listingId },
        select: {
          id: true,
          title: true,
          rent: true,
          status: true,
          image: true,
          photos: true,
          sellerId: true,
        },
      });
      if (listingData) {
        listing = {
          ...listingData,
          price: listingData.rent, // Map rent to price for frontend
        };
      }
    }

    res.json({ report: { ...report, listing } });
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

// ============================================
// GET /api/manager/reviews - List all reviews for moderation
// ============================================
router.get('/reviews', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const where = {};
    
    // Status filter: visible, hidden, all
    if (status === 'hidden') {
      where.hidden = true;
    } else if (status === 'visible') {
      where.hidden = false;
    }
    
    // Search by listing title or author name
    if (search) {
      where.OR = [
        { listing: { title: { contains: search, mode: 'insensitive' } } },
        { author: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          author: { select: { id: true, fullName: true, phone: true } },
          listing: { select: { id: true, title: true, sellerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.review.count({ where }),
    ]);
    
    res.json({
      reviews,
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
// GET /api/manager/reviews/:id - Get review details
// ============================================
router.get('/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true, phone: true, email: true } },
        listing: { 
          select: { 
            id: true, 
            title: true, 
            sellerId: true,
            seller: { select: { id: true, fullName: true } },
          } 
        },
      },
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }
    
    // Get related reports if any
    const reports = await prisma.report.findMany({
      where: { listingId: review.listingId },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ review, reports });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/manager/reviews/:id/hide - Hide a review
// ============================================
router.patch('/reviews/:id/hide', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }
    
    const updated = await prisma.review.update({
      where: { id },
      data: {
        hidden: true,
        hiddenReason: reason || 'Vi phạm chính sách nội dung',
        hiddenAt: new Date(),
        hiddenBy: req.user.id,
      },
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'hide_review',
        target: id,
        targetType: 'review',
        details: JSON.stringify({ reason }),
      },
    });
    
    // Recalculate listing rating (excluding hidden reviews)
    const visibleReviews = await prisma.review.findMany({
      where: { listingId: review.listingId, hidden: false },
      select: { score: true },
    });
    
    const avgRating = visibleReviews.length > 0
      ? visibleReviews.reduce((sum, r) => sum + r.score, 0) / visibleReviews.length
      : 0;
    
    await prisma.listing.update({
      where: { id: review.listingId },
      data: {
        rating: avgRating,
        reviewCount: visibleReviews.length,
      },
    });
    
    res.json({
      message: 'Đã ẩn đánh giá',
      review: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/manager/reviews/:id/unhide - Unhide a review
// ============================================
router.patch('/reviews/:id/unhide', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }
    
    const updated = await prisma.review.update({
      where: { id },
      data: {
        hidden: false,
        hiddenReason: null,
        hiddenAt: null,
        hiddenBy: null,
      },
    });
    
    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'unhide_review',
        target: id,
        targetType: 'review',
      },
    });
    
    // Recalculate listing rating
    const visibleReviews = await prisma.review.findMany({
      where: { listingId: review.listingId, hidden: false },
      select: { score: true },
    });
    
    const avgRating = visibleReviews.length > 0
      ? visibleReviews.reduce((sum, r) => sum + r.score, 0) / visibleReviews.length
      : 0;
    
    await prisma.listing.update({
      where: { id: review.listingId },
      data: {
        rating: avgRating,
        reviewCount: visibleReviews.length,
      },
    });
    
    res.json({
      message: 'Đã hiển thị lại đánh giá',
      review: updated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
