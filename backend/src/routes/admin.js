const express = require('express');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

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
    const { type, status, page = 1, limit = 50 } = req.query;

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
        skip: (page - 1) * limit,
        take: limit,
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
