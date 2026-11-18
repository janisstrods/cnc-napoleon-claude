# AI balance log

Observations about the computer opponent's tuning, for the calibration tasks (Plan 5 Task 11, Plan 7C Task 21). Each entry
says what was measured, how, and what to look at.

## Expansion #1: Guerrilla counters and the 116 opening card (Plan 7C Task 19, 2026-11-18)

Rules: RR §15.5 (Guerrilla, S15–S21, S45), §15.8 and §16.16 (Move First, S38, S43, S44). Code: `src/ai/cardsense.ts`
(`COUNTER_VALUE`, `counterValue`, `guerrillaSpend`, `scoutKeepGain`, `guerrillaScoutTake`, `moveFirstPick`).

How measured: real battles through `GameDriver`; the Guerrilla and Move First decisions answered by `chooseAnswer` (captain,
deterministic, `budgetScale` 0.05, each commander's personality), every other decision random and legal. Random play crowds
units together, so the spend rate below is higher than in AI-vs-AI play.

- **The Scout question is answered yes every time.** In 717 of 717 Scout questions (Task 19 fuzz: 103–111, 117 and 118, 12 seeds
  each) the guerrilla side took a counter. Two causes:
  - It usually holds fewer than two counters, because it spends them; below two it always takes one.
  - When it holds two or more, the keep-one gain is far below `counterValue` (0.3). Over 426 Scout questions (103, 105, 106,
    108, 110, 117, 118, 10 seeds) `scoutKeepGain` was min 0.022, p10 0.045, median 0.058, p90 0.076 and max 0.113.
  - With keep values at their present scale (`CARD_VALUE` 0.25, retention 0.6–1.4) a decline needs a nearly empty unseen pool
    of very uneven cards.
  - **To look at:** whether 0.3 overprices a counter against card value, or whether the rule should compare it with the
    keep-one gain times a factor.
- **The spend rate is about 55%.** 846 of 1,440 spend questions in the Task 19 fuzz and 495 of 927 in the run above answered
  yes. Every card ordering a melee at good odds draws a counter.
  - **To look at:** in AI-vs-AI games, whether counters go early on middling cards, leaving none for the opponent's strong
    Tactic cards. A reserve term (keep the last counter for a card above some value) is the obvious lever; `counterValue`'s
    ×1.5 for the last counter is its only form now.
- **The 116 opening pick often moves second.**
  - **Evidence:** over 30 seeds of 116 with the AI on both sides, 44 of 60 picks were not the side's lowest-valued option, and
    several took a Forward (6) or Assault (5) where a Scout or Probe (1–2) was held.
  - **Cause:** `moveFirstPick` follows the brief. It picks the highest opening value (the quick score of the card on turn 1)
    and uses the lower Move First value only to break ties; moving first itself has no value in it.
  - **First player:** top moved first in 18 of the 30 games, bottom in 12; top is the tie side.
  - **To look at:** a moving-first term (the value of acting before the opponent, roughly one card's worth of tempo). The
    second mover's card is also played after the enemy's turn, so its turn-1 quick score is stale.

## Base game: strength, balance and calibration (Plan 5 Task 11, 2026-11-18)

All numbers are AI-vs-AI self-play on battles 001–015, not human play. Every strength and balance run is deterministic
(`--deterministic`, ruling 3): no clock is read, the node budget alone limits the work, so the results do not depend on machine
load and a JSON file reproduces from its command line. Only the time row (run 5) is a separate, timed run. Samples are small
(12 games a battle in the balance run): a single battle's percentage is a hint, and its 95 % Wilson interval is given with it.

### How the numbers were made

- Runners: `scripts/ai-match.ts` (run 1, against random answers), `scripts/ai-balance.ts` (runs 2–4, with behaviour counters),
  summarised by `scripts/ai-balance-report.ts` and by a small tally of the JSON rows (`p5-11-floors.js`, research folder).
  Raw outputs are in `cnc-napoleonics-research/ai-balance/` (never committed), cited below by file name.
- Seeds: `1000 × battle + 17 × game`. Each game number is a pair: side A plays bottom, then top, on the same game seed (the AIs'
  own seeds add the side). With the same AI on both sides (run 4) the swapped game would replay the first move for move, so it is
  played on the seed + 7 (`jobSeed`'s `mirror`, added by this task; before it the 180 balance games were 90 games, each twice).
- Commanders play their own temperament (`personalityFor`).
- Shards: each run is split with `--shard i/n` over at most 6 processes on 8 cores shared with other work (load 10–18 throughout).

**The budget scale of the strength rows (carry P-a).** A strength row should measure the AI a player meets, and a player's AI
is limited by its clock: 150 ms (captain), 800 ms (colonel) and 2000 ms (marshal) per card decision. `scripts/ai-probe.ts`
(added by this task, carry 113) played 001, 004, 007, 012, 015 and 113 deterministically at scale 1 for 10 turns and measured
each decision's budget nodes and CPU time (`p5-11-probe-m1..m3.json`, `p5-11-probe-c1.json`). A decision that took longer than
its cap is counted at the nodes the cap would have bought (pro rata); the matching node cap is the one whose mean
`min(nodes, cap)` reaches the same mean:

| Level | Card decisions | Nodes at scale 1 (mean) | Over the time cap | Nodes the cap buys (mean) | Matching scale |
|---|---|---|---|---|---|
| captain | 19 | 63 | 6 of 19 | 55 | 0.86 |
| colonel | 47 | 676 | 28 of 47 | 415 | 0.36 |
| marshal | 30 | 2,442 | 25 of 30 | 1,194 | 0.24 |

So the strength rows run each level at its own scale (`--scaleA`/`--scaleB`, added by this task): captain 0.85, colonel 0.35,
marshal 0.25. CPU time is less load-sensitive than wall time, but on this loaded machine it still runs high (efficiency cores,
shared caches), so on a quiet machine the clock buys somewhat more nodes than these scales give: the strength rows err towards
the weaker search. At scale 1 the colonel and marshal would play with 1.6× and 2× the nodes a player's AI gets.

Node cost per battle (the per-battle speed probe; CPU ms per card decision at deterministic scale 1, loaded machine):

| Battle | Level | Card decisions | Nodes (avg) | CPU ms (avg, max) | µs per node |
|---|---|---|---|---|---|
| 001 | captain | 5 | 54 | 129, 353 | 2383 |
| 001 | colonel | 10 | 696 | 971, 2025 | 1395 |
| 001 | marshal | 5 | 3244 | 3276, 6123 | 1010 |
| 004 | colonel | 5 | 692 | 943, 1947 | 1363 |
| 004 | marshal | 5 | 1506 | 2025, 3793 | 1345 |
| 007 | captain | 5 | 90 | 93, 141 | 1030 |
| 007 | colonel | 10 | 454 | 595, 1445 | 1311 |
| 007 | marshal | 5 | 3632 | 6558, 20791 | 1806 |
| 012 | captain | 4 | 56 | 124, 217 | 2213 |
| 012 | colonel | 7 | 911 | 3531, 7115 | 3876 |
| 012 | marshal | 5 | 1937 | 8886, 12686 | 4588 |
| 015 | captain | 5 | 49 | 103, 208 | 2124 |
| 015 | colonel | 10 | 738 | 1278, 2428 | 1732 |
| 015 | marshal | 5 | 2275 | 4044, 5215 | 1778 |
| 113 | colonel | 5 | 610 | 3458, 5815 | 5673 |
| 113 | marshal | 5 | 2061 | 17043, 26661 | 8269 |

The cavalry battles cost 3–8× more per node than the rest (see carry 113 below).

Reproduce (each `ai-balance` line splits into shards: add `--shard i/n` and run them in parallel; the files cited below are these
outputs, one per shard):

```
npx vite-node scripts/ai-match.ts -- --a captain --random --games 1 --scale 1 --deterministic --scenarios 001,002,003,004,005,006,007,008,009,010,011,012,013,014,015
npx vite-node scripts/ai-balance.ts -- --a colonel --b captain --scaleA 0.35 --scaleB 0.85 --games 2 --deterministic --scenarios 001,002,003,004,005,006,007,008,009,010,011,012,013,014,015 --json r2.json
npx vite-node scripts/ai-balance.ts -- --a marshal --b colonel --scaleA 0.25 --scaleB 0.35 --games 4 --deterministic --scenarios 001,002,003,004,005,006,007,008,009,010,011,012,013,014,015 --json r3.json
npx vite-node scripts/ai-balance.ts -- --a colonel --b colonel --scale 0.5 --games 6 --deterministic --scenarios 001,002,003,004,005,006,007,008,009,010,011,012,013,014,015 --json r4.json
npx vite-node scripts/ai-balance-report.ts -- r4-*.json
npx vite-node scripts/ai-match.ts -- --a marshal --b colonel --games 1 --scenarios 001,007,015   # run 5: timed, unsharded (also captain, colonel)
npx vite-node scripts/ai-probe.ts -- --scenarios 001,004,007,012,015,113 --a marshal --b colonel
```

### Reference rates (Step 1)

Historical winner from `src/history/battles/<id>.ts` (`outcome.winner`). Published rates: the "Victory Results" box of each
battle's scenario page on commandsandcolors.net, read 2026-11-18. The box labels the sides only "Top Army" and "Bottom Army";
the pages' "Move First" notes match this game's `first` side in all 12 battles checked (004–015; not read for 001–003), so the
site's top and bottom are taken to be ours (the British/Allied army on top, the French at the bottom). The boxes' "Avg VP" figures contradict their own win rates
(015: the top army wins 34 % yet averages 8 VP), so they are not used.

| Battle | Historical winner | Published bottom (French) / top win rate | Plays | Latest report | Source |
|---|---|---|---|---|---|
| 001 Roliça (French First Position) | top (British/Allied) | 52 % / 48 % | 419 | 2026-10-20 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/001-rolica1-17-august-1808.html) |
| 002 Roliça (French Second Position) | top (British/Allied) | 69 % / 31 % | 209 | 2026-09-17 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/002-rolica2-17-august-1808.html) |
| 003 Vimiero | top (British/Allied) | 53 % / 47 % | 270 | 2026-10-20 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/003-vimiero-21-august-1808.html) |
| 004 Corunna | top (British/Allied) | 46 % / 54 % | 245 | 2026-11-16 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/004-corunna-16-january-1809.html) |
| 005 Talavera | top (British/Allied) | 54 % / 46 % | 261 | none listed | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/005-talavera-28-july-1809.html) |
| 006 River Côa | bottom (French) | 40 % / 60 % | 181 | none listed | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/006-river-coa-24-july-1810.html) |
| 007 Bussaco (Reynier's Assault) | top (British/Allied) | 56 % / 44 % | 191 | none listed | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/007-bussaco1-27-september-1810.html) |
| 008 Bussaco (Ney's Assault) | top (British/Allied) | 53 % / 47 % | 210 | 2026-09-11 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/008-bussaco2-27-september-1810.html) |
| 009 Combat at Redinha | draw (recorded as such) | 37 % / 63 % | 132 | 2026-08-16 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/009-combat-at-redinha-12-march-1811.html) |
| 010 Salamanca (Attack on the French Left) | top (British/Allied) | 54 % / 46 % | 178 | 2026-11-06 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/010-salamanca1-22-july-1812.html) |
| 011 Salamanca (Attack on the French Right) | top (British/Allied) | 42 % / 58 % | 119 | 2026-10-03 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/011-salamanca2-22-july-1812.html) |
| 012 García Hernández | top (British/Allied) | 47 % / 53 % | 120 | none listed | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/012-garcia-hernandez-23-july-1812.html) |
| 013 Combat at Aire | top (British/Allied) | 61 % / 39 % | 173 | none listed | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/013-combat-at-aire-2-march-1814.html) |
| 014 Quatre Bras | draw (recorded as such) | 64 % / 36 % | 200 | 2026-05-07 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/seventh-coalition-1815/014-quatre-bras-16-june-1815.html) |
| 015 Waterloo | top (British/Allied) | 66 % / 34 % | 196 | 2026-07-09 | [scenario page](https://www.commandsandcolors.net/napoleonics/maps/seventh-coalition-1815/015-waterloo-18-june-1815.html) |

### Acceptance (final code)

Runs 1–4 below were run on the final code (commit fb93f31); runs 1, 2 and 4 replay their baseline games move for move (the
calibration's one kept evaluation change, the `tempGroup` fix, changes no move in them), run 3 is new.

| Check | Target | Result | |
|---|---|---|---|
| Level 0 vs random (run 1) | ≥ 90 % wins | 30 of 30 (100 %, 95 % Wilson [89 %, 100 %]) | met |
| Level 1 vs level 0 (run 2) | ≥ 65 % wins | 47 of 60 (78 %, [66 %, 87 %]) | met |
| Level 2 vs level 1 (run 3) | ≥ 55 % over ≥ 120 paired games | 71 of 120 (59 %, [50 %, 68 %]) after the reshape; 65 of 120 (54 %, [45 %, 63 %]) before | met (point estimate; the interval reaches down to 50 %) |
| Balance per battle: band (run 4) | each side 15–85 % | French 25–83 % in all 15 battles | met |
| Balance per battle: published rate | AI within ±25 points | 11 of 15; missed at 006 (+27), 007 (+27), 008 (−28), 012 (+28), one game of 12 beyond the line each | missed |
| Balance overall | British/Allied share 35–65 % | 78 of 180 (43 %, [36 %, 51 %]) | met |
| Errors | 0 fallbacks, 0 rejects, every game ends, longest ≤ 150 turns | 0 and 0 in all 390 final games (and in every baseline and probe game); every game ended in a win; longest 63 turns | met |
| Card-decision time (run 5) | level 0 max ≤ 300 ms; level 1 avg ≤ 800, max ≤ 1,500 ms; level 2 max ≤ 3,000 ms | captain max 179 ms; colonel avg 596 ms, max 909 ms; marshal max 2,242 ms (marshal stage at load 8–9) | met (marshal row to be re-measured on a quiet machine) |
| Squares (run 4) | formed in ≥ 20 % of offers | 410 of 589 (70 %) | met |
| First Strike (run 4) | played in ≥ 25 % of offers | 167 of 191 (87 %) | met |
| Combined Arms (run 4) | used in ≥ 10 battles | 15 battles (182 combats) | met |
| Gun range (run 4) | ≥ 50 % of shots at range ≥ 2 | 1,334 of 1,334 (100 %; a gun next to its target melees, so every fire event is at 2 or more) | met |
| Worn attacks (run 4) | `wornAttacks` ≤ 15 % of infantry melees | 15 of 1,570 (1 %) | met |

### Run 1: level 0 (captain) against random answers

30 games (15 battles × 2 sides, `p5-11-r1-final.log`): the captain won all 30, 5-1 to 9-0, in 7–57 turns; 0 rejects, 0 fallbacks.

### Run 2: level 1 (colonel) against level 0 (captain)

`p5-11-r2-final-0.json`, `-1.json` (60 games; colonel at scale 0.35, captain at 0.85):

| Battle | colonel as bottom (W-L) | colonel as top (W-L) | colonel total |
|---|---|---|---|
| 001 Roliça (First Position) | 2-0 | 2-0 | 4-0 |
| 002 Roliça (Second Position) | 2-0 | 0-2 | 2-2 |
| 003 Vimiero | 1-1 | 1-1 | 2-2 |
| 004 Corunna | 2-0 | 2-0 | 4-0 |
| 005 Talavera | 2-0 | 1-1 | 3-1 |
| 006 River Côa | 2-0 | 0-2 | 2-2 |
| 007 Bussaco (Reynier's Assault) | 2-0 | 2-0 | 4-0 |
| 008 Bussaco (Ney's Assault) | 2-0 | 2-0 | 4-0 |
| 009 Combat at Redinha | 2-0 | 1-1 | 3-1 |
| 010 Salamanca (French Left) | 2-0 | 2-0 | 4-0 |
| 011 Salamanca (French Right) | 2-0 | 2-0 | 4-0 |
| 012 García Hernández | 2-0 | 1-1 | 3-1 |
| 013 Combat at Aire | 2-0 | 1-1 | 3-1 |
| 014 Quatre Bras | 2-0 | 0-2 | 2-2 |
| 015 Waterloo | 2-0 | 1-1 | 3-1 |

**colonel 47, captain 13 of 60 (78 %, 95 % Wilson [66 %, 87 %]).**

All 13 of the colonel's losses came as the British/Allied (top) army; as the French it won 30 of 30. It lost both of its games as
the British at 002, 006 and 014.

### Run 3: level 2 (marshal) against level 1 (colonel)

`p5-11-r3-final-0..2.json` (120 games; marshal at scale 0.25, colonel at 0.35):

| Battle | marshal as bottom (W-L) | marshal as top (W-L) | marshal total |
|---|---|---|---|
| 001 Roliça (First Position) | 2-2 | 3-1 | 5-3 |
| 002 Roliça (Second Position) | 3-1 | 4-0 | 7-1 |
| 003 Vimiero | 4-0 | 3-1 | 7-1 |
| 004 Corunna | 4-0 | 0-4 | 4-4 |
| 005 Talavera | 1-3 | 1-3 | 2-6 |
| 006 River Côa | 3-1 | 3-1 | 6-2 |
| 007 Bussaco (Reynier's Assault) | 2-2 | 2-2 | 4-4 |
| 008 Bussaco (Ney's Assault) | 4-0 | 4-0 | 8-0 |
| 009 Combat at Redinha | 1-3 | 3-1 | 4-4 |
| 010 Salamanca (French Left) | 3-1 | 3-1 | 6-2 |
| 011 Salamanca (French Right) | 0-4 | 3-1 | 3-5 |
| 012 García Hernández | 1-3 | 1-3 | 2-6 |
| 013 Combat at Aire | 4-0 | 2-2 | 6-2 |
| 014 Quatre Bras | 2-2 | 1-3 | 3-5 |
| 015 Waterloo | 3-1 | 1-3 | 4-4 |

**marshal 71, colonel 49 of 120 (59 %, 95 % Wilson [50 %, 68 %]).**

Before the reshape (`p5-11-r3-base-0..5.json`, same seeds): marshal 65, colonel 55 (54 %, [45 %, 63 %]).

### Run 4: balance, level 1 against level 1

`p5-11-r4-final-0..2.json` (180 games, 12 a battle, scale 0.5). Published rates as in the reference table:

| Battle | Games | French (bottom) wins | British/Allied (top) wins | French win rate (95 % Wilson) | Published French rate | AI − published | Banners (bottom-top, avg) | Turns (avg, max) | 15–85 % band | ±25 points |
|---|---|---|---|---|---|---|---|---|---|---|
| 001 Roliça (First Position) | 12 | 7 | 5 | 58 % [32 %, 81 %] | 52 % | +6 | 4.0-3.2 | 26, 47 | met | met |
| 002 Roliça (Second Position) | 12 | 6 | 6 | 50 % [25 %, 75 %] | 69 % | -19 | 3.8-3.7 | 37, 55 | met | met |
| 003 Vimiero | 12 | 8 | 4 | 67 % [39 %, 86 %] | 53 % | +14 | 5.2-3.9 | 27, 39 | met | met |
| 004 Corunna | 12 | 3 | 9 | 25 % [9 %, 53 %] | 46 % | -21 | 4.3-5.3 | 37, 61 | met | met |
| 005 Talavera | 12 | 6 | 6 | 50 % [25 %, 75 %] | 54 % | -4 | 5.6-5.7 | 36, 58 | met | met |
| 006 River Côa | 12 | 8 | 4 | 67 % [39 %, 86 %] | 40 % | +27 | 5.2-4.4 | 16, 22 | met | **missed** |
| 007 Bussaco (Reynier) | 12 | 10 | 2 | 83 % [55 %, 95 %] | 56 % | +27 | 5.6-4.4 | 40, 49 | met | **missed** |
| 008 Bussaco (Ney) | 12 | 3 | 9 | 25 % [9 %, 53 %] | 53 % | -28 | 4.5-6.6 | 36, 52 | met | **missed** |
| 009 Combat at Redinha | 12 | 3 | 9 | 25 % [9 %, 53 %] | 37 % | -12 | 4.7-5.3 | 24, 37 | met | met |
| 010 Salamanca (French Left) | 12 | 8 | 4 | 67 % [39 %, 86 %] | 54 % | +13 | 4.8-4.3 | 26, 34 | met | met |
| 011 Salamanca (French Right) | 12 | 3 | 9 | 25 % [9 %, 53 %] | 42 % | -17 | 3.3-5.3 | 31, 49 | met | met |
| 012 García Hernández | 12 | 9 | 3 | 75 % [47 %, 91 %] | 47 % | +28 | 5.0-3.5 | 13, 23 | met | **missed** |
| 013 Combat at Aire | 12 | 9 | 3 | 75 % [47 %, 91 %] | 61 % | +14 | 5.5-3.7 | 28, 40 | met | met |
| 014 Quatre Bras | 12 | 10 | 2 | 83 % [55 %, 95 %] | 64 % | +19 | 8.6-6.0 | 37, 48 | met | met |
| 015 Waterloo | 12 | 9 | 3 | 75 % [47 %, 91 %] | 66 % | +9 | 7.8-4.9 | 29, 46 | met | met |

No battle is flagged (one side at 85 % or more). Counters over the 180 games: squares offered 589, formed 410; Retire and Reform
offered 213, used 110; First Strike offered 191, played 167; Combined Arms combats 182; gun shots by range 2/3/4/5 225/453/412/244;
infantry melees 1,570, worn 15; leaders lost 125; exits (006) 20; turns begun holding an objective banner 78.

**The four misses, and their causes as far as the runs show** (each is one game of 12 beyond the line; every Wilson interval
still contains the published rate ± 25):
- **006 River Côa** (French 67 %, published 40 %): the French win whoever commands the Light Division (Craufurd, Moore and Hill
  temperaments all 8-4) and a longer exit reach made it worse. The British exit only 20 units in 12 games: a full unit's exit nets
  little in the evaluation (one banner less the unit's value, about +0.06 for a Line unit, Task 5 concern 5), so the AI keeps its
  units fighting east of the Côa, where the French outnumber it, rather than crossing as human players do.
- **007 and 008 Bussaco** (French 83 % and 25 %, published 56 % and 53 %): the same commanders and temperaments, opposite errors.
  Not a temperament question; the sample is small (Wilson [55 %, 95 %] and [9 %, 53 %]).
- **012 García Hernández** (French 75 %, published 47 %): games are short (13 turns on average). In the game reviewed with
  `ai-review` (seed 12000, 12 turns) the British broke three squares, as in history, but lost three cavalry units and Bock to one
  French heavy cavalry unit's charges and bonus melees, and sat on Bombard and Bayonet Charge, which order nothing in an all-cavalry army. Bock's temperament
  is not the lever (Hill 8-4, Freire 10-2).

### Run 5: card-decision times

One separate run, not deterministic (the shipped clock, `--scale 1`), unsharded, one process: captain, colonel and marshal each
against the colonel on 001, 007 and 015, one paired game per battle (6 games each; `p5-11-run5.log`, script `p5-11-run5.sh`).
Times are the card decision (the whole turn plan), wall clock, measured by `ai-match`:

| Level (side A) | Load average at start / end | A's card decisions: avg, max | Target | The colonel opposite (side B): avg, max |
|---|---|---|---|---|
| captain | 3.8 / 2.6 | 46 ms, 179 ms | max ≤ 300 ms | 508 ms, 932 ms |
| colonel | 2.6 / 9.2 | 596 ms, 909 ms | avg ≤ 800 ms, max ≤ 1,500 ms | 585 ms, 843 ms |
| marshal | 9.2 / 8.5 | 1,223 ms, 2,242 ms | max ≤ 3,000 ms | 608 ms, 864 ms |

All within target. The captain stage ran on a quiet machine (load below 4); other work started during the colonel stage and the
marshal stage ran at load 8–9, so the marshal row (and the colonel's maximum) are to be re-measured on a quiet machine. Load only
lengthens these times (the clock cuts the search, so the marshal stays near its 2 s whatever the load), so the rows can only
improve. 0 rejects and 0 fallbacks; the marshal won 4 of its 6 games.

### Calibration

**Attacking sides' temperaments (the Ancients Darius lesson), checked before any shared weight.** The attacker of each battle
and its temperament (aggression, caution) with the baseline AI rate of that side (run 4) and the published rate:

| Battle | Attacker (temperament) | AI attacker win rate | Published |
|---|---|---|---|
| 001, 002 | British: Wellington (0.45, 0.8) | 42 %, 50 % | 48 %, 31 % |
| 003 | French: Junot (0.8, 0.3) | 67 % | 53 % |
| 004 | French: Soult (0.6, 0.6) | 25 % | 46 % |
| 005 | French: King Joseph (0.3, 0.7) | 50 % | 54 % |
| 006 | French: Ney (0.92, 0.2) | 67 % | 40 % |
| 007, 008 | French: Masséna (0.6, 0.55) | 83 %, 25 % | 56 %, 53 % |
| 009, 010, 011 | British: Wellington (0.45, 0.8) | 75 %, 33 %, 75 % | 63 %, 46 %, 58 % |
| 012 | British: Bock (0.7, 0.45) | 25 % | 53 % |
| 013 | British: Hill (0.5, 0.7) | 25 % | 39 % |
| 014, 015 | French: Ney (0.92, 0.2), Napoleon (0.75, 0.5) | 83 %, 75 % | 64 %, 66 % |

No cautious attacker is stuck: the most cautious ones (Wellington at 001, 002 and 009–011, King Joseph at 005) are within 19
points of their published rates, above them as often as below, so Wellington's attacker battles (carry M-7) need no change.
The two Masséna battles go opposite ways with the same two temperaments, so a temperament cannot be the cause there.

**Round 1: the shared-code carries from Plan 7C (objectives).** Changes:
- `tempGroup` potential: a unit already on the group is left out of the entry odds of its other hexes, as for `majority` (Plan
  7C T20 re-review carry; stepping across leaves its own hex free); the enter-odds cache is keyed by the group's hexes instead of
  its first hex and size (evaluate.ts). A correctness fix; test `003: a French unit on one Vimiero hex is no entry for the other`.
- Hold-chance discount (the 115 loitering carry): the capture potential of a free objective hex multiplied by `1 − pVac` of the
  nearest unit that could step on it.
- Exit pull reach `EXIT_RANGE` 8 → 12 (the 006 exit carries M-1 and Task 5 concern 5: the British exit only 1–2 units a game,
  20 exits in 180 baseline games; most of the Light Division starts beyond 8 hexes of the bridge).

Run 4, same seeds, before (`p5-11-r4-base-*.json`) and after (`p5-11-r4-c1-*.json`). The changes touch only the objective term,
so the battles without objectives replay the same games:

| Battle | Objective | Baseline: French wins (rate) | Round 1: French wins (rate) |
|---|---|---|---|
| 001 | tempHex (British) | 7-5 (58 %) | 9-3 (75 %) |
| 002 | none | 6-6 (50 %) | the same 12 games |
| 003 | tempGroup (French) | 8-4 (67 %) | 11-1 (92 %) |
| 004 | none | 3-9 (25 %) | the same 12 games |
| 005 | none | 6-6 (50 %) | the same 12 games |
| 006 | exit (British) | 8-4 (67 %) | 10-2 (83 %) |
| 007 | none | 10-2 (83 %) | the same 12 games |
| 008 | none | 3-9 (25 %) | the same 12 games |
| 009 | none | 3-9 (25 %) | the same 12 games |
| 010 | none | 8-4 (67 %) | the same 12 games |
| 011 | none | 3-9 (25 %) | the same 12 games |
| 012 | killWeight | 9-3 (75 %) | the same 12 games |
| 013 | tempHex (British) | 9-3 (75 %) | 10-2 (83 %) |
| 014 | tempHex (French) | 10-2 (83 %) | 9-3 (75 %) |
| 015 | tempHex (French) | 9-3 (75 %) | 10-2 (83 %) |

Round 1 made things worse: 003 went out of the band (French 92 %), 006 moved further from its published rate, and the British
share fell from 43 % to 39 %. The hold-chance discount moved every objective battle by one or two games, not in one direction
(the side that needs the hexes won more at 003 and 015 and less at 001 and 013), and the longer exit reach did not get the
British over the bridge (exits 20 → 16, French wins 8 → 10). The Spanish set moved too (114 and 117, the two `majority`
battles, see below).

**Round 2: round 1's discount and exit reach reverted; the `tempGroup` fix kept.** With the round-1 changes gone the code
differs from the baseline only in 003's group potential, and the final run replays all 180 baseline games move for move
(checked row by row against `p5-11-r4-base-*.json`): the fix removes potential the French never acted on. Two temperament probes on the single-commander battles were tried and dropped (12 games each, same seeds,
`--persTop`): 006 with Craufurd played as Moore or Hill: French 8-4 in both, as with Craufurd (the French win 006 whoever
commands the Light Division); 012 with Bock played as Hill 8-4, as Freire 10-2, as Bock 9-3: one game either way, noise.
No third round was run: the remaining misses are one game beyond the ±25-point line, no change found a lever on them, and a
third round would fit noise.

**Level 2 (ruling 8).** The baseline marshal won 65 of 120 against the colonel (54 %, 95 % Wilson [45 %, 63 %],
`p5-11-r3-base-*.json`), just under 55 %. At the nodes its clock buys (scale 0.25, 1,250 nodes) the Task 8 shape spent its budget
building and screening: `topCards` 6 × `orderCands` 4 × `moveVariants` 5 plans at `k0` 12 samples each, plus 16 extra variants.
Replaying its card decisions (001, 015, 6 turns each) showed 17–30 plans with at most 12–16 samples each: it never reached the
successive halving, so it chose among many thinly sampled plans (the colonel at its own 420 nodes was truncated too, at 4–5
samples in 4 of the 6 decisions, but with fewer plans). Reshaped (`LEVELS[2]`): `topCards` 3, `orderCands` 3, `moveVariants` 3, `k0` 6, `kMax` 48,
`extraVariants` 4 (budget, `maxSims` and battle settings unchanged). On the same decisions it builds 13–22 plans and samples its
leaders 23–64 times within the same nodes, and twice stopped early (560 and 659 of 1,250 nodes) with a clear leader. On the same seeds
(with round 1's evaluation, `p5-11-r3-m2-*.json`) it won 67 of 120 (56 %, [47 %, 64 %]).

### Carries from earlier reviews

| Carry | What was done |
|---|---|
| 113 evaluation cost; per-battle speed probe | `scripts/ai-probe.ts` (table above). Cavalry-heavy battles cost 4–8× per node (012: 3.9–4.6 ms, 113: 5.7–8.3 ms against 1.0–1.8 ms elsewhere). Profiles of the slowest decisions (007 turn 5 marshal, 113 turn 3 colonel): 50 % of the time is `pickAdvance`/`pickBreakthroughHex` inside simulations, each scoring every hex with a full evaluation of a clone, whose cavalry threats run `takeGround` bonus prospects (40 %). Two exact caches were added (flag results per board; each breakthrough hex scored once; answers unchanged, checked on 6 games). The structural fix (a cheaper advance/breakthrough policy inside simulations, or a delta evaluation) changes play and is left as a next step. In timed play the clock caps these decisions (2,015 ms measured on 007 turn 5), so they cost nodes, not time. |
| 102 free exits never pursued (`EDGE_PROGRESS`) | `exitEdge` is a Spanish-only objective (102): left to Plan 7C Task 21. The shared exit reach (`EXIT_RANGE`) was tried at 12 in round 1 and reverted. |
| 115 loitering (hold-chance discount of `tempHex`/`tempGroup` potential) | Tried in round 1 (discount by the nearest unit's `pVac`), measured worse on the base game and moved 114/117: reverted. Left to Plan 7C Task 21 with these numbers; a better proxy needs the threat at the target hex itself. |
| `tempGroup` in-group over-count; enter-odds cache key | Fixed (round 1, kept). |
| 117 approach pull (divided by need) | `majority` is Spanish-only: left to Plan 7C Task 21. |
| Guerrilla Scout always yes; spend ~55 % | Spanish-only constants: not changed. AI-vs-AI numbers now counted by `ai-balance` (below). |
| 116 picks often move second | Spanish-only: not changed; 116 went 4-0 to the French in both Spanish sanity sets (below). |
| Rally value about 2× | Not changed: no target or counter points at it (Rally is played, and the colonel's card choice is not measured per card); `FILL_CAP` keeps Rally ≤ 1.5× its base. Next step if a review of play shows Rally hoarded. |
| First Strike keep value about 0.031 | Not changed: First Strike is played in 87 % of its offers (floor 25 %). |
| Moving fire absent from `rawPower` | Not changed: unit values only rank units (Task 2 ruling: Task 11 tunes constants, never the ranking); no target depends on it. |
| P-a: deterministic scale matching the time caps | Done: per-level scales from `ai-probe` (above), `--scaleA/--scaleB`. |
| R-1: `GameRow.sims` comment | Fixed: `sims` is simulated turns at a card decision; `AiMemory.last.nodes` and `GameRow.nodes` now record the budget nodes. |
| P-2: counters reflect rejected answers | Rejects are 0 in every run, so no counter includes one. |
| M-6 square duration / vulnerability; LC ≈ LN | Not changed: squares are formed in 70 % of offers, inside the floor; no target points at the cavalry value. |

### Spanish sanity set (101, 105, 114, 116, 117)

Colonel against colonel, deterministic, scale 0.5, `--games 2` (4 games a battle, 20 games), after each round. It checks that
the shared changes do not break the Spanish AI; the Spanish calibration itself is Plan 7C Task 21's.

| Battle | Baseline French wins (`p5-11-sp-base-*.json`) | Round 1 (`p5-11-sp-c1.json`) | Final (`p5-11-sp-final-*.json`) |
|---|---|---|---|
| 101 Bailén | 3-1 | 3-1 | 3-1 |
| 105 Somosierra | 2-2 | 2-2 | 2-2 |
| 114 Barrosa | 3-1 | 1-3 | 3-1 |
| 116 Vitoria | 4-0 | 4-0 | 4-0 |
| 117 San Marcial | 1-3 | 0-4 | 1-3 |

0 rejects and 0 fallbacks in all 60 games; longest 55 turns. Round 1's hold-chance discount moved the two `majority` battles (114,
117); the final code replays the baseline's 20 games exactly. Numbers for Plan 7C Task 21 (Spanish-only constants, not changed
here):
- **Guerrilla:** in AI-vs-AI play the guerrilla side spent a counter on 22 of 107 spend questions (21 %; 101: 4 of 12, 105: 10 of
  53, 117: 8 of 42; final run), far below the 55 % of the random-play fuzz, and took a counter on 18 of 18 Scout questions (the
  Scout question is still always yes).
- **116:** the French won all 12 games of the three runs (4-0 each): a one-sided start, consistent
  with the Move First picks noted in the Task 19 section above (the pick often moves second).

### Next steps

- **006 River Côa:** value an exit against what the unit would lose by staying (its expected loss where it stands, as `exitEdge`
  already does for free exits), so threatened sound units cross; check that 006 moves towards the published 40 % without the
  extra exits weakening the British elsewhere.
- **007/008 and 012:** re-measure with 24 or more games a battle before changing anything (the Wilson intervals of 12 games are
  ±25 points wide); at 012 look at the cavalry's attacks on squares and the French heavy cavalry counter-charges.
- **Speed (carry 113):** a cheaper advance and breakthrough policy inside simulations (now a full evaluation per hex), or a delta
  evaluation; worth 3–8× at 012 and 113, where a player's colonel and marshal are clock-capped to a fraction of their nodes.
- **Hold-chance discount (carry 115):** a proxy from the threat on the target hex itself, measured on 001, 003, 013–015 and the
  Spanish objective battles together.
- **Level 2:** its margin over the colonel is real but modest (59 %, interval from 50 %). With a faster machine or the speed work
  above the clock buys more nodes, which the reshaped search turns into deeper sampling of its leaders.
