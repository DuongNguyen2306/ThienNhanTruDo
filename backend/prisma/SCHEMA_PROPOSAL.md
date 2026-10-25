# Proposed Prisma Schema Changes — THIÊN NHÃN TRÚ ĐỒ

Status: **AWAITING APPROVAL — nothing applied yet.**
Target: `backend/prisma/schema.prisma` (datasource = MongoDB Atlas `thiennhan_db`)
Mechanism: `prisma db push` (there is **no** `prisma/migrations` folder — MongoDB connector does not
use SQL migrations; `db push` performs a non-destructive additive sync).

---

## 0. Summary of changes

| # | Change | Model | Purpose | Task |
|---|---|---|---|---|
| 1 | `emailVerifiedAt DateTime?` | User | when the email was proven | 7 |
| 2 | `emailVerificationRequired Boolean @default(false)` | User | login gate for NEW signups only (legacy unaffected) | 7 |
| 3 | `tokenVersion Int @default(0)` | User | session invalidation on password change/reset | 7 |
| 4 | `passwordChangedAt DateTime?` | User | audit + invalidation | 7 |
| 5 | `websiteReviews WebsiteReview[]` | User | relation | 3 |
| 6 | `category String?` | Transaction | revenue/product categorization | 2 |
| 7 | `sourceRef String?` | Transaction | traceability to order ref | 2, 6 |
| 8 | `verifiedAt DateTime?` | Transaction | explicit "verified" timestamp | 2 |
| 9 | `websiteReviews WebsiteReview[]` | Transaction | relation | 3 |
| 10 | **NEW** `model WebsiteReview` | — | website-level rating | 3, 5 |
| 11 | **NEW** `model EmailOtp` | — | email OTP (verify / reset) | 7 |

**No existing field is removed, renamed, retyped, or overwritten. No existing document is deleted.**

---

## 1. `model User` — additive field changes

### Current (lines 17–31)

```prisma
model User {
  id            String    @id @default(uuid()) @map("_id")
  email         String?   @unique
  phone         String    @unique
  password      String
  fullName      String
  role          String    @default("tenant") // tenant | seller | manager | admin
  initials      String?
  title         String?
  twoFactor     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
```

### Proposed

```prisma
model User {
  id            String    @id @default(uuid()) @map("_id")
  email         String?   @unique
  phone         String    @unique
  password      String
  fullName      String
  role          String    @default("tenant") // tenant | seller | manager | admin
  initials      String?
  title         String?
  twoFactor     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // ── NEW: Email verification (Task 7) ────────────────────────────────────
  // emailVerificationRequired is the LOGIN GATE and is `true` ONLY for accounts
  // created through the new registration flow. Pre-existing accounts keep the
  // `false` default, so NO backfill is needed and no existing user is locked out.
  emailVerificationRequired Boolean   @default(false)
  emailVerifiedAt            DateTime?

  // ── NEW: Session invalidation (Task 7) ──────────────────────────────────
  // Bumped on password change / password reset. Embedded in the JWT; a mismatch
  // invalidates every previously issued token for that user.
  tokenVersion       Int       @default(0)
  passwordChangedAt  DateTime?
```

### Why `emailVerificationRequired` is a separate flag

`emailVerified` alone cannot be the gate: all 29 pre-existing users have
`emailVerifiedAt = null` (the column is new), so gating login on it would lock
every current Tenant / Seller / Manager / Admin out of the platform.

With two fields:

| Account | `emailVerificationRequired` | `emailVerifiedAt` | Login behaviour |
|---|---|---|---|
| Pre-existing (29) | `false` (default) | `null` | **unchanged — normal login** |
| New signup | `true` (set at registration) | `null` | must verify email first |
| New signup, verified | `false` | timestamp set | normal login |

---

## 2. `model User` — relation additions

### Current (lines 36–44)

```prisma
  // Relations
  listings        Listing[]       @relation("SellerListings")
  appointments    Appointment[]   @relation("TenantAppointments")
  leads           SellerLead[]    @relation("SellerLeads")
  reports         Report[]        @relation("Reporter")
  reviews         Review[]        @relation("ReviewAuthor")
  transactions    Transaction[]    @relation("TransactionUser")
```

