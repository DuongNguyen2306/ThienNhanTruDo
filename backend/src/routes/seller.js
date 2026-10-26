const express = require('express');
const { body } = require('express-validator');
const prisma = require('../db');
const { validate } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// Apply auth to all seller routes
router.use(authenticate);
router.use(authorize('seller'));

// Base URL used to build absolute URLs for uploaded files.
//
// Resolution order:
//   1. `API_BASE_URL` from the environment — set this in every deployment.
//   2. The request's own origin — correct for local development and for any
//      deployment behind a proxy that sets the standard forwarding headers.
//   3. `http://localhost:<port>` — the local default.
//
// There is deliberately no hardcoded legacy host here: a stale fallback
// would make the app serve images from a server that is no longer the
// source of truth.
function resolveApiBase(req) {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/+$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];

  if (forwardedHost) {
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https';
    return `${proto}://${forwardedHost}`;
  }

  return `http://localhost:${config.port}`;
}

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
// GET /api/seller/listings/:id - Get single listing detail
// ============================================
router.get('/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id } });
    
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }
    
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem tin này' });
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

    // Calculate response rate based on leads
    const allLeads = await prisma.sellerLead.count({
      where: { sellerId: req.user.id },
    });
    const contactedLeads = await prisma.sellerLead.count({
      where: { 
        sellerId: req.user.id,
        status: { not: 'new' },
      },
    });

    const responseRate = allLeads > 0 
      ? Math.round((contactedLeads / allLeads) * 100) 
      : 100;

    // Calculate trust score based on reviews and listings
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user.id, status: 'active' },
      select: { rating: true, views: true },
    });

    let trustScore = 0;
    if (listings.length > 0) {
      const totalRating = listings.reduce((sum, l) => sum + (l.rating || 0), 0);
      const avgRating = totalRating / listings.length;
      // Trust score formula: 60% rating + 20% response + 20% verification
      trustScore = (avgRating * 0.6) + (responseRate * 0.2 / 100) + (profile.status === 'active' ? 2 : 0);
      trustScore = Math.min(5, Math.round(trustScore * 10) / 10);
    }

    res.json({ 
      profile: {
        ...profile,
        responseRate,
        trustScore,
      },
    });
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

