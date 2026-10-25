/**
 * Email Verification Helper (Task 7).
 *
 * WHY A HELPER INSTEAD OF A SCHEMA FIELD
 * ─────────────────────────────────────
 * The project has NOT been approved for a schema change, so the "is this e-mail
 * verified?" flag is stored in the existing `SystemConfig` collection under the
 * reserved prefix `email_verified:<userId>`.
 *
 * THE CRITICAL PROPERTY
 * ─────────────────────
 *   A LEGACY ACCOUNT IS "VERIFIED BY DEFAULT".
 *
 * All 29 pre-existing users were created before e-mail verification existed.
 * If verification were modelled as "email_verified_at IS NOT NULL", every one
 * of them would suddenly be unverified and would be locked out of the
 * platform. So the model is an OPT-IN marker with an explicit override:
 *
 *   marker EXISTS  → use marker.verified (true or false)
 *   marker ABSENT   → treated as VERIFIED (legacy account, or an account
 *                     created before this feature shipped)
 *
 * The "absent ⇒ verified" default is only ever overridden by an EXPLICIT
 * marker, which is written when:
 *   • a user changes their e-mail  → marker { verified: false, pendingEmail }
 *   • an admin un-verifies an account
 *
 * That means no existing user can ever be locked out by this feature.
 */

// The date this feature went live. Accounts created before this instant are
// treated as legacy. Override with EMAIL_VERIFICATION_LAUNCH_DATE to move
// the line (e.g. when deploying to a fresh database).
const LAUNCH_DATE = process.env.EMAIL_VERIFICATION_LAUNCH_DATE
  ? new Date(process.env.EMAIL_VERIFICATION_LAUNCH_DATE)
  : new Date('2026-10-22T00:00:00Z');

const prisma = require('../db');
const store = require('./internalStore');

function verifiedKey(userId) {
  return `${store.PREFIX.EMAIL_VERIFIED}${userId}`;
}

/**
 * Mark a user's e-mail as verified.
 */
async function markVerified(userId, email) {
  await store.writeRecord(
    verifiedKey(userId),
    {
      userId,
      verified: true,
      email: email || null,
      verifiedAt: new Date().toISOString(),
    },
    'Email verification marker'
  );
  return true;
}

/**
 * Mark a user's e-mail as NOT verified (used when the address changes).
 * The new address must be re-verified before the account is used again.
 *
 * `opts.changePending` distinguishes the two reasons for an unverified marker:
 *   • registration  → the address on file has never been proven.
 *   • email change  → the address on file WAS proven; a NEW address is waiting
 *     for its OTP. The account stays usable in the meantime (the current
 *     address is still valid), which is why `isEmailVerified` treats a pending
 *     change as verified.
 */
async function markUnverified(userId, pendingEmail, opts = {}) {
  await store.writeRecord(
    verifiedKey(userId),
    {
      userId,
      verified: false,
      pendingEmail: pendingEmail || null,
      changePending: Boolean(opts.changePending),
      changedAt: new Date().toISOString(),
    },
    'Email verification marker'
  );
  return true;
}

/**
 * Has this user proven their e-mail address?
 *
 * @param {{id:string, email?:string, createdAt?:Date|string}} user
 * @returns {Promise<boolean>}
 */
async function isEmailVerified(user) {
  if (!user?.id) return false;

  // No e-mail on file → nothing to verify, and nothing to gate on.
  if (!user.email) return true;

  const rec = await store.readRecord(verifiedKey(user.id));
  if (rec && typeof rec.verified === 'boolean') {
    // A pending e-mail CHANGE does not invalidate the CURRENT address: the
    // address on file was already proven, so the account stays usable until
    // the new address is confirmed (or the change is abandoned).
    if (rec.verified === false && rec.changePending) return true;
    return rec.verified;
  }

  // No marker → legacy account → considered verified (never locked out).
  return true;
}

/**
 * Return the pending e-mail change for a user, if any.
 */
async function getPendingEmail(userId) {
  const rec = await store.readRecord(verifiedKey(userId));
  if (rec && rec.verified === false && rec.changePending) return rec.pendingEmail || null;
  return null;
}

/**
 * Was this account created after the feature launch (i.e. must it verify)?
 */
function isNewAccount(user) {
  if (!user?.createdAt) return false;
  const created = new Date(user.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return created.getTime() >= LAUNCH_DATE.getTime();
}

/**
 * Remove the verification marker entirely (restores the legacy default).
 */
async function clearVerified(userId) {
  await store.deleteRecord(verifiedKey(userId));
}

module.exports = {
  LAUNCH_DATE,
  markVerified,
  markUnverified,
  isEmailVerified,
  getPendingEmail,
  isNewAccount,
  clearVerified,
  verifiedKey,
};
