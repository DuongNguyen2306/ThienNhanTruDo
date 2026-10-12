const express = require('express');
const crypto = require('crypto');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const config = require('../config');

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

// VNPay Return Handler (IPN)
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

    // Update transaction
    const transaction = await prisma.transaction.findFirst({
      where: { vnpayTxRef: vnp_TxnRef },
    });

    if (!transaction) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error?message=Transaction not found`);
    }

    const newStatus = vnp_TransactionStatus === '00' ? 'completed' : 'failed';

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        vnpayTxRef: vnp_TransactionNo || vnp_TxnRef,
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

    // Check if already processed
    if (transaction.status === 'completed') {
      return res.status(200).json({ RspCode: '00', Message: 'Already processed' });
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

    // If successful, add balance to seller wallet
    if (newStatus === 'completed' && transaction.type === 'deposit') {
      await prisma.sellerWallet.upsert({
        where: { userId: transaction.userId },
        create: {
          userId: transaction.userId,
          balance: transaction.amount,
        },
        update: {
          balance: { increment: transaction.amount },
        },
      });
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
    const packages = await prisma.systemConfig.findUnique({
      where: { key: 'packages' },
    });

    const defaultPackages = [
      {
        id: 'basic',
        name: 'Gói Cơ Bản',
        price: 0,
        days: 30,
        features: ['5 tin đăng', 'Hỗ trợ email', 'Thống kê cơ bản'],
      },
      {
        id: 'standard',
        name: 'Gói Tiêu Chuẩn',
        price: 99000,
        days: 30,
        features: ['20 tin đăng', 'Hỗ trợ ưu tiên', 'Báo cáo thống kê', 'Verified Badge'],
        popular: true,
      },
      {
        id: 'premium',
        name: 'Gói Cao Cấp',
        price: 299000,
        days: 30,
        features: ['Không giới hạn tin', 'Ghim tin VIP', 'Hỗ trợ 24/7', 'Analytics nâng cao', 'Verified Badge'],
      },
      {
        id: 'verify',
        name: 'Gói Kiểm Định',
        price: 799000,
        days: 1,
        features: ['Manager kiểm tra thực địa', 'Chụp ảnh chuyên nghiệp', 'Cấp Verified Badge', 'Báo cáo thẩm định'],
      },
    ];

    let parsedPackages = defaultPackages;
    if (packages?.value) {
      try {
        parsedPackages = JSON.parse(packages.value);
      } catch (e) {
        // Use defaults
      }
    }

    res.json({ packages: parsedPackages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
