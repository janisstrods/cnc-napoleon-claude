# C&C: Napoleonics — Plan 8: Release v1.0.0 "Talavera" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the first release, v1.0.0 "Talavera" (the base game 001–015 and Expansion #1 *The Spanish Army* 101–118), as a static site on GitHub Pages at https://strods.work/cnc-napoleon-claude/, from the repo `janisstrods/cnc-napoleon-claude`.

**Architecture:** Phase 9 of the spec ("golden replays, full review, release"). Two parallel source tasks (golden replays; release copy and identity) land first. Then main is frozen, audited end to end, built into `docs/`, smoke-tested as served static files under the sub-path, and committed. The first push is a controller step taken only after the user's explicit go-ahead; the controller then switches Pages on through `gh api` (legacy build from `main` `/docs`, exactly as `cnc-claude`) and checks the live site. Ancients (`/Users/janisstrods/Gamemaking/cnc-ancients`, `janisstrods/cnc-claude`, v1.6.2) is the precedent for every publishing choice and is only read.

**Tech Stack:** TypeScript 5.6, React 18, Vite 5 (`base: './'`, `outDir: 'docs'`), Vitest 2, `vite-node` scripts, the Browser pane against `vite preview`, `gh` CLI (logged in as `janisstrods`), git over HTTPS with the keychain credential.

**Spec:** `design/superpowers/specs/2026-11-17-cnc-napoleonics-design.md` (Publishing, Anti-goals "Clashing with Ancients in the browser", Constraints, "Release names", phase 9). Roadmap row: Plan 1, `| 8 Release | 9: golden replays, full review, first publish |`. Conventions: `CLAUDE.md` (Publishing), Ancients `README.md`, `src/version.ts`, `tests/golden/`.

**Starts after:** Plan 4 Task 11 (full-flow acceptance), Plan 5 Task 11 (balance runs, calibration) and Plan 7C Task 21 (Spanish acceptance and docs) have merged into `main`, together with every other task of Plans 4, 5 and 7C. Tasks 1 and 2 may start as soon as those three merge; Task 3 also needs Tasks 1 and 2 merged.

**Ledger:** `.superpowers/sdd/2026-11-18-plan-8-release/progress.md` (untracked, like every SDD ledger).

## Rulings (made by the planner; the controller need not ask)

| # | Question | Ruling |
|---|---|---|
| P8-1 | Release name | **"Talavera"**, battle 005 (the name `SCENARIOS` carries, so `tests/ui/version.test.ts` accepts it). The one battle that appears in both boxes (005 and 109 *Talavera (Spanish Flank)*) and where the British and Spanish armies fought side by side, for the release that brings the two boxes together. Never reused. |
| P8-2 | Version number | **1.0.0**, replacing the `0.1.0` "Unreleased" row (never published), as Ancients' first release was `1.0.0` "Cannae". `RELEASES` then holds one row. |
| P8-3 | Repo and URL | `janisstrods/cnc-napoleon-claude` → https://strods.work/cnc-napoleon-claude/ (the spec's proposed `cnc-napoleonics` was superseded when the user had the repo created). `CLAUDE.md`, the README and the `pages-preview` launch config change to it. The local folder stays `cnc-napoleonics`. |
| P8-4 | Dev routes and galleries in production | **Follow Ancients:** `#/play/...` and `#/gallery/*` ship as unlinked hash routes, the galleries as lazy chunks; only `window.__ccn` is dev-only (`import.meta.env.DEV`). No code change. The audit checks that `__ccn` is absent from the bundle and that the five galleries are separate chunks. |
| P8-5 | Cache busting, service worker | **Follow Ancients:** none beyond Vite's content-hashed asset names. No service worker, no manifest. Pages serves `index.html` with a short cache, so live checks add `?v=1.0.0` before the hash. |
| P8-6 | Commits of the release | Ancients' pair: `Release v1.0.0 "Talavera": …` (source, Task 2) and `Publish v1.0.0 "Talavera": build docs/` (build output and the `.gitignore` line, Task 4). No tag, no repo homepage change (Ancients has neither). |
| P8-7 | Main freeze | From the start of Task 3 until the push, nothing else merges into `main`. Any merge in that window invalidates the audit: Task 3 runs again from Step 1. |
| P8-8 | Audit failures | Task 3 fixes nothing. A red check stops the plan; the controller dispatches a fix in the owning plan's style (Sonnet implements, Opus reviews), merges it, and re-runs Task 3. The wall-clock speed budgets (`npm run test:perf`) assert only on a quiet machine (1-minute load average under 4); otherwise the audit records the load and marks them "not asserted", which does not block. |
| P8-9 | Pushes | Only the controller pushes, only `main`, only after the user's explicit yes in chat (Task 5). The go-ahead covers the first push and switching Pages on. Task 6's local commit is not pushed by this plan: it rides with the next publish unless the user's go-ahead named it. Agents never push, never use `--force`, `--all` or `--tags`. |
| P8-10 | `.superpowers/` | Stays untracked and is never pushed (Ancients does not track it either). Path-limited commits keep it out. |
| P8-11 | Golden fixtures | Random-play games for every battle (000, 001–015, 101–118) and four deterministic AI games, plus one save fixture, as in Ancients. The digest gains `special` so the Spanish play state (Guerrilla counters, Move First) is pinned. After a deliberate engine change: re-record with `scripts/golden-record.ts` and say so in the commit, like the art hash pins. |

