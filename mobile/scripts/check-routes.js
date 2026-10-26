/**
 * Dumps the Expo Router route tree and checks how the paths that exist in
 * BOTH the `(tenant)` and `(seller)` groups resolve.
 *
 * Run with: node scripts/check-routes.js
 */
const fs = require('fs');
const path = require('path');

const { getRoutes } = require('expo-router/build/getRoutes');
const { getNavigationConfig } = require('expo-router/build/getLinkingConfig');
const { getStateFromPath } = require('expo-router/build/fork/getStateFromPath');

const APP_DIR = path.join(__dirname, '..', 'app');

function collect(dir, prefix = '') {
  const keys = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      keys.push(...collect(full, rel));
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      keys.push(rel);
    }
  }
  return keys;
}

const keys = collect(APP_DIR);

const contextModule = (key) => ({
  default: function Route() {
    return null;
  },
  __routeName: key,
});
contextModule.keys = () => keys.map((k) => `.${k}`);

const routes = getRoutes(contextModule, { platform: 'android' });

function dump(node, depth = 0) {
  const pad = '  '.repeat(depth);
  console.log(`${pad}${node.type}: ${JSON.stringify(node.route)}  [${node.contextKey}]`);
  for (const child of node.children) dump(child, depth + 1);
}

console.log('=== route tree ===');
dump(routes);

const config = getNavigationConfig(routes, false, {});

console.log('\n=== path resolution ===');
for (const p of [
  '/',
  '/lich-hen',
  '/tai-khoan',
  '/trang-chu',
  '/tong-quan',
  '/(tenant)/(tabs)/trang-chu',
  '/(tenant)/(tabs)/tim-phong',
  '/(tenant)/(tabs)/da-luu',
  '/(tenant)/(tabs)/lich-hen',
  '/(tenant)/(tabs)/tai-khoan',
  '/(tenant)/chi-tiet-phong',
  '/(tenant)/thu-vien',
  '/(tenant)/dat-hen-xem',
  '/(tenant)/dat-hen-thanh-cong',
  '/(tenant)/sua-ho-so',
  '/(tenant)/dang-ky-chu-tro',
  '/(tenant)/ban-do',
  '/(seller)/lich-hen',
  '/(seller)/tai-khoan',
]) {
  try {
    const state = getStateFromPath(p, config);
    const names = [];
    let s = state;
    while (s) {
      const r = s.routes?.[0];
      names.push(r?.name ?? (r?.state ? 'layout' : '?'));
      s = r?.state;
    }
    console.log(p.padEnd(24), '->', names.join(' > '));
  } catch (e) {
    console.log(p.padEnd(24), '-> ERROR:', e.message);
  }
}
