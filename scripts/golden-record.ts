// Regenerates golden fixtures (none are recorded now: Plan 2A deleted the Ancients ones; golden.test.ts self-replays 000).
// Prints the golden-game list (JSON) to stdout:  npx vite-node scripts/golden-record.ts
import { goldenGames } from '../tests/golden/record';

process.stdout.write(JSON.stringify(goldenGames(), null, 1) + '\n');