## Global Constraints

- Never modify anything under `/Users/janisstrods/Gamemaking/cnc-ancients` (read-only precedent).
- No GitHub Actions: nothing under `.github/workflows/` (the push token lacks the `workflow` scope). Pages is the legacy build from `main` `/docs`.
- localStorage only through `storageKey(name)` from `src/ui/storage.ts` (prefix `ccn-`; Ancients on the same `strods.work` origin uses `cca-`).
- British spelling; original prose and art; any quotation under 15 words.
- House title "Commands & Colours: Napoleonics"; GMT's spelling "Commands & Colors" appears only in disclaimers (the in-game credits' first paragraph, the README's Disclaimer section, `CREDITS.md`'s closing paragraph).
- Commits are path-limited (`git add <paths>`) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No agent pushes (ruling P8-9).
- `docs/` is generated build output: never hand-edited, never holds notes. `docs/.nojekyll` comes from `public/.nojekyll` and stays.
- `vite.config.ts` keeps `base: './'` and hash routes; no absolute asset paths (`/assets/...`).
- Browser checks are silent: on each origin run `localStorage.setItem('ccn-muted','1'); location.reload()` before playing. Servers: start with the launch config or `npx vite … --port <N> --strictPort` in the background; stop only with `pkill -f 'vite.*--port <N>'`, never a pid from `lsof`. Ports: Task 2 dev 5251; Task 4 preview 4173 (`pages-preview`). Screenshots go to `/Users/janisstrods/Gamemaking/cnc-napoleonics-research/ui-shots/p8/` (never committed); the implementer opens each and says what it shows.
- Never `npm install` in a worktree (`node_modules` is a symlink). No new dependencies.
- Models: Sonnet implements Tasks 1–4; Opus reviews each; Tasks 5–6 are controller (Opus) steps.
- Worktrees: Task 1 `.worktrees/p8-1`, Task 2 `.worktrees/p8-2`; Tasks 3–6 run on `main` itself.

## Review Focus

1. **The site under the sub-path:** opening https://strods.work/cnc-napoleon-claude/ (and reloading on a deep hash such as `#/gallery/art`) must load every chunk, the AI worker, the fonts and the medal art with no 404, since the dev server never exercises `base: './'`. Pinned in Task 4 Step 5 (served under `/cnc-napoleon-claude/`, network list checked) and Task 5 Step 7 (live).
2. **A browser that already holds Ancients data on `strods.work`:** the new game must neither read nor change `cca-*` keys (no "Continue" offered from an Ancients save, no Ancients medals counted), and must write only `ccn-*` keys. Pinned in Task 2 (the storage guard tests) and Task 4 Step 6 (seeded `cca-*` keys unchanged after play).
3. **The production bundle has no dev hook:** `window.__ccn` and `autoAnswer` exist only in dev, so a smoke test that relies on them would pass in dev and prove nothing about production. Pinned in Task 3 Step 6 (bundle grep) and Task 4 (every play step by clicks; `window.__ccn === undefined` checked).
4. **A first visit with empty storage:** menu with no Continue, Triumphs showing 0 of 33 battles won, sound off only after the mute flag. Pinned in Task 4 Step 4 (fresh preview origin, checked before anything is played).
5. **A stale `index.html` after publishing:** Pages may serve a cached page for some minutes, pointing at old or missing chunk names. Pinned in Task 5 Step 6 (the live `index.html` names the same entry chunk as the committed `docs/index.html`, fetched with `?v=1.0.0`).

