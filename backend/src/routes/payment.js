const express = require('express');
const crypto = require('crypto');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const config = require('../config');
const { grantStarsToUser } = require('../helpers/starHelper');

const router = express.Router();

// VNPay Configuration
const VNPAY_CONFIG = {
  vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'THIENNHAN',
  vnp_HashSecret: process.env.VNPAY_HASH_SECRET || 'THIENNHANSECRETKEY2024',
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ApiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/vnpay/return',
};

// Create VNPay Payment URL
router.post('/create', authenticate, async (req, res, next) => {
  try {
    const { amount, packageId, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }

    const transactionId = `TN${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    // Create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type: 'payment',
        amount: parseFloat(amount),
        method: 'vnpay',
        status: 'pending',
        description: description || 'Thanh toán qua VNPay',
        vnpayTxRef: transactionId,
      },
    });

    // Build VNPay payment URL
    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
      vnp_Amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      vnp_CurrCode: 'VND',
      vnp_BankCode: '',
      vnp_Locale: 'vn',
      vnp_CustBank: '',
      vnp_PayBank: '',
      vnp_InvCustomer: '',
      vnp_InvAddr: '',
      vnp_InvEmail: req.user.email || '',
      vnp_InvPhone: req.user.phone || '',
      vnp_TxnRef: transactionId,
      vnp_OrderInfo: description || 'Thanh toán Thiên Nhãn Trú Đồ',
      vnp_OrderType: 'billpayment',
      vnp_CreateDate: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
      vnp_ExpireDate: new Date(Date.now() + 15 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14),
      vnp_IpAddr: req.ip || req.connection.remoteAddress,
      vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
    };

    // Sort params and create signature
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => {
        if (vnp_Params[key] !== '' && vnp_Params[key] !== null && vnp_Params[key] !== undefined) {
          obj[key] = vnp_Params[key];
        }
        return obj;
      }, {});

    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');

    const vnp_SecureHash = crypto
      .createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret)
      .update(signData)
      .digest('hex');

    const paymentUrl = `${VNPAY_CONFIG.vnp_Url}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;

    res.json({
      success: true,
      paymentUrl,
      transactionId,
      amount: parseFloat(amount),
    });
  } catch (error) {
    next(error);
  }
});

