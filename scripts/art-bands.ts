// Re-measures the Napoleonic figures' ink profiles (FIGURE_BANDS in src/art/nap/slots.ts) after a drawing change.
// With a dev server running, it opens #/gallery/figures/bands in headless Chrome (the page rasterises every figure at 4 px per
// unit and prints the bands as JSON), then prints them, or with --write rewrites FIGURE_BANDS and ICON_BOX in slots.ts.
// Usage: npx vite-node scripts/art-bands.ts -- [--port 5173] [--write]      (CHROME=<path> overrides the browser)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv;
const port = argv.includes('--port') ? argv[argv.indexOf('--port') + 1] : '5173';
const write = argv.includes('--write');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

type Band = [number, number, number, number];
const html = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', `http://localhost:${port}/#/gallery/figures/bands`], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20,
});
const m = /<pre id="bands"[^>]*>([^<]*)<\/pre>/.exec(html);
if (!m || !m[1].startsWith('{')) {
  console.error(`no bands on the page: ${m ? m[1].slice(0, 200) : 'page did not render (is the dev server up on this port?)'}`);
  process.exit(1);
}
const bands = JSON.parse(m[1]) as Record<string, Band[]>;

const box = (keys: string[]): Band => {
  const rows = keys.flatMap((k) => bands[k]);
  return [Math.min(...rows.map((r) => r[0])), Math.max(...rows.map((r) => r[1])), Math.min(...rows.map((r) => r[2])), Math.max(...rows.map((r) => r[3]))];
};
const fmt = (r: readonly number[]) => `[${r.join(', ')}]`;
const table = Object.entries(bands).map(([k, rows]) => {
  const lines = [];
  for (let i = 0; i < rows.length; i += 5) lines.push(`    ${rows.slice(i, i + 5).map(fmt).join(', ')},`);
  return `  ${k}: [\n${lines.join('\n')}\n  ],`;
}).join('\n');
for (const [k, rows] of Object.entries(bands)) console.log(`${k}: ${rows.length} bands, box ${fmt(box([k]))}`);

if (write) {
  const path = new URL('../src/art/nap/slots.ts', import.meta.url);
  let src = readFileSync(path, 'utf8');
  const before = src;
  src = src.replace(/(export const FIGURE_BANDS: Record<BandKey, readonly Rect\[\]> = \{\n)[\s\S]*?(\n\};)/, `$1${table}$2`);
  src = src.replace(/( {2}foot: )\[[^\]]*\](,\n {2}horse: )\[[^\]]*\](,\n {2}gun: )\[[^\]]*\](,)/, `$1${fmt(box(['close', 'loose']))}$2${fmt(box(['horse']))}$3${fmt(box(['gun']))}$4`);
  if (src === before) console.log('slots.ts unchanged');
  else { writeFileSync(path, src); console.log('slots.ts rewritten'); }
}
