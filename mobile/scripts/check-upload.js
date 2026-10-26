/**
 * Kiểm tra endpoint upload ảnh của Seller.
 *
 *   node scripts/check-upload.js
 *
 * Script tự đăng nhập bằng một tài khoản seller có sẵn trong database rồi
 * gửi một ảnh JPEG hợp lệ tới `POST /api/seller/upload`.
 *
 * KHÔNG tạo dữ liệu demo: nếu không đăng nhập được, script báo lỗi và
 * dừng — không giả lập kết quả thành công.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const API = process.env.CHECK_API_URL || 'http://localhost:3005';

/** A real 1x1 JPEG. */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

async function main() {
  const identifier = process.env.CHECK_SELLER_ID || process.env.CHECK_IDENTIFIER;
  const password = process.env.CHECK_PASSWORD;

  if (!identifier || !password) {
    console.log('CHECK_SELLER_ID / CHECK_IDENTIFIER and CHECK_PASSWORD are required.');
    console.log('Example:');
    console.log('  $env:CHECK_IDENTIFIER="seller@example.com"; $env:CHECK_PASSWORD="..."');
    console.log('  node scripts/check-upload.js');
    process.exit(2);
  }

  // 1) Sign in.
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, phone: identifier, password }),
  });

  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.log(`LOGIN FAILED (${loginRes.status}):`, JSON.stringify(loginBody));
    process.exit(1);
  }

  const token = loginBody.token;
  const role = loginBody.user?.role;
  console.log(`LOGIN OK — role=${role}`);

  if (role !== 'seller') {
    console.log(`This account is "${role}", not a seller — the upload would be refused.`);
    process.exit(1);
  }

  // 2) Build a real multipart body (with a proper boundary).
  const boundary = `----tntd${Date.now()}`;
  const fileName = 'check-upload.jpg';
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="photos"; filename="${fileName}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`,
    'utf8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const body = Buffer.concat([head, TINY_JPEG, tail]);

  // 3) Upload.
  const uploadRes = await fetch(`${API}/api/seller/upload`, {
    method: 'POST',
    headers: {
      // The boundary MUST be part of the header.
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const uploadText = await uploadRes.text();
  console.log(`UPLOAD STATUS ${uploadRes.status}`);
  console.log(uploadText);

  if (!uploadRes.ok) process.exit(1);

  // 4) The returned URL must be downloadable.
  const parsed = JSON.parse(uploadText);
  const url = parsed.files?.[0]?.url;
  if (!url) {
    console.log('No file URL in the response.');
    process.exit(1);
  }

  const fileRes = await fetch(url);
  console.log(`GET ${url} -> ${fileRes.status} (${fileRes.headers.get('content-type')})`);
  process.exit(fileRes.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
