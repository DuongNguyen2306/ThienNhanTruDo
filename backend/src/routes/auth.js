const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const config = require('../config');
const { validate } = require('../middleware/errorHandler');
const { authenticate, ROLES } = require('../middleware/auth');
const { authRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Get initials from name
const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
};

// Get role title in Vietnamese
const getRoleTitle = (role) => {
  const titles = {
    tenant: 'Người thuê',
    seller: 'Chủ đăng tin',
    manager: 'Ban quản lý',
    admin: 'Quản trị viên',
  };
  return titles[role] || role;
};

// ============================================
// POST /api/auth/register
// ============================================
router.post(
  '/register',
  registerRateLimiter,
  [
    body('phone').isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    body('fullName').notEmpty().withMessage('Họ tên không được trống'),
    body('email').optional().isEmail().withMessage('Email không hợp lệ'),
    body('role').optional().isIn(['tenant', 'seller']).withMessage('Vai trò không hợp lệ'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { phone, password, fullName, email, role = 'tenant' } = req.body;

      // Check if user exists
      const existing = await prisma.user.findFirst({
        where: { OR: [{ phone }, email ? { email } : {}] },
      });

      if (existing) {
        return res.status(409).json({ error: 'Số điện thoại hoặc email đã được sử dụng' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          fullName,
          email: email || null,
          role,
          initials: getInitials(fullName),
          title: getRoleTitle(role),
        },
      });

      // If seller, create seller profile
      if (role === 'seller') {
        await prisma.sellerProfile.create({
          data: {
            userId: user.id,
            status: 'pending',
          },
        });
      }

      const token = generateToken(user);

      res.status(201).json({
        message: 'Đăng ký thành công',
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          initials: user.initials,
          title: user.title,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/login
// ============================================
router.post(
  '/login',
  authRateLimiter,
  [
    body('phone').isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
    body('password').notEmpty().withMessage('Mật khẩu không được trống'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { phone, password } = req.body;

      const user = await prisma.user.findUnique({ where: { phone } });

      if (!user) {
        return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không đúng' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không đúng' });
      }

      const token = generateToken(user);

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'login',
          target: user.id,
          targetType: 'user',
        },
      });

      res.json({
        message: 'Đăng nhập thành công',
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          initials: user.initials,
          title: user.title,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        sellerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        initials: user.initials,
        title: user.title,
        sellerStatus: user.sellerProfile?.status || 'none',
        sellerProfile: user.sellerProfile,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/auth/profile
// ============================================
router.put(
  '/profile',
  authenticate,
  [
    body('fullName').optional().notEmpty().withMessage('Họ tên không được trống'),
    body('email').optional().isEmail().withMessage('Email không hợp lệ'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { fullName, email } = req.body;

      const updateData = {};
      if (fullName) {
        updateData.fullName = fullName;
        updateData.initials = getInitials(fullName);
      }
      if (email !== undefined) updateData.email = email || null;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'updated',
          target: user.id,
          targetType: 'user',
          details: JSON.stringify({ fields: Object.keys(updateData) }),
        },
      });

      res.json({
        message: 'Cập nhật thành công',
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          initials: user.initials,
          title: user.title,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// PUT /api/auth/password
// ============================================
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại không được trống'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
      });

      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/logout
// ============================================
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'logout',
        target: req.user.id,
        targetType: 'user',
      },
    });

    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/apply-seller
// Apply to become a seller (for authenticated TENANT)
// ============================================
router.post(
  '/apply-seller',
  authenticate,
  [
    body('idNumber').notEmpty().withMessage('CCCD không được trống'),
    body('idNumber').isLength({ min: 12, max: 12 }).withMessage('CCCD phải đủ 12 số'),
    body('idNumber').isNumeric().withMessage('CCCD chỉ được chứa số'),
    body('permanentAddress').notEmpty().withMessage('Địa chỉ thường trú không được trống'),
    body('permanentAddress').isLength({ min: 10 }).withMessage('Địa chỉ thường trú phải có ít nhất 10 ký tự'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { idNumber, permanentAddress } = req.body;
      const userId = req.user.id;

      // Only tenants can apply
      if (req.user.role !== 'tenant') {
        return res.status(403).json({ error: 'Chỉ người thuê mới có thể đăng ký làm chủ trọ' });
      }

      // Get user with seller profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { sellerProfile: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Người dùng không tồn tại' });
      }

      // Check if already a seller or has pending application
      if (user.sellerProfile) {
        if (user.sellerProfile.status === 'pending') {
          return res.status(409).json({ error: 'Hồ sơ đang chờ xét duyệt. Vui lòng chờ Manager duyệt.' });
        }
        if (user.sellerProfile.status === 'active') {
          return res.status(409).json({ error: 'Bạn đã là chủ trọ rồi' });
        }
        if (user.sellerProfile.status === 'rejected') {
          // Allow resubmission - update the rejected profile
          await prisma.sellerProfile.update({
            where: { userId },
            data: {
              idNumber,
              address: permanentAddress,
              status: 'pending',
              rejectionReason: null,
              reviewedAt: null,
              reviewedBy: null,
            },
          });

          return res.json({
            message: 'Hồ sơ đã được gửi lại để xét duyệt',
            status: 'pending',
          });
        }
      }

      // Create new seller profile
      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId,
          idNumber,
          address: permanentAddress,
          status: 'pending',
        },
      });

      res.status(201).json({
        message: 'Đăng ký thành công. Hồ sơ đang chờ Manager duyệt.',
        status: 'pending',
        sellerProfile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// GET /api/auth/seller-application
// Get seller application status
// ============================================
router.get('/seller-application', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { sellerProfile: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    if (!user.sellerProfile) {
      return res.json({
        hasApplied: false,
        status: null,
        canApply: req.user.role === 'tenant',
      });
    }

    res.json({
      hasApplied: true,
      status: user.sellerProfile.status,
      sellerProfile: {
        id: user.sellerProfile.id,
        status: user.sellerProfile.status,
        rejectionReason: user.sellerProfile.rejectionReason,
        reviewedAt: user.sellerProfile.reviewedAt,
        createdAt: user.sellerProfile.createdAt,
      },
      canApply: false,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