// VNPay Return Handler (browser redirect)
// IMPORTANT: This is for UX only. Payment confirmation must rely on IPN.
// Return URL can be spoofed by user - do not use for financial operations.
router.get('/return', async (req, res, next) => {
  try {
    const {
      vnp_ResponseCode,
      vnp_TxnRef,
      vnp_Amount,
      vnp_TransactionStatus,
      vnp_SecureHash,
      vnp_TransactionNo,
      vnp_BankCode,
      vnp_PayDate,
    } = req.query;

    // Verify signature
    const { vnp_SecureHash: _, ...verifyParams } = req.query;
    const sortedParams = Object.keys(verifyParams)
      .sort()
      .filter((key) => key.startsWith('vnp_'))
      .reduce((obj, key) => {
        obj[key] = verifyParams[key];
        return obj;
      }, {});

    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');

    const expectedHash = crypto
      .createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret)
      .update(signData)
      .digest('hex');

    if (vnp_SecureHash !== expectedHash) {
      // Invalid signature - redirect to error
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error?message=Invalid signature`);
    }

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: { vnpayTxRef: vnp_TxnRef },
    });

    if (!transaction) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error?message=Transaction not found`);
    }

    // SECURITY: Idempotency check - prevent updating already completed transactions
    if (transaction.status === 'completed' || transaction.status === 'refunded') {
      // Transaction already finalized - just redirect to success page
      // Do NOT update status from completed/refunded to anything else
      console.log(`[VNPay Return] Transaction ${transaction.id} already ${transaction.status}, ignoring duplicate callback`);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?txn=${vnp_TxnRef}`);
    }

    // SECURITY: Amount verification - ensure VNPay amount matches our transaction
    if (vnp_Amount) {
      const expectedAmount = Math.round(parseFloat(transaction.amount) * 100); // Amount we sent to VNPay
      const receivedAmount = parseInt(vnp_Amount);
      if (receivedAmount !== expectedAmount) {
        console.error(`[VNPay Return] Amount mismatch for ${vnp_TxnRef}: expected ${expectedAmount}, got ${receivedAmount}`);
        // Don't update transaction - amount mismatch could be fraud
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error?message=Amount mismatch`);
      }
    }

    // SECURITY: Also block if transaction already failed but we're getting a success
    // This prevents race conditions between IPN and Return URL
    if (transaction.status === 'failed' && vnp_TransactionStatus === '00') {
      console.log(`[VNPay Return] Transaction ${transaction.id} already failed, but VNPay says success - waiting for IPN`);
      // Don't update - let IPN handle it for authoritative status
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending?txn=${vnp_TxnRef}`);
    }

    // SECURITY: Also block if transaction already failed but we're getting a success
    // This prevents race conditions between IPN and Return URL
    if (transaction.status === 'failed' && vnp_TransactionStatus === '00') {
      console.log(`[VNPay Return] Transaction ${transaction.id} already failed, but VNPay says success - waiting for IPN`);
      // Don't update - let IPN handle it for authoritative status
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending?txn=${vnp_TxnRef}`);
    }

    // Update transaction based on VNPay status
    const newStatus = vnp_TransactionStatus === '00' ? 'completed' : 'failed';

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        vnpayTxRef: vnp_TransactionNo || transaction.vnpayTxRef,
        vnpayDate: vnp_PayDate,
      },
    });

    // Redirect to success/failure page
    if (newStatus === 'completed') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?txn=${vnp_TxnRef}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed?txn=${vnp_TxnRef}`);
    }
  } catch (error) {
    next(error);
  }
});

// IPN (Instant Payment Notification) - for server-to-server
router.post('/ipn', async (req, res, next) => {
  try {
    const {
      vnp_ResponseCode,
      vnp_TxnRef,
      vnp_TransactionStatus,
      vnp_SecureHash,
      vnp_Amount,
      vnp_TransactionNo,
      vnp_BankCode,
      vnp_PayDate,
    } = req.body;

    // Verify signature
    const { vnp_SecureHash: _, ...verifyParams } = req.body;
    const sortedParams = Object.keys(verifyParams)
      .sort()
      .filter((key) => key.startsWith('vnp_'))
      .reduce((obj, key) => {
        obj[key] = verifyParams[key];
        return obj;
      }, {});

    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');

    const expectedHash = crypto
      .createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret)
      .update(signData)
      .digest('hex');

    if (vnp_SecureHash !== expectedHash) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: { vnpayTxRef: vnp_TxnRef },
    });

    if (!transaction) {
      return res.status(200).json({ RspCode: '01', Message: 'Transaction not found' });
    }

    // SECURITY: Idempotency check - prevent duplicate processing
    if (transaction.status === 'completed' || transaction.status === 'refunded') {
      console.log(`[VNPay IPN] Transaction ${transaction.id} already ${transaction.status}, returning success`);
      return res.status(200).json({ RspCode: '00', Message: 'Already processed' });
    }

    // SECURITY: Amount verification - ensure VNPay amount matches our transaction
    // VNPay sends amount in VND (not cents for VND currency)
    const expectedAmount = Math.round(transaction.amount); // Our amount in VND
    if (vnp_Amount && parseInt(vnp_Amount) !== expectedAmount) {
      console.error(`[VNPay IPN] Amount mismatch for ${vnp_TxnRef}: expected ${expectedAmount}, got ${vnp_Amount}`);
      return res.status(200).json({ RspCode: '04', Message: 'Amount mismatch' });
    }

    // Update based on status
    const newStatus = vnp_TransactionStatus === '00' ? 'completed' : 'failed';

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        vnpayTxRef: vnp_TransactionNo || transaction.vnpayTxRef,
        vnpayDate: vnp_PayDate,
      },
    });

    // If successful, add balance to seller wallet (for deposits/payments)
    // SECURITY: Use atomic update to prevent race condition double-crediting
    if (newStatus === 'completed') {
      // Check if wallet was already credited for this transaction to prevent race condition
      // We track this by checking if the wallet already has a transaction of this amount recently
      const existingWalletTx = await prisma.transaction.findFirst({
        where: {
          userId: transaction.userId,
          id: transaction.id,
          status: 'completed',
          createdAt: {
            gte: new Date(Date.now() - 60000) // Within last minute
          }
        }
      });

      if (!existingWalletTx) {
        console.log(`[VNPay IPN] No recent completed transaction found for user ${transaction.userId}, skipping wallet credit`);
      } else {
        // Get or create wallet
        let wallet = await prisma.sellerWallet.findUnique({
          where: { userId: transaction.userId },
        });

        if (!wallet) {
          wallet = await prisma.sellerWallet.create({
            data: {
              userId: transaction.userId,
              balance: transaction.type === 'deposit' ? transaction.amount : 0,
              totalSpent: transaction.type === 'payment' ? transaction.amount : 0,
            },
          });
          console.log(`[VNPay IPN] Created new wallet for user ${transaction.userId}: balance=${wallet.balance}, totalSpent=${wallet.totalSpent}`);
        } else {
          // Use atomic increment to prevent race conditions
          const updateData = {};
          if (transaction.type === 'deposit') {
            updateData.balance = { increment: transaction.amount };
          }
          if (transaction.type === 'payment') {
            updateData.totalSpent = { increment: transaction.amount };
          }
          
          if (Object.keys(updateData).length > 0) {
            await prisma.sellerWallet.update({
              where: { userId: transaction.userId },
              data: updateData,
            });
            console.log(`[VNPay IPN] Updated wallet for user ${transaction.userId}:`, updateData);
          }
        }
      }
      console.log(`[VNPay IPN] Transaction ${transaction.id} completed, wallet credited`);
    }

    res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (error) {
    next(error);
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

// ============================================
// POST /api/payment/create-order - Create manual bank transfer order
// ============================================
router.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validate package
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
    
    // Get active bank account
    const bankAccount = await getActiveBankAccount();
    if (!bankAccount) {
      return res.status(503).json({ error: 'Hiện tại không hỗ trợ thanh toán chuyển khoản. Vui lòng thử lại sau.' });
    }
    
    // Generate unique references
    const orderRef = generateOrderRef();
    const transferRef = generateTransferRef();
    
    // Set expiration (72 hours from now)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    
    // Create package order
    const order = await prisma.packageOrder.create({
      data: {
        orderRef,
        userId,
        userRole,
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
        status: 'PENDING_PAYMENT',
        expiresAt,
      },
    });
    
    // Log audit
    await createAuditLog(userId, 'created', order.id, 'package_order', {
      packageId: pkg.id,
      amount: pkg.price,
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
// POST /api/payment/upload-proof - Upload payment evidence
// ============================================
const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh hoặc PDF'));
    }
  },
});

router.post('/upload-proof', authenticate, upload.single('proof'), async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'orderId là bắt buộc' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng tải lên minh chứng thanh toán' });
    }
    
    // Find order
    const order = await prisma.packageOrder.findFirst({
      where: {
        id: orderId,
        userId: req.user.id,
      },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: 'Không thể tải lên minh chứng cho đơn hàng này' });
    }
    
    // Check if expired
    if (new Date() > order.expiresAt) {
      await prisma.packageOrder.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Đơn hàng đã hết hạn' });
    }
    
    // Upload to storage (simplified - in production use cloud storage)
    const filename = `proofs/${req.user.id}/${order.orderRef}-${Date.now()}${path.extname(req.file.originalname)}`;
    
    // For now, store as base64 in the database (in production, use S3/GCS)
    const proofData = req.file.buffer.toString('base64');
    
    const updatedOrder = await prisma.packageOrder.update({
      where: { id: orderId },
      data: {
        proofUrl: `data:${req.file.mimetype};base64,${proofData}`,
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
      await sendNotification(
        manager.id,
        'system',
        'Yêu cầu thanh toán mới',
        `Người dùng ${req.user.fullName || req.user.phone} đã nộp minh chứng thanh toán cho gói "${order.packageName}" trị giá ${order.amount.toLocaleString('vi-VN')}đ`,
        `/manager/payment-reviews`
      );
    }
    
    // Log audit
    await createAuditLog(req.user.id, 'submitted_proof', order.id, 'package_order');
    
    res.json({
      success: true,
      message: 'Đã gửi minh chứng thanh toán',
      order: {
        id: updatedOrder.id,
        orderRef: updatedOrder.orderRef,
        status: updatedOrder.status,
        proofUploadedAt: updatedOrder.proofUploadedAt,
      },
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
          actorId: managerId,
          action: 'approved_payment',
          target: order.id,
          targetType: 'package_order',
          details: JSON.stringify({
            verifiedAmount,
            verifiedBankTx,
            verifiedDate,
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
              description: `Nhận ${starAlloc.stars} Stars từ gói ${order.packageName} (chuyển khoản)`,
              grantBatchId: starBatch.id,
              subscriptionId: subscription.id,
            },
          });
          starGranted = true;
        }
      }

      return { updatedOrder, subscription, starGranted, starBatch };
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
// VietQR Generation
// ============================================

// GET /api/payment/vietqr - Generate VietQR for an order
router.get('/vietqr/:orderId', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await prisma.packageOrder.findFirst({
      where: {
        id: orderId,
        userId: req.user.id,
      },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: 'Đơn hàng không ở trạng thái chờ thanh toán' });
    }
    
    // Check expiration
    if (new Date() > order.expiresAt) {
      await prisma.packageOrder.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Đơn hàng đã hết hạn' });
    }
    
    // Generate VietQR URL using VietQR.io API (free, no API key required)
    const vietqrData = {
      accountNo: order.accountNumber,
      accountName: order.accountHolder,
      acqId: order.bankBin,
      amount: order.amount,
      addInfo: order.transferRef,
      format: 'text',
      template: 'compact',
    };
    
    // Build VietQR URL
    const queryParams = new URLSearchParams({
      a: order.accountNumber,
      b: order.accountHolder,
      i: order.bankBin,
      am: order.amount.toString(),
      n: order.transferRef,
      f: 'text',
      t: 'compact2',
    });
    
    const vietqrUrl = `https://img.vietqr.io/image/${order.bankBin}-${order.accountNumber}-compact2.png?${queryParams.toString()}`;
    
    res.json({
      success: true,
      qrUrl: vietqrUrl,
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

// ============================================
// POST /api/payment/deposit - Create wallet deposit request
// ============================================
router.post('/deposit', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Validate amount
    if (!amount || amount < 10000) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu là 10.000đ' });
    }
    if (amount > 100000000) { // 100M VND max
      return res.status(400).json({ error: 'Số tiền nạp tối đa là 100.000.000đ' });
    }

    // Get active bank account
    const bankAccount = await getActiveBankAccount();
    if (!bankAccount) {
      return res.status(503).json({ error: 'Hiện tại không hỗ trợ thanh toán. Vui lòng thử lại sau.' });
    }

    // Get user wallet
    let wallet = await prisma.sellerWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.sellerWallet.create({ data: { userId, balance: 0, totalSpent: 0 } });
    }

    // Generate references
    const depositRef = generateDepositRef();
    const transferRef = generateWalletTransferRef();

    // Set expiration (72 hours)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Create deposit
    const deposit = await prisma.walletDeposit.create({
      data: {
        depositRef,
        userId,
        amount: parseFloat(amount),
        bankName: bankAccount.bankName,
        bankBin: bankAccount.bankBin,
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder,
        transferRef,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Create pending transaction to show in history
    await prisma.transaction.create({
      data: {
        userId,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'pending',
        description: `Yêu cầu nạp tiền ${depositRef}`,
        method: 'bank_transfer',
      },
    });

    // Audit log
    await createAuditLog(userId, 'created', deposit.id, 'wallet_deposit', {
      amount: parseFloat(amount),
    });

    res.status(201).json({
      success: true,
      deposit: {
        id: deposit.id,
        depositRef: deposit.depositRef,
        transferRef: deposit.transferRef,
        amount: deposit.amount,
        bankAccount: {
          bankName: deposit.bankName,
          bankBin: deposit.bankBin,
          accountNumber: deposit.accountNumber,
          accountHolder: deposit.accountHolder,
        },
        status: deposit.status,
        expiresAt: deposit.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

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
// GET /api/payment/deposit/:id/vietqr - Get VietQR for deposit
// ============================================
router.get('/deposit/:id/vietqr', authenticate, async (req, res, next) => {
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

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Chỉ yêu cầu đang chờ mới có thể tạo QR' });
    }

    // Check expiration
    if (new Date() > deposit.expiresAt) {
      await prisma.walletDeposit.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Yêu cầu đã hết hạn' });
    }

    // Use configured QR image if available, otherwise generate VietQR
    let qrUrl = '';
    
    // Get active bank account for qrImageUrl
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { isActive: true },
    });
    
    if (bankAccount?.qrImageUrl) {
      // Use configured static QR image URL (admin uploaded)
      qrUrl = bankAccount.qrImageUrl;
    } else {
      // Generate VietQR dynamically
      qrUrl = `https://img.vietqr.io/image/${deposit.bankBin}-${deposit.accountNumber}-compact2.png?` +
        `a=${deposit.amount}&` +
        `n=${deposit.transferRef}&` +
        `i=${deposit.bankBin}&` +
        `b=${deposit.accountNumber}&` +
        `f=text&` +
        `t=compact2`;
    }

    res.json({
      success: true,
      qrUrl,
      qrSource: bankAccount?.qrImageUrl ? 'configured' : 'generated',
      bankInfo: {
        bankName: deposit.bankName,
        bankBin: deposit.bankBin,
        accountNumber: deposit.accountNumber,
        accountHolder: deposit.accountHolder,
      },
      transferInfo: {
        amount: deposit.amount,
        transferRef: deposit.transferRef,
        depositRef: deposit.depositRef,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/payment/deposit/:id/submit-proof - Submit payment proof
// ============================================
router.post('/deposit/:id/submit-proof', authenticate, async (req, res, next) => {
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

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ error: 'Không thể gửi minh chứng cho yêu cầu này' });
    }

    // Check expiration
    if (new Date() > deposit.expiresAt) {
      await prisma.walletDeposit.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Yêu cầu đã hết hạn' });
    }

    // Expect base64 proof image in body
    const { proofBase64, proofMimeType } = req.body;

    if (!proofBase64) {
      return res.status(400).json({ error: 'Vui lòng cung cấp minh chứng thanh toán' });
    }

    const updated = await prisma.walletDeposit.update({
      where: { id },
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
      await sendNotification(
        manager.id,
        'system',
        'Yêu cầu nạp tiền mới',
        `Người dùng ${req.user.fullName || req.user.phone} đã nộp minh chứng nạp tiền ${deposit.amount.toLocaleString('vi-VN')}đ`,
        '/manager/payment-reviews'
      );
    }

    // Audit log
    await createAuditLog(req.user.id, 'submitted_proof', id, 'wallet_deposit');

    res.json({
      success: true,
      message: 'Đã gửi minh chứng thanh toán',
      deposit: {
        id: updated.id,
        depositRef: updated.depositRef,
        status: updated.status,
        proofUploadedAt: updated.proofUploadedAt,
      },
    });
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
