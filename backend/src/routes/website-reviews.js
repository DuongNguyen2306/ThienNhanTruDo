const express = require('express');
const { body } = require('express-validator');
const prisma = require('../db');
const { validate } = require('../middleware/errorHandler');
const { authenticate, optionalAuth, ROLES } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const reviewHelper = require('../helpers/websiteReviewHelper');
const { createAuditLog } = require('../helpers/auditHelper');

const router = express.Router();

// Submission is rate limited independently of login to stop rating spam.
const submitRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  key: (req) => req.user?.id || req.ip || 'unknown',
  name: 'WEBSITE_REVIEW_RATE_LIMIT',
});

// ============================================
// GET /api/website-reviews/summary
// Public aggregate: average rating + total review count.
// No personal data is exposed here.
// ============================================
router.get('/summary', async (req, res, next) => {
  try {
    const aggregate = await reviewHelper.getAggregate();
    res.json({
      average: aggregate.average,
      totalReviews: aggregate.totalReviews,
      distribution: aggregate.distribution,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/website-reviews
// Public list of published reviews (recent first).
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const { listReviews } = reviewHelper;
    const { items, pagination } = await listReviews({
      status: reviewHelper.REVIEW_STATUS.PUBLISHED,
      page: pageNum,
      limit: limitNum,
    });

    // Public view: strip moderation internals and reviewer identity details.
    const reviews = items.map((r) => ({
      id: r.id,
      score: r.score,
      title: r.title,
      content: r.content,
      createdAt: r.createdAt,
      reviewerName: r.reviewerName,
      reviewerInitials: r.reviewerInitials,
      adminReply: r.adminReply,
      adminReplyAt: r.adminReplyAt,
    }));

    res.json({ reviews, pagination });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/website-reviews/eligibility
// Whether the CURRENT user may submit a website review.
// The frontend uses this only to render UI — the real check happens server-side
// inside the POST handler.
// ============================================
router.get('/eligibility', authenticate, async (req, res, next) => {
  try {
    const result = await reviewHelper.checkEligibility(req.user.id);
    res.json({
      eligible: result.eligible,
      reason: result.reason,
      canEdit: Boolean(result.canEdit),
      existingReviewId: result.existingReviewId || null,
      // Expose only the minimum needed to pick a transaction.
      qualifyingTransactions: result.transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        method: t.method,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/website-reviews/mine
// The current user's own review (if any).
// ============================================
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { listReviews } = reviewHelper;
    const { items } = await listReviews({ limit: 50, page: 1 });
    const mine = items.filter((r) => r.userId === req.user.id);
    res.json({ review: mine[0] || null, reviews: mine });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/website-reviews
// Submit a website review.
//
// ELIGIBILITY IS ENFORCED HERE, SERVER-SIDE.
// The client cannot bypass it: the qualifying transaction is looked up from
// the database and must belong to the authenticated user.
// ============================================
router.post(
  '/',
  authenticate,
  submitRateLimiter,
  [
    body('transactionId').notEmpty().withMessage('Giao dịch không được trống'),
    body('score').isInt({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải từ 1-5'),
    body('title').optional().isString().isLength({ max: 120 }).withMessage('Tiêu đề tối đa 120 ký tự'),
    body('content').notEmpty().withMessage('Nội dung đánh giá không được trống'),
    body('content').isLength({ min: 10, max: 2000 }).withMessage('Nội dung đánh giá phải từ 10 đến 2000 ký tự'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { transactionId, score, title, content } = req.body;

      const result = await reviewHelper.createReview({
        userId: req.user.id,
        transactionId,
        score: parseInt(score, 10),
        title: title?.trim() || null,
        content: content.trim(),
        user: req.user,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({
          error: result.error,
          existingReviewId: result.existingReviewId,
        });
      }

      await createAuditLog(req.user.id, 'created', result.review.id, 'website_review', {
        transactionId,
        score: parseInt(score, 10),
      });

      const aggregate = await reviewHelper.getAggregate();

      res.status(201).json({
        message: 'Cảm ơn bạn đã đánh giá website!',
        review: {
          id: result.review.id,
          score: result.review.score,
          title: result.review.title,
          content: result.review.content,
          createdAt: result.review.createdAt,
        },
        average: aggregate.average,
        totalReviews: aggregate.totalReviews,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// PUT /api/website-reviews/:id
// Update the current user's own review.
// ============================================
router.put(
  '/:id',
  authenticate,
  submitRateLimiter,
  [
    body('score').optional().isInt({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải từ 1-5'),
    body('title').optional().isString().isLength({ max: 120 }),
    body('content').optional().isLength({ min: 10, max: 2000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { score, title, content } = req.body;

      const result = await reviewHelper.updateReview({
        reviewId: id,
        userId: req.user.id,
        score: score !== undefined ? parseInt(score, 10) : undefined,
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content.trim() : undefined,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      const aggregate = await reviewHelper.getAggregate();

      res.json({
        message: 'Đã cập nhật đánh giá',
        review: result.review,
        average: aggregate.average,
        totalReviews: aggregate.totalReviews,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/website-reviews/admin/list
// Admin review history (Task 5): search, filters, pagination.
router.get('/admin/list', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { search = '', status = '', score = '', startDate = '', endDate = '', page = 1, limit = 20 } = req.query;

    const { items, pagination } = await reviewHelper.listReviews({
      search,
      status,
      score,
      startDate,
      endDate,
      page: parseInt(page, 10) || 1,
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });

    // Admin sees the reviewer + the qualifying transaction (traceability).
    const reviews = items.map((r) => ({
      id: r.id,
      userId: r.userId,
      reviewerName: r.reviewerName,
      reviewerInitials: r.reviewerInitials,
      reviewerRole: r.reviewerRole,
      score: r.score,
      title: r.title,
      content: r.content,
      status: r.status,
      hiddenReason: r.hiddenReason,
      hiddenAt: r.hiddenAt,
      adminReply: r.adminReply,
      adminReplyAt: r.adminReplyAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      transaction: {
        id: r.transactionId,
        amount: r.transactionAmount,
        method: r.transactionMethod,
        description: r.transactionDescription,
        createdAt: r.transactionCreatedAt,
      },
    }));

    res.json({ reviews, pagination });
  } catch (error) {
    next(error);
  }
});

// GET /api/website-reviews/admin/:id
// Single review detail with the associated qualifying transaction.
router.get('/admin/:id', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await reviewHelper.getReview(id);
    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    }

    // Resolve the live transaction so the admin sees the authoritative record.
    let transaction = null;
    if (review.transactionId) {
      transaction = await prisma.transaction.findUnique({
        where: { id: review.transactionId },
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          method: true,
          description: true,
          vnpayTxRef: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, role: true } },
        },
      });
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: review.userId },
      select: { id: true, fullName: true, role: true, phone: true, email: true, createdAt: true },
    });

    res.json({
      review: {
        ...review,
        // Mask the phone number for privacy; the admin already has the user page.
        reviewer: reviewer
          ? {
              id: reviewer.id,
              fullName: reviewer.fullName,
              role: reviewer.role,
              email: reviewer.email,
              phone: reviewer.phone
                ? reviewer.phone.slice(0, 4) + '***' + reviewer.phone.slice(-3)
                : null,
              createdAt: reviewer.createdAt,
            }
          : null,
      },
      transaction,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/website-reviews/admin/:id
// Moderate: hide | unhide | flag | reply
router.patch(
  '/admin/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  [
    body('action').isIn(['hide', 'unhide', 'flag', 'reply']).withMessage('Hành động không hợp lệ'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;

      const result = await reviewHelper.moderateReview({
        reviewId: id,
        action,
        reason,
        adminId: req.user.id,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      await createAuditLog(req.user.id, action === 'reply' ? 'replied_review' : `${action}_review`, id, 'website_review', {
        reason,
      });

      const aggregate = await reviewHelper.getAggregate();

      res.json({
        message: 'Đã cập nhật đánh giá',
        review: result.review,
        average: aggregate.average,
        totalReviews: aggregate.totalReviews,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
