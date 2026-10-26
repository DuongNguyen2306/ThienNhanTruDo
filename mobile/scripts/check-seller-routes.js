const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = [...walk('app'), ...walk('src')];

const refs = new Set();
const re = /['"`]([^'"`]*\/\([^)]+\)[^'"`]*)['"`]/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(s))) refs.add(m[1]);
}

// actual on-disk seller routes
const actual = [];
for (const f of walk('app')) {
  const p = f.split(path.sep).join('/');
  const m = p.match(/^app\/\(seller\)\/(.*)\.tsx$/);
  if (!m || m[1].includes('_layout')) continue;
  actual.push('/(seller)/' + m[1]);
}
actual.sort();

console.log('=== seller routes on disk ===');
actual.forEach((r) => console.log('  ' + r));

console.log('\n=== every seller route literal referenced in code ===');
const sellerRefs = [...refs].filter((r) => r.startsWith('/(seller)')).sort();
sellerRefs.forEach((r) => {
  const normalized = r.replace(/\$\{[^}]+\}/g, '[id]').replace(/\[\w+\]/g, '[id]');
  const base = normalized.split('?')[0];
  const ok = actual.some((a) => base === a || base.startsWith(a + '/'));
  console.log('  ' + (ok ? 'OK  ' : 'MISS') + '  ' + r);
});

console.log('\nseller refs total: ' + sellerRefs.length);
