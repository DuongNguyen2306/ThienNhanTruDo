// Simple in-memory rate limiter for auth endpoints
// In production, use Redis or similar

const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Create a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.key - Key generator function (req) => string
 * @param {string} options.name - Name for env var override (e.g., 'AUTH_RATE_LIMIT')
 */
function createRateLimiter({ windowMs = 60000, max = 5, key = req => req.ip, name = null }) {
  // Allow env override for development (AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW)
  const isDev = process.env.NODE_ENV !== 'production'
  const envMax = name ? parseInt(process.env[`${name}_MAX`] || '0', 10) : 0
  const envWindow = name ? parseInt(process.env[`${name}_WINDOW`] || '0', 10) : 0
  
  const effectiveMax = (isDev && envMax > 0) ? envMax : max
  const effectiveWindowMs = (isDev && envWindow > 0) ? envWindow * 1000 : windowMs

  return (req, res, next) => {
    const identifier = key(req)
    const now = Date.now()
    const windowKey = `${identifier}:${Math.floor(now / effectiveWindowMs)}`

    let record = rateLimitStore.get(windowKey)
    
    if (!record) {
      record = { count: 0, resetTime: now + effectiveWindowMs }
      rateLimitStore.set(windowKey, record)
    }

    record.count++

    if (record.count > effectiveMax) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      res.setHeader('Retry-After', retryAfter)
      res.setHeader('X-RateLimit-Limit', effectiveMax)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', record.resetTime)

      return res.status(429).json({
        error: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        retryAfter,
      })
    }

    res.setHeader('X-RateLimit-Limit', effectiveMax)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, effectiveMax - record.count))
    res.setHeader('X-RateLimit-Reset', record.resetTime)

    next()
  }
}

// Pre-configured rate limiters
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'AUTH_RATE_LIMIT',
})

// Separate rate limiter for verification (GET /me) - higher limit since it's non-destructive
const verifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 verifications per 15 minutes (more lenient for session restore)
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'VERIFY_RATE_LIMIT',
})

const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'REGISTER_RATE_LIMIT',
})

// ── OTP / e-mail verification limiters (Task 7) ────────────────────────────
// Sending an OTP is the most abuse-prone operation in the auth flow, so it
// gets the tightest limits: few attempts per IP, and a separate limiter keyed
// by the target e-mail so one attacker cannot lock out a real user by
// spamming their inbox (the OTP helper additionally enforces a per-e-mail
// hourly send cap and a resend cooldown).
const otpSendRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP sends per IP per 15 minutes
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'OTP_SEND_RATE_LIMIT',
})

const otpVerifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per IP per 15 minutes
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'OTP_VERIFY_RATE_LIMIT',
})

// Password reset request — keyed by IP.
const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reset requests per IP per hour
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'FORGOT_PASSWORD_RATE_LIMIT',
})

// Password reset completion — keyed by IP.
const resetPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reset completions per IP per hour
  key: req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  name: 'RESET_PASSWORD_RATE_LIMIT',
})

module.exports = {
  createRateLimiter,
  authRateLimiter,
  verifyRateLimiter,
  registerRateLimiter,
  otpSendRateLimiter,
  otpVerifyRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
}
