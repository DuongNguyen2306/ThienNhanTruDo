const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const config = require('../config');
const { validate } = require('../middleware/errorHandler');
const { authenticate, ROLES } = require('../middleware/auth');
const {
  authRateLimiter,
  registerRateLimiter,
  otpSendRateLimiter,
  otpVerifyRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} = require('../middleware/rateLimiter');
const otpHelper = require('../helpers/otpHelper');
const emailHelper = require('../helpers/emailHelper');
const emailVerification = require('../helpers/emailVerificationHelper');
const { createAuditLog } = require('../helpers/auditHelper');

const router = express.Router();

// Bcrypt cost factor. 12 is a good balance of security and latency; it can be
// raised with BCRYPT_ROUNDS without touching code.
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

// Generate JWT token.
// The `epoch` claim ties the token to the user's current session epoch. When
// the password changes or is reset the epoch is rotated, which invalidates
// every token issued before that moment (Task 7).
const generateToken = async (user) => {
  const epoch = await otpHelper.getSessionEpoch(user.id);
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      epoch,
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
// Login identifier helpers
// ============================================
// The login form accepts EITHER a phone number OR an e-mail address in a
// single field. These two helpers decide which one it is and normalise it.

// Does this identifier look like an e-mail address?
// A single `@` with a non-empty local part and a non-empty domain is enough
// to route the lookup; the exact format is never used to decide whether the
// account exists, so a malformed address simply matches nothing.
const isEmailIdentifier = (value) => {
  if (typeof value !== 'string') return false;
  const at = value.indexOf('@');
  return at > 0 && at < value.length - 1;
};

// Normalise a login identifier.
//   • e-mail  → trimmed + lowercased (e-mail comparison is case-insensitive).
//   • phone   → trimmed, with the spaces and dashes people tend to type
//               removed. The country code is NOT added here: the stored
//               numbers are in local form (e.g. "0987654321"), and the
//               lookup below falls back to the international form.
const normalizeIdentifier = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (isEmailIdentifier(trimmed)) return trimmed.toLowerCase();

  // Phone: keep digits only, plus a leading "+" for the international form.
  const isInternational = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return isInternational ? `+${digits}` : digits;
};