---

### Task 1: Golden replays and the save fixture

**Model:** Sonnet. **Lane:** `.worktrees/p8-1`. **Starts:** the Starts-after merges.

**Files:**
- Modify: `tests/golden/record.ts`, `tests/golden/golden.test.ts`, `scripts/golden-record.ts`, `CLAUDE.md` (the "Golden fixtures" section only)
- Create: `tests/golden/fixtures.json`, `tests/golden/save-fixture.json`, `tests/golden/golden-ai.slow.test.ts`

**Interfaces:**
- Consumes: `playBattle(id, { seed, budgetScale, record: true })` and `SoakResult.events` from `tests/ai/soak.ts`; `randomAnswer`, `GameDriver`, `createGame` from `src/engine`; `mulberry32` from `tests/support/rng.ts`.
- Produces (in `tests/golden/record.ts`): `RANDOM_GAMES: [string, number][]`, `AI_GAMES: [string, number][]`, `randomGolden(): Golden[]`, `aiGolden(): Golden[]`, `goldenGames(): Golden[]` (random then AI), `makeSaveFixture(): SaveFixture` with `SaveFixture = { scenarioId: string; seed: number; rngCalls: number; stateHash: string; answers: Answer[] }`; `digest(s)` now includes `special: s.special`.

- [ ] **Step 1: Write the failing tests** (Ancients `tests/golden/golden.test.ts` is the pattern; keep the existing 000 self-replay test)

```ts
// tests/golden/golden.test.ts
it('replays every recorded random game with identical events', () => {
  const now = randomGolden();
  const rec = (fixtures as Golden[]).filter((f) => f.id.startsWith('rnd-'));
  expect(now.map((g) => g.id)).toEqual(rec.map((f) => f.id)); // nothing dropped or stale
  for (const g of now) expect(g, g.id).toEqual(rec.find((f) => f.id === g.id));
}, 300_000);
it('records a random game for every battle, 000 and 001–015 and 101–118', () => {
  expect(RANDOM_GAMES.map(([id]) => id)).toEqual(SCENARIOS.map((s) => s.id).sort()); // 34 ids, '000' first
});
it('rebuilds the recorded save by replaying its answers', () => {
  // as Ancients: answers length 60; GameDriver.replay(createGame(setup, seed), answers); pending not null;
  // digest(d.state).rngCalls === rngCalls; fnv(JSON.stringify(digest)) hex === stateHash
});
// tests/golden/golden-ai.slow.test.ts
it('replays every recorded AI game with identical events', () => { /* aiGolden() against the 'ai-' fixtures, same checks */ }, 300_000);
```

- [ ] **Step 2: Run** `npx vitest run tests/golden` — Expected: FAIL (no `fixtures.json`, no `randomGolden`).

- [ ] **Step 3: Implement in `tests/golden/record.ts`.** `RANDOM_GAMES`: `['000', 11]`, then each battle id with seed `10 + n` for base `00n` (001 → 11 … 015 → 25) and `110 + (n - 100)` for Spanish (101 → 111 … 118 → 128). `AI_GAMES`: `[['005', 31], ['010', 32], ['101', 33], ['116', 34]]`; `aiGame` calls `playBattle(id, { seed, budgetScale: 0.05, record: true })` and hashes its `events` strings then `digest(d.state)` with `fnv` (ids `ai-<id>-<seed>`). `makeSaveFixture()`: battle `116`, seed 17, the first 60 answers of random play with `mulberry32(17)`, then `rngCalls` and `stateHash` of that position. `scripts/golden-record.ts` prints `goldenGames()` as JSON, or `makeSaveFixture()` with `-- --save`.