### Proposed — append one line

```prisma
  transactions    Transaction[]    @relation("TransactionUser")
  websiteReviews  WebsiteReview[] @relation("WebsiteReviewAuthor")   // ← NEW
```

---

## 3. `model Transaction` — additive field changes

### Current (lines 270–289)

```prisma
model Transaction {
  id           String   @id @default(uuid()) @map("_id")
  userId       String
  user         User     @relation("TransactionUser", fields: [userId], references: [id])

  type         String   // deposit | withdrawal | refund | payment
  amount       Float    // VND
  method       String?  // vnpay | cash | bank_transfer
  status       String   @default("pending") // pending | completed | failed | refunded
  description  String?

  vnpayTxRef   String?  // VNPay transaction reference
  vnpayDate    String?
  idempotencyKey String?  // For idempotent boost purchases (uniqueness enforced in app code)

  createdAt    DateTime @default(now())

  @@map("transactions")
}
```

### Proposed

```prisma
model Transaction {
  id           String   @id @default(uuid()) @map("_id")
  userId       String
  user         User     @relation("TransactionUser", fields: [userId], references: [id])

  type         String   // deposit | withdrawal | refund | payment
  amount       Float    // VND
  method       String?  // vnpay | cash | bank_transfer
  status       String   @default("pending") // pending | completed | failed | refunded
  description  String?

  vnpayTxRef   String?  // VNPay transaction reference
  vnpayDate    String?
  idempotencyKey String?  // For idempotent boost purchases (uniqueness enforced in app code)

  // ── NEW: Revenue categorization (Task 2) ───────────────────────────────
  // package_subscription | verification | vip_boost | wallet_deposit | refund | other
  // NULL for legacy rows; the API derives a category from `description` for
  // those, so historical rows are still classified correctly.
  category     String?

  // ── NEW: Traceability (Task 2, 6) ───────────────────────────────────────
  // Order / boost reference this money came from, e.g. "TNP-261019...-X7K9M".
  sourceRef    String?

  // ── NEW: Explicit verification timestamp (Task 2) ───────────────────────
  // Set at the moment status becomes "completed" — i.e. when VNPay IPN
  // signature verification or a manager approval confirmed the money.
  verifiedAt   DateTime?

  createdAt    DateTime @default(now())

  // Relations
  websiteReviews WebsiteReview[] @relation("TransactionWebsiteReviews")   // ← NEW

  @@index([category, createdAt])     // ← NEW (revenue breakdown + date filter)
  @@index([status, createdAt])       // ← NEW (completed-only revenue queries)

  @@map("transactions")
}
```

---

## 4. NEW model — `WebsiteReview` (Task 3 + Task 5)

Appended at the end of `schema.prisma`:

```prisma
// ============================================
// WEBSITE REVIEW - Rating for the PLATFORM itself
// Separate from `Review`, which rates a LISTING (room).
// ============================================
// Eligibility (enforced server-side, never client-side):
//   - the reviewer must own a Transaction with
//       type = "payment" AND status = "completed"
//   - exactly one review may be backed by any given transaction
//     (guaranteed by the unique index below, not just application code)
// ============================================

model WebsiteReview {
  id            String   @id @default(uuid()) @map("_id")

  // Author
  userId        String
  user          User     @relation("WebsiteReviewAuthor", fields: [userId], references: [id], onDelete: Cascade)

  // The qualifying completed transaction that made this reviewer eligible.
  // UNIQUE -> a transaction can back at most ONE website review.
  transactionId String
  transaction   Transaction @relation("TransactionWebsiteReviews", fields: [transactionId], references: [id])

  // Rating
  score         Int      // 1-5
  title         String?
  content       String

  // Moderation (admin/manager)
  // published | hidden | flagged
  status        String   @default("published")
  hiddenReason  String?
  hiddenAt      DateTime?
  hiddenBy      String?

  // Admin reply
  adminReply    String?
  adminReplyAt  DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // The single most important constraint of this task:
  // no duplicate review for the same qualifying transaction.
  @@unique([transactionId])
  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([createdAt])

  @@map("website_reviews")
}
```