// ============================================
// POST /api/seller/upload - Upload photos for a listing
// ============================================
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Configure storage for seller uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOAD_DIR, req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `${timestamp}-${randomSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20,
  },
});

// Upload photos for a listing
router.post('/upload', (req, res, next) => {
  const uploadHandler = upload.array('photos', 20);
  
  uploadHandler(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File quá lớn. Kích thước tối đa là 10MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Quá nhiều file. Tối đa 20 file.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { listingId } = req.body;
    
    // If listingId provided, verify ownership
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
      });
      
      if (!listing) {
        // Clean up uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach(f => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          });
        }
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }
      
      if (listing.sellerId !== req.user.id) {
        // Clean up uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach(f => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          });
        }
        return res.status(403).json({ error: 'Bạn không có quyền tải ảnh cho tin này' });
      }
      
      // Append new photos to existing listing
      const existingPhotos = listing.photos ? JSON.parse(listing.photos) : [];
      const newPhotoUrls = req.files.map(f => `/uploads/${req.user.id}/${f.filename}`);
      const updatedPhotos = [...existingPhotos, ...newPhotoUrls];
      
      await prisma.listing.update({
        where: { id: listingId },
        data: { photos: JSON.stringify(updatedPhotos) },
      });
    }
    
    // Return uploaded file URLs with full path
    const apiBase = resolveApiBase(req);
    const uploadedFiles = req.files.map(f => ({
      url: `${apiBase}/uploads/${req.user.id}/${f.filename}`,
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
    }));
    
    res.json({
      success: true,
      files: uploadedFiles,
      message: `Đã tải lên ${uploadedFiles.length} ảnh`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/seller/upload/:filename - Delete a photo
// ============================================
router.delete('/upload/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { listingId } = req.query;
    
    // Security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Tên file không hợp lệ' });
    }
    
    const filePath = path.join(UPLOAD_DIR, req.user.id, filename);
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    // If listingId provided, verify ownership and remove from listing
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { sellerId: true, photos: true },
      });
      
      if (!listing) {
        return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
      }
      
      if (listing.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa ảnh này' });
      }
      
      // Remove from listing photos
      const existingPhotos = listing.photos ? JSON.parse(listing.photos) : [];
      const updatedPhotos = existingPhotos.filter(p => !p.endsWith(filename));
      
      await prisma.listing.update({
        where: { id: listingId },
        data: { photos: JSON.stringify(updatedPhotos) },
      });
    }
    
    // Delete physical file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Đã xóa ảnh',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/seller/listings/:id/photos - Update listing photos
// ============================================
router.put('/listings/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const { photos } = req.body;
    
    const listing = await prisma.listing.findUnique({
      where: { id },
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }
    
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền sửa tin này' });
    }
    
    // Validate photos array
    if (!Array.isArray(photos)) {
      return res.status(400).json({ error: 'Photos phải là mảng' });
    }
    
    // Update listing photos
    const updated = await prisma.listing.update({
      where: { id },
      data: { photos: JSON.stringify(photos) },
    });
    
    res.json({
      success: true,
      photos: JSON.parse(updated.photos),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/reservations - Get seller's reservations
// ============================================
router.get('/reservations', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const where = { sellerId: req.user.id };
    if (status) where.status = status;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
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
      prisma.reservation.count({ where }),
    ]);

    // Get tenant info for each reservation
    const tenantIds = [...new Set(reservations.map(r => r.tenantId))];
    const tenants = await prisma.user.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, fullName: true, phone: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t]));

    const reservationsWithTenant = reservations.map(r => ({
      ...r,
      tenant: tenantMap.get(r.tenantId) || null,
    }));

    res.json({
      reservations: reservationsWithTenant,
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
// GET /api/seller/reservations/:id - Get reservation detail
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

    if (reservation.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem yêu cầu này' });
    }

    // Get tenant info
    const tenant = await prisma.user.findUnique({
      where: { id: reservation.tenantId },
      select: { id: true, fullName: true, phone: true },
    });

    res.json({
      reservation: { ...reservation, tenant },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/seller/reservations/:id/approve - Approve reservation
// ============================================
router.patch('/reservations/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
    }

    if (reservation.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xử lý yêu cầu này' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Yêu cầu không ở trạng thái chờ xử lý' });
    }

    // Check for existing approved reservation for same listing
    const existingApproved = await prisma.reservation.findFirst({
      where: {
        listingId: reservation.listingId,
        status: 'approved',
        id: { not: id },
      },
    });

    if (existingApproved) {
      return res.status(409).json({ error: 'Đã có yêu cầu được chấp thuận cho phòng này' });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: reservation.tenantId,
        type: 'coc',
        title: 'Yêu cầu giữ chỗ được chấp thuận',
        body: 'Chủ phòng đã chấp thuận yêu cầu giữ chỗ của bạn.',
        link: '/tai-khoan/coc-giu-cho',
        metadata: JSON.stringify({ reservationId: id }),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'approved',
        target: id,
        targetType: 'reservation',
      },
    });

    res.json({
      message: 'Đã chấp thuận yêu cầu giữ chỗ',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/seller/reservations/:id/reject - Reject reservation
// ============================================
router.patch('/reservations/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
    }

    if (reservation.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xử lý yêu cầu này' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Yêu cầu không ở trạng thái chờ xử lý' });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        sellerNote: reason || null,
      },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: reservation.tenantId,
        type: 'coc',
        title: 'Yêu cầu giữ chỗ bị từ chối',
        body: reason ? `Lý do: ${reason}` : 'Chủ phòng đã từ chối yêu cầu giữ chỗ.',
        link: '/tai-khoan/coc-giu-cho',
        metadata: JSON.stringify({ reservationId: id }),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'rejected',
        target: id,
        targetType: 'reservation',
        details: JSON.stringify({ reason }),
      },
    });

    res.json({
      message: 'Đã từ chối yêu cầu giữ chỗ',
      reservation: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/contracts - Get seller's contracts
// ============================================
router.get('/contracts', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const where = { sellerId: req.user.id };
    if (status) where.status = status;

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
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
      prisma.contract.count({ where }),
    ]);

    // Get tenant info
    const tenantIds = [...new Set(contracts.map(c => c.tenantId))];
    const tenants = await prisma.user.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, fullName: true, phone: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t]));

    const contractsWithTenant = contracts.map(c => ({
      ...c,
      tenant: tenantMap.get(c.tenantId) || null,
    }));

    res.json({
      contracts: contractsWithTenant,
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
// POST /api/seller/contracts - Upload contract
// ============================================
// Contract storage - separate from public uploads
const CONTRACT_DIR = path.join(__dirname, '../../contracts');

if (!fs.existsSync(CONTRACT_DIR)) {
  fs.mkdirSync(CONTRACT_DIR, { recursive: true });
}

const contractStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sellerDir = path.join(CONTRACT_DIR, req.user.id);
    if (!fs.existsSync(sellerDir)) {
      fs.mkdirSync(sellerDir, { recursive: true });
    }
    cb(null, sellerDir);
  },
  filename: (req, file, cb) => {
    const crypto = require('crypto');
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const contractFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF, JPEG, PNG'), false);
  }
};

const contractUpload = multer({
  storage: contractStorage,
  fileFilter: contractFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/contracts', contractUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng tải lên file hợp đồng' });
    }

    const { listingId, tenantId, title, contractNumber, startDate, endDate, monthlyRent, depositAmount } = req.body;

    // Verify listing ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Phòng không tồn tại' });
    }

    if (listing.sellerId !== req.user.id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Bạn không có quyền tải hợp đồng cho phòng này' });
    }

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Người thuê không tồn tại' });
    }

    // Check for approved reservation if provided
    let reservationId = null;
    if (listingId && tenantId) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          listingId,
          tenantId,
          status: 'approved',
        },
      });
      if (reservation) {
        reservationId = reservation.id;
      }
    }

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        listingId,
        sellerId: req.user.id,
        tenantId,
        reservationId,
        title: title || `Hợp đồng thuê phòng ${listing.title}`,
        contractNumber,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        fileKey: req.file.filename,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: 'active_record',
      },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: tenantId,
        type: 'hopdong',
        title: 'Hợp đồng mới được tải lên',
        body: `Chủ phòng đã tải lên hợp đồng: "${contract.title}".`,
        link: '/tai-khoan/hop-dong',
        metadata: JSON.stringify({ contractId: contract.id }),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'created',
        target: contract.id,
        targetType: 'contract',
      },
    });

    res.status(201).json({
      message: 'Hợp đồng đã được tải lên',
      contract,
    });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(error);
  }
});

// ============================================
// GET /api/seller/contracts/:id - Get contract detail
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
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
    }

    if (contract.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xem hợp đồng này' });
    }

    // Get tenant info
    const tenant = await prisma.user.findUnique({
      where: { id: contract.tenantId },
      select: { id: true, fullName: true, phone: true },
    });

    res.json({
      contract: { ...contract, tenant },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/contracts/:id/download - Download contract file
// ============================================
router.get('/contracts/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
    }

    if (contract.sellerId !== req.user.id && contract.tenantId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền tải hợp đồng này' });
    }

    const filePath = path.join(CONTRACT_DIR, contract.sellerId, contract.fileKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    // Log download
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'downloaded',
        target: id,
        targetType: 'contract',
      },
    });

    res.setHeader('Content-Type', contract.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${contract.originalFileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/seller/contracts/:id/archive - Archive contract
// ============================================
router.patch('/contracts/:id/archive', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
    }

    if (contract.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xử lý hợp đồng này' });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { status: 'archived' },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: contract.tenantId,
        type: 'hopdong',
        title: 'Hợp đồng đã được lưu trữ',
        body: `Hợp đồng "${contract.title}" đã được lưu trữ.`,
        link: '/tai-khoan/hop-dong',
      },
    });

    res.json({
      message: 'Hợp đồng đã được lưu trữ',
      contract: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PATCH /api/seller/contracts/:id/revoke - Revoke contract access
// ============================================
router.patch('/contracts/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Hợp đồng không tồn tại' });
    }

    if (contract.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xử lý hợp đồng này' });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { status: 'revoked' },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: contract.tenantId,
        type: 'hopdong',
        title: 'Quyền truy cập hợp đồng đã bị thu hồi',
        body: `Hợp đồng "${contract.title}" không còn khả dụng.`,
        link: '/tai-khoan/hop-dong',
      },
    });

    res.json({
      message: 'Đã thu hồi quyền truy cập hợp đồng',
      contract: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/reviews - Get reviews for seller's listings
// ============================================
router.get('/reviews', async (req, res, next) => {
  try {
    const { listingId } = req.query;
    
    // Get seller's listings
    const where = { sellerId: req.user.id };
    if (listingId) {
      where.id = listingId;
    }
    
    const listings = await prisma.listing.findMany({
      where,
      select: { id: true },
    });
    
    const listingIds = listings.map(l => l.id);
    
    const reviews = await prisma.review.findMany({
      where: { listingId: { in: listingIds } },
      include: {
        author: {
          select: { id: true, fullName: true, initials: true },
        },
        listing: {
          select: { id: true, title: true, image: true },
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
// POST /api/seller/reviews/:id/respond - Respond to a review
// ============================================
router.post(
  '/reviews/:id/respond',
  [
    body('response').notEmpty().withMessage('Nội dung phản hồi không được trống'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { response: responseText } = req.body;
      
      const review = await prisma.review.findUnique({
        where: { id },
        include: { listing: true },
      });
      
      if (!review) {
        return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
      }
      
      // Verify seller owns the listing
      if (review.listing.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền phản hồi đánh giá này' });
      }
      
      // Update review with seller response
      const updated = await prisma.review.update({
        where: { id },
        data: {
          sellerResponse: responseText,
          sellerResponseAt: new Date(),
        },
      });
      
      // Notify review author
      await prisma.notification.create({
        data: {
          userId: review.authorId,
          type: 'system',
          title: 'Phản hồi từ chủ trọ',
          body: `Chủ trọ đã phản hồi đánh giá của bạn về "${review.listing.title}"`,
          link: `/phong/${review.listingId}`,
        },
      });
      
      res.json({
        message: 'Đã gửi phản hồi',
        review: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// BOOST HELPERS
// ============================================

// Default boost packages
const DEFAULT_BOOST_PACKAGES = [
  { id: 'vip_3d', name: 'VIP 3 ngày', days: 3, price: 99000, description: 'Hiển thị badge VIP trong 3 ngày' },
  { id: 'vip_7d', name: 'VIP 7 ngày', days: 7, price: 199000, description: 'Hiển thị badge VIP trong 7 ngày' },
  { id: 'vip_14d', name: 'VIP 14 ngày', days: 14, price: 349000, description: 'Hiển thị badge VIP trong 14 ngày' },
  { id: 'vip_30d', name: 'VIP 30 ngày', days: 30, price: 599000, description: 'Hiển thị badge VIP trong 30 ngày' },
];

// Get boost packages from config or return defaults
async function getBoostPackages() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'boost_packages' },
  });
  
  if (config) {
    try {
      return JSON.parse(config.value);
    } catch (e) {
      // Fallback to defaults
    }
  }
  
  // Check if we should save defaults
  const existingConfig = await prisma.systemConfig.findUnique({
    where: { key: 'boost_packages' },
  });
  
  if (!existingConfig) {
    await prisma.systemConfig.create({
      data: {
        key: 'boost_packages',
        value: JSON.stringify(DEFAULT_BOOST_PACKAGES),
        description: 'Các gói boost cho tin đăng',
      },
    });
  }
  
  return DEFAULT_BOOST_PACKAGES;
}

// ============================================
// GET /api/seller/boost/packages - Get available boost packages
// ============================================
router.get('/boost/packages', async (req, res, next) => {
  try {
    const packages = await getBoostPackages();
    res.json({ packages });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/history - Get boost history
// ============================================
router.get('/boost/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    // Get seller's active listings
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user.id, status: 'active' },
      select: { id: true },
    });
    
    const listingIds = listings.map(l => l.id);
    
    // Get boost history from listings with vipExpiresAt
    const where = {
      sellerId: req.user.id,
      status: 'active',
      vip: true,
    };
    
    // We'll track boosts by looking at vipExpiresAt changes
    // For now, return current active boosts
    const [listingsWithBoosts, total] = await Promise.all([
      prisma.listing.findMany({
        where: {
          sellerId: req.user.id,
          status: 'active',
          vip: true,
          vipExpiresAt: { gte: new Date() },
        },
        select: {
          id: true,
          title: true,
          vip: true,
          vipExpiresAt: true,
          createdAt: true,
        },
        orderBy: { vipExpiresAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.listing.count({
        where: {
          sellerId: req.user.id,
          status: 'active',
          vip: true,
          vipExpiresAt: { gte: new Date() },
        },
      }),
    ]);
    
    res.json({
      boosts: listingsWithBoosts.map(l => ({
        listingId: l.id,
        listingTitle: l.title,
        startedAt: l.createdAt,
        expiresAt: l.vipExpiresAt,
        status: 'active',
      })),
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
// POST /api/seller/boost/purchase - Purchase a boost for a listing (Wallet only)
// ============================================
router.post('/boost/purchase', async (req, res, next) => {
  try {
    const { listingId, packageId, requestId } = req.body;
    
    // Validate input
    if (!listingId || !packageId) {
      return res.status(400).json({ error: 'Thiếu thông tin yêu cầu' });
    }
    
    // Generate idempotency key if not provided
    const idempotencyKey = requestId || `boost_${listingId}_${packageId}_${Date.now()}`;
    
    // Check for existing completed purchase with this idempotency key
    const existingPurchase = await prisma.transaction.findFirst({
      where: {
        idempotencyKey,
        userId: req.user.id,
        type: 'payment',
        status: 'completed',
      },
    });
    
    if (existingPurchase) {
      // Return original result - idempotent response
      return res.json({
        success: true,
        message: 'Yêu cầu đã được xử lý trước đó',
        idempotent: true,
        originalTransactionId: existingPurchase.id,
      });
    }
    
    // Get listing and verify ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }
    
    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không sở hữu tin đăng này' });
    }
    
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Chỉ tin đăng đã duyệt mới có thể mua boost' });
    }
    
    // Get boost package
    const packages = await getBoostPackages();
    const pkg = packages.find(p => p.id === packageId);
    
    if (!pkg) {
      return res.status(404).json({ error: 'Gói boost không tồn tại' });
    }
    
    const price = pkg.price;
    
    // Get or create wallet
    let wallet = await prisma.sellerWallet.findUnique({
      where: { userId: req.user.id },
    });
    
    if (!wallet) {
      wallet = await prisma.sellerWallet.create({
        data: {
          userId: req.user.id,
          balance: 0,
          totalSpent: 0,
        },
      });
    }
    
    // Check balance
    if (wallet.balance < price) {
      return res.status(400).json({ 
        error: 'Số dư không đủ',
        required: price,
        available: wallet.balance,
        link: '/seller/billing',
      });
    }
    
    // Atomic transaction: deduct wallet and activate boost
    const result = await prisma.$transaction(async (tx) => {
      // Re-check for existing purchase inside transaction (double-check for race)
      const existingInTx = await tx.transaction.findFirst({
        where: {
          idempotencyKey,
          userId: req.user.id,
          type: 'payment',
          status: 'completed',
        },
      });
      
      if (existingInTx) {
        throw new Error('DUPLICATE_REQUEST');
      }
      
      // Re-check balance inside transaction
      const currentWallet = await tx.sellerWallet.findUnique({
        where: { userId: req.user.id },
      });
      
      if (!currentWallet || currentWallet.balance < price) {
        throw new Error('Số dư không đủ');
      }
      
      // Calculate new VIP expiration
      const now = new Date();
      let newVipExpiresAt;
      
      if (listing.vip && listing.vipExpiresAt && listing.vipExpiresAt > now) {
        // Extend existing VIP
        newVipExpiresAt = new Date(listing.vipExpiresAt.getTime() + pkg.days * 24 * 60 * 60 * 1000);
      } else {
        // Start new VIP from now
        newVipExpiresAt = new Date(now.getTime() + pkg.days * 24 * 60 * 60 * 1000);
      }
      
      // Deduct from wallet
      const updatedWallet = await tx.sellerWallet.update({
        where: { userId: req.user.id },
        data: {
          balance: { decrement: price },
          totalSpent: { increment: price },
        },
      });
      
      // Activate boost on listing
      const updatedListing = await tx.listing.update({
        where: { id: listingId },
        data: {
          vip: true,
          vipExpiresAt: newVipExpiresAt,
        },
      });
      
      // Create transaction record with idempotency key
      const transaction = await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'payment',
          amount: price,
          method: 'wallet',
          status: 'completed',
          description: `Mua boost "${pkg.name}" cho tin "${listing.title}"`,
          idempotencyKey,
        },
      });
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'purchase_boost',
          target: listingId,
          targetType: 'listing',
          details: JSON.stringify({
            packageId: pkg.id,
            packageName: pkg.name,
            days: pkg.days,
            price,
            newBalance: updatedWallet.balance,
            vipExpiresAt: newVipExpiresAt,
          }),
        },
      });
      
      return { wallet: updatedWallet, listing: updatedListing, package: pkg, transaction };
    });
    
    res.json({
      success: true,
      message: `Đã kích hoạt boost "${pkg.name}" cho tin đăng`,
      wallet: {
        id: result.wallet.id,
        balance: result.wallet.balance,
      },
      listing: {
        id: result.listing.id,
        vip: result.listing.vip,
        vipExpiresAt: result.listing.vipExpiresAt,
      },
    });
  } catch (error) {
    if (error.message === 'Số dư không đủ') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'DUPLICATE_REQUEST') {
      return res.status(409).json({ error: 'Yêu cầu đã được xử lý' });
    }
    // Handle MongoDB duplicate key error from sparse unique index
    if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
      // Another concurrent request succeeded - check if it completed
      try {
        const existing = await prisma.transaction.findFirst({
          where: { idempotencyKey, userId: req.user.id, type: 'payment', status: 'completed' },
        });
        if (existing) {
          return res.json({
            success: true,
            idempotent: true,
            originalTransactionId: existing.id,
            message: 'Yêu cầu đã được xử lý bởi yêu cầu trùng lặp',
          });
        }
        // Transaction not found or not completed - let client retry
        return res.status(409).json({ error: 'Giao dịch đang xử lý, vui lòng thử lại' });
      } catch {
        return res.status(500).json({ error: 'Lỗi xác minh giao dịch' });
      }
    }
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/active - Get active boosts for seller's listings
// ============================================
router.get('/boost/active', async (req, res, next) => {
  try {
    const now = new Date();
    
    const listings = await prisma.listing.findMany({
      where: {
        sellerId: req.user.id,
        status: 'active',
        vip: true,
        vipExpiresAt: { gte: now },
      },
      select: {
        id: true,
        title: true,
        image: true,
        vip: true,
        vipExpiresAt: true,
      },
      orderBy: { vipExpiresAt: 'desc' },
    });
    
    res.json({ boosts: listings });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/seller/boost/create-order - Create bank transfer order for boost
// ============================================
router.post('/boost/create-order', async (req, res, next) => {
  try {
    const { listingId, packageId } = req.body;

    if (!listingId || !packageId) {
      return res.status(400).json({ error: 'Thiếu thông tin yêu cầu' });
    }

    // Get listing and verify ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    if (listing.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không sở hữu tin đăng này' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Chỉ tin đăng đã duyệt mới có thể mua boost' });
    }

    // Get boost package
    const packages = await getBoostPackages();
    const pkg = packages.find(p => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Gói boost không tồn tại' });
    }

    // Get active bank account
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { isActive: true },
    });

    if (!bankAccount) {
      return res.status(503).json({ error: 'Hiện tại không hỗ trợ thanh toán chuyển khoản' });
    }

    // Generate unique references
    const orderRef = `BOOST-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const transferRef = `BOOST${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Set expiration (72 hours)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Create boost order
    const order = await prisma.boostOrder.create({
      data: {
        orderRef,
        userId: req.user.id,
        listingId,
        listingTitle: listing.title,
        packageId: pkg.id,
        packageName: pkg.name,
        packagePrice: pkg.price,
        packageDays: pkg.days,
        bankName: bankAccount.bankName,
        bankBin: bankAccount.bankBin,
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder,
        transferRef,
        amount: pkg.price,
        status: 'PENDING',
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderRef: order.orderRef,
        transferRef: order.transferRef,
        amount: order.amount,
        packageName: order.packageName,
        packageDays: order.packageDays,
        listingId: order.listingId,
        listingTitle: order.listingTitle,
        bankAccount: {
          bankName: order.bankName,
          bankBin: order.bankBin,
          accountNumber: order.accountNumber,
          accountHolder: order.accountHolder,
        },
        status: order.status,
        expiresAt: order.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/seller/boost/submit-proof - Submit payment proof for boost order
// ============================================
router.post('/boost/submit-proof', async (req, res, next) => {
  try {
    const { orderId, proofBase64, proofMimeType } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Thiếu orderId' });
    }

    if (!proofBase64) {
      return res.status(400).json({ error: 'Vui lòng cung cấp minh chứng thanh toán' });
    }

    const order = await prisma.boostOrder.findFirst({
      where: { id: orderId, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Không thể gửi minh chứng cho đơn này' });
    }

    if (new Date() > order.expiresAt) {
      await prisma.boostOrder.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Đơn hàng đã hết hạn' });
    }

    const updated = await prisma.boostOrder.update({
      where: { id: orderId },
      data: {
        proofUrl: `data:${proofMimeType || 'image/jpeg'};base64,${proofBase64}`,
        proofUploadedAt: new Date(),
        status: 'PENDING_REVIEW',
      },
    });

    // Notify managers
    const managers = await prisma.user.findMany({
      where: { role: 'manager' },
      select: { id: true },
    });

    for (const manager of managers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'system',
          title: 'Yêu cầu thanh toán Boost mới',
          body: `Người dùng ${req.user.fullName || req.user.phone} đã nộp minh chứng thanh toán boost "${order.packageName}" trị giá ${order.amount.toLocaleString('vi-VN')}đ cho tin "${order.listingTitle}"`,
          link: '/manager/payment-reviews',
        },
      });
    }

    res.json({
      success: true,
      message: 'Đã gửi minh chứng thanh toán',
      order: {
        id: updated.id,
        orderRef: updated.orderRef,
        status: updated.status,
        proofUploadedAt: updated.proofUploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/orders - List user's boost orders
// ============================================
router.get('/boost/orders', async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const orders = await prisma.boostOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/order/:id - Get boost order details
// ============================================
router.get('/boost/order/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.boostOrder.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/seller/boost/cancel-order/:id - Cancel boost order
// ============================================
router.post('/boost/cancel-order/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.boostOrder.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể hủy đơn hàng ở trạng thái này' });
    }

    const updated = await prisma.boostOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Đã hủy đơn hàng',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/vietqr/:orderId - Get VietQR for boost order
// ============================================
router.get('/boost/vietqr/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.boostOrder.findFirst({
      where: { id: orderId, userId: req.user.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Đơn hàng không ở trạng thái chờ thanh toán' });
    }

    if (new Date() > order.expiresAt) {
      await prisma.boostOrder.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Đơn hàng đã hết hạn' });
    }

    // Use configured QR image if available, otherwise generate VietQR
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { isActive: true },
    });

    let qrUrl = '';
    if (bankAccount?.qrImageUrl) {
      qrUrl = bankAccount.qrImageUrl;
    } else {
      qrUrl = `https://img.vietqr.io/image/${order.bankBin}-${order.accountNumber}-compact2.png?` +
        `a=${order.amount}&` +
        `n=${order.transferRef}&` +
        `i=${order.bankBin}&` +
        `b=${order.accountNumber}&` +
        `f=text&` +
        `t=compact2`;
    }

    res.json({
      success: true,
      qrUrl,
      qrSource: bankAccount?.qrImageUrl ? 'configured' : 'generated',
      bankInfo: {
        bankName: order.bankName,
        bankBin: order.bankBin,
        accountNumber: order.accountNumber,
        accountHolder: order.accountHolder,
      },
      transferInfo: {
        amount: order.amount,
        transferRef: order.transferRef,
        orderRef: order.orderRef,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/boost/bank-account - Get active bank account for QR
// ============================================
router.get('/boost/bank-account', async (req, res, next) => {
  try {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { isActive: true },
    });

    if (!bankAccount) {
      return res.status(404).json({ error: 'Không có tài khoản ngân hàng nhận thanh toán' });
    }

    res.json({
      bankAccount: {
        bankName: bankAccount.bankName,
        bankBin: bankAccount.bankBin,
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder,
        qrImageUrl: bankAccount.qrImageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/stars/balance - Get user's star balance
// ============================================
router.get('/stars/balance', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const starService = require('../services/starService');

    // Process any newly expired batches first (idempotent)
    await starService.processExpiredStars();

    // Get all unexpired batches for this user
    const validBatches = await prisma.starGrantBatch.findMany({
      where: {
        userId,
        isExpired: false,
        expiresAt: { gt: now },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        packageId: true,
        originalAmount: true,
        remainingAmount: true,
        expiresAt: true,
      },
      orderBy: { expiresAt: 'asc' }, // FIFO: oldest expires first
    });

    // Calculate total available stars
    const totalAvailable = validBatches.reduce(
      (sum, batch) => sum + batch.remainingAmount,
      0
    );

    // Get lifetime stats from all batches
    const allBatches = await prisma.starGrantBatch.findMany({
      where: { userId },
      select: {
        originalAmount: true,
        remainingAmount: true,
        isExpired: true,
      },
    });

    const totalEarned = allBatches.reduce((sum, b) => sum + b.originalAmount, 0);
    const totalSpent = allBatches.reduce(
      (sum, b) => sum + (b.originalAmount - b.remainingAmount),
      0
    );

    res.json({
      balance: totalAvailable,
      totalEarned,
      totalSpent,
      batches: validBatches.map((b) => ({
        id: b.id,
        packageId: b.packageId,
        originalAmount: b.originalAmount,
        remainingAmount: b.remainingAmount,
        expiresAt: b.expiresAt,
        daysUntilExpiry: Math.ceil(
          (b.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/seller/stars/transactions - Get star transaction history
// ============================================
router.get('/stars/transactions', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50, offset = 0 } = req.query;

    const where = { userId };
    if (type && ['GRANT', 'SPEND', 'EXPIRE', 'REFUND'].includes(type)) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.starTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          subscriptionId: true,
          listingId: true,
          boostOrderId: true,
          createdAt: true,
        },
      }),
      prisma.starTransaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + transactions.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/seller/stars/purchase-boost - Spend stars to boost a listing
// ============================================
router.post('/stars/purchase-boost', async (req, res, next) => {
  try {
    const { listingId, days = 1, boostOrderId: providedOrderId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!listingId) {
      return res.status(400).json({ error: 'Thiếu ID tin đăng' });
    }

    if (![1, 3, 7, 14, 30].includes(parseInt(days))) {
      return res.status(400).json({ error: 'Số ngày không hợp lệ. Chỉ chấp nhận 1, 3, 7, 14, 30 ngày.' });
    }

    const duration = parseInt(days);
    const starsCost = duration; // 1 Star per listing per day

    // Verify listing ownership and status (outside transaction for early exit)
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'Bạn không sở hữu tin đăng này' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Tin đăng phải đang hoạt động để đẩy VIP' });
    }

    // Use provided order ID for idempotency (retries), or generate new one (new purchases)
    // Frontend generates stable ID per purchase: stars_boost_<listingId>_<days>d
    const orderId = providedOrderId || `stars_${listingId}_${duration}d_${Date.now()}`;

    // Use star service for atomic, idempotent spending
    const starService = require('../services/starService');
    const result = await starService.spendStarsAtomic(userId, starsCost, listingId, orderId, duration);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Send notification (only for new purchases)
    if (!result.idempotent) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'system',
          title: 'Đẩy VIP thành công',
          body: `Tin đăng "${listing.title}" đã được đẩy VIP ${duration} ngày. Hết hạn: ${result.vipExpiresAt.toLocaleDateString('vi-VN')}`,
          link: `/tin-dang/${listingId}`,
        },
      });
    }

    res.json({
      success: true,
      message: result.idempotent
        ? 'Yêu cầu đã được xử lý trước đó'
        : `Đã đẩy VIP thành công cho "${listing.title}"`,
      idempotent: result.idempotent,
      stars: {
        spent: result.spent,
        remaining: result.remainingBalance,
      },
      vip: {
        expiresAt: result.vipExpiresAt,
        daysAdded: result.idempotent ? 0 : duration,
      },
      listing: {
        id: listingId,
        vipExpiresAt: result.vipExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
module.exports = router;
