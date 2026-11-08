// VNPay payment gateway (API v2.1.0) — sandbox & production.
//
// Signing follows VNPay's official Node.js sample:
//   1. URL-encode every key/value (spaces as "+") and sort keys alphabetically.
//   2. Join as "k=v&k=v" WITHOUT encoding again (qs, encode: false).
//   3. HMAC-SHA512 that string with VNPAY_HASH_SECRET -> vnp_SecureHash.
// The same procedure, applied to the returned params (minus the hash fields),
// verifies the return URL / IPN.
const crypto = require('crypto');
const qs = require('qs');
const moment = require('moment');

const VNP_VERSION = '2.1.0';
const VN_UTC_OFFSET_MINUTES = 7 * 60; // VNPay expects Vietnam time (GMT+7)

function getConfig() {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/callback',
  };
}

function isConfigured() {
  const c = getConfig();
  return Boolean(c.tmnCode && c.hashSecret);
}

// Encode + sort exactly like VNPay's sample `sortObject`.
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .map((k) => encodeURIComponent(k))
    .sort();
  for (const key of keys) {
    const raw = obj[decodeURIComponent(key)];
    sorted[key] = encodeURIComponent(String(raw)).replace(/%20/g, '+');
  }
  return sorted;
}

function sign(sortedParams, secret) {
  const signData = qs.stringify(sortedParams, { encode: false });
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

// VNPay recommends Vietnamese without diacritics in vnp_OrderInfo.
function toAscii(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 .,:_\-#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

// Express gives "::1" / "::ffff:1.2.3.4"; VNPay wants a plain IPv4.
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  const first = String(ip).split(',')[0].trim();
  if (first === '::1') return '127.0.0.1';
  return first.replace(/^::ffff:/, '');
}

/**
 * Unique, VNPay-safe transaction reference (alphanumeric, <= 100 chars).
 * @param {string} prefix
 */
function generateTxnRef(prefix = 'VNP') {
  return `${prefix}${moment().utcOffset(VN_UTC_OFFSET_MINUTES).format('YYMMDDHHmmss')}${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
}

/**
 * Build the VNPay payment URL.
 * @param {{ ipAddr: string, amount: number, orderId: string, orderInfo: string,
 *           bankCode?: string, locale?: 'vn'|'en', orderType?: string,
 *           returnUrl?: string, expireMinutes?: number }} params
 *   amount is in VND; it is multiplied by 100 as required by VNPay.
 * @returns {string}
 */
function createPaymentUrl({
  ipAddr,
  amount,
  orderId,
  orderInfo,
  bankCode,
  locale = 'vn',
  orderType = 'other',
  returnUrl,
  expireMinutes = 15,
}) {
  const config = getConfig();
  if (!isConfigured()) {
    const err = new Error('Chưa cấu hình VNPay (VNPAY_TMN_CODE / VNPAY_HASH_SECRET)');
    err.status = 500;
    throw err;
  }

  const vndAmount = Math.round(Number(amount));
  if (!Number.isFinite(vndAmount) || vndAmount <= 0) {
    const err = new Error('Số tiền thanh toán không hợp lệ');
    err.status = 400;
    throw err;
  }

  const now = moment().utcOffset(VN_UTC_OFFSET_MINUTES);
  const params = {
    vnp_Version: VNP_VERSION,
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: toAscii(orderInfo) || `Thanh toan don hang ${orderId}`,
    vnp_OrderType: orderType,
    vnp_Amount: vndAmount * 100,
    vnp_ReturnUrl: returnUrl || config.returnUrl,
    vnp_IpAddr: normalizeIp(ipAddr),
    vnp_CreateDate: now.format('YYYYMMDDHHmmss'),
    vnp_ExpireDate: now.clone().add(expireMinutes, 'minutes').format('YYYYMMDDHHmmss'),
  };
  if (bankCode) params.vnp_BankCode = bankCode;

  const sorted = sortObject(params);
  sorted.vnp_SecureHash = sign(sorted, config.hashSecret);
  return `${config.url}?${qs.stringify(sorted, { encode: false })}`;
}

/**
 * Verify the params VNPay sends back (return URL query or IPN query).
 * @param {Record<string, string>} query
 */
function verifyPaymentReturn(query) {
  const config = getConfig();
  const params = { ...(query || {}) };
  const secureHash = String(params.vnp_SecureHash || '');
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  // Only vnp_* fields are signed.
  const vnpOnly = {};
  for (const key of Object.keys(params)) {
    if (key.startsWith('vnp_')) vnpOnly[key] = params[key];
  }

  const expected = sign(sortObject(vnpOnly), config.hashSecret);
  const isValid =
    secureHash.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(secureHash.toLowerCase()), Buffer.from(expected));

  const responseCode = String(params.vnp_ResponseCode || '');
  const transactionStatus = params.vnp_TransactionStatus !== undefined ? String(params.vnp_TransactionStatus) : null;
  const rawAmount = Number(params.vnp_Amount || 0);

  return {
    isValid,
    isSuccess: isValid && responseCode === '00' && (transactionStatus === null || transactionStatus === '00'),
    responseCode,
    transactionStatus,
    message: getResponseMessage(responseCode),
    orderId: params.vnp_TxnRef || null,
    amount: rawAmount / 100, // back to VND
    rawAmount,
    transactionNo: params.vnp_TransactionNo || null,
    bankCode: params.vnp_BankCode || null,
    payDate: params.vnp_PayDate || null,
    orderInfo: params.vnp_OrderInfo || null,
  };
}

const RESPONSE_MESSAGES = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
  '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản bị khóa.',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
  '24': 'Bạn đã hủy giao dịch.',
  '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi không xác định từ VNPay.',
};

function getResponseMessage(code) {
  return RESPONSE_MESSAGES[code] || (code ? `Giao dịch không thành công (mã lỗi ${code})` : 'Không rõ kết quả giao dịch');
}

module.exports = {
  isConfigured,
  generateTxnRef,
  createPaymentUrl,
  verifyPaymentReturn,
  getResponseMessage,
  // exported for tests
  _sortObject: sortObject,
  _sign: sign,
};
