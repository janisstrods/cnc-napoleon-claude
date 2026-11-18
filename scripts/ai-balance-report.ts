// Summarise ai-balance.ts JSON results as markdown: a table per battle (games, wins by side with the army names, the bottom side's win
// rate with its 95 % Wilson interval, banners, turns, nodes, flag) and the counter totals.
// Usage: npx vite-node scripts/ai-balance-report.ts -- run-0.json run-1.json ... [--flag 0.85]
import { readFileSync } from 'node:fs';
import { balanceReport, type GameRow } from './lib';

const args = process.argv.slice(2).filter((a) => a !== '--');
const fi = args.indexOf('--flag');
const flagAt = fi >= 0 ? Number(args[fi + 1]) : 0.85;
const files = args.filter((a, i) => a.endsWith('.json') && (fi < 0 || i !== fi + 1));
if (files.length === 0) {
  console.error('Usage: ai-balance-report.ts -- run-*.json [--flag 0.85]');
  process.exit(1);
}
console.log(balanceReport(files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as GameRow[]), flagAt));
