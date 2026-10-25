const jwt = require('jsonwebtoken');
const config = require('../config');
const otpHelper = require('../helpers/otpHelper');

const ROLES = {
  TENANT: 'tenant',
  SELLER: 'seller',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // ── Session invalidation (Task 7) ────────────────────────────────────
    // The token carries the session epoch that was current when it was
    // issued. If the user's epoch has since been rotated (password change or
    // password reset), every previously issued token is rejected.
    // Tokens minted before this feature existed carry no epoch and are
    // accepted, so enabling this does not log existing users out.
    const epochValid = await otpHelper.verifySessionEpoch(decoded.id, decoded.epoch);
    if (!epochValid) {
      return res.status(401).json({
        error: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.',
        code: 'SESSION_INVALIDATED',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token đã hết hạn' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      const epochValid = await otpHelper.verifySessionEpoch(decoded.id, decoded.epoch);
      if (epochValid) {
        req.user = decoded;
      }
    }
  } catch (error) {
    // Ignore errors - user just won't be authenticated
  }
  next();
};

module.exports = {
  ROLES,
  authenticate,
  authorize,
  optionalAuth,
};
