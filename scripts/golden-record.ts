// Regenerates the golden fixtures (re-record only after a deliberate engine change; see CLAUDE.md "Golden fixtures").
//   npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json
//   npx vite-node scripts/golden-record.ts -- --save > tests/golden/save-fixture.json
import { goldenGames, makeSaveFixture } from '../tests/golden/record';

const out = process.argv.includes('--save') ? makeSaveFixture() : goldenGames();
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
