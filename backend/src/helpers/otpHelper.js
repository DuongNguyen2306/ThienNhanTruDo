/**
 * OTP Helper — email one-time-password issuing, verification and abuse control.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STORAGE (no schema change required)
 * ─────────────────────────────────────────────────────────────────────────────
 * OTPs are stored in the EXISTING `SystemConfig` model under reserved key
 * prefixes. `SystemConfig.key` is UNIQUE in MongoDB, which gives us a
 * database-enforced guarantee that only one live OTP can exist per
 * (purpose, email) pair — the same protection a dedicated table + unique
 * index would provide, without touching the schema.
 *
 *   otp:verify:<emailHash>     → registration / login email verification
 *   otp:reset:<emailHash>      → forgot-password flow
 *   otp:emailchange:<emailHash>→ change-email flow
 *   pw_epoch:<userId>          → session-epoch used to invalidate JWTs
 *   pending_reg:<phoneHash>    → pending registration awaiting verification
 *
 * The e-mail address is HASHED in the key so that no PII is stored in a
 * collection that admins browse, and so key length stays bounded.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY
 * ─────────────────────────────────────────────────────────────────────────────
 *  • The raw OTP is NEVER persisted. Only a peppered HMAC-SHA256 digest is
 *    stored, so a database leak cannot be replayed offline.
 *  • Digest comparison uses crypto.timingSafeEqual (constant time).
 *  • Expiry:        10 minutes (OTP_TTL_SECONDS)
 *  • Resend cooldown: 60 seconds (OTP_RESEND_COOLDOWN_SECONDS)
 *  • Max verify attempts per issued OTP: 5 (OTP_MAX_ATTEMPTS)
 *  • Max sends per e-mail per hour: 5 (OTP_MAX_SENDS_PER_HOUR)
 *  • A successful verification CONSUMES the OTP (single use).
 *  • The raw OTP is never returned by any API route and never written to a log.
 */

const crypto = require('crypto');
const prisma = require('../db');

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 10 * 60);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_MAX_SENDS_PER_HOUR = Number(process.env.OTP_MAX_SENDS_PER_HOUR || 5);
const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET;

// ── Key helpers ───────────────────────────────────────────────────────────

function hashIdentifier(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex').slice(0, 32);
}

function otpKey(purpose, email) {
  return `otp:${purpose}:${hashIdentifier(email)}`;
}

/**
 * Key of the per-e-mail send log.
 *
 * The OTP record itself is DELETED on consumption/expiry, so it cannot be
 * used to count how many times a code was requested. The send log is a
 * separate, small document that survives the OTP lifecycle and stores the
 * timestamps of the recent sends for ONE (purpose, email) pair.
 */
function otpSendLogKey(purpose, email) {
  return `otp_log:${purpose}:${hashIdentifier(email)}`;
}

function pendingRegKey(phone) {
  return `pending_reg:${hashIdentifier(phone)}`;
}

function epochKey(userId) {
  return `pw_epoch:${userId}`;
}

// ── Code generation & hashing ─────────────────────────────────────────────

/**
 * Generate a cryptographically random numeric OTP.
 * crypto.randomInt is a CSPRNG — not Math.random.
 */
function generateOtpCode() {
  const max = 10 ** OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(OTP_LENGTH, '0');
}

/**
 * Peppered HMAC-SHA256 of the OTP, bound to the e-mail and purpose so a code
 * issued for one purpose/address can never be replayed for another.
 */
