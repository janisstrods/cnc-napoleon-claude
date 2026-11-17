// Build the scenario files: design/data/<id>.json + META[id] -> src/scenarios/data/<id>.json (convert.ts, formatScenario).
// Run: npx vite-node scripts/scenarios/build.ts [-- --check] [-- --ids 001,006]
//   --check      write nothing; print each missing or stale output path and exit 1 if there is any
//   --ids a,b    only these ids (default: every id of META)
// Never hand-edit the output: change design/data/<id>.json or the battle's meta and rerun.
import { readFileSync, writeFileSync } from 'node:fs';
import { catalogueEntry } from '../../src/scenarios/catalogue';
import { convertBattle, formatScenario, type RawBattle } from './convert';
import { META } from './meta';

const args = process.argv.slice(2).filter((a) => a !== '--');
const check = args.includes('--check');
const at = args.indexOf('--ids');
const idList = at >= 0 ? args[at + 1] : undefined;
if (at >= 0 && (!idList || idList.startsWith('--'))) throw new Error('--ids needs a comma-separated list, e.g. --ids 001,006');
const stray = args.filter((a, i) => a !== '--check' && a !== '--ids' && i !== at + 1);
if (stray.length > 0) throw new Error(`unknown argument ${stray.join(' ')} (use --check, --ids a,b)`);
const ids = idList ? idList.split(',') : Object.keys(META);

const read = (p: URL): string | undefined => {
  try { return readFileSync(p, 'utf8'); } catch { return undefined; }
};

for (const id of ids) {
  const meta = META[id];
  const entry = catalogueEntry(id);
  if (!meta || !entry) throw new Error(`no meta or catalogue entry for ${id}`);
  const raw = JSON.parse(readFileSync(new URL(`../../design/data/${id}.json`, import.meta.url), 'utf8')) as RawBattle;
  const text = formatScenario(convertBattle(raw, meta, entry));
  const out = new URL(`../../src/scenarios/data/${id}.json`, import.meta.url);
  if (check) {
    const have = read(out);
    if (have !== text) {
      console.log(`${have === undefined ? 'missing' : 'stale'}: src/scenarios/data/${id}.json`);
      process.exitCode = 1;
    }
  } else {
    writeFileSync(out, text);
    console.log(`wrote src/scenarios/data/${id}.json`);
  }
}
