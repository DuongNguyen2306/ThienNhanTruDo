/**
 * Email Helper — transactional email delivery.
 *
 * Two transports are supported, selected with EMAIL_PROVIDER:
 *   • `smtp`   → Gmail (or any SMTP server) through Nodemailer.
 *   • `resend` → the Resend HTTP API (default, kept for compatibility).
 *
 * SAFETY RULES (enforced here, not at the call sites)
 * ────────────────────────────────────────────────────
 *  • OTP codes are NEVER logged. `sendOtpEmail` receives the code but only
 *    ever puts it in the e-mail body.
 *  • If the selected transport is not usable:
 *      - in production  → delivery FAILS loudly. We never silently pretend an
 *        e-mail was sent, and we never fall back to a demo code.
 *      - in development → the code is written to the console so a developer
 *        can complete the flow locally (Resend-without-key only).
 *  • The API key / SMTP password is never included in any error message, and
 *    no credential value is ever written to the logs.
 */

const nodemailer = require('nodemailer');

const RESEND_API_URL = 'https://api.resend.com/emails';

const isProd = process.env.NODE_ENV === 'production';

const PROVIDER = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Thiên Nhãn Trú Đồ <no-reply@thiennhan.vn>';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM =
  process.env.SMTP_FROM_EMAIL ||
  (SMTP_USER ? `Thiên Nhãn Trú Đồ <${SMTP_USER}>` : '');

/** True when the SMTP transport has everything it needs to connect. */
function isSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

let smtpTransport = null;

/** Lazily build (and cache) the Nodemailer transport. */
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  smtpTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 3,
  });
  return smtpTransport;
}

const BRAND = {
  name: 'THIÊN NHÃN TRÚ ĐỒ',
  color: '#FDE047',
  dark: '#151515',
  bg: '#F5F5F0',
};

/**
 * Low-level sender.
 * @returns {Promise<{ok:boolean, id?:string, error?:string, devOnly?:boolean, devCode?:string}>}
 */
async function sendEmail({ to, subject, html, text, devCode }) {
  if (PROVIDER === 'smtp') {
    return sendViaSmtp({ to, subject, html, text, devCode });
  }
  return sendViaResend({ to, subject, html, text, devCode });
}

/**
 * Send through Gmail (or any SMTP server) via Nodemailer.
 */
async function sendViaSmtp({ to, subject, html, text }) {
  if (!isSmtpConfigured()) {
    console.error('[email] SMTP transport is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — refusing to send');
    return { ok: false, error: 'Dịch vụ email chưa được cấu hình' };
  }

  try {
    const info = await getSmtpTransport().sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text,
    });
    return { ok: true, id: info?.messageId };
  } catch (err) {
    // Log the reason, never the credential. err.message from nodemailer can
    // contain the server response but never the password itself.
    console.error('[email] SMTP send failed:', err?.code || err?.message);
    return { ok: false, error: 'Không gửi được email' };
  }
}

/**
 * Send through the Resend HTTP API.
 */
async function sendViaResend({ to, subject, html, text, devCode }) {
  if (!RESEND_API_KEY) {
    if (isProd) {
      // Fail closed: never claim success without a delivery mechanism.
      console.error('[email] RESEND_API_KEY is not configured — refusing to send in production');
      return { ok: false, error: 'Email provider chưa được cấu hình' };
    }
    // Development fallback: surface the code on the console only.
    if (devCode) {
      console.log(`[email:dev] to=${to} subject="${subject}" code=${devCode}`);
    } else {
      console.log(`[email:dev] to=${to} subject="${subject}" (no body)`);
    }
    return { ok: true, devOnly: true, devCode };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html, text }),
    });

    if (!res.ok) {
      // Deliberately do NOT include the response body: it can echo the API key
      // in some error shapes and we must never log secrets.
      console.error(`[email] Resend request failed with status ${res.status}`);
      return { ok: false, error: `Không gửi được email (${res.status})` };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error('[email] Resend request threw:', err?.message);
    return { ok: false, error: 'Không gửi được email' };
  }
}

/**
 * Verify the configured SMTP transport can actually connect and authenticate.
 * Used by the SMTP self-test script; never logs credentials.
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function verifySmtpTransport() {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP chưa được cấu hình (thiếu SMTP_HOST/SMTP_USER/SMTP_PASS)' };
  }
  try {
    await getSmtpTransport().verify();
    return { ok: true };
  } catch (err) {
    console.error('[email] SMTP verify failed:', err?.code || err?.message);
    return { ok: false, error: err?.code || err?.message || 'SMTP verify thất bại' };
  }
}

// ── Layout ────────────────────────────────────────────────────────────────

function layout({ heading, bodyHtml, footer }) {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:24px;background:${BRAND.bg};font-family:'Be Vietnam Pro',Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:3px solid ${BRAND.dark};border-radius:16px;">
    <tr>
      <td style="padding:24px 28px 8px 28px;">
        <div style="display:inline-block;background:${BRAND.color};border:3px solid ${BRAND.dark};border-radius:10px;padding:6px 14px;font-weight:800;color:${BRAND.dark};font-size:13px;letter-spacing:.08em;">
          ${BRAND.name}
        </div>
        <h1 style="margin:18px 0 6px 0;font-size:22px;line-height:1.3;color:${BRAND.dark};">${heading}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 20px 28px;color:${BRAND.dark};font-size:14px;line-height:1.6;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 24px 28px;color:${BRAND.dark};opacity:.55;font-size:12px;line-height:1.5;">
        ${footer || 'Bạn nhận được email này vì có yêu cầu liên quan tới tài khoản tại Thiên Nhãn Trú Đồ. Nếu không phải bạn, hãy bỏ qua email này.'}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(code) {
  return `<div style="margin:18px 0;padding:16px 20px;background:${BRAND.color};border:3px solid ${BRAND.dark};border-radius:12px;text-align:center;">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:.28em;color:${BRAND.dark};">${code}</div>
  </div>`;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Send an OTP code to an e-mail address.
 * @returns {Promise<{ok:boolean, id?:string, error?:string, devOnly?:boolean, devCode?:string}>}
 */
