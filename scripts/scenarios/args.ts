// Command line of build.ts as a pure function (so tests can import it without running the CLI).
export interface BuildArgs { check: boolean; ids: string[] | undefined }

export function parseArgs(argv: readonly string[]): BuildArgs {
  const args = argv.filter((a) => a !== '--');
  let check = false;
  let ids: string[] | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--check') check = true;
    else if (a === '--ids') {
      const list = args[++i];
      if (!list || list.startsWith('--')) throw new Error('--ids needs a comma-separated list, e.g. --ids 001,006');
      ids = list.split(',');
    } else throw new Error(`unknown argument ${a} (use --check, --ids a,b)`);
  }
  return { check, ids };
}
