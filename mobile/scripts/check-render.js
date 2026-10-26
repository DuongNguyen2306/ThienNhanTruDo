/**
 * Fetches the sign-in screen from the running dev server and asserts that
 * the theme, the font and the shell are actually in the rendered output.
 *
 * The rendered HTML is normalised first:
 *   - React Native Web converts every colour to `rgba(r,g,b,a)`
 *   - React escapes non-ASCII text as numeric HTML entities
 *
 * IMPORTANT: this is the *server-rendered* shell. The sign-in form itself
 * only appears after the client-side bundle has hydrated, because the
 * `(auth)` layout waits for the async session check before rendering the
 * stack. So this script asserts the loading shell, the theme tokens and the
 * font — the checks that are meaningful at this layer. The visible copy
 * ("THIÊN NHÃN TRÚ ĐỒ", "Đăng nhập", …) is asserted by
 * `check-render-browser.js`, which runs a real headless Chrome.
 *
 * Usage: node scripts/check-render.js [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:8099';

/** Decode the numeric HTML entities React emits for non-ASCII characters. */
function decodeEntities(input) {
  return input.replace(/&#x?([0-9A-Fa-f]+);/g, (_, code) =>
    String.fromCodePoint(parseInt(code, code.startsWith('x') ? 16 : 10)),
  );
}

/** The theme colours, expressed as the `rgba()` React Native Web emits. */
const rgba = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},`;
};

const CHECKS = [
  // The pre-hydration shell shown while the session is being validated.
  ['session loading state', 'Đang kiểm tra phiên đăng nhập'],
  // Theme tokens that must reach the client bundle.
  ['primary yellow', rgba('#FDE047')],
  ['ink black', rgba('#151515')],
  ['warm off-white', rgba('#F5F5F0')],
  ['font family', 'BeVietnamPro'],
];

async function main() {
  const res = await fetch(`${BASE}/dang-nhap`, {
    headers: { 'expo-platform': 'web' },
  });

  const raw = await res.text();
  const html = decodeEntities(raw);

  console.log(`GET /dang-nhap -> ${res.status} (${raw.length} bytes)\n`);

  let failures = 0;
  for (const [name, needle] of CHECKS) {
    const found = html.includes(needle);
    if (!found) failures += 1;
    console.log(`${found ? 'PASS' : 'FAIL'}  ${name.padEnd(22)} ${needle}`);
  }

  console.log(
    `\nNote: the visible sign-in copy is asserted by scripts/check-render-browser.js.`,
  );
  console.log(
    `${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