async function sendOtpEmail({ to, code, purpose }) {
  const minutes = Math.round(Number(process.env.OTP_TTL_SECONDS || 600) / 60);

  const copy = {
    register_verify: {
      subject: 'Xác thực email để hoàn tất đăng ký',
      heading: 'Xác thực email của bạn',
      lead: 'Cảm ơn bạn đã đăng ký tài khoản. Nhập mã bên dưới để xác thực email và kích hoạt tài khoản.',
    },
    password_reset: {
      subject: 'Mã đặt lại mật khẩu',
      heading: 'Đặt lại mật khẩu',
      lead: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này. Nhập mã bên dưới để tiếp tục.',
    },
    email_change: {
      subject: 'Mã xác nhận thay đổi email',
      heading: 'Xác nhận thay đổi email',
      lead: 'Nhập mã bên dưới để xác nhận thay đổi email cho tài khoản của bạn.',
    },
  }[purpose] || {
    subject: 'Mã xác thực',
    heading: 'Mã xác thực',
    lead: 'Nhập mã bên dưới để xác nhận yêu cầu của bạn.',
  };

  const html = layout({
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 4px 0;">${copy.lead}</p>
      ${codeBlock(code)}
      <p style="margin:0 0 4px 0;">Mã có hiệu lực trong <b>${minutes} phút</b> và chỉ dùng được một lần.</p>
      <p style="margin:0;">Nếu bạn không yêu cầu mã này, hãy bỏ qua email và không chia sẻ mã với bất kỳ ai.</p>
    `,
  });

  const text = `${copy.heading}\n\n${copy.lead}\n\nMã xác thực: ${code}\n\nMã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.`;

  return sendEmail({ to, subject: copy.subject, html, text, devCode: code });
}

/**
 * Send the "your account was created" confirmation.
 */
async function sendWelcomeEmail({ to, fullName }) {
  const html = layout({
    heading: 'Chào mừng bạn đến với Thiên Nhãn',
    bodyHtml: `
      <p style="margin:0 0 6px 0;">Chào <b>${fullName}</b>,</p>
      <p style="margin:0;">Tài khoản của bạn đã được xác thực thành công. Bạn có thể đăng nhập và bắt đầu tìm phòng trọ thật.</p>
    `,
  });
  return sendEmail({ to, subject: 'Xác thực email thành công', html, text: `Chào ${fullName}, tài khoản của bạn đã được xác thực thành công.` });
}

/**
 * Send the "password was changed" notification.
 */
async function sendPasswordChangedEmail({ to }) {
  const html = layout({
    heading: 'Mật khẩu đã được thay đổi',
    bodyHtml: `
      <p style="margin:0 0 6px 0;">Mật khẩu của bạn vừa được thay đổi thành công.</p>
      <p style="margin:0;">Tất cả phiên đăng nhập cũ đã bị vô hiệu hoá. Nếu bạn không thực hiện thao tác này, hãy liên hệ bộ phận hỗ trợ ngay lập tức.</p>
    `,
    footer: 'Nếu bạn không thực hiện thao tác này, hãy đổi mật khẩu ngay và liên hệ hotro@thiennhan.vn.',
  });
  return sendEmail({ to, subject: 'Mật khẩu đã được thay đổi', html, text: 'Mật khẩu của bạn vừa được thay đổi. Tất cả phiên đăng nhập cũ đã bị vô hiệu hoá.' });
}

/**
 * Send the "reset your password" link (email-channel password reset).
 */
async function sendPasswordResetEmail({ to, link }) {
  const html = layout({
    heading: 'Đặt lại mật khẩu',
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này.</p>
      <p style="margin:0 0 12px 0;">
        <a href="${link}" style="display:inline-block;background:${BRAND.color};border:3px solid ${BRAND.dark};border-radius:12px;padding:12px 20px;font-weight:800;color:${BRAND.dark};text-decoration:none;">Đặt lại mật khẩu</a>
      </p>
      <p style="margin:0;">Hoặc dán liên kết sau vào trình duyệt:<br/><span style="word-break:break-all;font-family:ui-monospace,monospace;font-size:12px;">${link}</span></p>
    `,
    footer: 'Liên kết này chỉ dùng được một lần và sẽ hết hạn sau 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.',
  });
  return sendEmail({ to, subject: 'Đặt lại mật khẩu tài khoản', html, text: `Đặt lại mật khẩu: ${link}` });
}

/** True when a real mail transport is configured. */
function isEmailConfigured() {
  if (PROVIDER === 'smtp') return isSmtpConfigured();
  return Boolean(RESEND_API_KEY);
}

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
  verifySmtpTransport,
  provider: PROVIDER,
  RESEND_FROM,
  SMTP_FROM,
};