- [ ] **Step 4: Record** `npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json` and `npx vite-node scripts/golden-record.ts -- --save > tests/golden/save-fixture.json`. Run the recorder twice and `diff` the outputs — Expected: identical (determinism); every fixture has `winner` `top` or `bottom` (a `null` winner is a stalled game: report it with its id, do not drop it).

- [ ] **Step 5: Run** `npx vitest run tests/golden && npm run typecheck` — Expected: PASS, clean. Note the golden-ai file's time (target under 60 s; a longer run is reported, not hidden).

- [ ] **Step 6: Update `CLAUDE.md` "Golden fixtures"** to: what is recorded (the random game list, the four AI games, the 116 save), the two commands of Step 4, and the rule of P8-11 (re-record only after a deliberate engine change, and say so in the commit).

- [ ] **Step 7: Commit**

```bash
git add tests/golden/record.ts tests/golden/golden.test.ts tests/golden/golden-ai.slow.test.ts tests/golden/fixtures.json tests/golden/save-fixture.json scripts/golden-record.ts CLAUDE.md
git commit -m "test(golden): record golden replays of every battle and a save fixture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Release copy, version and identity

**Model:** Sonnet. **Lane:** `.worktrees/p8-2` (dev server port 5251). **Starts:** the Starts-after merges (parallel with Task 1; disjoint files except separate `CLAUDE.md` sections).

**Files:**
- Modify: `src/version.ts`, `package.json`, `package-lock.json`, `tests/ui/version.test.ts`, `tests/ui/identity.test.ts`, `src/ui/screens/Menus.tsx` (`CreditsText` only), `CREDITS.md`, `README.md`, `CLAUDE.md` (the "Publishing (GitHub Pages)" section only), `.claude/launch.json`

**Interfaces:**
- Consumes: `RELEASES`, `RELEASE`, `buildLabel` (`src/version.ts`); `CreditsText` (`src/ui/screens/Menus.tsx`); `storageKey`, `STORAGE_PREFIX`, `storage` (`src/ui/storage.ts`); `loadRecord` (`src/ui/record.ts`), `loadSaved` (`src/ui/game/controller.ts`); `stubStorage`, `useStubStorageCleanup` (`tests/support/storage.ts`).
- Produces: `RELEASE` = `{ number: '1.0.0', name: 'Talavera', notes }` for Task 4's smoke test and Task 5's live check.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/ui/version.test.ts: delete the line `if (r.name === 'Unreleased') continue;` and add
it('the first release is v1.0.0 "Talavera"', () => {
  expect(RELEASES[RELEASES.length - 1]).toMatchObject({ number: '1.0.0', name: 'Talavera' });
});

// tests/ui/identity.test.ts
it('touches browser storage only in src/ui/storage.ts', () => {
  // no file but src/ui/storage.ts matches /\b(localStorage|sessionStorage|indexedDB)\b/
});
it('never passes a string literal key to storage', () => {
  // no source matches /storage\.(get|set|remove)\(\s*['"`]/
});
it('ignores Ancients data on the same origin and leaves it untouched', () => {
  const m = stubStorage();
  const cca = { 'cca-autosave-v1': '{"scenarioId":"007","seed":1,"answers":[]}', 'cca-record-v1': '{"007":{"top":{"recruit":{"won":1,"lost":0,"draw":0}}}}', 'cca-muted': '0' };
  for (const [k, v] of Object.entries(cca)) m.set(k, v);
  expect(loadSaved()).toBeNull();
  expect(loadRecord()).toEqual({});
  for (const [k, v] of Object.entries(cca)) expect(m.get(k)).toBe(v);
});
it('credits both boxes and keeps GMT\'s spelling to the disclaimer', () => {
  const html = renderToStaticMarkup(createElement(CreditsText));
  expect(html).toContain('The Spanish Army');
  expect(html).not.toMatch(/to come/);
  const paras = html.split('</p>');
  expect(paras.filter((p) => p.includes('Commands &amp; Colors')).length).toBe(1); // the disclaimer paragraph only
});
```

- [ ] **Step 2: Run** `npx vitest run tests/ui/version.test.ts tests/ui/identity.test.ts` — Expected: FAIL on "Unreleased", the first-release test and the credits test (the storage tests should already pass; if one fails, that is a real leak: fix the source and say so in the report).

- [ ] **Step 3: Release row.** `src/version.ts`: `RELEASES` becomes the single row `{ number: '1.0.0', name: 'Talavera', notes: 'The base game (battles 001–015) and Expansion #1, The Spanish Army (battles 101–118), against a computer general at three levels, with original miniatures, the history of every battle, Triumphs medals and the rules in the game' }`. Then `npm version 1.0.0 --no-git-tag-version` (sets `package.json` and both version fields of `package-lock.json`; check `git diff package-lock.json` shows only those two lines).

- [ ] **Step 4: Credits copy.** `CreditsText`: the second paragraph says the setups follow the 15 battles of the base game and the 18 of Expansion #1, *The Spanish Army*, transcribed hex by hex from the battle maps published at commandsandcolors.net; the disclaimer paragraph adds that Expansion #1, *The Spanish Army*, is also a GMT Games product. `CREDITS.md` "Scenarios": the same facts (101–118 from the same site's maps and scenario pages, per `design/exp1-survey.md`), no "is to come".

- [ ] **Step 5: README** (Ancients' `README.md` is the model for order and tone; every fact is checked against this code or the dev server on port 5251, not copied from Ancients). Sections, in order:
  1. `# Commands & Colours: Napoleonics`, one paragraph: a fully playable, unofficial browser edition of Richard Borg's board game of the Napoleonic Wars, published by GMT Games: 33 battles against a computer general, the 15 of the base game (Roliça 1808 to Waterloo 1815) and the 18 of Expansion #1, *The Spanish Army* (Bailén to Ordal Cross).
  2. `## Play it`: https://strods.work/cnc-napoleon-claude/ (no install; saves and medals stay in the browser).
  3. `## Buy the board game`: this edition is no substitute for the real thing; link GMT's product pages for *Commands & Colors: Napoleonics* and Expansion #1 *The Spanish Army*. Each deep link is used only if `curl -sL -o /dev/null -w '%{http_code}' <url>` prints 200 and the page names the product; otherwise link https://www.gmtgames.com/. (GMT's spelling is allowed here only inside the product names as link text.)
  4. `## Playing`: New Battle (the picker's tab names as the UI shows them), army, opponent level (Captain, Colonel, Marshal); a turn (card, orders, move, fire and melee, squares, Retire and Reform, Combined Arms, as the prompts name them); banners win; autosave and Continue; History, Rules, Triumphs; keys (as `src/ui` binds them).
  5. `## Expansion #1: The Spanish Army`: what 101–118 add (Spanish, Swiss and new French units; Guerrilla Action; new terrain and water; battle rules such as Bailén's Swiss, Medellín's shrinking hand, Vitoria's Move First), from RR §15–§16 and `src/scenarios/texts.ts`.
  6. `## The computer general`: Web Worker, plays through the real rules with fresh dice, never sees hidden cards; the three levels in a table; commander temperaments (names from `src/ai`).
  7. `## Run it locally`: `npm install`, `npm run dev` (http://localhost:5173), and the `build` / `test` / `typecheck` table.
  8. `## Project layout` (as Ancients, with `src/history`, `design/`, `docs/` generated).
  9. `## Credits`: original art and prose, fonts IM Fell English SC and EB Garamond (SIL OFL 1.1), icons game-icons.net (CC BY 3.0), map transcriptions from commandsandcolors.net; see `CREDITS.md`.
  10. `## Disclaimer`: unofficial fan edition, not affiliated with or endorsed by GMT Games; *Commands & Colors* is a trademark of GMT Games LLC; *Commands & Colors: Napoleonics* and Expansion #1 *The Spanish Army* are GMT Games products designed by Richard Borg; rules are paraphrased, card texts are summaries, all artwork is original.

- [ ] **Step 6: Publishing facts.** `CLAUDE.md` "Publishing": repo https://github.com/janisstrods/cnc-napoleon-claude, live https://strods.work/cnc-napoleon-claude/; `docs/` is committed from v1.0.0 on and Pages serves `main` `/docs` (legacy build, switched on with `gh api`); `gh` is logged in (still no Actions); the sub-path wording and the `pages-preview` URL use `/cnc-napoleon-claude/`; drop "Pages stays off and `docs/` is git-ignored until the first release" and the `Unreleased` sentence. `.claude/launch.json` `pages-preview`: `--base /cnc-napoleon-claude/`.

- [ ] **Step 7: Check** `npx vitest run tests/ui && npm run typecheck` — Expected: PASS, clean. `grep -rn "Commands & Colors\|Commands &amp; Colors" src README.md CREDITS.md` — Expected: only the disclaimer lines of Steps 4–5 and the README product link texts. `grep -rn "to come\|cnc-napoleonics/" src README.md CREDITS.md CLAUDE.md .claude` — Expected: no hits. Open http://localhost:5251/ (muted) and screenshot the menu corner (`v1.0.0 “Talavera”`, `dev build`) and the Credits dialog.

- [ ] **Step 8: Commit**

```bash
git add src/version.ts package.json package-lock.json tests/ui/version.test.ts tests/ui/identity.test.ts src/ui/screens/Menus.tsx CREDITS.md README.md CLAUDE.md .claude/launch.json
git commit -m "Release v1.0.0 \"Talavera\": the base game and The Spanish Army

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pre-release audit

**Model:** Sonnet runs it; Opus reviews the evidence. **Lane:** `main` (frozen, ruling P8-7). **Starts:** Tasks 1 and 2 merged; no other agent mid-merge. Changes no tracked file (ruling P8-8).

**Files:**
- Create: `.superpowers/sdd/2026-11-18-plan-8-release/audit.md` (untracked; each step's command, the exit status, the key output lines and the time)

**Interfaces:**
- Consumes: the merged `main`. Produces: the audited commit SHA (`git rev-parse HEAD`), recorded in `audit.md`; Task 4 builds that exact commit.

- [ ] **Step 1: Clean tree.** `git status --short` — Expected: only `?? .superpowers/`. `git ls-files .github` — Expected: empty. Record `git rev-parse HEAD` and `uptime`.

- [ ] **Step 2: Data and types.** `npx vite-node scripts/scenarios/build.ts -- --check && npm run typecheck && npx vite-node scripts/history-check.ts` — Expected: clean; the history check lists all 33 battles with no validator error.

- [ ] **Step 3: Full suite** `npm test` — Expected: every file passes, including the slow suites (`tests/ai/*.slow.test.ts`, `tests/ui/full-games*.slow.test.ts`, `tests/golden/golden-ai.slow.test.ts`); record the test count and duration.

- [ ] **Step 4: The deterministic AI soaks, named** `npx vitest run tests/ai/battles-a.slow.test.ts tests/ai/battles-b.slow.test.ts tests/ai/battles-exp1.slow.test.ts tests/ai/determinism.slow.test.ts --reporter=verbose` — Expected: a passing line for each of 001–015 and 101–118 (33 battles: count them in the output) plus the determinism cases.

- [ ] **Step 5: Speed budgets.** If the 1-minute load average is under 4: `npm run test:perf` — Expected: PASS. Otherwise record the load and "not asserted" (ruling P8-8).

- [ ] **Step 6: Production bundle** `npm run build` — Expected: clean. Then, each with its expected result:
  - `grep -l "__ccn" docs/assets/*.js` → no output (dev hook absent);
  - `ls docs/assets/*.map 2>/dev/null` → no output (no source maps);
  - `grep -E '(src|href)="/' docs/index.html` → no output (relative paths only);
  - `test -f docs/.nojekyll && echo ok` → `ok`;
  - `ls docs/assets | grep -cE '^(Art|Terrain|Kit|History|Figure)Gallery-'` → `5` (galleries are lazy chunks, ruling P8-4);
  - `grep -l "Talavera" docs/assets/index-*.js` → the entry chunk (the release label is in it);
  - `du -sh docs` → recorded.

- [ ] **Step 7: Report** to the controller: PASS (every step green, the SHA) or the first failure with its output. On PASS the controller ticks Task 3 and dispatches Task 4 on the same SHA.

---

### Task 4: Build into docs/, static smoke test, commit

**Model:** Sonnet. **Lane:** `main` at the audited SHA (`git rev-parse HEAD` must equal Task 3's). **Preview:** launch config `pages-preview` → http://localhost:4173/cnc-napoleon-claude/.

**Files:**
- Modify: `.gitignore` (remove the two-line `docs/` block: the comment and `docs/`)
- Create: `docs/` (generated by `npm run build`; committed whole)

**Interfaces:**
- Consumes: `RELEASE` (Task 2), the audited SHA (Task 3). Produces: the `Publish` commit Task 5 pushes, and the entry chunk name in `docs/index.html` that Task 5 compares with the live page.

- [ ] **Step 1: Unignore** — edit `.gitignore` as above. `git status --short docs | head -3` — Expected: `docs/` now shows as untracked.

- [ ] **Step 2: Fresh build** `rm -rf docs && npm run build` — Expected: clean; `docs/index.html`, `docs/assets/`, `docs/.nojekyll` exist.

- [ ] **Step 3: Serve** start `pages-preview`. Open http://localhost:4173/cnc-napoleon-claude/ in a fresh Browser pane tab.

- [ ] **Step 4: First visit, before anything else** — Expected: the main menu, no Continue button; the corner reads `v1.0.0 “Talavera”` and `build <date> <time> UTC` (not `dev build`); `window.__ccn === undefined`; Triumphs reports no battle won of 33; Credits names *The Spanish Army*. Screenshot.

- [ ] **Step 5: Mute and seed Ancients data.** Run `localStorage.setItem('ccn-muted','1'); localStorage.setItem('cca-record-v1','{"007":{"top":{"recruit":{"won":1,"lost":0,"draw":0}}}}'); localStorage.setItem('cca-autosave-v1','{"scenarioId":"007","seed":1,"answers":[]}'); localStorage.setItem('cca-muted','0'); location.reload()`. Expected: still no Continue, Triumphs unchanged. Then, by clicks only (no dev hook in production), one line each in the report:
  1. **Base battle:** New Battle → the base tab → 005 Talavera as the British against the Captain → briefing → History (all three slides; the map phases animate) → start; play one card through orders, a move and a fire or melee; the general answers within the turn (the worker loads under the sub-path); the log reads as prose.
  2. **Reload:** `location.reload()` → Continue appears and restores the same position.
  3. **Spanish battle:** 101 Bailén as the Spanish → briefing (special rules text) → start; the Guerrilla counters show; play one card.
  4. **Triumphs:** the dialog lists all 33 battles in both boxes.
  5. **Rules:** the dialog opens, with the base tabs and the Spanish tab.
  6. **History** from the top bar during a battle opens the same slides.
  7. **Deep link:** load http://localhost:4173/cnc-napoleon-claude/#/gallery/art directly — Expected: the gallery renders (lazy chunk under the sub-path).
  Screenshot each.

- [ ] **Step 6: Storage and network** — `Object.keys(localStorage).filter(k => !k.startsWith('ccn-'))` → exactly the three `cca-` keys, and their values equal what Step 5 set. The console has no errors (`read_console_messages` with `onlyErrors`), and the network list has no 4xx/5xx response. Stop the preview: `pkill -f 'vite.*--port 4173'`.

- [ ] **Step 7: Commit** (the build of the audited SHA; `git status --short` must show only `.gitignore`, `docs/` and `.superpowers/`)

```bash
git add .gitignore docs
git commit -m "Publish v1.0.0 \"Talavera\": build docs/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Report** the commit SHA, the entry chunk name (`grep -o 'assets/index-[^"]*\.js' docs/index.html`), the file count (`git ls-files docs | wc -l`) and the smoke lines.

---

### Task 5: First push, Pages on, live check (controller)

**Model:** the controller (Opus) itself; no subagent pushes. **Starts:** Task 4 committed and reviewed.

**Files:** none changed.

**Interfaces:**
- Consumes: the `Publish` commit and entry chunk name (Task 4). Produces: the live site at https://strods.work/cnc-napoleon-claude/.

- [ ] **Step 1: Preconditions** — `git status --short` → only `?? .superpowers/`; `git branch --show-current` → `main`; `git ls-remote origin` → empty (nothing pushed yet); `git ls-files .github` → empty; `git log --oneline -1` → the `Publish v1.0.0 "Talavera"` commit; `git rev-list --count main` → N (for the question).

- [ ] **Step 2: Ask the user for the go-ahead before the first push.** In chat, and wait for an explicit yes:
  > v1.0.0 "Talavera" is built, audited and smoke-tested. The go-ahead pushes `main` (N commits, the whole history, with the built `docs/`) to the public repo janisstrods/cnc-napoleon-claude, switches GitHub Pages on from `main` `/docs`, and puts the game live at https://strods.work/cnc-napoleon-claude/. Shall I push?

  Anything but a clear yes: stop here, push nothing, and record "awaiting go-ahead" in the ledger.

- [ ] **Step 3: Push** `git push -u origin main` — Expected: `main -> main`, branch tracking set. Only `main`; never `--force`, `--all` or `--tags`.

- [ ] **Step 4: Pages on** `gh api -X POST repos/janisstrods/cnc-napoleon-claude/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/docs'` — Expected: JSON with `"source":{"branch":"main","path":"/docs"}` and `html_url` `http://strods.work/cnc-napoleon-claude/`. If it answers 409 (already exists), apply the same fields with `-X PUT` and read back with `gh api repos/janisstrods/cnc-napoleon-claude/pages`.

- [ ] **Step 5: Wait for the build** — poll `gh api repos/janisstrods/cnc-napoleon-claude/pages/builds/latest --jq .status` (a Monitor until-loop, up to 10 minutes) until `built`. `errored`: read `.error.message`, stop and report to the user.

- [ ] **Step 6: Live files** — `curl -s -o /dev/null -w '%{http_code}' 'https://strods.work/cnc-napoleon-claude/?v=1.0.0'` → `200`; `curl -s 'https://strods.work/cnc-napoleon-claude/?v=1.0.0' | grep -o 'assets/index-[^"]*\.js'` → the entry chunk name from Task 4; that asset's URL → `200`. Ancients unaffected: `https://strods.work/cnc-claude/` → `200`. If the entry name differs, wait two minutes and retry (cached `index.html`, ruling P8-5) before calling it a failure.

- [ ] **Step 7: Live smoke** in the Browser pane at `https://strods.work/cnc-napoleon-claude/?v=1.0.0`: mute (`ccn-muted`); the menu corner reads `v1.0.0 “Talavera”`; start 005 and play one card; open 101's briefing; no console errors, no failed requests; `Object.keys(localStorage).every(k => k.startsWith('ccn-') || k.startsWith('cca-'))` → `true`. Do not write or remove any `cca-` key on the live origin.

- [ ] **Step 8: Tell the user** the live URL, the repo URL and the release name, and the one-line release note.

---

### Task 6: Post-release ledger and CLAUDE.md (controller)

**Model:** the controller (Opus), or a Sonnet agent it dispatches for the `CLAUDE.md` edit with Opus review. **Starts:** Task 5 done (or Task 5 stopped at Step 2: then only the ledger line "awaiting go-ahead").

**Files:**
- Modify: `CLAUDE.md` (Status and Commands only)
- Untracked: `.superpowers/sdd/2026-11-18-plan-8-release/progress.md`, `.superpowers/CONTROLLER.md`

- [ ] **Step 1: Ledger** — `progress.md`: each task's SHA and review verdict, the audit SHA, the `Publish` SHA, the push time, the Pages build status, the live checks. `CONTROLLER.md`: the Plan 8 row → `COMPLETE: v1.0.0 "Talavera" live at https://strods.work/cnc-napoleon-claude/ (<Publish SHA>)`; the repo is now pushed, so later publishes follow `CLAUDE.md` "Publishing" (each one a release with a new battle name, never reused: Talavera is taken).

- [ ] **Step 2: `CLAUDE.md`** — Status: first line "v1.0.0 "Talavera" released <date>: base 001–015 and Expansion #1 101–118, live at https://strods.work/cnc-napoleon-claude/"; remove any line still describing a plan as pending (for example "the AI is a seeded random stub until Plan 5", "the UI shows generic prompts until Plan 4", "the converter refuses unsupported features until Plan 7") where Plans 4, 5 and 7C left one; Commands: the `npm test` count and time from Task 3's audit.

- [ ] **Step 3: Check** `npm run typecheck && npx vitest run tests/ui/version.test.ts tests/ui/identity.test.ts` — Expected: clean, PASS.

- [ ] **Step 4: Commit** (local only; it rides with the next publish, ruling P8-9)

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md after the v1.0.0 \"Talavera\" release

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