// Convert a phone identifier to the LOCAL form used in the database
// ("84987654321" / "+84987654321" → "0987654321").
// Returns null when the value cannot be a Vietnamese mobile number.
const toLocalPhone = (value) => {
  if (typeof value !== 'string') return null;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  // International form with the Vietnam country code (84).
  let local = null;
  if (digits.startsWith('84') && digits.length === 11) {
    local = '0' + digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits;
  }

  if (!local) return null;

  // A stored number must be a plausible Vietnamese mobile number.
  if (!/^0(3[2-9]|5[26889]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/.test(local)) {
    return null;
  }

  return local;
};

// ============================================
// POST /api/auth/register
// ============================================
// TASK 7 — e-mail verification during registration.
//
// The account is created immediately but marked UNVERIFIED, and the login
// endpoint refuses to issue a token until the address is proven. This matches
// the "hard gate" decision: an unverified account cannot use the platform.
//
// The raw OTP is e-mailed, never returned by the API and never logged.
router.post(
  '/register',
  registerRateLimiter,
  [
    body('phone').isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
    body('password').isLength({ min: 8 }).withMessage('Mật khẩu phải có ít nhất 8 ký tự'),
    body('password').matches(/[A-Z]/).withMessage('Mật khẩu phải có chữ hoa'),
    body('password').matches(/\d/).withMessage('Mật khẩu phải có chữ số'),
    body('fullName').notEmpty().withMessage('Họ tên không được trống'),
    body('email').isEmail().withMessage('Email không hợp lệ'),
    // NOTE: the client-supplied role is IGNORED on purpose. See below.
  ],
  validate,
  async (req, res, next) => {
    try {
      const { phone, password, fullName, email } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();

      // SECURITY: the role is NEVER taken from the request body. Public
      // registration always creates a TENANT account, whatever the client
      // sends (role=seller / manager / admin are all ignored). Becoming a
      // seller goes through POST /api/tenant/upgrade, which requires the
      // manager approval flow.
      const role = 'tenant';

      // Check if user exists (phone or email)
      const existing = await prisma.user.findFirst({
        where: { OR: [{ phone }, { email: normalizedEmail }] },
      });

      if (existing) {
        return res.status(409).json({ error: 'Số điện thoại hoặc email đã được sử dụng' });
      }

      // Hash password — the plaintext is never stored or logged.
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          fullName,
          email: normalizedEmail,
          role,
          initials: getInitials(fullName),
          title: getRoleTitle(role),
        },
      });

      // NOTE: no seller profile is created here — the seller profile is only
      // created by the upgrade request flow (POST /api/tenant/upgrade).

      // Mark the account as UNVERIFIED. The marker is what the login gate
      // reads; legacy accounts have no marker and are treated as verified.
      // This is a REGISTRATION marker (not an e-mail change): the address on
      // file has never been proven.
      await emailVerification.markUnverified(user.id, normalizedEmail, { changePending: false });

      // Issue + deliver the OTP.
      const issued = await otpHelper.issueOtp({
        email: normalizedEmail,
        purpose: 'register_verify',
        payload: { userId: user.id, phone },
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });

      if (!issued.ok) {
        // The account exists but the OTP could not be issued (cooldown /
        // throttle). Tell the user to retry; the account stays unverified and
        // therefore cannot log in.
        return res.status(429).json({
          error:
            issued.reason === 'cooldown'
              ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã xác thực.`
              : 'Bạn đã yêu cầu quá nhiều mã xác thực. Vui lòng thử lại sau.',
          retryAfter: issued.retryAfter,
        });
      }

      const sent = await emailHelper.sendOtpEmail({
        to: normalizedEmail,
        code: issued.code,
        purpose: 'register_verify',
      });

      if (!sent.ok) {
        // The code could not be delivered. Release the send quota so the
        // user can retry immediately instead of being throttled for a
        // provider-side failure, and never claim success.
        await otpHelper.revokeOtpSend({ email: normalizedEmail, purpose: 'register_verify' });
        // Do NOT leak delivery details. The account is still unverified.
        return res.status(503).json({
          error: 'Không gửi được mã xác thực. Vui lòng thử lại sau.',
          requiresVerification: true,
        });
      }

      await createAuditLog(user.id, 'registered', user.id, 'user', { role });

      res.status(201).json({
        message: 'Đăng ký thành công. Vui lòng xác thực email để hoàn tất đăng ký.',
        requiresVerification: true,
        email: normalizedEmail,
        phone,
        resendAvailableIn: issued.resendAvailableIn,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          initials: user.initials,
          title: user.title,
        },
        // Deliberately NO token: the account is not usable until verified.
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/verify-email
// ============================================
// Completes registration by consuming the e-mail OTP.
router.post(
  '/verify-email',
  otpVerifyRateLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      const normalizedEmail = String(email).trim().toLowerCase();

      const result = await otpHelper.verifyOtp({
        email: normalizedEmail,
        purpose: 'register_verify',
        code: otp,
        ip: req.ip || req.headers['x-forwarded-for'],
      });

      if (!result.ok) {
        const messages = {
          not_found: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
          expired: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
          consumed: 'Mã xác thực đã được sử dụng. Vui lòng yêu cầu mã mới.',
          max_attempts: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
          ip_mismatch: 'Mã xác thực được gửi từ phiên khác. Vui lòng yêu cầu mã mới.',
          invalid: 'Mã xác thực không đúng.',
        };
        return res.status(400).json({
          error: messages[result.reason] || 'Mã xác thực không hợp lệ.',
          code: result.reason,
          attemptsRemaining: result.retryAfter,
        });
      }

      const userId = result.payload?.userId;
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findFirst({ where: { email: normalizedEmail } });

      if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy tài khoản cần xác thực' });
      }

      await emailVerification.markVerified(user.id, user.email);
      const token = await generateToken(user);

      await createAuditLog(user.id, 'verified_email', user.id, 'user');
      await emailHelper.sendWelcomeEmail({ to: user.email, fullName: user.fullName });

      res.json({
        message: 'Xác thực email thành công',
        requiresVerification: false,
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
// POST /api/auth/resend-verification
// ============================================
// Re-sends the registration OTP. Rate limited + cooldown enforced.
router.post(
  '/resend-verification',
  otpSendRateLimiter,
  [body('email').isEmail().withMessage('Email không hợp lệ')],
  validate,
  async (req, res, next) => {
    try {
      const normalizedEmail = String(req.body.email).trim().toLowerCase();
      const user = await prisma.user.findFirst({ where: { email: normalizedEmail } });

      // Do not reveal whether the address is registered.
      if (!user) {
        return res.json({
          message: 'Nếu email tồn tại, chúng tôi đã gửi lại mã xác thực.',
          resendAvailableIn: 0,
        });
      }

      const verified = await emailVerification.isEmailVerified(user);
      if (verified) {
        return res.json({
          message: 'Tài khoản này đã được xác thực.',
          alreadyVerified: true,
          resendAvailableIn: 0,
        });
      }

      const issued = await otpHelper.issueOtp({
        email: normalizedEmail,
        purpose: 'register_verify',
        payload: { userId: user.id, phone: user.phone },
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });

      if (!issued.ok) {
        return res.status(429).json({
          error:
            issued.reason === 'cooldown'
              ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã xác thực.`
              : 'Bạn đã yêu cầu quá nhiều mã xác thực. Vui lòng thử lại sau.',
          retryAfter: issued.retryAfter,
        });
      }

      const sent = await emailHelper.sendOtpEmail({
        to: normalizedEmail,
        code: issued.code,
        purpose: 'register_verify',
      });

      if (!sent.ok) {
        // Release the send quota: a provider-side failure must not consume
        // the user's hourly allowance.
        await otpHelper.revokeOtpSend({ email: normalizedEmail, purpose: 'register_verify' });
        return res.status(503).json({ error: 'Không gửi được mã xác thực. Vui lòng thử lại sau.' });
      }

      res.json({
        message: 'Đã gửi lại mã xác thực.',
        resendAvailableIn: issued.resendAvailableIn,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/login
// ============================================
//
// The identifier may be EITHER a phone number OR an e-mail address.
//
// BACKWARD COMPATIBILITY
// ----------------------
// Older clients send `{ phone, password }`. Newer clients send
// `{ identifier, password }`. Both are accepted:
//   • `identifier` wins when present, otherwise `phone` is used as the
//     identifier. This keeps every existing client working unchanged.
//   • The request is never rejected because the identifier is missing or
//     malformed — a bad identifier simply fails to match any account and
//     produces the SAME "wrong credentials" answer as an unknown account.
//     That is deliberate: it prevents the endpoint from being used to
//     enumerate accounts, and it keeps the validator from leaking whether a
//     given phone number is well-formed.
//
// The password check, the e-mail verification gate, the JWT and the role
// handling are all unchanged.
router.post(
  '/login',
  authRateLimiter,
  [
    body('password').notEmpty().withMessage('Mật khẩu không được trống'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { password } = req.body;

      // `identifier` is the new name; `phone` is the legacy field name and is
      // still honoured so older clients keep working.
      const rawIdentifier =
        req.body.identifier !== undefined && req.body.identifier !== null
          ? req.body.identifier
          : req.body.phone;

      const identifier = normalizeIdentifier(rawIdentifier);

      // ONE message for every failure mode: unknown account, wrong password.
      // Never reveal which one it was.
      const invalidCredentials = () =>
        res.status(401).json({ error: 'Số điện thoại/email hoặc mật khẩu không chính xác.' });

      if (!identifier) return invalidCredentials();

      // ── Resolve the account by e-mail OR by phone ──────────────────────
      let user = null;

      if (isEmailIdentifier(identifier)) {
        // E-mail addresses are stored lowercased, and the identifier has
        // already been lowercased, so this is an exact match.
        user = await prisma.user.findFirst({ where: { email: identifier } });
      } else if (identifier.length >= 6) {
        // Phone: the stored numbers are in local form ("0987654321"). Someone
        // may type the international form instead ("+84987654321" or
        // "84987654321"), so both shapes are tried. The password is checked
        // against whichever account is found.
        const candidates = [identifier];

        const local = toLocalPhone(identifier);
        if (local && local !== identifier) candidates.push(local);

        for (const candidate of candidates) {
          user = await prisma.user.findUnique({ where: { phone: candidate } });
          if (user) break;
        }
      }

      if (!user) return invalidCredentials();

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return invalidCredentials();
      }

      // ── TASK 7: e-mail verification gate ───────────────────────────────
      // An account whose e-mail has not been proven cannot receive a token.
      // Legacy accounts (created before this feature) have no marker and are
      // treated as verified, so no existing user is locked out.
      const emailVerified = await emailVerification.isEmailVerified(user);
      if (!emailVerified) {
        return res.status(403).json({
          error: 'Vui lòng xác thực email trước khi đăng nhập.',
          code: 'EMAIL_NOT_VERIFIED',
          requiresVerification: true,
          email: user.email,
        });
      }

      const token = await generateToken(user);

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
        requiresVerification: false,
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

    const emailVerified = await emailVerification.isEmailVerified(user);

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
        emailVerified,
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
      if (email !== undefined) {
        // ── TASK 7: e-mail changes must be re-verified ─────────────────────
        // An e-mail can no longer be cleared (set to null): the users
        // collection has a NON-SPARSE unique index on `email`, so a second
        // null value would fail with a confusing 409. Clearing is rejected
        // with a clear 400 instead.
        if (!email) {
          return res.status(400).json({
            error: 'Không thể xóa email. Vui lòng nhập một email hợp lệ.',
          });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        if (normalizedEmail !== req.user.email) {
          const issued = await otpHelper.issueOtp({
            email: normalizedEmail,
            purpose: 'email_change',
            payload: { userId: req.user.id, newEmail: normalizedEmail },
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
          });

          if (!issued.ok) {
            return res.status(429).json({
              error:
                issued.reason === 'cooldown'
                  ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã xác thực.`
                  : 'Bạn đã yêu cầu quá nhiều mã xác thực. Vui lòng thử lại sau.',
              retryAfter: issued.retryAfter,
            });
          }

          const sent = await emailHelper.sendOtpEmail({
            to: normalizedEmail,
            code: issued.code,
            purpose: 'email_change',
          });

          if (!sent.ok) {
            // Release the send quota: a provider-side failure must not
            // consume the user's hourly allowance.
            await otpHelper.revokeOtpSend({ email: normalizedEmail, purpose: 'email_change' });
            return res.status(503).json({ error: 'Không gửi được mã xác thực. Vui lòng thử lại sau.' });
          }

          // Remember the pending address; the account email changes only
          // after the OTP is confirmed.
          await emailVerification.markUnverified(req.user.id, normalizedEmail, {
            changePending: true,
          });

          return res.json({
            message: 'Đã gửi mã xác thực tới email mới. Vui lòng nhập mã để hoàn tất thay đổi.',
            requiresEmailConfirmation: true,
            pendingEmail: normalizedEmail,
            resendAvailableIn: issued.resendAvailableIn,
            user: {
              id: req.user.id,
              phone: req.user.phone,
              email: req.user.email,
              fullName: fullName || req.user.fullName,
              role: req.user.role,
              initials: req.user.initials,
              title: req.user.title,
            },
          });
        }
        // Same address — nothing to change, but keep it normalized.
        updateData.email = req.user.email;
      }

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
// POST /api/auth/verify-email-change
// ============================================
// Completes an e-mail CHANGE by consuming the OTP that was sent to the NEW
// address. The address on file is only updated once the OTP is proven, so a
// user can never lock themselves out of an account they cannot reach.
router.post(
  '/verify-email-change',
  authenticate,
  otpVerifyRateLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const normalizedEmail = String(req.body.email).trim().toLowerCase();
      const otp = String(req.body.otp || '').trim();

      const result = await otpHelper.verifyOtp({
        email: normalizedEmail,
        purpose: 'email_change',
        code: otp,
        ip: req.ip || req.headers['x-forwarded-for'],
      });

      if (!result.ok) {
        const messages = {
          not_found: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
          expired: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
          consumed: 'Mã xác thực đã được sử dụng. Vui lòng yêu cầu mã mới.',
          max_attempts: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
          ip_mismatch: 'Mã xác thực được gửi từ phiên khác. Vui lòng yêu cầu mã mới.',
          invalid: 'Mã xác thực không đúng.',
        };
        return res.status(400).json({
          error: messages[result.reason] || 'Mã xác thực không hợp lệ.',
          code: result.reason,
        });
      }

      // The OTP must belong to the authenticated user.
      if (result.payload?.userId && result.payload.userId !== req.user.id) {
        return res.status(403).json({ error: 'Mã xác thực không thuộc về tài khoản này' });
      }

      // The address on file must still be the one the change was started from.
      const pendingEmail = await emailVerification.getPendingEmail(req.user.id);
      if (pendingEmail && pendingEmail !== normalizedEmail) {
        return res.status(409).json({
          error: 'Yêu cầu thay đổi email không còn hợp lệ. Vui lòng gửi lại mã xác thực.',
        });
      }

      // The new address must not already belong to somebody else.
      const existing = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: req.user.id } },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ error: 'Email này đã được sử dụng bởi tài khoản khác.' });
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { email: normalizedEmail },
      });

      // The new address is now proven → the account is verified again and
      // there is no longer a pending change.
      await emailVerification.markVerified(user.id, normalizedEmail);

      await createAuditLog(user.id, 'changed_email', user.id, 'user', {
        email: normalizedEmail,
      });

      res.json({
        message: 'Đã cập nhật email thành công.',
        requiresEmailConfirmation: false,
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
// POST /api/auth/resend-email-change
// ============================================
// Re-sends the e-mail-change OTP to the pending address.
router.post(
  '/resend-email-change',
  authenticate,
  otpSendRateLimiter,
  [],
  validate,
  async (req, res, next) => {
    try {
      const pendingEmail = await emailVerification.getPendingEmail(req.user.id);
      if (!pendingEmail) {
        return res.status(400).json({
          error: 'Không có yêu cầu thay đổi email nào đang chờ xác thực.',
        });
      }

      const issued = await otpHelper.issueOtp({
        email: pendingEmail,
        purpose: 'email_change',
        payload: { userId: req.user.id, newEmail: pendingEmail },
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });

      if (!issued.ok) {
        return res.status(429).json({
          error:
            issued.reason === 'cooldown'
              ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã xác thực.`
              : 'Bạn đã yêu cầu quá nhiều mã xác thực. Vui lòng thử lại sau.',
          retryAfter: issued.retryAfter,
        });
      }

      const sent = await emailHelper.sendOtpEmail({
        to: pendingEmail,
        code: issued.code,
        purpose: 'email_change',
      });

      if (!sent.ok) {
        // Release the send quota: a provider-side failure must not consume
        // the user's hourly allowance.
        await otpHelper.revokeOtpSend({ email: pendingEmail, purpose: 'email_change' });
        return res.status(503).json({ error: 'Không gửi được mã xác thực. Vui lòng thử lại sau.' });
      }

      res.json({
        message: 'Đã gửi lại mã xác thực tới email mới.',
        pendingEmail,
        resendAvailableIn: issued.resendAvailableIn,
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
    body('newPassword').isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự'),
    body('newPassword').matches(/[A-Z]/).withMessage('Mật khẩu mới phải có chữ hoa'),
    body('newPassword').matches(/\d/).withMessage('Mật khẩu mới phải có chữ số'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      if (!user) {
        return res.status(404).json({ error: 'Người dùng không tồn tại' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
      }

      // Reject reusing the same password.
      if (await bcrypt.compare(newPassword, user.password)) {
        return res.status(400).json({ error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
      });

      // ── TASK 7: invalidate every other session ──────────────────────────
      // Rotating the session epoch makes all previously issued tokens for
      // this user invalid. The client receives a fresh token below so the
      // current device stays signed in.
      const epoch = await otpHelper.rotateSessionEpoch(user.id);
      const token = await generateToken(user);

      await createAuditLog(user.id, 'changed_password', user.id, 'user', {
        sessionsInvalidated: true,
      });

      if (user.email) {
        await emailHelper.sendPasswordChangedEmail({ to: user.email });
      }

      res.json({
        message: 'Đổi mật khẩu thành công. Tất cả phiên đăng nhập khác đã bị vô hiệu hoá.',
        sessionsInvalidated: true,
        token,
        epoch,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/forgot-password
// ============================================
// Starts the password-reset flow: sends an OTP to the account's e-mail.
//
// The user identifies themselves by E-MAIL (not by phone number).
//
// SECURITY: the response NEVER reveals whether the e-mail is registered.
// The same message, the same status and the same payload are returned in
// every case, so the endpoint cannot be used to enumerate accounts. This
// includes the `maskedEmail` field, which used to be present ONLY for real
// accounts and therefore leaked their existence — it has been removed. The
// client displays the address the user typed themselves, so nothing is lost.
//
// A delivery failure (SMTP down) IS surfaced with a 503: the user must be
// told that no code is on its way, otherwise they would sit in front of an
// OTP screen waiting forever.
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();

      // The generic message is returned in EVERY case — for a known account,
      // for an unknown address and for an account without an e-mail.
      const genericMessage =
        'Nếu email đã được đăng ký, chúng tôi sẽ gửi mã xác thực.';

      const user = await prisma.user.findFirst({ where: { email } });

      if (!user || !user.email) {
        return res.json({
          message: genericMessage,
          sent: true,
          resendAvailableIn: otpHelper.OTP_RESEND_COOLDOWN_SECONDS,
        });
      }

      const issued = await otpHelper.issueOtp({
        email: user.email,
        purpose: 'password_reset',
        payload: { userId: user.id },
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });

      if (!issued.ok) {
        return res.status(429).json({
          error:
            issued.reason === 'cooldown'
              ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã.`
              : 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.',
          retryAfter: issued.retryAfter,
        });
      }

      const sent = await emailHelper.sendOtpEmail({
        to: user.email,
        code: issued.code,
        purpose: 'password_reset',
      });

      if (!sent.ok) {
        // The code could not be delivered. Release the send quota so the
        // user can retry immediately, and do NOT fall through to the generic
        // success message, because the user would then wait for an e-mail
        // that will never arrive.
        await otpHelper.revokeOtpSend({ email: user.email, purpose: 'password_reset' });
        return res.status(503).json({
          error: 'Không gửi được mã xác thực. Vui lòng thử lại sau.',
        });
      }

      await createAuditLog(user.id, 'requested_password_reset', user.id, 'user');

      res.json({
        message: genericMessage,
        sent: true,
        resendAvailableIn: issued.resendAvailableIn,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/reset-password
// ============================================
// Completes the password reset by consuming the e-mail OTP.
//
// Like the request step, the user identifies themselves by E-MAIL.
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Mã xác thực phải có 6 chữ số'),
    body('newPassword').isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự'),
    body('newPassword').matches(/[A-Z]/).withMessage('Mật khẩu mới phải có chữ hoa'),
    body('newPassword').matches(/\d/).withMessage('Mật khẩu mới phải có chữ số'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const { otp, newPassword } = req.body;

      const user = await prisma.user.findFirst({ where: { email } });
      if (!user || !user.email) {
        // Same message as an invalid code: the endpoint must not confirm
        // whether an account exists for the address.
        return res.status(400).json({
          error: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
          code: 'not_found',
        });
      }

      const result = await otpHelper.verifyOtp({
        email: user.email,
        purpose: 'password_reset',
        code: otp,
        ip: req.ip || req.headers['x-forwarded-for'],
      });

      if (!result.ok) {
        const messages = {
          not_found: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
          expired: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
          consumed: 'Mã xác thực đã được sử dụng. Vui lòng yêu cầu mã mới.',
          max_attempts: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.',
          ip_mismatch: 'Mã xác thực được gửi từ phiên khác. Vui lòng yêu cầu mã mới.',
          invalid: 'Mã xác thực không đúng.',
        };
        return res.status(400).json({
          error: messages[result.reason] || 'Mã xác thực không hợp lệ.',
          code: result.reason,
          attemptsRemaining: result.retryAfter,
        });
      }

      // The OTP must belong to this user.
      if (result.payload?.userId && result.payload.userId !== user.id) {
        return res.status(403).json({ error: 'Mã xác thực không thuộc về tài khoản này' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // ── Invalidate ALL existing sessions for this account ────────────────
      await otpHelper.rotateSessionEpoch(user.id);

      await createAuditLog(user.id, 'reset_password', user.id, 'user', {
        sessionsInvalidated: true,
      });

      if (user.email) {
        await emailHelper.sendPasswordChangedEmail({ to: user.email });
      }

      res.json({
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        sessionsInvalidated: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /api/auth/resend-password-reset
// ============================================
// Re-sends the password-reset OTP to the address the user typed.
// Rate limited + cooldown enforced.
//
// Like the request step, the user identifies themselves by E-MAIL and the
// response NEVER reveals whether the address is registered.
router.post(
  '/resend-password-reset',
  otpSendRateLimiter,
  [body('email').isEmail().withMessage('Email không hợp lệ')],
  validate,
  async (req, res, next) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const genericMessage =
        'Nếu email đã được đăng ký, chúng tôi sẽ gửi mã xác thực.';

      const user = await prisma.user.findFirst({ where: { email } });
      if (!user || !user.email) {
        return res.json({
          message: genericMessage,
          sent: true,
          resendAvailableIn: otpHelper.OTP_RESEND_COOLDOWN_SECONDS,
        });
      }

      const issued = await otpHelper.issueOtp({
        email: user.email,
        purpose: 'password_reset',
        payload: { userId: user.id },
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });

      if (!issued.ok) {
        return res.status(429).json({
          error:
            issued.reason === 'cooldown'
              ? `Vui lòng chờ ${issued.retryAfter} giây trước khi gửi lại mã.`
              : 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.',
          retryAfter: issued.retryAfter,
        });
      }

      const sent = await emailHelper.sendOtpEmail({
        to: user.email,
        code: issued.code,
        purpose: 'password_reset',
      });

      if (!sent.ok) {
        // Release the send quota: a provider-side failure must not consume
        // the user's hourly allowance.
        await otpHelper.revokeOtpSend({ email: user.email, purpose: 'password_reset' });
        return res.status(503).json({ error: 'Không gửi được mã. Vui lòng thử lại sau.' });
      }

      res.json({
        message: genericMessage,
        sent: true,
        resendAvailableIn: issued.resendAvailableIn,
      });
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
