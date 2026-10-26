/**
 * Read the mailbox via raw IMAP over TLS.
 * READ-ONLY: only fetches headers, never deletes or marks as read.
 *
 * Run: node scripts/check-mailbox.js
 */
require('dotenv').config({ path: './.env' });

const tls = require('tls');

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

/** Decode IMAP modified UTF-7 mailbox names ("[Gmail]/Spam" etc). */
function decodeUtf7(s) {
  return s.replace(/&([A-Za-z0-9+,]+)-/g, (_, b64) => {
    const bytes = Buffer.from(b64.replace(/,/g, '/'), 'base64');
    let out = '';
    for (let i = 0; i < bytes.length; ) {
      const c = bytes[i];
      if (c < 0x80) {
        out += String.fromCharCode(c);
        i += 1;
      } else if (c & 0x20) {
        out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else {
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
        );
        i += 3;
      }
    }
    return out;
  });
}

const socket = tls.connect({ host: 'imap.gmail.com', port: 993, servername: 'imap.gmail.com' });
socket.setEncoding('utf8');

let buf = '';
let pending = null; // { tag, lines: [], resolve, reject }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

socket.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\r\n')) !== -1) {
    const line = buf.slice(0, idx);
    buf = buf.slice(idx + 2);
    if (!pending) continue;

    // Literal continuation: a line that is not a status/untagged marker.
    if (/^\* /i.test(line)) {
      pending.lines.push(line);
    } else if (/^[A-Z0-9]+ /i.test(line)) {
      const status = line.split(' ')[1] || '';
      const p = pending;
      pending = null;
      if (status === 'OK') p.resolve(p.lines.join('\n'));
      else p.reject(new Error(line));
    } else {
      pending.lines.push(line);
    }
  }
});

function cmd(text) {
  const tag = `A${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`;
  return new Promise((resolve, reject) => {
    pending = { lines: [], resolve, reject };
    socket.write(`${tag} ${text}\r\n`);
  });
}

(async () => {
  await new Promise((res) => socket.once('secureConnect', res));
  await sleep(500);

  await cmd('CAPABILITY');
  await cmd(`LOGIN "${user}" "${pass}"`);
  console.log('IMAP LOGIN OK for', user.replace(/^(.{2}).*(@.*)$/, '$1***$2'), '\n');

  const boxLines = (await cmd('LIST "" "*"')).split('\n');
  const names = [];
  for (const line of boxLines) {
    if (!/^\* LIST/i.test(line)) continue;
    const quoted = line.match(/"([^"]*)"/g) || [];
    if (quoted.length >= 2) names.push(decodeUtf7(quoted[quoted.length - 1].replace(/"/g, '')));
  }
  console.log('Mailboxes:', names.join(' | '), '\n');

  const targets = names.filter((n) => /inbox|spam|trash|r(?!a)c|thư/i.test(n));

  for (const box of targets) {
    console.log(`=== ${box} ===`);
    try {
      const sel = await cmd(`SELECT "${box}"`);
      const total = (sel.match(/(\d+)\s+EXISTS/i) || [])[1] || '?';
      console.log('  messages:', total);

      const search = await cmd('UID SEARCH ALL');
      const uids = (search.match(/\d+/g) || []).slice(-15).reverse();

      for (const uid of uids) {
        const f = await cmd(`UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])`);
        const subj = (f.match(/^Subject:\s*(.*)$/im) || [])[1] || '(no subject)';
        const from = (f.match(/^From:\s*(.*)$/im) || [])[1] || '';
        const date = (f.match(/^Date:\s*(.*)$/im) || [])[1] || '';
        console.log(`  - ${date.slice(0, 31)} | ${from.slice(0, 38)} | ${subj.slice(0, 58)}`);
      }
    } catch (e) {
      console.log('  error:', e.message);
    }
    console.log('');
  }

  socket.end();
  process.exit(0);
})().catch((e) => {
  console.log('ERROR:', e.message);
  socket.end();
  process.exit(1);
});