function hashOtpCode(email, purpose, code) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${hashIdentifier(email)}|${purpose}|${code}`)
    .digest('hex');
}

/**
 * Constant-time comparison of two hex digests.
 *
 * SECURITY: `Buffer.from(str, 'hex')` SILENTLY TRUNCATES at the first
 * non-hex character, so comparing the buffers directly would make two
 * different strings of equal length compare EQUAL (e.g. 'short' vs 'short'
 * both decode to an empty buffer and `timingSafeEqual` returns true). We
 * therefore validate the hex shape and the decoded length FIRST, and only
 * then compare the raw bytes.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  // Must be well-formed hex of even length.
  if (!/^[0-9a-fA-F]+$/.test(a) || !/^[0-9a-fA-F]+$/.test(b)) return false;
  if (a.length % 2 !== 0) return false;

  let bufA;
  let bufB;
  try {
    bufA = Buffer.from(a, 'hex');
    bufB = Buffer.from(b, 'hex');
  } catch {
    return false;
  }

  // Guard against truncation: the decoded lengths must match exactly.
  if (bufA.length !== bufB.length || bufA.length === 0) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Record helpers ────────────────────────────────────────────────────────

async function readRecord(key) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

async function writeRecord(key, value, description) {
  const payload = JSON.stringify(value);
  return prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: payload, description: description || 'Thiên Nhãn internal record' },
    update: { value: payload },
  });
}

async function deleteRecord(key) {
  try {
    await prisma.systemConfig.deleteMany({ where: { key } });
  } catch {
    /* non-fatal */
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Issue (or re-issue) an OTP for an e-mail + purpose.
 *
 * @returns {{ok:true, id:string, expiresAt:Date, resendAvailableIn:number}
 *          |{ok:false, reason:'cooldown'|'throttled', retryAfter:number}}
 */
async function issueOtp({ email, purpose, payload = null, ip = null, userAgent = null }) {
  const key = otpKey(purpose, email);
  const now = new Date();
  const existing = await readRecord(key);

  // Resend cooldown
  if (existing && existing.createdAt) {
    const elapsed = now.getTime() - new Date(existing.createdAt).getTime();
    const remaining = OTP_RESEND_COOLDOWN_SECONDS - elapsed / 1000;
    if (remaining > 0) {
      return { ok: false, reason: 'cooldown', retryAfter: Math.ceil(remaining) };
    }
  }

  // Hourly send throttle — scoped to THIS e-mail, not to every account.
  //
  // The previous implementation counted every `otp:<purpose>:*` record
  // modified in the last hour, which meant that a handful of users
  // registering from different addresses exhausted the quota for EVERYONE
  // ("Bạn đã yêu cầu quá nhiều mã xác thực"). The throttle must be
  // per (purpose, email) pair, so the send log is kept per address.
  const logKey = otpSendLogKey(purpose, email);
  const log = await readRecord(logKey);
  const sentTimestamps = Array.isArray(log?.sentAt)
    ? log.sentAt.map((t) => new Date(t).getTime()).filter((t) => !Number.isNaN(t))
    : [];
  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const sentInWindow = sentTimestamps.filter((t) => t >= hourAgo);
  if (sentInWindow.length >= OTP_MAX_SENDS_PER_HOUR) {
    // Retry after the oldest send in the window rolls out of it.
    const oldest = Math.min(...sentInWindow);
    const retryAfter = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now.getTime()) / 1000));
    return { ok: false, reason: 'throttled', retryAfter };
  }

  const code = generateOtpCode();
  const record = {
    id: crypto.randomBytes(8).toString('hex'),
    hash: hashOtpCode(email, purpose, code),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000).toISOString(),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    payload,
    ip,
    userAgent,
  };

  await writeRecord(key, record, `OTP ${purpose}`);

  // Append to the per-e-mail send log (used only for the hourly throttle).
  const updatedLog = [...sentInWindow, now.getTime()];
  await writeRecord(logKey, { sentAt: updatedLog }, `OTP send log ${purpose}`);

  // The raw code is returned ONLY to the caller (the mailer). It is never
  // persisted and never logged.
  return {
    ok: true,
    code,
    id: record.id,
    expiresAt: new Date(record.expiresAt),
    resendAvailableIn: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

/**
 * Roll back a send attempt that could NOT be delivered.
 *
 * When the mail transport fails, the OTP was still created and the hourly
 * send quota was still consumed. Without this rollback the user is punished
 * for a provider-side failure: every retry eats another quota slot until
 * they are permanently throttled, even though no e-mail ever left the
 * server. Releasing the slot lets them retry immediately.
 *
 * @returns {Promise<void>}
 */
async function revokeOtpSend({ email, purpose }) {
  await deleteRecord(otpKey(purpose, email));

  const logKey = otpSendLogKey(purpose, email);
  const log = await readRecord(logKey);
  if (!log || !Array.isArray(log.sentAt)) return;

  const remaining = log.sentAt
    .map((t) => new Date(t).getTime())
    .filter((t) => !Number.isNaN(t))
    .slice(0, -1); // drop the most recent (failed) send

  if (remaining.length === 0) {
    await deleteRecord(logKey);
  } else {
    await writeRecord(logKey, { sentAt: remaining }, `OTP send log ${purpose}`);
  }
}

/**
 * Verify (and consume) an OTP.
 *
 * @returns {{ok:true, payload:any} | {ok:false, reason:string, retryAfter?:number}}
 */
async function verifyOtp({ email, purpose, code, ip = null }) {
  const key = otpKey(purpose, email);
  const record = await readRecord(key);

  if (!record) {
    return { ok: false, reason: 'not_found' };
  }

  if (record.consumedAt) {
    return { ok: false, reason: 'consumed' };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await deleteRecord(key);
    return { ok: false, reason: 'expired' };
  }

  if (record.attempts >= record.maxAttempts) {
    await deleteRecord(key);
    return { ok: false, reason: 'max_attempts' };
  }

  const candidate = hashOtpCode(email, purpose, String(code || '').trim());
  if (!safeEqual(candidate, record.hash)) {
    // Increment attempts BEFORE returning so repeated guesses are throttled.
    const attempts = (record.attempts || 0) + 1;
    await writeRecord(key, { ...record, attempts }, `OTP ${purpose}`);
    const left = record.maxAttempts - attempts;
    if (left <= 0) {
      await deleteRecord(key);
      return { ok: false, reason: 'max_attempts' };
    }
    return { ok: false, reason: 'invalid', retryAfter: left };
  }

  // Optional IP binding: if the OTP was issued from a different IP, reject.
  if (record.ip && ip && record.ip !== ip) {
    return { ok: false, reason: 'ip_mismatch' };
  }

  // Consume — single use.
  await deleteRecord(key);
  return { ok: true, payload: record.payload ?? null };
}

/** Read the live OTP record for an e-mail + purpose (no secrets returned). */
async function getOtpStatus(email, purpose) {
  const record = await readRecord(otpKey(purpose, email));
  if (!record) return { exists: false };
  return {
    exists: true,
    expiresAt: record.expiresAt,
    resendAvailableIn: Math.max(
      0,
      Math.ceil(
        (OTP_RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - new Date(record.createdAt).getTime())) / 1000
      )
    ),
    attemptsRemaining: Math.max(0, (record.maxAttempts || OTP_MAX_ATTEMPTS) - (record.attempts || 0)),
  };
}

/** Remove expired OTP records and stale send logs. Safe to call periodically. */
async function cleanupExpiredOtps() {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { startsWith: 'otp:' } },
    select: { key: true, value: true },
  });
  let removed = 0;
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
        await prisma.systemConfig.deleteMany({ where: { key: row.key } });
        removed += 1;
      }
    } catch {
      await prisma.systemConfig.deleteMany({ where: { key: row.key } });
      removed += 1;
    }
  }

  // Send logs are pruned once every entry is older than the throttle window.
  const logRows = await prisma.systemConfig.findMany({
    where: { key: { startsWith: 'otp_log:' } },
    select: { key: true, value: true },
  });
  const hourAgo = Date.now() - 60 * 60 * 1000;
  for (const row of logRows) {
    try {
      const parsed = JSON.parse(row.value);
      const kept = (Array.isArray(parsed.sentAt) ? parsed.sentAt : [])
        .map((t) => new Date(t).getTime())
        .filter((t) => !Number.isNaN(t) && t >= hourAgo);
      if (kept.length === 0) {
        await prisma.systemConfig.deleteMany({ where: { key: row.key } });
        removed += 1;
      } else if (kept.length !== (parsed.sentAt || []).length) {
        await writeRecord(row.key, { sentAt: kept }, 'OTP send log');
      }
    } catch {
      await prisma.systemConfig.deleteMany({ where: { key: row.key } });
      removed += 1;
    }
  }
  return { removed };
}

// ── Session epoch (JWT invalidation without a schema change) ──────────────

/**
 * In-memory cache of session epochs.
 *
 * The epoch must be compared on every authenticated request, but reading it
 * from the database each time would add a query to every request. The cache
 * keeps latency low while the `rotateSessionEpoch` function DELETES the cache
 * entry, which makes invalidation immediate rather than merely eventual.
 */
const epochCache = new Map();
const EPOCH_CACHE_TTL_MS = Number(process.env.SESSION_EPOCH_CACHE_MS || 15000);

function cacheGet(key) {
  const hit = epochCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > EPOCH_CACHE_TTL_MS) {
    epochCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  epochCache.set(key, { value, at: Date.now() });
}

/**
 * Return the current session epoch for a user, creating it on first use.
 * The epoch is embedded in issued JWTs. Rotating it invalidates every
 * previously issued token for that user (used after password change/reset).
 */
async function getSessionEpoch(userId) {
  const cached = cacheGet(epochKey(userId));
  if (cached) return cached;

  const record = await readRecord(epochKey(userId));
  if (record && record.epoch) {
    cacheSet(epochKey(userId), record.epoch);
    return record.epoch;
  }
  const epoch = crypto.randomBytes(16).toString('hex');
  await writeRecord(epochKey(userId), { epoch, changedAt: new Date().toISOString() }, 'Session epoch');
  cacheSet(epochKey(userId), epoch);
  return epoch;
}

/** Rotate the session epoch → all existing tokens for the user become invalid. */
async function rotateSessionEpoch(userId) {
  const epoch = crypto.randomBytes(16).toString('hex');
  await writeRecord(epochKey(userId), { epoch, changedAt: new Date().toISOString() }, 'Session epoch');
  // Invalidate the cache so the new epoch takes effect IMMEDIATELY.
  epochCache.delete(epochKey(userId));
  return epoch;
}

/**
 * Verify a token's epoch against the user's current epoch.
 * A mismatch means the token was issued before a password change / reset.
 */
async function verifySessionEpoch(userId, tokenEpoch) {
  if (!userId) return false;
  // Tokens issued before this feature existed carry no epoch — accept them
  // rather than logging every existing user out.
  if (!tokenEpoch) return true;
  const current = await getSessionEpoch(userId);
  return current === tokenEpoch;
}

// ── Pending registration (email verification at signup) ───────────────────

async function savePendingRegistration(phone, data) {
  await writeRecord(
    pendingRegKey(phone),
    { ...data, createdAt: new Date().toISOString() },
    'Pending registration awaiting email verification'
  );
}

async function getPendingRegistration(phone) {
  const rec = await readRecord(pendingRegKey(phone));
  if (!rec) return null;
  // Pending registrations expire after 30 minutes.
  if (Date.now() - new Date(rec.createdAt).getTime() > 30 * 60 * 1000) {
    await deleteRecord(pendingRegKey(phone));
    return null;
  }
  return rec;
}

async function clearPendingRegistration(phone) {
  await deleteRecord(pendingRegKey(phone));
}

module.exports = {
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  generateOtpCode,
  hashOtpCode,
  hashIdentifier,
  safeEqual,
  otpKey,
  otpSendLogKey,
  issueOtp,
  revokeOtpSend,
  verifyOtp,
  getOtpStatus,
  cleanupExpiredOtps,
  getSessionEpoch,
  rotateSessionEpoch,
  verifySessionEpoch,
  savePendingRegistration,
  getPendingRegistration,
  clearPendingRegistration,
};
