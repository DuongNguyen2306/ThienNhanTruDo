const express = require('express');
const crypto = require('crypto');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const { grantStarsToUser } = require('../helpers/starHelper');

const router = express.Router();

// ============================================
// VNPay (Sandbox) — nạp tiền ví & mua gói dịch vụ
// ============================================
// Flow:
//   1. FE  -> POST /api/payment/create-vnpay-url                  => { paymentUrl }
//        nạp ví : { purpose: 'wallet_deposit', amount }   | retry: { depositId }
//        mua gói: { purpose: 'package_order', packageId } | retry: { orderId }
//   2. User pays on VNPay, VNPay redirects the browser to <FE>/payment/callback?vnp_...
//   3. FE  -> GET  /api/payment/vnpay-callback?vnp_...            => verified result
//      (VNPay can also call GET /api/payment/vnpay-ipn server-to-server; both share
//       the same idempotent processing, so whichever arrives first wins.)
//
// Each payment attempt is one Transaction (method 'vnpay', vnpayTxRef = vnp_TxnRef).
// Its idempotencyKey "vnpay:<purpose>:<targetId>" links it to what it pays for.
const vnpayService = require('../services/vnpayService');

const VNPAY_DEPOSIT_MIN = 10000;
const VNPAY_DEPOSIT_MAX = 100000000;
const VNPAY_PURPOSES = ['wallet_deposit', 'package_order'];

const vnpayKey = (purpose, id) => `vnpay:${purpose}:${id}`;

function parseVnpayKey(key) {
  const m = typeof key === 'string' ? key.match(/^vnpay:([a-z_]+):(.+)$/) : null;
  return m && VNPAY_PURPOSES.includes(m[1]) ? { purpose: m[1], targetId: m[2] } : { purpose: null, targetId: null };
}

