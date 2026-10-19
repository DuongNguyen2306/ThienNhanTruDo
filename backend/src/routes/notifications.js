const express = require('express');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ============================================
// GET /api/notifications - Get user's notifications
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    const where = { userId: req.user.id };
    
    if (type) {
      where.type = type;
    }
    
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, read: false },
      }),
    ]);

    // Parse metadata if exists
    const formatted = notifications.map(n => ({
      ...n,
      body: n.message, // Map message to body for frontend compatibility
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));

    res.json({
      notifications: formatted,
      unreadCount,
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
// GET /api/notifications/unread-count - Get unread count
// ============================================
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/notifications/:id/read - Mark as read
// ============================================
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Thông báo không tồn tại' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem thông báo này' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ notification: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/notifications/read-all - Mark all as read
// ============================================
router.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/notifications/:id - Delete notification
// ============================================
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Thông báo không tồn tại' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa thông báo này' });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Helper function to create notification (used by other routes)
// ============================================
const createNotification = async (userId, type, title, body, link = null, metadata = null) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
