/**
 * Internal Store — a tiny key/value facility backed by the EXISTING
 * `SystemConfig` model.
 *
 * WHY
 * ───
 * The website-review and OTP features need durable, per-record storage with
 * a uniqueness guarantee, but the project has NOT been approved for a schema
 * change. `SystemConfig` already provides exactly that:
 *
 *   • `key` is UNIQUE in MongoDB  → a key can only ever exist once, which
 *     gives us a database-enforced "claim" (e.g. one review per transaction).
 *   • `value` holds a JSON string → the record payload.
 *   • `updatedAt` is maintained automatically → we get timestamps for free.
 *
 * Every internal record uses a reserved prefix so that:
 *   1. it can never collide with a real config key (`packages`, `amenities`, …)
 *   2. the admin config API can filter internal records out of the visible
 *      config list, so operators never see (or accidentally edit) them.
 *
 * PREFIXES
 * ────────
 *   wtx:         website review records + transaction claims
 *   otp:         one-time passwords
 *   pw_epoch:    per-user session epoch (JWT invalidation)
 *   pending_reg: registrations awaiting email verification
 */

const prisma = require('../db');

const PREFIX = {
  WEBSITE_REVIEW: 'wtx:',
  OTP: 'otp:',
  SESSION_EPOCH: 'pw_epoch:',
  PENDING_REG: 'pending_reg:',
  EMAIL_VERIFIED: 'email_verified:',
};

const ALL_PREFIXES = Object.values(PREFIX);

/** True when a SystemConfig key is an internal record rather than real config. */
function isInternalKey(key) {
  return typeof key === 'string' && ALL_PREFIXES.some((p) => key.startsWith(p));
}

/** Read + parse a record. Returns null when absent or unparseable. */
async function readRecord(key) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

/** Create or replace a record. */
async function writeRecord(key, value, description) {
  const payload = JSON.stringify(value);
  return prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: payload, description: description || 'Thiên Nhãn internal record' },
    update: { value: payload },
  });
}

/** Delete a record. Never throws. */
async function deleteRecord(key) {
  try {
    await prisma.systemConfig.deleteMany({ where: { key } });
  } catch {
    /* non-fatal */
  }
}

/**
 * Atomically claim a unique key.
 * Returns true when the claim was granted, false when the key already existed.
 * This is the database-enforced uniqueness primitive used to prevent
 * duplicate website reviews for the same qualifying transaction.
 */
async function claimKey(key, value, description) {
  try {
    await prisma.systemConfig.create({ data: { key, value: JSON.stringify(value), description } });
    return true;
  } catch (err) {
    if (err.code === 'P2002') return false; // already claimed
    throw err;
  }
}

/** List all record keys sharing a prefix. */
async function listKeys(prefix) {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { startsWith: prefix } },
    select: { key: true },
  });
  return rows.map((r) => r.key);
}

/** List + parse all records sharing a prefix. */
async function listRecords(prefix) {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { startsWith: prefix } },
    select: { key: true, value: true, updatedAt: true },
  });
  const out = [];
  for (const row of rows) {
    try {
      out.push({ ...JSON.parse(row.value), _key: row.key, _updatedAt: row.updatedAt });
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

module.exports = {
  PREFIX,
  ALL_PREFIXES,
  isInternalKey,
  readRecord,
  writeRecord,
  deleteRecord,
  claimKey,
  listKeys,
  listRecords,
};