// Send the user back to the frontend they paid from (localhost or the
// project's Vercel domains); otherwise fall back to VNPAY_RETURN_URL.
function isTrustedFrontendOrigin(origin) {
  try {
    const u = new URL(origin);
    if (['localhost', '127.0.0.1'].includes(u.hostname)) return true;
    return u.protocol === 'https:' && /^thien-nhan-tru-[a-z0-9-]+\.vercel\.app$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function resolveVnpayReturnUrl(req) {
  const origin = req.headers.origin;
  if (origin && isTrustedFrontendOrigin(origin)) {
    return `${origin.replace(/\/+$/, '')}/payment/callback`;
  }
  return undefined;
}

class VnpayRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Find (retry) or create the wallet deposit a VNPay payment is for.
async function resolveVnpayDeposit(userId, { amount, depositId }) {
  if (depositId) {
    const deposit = await prisma.walletDeposit.findFirst({ where: { id: depositId, userId } });
    if (!deposit) throw new VnpayRequestError(404, 'Không tìm thấy yêu cầu nạp tiền');
    if (deposit.status !== 'PENDING') throw new VnpayRequestError(400, 'Yêu cầu nạp tiền này không thể thanh toán lại');
    if (new Date() > deposit.expiresAt) {
      await prisma.walletDeposit.update({ where: { id: deposit.id }, data: { status: 'EXPIRED' } });
      throw new VnpayRequestError(400, 'Yêu cầu nạp tiền đã hết hạn, vui lòng tạo yêu cầu mới');
    }
    return deposit;
  }

  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value < VNPAY_DEPOSIT_MIN) {
    throw new VnpayRequestError(400, 'Số tiền nạp tối thiểu là 10.000đ');
  }
  if (value > VNPAY_DEPOSIT_MAX) {
    throw new VnpayRequestError(400, 'Số tiền nạp tối đa là 100.000.000đ');
  }

  const deposit = await prisma.walletDeposit.create({
    data: {
      depositRef: generateDepositRef(),
      userId,
      amount: value,
      // Bank snapshot fields are required by the schema; VNPay has no
      // receiving account shown to the user.
      bankName: 'VNPay',
      bankBin: 'VNPAY',
      accountNumber: '-',
      accountHolder: 'Cổng thanh toán VNPay',
      transferRef: generateWalletTransferRef(),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await createAuditLog(userId, 'created', deposit.id, 'wallet_deposit', { amount: value, method: 'vnpay' });
  return deposit;
}

// Find (retry) or create the package order a VNPay payment is for.
async function resolveVnpayPackageOrder(user, { packageId, orderId }) {
  if (orderId) {
    const order = await prisma.packageOrder.findFirst({ where: { id: orderId, userId: user.id } });
    if (!order) throw new VnpayRequestError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'PENDING_PAYMENT') throw new VnpayRequestError(400, 'Đơn hàng này không thể thanh toán lại');
    if (new Date() > order.expiresAt) {
      await prisma.packageOrder.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
      throw new VnpayRequestError(400, 'Đơn hàng đã hết hạn, vui lòng tạo đơn mới');
    }
    return order;
  }

  if (!packageId) throw new VnpayRequestError(400, 'packageId là bắt buộc');
  const packages = await getPackages();
  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) throw new VnpayRequestError(404, 'Gói không tồn tại');
  if (pkg.roles && !pkg.roles.includes(user.role)) throw new VnpayRequestError(403, 'Bạn không có quyền mua gói này');
  if (!pkg.price || pkg.price <= 0) throw new VnpayRequestError(400, 'Gói miễn phí không cần thanh toán');

  const order = await prisma.packageOrder.create({
    data: {
      orderRef: generateOrderRef(),
      userId: user.id,
      userRole: user.role,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      packageDays: pkg.days,
      method: 'VNPAY',
      bankName: 'VNPay',
      bankBin: 'VNPAY',
      accountNumber: '-',
      accountHolder: 'Cổng thanh toán VNPay',
      transferRef: generateTransferRef(),
      amount: pkg.price,
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await createAuditLog(user.id, 'created', order.id, 'package_order', { packageId: pkg.id, amount: pkg.price, method: 'vnpay' });
  return order;
}

// POST /api/payment/create-vnpay-url - Create a VNPay payment URL
router.post('/create-vnpay-url', authenticate, async (req, res, next) => {
  try {
    if (!vnpayService.isConfigured()) {
      return res.status(503).json({ error: 'Cổng VNPay chưa được cấu hình' });
    }

    const body = req.body || {};
    const purpose = body.purpose || (body.packageId || body.orderId ? 'package_order' : 'wallet_deposit');
    if (!VNPAY_PURPOSES.includes(purpose)) {
      return res.status(400).json({ error: 'Loại thanh toán không hợp lệ' });
    }

    let target;
    let txData;
    let orderInfo;
    let orderType;
    let responseTarget;

    if (purpose === 'wallet_deposit') {
      const deposit = await resolveVnpayDeposit(req.user.id, body);
      target = deposit;
      txData = { type: 'deposit', description: `Nạp tiền ví qua VNPay - ${deposit.depositRef}` };
      orderInfo = `Nap tien vi Thien Nhan Tru Do ${deposit.depositRef}`;
      orderType = 'topup';
      responseTarget = { deposit: { id: deposit.id, depositRef: deposit.depositRef, amount: deposit.amount, status: deposit.status } };
    } else {
      const order = await resolveVnpayPackageOrder(req.user, body);
      target = order;
      txData = { type: 'payment', description: `Mua gói ${order.packageName} qua VNPay - ${order.orderRef}` };
      orderInfo = `Thanh toan goi ${order.packageName} ${order.orderRef}`;
      orderType = 'billpayment';
      responseTarget = {
        order: { id: order.id, orderRef: order.orderRef, packageName: order.packageName, amount: order.amount, status: order.status },
      };
    }

    // One VNPay attempt = one Transaction; vnp_TxnRef links back to it.
    const txnRef = vnpayService.generateTxnRef(purpose === 'wallet_deposit' ? 'WD' : 'PK');
    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type: txData.type,
        amount: target.amount,
        method: 'vnpay',
        status: 'pending',
        description: txData.description,
        vnpayTxRef: txnRef,
        idempotencyKey: vnpayKey(purpose, target.id),
      },
    });

    const paymentUrl = vnpayService.createPaymentUrl({
      ipAddr: req.ip,
      amount: target.amount,
      orderId: txnRef,
      orderInfo,
      orderType,
      returnUrl: resolveVnpayReturnUrl(req),
    });

    res.json({ success: true, purpose, paymentUrl, txnRef, ...responseTarget });
  } catch (error) {
    if (error instanceof VnpayRequestError) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * Apply a verified VNPay result to the database. Idempotent: the return
 * callback and the IPN may both arrive, in any order, any number of times.
 * @returns {Promise<{ code: string, purpose?: string|null, transaction?: object,
 *   deposit?: object|null, order?: object|null, wallet?: object|null, subscription?: object|null }>}
 *   code uses VNPay IPN semantics: 00 ok, 01 not found, 02 already processed, 04 bad amount.
 */
async function applyVnpayResult(result) {
  const transaction = await prisma.transaction.findFirst({
    where: { vnpayTxRef: result.orderId, method: 'vnpay' },
  });
  if (!transaction) return { code: '01' };

  if (Math.round(transaction.amount) !== Math.round(result.amount)) {
    console.error(`[VNPay] Amount mismatch for ${result.orderId}: expected ${transaction.amount}, got ${result.amount}`);
    return { code: '04', transaction };
  }

  const { purpose, targetId } = parseVnpayKey(transaction.idempotencyKey);

  const loadState = async (code) => {
    const [fresh, deposit, order, wallet] = await Promise.all([
      prisma.transaction.findUnique({ where: { id: transaction.id } }),
      purpose === 'wallet_deposit' ? prisma.walletDeposit.findUnique({ where: { id: targetId } }) : null,
      purpose === 'package_order' ? prisma.packageOrder.findUnique({ where: { id: targetId } }) : null,
      prisma.sellerWallet.findUnique({ where: { userId: transaction.userId } }),
    ]);
    const subscription =
      order && order.status === 'APPROVED'
        ? await prisma.subscription.findFirst({ where: { userId: order.userId, orderId: order.id } })
        : null;
    return { code, purpose, transaction: fresh, deposit, order, wallet, subscription };
  };

  if (transaction.status !== 'pending') return loadState('02');

  const newStatus = result.isSuccess ? 'completed' : 'failed';
  const pkg =
    result.isSuccess && purpose === 'package_order'
      ? await (async () => {
          const order = await prisma.packageOrder.findUnique({ where: { id: targetId } });
          const packages = await getPackages();
          return order ? packages.find((p) => p.id === order.packageId) : null;
        })()
      : null;
  let fulfilled = null;

  await prisma.$transaction(async (tx) => {
    // Conditional update: only the first processor flips pending -> final.
    const flipped = await tx.transaction.updateMany({
      where: { id: transaction.id, status: 'pending' },
      data: { status: newStatus, vnpayDate: result.payDate || null },
    });
    if (flipped.count === 0 || !result.isSuccess || !purpose) return;

    const verification = {
      reviewedAt: new Date(),
      reviewerNote: 'Tự động xác nhận qua VNPay',
      verifiedBankTx: result.transactionNo || result.orderId,
      verifiedDate: new Date(),
    };
    const auditDetails = {
      amount: transaction.amount,
      txnRef: result.orderId,
      vnpTransactionNo: result.transactionNo,
      bankCode: result.bankCode,
    };

    if (purpose === 'wallet_deposit') {
      const approved = await tx.walletDeposit.updateMany({
        where: { id: targetId, status: { in: ['PENDING', 'PENDING_REVIEW'] } },
        data: { status: 'APPROVED', ...verification },
      });
      if (approved.count === 0) return;

      await tx.sellerWallet.upsert({
        where: { userId: transaction.userId },
        create: { userId: transaction.userId, balance: transaction.amount, totalSpent: 0 },
        update: { balance: { increment: transaction.amount } },
      });
      await tx.auditLog.create({
        data: {
          actorId: transaction.userId,
          action: 'vnpay_wallet_deposit_completed',
          target: targetId,
          targetType: 'wallet_deposit',
          details: JSON.stringify(auditDetails),
        },
      });
      fulfilled = { purpose };
      return;
    }

    // package_order
    const approved = await tx.packageOrder.updateMany({
      where: { id: targetId, status: { in: ['PENDING_PAYMENT', 'PENDING_REVIEW'] } },
      data: { status: 'APPROVED', method: 'VNPAY', verifiedAmount: transaction.amount, ...verification },
    });
    if (approved.count === 0) return;

    const order = await tx.packageOrder.findUnique({ where: { id: targetId } });
    const activation = await activatePackageSubscription(tx, order, pkg, {
      actorId: transaction.userId,
      auditAction: 'vnpay_package_paid',
      auditDetails,
      starSourceLabel: 'VNPay',
    });
    fulfilled = { purpose, order, ...activation };
  });

  const state = await loadState('00');

  if (fulfilled?.purpose === 'wallet_deposit') {
    await sendNotification(
      transaction.userId,
      'system',
      'Nạp tiền thành công',
      `Nạp ${transaction.amount.toLocaleString('vi-VN')}đ qua VNPay thành công. Số dư ví mới: ${(state.wallet?.balance || 0).toLocaleString('vi-VN')}đ`,
      '/seller/billing'
    );
  } else if (fulfilled?.purpose === 'package_order') {
    const starMsg = fulfilled.starGranted ? ` Bạn cũng nhận được ${fulfilled.starBatch.originalAmount} Stars!` : '';
    await sendNotification(
      transaction.userId,
      'system',
      'Thanh toán gói thành công',
      `Thanh toán gói "${fulfilled.order.packageName}" qua VNPay thành công. Gói có hiệu lực đến ${fulfilled.subscription.expiresAt.toLocaleDateString('vi-VN')}.${starMsg}`,
      '/tai-khoan/nang-cap'
    );
  }

  return state;
}

// GET /api/payment/vnpay-callback - Verify the browser redirect from VNPay
// Called by the FE page /payment/callback with VNPay's query string as-is.
router.get('/vnpay-callback', async (req, res, next) => {
  try {
    const result = vnpayService.verifyPaymentReturn(req.query);
    const base = {
      isValid: result.isValid,
      responseCode: result.responseCode,
      txnRef: result.orderId,
      amount: result.amount,
      transactionNo: result.transactionNo,
      bankCode: result.bankCode,
      payDate: result.payDate,
      purpose: null,
      retryPath: '/seller/billing',
      retryParams: null,
    };

    if (!result.isValid) {
      return res.json({
        ...base,
        success: false,
        message: 'Chữ ký giao dịch không hợp lệ. Dữ liệu có thể đã bị thay đổi.',
      });
    }

    const state = await applyVnpayResult(result);

    if (state.code === '01') {
      return res.json({ ...base, success: false, message: 'Không tìm thấy giao dịch' });
    }
    if (state.code === '04') {
      return res.json({ ...base, success: false, message: 'Số tiền giao dịch không khớp' });
    }

    const success = state.transaction?.status === 'completed';
    let retryParams = null;
    if (!success && state.deposit?.status === 'PENDING') retryParams = { depositId: state.deposit.id };
    if (!success && state.order?.status === 'PENDING_PAYMENT') retryParams = { orderId: state.order.id };

    res.json({
      ...base,
      success,
      message: success ? 'Thanh toán thành công' : result.message,
      status: state.transaction?.status,
      purpose: state.purpose,
      retryPath: state.purpose === 'package_order' ? '/tai-khoan/nang-cap' : '/seller/billing',
      retryParams,
      deposit: state.deposit
        ? { id: state.deposit.id, depositRef: state.deposit.depositRef, status: state.deposit.status }
        : null,
      order: state.order
        ? { id: state.order.id, orderRef: state.order.orderRef, packageName: state.order.packageName, status: state.order.status }
        : null,
      subscription: state.subscription
        ? { packageName: state.subscription.packageName, expiresAt: state.subscription.expiresAt }
        : null,
      walletBalance: state.wallet?.balance ?? null,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payment/vnpay-ipn - Server-to-server notification from VNPay
// Must answer with { RspCode, Message } as specified by VNPay.
router.get('/vnpay-ipn', async (req, res) => {
  try {
    const result = vnpayService.verifyPaymentReturn(req.query);
    if (!result.isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
    const state = await applyVnpayResult(result);
    const messages = {
      '00': 'Confirm Success',
      '01': 'Order not found',
      '02': 'Order already confirmed',
      '04': 'Invalid amount',
    };
    res.status(200).json({ RspCode: state.code, Message: messages[state.code] || 'Unknown' });
  } catch (error) {
    console.error('[VNPay IPN] error:', error);
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// Check transaction status
router.get('/status/:txnRef', authenticate, async (req, res, next) => {
  try {
    const { txnRef } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        vnpayTxRef: txnRef,
        userId: req.user.id,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
    }

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
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

// Get wallet balance
router.get('/wallet', authenticate, async (req, res, next) => {
  try {
    let wallet = await prisma.sellerWallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      wallet = await prisma.sellerWallet.create({
        data: {
          userId: req.user.id,
          balance: 0,
        },
      });
    }

    res.json({ wallet });
  } catch (error) {
    next(error);
  }
});

// Get packages
router.get('/packages', async (req, res, next) => {
  try {
    // Check if packages config exists, if not create default
    let packagesConfig = await prisma.systemConfig.findUnique({
      where: { key: 'packages' },
    });

    if (!packagesConfig) {
      // Create default packages config
      const defaultPackages = [
        {
          id: 'basic',
          name: 'Gói Cơ Bản',
          price: 0,
          days: 7,
          weeklyPosts: 5,
          vipBoosts: 0,
          features: ['5 tin đăng/tuần', 'Hỗ trợ email'],
        },
        {
          id: 'standard',
          name: 'Gói Tiêu Chuẩn',
          price: 99000,
          days: 7,
          weeklyPosts: 20,
          vipBoosts: 2,
          features: ['20 tin đăng/tuần', '2 lần đẩy VIP/tuần', 'Hỗ trợ ưu tiên'],
          popular: true,
        },
        {
          id: 'vip',
          name: 'Gói VIP',
          price: 299000,
          days: 7,
          weeklyPosts: 100,
          vipBoosts: 10,
          features: ['100 tin đăng/tuần', '10 lần đẩy VIP/tuần', 'Hỗ trợ ưu tiên'],
        },
        {
          id: 'verify',
          name: 'Gói Kiểm Định',
          price: 799000,
          days: 1,
          features: ['1 lần kiểm định thực địa', 'Chụp ảnh chuyên nghiệp', 'Huy hiệu Manager Verified'],
        },
      ];

      packagesConfig = await prisma.systemConfig.create({
        data: {
          key: 'packages',
          value: JSON.stringify(defaultPackages),
          description: 'Danh sách gói dịch vụ',
        },
      });
    }

    let parsedPackages = [];
    try {
      parsedPackages = JSON.parse(packagesConfig.value);
    } catch (e) {
      // Fallback to hardcoded if parse fails
      parsedPackages = [
        { id: 'basic', name: 'Gói Cơ Bản', price: 0, days: 7, weeklyPosts: 5, vipBoosts: 0, features: ['5 tin đăng/tuần', 'Hỗ trợ email'] },
        { id: 'standard', name: 'Gói Tiêu Chuẩn', price: 99000, days: 7, weeklyPosts: 20, vipBoosts: 2, features: ['20 tin đăng/tuần', '2 lần đẩy VIP/tuần', 'Hỗ trợ ưu tiên'], popular: true },
        { id: 'vip', name: 'Gói VIP', price: 299000, days: 7, weeklyPosts: 100, vipBoosts: 10, features: ['100 tin đăng/tuần', '10 lần đẩy VIP/tuần', 'Hỗ trợ ưu tiên'] },
        { id: 'verify', name: 'Gói Kiểm Định', price: 799000, days: 1, features: ['1 lần kiểm định thực địa', 'Chụp ảnh chuyên nghiệp', 'Huy hiệu Manager Verified'] },
      ];
    }

    res.json({ packages: parsedPackages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// ============================================
// MANUAL BANK TRANSFER - Package Orders
// For users who prefer bank transfer over VNPay
// ============================================

// Helper: Generate unique order reference
function generateOrderRef() {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(2, 14); // YYMMDDHHMMSS
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TNP-${timestamp}-${random}`;
}

// Helper: Generate transfer reference (shorter, for bank transfer memo)
function generateTransferRef() {
  return `TNP${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Helper: Get active bank account
async function getActiveBankAccount() {
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!bankAccount) {
    return null;
  }

  return {
    bankName: bankAccount.bankName,
    bankBin: bankAccount.bankBin,
    accountNumber: bankAccount.accountNumber,
    accountHolder: bankAccount.accountHolder,
    qrImageUrl: bankAccount.qrImageUrl,
  };
}

// Helper: Get packages from SystemConfig
async function getPackages() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'packages' },
  });
  
  if (config) {
    try {
      return JSON.parse(config.value);
    } catch (e) {
      // Fallback
    }
  }
  
  // Default packages
  return [
    { id: 'basic', name: 'Gói Cơ Bản', price: 0, days: 30, roles: ['tenant', 'seller'], features: ['5 tin đăng', 'Hỗ trợ email', 'Thống kê cơ bản'] },
    { id: 'standard', name: 'Gói Tiêu Chuẩn', price: 99000, days: 30, roles: ['tenant', 'seller'], features: ['20 tin đăng', 'Hỗ trợ ưu tiên', 'Báo cáo thống kê', 'Verified Badge'], popular: true },
    { id: 'vip', name: 'Gói VIP', price: 299000, days: 30, roles: ['tenant', 'seller'], features: ['Không giới hạn tin', 'Ghim tin VIP', 'Hỗ trợ 24/7', 'Analytics nâng cao', 'Verified Badge'] },
    { id: 'verify', name: 'Gói Kiểm Định', price: 799000, days: 1, roles: ['seller'], features: ['Manager kiểm tra thực địa', 'Chụp ảnh chuyên nghiệp', 'Cấp Verified Badge', 'Báo cáo thẩm định'] },
  ];
}

// Helper: Send notification
async function sendNotification(userId, type, title, body, link = null, metadata = null) {
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

// Helper: Create audit log
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
// GET /api/payment/packages - List available packages
// ============================================
router.get('/packages', async (req, res, next) => {
  try {
    const packages = await getPackages();
    const userRole = req.query.role || 'tenant';
    
    // Filter packages by role
    const eligiblePackages = packages.filter(pkg => {
      if (!pkg.roles) return true; // No role restriction
      return pkg.roles.includes(userRole);
    });
    
    res.json({ packages: eligiblePackages });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/payment/bank-account - Get active bank account for QR
// ============================================
router.get('/bank-account', async (req, res, next) => {
  try {
    const bankAccount = await getActiveBankAccount();
    
    if (!bankAccount) {
      return res.status(404).json({ error: 'Không có tài khoản ngân hàng nhận thanh toán được cấu hình' });
    }
    
    res.json({ bankAccount });
  } catch (error) {
    next(error);
  }
});

// Package orders are created and paid through VNPay: see POST /create-vnpay-url
// (purpose: package_order). Manual bank-transfer ordering was removed; the
// manager review routes below are kept for orders created before the switch.

// ============================================
// POST /api/payment/purchase-wallet - Purchase package using wallet balance
// ============================================
router.post('/purchase-wallet', authenticate, async (req, res, next) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!packageId) {
      return res.status(400).json({ error: 'packageId là bắt buộc' });
    }

    // Get packages
    const packages = await getPackages();
    const pkg = packages.find(p => p.id === packageId);

    if (!pkg) {
      return res.status(404).json({ error: 'Gói không tồn tại' });
    }

    // Validate role eligibility
    if (pkg.roles && !pkg.roles.includes(userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền mua gói này' });
    }

    // Get or create wallet
    let wallet = await prisma.sellerWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.sellerWallet.create({
        data: {
          userId,
          balance: 0,
          totalSpent: 0,
        },
      });
    }

    // Check balance
    if (wallet.balance < pkg.price) {
      return res.status(400).json({
        error: 'Số dư không đủ',
        required: pkg.price,
        available: wallet.balance,
      });
    }

    // Calculate subscription expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.days * 24 * 60 * 60 * 1000);

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedWallet = await tx.sellerWallet.update({
        where: { userId },
        data: {
          balance: { decrement: pkg.price },
          totalSpent: { increment: pkg.price },
        },
      });

      // Check for existing active subscription of same package
      let subscription = await tx.subscription.findFirst({
        where: {
          userId,
          packageId: pkg.id,
          isActive: true,
        },
      });

      if (subscription) {
        // Extend existing subscription
        let startDate = subscription.expiresAt > now ? subscription.expiresAt : now;
        let newExpiresAt = new Date(startDate.getTime() + pkg.days * 24 * 60 * 60 * 1000);

        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            expiresAt: newExpiresAt,
            updatedAt: now,
          },
        });
      } else {
        // Create new subscription
        subscription = await tx.subscription.create({
          data: {
            userId,
            packageId: pkg.id,
            packageName: pkg.name,
            packageType: pkg.id,
            startedAt: now,
            expiresAt,
            isActive: true,
            // weeklyPosts: số tin đăng mỗi tuần, vipBoosts: số lần đẩy VIP mỗi tuần
            maxListings: pkg.weeklyPosts || pkg.maxListings || (pkg.id === 'vip' ? 100 : (pkg.id === 'standard' ? 20 : 5)),
          },
        });
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'payment',
          amount: pkg.price,
          method: 'wallet',
          status: 'completed',
          description: `Mua gói "${pkg.name}" qua ví`,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'purchase_package_wallet',
          target: pkg.id,
          targetType: 'package',
          details: JSON.stringify({
            packageName: pkg.name,
            amount: pkg.price,
            newBalance: updatedWallet.balance,
            subscriptionId: subscription.id,
          }),
        },
      });

      // Grant Stars for new/extended subscription
      // grantRef uses subscriptionId, so extensions don't trigger new grants (idempotent)
      const starAlloc = require('../helpers/starHelper').getStarAllocation(pkg.id);
      let starGranted = false;
      let starBatch = null;

      if (starAlloc.stars > 0) {
        const grantRef = `sub_${subscription.id}`;
        const existingGrant = await tx.starGrantBatch.findUnique({ where: { grantRef } });
        if (!existingGrant) {
          // Create StarCredit if needed
          let starCredit = await tx.starCredit.findUnique({ where: { userId } });
          if (!starCredit) {
            starCredit = await tx.starCredit.create({ data: { userId } });
          }
          // Create grant batch
          starBatch = await tx.starGrantBatch.create({
            data: {
              userId,
              grantRef,
              subscriptionId: subscription.id,
              packageId: pkg.id,
              originalAmount: starAlloc.stars,
              remainingAmount: starAlloc.stars,
              expiresAt: subscription.expiresAt,
              isExpired: false,
            },
          });
          // Record GRANT transaction
          await tx.starTransaction.create({
            data: {
              userId,
              type: 'GRANT',
              amount: starAlloc.stars,
              balanceAfter: starAlloc.stars,
              description: `Nhận ${starAlloc.stars} Stars từ gói ${pkg.name}`,
              grantBatchId: starBatch.id,
              subscriptionId: subscription.id,
            },
          });
          starGranted = true;
        }
      }

      return { wallet: updatedWallet, subscription, starGranted, starBatch };
    });

    // Send notification
    const starMsg = result.starGranted
      ? ` Bạn cũng nhận được ${result.starBatch.originalAmount} Stars!`
      : '';
    await sendNotification(
      userId,
      'system',
      'Mua gói thành công',
      `Bạn đã kích hoạt gói "${pkg.name}" thành công. Gói sẽ active đến ${result.subscription.expiresAt.toLocaleDateString('vi-VN')}${starMsg}`,
      '/tai-khoan/nang-cap'
    );

    res.json({
      success: true,
      message: `Đã kích hoạt gói "${pkg.name}"`,
      wallet: {
        id: result.wallet.id,
        balance: result.wallet.balance,
        totalSpent: result.wallet.totalSpent,
      },
      subscription: {
        id: result.subscription.id,
        packageName: result.subscription.packageName,
        expiresAt: result.subscription.expiresAt,
      },
      stars: result.starGranted
        ? { granted: true, amount: result.starBatch.originalAmount }
        : { granted: false },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/payment/my-subscription - Get user's active subscription
// ============================================
router.get('/my-subscription', authenticate, async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });
    
    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/payment/my-orders - List user's package orders
// ============================================
router.get('/my-orders', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }
    
    const [orders, total] = await Promise.all([
      prisma.packageOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.packageOrder.count({ where }),
    ]);
    
    res.json({
      orders,
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
// GET /api/payment/order/:id - Get order details
// ============================================
router.get('/order/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.packageOrder.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
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
// POST /api/payment/cancel-order - Cancel pending order
// ============================================
router.post('/cancel-order/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const order = await prisma.packageOrder.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    if (!['PENDING_PAYMENT', 'PENDING_REVIEW'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể hủy đơn hàng ở trạng thái này' });
    }
    
    const updated = await prisma.packageOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });
    
    // Log audit
    await createAuditLog(req.user.id, 'cancelled', id, 'package_order');
    
    // Notify user
    await sendNotification(
      req.user.id,
      'system',
      'Đơn hàng đã hủy',
      `Đơn hàng ${order.orderRef} đã được hủy.`
    );
    
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
// MANAGER ENDPOINTS
// ============================================

// GET /api/payment/manager/reviews - List orders pending review
router.get('/manager/reviews', authenticate, async (req, res, next) => {
  try {
    // Check manager/admin role
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    
    const { status = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status !== 'all') {
      where.status = status;
    }
    
    const [orders, total] = await Promise.all([
      prisma.packageOrder.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.packageOrder.count({ where }),
    ]);
    
    res.json({
      orders,
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

// GET /api/payment/manager/order/:id - Get order details for review
router.get('/manager/order/:id', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    
    const { id } = req.params;
    
    const order = await prisma.packageOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
      },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/manager/approve - Approve payment and activate package
router.post('/manager/approve/:id', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    
    const { id } = req.params;
    const { verifiedAmount, verifiedBankTx, verifiedDate, internalNote } = req.body;
    
    // Validate required fields
    if (verifiedAmount === undefined || !verifiedBankTx || !verifiedDate) {
      return res.status(400).json({ 
        error: 'Cần xác minh: verifiedAmount, verifiedBankTx, verifiedDate' 
      });
    }
    
    const managerId = req.user.id;
    
    // Find order with lock
    const order = await prisma.packageOrder.findUnique({
      where: { id },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    // Idempotency check - already processed
    if (order.status === 'APPROVED') {
      return res.status(409).json({ error: 'Đơn hàng đã được duyệt trước đó' });
    }
    
    if (!['PENDING_REVIEW', 'PENDING_PAYMENT'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể duyệt đơn hàng ở trạng thái này' });
    }
    
    // Check for duplicate bank transaction reference
    const existingApproval = await prisma.packageOrder.findFirst({
      where: {
        verifiedBankTx,
        status: 'APPROVED',
        id: { not: id },
      },
    });
    
    if (existingApproval) {
      return res.status(409).json({ 
        error: 'Mã giao dịch ngân hàng đã được sử dụng cho đơn hàng khác' 
      });
    }
    
    // Amount verification
    if (Math.abs(verifiedAmount - order.amount) > 1000) { // Allow 1000 VND tolerance
      console.warn(`[Payment Approval] Amount mismatch: expected ${order.amount}, got ${verifiedAmount}`);
    }
    
    // Get packages for subscription details
    const packages = await getPackages();
    const pkg = packages.find(p => p.id === order.packageId);
    
    // Atomic update: mark order approved and create/extend subscription
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.packageOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: managerId,
          reviewerNote: internalNote || null,
          verifiedAmount: parseFloat(verifiedAmount),
          verifiedBankTx,
          verifiedDate: new Date(verifiedDate),
        },
      });
      
      const activation = await activatePackageSubscription(tx, order, pkg, {
        actorId: managerId,
        auditAction: 'approved_payment',
        auditDetails: { verifiedAmount, verifiedBankTx, verifiedDate },
        starSourceLabel: 'chuyển khoản',
      });

      return { updatedOrder, ...activation };
    });

    // Send notification to user
    const starMsg = result.starGranted
      ? ` Bạn cũng nhận được ${result.starBatch.originalAmount} Stars!`
      : '';
    await sendNotification(
      order.userId,
      'system',
      'Thanh toán được duyệt',
      `Thanh toán gói "${order.packageName}" đã được xác nhận. Gói của bạn sẽ active đến ${result.subscription.expiresAt.toLocaleDateString('vi-VN')}${starMsg}`,
      '/tai-khoan/nang-cap'
    );

    res.json({
      success: true,
      message: 'Đã duyệt thanh toán và kích hoạt gói',
      order: result.updatedOrder,
      subscription: {
        id: result.subscription.id,
        packageName: result.subscription.packageName,
        expiresAt: result.subscription.expiresAt,
      },
      stars: result.starGranted
        ? { granted: true, amount: result.starBatch.originalAmount }
        : { granted: false },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create or extend the buyer's subscription for a paid package order, write
 * the audit log and grant the package's Stars. Must run inside a Prisma
 * interactive transaction (`tx`) after the order has been marked APPROVED.
 * Shared by manual manager approval and automatic VNPay confirmation.
 */
async function activatePackageSubscription(tx, order, pkg, { actorId, auditAction, auditDetails, starSourceLabel }) {
      // Calculate subscription expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + order.packageDays * 24 * 60 * 60 * 1000);

      // Check for existing active subscription of same package
      let subscription = await tx.subscription.findFirst({
        where: {
          userId: order.userId,
          packageId: order.packageId,
          isActive: true,
        },
      });
      
      if (subscription) {
        // Extend existing subscription
        // If current subscription hasn't expired, extend from expiry date
        // Otherwise start from now
        let startDate = subscription.expiresAt > now ? subscription.expiresAt : now;
        let newExpiresAt = new Date(startDate.getTime() + order.packageDays * 24 * 60 * 60 * 1000);
        
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            expiresAt: newExpiresAt,
            orderId: order.id,
            updatedAt: now,
          },
        });
      } else {
        // Create new subscription
        subscription = await tx.subscription.create({
          data: {
            userId: order.userId,
            packageId: order.packageId,
            packageName: order.packageName,
            packageType: order.packageId,
            startedAt: now,
            expiresAt,
            orderId: order.id,
            isActive: true,
            maxListings: pkg?.maxListings || (order.packageId === 'vip' ? 0 : (order.packageId === 'basic' ? 5 : 20)),
          },
        });
      }
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId,
          action: auditAction,
          target: order.id,
          targetType: 'package_order',
          details: JSON.stringify({
            ...auditDetails,
            subscriptionId: subscription.id,
          }),
        },
      });

      // Grant Stars for new/extended subscription
      const starAlloc = require('../helpers/starHelper').getStarAllocation(order.packageId);
      let starGranted = false;
      let starBatch = null;

      if (starAlloc.stars > 0) {
        const grantRef = `sub_${subscription.id}`;
        const existingGrant = await tx.starGrantBatch.findUnique({ where: { grantRef } });
        if (!existingGrant) {
          // Create StarCredit if needed
          let starCredit = await tx.starCredit.findUnique({ where: { userId: order.userId } });
          if (!starCredit) {
            starCredit = await tx.starCredit.create({ data: { userId: order.userId } });
          }
          // Create grant batch
          starBatch = await tx.starGrantBatch.create({
            data: {
              userId: order.userId,
              grantRef,
              subscriptionId: subscription.id,
              packageId: order.packageId,
              originalAmount: starAlloc.stars,
              remainingAmount: starAlloc.stars,
              expiresAt: subscription.expiresAt,
              isExpired: false,
            },
          });
          // Record GRANT transaction
          await tx.starTransaction.create({
            data: {
              userId: order.userId,
              type: 'GRANT',
              amount: starAlloc.stars,
              balanceAfter: starAlloc.stars,
              description: `Nhận ${starAlloc.stars} Stars từ gói ${order.packageName} (${starSourceLabel})`,
              grantBatchId: starBatch.id,
              subscriptionId: subscription.id,
            },
          });
          starGranted = true;
        }
      }

      return { subscription, starGranted, starBatch };
}

// POST /api/payment/manager/reject - Reject payment
router.post('/manager/reject/:id', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    
    const { id } = req.params;
    const { reason, requestClarification } = req.body;
    
    if (!reason && !requestClarification) {
      return res.status(400).json({ error: 'Cần cung cấp lý do hoặc yêu cầu làm rõ' });
    }
    
    const order = await prisma.packageOrder.findUnique({
      where: { id },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    if (!['PENDING_REVIEW', 'PENDING_PAYMENT'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể từ chối đơn hàng ở trạng thái này' });
    }
    
    // If request clarification, keep as PENDING_REVIEW
    const newStatus = requestClarification ? 'PENDING_REVIEW' : 'REJECTED';
    
    const updatedOrder = await prisma.packageOrder.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewerNote: reason || 'Yêu cầu làm rõ thêm thông tin',
      },
    });
    
    // Create audit log
    await createAuditLog(req.user.id, 'rejected_payment', id, 'package_order', {
      reason,
      requestClarification,
    });
    
    // Notify user
    const title = requestClarification ? 'Yêu cầu làm rõ' : 'Thanh toán bị từ chối';
    const body = requestClarification 
      ? `Yêu cầu thanh toán ${order.orderRef} cần bổ sung thông tin.`
      : `Thanh toán gói "${order.packageName}" đã bị từ chối. Lý do: ${reason}`;
    
    await sendNotification(order.userId, 'system', title, body, '/tai-khoan/nang-cap');
    
    res.json({
      success: true,
      message: requestClarification ? 'Đã yêu cầu làm rõ' : 'Đã từ chối thanh toán',
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN ENDPOINTS - Bank Account Configuration
// ============================================

// GET /api/payment/admin/bank-accounts - List all bank accounts
router.get('/admin/bank-accounts', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const accounts = await prisma.bankAccount.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/admin/bank-accounts - Create bank account
router.post('/admin/bank-accounts', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const { bankName, bankBin, accountNumber, accountHolder, isActive = false, qrImageUrl } = req.body;
    
    // Validation
    if (!bankName || !bankBin || !accountNumber || !accountHolder) {
      return res.status(400).json({ error: 'Thông tin ngân hàng không đầy đủ' });
    }
    
    if (!/^\d{6}$/.test(bankBin)) {
      return res.status(400).json({ error: 'Mã BIN ngân hàng phải có 6 chữ số' });
    }
    
    // If setting as active, deactivate others
    if (isActive) {
      await prisma.bankAccount.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    
    const bankAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        bankBin,
        accountNumber,
        accountHolder,
        isActive,
        qrImageUrl: qrImageUrl || null,
        createdBy: req.user.id,
      },
    });
    
    // Create audit log
    await createAuditLog(req.user.id, 'created', bankAccount.id, 'bank_account', {
      bankName,
      bankBin,
      accountNumber: accountNumber.slice(-4).padStart(accountNumber.length, '*'), // Mask
      isActive,
    });
    
    res.status(201).json({
      success: true,
      bankAccount,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/payment/admin/bank-accounts/:id - Update bank account
router.put('/admin/bank-accounts/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const { id } = req.params;
    const { bankName, bankBin, accountNumber, accountHolder, isActive, qrImageUrl } = req.body;
    
    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản ngân hàng' });
    }
    
    // If setting as active, deactivate others
    if (isActive && !existing.isActive) {
      await prisma.bankAccount.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }
    
    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        bankName: bankName || existing.bankName,
        bankBin: bankBin || existing.bankBin,
        accountNumber: accountNumber || existing.accountNumber,
        accountHolder: accountHolder || existing.accountHolder,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        qrImageUrl: qrImageUrl !== undefined ? qrImageUrl : existing.qrImageUrl,
        version: { increment: 1 },
      },
    });
    
    // Create audit log
    await createAuditLog(req.user.id, 'updated', id, 'bank_account', {
      changes: { bankName, bankBin, accountNumber, isActive },
    });
    
    res.json({
      success: true,
      bankAccount,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/payment/admin/bank-accounts/:id - Delete bank account
router.delete('/admin/bank-accounts/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const { id } = req.params;
    
    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản ngân hàng' });
    }
    
    await prisma.bankAccount.delete({ where: { id } });
    
    // Create audit log
    await createAuditLog(req.user.id, 'deleted', id, 'bank_account');
    
    res.json({ success: true, message: 'Đã xóa tài khoản ngân hàng' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Cron Job: Expire old orders (call daily)
// ============================================

// POST /api/payment/expire-orders - Expire pending orders older than 72 hours
router.post('/expire-orders', authenticate, async (req, res, next) => {
  try {
    // Only admin or system can call this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const expiredOrders = await prisma.packageOrder.updateMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });
    
    res.json({
      success: true,
      expiredCount: expiredOrders.count,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ADMIN ENDPOINTS - Package Order Management
// ============================================

// GET /api/payment/admin/orders - List all orders (admin)
router.get('/admin/orders', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const { status, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    
    const [orders, total] = await Promise.all([
      prisma.packageOrder.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.packageOrder.count({ where }),
    ]);
    
    res.json({
      orders,
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

// GET /api/payment/admin/subscriptions - List active subscriptions
router.get('/admin/subscriptions', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }
    
    const { page = 1, limit = 20, expired } = req.query;
    
    const where = {};
    if (expired === 'true') {
      where.expiresAt = { lt: new Date() };
    } else if (expired === 'false') {
      where.expiresAt = { gte: new Date() };
    }
    
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true, role: true } },
        },
        orderBy: { expiresAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.subscription.count({ where }),
    ]);
    
    res.json({
      subscriptions,
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
// WALLET DEPOSIT - Direct wallet top-up via bank transfer
// ============================================

// Helper: Generate unique deposit reference
function generateDepositRef() {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(2, 14);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `WDP-${timestamp}-${random}`;
}

// Helper: Generate transfer reference
function generateWalletTransferRef() {
  return `WD${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Wallet top-ups are created and paid through VNPay: see POST /create-vnpay-url.
// (Manual bank-transfer deposits were removed; manager review routes below
//  are kept so requests created before the switch can still be processed.)

// ============================================
// GET /api/payment/deposits - List user's deposits
// ============================================
router.get('/deposits', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }

    const [deposits, total] = await Promise.all([
      prisma.walletDeposit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.walletDeposit.count({ where }),
    ]);

    res.json({
      deposits,
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
// GET /api/payment/deposit/:id - Get deposit details
// ============================================
router.get('/deposit/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const deposit = await prisma.walletDeposit.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });
    }

    res.json({ deposit });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/payment/deposit/:id/cancel - Cancel deposit
// ============================================
router.post('/deposit/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const deposit = await prisma.walletDeposit.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Không thể hủy yêu cầu ở trạng thái này' });
    }

    const updated = await prisma.walletDeposit.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await createAuditLog(req.user.id, 'cancelled', id, 'wallet_deposit');

    res.json({
      success: true,
      message: 'Đã hủy yêu cầu nạp tiền',
      deposit: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MANAGER ENDPOINTS - Wallet Deposit Review
// ============================================

// GET /api/payment/manager/deposits - List deposits for review
router.get('/manager/deposits', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { status = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const [deposits, total] = await Promise.all([
      prisma.walletDeposit.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.walletDeposit.count({ where }),
    ]);

    res.json({
      deposits,
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

// GET /api/payment/manager/deposit/:id - Get deposit details for review
router.get('/manager/deposit/:id', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { id } = req.params;

    const deposit = await prisma.walletDeposit.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });
    }

    res.json({ deposit });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/manager/deposit/:id/approve - Approve deposit and credit wallet
router.post('/manager/deposit/:id/approve', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { id } = req.params;
    const { verifiedBankTx, verifiedDate, internalNote } = req.body;

    if (!verifiedBankTx) {
      return res.status(400).json({ error: 'Cần cung cấp mã giao dịch ngân hàng' });
    }

    const managerId = req.user.id;

    // Find deposit
    const deposit = await prisma.walletDeposit.findUnique({
      where: { id },
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });
    }

    // Security: Prevent manager from approving their own deposit
    if (deposit.userId === managerId) {
      return res.status(403).json({ error: 'Bạn không thể duyệt yêu cầu nạp tiền của chính mình' });
    }

    // Idempotency check
    if (deposit.status === 'APPROVED') {
      return res.status(409).json({ error: 'Yêu cầu đã được duyệt trước đó' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Không thể duyệt yêu cầu ở trạng thái này' });
    }

    // Check for duplicate bank transaction
    const existingApproval = await prisma.walletDeposit.findFirst({
      where: {
        verifiedBankTx,
        status: 'APPROVED',
        id: { not: id },
      },
    });

    if (existingApproval) {
      return res.status(409).json({ error: 'Mã giao dịch ngân hàng đã được sử dụng' });
    }

    // Atomic update: approve deposit and credit wallet
    // Use conditional update to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Attempt conditional update - only succeeds if status is PENDING or PENDING_REVIEW
      const updatedDeposit = await tx.walletDeposit.updateMany({
        where: {
          id,
          status: { in: ['PENDING', 'PENDING_REVIEW'] },
        },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: managerId,
          reviewerNote: internalNote || null,
          verifiedBankTx,
          verifiedDate: verifiedDate ? new Date(verifiedDate) : new Date(),
        },
      });

      // If no document was updated, someone else already processed this
      if (updatedDeposit.count === 0) {
        throw new Error('Yêu cầu đã được xử lý bởi người khác');
      }

      // Get updated deposit for the response
      const deposit = await tx.walletDeposit.findUnique({ where: { id } });

      // Get or create wallet
      let wallet = await tx.sellerWallet.findUnique({
        where: { userId: deposit.userId },
      });

      if (!wallet) {
        wallet = await tx.sellerWallet.create({
          data: {
            userId: deposit.userId,
            balance: deposit.amount,
            totalSpent: 0,
          },
        });
      } else {
        // Credit wallet balance atomically
        wallet = await tx.sellerWallet.update({
          where: { userId: deposit.userId },
          data: {
            balance: { increment: deposit.amount },
          },
        });
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          amount: deposit.amount,
          method: 'bank_transfer',
          status: 'completed',
          description: `Nạp tiền ví - Mã GD: ${verifiedBankTx}`,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: managerId,
          action: 'approved_wallet_deposit',
          target: deposit.id,
          targetType: 'wallet_deposit',
          details: JSON.stringify({
            amount: deposit.amount,
            verifiedBankTx,
            newBalance: wallet.balance,
          }),
        },
      });

      return { deposit, wallet };
    });

    // Notify user
    await sendNotification(
      deposit.userId,
      'system',
      'Nạp tiền thành công',
      `Yêu cầu nạp tiền ${deposit.amount.toLocaleString('vi-VN')}đ đã được xác nhận. Số dư ví mới: ${result.wallet.balance.toLocaleString('vi-VN')}đ`,
      '/seller/billing'
    );

    res.json({
      success: true,
      message: 'Đã duyệt nạp tiền và cộng vào ví',
      deposit: result.deposit,
      wallet: {
        id: result.wallet.id,
        balance: result.wallet.balance,
        totalSpent: result.wallet.totalSpent,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/manager/deposit/:id/reject - Reject deposit
router.post('/manager/deposit/:id/reject', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { id } = req.params;
    const { reason, requestClarification } = req.body;

    if (!reason && !requestClarification) {
      return res.status(400).json({ error: 'Cần cung cấp lý do từ chối' });
    }

    const deposit = await prisma.walletDeposit.findUnique({
      where: { id },
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });
    }

    // Security: Prevent manager from handling their own deposit
    if (deposit.userId === req.user.id) {
      return res.status(403).json({ error: 'Bạn không thể xử lý yêu cầu nạp tiền của chính mình' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Không thể từ chối yêu cầu ở trạng thái này' });
    }

    const newStatus = requestClarification ? 'PENDING_REVIEW' : 'REJECTED';

    const updated = await prisma.walletDeposit.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewerNote: reason || 'Yêu cầu làm rõ thêm thông tin',
      },
    });

    await createAuditLog(req.user.id, 'rejected_wallet_deposit', id, 'wallet_deposit', {
      reason,
      requestClarification,
    });

    const title = requestClarification ? 'Yêu cầu làm rõ' : 'Nạp tiền bị từ chối';
    const body = requestClarification
      ? `Yêu cầu nạp tiền ${deposit.depositRef} cần bổ sung thông tin.`
      : `Yêu cầu nạp tiền ${deposit.amount.toLocaleString('vi-VN')}đ đã bị từ chối. Lý do: ${reason}`;

    await sendNotification(deposit.userId, 'system', title, body, '/seller/billing');

    res.json({
      success: true,
      message: requestClarification ? 'Đã yêu cầu làm rõ' : 'Đã từ chối yêu cầu nạp tiền',
      deposit: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/payment/deposit/expire - Expire old deposits (cron job)
// ============================================
router.post('/deposit/expire', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ Admin mới có quyền' });
    }

    const expired = await prisma.walletDeposit.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    res.json({
      success: true,
      expiredCount: expired.count,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MANAGER ENDPOINTS - Boost Orders Review
// ============================================

// GET /api/payment/manager/boost-orders - List boost orders for review
router.get('/manager/boost-orders', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { status = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.boostOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.boostOrder.count({ where }),
    ]);

    res.json({
      orders,
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

// POST /api/payment/manager/boost-order/:id/approve - Approve boost order
router.post('/manager/boost-order/:id/approve', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { id } = req.params;
    const { verifiedBankTx, verifiedDate, internalNote } = req.body;

    if (!verifiedBankTx) {
      return res.status(400).json({ error: 'Cần cung cấp mã giao dịch ngân hàng' });
    }

    const order = await prisma.boostOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (order.status === 'APPROVED') {
      return res.status(409).json({ error: 'Đơn hàng đã được duyệt trước đó' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể duyệt đơn ở trạng thái này' });
    }

    // Calculate VIP expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + order.packageDays * 24 * 60 * 60 * 1000);

    // Get listing to calculate new VIP expiration
    const listing = await prisma.listing.findUnique({ where: { id: order.listingId } });

    let newVipExpiresAt = expiresAt;
    if (listing?.vip && listing?.vipExpiresAt && new Date(listing.vipExpiresAt) > now) {
      newVipExpiresAt = new Date(new Date(listing.vipExpiresAt).getTime() + order.packageDays * 24 * 60 * 60 * 1000);
    }

    // Atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Update order
      const updatedOrder = await tx.boostOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: req.user.id,
          reviewerNote: internalNote || null,
          verifiedBankTx,
          verifiedDate: verifiedDate ? new Date(verifiedDate) : new Date(),
        },
      });

      // Update listing with VIP
      const updatedListing = await tx.listing.update({
        where: { id: order.listingId },
        data: {
          vip: true,
          vipExpiresAt: newVipExpiresAt,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'approved_boost_order',
          target: order.id,
          targetType: 'boost_order',
          details: JSON.stringify({
            verifiedBankTx,
            packageName: order.packageName,
            amount: order.amount,
          }),
        },
      });

      return { order: updatedOrder, listing: updatedListing };
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'system',
        title: 'Thanh toán Boost được duyệt',
        body: `Thanh toán boost "${order.packageName}" đã được xác nhận. Tin "${order.listingTitle}" đã được kích hoạt VIP đến ${newVipExpiresAt.toLocaleDateString('vi-VN')}`,
        link: '/seller/listings/promotions',
      },
    });

    res.json({
      success: true,
      message: 'Đã duyệt thanh toán và kích hoạt boost',
      order: result.order,
      listing: {
        id: result.listing.id,
        vip: result.listing.vip,
        vipExpiresAt: result.listing.vipExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payment/manager/boost-order/:id/reject - Reject boost order
router.post('/manager/boost-order/:id/reject', authenticate, async (req, res, next) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const { id } = req.params;
    const { reason, requestClarification } = req.body;

    if (!reason && !requestClarification) {
      return res.status(400).json({ error: 'Cần cung cấp lý do từ chối' });
    }

    const order = await prisma.boostOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (!['PENDING', 'PENDING_REVIEW'].includes(order.status)) {
      return res.status(400).json({ error: 'Không thể từ chối đơn ở trạng thái này' });
    }

    const newStatus = requestClarification ? 'PENDING_REVIEW' : 'REJECTED';

    const updated = await prisma.boostOrder.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewerNote: reason || 'Yêu cầu làm rõ thêm thông tin',
      },
    });

    const title = requestClarification ? 'Yêu cầu làm rõ' : 'Thanh toán Boost bị từ chối';
    const body = requestClarification
      ? `Yêu cầu thanh toán boost ${order.orderRef} cần bổ sung thông tin.`
      : `Thanh toán boost "${order.packageName}" đã bị từ chối. Lý do: ${reason}`;

    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'system',
        title,
        body,
        link: '/seller/listings/promotions',
      },
    });

    res.json({
      success: true,
      message: requestClarification ? 'Đã yêu cầu làm rõ' : 'Đã từ chối thanh toán',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
});