**Duplicate-prevention is enforced at the database level** via `@@unique([transactionId])`.
A second attempt returns MongoDB `E11000` → HTTP `409`, handled explicitly in the route
(not leaked as a generic 500).

**One active review per user** is additionally enforced in application code: a user who
already has a `published` review is told to edit it instead of creating another, which
prevents rating spam by users holding several qualifying transactions.

---

## 5. NEW model — `EmailOtp` (Task 7)

Appended at the end of `schema.prisma`:

```prisma
// ============================================
// EMAIL OTP - Email verification + password reset
// ============================================
// purpose: register_verify | password_reset | email_change
// The raw OTP is NEVER stored. Only a peppered HMAC-SHA256 digest is persisted,
// so a database leak cannot be replayed offline.
// ============================================

model EmailOtp {
  id          String   @id @default(uuid()) @map("_id")

  // Destination
  email       String
  purpose     String   // register_verify | password_reset | email_change

  // Peppered HMAC-SHA256 of the OTP (never the raw code)
  codeHash    String

  // Lifetime
  expiresAt   DateTime
  consumedAt  DateTime?

  // Abuse controls
  attempts    Int      @default(0)   // failed verification attempts
  maxAttempts Int      @default(5)

  // Request metadata (audit + abuse tracing)
  ip          String?
  userAgent   String?

  // For register_verify: the pending registration payload (JSON).
  // Holds only a bcrypt hash — never a plaintext password.
  payload     String?

  createdAt   DateTime @default(now())

  @@index([email, purpose, createdAt])
  @@index([expiresAt])
  @@index([purpose, createdAt])

  @@map("email_otps")
}
```

**Security properties**

- The raw OTP never touches the database, a log line, or an API response.
- `codeHash` = `HMAC-SHA256(pepper, email|purpose|code)` with `pepper` from
  `OTP_SECRET` (falls back to `JWT_SECRET`). A database-only attacker cannot
  brute-force a 6-digit code without the server secret.
- Comparison is constant-time (`crypto.timingSafeEqual`).
- Expiry: 10 minutes. Resend cooldown: 60 seconds. Max 5 verification attempts
  per issued OTP. Max 5 sends per email per hour. All backed by a dedicated
  rate limiter on top of the existing middleware.

---

## 6. Env vars required (no schema impact)

```
# Required in production for Task 7 email delivery
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=no-reply@thiennhan.vn
OTP_SECRET=<random 32+ chars>        # optional; falls back to JWT_SECRET

# Optional, development only — never enable in production
DEV_OTP_LOG=true
```

---

## 7. What `prisma db push` will actually do

1. `users` — add 4 nullable / defaulted columns. **Existing 30 documents untouched.**
2. `transactions` — add 3 nullable columns + 2 indexes. **Existing 21 documents untouched.**
3. `website_reviews` — create a **new** collection + 4 indexes.
4. `email_otps` — create a **new** collection + 3 indexes.

No collection is dropped, no document is rewritten, no index on an existing collection is
replaced. The only index change is the **addition** of two indexes on `transactions`.

---

## 8. Pre-existing bug this plan also fixes (reported, not silently changed)

`users.email` has a **non-sparse** unique index in MongoDB:

```
{ "key": { "email": 1 }, "name": "users_email_key", "unique": true }   // no sparse:true
```

Consequence, verified by a rolled-back probe against production:

```
create 2nd user with email:null  ->  P2002 "Unique constraint failed on users_email_key"
```

There is currently **1** null-email user and **29** with email. Therefore:

> **The next user who registers without an email will fail with a confusing HTTP 409
> "Dữ liệu đã tồn tại".**

This plan mitigates it without touching the index:

- Task 7 makes **email mandatory** for new registrations, so no new null-email rows
  can ever be created.
- `PUT /api/auth/profile` currently allows `email: null`; the code change rejects
  clearing the email with a clear `400`.

The underlying index can optionally be converted to a **sparse** unique index (drop
`users_email_key`, recreate with `sparse: true`) so null emails are legal again.
That is a **separate, riskier** production operation on a live unique index and is
**not** part of this plan — it needs its own explicit approval.
