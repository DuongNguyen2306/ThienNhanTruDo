const express = require('express');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

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
    const [
      totalUsers,
      totalListings,
      activeListings,
      pendingListings,
      totalSellers,
      totalTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { role: 'seller' } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Growth stats (compare last 7 days vs previous 7 days)
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const [newUsersThisWeek, newListingsThisWeek] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.listing.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    // Listing status breakdown
    const listingStats = await prisma.listing.groupBy({
      by: ['status'],
      _count: true,
    });

    const listingsByStatus = {};
    listingStats.forEach((s) => {
      listingsByStatus[s.status] = s._count;
    });

    // User role breakdown
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const usersByRole = {};
    userStats.forEach((s) => {
      usersByRole[s.role] = s._count;
    });

    res.json({
      stats: {
        totalUsers,
        totalListings,
        activeListings,
        pendingListings,
        totalSellers,
        totalTransactions: totalTransactions._count,
        totalRevenue: totalTransactions._sum.amount || 0,
        newUsersThisWeek,
        newListingsThisWeek,
        listingsByStatus,
        usersByRole,
      },
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
router.get('/transactions', async (req, res, next) => {
  try {
    const { type, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

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

    res.json({
      transactions,
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
// GET /api/admin/finance/overview - Finance overview stats
// ============================================
router.get('/finance/overview', async (req, res, next) => {
  try {
    // Total revenue: only count COMPLETED transactions
    const [totalRevenue, completedCount, totalRefunded, pendingCount, transactionCount] = await Promise.all([
      // Sum of completed payment transactions
      prisma.transaction.aggregate({
        where: { status: 'completed', type: 'payment' },
        _sum: { amount: true },
      }),
      // Count of completed transactions
      prisma.transaction.count({ where: { status: 'completed' } }),
      // Sum of refunded amounts (only count from 'refunded' status)
      prisma.transaction.aggregate({
        where: { status: 'refunded' },
        _sum: { amount: true },
      }),
      // Count of pending transactions
      prisma.transaction.count({ where: { status: 'pending' } }),
      // Total transaction count
      prisma.transaction.count(),
    ]);

    const totalRev = totalRevenue._sum.amount || 0;
    const refunded = totalRefunded._sum.amount || 0;

    res.json({
      totalRevenue: totalRev, // Gross revenue (completed only)
      periodRevenue: totalRev, // For now, same as total since we don't have period filter yet
      completedCount,
      totalRefunded: refunded,
      netRevenue: totalRev - refunded, // Net = Gross - Refunds
      pendingCount,
      transactionCount,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/finance/chart - Revenue chart data
// ============================================
router.get('/finance/chart', async (req, res, next) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    
    // Build date filter
    let start = new Date();
    let end = new Date();
    
    if (startDate) start = new Date(startDate);
    if (endDate) end = new Date(endDate);
    
    // Default: last 30 days
    if (!startDate && !endDate) {
      start.setDate(start.getDate() - 30);
    }
    
    // Get all completed transactions in date range
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    // Group by period
    const grouped = {};
    
    transactions.forEach((tx) => {
      const date = new Date(tx.createdAt);
      let key;
      
      switch (period) {
        case 'week':
          // Week number
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const q = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${q}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default: // day
          key = date.toISOString().slice(0, 10);
      }
      
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, count: 0, refunds: 0 };
      }
      
      if (tx.status === 'completed') {
        grouped[key].revenue += tx.amount;
        grouped[key].count += 1;
      } else if (tx.status === 'refunded') {
        grouped[key].refunds += tx.amount;
      }
    });
    
    // Convert to array with labels
    const result = Object.entries(grouped).map(([key, data]) => {
      let label;
      switch (period) {
        case 'week':
          label = `Tuần ${key}`;
          break;
        case 'month':
          const [y, m] = key.split('-');
          label = `Tháng ${parseInt(m)}/${y}`;
          break;
        case 'quarter':
          label = key;
          break;
        case 'year':
          label = `Năm ${key}`;
          break;
        default:
          const d = new Date(key);
          label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
      return {
        label,
        revenue: Math.round(data.revenue),
        count: data.count,
        refunds: Math.round(data.refunds),
      };
    });
    
    // Sort by key
    result.sort((a, b) => a.label.localeCompare(b.label));
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/finance/sources - Revenue by type
// ============================================
router.get('/finance/sources', async (req, res, next) => {
  try {
    const sources = await prisma.transaction.groupBy({
      by: ['type'],
      where: { status: 'completed' },
      _sum: { amount: true },
      _count: true,
    });
    
    const total = sources.reduce((sum, s) => sum + (s._sum.amount || 0), 0);
    
    const result = sources.map((s) => ({
      type: s.type,
      total: s._sum.amount || 0,
      count: s._count,
      percentage: total > 0 ? Math.round((s._sum.amount || 0) / total * 100) : 0,
    }));
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/admin/config - System config
// ============================================
router.get('/config', async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany();

    const configObj = {};
    configs.forEach((c) => {
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

module.exports = router;
