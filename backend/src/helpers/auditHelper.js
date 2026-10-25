/**
 * Audit helper — centralised audit-log writer.
 *
 * The admin.js and tenant.js routes each define their own local copy of this
 * function. This module provides a single shared implementation so new
 * routes (website reviews, OTP/auth events) log consistently.
 *
 * IMPORTANT: never pass secrets (passwords, OTPs, tokens, hashes) into
 * `details` — the audit log is readable by managers and admins.
 */
const prisma = require('../db');

/**
 * Write an audit log entry.
 *
 * @param {string} actorId  User performing the action
 * @param {string} action   Action verb, e.g. 'created' | 'hide_review'
 * @param {string|null} target       Target id (entity id)
 * @param {string|null} targetType   Target type, e.g. 'website_review'
 * @param {object|string|null} details  Extra context (object → JSON, or raw string)
 */
async function createAuditLog(actorId, action, target, targetType, details = null) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        target: target || null,
        targetType: targetType || null,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      },
    });
  } catch (err) {
    // Auditing must never break the primary operation.
    console.error('[audit] failed to write audit log:', err?.message);
    return null;
  }
}

module.exports = { createAuditLog };
