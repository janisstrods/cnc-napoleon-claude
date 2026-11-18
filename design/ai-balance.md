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
