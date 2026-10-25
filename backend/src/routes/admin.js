const express = require('express');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const revenueHelper = require('../helpers/revenueHelper');
const reviewHelper = require('../helpers/websiteReviewHelper');
const internalStore = require('../helpers/internalStore');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// ============================================
// VALIDATION CONSTANTS
// ============================================
const VALID_PROPOSAL_STATUSES = ['draft', 'pending', 'approved', 'rejected'];

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

// ============================================
// GET /api/admin/account-proposals - List all proposals
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

    const where = {};

    // Search by target user name or manager name
    if (search) {
      where.OR = [
        { targetUser: { fullName: { contains: search, mode: 'insensitive' } } },
        { manager: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by status
    if (status && VALID_PROPOSAL_STATUSES.includes(status)) {
      where.status = status;
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by priority
    if (priority) {
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
// GET /api/admin/account-proposals/stats - Admin stats
// ============================================
router.get('/account-proposals/stats', async (req, res, next) => {
  try {
    const [total, draft, pending, approved, rejected] = await Promise.all([
      prisma.accountModerationProposal.count(),
      prisma.accountModerationProposal.count({ where: { status: 'draft' } }),
      prisma.accountModerationProposal.count({ where: { status: 'pending' } }),
      prisma.accountModerationProposal.count({ where: { status: 'approved' } }),
      prisma.accountModerationProposal.count({ where: { status: 'rejected' } }),
    ]);

    res.json({ total, draft, pending, approved, rejected });
  } catch (err) {
    next(err);
  }
});

// ============================================
// GET /api/admin/account-proposals/:id - Get single proposal
// ============================================
router.get('/account-proposals/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposal = await prisma.accountModerationProposal.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, fullName: true, initials: true, role: true } },
        targetUser: { select: { id: true, fullName: true, role: true, phone: true, email: true, createdAt: true } },
        reviewer: { select: { id: true, fullName: true, initials: true } },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất' });
    }

    // Parse evidence
    let reportIds = [];
    if (proposal.evidence) {
      try { reportIds = JSON.parse(proposal.evidence); } catch { reportIds = []; }
    }

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
// POST /api/admin/account-proposals/:id/review - Approve or reject
// ============================================
router.post('/account-proposals/:id/review', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reviewNote } = req.body;
    const adminId = req.user.id;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action phải là "approve" hoặc "reject"' });
    }

    // Require reviewNote when rejecting
    if (action === 'reject' && !reviewNote) {
      return res.status(400).json({ error: 'reviewNote là bắt buộc khi từ chối đề xuất' });
    }

    // Check proposal exists and is pending
    const existing = await prisma.accountModerationProposal.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất' });
    }

    // Admin cannot review their own proposal
    if (existing.managerId === adminId) {
      return res.status(403).json({ error: 'Admin không thể tự duyệt đề xuất của mình' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        error: 'Chỉ có thể duyệt hoặc từ chối đề xuất đang ở trạng thái "pending"'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Use transaction for atomic update + audit + notification
    const proposal = await prisma.$transaction(async (tx) => {
      // Atomic update with status check (prevents race condition)
      const updateResult = await tx.accountModerationProposal.updateMany({
        where: {
          id,
          status: 'pending', // Only update if still pending
        },
        data: {
          status: newStatus,
          reviewerId: adminId,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      // Check if update was successful
      if (updateResult.count === 0) {
        throw new Error('CONFLICT: Đề xuất đã được xử lý bởi người khác');
      }

      // Get target user
      const targetUser = await tx.user.findUnique({
        where: { id: existing.targetUserId },
        select: { fullName: true },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: newStatus,
          target: id,
          targetType: 'proposal',
          details: JSON.stringify({ action, reviewNote, previousStatus: 'pending', newStatus }),
        },
      });

      // Create notification for manager
      await tx.notification.create({
        data: {
          userId: existing.managerId,
          type: 'system',
          title: action === 'approve' ? 'Đề xuất đã được chấp thuận' : 'Đề xuất đã bị từ chối',
          body: `Đề xuất xử lý tài khoản "${targetUser?.fullName || 'N/A'}" đã được ${
            action === 'approve' ? 'chấp thuận' : 'từ chối'
          }.${reviewNote ? ` Lý do: ${reviewNote}` : ''}`,
          link: `/manager/account-proposals/${id}`,
          metadata: JSON.stringify({ proposalId: id, action, newStatus }),
        },
      });

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
// GET /api/admin/dashboard - Admin dashboard
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();

    // ── "This month" = from the 1st of the current calendar month ────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // ── TASK 1: real user counts, filtered by role ───────────────────────
    const [
      totalUsers,
      totalTenants,
      totalSellers,
      totalManagers,
      totalAdmins,
      newUsersThisMonth,
      newUsersThisWeek,
      newUsersLastWeek,
      newTenantsThisMonth,
      newSellersThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'tenant' } }),
      prisma.user.count({ where: { role: 'seller' } }),
      prisma.user.count({ where: { role: 'manager' } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.user.count({ where: { role: 'tenant', createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { role: 'seller', createdAt: { gte: monthStart } } }),
    ]);

    const [totalListings, activeListings, pendingListings] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { status: 'pending' } }),
    ]);

    const newListingsThisWeek = await prisma.listing.count({ where: { createdAt: { gte: weekAgo } } });

    // ── TASK 2: revenue, computed with the canonical helper ──────────────
    // Only completed transactions are loaded; pending/failed are counted
    // separately so they can be reported WITHOUT being counted as revenue.
    const revenueTransactions = await prisma.transaction.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        method: true,
        description: true,
        createdAt: true,
      },
    });
    const revenue = revenueHelper.summarizeTransactions(revenueTransactions);

    // ── TASK 2: revenue for the CURRENT calendar month ───────────────────
    // The "all time" figure and the "this month" figure come from the SAME
    // helper, so the dashboard can never show two inconsistent numbers.
    const monthTransactions = revenueTransactions.filter(
      (tx) => new Date(tx.createdAt) >= monthStart
    );
    const monthlyRevenue = revenueHelper.summarizeTransactions(monthTransactions);

    // Listing status breakdown
    const listingStats = await prisma.listing.groupBy({ by: ['status'], _count: true });
    const listingsByStatus = {};
    listingStats.forEach((s) => {
      listingsByStatus[s.status] = s._count;
    });

    // User role breakdown
    const userStats = await prisma.user.groupBy({ by: ['role'], _count: true });
    const usersByRole = {};
    userStats.forEach((s) => {
      usersByRole[s.role] = s._count;
    });

    // ── TASK 4/5: website review activity + aggregate ───────────────────
    const [reviewAggregate, reviewActivity, roomReviewCount] = await Promise.all([
      reviewHelper.getAggregate(),
      reviewHelper.getActivitySeries({ buckets: 12 }),
      prisma.review.count(),
    ]);

    res.json({
      stats: {
        // Task 1 — user statistics
        totalUsers,
        totalTenants,
        totalSellers,
        totalManagers,
        totalAdmins,
        newUsersThisMonth,
        newUsersThisWeek,
        newUsersLastWeek,
        newTenantsThisMonth,
        newSellersThisMonth,
        usersByRole,

        // Listings
        totalListings,
        activeListings,
        pendingListings,
        newListingsThisWeek,
        listingsByStatus,

        // Task 2 — revenue (canonical figures)
        totalRevenue: revenue.grossRevenue,
        netRevenue: revenue.netRevenue,
        totalRefunded: revenue.refunds,
        totalDeposits: revenue.deposits,
        pendingAmount: revenue.pendingAmount,
        failedAmount: revenue.failedAmount,
        totalTransactions: revenueTransactions.length,
        revenueCategories: revenue.categories,

        // Task 2 — revenue for the current calendar month
        monthlyRevenue: monthlyRevenue.grossRevenue,
        monthlyNetRevenue: monthlyRevenue.netRevenue,
        monthlyRefundCount: monthlyRevenue.refundCount,
        monthlyRevenueCount: monthlyRevenue.revenueCount,

        // Task 5 — reviews
        websiteReviewCount: reviewAggregate.totalReviews,
        websiteReviewAverage: reviewAggregate.average,
        roomReviewCount,
        reviewActivity,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/dashboard/users-growth
// New-user growth over time (Task 4 chart).
// ============================================
router.get('/dashboard/users-growth', async (req, res, next) => {
  try {
    const { period = 'month', buckets = 12 } = req.query;
    const bucketCount = Math.min(24, Math.max(3, parseInt(buckets, 10) || 12));

    const now = new Date();

    // Build a continuous axis so empty periods still render as zero.
    const axis = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      axis.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`,
        total: 0,
        tenant: 0,
        seller: 0,
      });
    }
    const index = new Map(axis.map((a) => [a.key, a]));

    // Load users created within the axis window.
    const windowStart = new Date(now.getFullYear(), now.getMonth() - (bucketCount - 1), 1);
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { role: true, createdAt: true },
    });

    for (const u of users) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = index.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (u.role === 'tenant') bucket.tenant += 1;
      else if (u.role === 'seller') bucket.seller += 1;
    }

    res.json({
      period: period === 'day' ? 'day' : 'month',
      series: axis.map((a) => ({
        label: a.label,
        key: a.key,
        total: a.total,
        tenant: a.tenant,
        seller: a.seller,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/users - User management
// ============================================
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

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
          createdAt: true,
          sellerProfile: {
            select: { status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
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
// GET /api/admin/users/:id - Get user detail
// ============================================
router.get('/users/:id', async (req, res, next) => {
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
        createdAt: true,
        updatedAt: true,
        sellerProfile: {
          select: { status: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/admin/users/:id/role - Change user role
// ============================================
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['tenant', 'seller', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự thay đổi vai trò của mình' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'updated',
        target: id,
        targetType: 'user',
        details: JSON.stringify({ role }),
      },
    });

    res.json({ message: 'Cập nhật vai trò thành công', user });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/admin/users/:id - Delete user
// ============================================
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự xóa tài khoản của mình' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'deleted',
        target: id,
        targetType: 'user',
      },
    });

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/listings - All listings
// ============================================
router.get('/listings', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { id: { contains: search } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          seller: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings: listings.map((l) => ({
        ...l,
        photos: l.photos ? JSON.parse(l.photos) : [],
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
// GET /api/admin/listings/:id - Get listing detail
// ============================================
router.get('/listings/:id', async (req, res, next) => {
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
            role: true,
            sellerProfile: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ message: 'Không tìm thấy tin đăng' });
    }

    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/admin/listings/:id/status - Update listing status
// ============================================
router.put('/listings/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'pending', 'active', 'rejected', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: status === 'active' ? 'listing_approved' : status === 'rejected' ? 'listing_rejected' : 'listing_updated',
        target: id,
        targetType: 'listing',
        details: `Status changed to ${status}`,
      },
    });

    res.json({ listing });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/admin/listings/:id - Delete listing
// ============================================
router.delete('/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.listing.delete({ where: { id } });

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
// GET /api/admin/transactions - Transaction history
// ============================================
// TASK 6: supports `search`, `startDate` and `endDate` so a dashboard metric
// can deep-link into exactly the transactions that produced it.
router.get('/transactions', async (req, res, next) => {
  try {
    const { type, status, method, search, startDate, endDate, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (method) where.method = method;

    const dateFilter = revenueHelper.buildDateRange(startDate, endDate);
    if (dateFilter) where.createdAt = dateFilter.createdAt;

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { description: { contains: search } },
        { vnpayTxRef: { contains: search } },
        { user: { fullName: { contains: search } } },
        { user: { phone: { contains: search } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    // Annotate each row with its derived category so the admin UI can show
    // the product category without re-implementing the classification rules.
    const annotated = transactions.map((t) => ({
      ...t,
      category: revenueHelper.classifyTransaction(t).category,
      isRevenue: revenueHelper.isRecognizedRevenue(t),
    }));

    res.json({
      transactions: annotated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/finance/overview - Finance overview stats
// ============================================
// TASK 2: every figure below comes from revenueHelper.summarizeTransactions,
// which is the single source of truth for revenue math.
//
//  • totalRevenue  = recognized revenue (completed `payment` transactions only)
//  • netRevenue    = totalRevenue − refunds
//  • totalDeposits = wallet top-ups — a LIABILITY, reported separately so it
//                    can never be mistaken for revenue
//  • pendingAmount = unpaid purchases — NOT revenue
// ============================================
router.get('/finance/overview', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = revenueHelper.buildDateRange(startDate, endDate);

    const where = {};
    if (dateFilter) where.createdAt = dateFilter.createdAt;

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        method: true,
        description: true,
        createdAt: true,
      },
    });

    const summary = revenueHelper.summarizeTransactions(transactions);

    // The "period" figure is the same as the total when no range is given.
    const hasRange = Boolean(dateFilter);

    res.json({
      totalRevenue: summary.grossRevenue,
      periodRevenue: summary.grossRevenue,
      netRevenue: summary.netRevenue,
      totalRefunded: summary.refunds,
      totalDeposits: summary.deposits,
      totalWithdrawals: summary.withdrawals,
      pendingAmount: summary.pendingAmount,
      failedAmount: summary.failedAmount,
      completedCount: summary.revenueCount,
      revenueCount: summary.revenueCount,
      refundCount: summary.refundCount,
      depositCount: summary.depositCount,
      pendingCount: summary.pendingCount,
      failedCount: summary.failedCount,
      transactionCount: transactions.length,
      categories: summary.categories,
      hasRange,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/finance/chart - Revenue chart data
// ============================================
// TASK 2 FIX: the previous implementation filtered `status: 'completed'` in the
// query and then branched on `tx.status === 'refunded'`, so the refund branch
// was unreachable and refunds NEVER appeared in the chart.
//
// Now ALL transactions in range are loaded and bucketed by the helper, which
// keeps revenue, refunds and wallet deposits in SEPARATE series. Deposits are
// never added to the revenue series, so the chart cannot present a wallet
// top-up as earned revenue.
// ============================================
router.get('/finance/chart', async (req, res, next) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    const dateFilter = revenueHelper.buildDateRange(startDate, endDate);

    const where = {};
    if (dateFilter) where.createdAt = dateFilter.createdAt;

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        method: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = revenueHelper.bucketTransactions(transactions, period);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/finance/sources - Revenue by product category
// ============================================
// TASK 2 FIX: the previous implementation grouped by the raw `type` field, so
// wallet top-ups appeared side-by-side with genuine revenue and the totals
// double counted money.
//
// Categories are now derived from (type, method, status, description) and the
// response separates revenue categories from non-revenue ones.
// ============================================
router.get('/finance/sources', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = revenueHelper.buildDateRange(startDate, endDate);

    const where = {};
    if (dateFilter) where.createdAt = dateFilter.createdAt;

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        method: true,
        description: true,
        createdAt: true,
      },
    });

    const summary = revenueHelper.summarizeTransactions(transactions);

    res.json({
      // Revenue categories only (the breakdown the task asks for).
      revenue: summary.categories.filter((c) => c.isRevenue),
      // Non-revenue flows, shown separately so nothing is double counted.
      nonRevenue: summary.categories.filter((c) => !c.isRevenue),
      grossRevenue: summary.grossRevenue,
      netRevenue: summary.netRevenue,
      totalDeposits: summary.deposits,
      totalRefunded: summary.refunds,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/config - System config
// ============================================
// Internal records (OTP state, website-review claims, session epochs) share the
// SystemConfig collection. They are filtered out here so operators only ever
// see real configuration keys.
router.get('/config', async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configObj = {};
    configs.forEach((c) => {
      if (internalStore.isInternalKey(c.key)) return;
      try {
        configObj[c.key] = JSON.parse(c.value);
      } catch {
        configObj[c.key] = c.value;
      }
    });

    res.json({ config: configObj });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/admin/config - Update system config
// ============================================
router.put('/config', async (req, res, next) => {
  try {
    const { key, value, description } = req.body;

    const config = await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value), description },
      update: { value: JSON.stringify(value), description },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'updated',
        target: key,
        targetType: 'config',
      },
    });

    res.json({ message: 'Cập nhật cấu hình thành công', config });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/audit - Full audit log
// ============================================
router.get('/audit', async (req, res, next) => {
  try {
    const { actorId, action, targetType, page = 1, limit = 50 } = req.query;

    const where = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
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
// GET /api/admin/reviews - Admin review history (Task 5)
// ============================================
// Covers BOTH review types so the admin has a single history view:
//   • website reviews  (rating for the platform)
//   • room reviews     (rating for a listing)
//
// Every row links back to the record that produced it, so a reviewer, a rating
// and its qualifying transaction are always traceable (Task 6).
// This route is admin-only (enforced by the router-level authorize('admin')).
router.get('/reviews', async (req, res, next) => {
  try {
    const {
      type = 'all', // all | website | room
      search = '',
      status = '',
      score = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const q = String(search || '').trim().toLowerCase();

    const dateFilter = revenueHelper.buildDateRange(startDate, endDate);
    const scoreNum = score ? Number(score) : null;
    const validScore = scoreNum !== null && Number.isFinite(scoreNum) ? scoreNum : null;

    // ── Website reviews ────────────────────────────────────────────────
    let websiteRows = [];
    if (type === 'all' || type === 'website') {
      const { items } = await reviewHelper.listReviews({
        search: q,
        status: status === 'all' ? '' : status,
        score: validScore ? String(validScore) : '',
        startDate,
        endDate,
        page: 1,
        limit: 1000, // filter + paginate in memory to merge both sources
      });
      websiteRows = items.map((r) => ({
        id: r.id,
        reviewType: 'website',
        reviewerId: r.userId,
        reviewerName: r.reviewerName,
        reviewerInitials: r.reviewerInitials,
        reviewerRole: r.reviewerRole,
        score: r.score,
        title: r.title,
        content: r.content,
        status: r.status,
        hiddenReason: r.hiddenReason,
        adminReply: r.adminReply,
        createdAt: r.createdAt,
        listing: null,
        transaction: {
          id: r.transactionId,
          amount: r.transactionAmount,
          method: r.transactionMethod,
          description: r.transactionDescription,
          createdAt: r.transactionCreatedAt,
        },
      }));
    }

    // ── Room (listing) reviews ─────────────────────────────────────────
    let roomRows = [];
    if (type === 'all' || type === 'room') {
      const where = {};
      if (status && status !== 'all') {
        where.hidden = status === 'hidden';
      }
      if (validScore !== null) {
        where.score = validScore;
      }
      if (dateFilter) {
        where.createdAt = dateFilter.createdAt;
      }
      if (q) {
        where.OR = [
          { text: { contains: q } },
          { author: { fullName: { contains: q } } },
          { listing: { title: { contains: q } } },
        ];
      }

      const rows = await prisma.review.findMany({
        where,
        include: {
          author: { select: { id: true, fullName: true, initials: true, role: true } },
          listing: { select: { id: true, title: true, image: true, district: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      roomRows = rows.map((r) => ({
        id: r.id,
        reviewType: 'room',
        reviewerId: r.authorId,
        reviewerName: r.author?.fullName || '—',
        reviewerInitials: r.author?.initials || '??',
        reviewerRole: r.author?.role || null,
        score: r.score,
        title: null,
        content: r.text,
        status: r.hidden ? 'hidden' : 'published',
        hiddenReason: r.hiddenReason,
        adminReply: null,
        createdAt: r.createdAt,
        listing: r.listing
          ? { id: r.listing.id, title: r.listing.title, image: r.listing.image, district: r.listing.district }
          : null,
        transaction: null,
      }));
    }

    // ── Merge + sort + paginate ────────────────────────────────────────
    const merged = [...websiteRows, ...roomRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = merged.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const safePage = Math.min(pageNum, totalPages);
    const start = (safePage - 1) * limitNum;
    const items = merged.slice(start, start + limitNum);

    res.json({
      reviews: items,
      pagination: {
        page: safePage,
        limit: limitNum,
        total,
        totalPages,
      },
      counts: {
        website: websiteRows.length,
        room: roomRows.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/reviews/stats - Review statistics
// ============================================
router.get('/reviews/stats', async (req, res, next) => {
  try {
    const [websiteAggregate, roomTotal, roomHidden] = await Promise.all([
      reviewHelper.getAggregate(),
      prisma.review.count(),
      prisma.review.count({ where: { hidden: true } }),
    ]);

    res.json({
      website: {
        average: websiteAggregate.average,
        totalReviews: websiteAggregate.totalReviews,
        distribution: websiteAggregate.distribution,
        hiddenCount: websiteAggregate.hiddenCount,
        flaggedCount: websiteAggregate.flaggedCount,
      },
      room: {
        totalReviews: roomTotal,
        hiddenCount: roomHidden,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
