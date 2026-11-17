# Commands & Colours: Napoleonics: rules research for a digital adaptation

Researched 2026-11-17. Compared against the Ancients engine spec at
`cnc-ancients/design/rules-reference.md` §1–§14 (cited below as "CCA §n").
Everything here is paraphrased. Use the official PDFs listed in §9 for exact wording.

## Sources and confidence tags

| Tag | Source | Status |
|---|---|---|
| **[R4]** | GMT, *C&C: Napoleonics Rules of Play, 4th Edition* (PDF named `CCN-Rules_4thEd_2023.pdf`, pages say "© 2018"). https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/ccn/CCN-Rules_4thEd_2023.pdf (linked from the GMT 6th-printing product page) | Official. Primary source. |
| **[QRC]** | GMT Quick Reference Card (© 2011, "Spanish Expansion"): dice per block count for French, British, Portuguese and Spanish units. https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/ccn/QuickReferenceCard.pdf | Official. The text extraction is messy; numbers were cross-checked against [SITE]. |
| **[SCN]** | GMT Scenario booklet, 2nd ed. (© 2010/2012). https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/living_rules/CCN_Scen_Book-2012.pdf | Official. |
| **[GB]** | GMT, *Expansion #7 The Grand Battles* rules (8th ed. print file, © 2025). https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/CC_LaGrandeNapoleonics/CCN_Grand+Battles_Rules-HiRes-CROPPED.pdf | Official. Holds the current victory-banner objective definitions and the Garrison rule. |
| **[SITE]** | commandsandcolors.net/napoleonics: transcribed rules, unit and terrain pages, FAQ, scenario pages | Semi-official fan site run by Alessandro Crespi. It mirrors GMT text and collects Richard Borg's rulings. A few transcription slips are noted where found. |
| **[FAQ]** | commandsandcolors.net Condensed FAQs (rulings mostly by Richard Borg, 2013–2025) | Treat as errata. |
| **[mem]** | My own background knowledge, not verified in a source this session | Low confidence; flagged each time. |

"**[?]**" marks anything uncertain or where the sources conflict.

---

## 1. Base game: components and Command deck

**Setting:** Peninsular War, French against British and Portuguese, plus Quatre Bras and Waterloo.
**The Spanish army is not in the base game.** It arrives in Expansion #1 [R4 §2, SITE base-game page].

### Components [R4 §2; GMT product page]
* **Board:** 13 hexes wide by 9 deep, the same as CCA §1. Two dotted lines make Left, Centre and Right sections, and a hex cut by a dotted line belongs to both sections [R4].
  * The base board has no other differences from Ancients. The 11x20 (EPIC) and 11x26 (Grand) boards come with the expansions.
* **Terrain:** 56 double-sided terrain tiles.
* **Squares:** 2 Infantry-in-Square tracks, and Square counters numbered 1–4 for each side.
  * Each side can therefore have at most 4 squares at once: you cannot form a square when every space on your track is full [R4 §6].
* **Banners:** 18 Victory Banner counters.
* **Cards and dice:** 70 Command cards and 8 battle dice.
* **Blocks:** 340 in total.
  * Small blocks are infantry, medium blocks are cavalry, and rectangular blocks are artillery and leaders.
  * Artillery blocks lie with the long edge horizontal; leader blocks stand with it vertical.
* **Player aids:**
  * 1 French National Unit Reference Card and 1 British/Portuguese card.
  * 2 Terrain Effects cards and 2 card lists.

**Base-game order of battle** (block counts from [R4] sticker instructions and the rulespal transcription of the component list; the per-unit block sizes match §2):
* **French:**
  * Infantry: Line ×10, Light ×5, Grenadier, Young Guard and Old Guard ×1 each, Militia ×2.
  * Cavalry: Light Cavalry ×3, Cuirassier ×2, Heavy ×2, Guard Heavy ×1.
  * Artillery: Horse ×2, Foot ×3, Guard Foot ×1.
  * Leaders ×4.
* **British:**
  * Infantry: Line ×9, Light ×2, Rifle ×2, Grenadier ×1, Guard Grenadier ×2.
  * Cavalry: Light ×6, Heavy ×4, Guard Heavy ×1.
  * Artillery: Horse ×2, Foot ×3.
  * Leaders ×3.
* **Portuguese:**
  * Infantry: Line ×6, Light ×2, Militia ×1.
  * Cavalry: Light ×2, Heavy ×2.
  * Artillery: Foot ×2.
  * Leaders ×2.

### Command deck: 70 cards = 48 Section + 22 Tactic [R4 §8]

The CCA deck has 60 cards (CCA §12).

**Section cards (48).** "L/C/R" gives the count of each card for each section.

| Card | L/C/R | Effect |
|---|---|---|
| Scout | 2/2/2 | Order 1 unit or leader in the section. At the end of the turn, draw 2 cards, keep 1 and discard the other. |
| Probe | 4/6/4 | Order 2 units or leaders in the section. |
| Attack | 4/6/4 | Order 3 units or leaders in the section. |
| Assault | 2/2/2 | Order as many units or leaders in the section as your current Command. |
| Coordinated Advance | 2 | Order 1 on the Left, 2 in the Centre and 1 on the Right. |
| Flank Attack | 2 | Order 2 on each flank. |
| Forward | 2 | Order 2 in each section. |
| Recon in Force | 2 | Order 1 in each section. |

Section cards may order leaders and may detach an attached leader, which costs one order (bicorne icon).

**Tactic cards (22).** Card text from [R4]; counts are in brackets.

| Card | Effect |
|---|---|
| **Bayonet Charge** (2) | Order up to 4 infantry units. They may move 2 hexes and still melee. No ranged fire. Guard infantry get +1 melee die. |
| **Bombard** (2) | Order up to 4 artillery units. Each either moves up to 3 hexes and does not battle, or stays put and fires with +2 dice (Guard artillery +3). |
| **Cavalry Charge** (3) | Order up to 4 cavalry and/or horse artillery units. Cavalry get +1 die for the whole turn (Guard cavalry +2), including bonus attacks. Heavy cavalry may move 3 hexes and still battle. Horse artillery acts normally. |
| **Counter-Attack** (2) | Becomes a copy of the card your opponent played last turn. A copied Section card has its Left and Right swapped. |
| **Élan** (1) | Roll as many dice as your Command. Each unit symbol orders one unit of that arm. Each flag orders any unit or leader, and a flag-ordered leader may detach. Sabres order nothing. Ordered units get +1 die for the turn. At the end of the turn, shuffle the deck and discard pile together. |
| **Fire and Hold** (2) | Order up to 4 infantry and/or artillery units to fire with +1 die. They may not be adjacent to an enemy and may not move before or after firing. They may come out of square. A unit that cannot fire (for example, an enemy retreated next to it) may not melee instead. |
| **First Strike** (2) | Reactive: play it when the opponent declares a melee, before the dice are rolled. Your defender fights first. If the attacker survives without retreating, it then attacks normally, and the defender gets no battle back. The First Strike player draws first at the end of the turn. Only one First Strike per melee. |
| **Force March** (2) | Order every infantry unit in one section. Light, Rifle, Grenadier and Guard infantry, and any infantry with an attached leader, may move 2 and still battle. Other infantry may stay, move 1 and battle, or move 2 without battling. |
| **Give Them the Cold Steel** (1) | Order every unit adjacent to an enemy. They may not move before melee and may not fire. They melee with +1 die. Infantry may take ground and cavalry may break through and make a bonus melee. |
| **Leadership** (2) | Order every leader, plus any unit a leader stays attached to. Ordered units roll +1 die when they battle. Leaders may detach; a leader that joins a unit does not order it. |
| **La Grande Manoeuvre** (1) | Order up to 4 units or leaders for a move of up to 4 hexes with no battle. Squares are not eligible. Or order 1 unit of your choice. |
| **Rally** (1) | Roll as many dice as your Command. Each infantry, cavalry or artillery symbol returns 1 block of that arm to any under-strength unit anywhere on the board, never above its starting size. Units that regain a block are ordered. **No leader-adjacency requirement**, unlike CCA. |
| **Short Supply** (1) | The holder picks one unit, friendly or enemy, and moves it (with any attached leader) to an enterable baseline hex of the owner's choice in the same section, or one row forward if none is free. A friendly unit moved this way may not battle that turn. Squares and lone leaders cannot be chosen [FAQ]. |

**Fallback "order 1 unit":** Bayonet Charge, Bombard, Cavalry Charge, Fire and Hold, Force March and Leadership order 1 unit of your choice if you have none of the named troop type (CCA has the same rule).
* [FAQ] A unit ordered this way gets none of the card's bonuses.

**Command** is the number of cards in hand, counting the card just played.
* It drops by 1 for each of your units in square, because each square holds one card on the square track [R4 §5 Phase 2].

**Later deck change (Expansion #5, [SITE]):** a new 90-card "green" Command deck.
* First Strike and Short Supply move into the new Tactician deck.
* Six **Take Command** cards (Any, L, C, R) are added. Each orders a leader plus up to 3 linked adjacent units, much like CCA's Leadership cards.
* [?] The full breakdown of the 90 cards was not found.

---

## 2. Units

### General rules [R4 §5]
* **Dice = blocks** (base dice equal the blocks remaining):
  * **Infantry:** for melee, and for fire when the unit did not move.
  * **Cavalry:** for melee.
* **Artillery** does not follow that rule. It uses fixed tables and only gets weaker at 1 block (see below).
* **Infantry moving fire:** an infantry unit that moved 1 hex fires with half its blocks. French and British round up; Portuguese (and Spanish, Austrian, Prussian, Russian militia) round down.
* **Light infantry:** Light, Young Guard, Rifle and Guard Light infantry that move 2 hexes may not battle at all.
* **Bonus dice by type:**
  * **Ranged +1:** Light, Rifle, Grenadier and every Guard infantry.
  * **Melee +1:** Grenadier and other Guard infantry. The French Old Guard gets +2.
  * **Melee +1:** Heavy, Cuirassier and Guard Heavy cavalry.
* **Ranges:** infantry 2, Rifle 3, Foot artillery 5, Horse artillery 4.
  * Range counts the target hex but not the firer's hex, as in CCA.
* **Who can fire:** cavalry and leaders never fire.

### Movement by type [R4 §5]

| Type | Movement |
|---|---|
| Line, Grenadier, Old Guard, Guard Grenadier, Militia infantry | 1 hex and battle |
| Light, Young Guard, Rifle (and Guard Light) infantry | 1 hex and battle, or 2 hexes and no battle |
| Light cavalry (and Lancers, Guard Light) | 1–3 hexes and battle |
| Heavy, Cuirassier, Guard Heavy cavalry | 1–2 hexes and battle |
| Foot / Guard Foot artillery | 1 hex and no battle, **or** stay and battle |
| Horse artillery | 1 hex and battle (no fire at range 4), or 2 hexes and no battle. With 1 block left it may not move and battle. |
| Leader (alone or detached) | Up to 3 hexes. May pass through friendly units and leaders, but may not end on another leader. |

### Base-game unit tables [QRC; SITE "New Units and Leaders (Base Game)"; R4]

Column key:
* "Fire S" = fire dice when the unit did not move; "Fire M" = fire dice after moving 1 hex. Both are shown as a formula and then as values for 4/3/2/1 blocks.
* "Ret" = hexes retreated per flag; "Ign" = flags the unit may ignore.

**French** (rounding up when moving)

| Code | Unit | Blocks | Fire S | Fire M | Melee | Ret | Ign | Notes |
|---|---|---|---|---|---|---|---|---|
| LN | Line Infantry | 4 | =blocks | ½ up | =blocks, **+1 vs infantry only** | 1 | 0 | On the [QRC] (2011) and [SITE]. French "Conscript" markers (Exp 5/6 era, 1813) remove this +1 and make the unit retreat 2 per flag. |
| LT | Light Infantry | 4 | +1 (5/4/3/2) | ½ up +1 | =blocks | 1 | 0 | |
| GR | Grenadier | 4 | =blocks | ½ up | +1 | 1 | 1 | [?] [R4] gives *all* grenadiers +1 fire, but the French [QRC] row shows plain blocks. Follow the reference card. |
| YG | Young Guard | 4 | +1 | ½ up +1 | +1 | 1 | 1 | Light-infantry movement. |
| OG | Old Guard | 4 | +1 | ½ up +1 | **+2** | 1 | 2 | |
| MI | Militia | 4 | =blocks | ½ up [?] | =blocks, **no sabre hits** (except against a lone leader) | **3** | 0 | [SITE] says French militia moving fire was changed from rounding down to rounding up. |
| LC | Light Cavalry | 4 | – | – | =blocks | 1 | 0 | Retire and Reform (all cavalry). |
| LNCR | Light Lancer | 4 | – | – | =blocks | 1 | 0 | When attacking, re-roll flag results once, except against Cuirassiers. On the [QRC] French card; [?] whether base-box blocks are supplied. |
| HC | Heavy Cavalry | 4 | – | – | +1 | 1 | 0 | |
| CU | Cuirassier | 4 | – | – | +1 | 1 | 1 | Ignores 1 hit from infantry fire. Lancers do not re-roll flags against it. |
| GHC | Guard Heavy Cav | 4 | – | – | +1 | 1 | 2 | |
| GLC | Guard Light Cav | 4 | – | – | =blocks | 1 | 2 | On the [QRC] French card. [?] Possibly not in the base box. |
| FA | Foot Artillery | 3 | table | – | 4 (3 at 1 block) | 1 | 0 | |
| HA | Horse Artillery | 3 | table | table (range ≤3) | 3 (2 at 1 block) | 1 | 0 | |
| GFA | Guard Foot Art. | 3 | FA table | – | 5 (4 at 1 block) | 1 | 2 | Moves like Foot artillery. The [SITE] base-game table wrongly gives it Horse artillery movement. |

**British** (rounding up when moving)

| Code | Unit | Blocks | Fire S | Fire M | Melee | Ret | Ign | Notes |
|---|---|---|---|---|---|---|---|---|
| LN | Line Infantry | 4 | **=blocks +1 (5/4/3/2)** | ½ up (no +1) | =blocks | 1 | 0 | "Superb infantry training": the +1 is lost if the unit moved [FAQ, Borg 30 Jul 2015]. |
| LT | Light Infantry | **5** | +1 | ½ up +1 | =blocks | 1 | 0 | |
| RL | Rifle Light Inf. | **3** | +1 | ½ up +1 | =blocks, **no sabre hits** | 1 | 0 | **Range 3.** |
| GR | Grenadier | 4 | +1 | ½ up +1 | +1 | 1 | 1 | |
| GG | Guard Grenadier | **5** | +1 | ½ up +1 | +1 | 1 | 2 | |
| LC | Light Cavalry | **3** | – | – | =blocks | 1 | 0 | |
| HC | Heavy Cavalry | **3** | – | – | +1 | 1 | 0 | |
| GHC | Guard Heavy Cav | 3 | – | – | +1 | 1 | 2 | |
| FA / HA | Artillery | 3 | table | – | as French | 1 | 0 | |

**Portuguese** (rounding **down** when moving)

| Code | Unit | Blocks | Fire S | Fire M | Melee | Ret | Ign |
|---|---|---|---|---|---|---|---|
| LN | Line | 4 | =blocks | ½ down | =blocks | 1 | 0 |
| LT | Light | **3** | +1 | ½ down +1 | =blocks | 1 | 0 |
| MI | Militia | 4 | =blocks | ½ down | =blocks, no sabre hits | **3** | 0 |
| LC | Light Cav | 3 | – | – | =blocks | 1 | 0 |
| HC | Heavy Cav | 3 | – | – | +1 | 1 | 0 |
| FA | Foot Art. | 3 | table | – | 4/3 | 1 | 0 |

In [SCN] 015 Waterloo, the Dutch-Belgian and German allies use brown blocks and the Portuguese card, except that their line infantry retreats 2 per flag.

### Artillery dice by range [R4 tables; QRC; SITE unit pages]

"Range 1" means adjacent, which is always melee, so those are melee dice.

| Unit, blocks | r1 (melee) | r2 | r3 | r4 | r5 |
|---|---|---|---|---|---|
| Foot artillery, 3 or 2 blocks | 4 | 3 | 2 | 1 | 1 |
| Foot artillery, 1 block | 3 | 2 | 1 | 1 | – |
| Horse artillery, 3 or 2 blocks | 3 | 2 | 1 | 1 | – |
| Horse artillery, 1 block | 2 | 1 | 1 | – | – |

* Foot artillery must not move in order to battle at all.
* Horse artillery that moved 1 hex fires with the same dice but **not at range 4**. With 1 block left it may not move and battle.
* Guard artillery: +1 melee die. Bombard gives +3 instead of +2 [R4 §8].
* An artillery unit on a hill may fire over a friendly unit or leader on an adjacent lower hex, as long as that hex has no blocking terrain. This is not allowed for Combined Arms [R4 §7].

### Nationality quirks (summary)
* **French:**
  * 4-block cavalry, so French cavalry roll 4–5 dice against 3–4 for the British.
  * Line infantry gets +1 melee die against infantry.
    * This is the game's stand-in for the attack column. **There is no formation or column rule** in CCN [R4; interpretation].
  * The Old Guard gets +2 melee and ignores 2 flags.
* **British:**
  * Line infantry gets +1 fire when it did not move.
  * 5-block Light infantry and Guard Grenadiers.
  * 3-block Rifles with range 3 and no sabre hits.
  * Only 3-block cavalry.
  * Some scenarios add "Impetuous cavalry": a victorious red cavalry unit must advance [SCN 015, SITE].
* **Portuguese:**
  * Moving fire rounds down.
  * 3-block Light infantry and 3-block cavalry.
* **Spanish** (Expansion #1 only) [QRC; SITE Exp 1]:
  * **Everything retreats 2 hexes per flag**, and militia 3.
  * Line and militia infantry: moving fire is ½ rounded down, then −1.
  * Line, Light and militia infantry: −1 melee die when they moved.
  * Light infantry has 5 blocks; cavalry has 3 blocks.
  * Spanish Grenadiers and Cuirassiers ignore 1 flag and retreat 2 per flag.
  * The "Guerrilla Action" counter mechanic (see §7).
* **Other nations**, so the data model can hold them:
  * **Russian:** Line infantry has 3 blocks and ignores 1 flag [SITE Exp 2].
  * **Austrian:** Line infantry has 5 blocks and retreats 2 per flag. It may form a "Battalion Mass" square without giving up a card, and moves at most 1 hex on Force March or Bayonet Charge [SITE Exp 3].
  * **Prussian:**
    * Line infantry gets +1 melee die if it did not move or is battling back (not on First Strike) [FAQ].
    * Line infantry retreats 1 hex for the first flag and 2 hexes for each further flag [SITE Exp 4].

### Leaders [R4 §5–6]
* A leader is a single block and is **not a unit**. It moves 3 hexes and cannot battle alone.
* **Attached leader:**
  * The unit may ignore 1 flag.
  * The unit gets **+1 die only when ordered by a Leadership card**.
  * A leader gives **no helmet hits, no bonus melee, and no take-ground bonus**.
* **Lone leader:** counts as 1 support for the flag-ignore check.
* **Detaching:** allowed only on Section, Leadership or La Grande Manoeuvre cards, or an Élan flag result. Detaching costs 1 order, and the unit needs a separate order of its own.
  * A leader that joins a unit stops, and that unit may then battle in place but may not move.
  * A leader attached to a square cannot detach.

---

## 3. Dice and hits

**Faces** [R4 §2]: 2× Infantry, 1× Cavalry, 1× Artillery, 1× Flag, 1× Sabre (crossed sabres).
* **There is no helmet face.**
* The chance of rolling an infantry symbol is 1/3, against 1/6 for cavalry or artillery.

| Result | Ranged fire | Melee |
|---|---|---|
| Symbol matching the target's arm (infantry, cavalry, artillery) | 1 hit | 1 hit |
| Sabre | **Miss** | 1 hit against any unit, **except** when rolled by Militia or Rifle units (and later Militia cavalry and Cossacks) |
| Sabre against a lone leader | Not applicable: a lone leader cannot be targeted at range in the base rules | Any sabre kills the leader, **even from Militia or Rifles** |
| Flag | No hit; may force a retreat | No hit; may force a retreat |

* **Chance per die of a hit:**
  * Fire on infantry: 2/6. Fire on cavalry or artillery: 1/6.
  * Melee on infantry: 3/6. Melee on cavalry or artillery: 2/6.
* **Combined Arms:** artillery dice added to a melee also score on sabres, unless the melee unit cannot score with sabres [R4 §6].
* **Leader casualty checks use sabres** (see §4).
* **Who rolls dice equal to blocks** [R4 §5 "Normally the base number of Battle Dice … equal to the number of blocks"]:
  * Infantry, for melee and for fire when the unit did not move.
  * Cavalry, for melee.
  * **Not artillery**: it uses the range table and only weakens at 1 block.
  * **Not squares**: always 1 die at most.
  * **Not Garrisons** (Expansion #5/#7): 1 die.
  * **Not the Rocket Battery** (Expansion #5): always 2 dice.
  * Exception: a Russian "paper-strength" extra block adds a die for infantry but not for artillery [SITE Exp 2].

---

## 4. Combat sequence

**General** [R4 §5 Phase 4]:
* An ordered unit uses **either** fire **or** melee, never both.
* All movement comes before any combat.
* One unit's combat, with all its follow-ups, is resolved fully before the next unit's begins.
* A unit adjacent to an enemy may only melee: it may not fire at all, not even at another target. CCA §8 has the same rule.

### Fire procedure
1. Choose the firer and target.
2. Check range and line of sight.
3. Work out the base dice.
4. Add card bonuses.
5. Subtract terrain reductions.
6. Roll; remove hits, then do retreats.

* The target cannot battle back, and cavalry cannot Retire and Reform against fire.
* **The order matters:** card bonuses are added first and terrain reductions are subtracted afterwards. Terrain only ever subtracts; it never caps (compare CCA §4).

### Melee procedure [R4]
1. Declare the attack. A defender holding First Strike must play it now.
2. A defending cavalry unit attacked by infantry may Retire and Reform.
3. A defending infantry unit attacked by cavalry may form square.
4. Work out the base dice.
5. Add card bonuses.
6. Subtract terrain reductions.
7. Roll.
8. Score hits.
9. Retreats.
10. Additional actions: take ground, or breakthrough plus a bonus attack.
11. The defender battles back.

**Battle back:**
* **Who:** the defender battles back if it still has a block and did not retreat out of its hex.
  * A defender that failed a retreat and lost blocks for it still battles back.
* **How:** with its normal dice, the terrain reductions from its own side, and normal flags against the attacker.
* **Limits:**
  * There is no battle back to a battle back.
  * No battle back to fire, after a Retire and Reform, or after the defender used First Strike.
  * A unit battling back never takes ground or breaks through.
  * First Strike cannot be played against a battle back.
* **Several attackers:** a defender attacked by several units battles back against each of them in turn.
* **Victory timing:** the game ends the moment a side reaches its banner target, even in the middle of a battle back.

**Retreats** [R4]:
* **Distance:** each flag that is not ignored moves the unit 1 hex toward its own baseline. Militia move 3 hexes per flag, and some nations differ (see §2).
* **Direction and blocking:**
  * The unit never moves sideways or toward the enemy.
  * Terrain is ignored unless it is impassable.
  * The unit may not enter a hex with any unit, an enemy leader or impassable terrain, and may not leave the board.
  * Each hex it cannot complete costs 1 block.
* **Lone friendly leader:** a unit without a leader may retreat onto a lone friendly leader. The leader attaches and the retreat ends there.
* **Squares:** a square never moves, so every retreat hex costs it a block.

**Ignoring flags ("Bolster Morale")** [R4]. Ignoring is optional, chosen flag by flag, and the effects add up:
* **Attached leader** (+1): if the unit lost blocks, the leader must first survive his casualty check.
* **Support** (+1): two or more adjacent friendly units or lone leaders.
  * A square can give support but cannot receive it.
  * CCA §10 has the same rule.
* **Terrain** (+1): Field Works when attacked across a works hexside, and later Walled Farm, Church and Walled Garden. A Castle gives +2.
* **Unit type:** Grenadier +1, Cuirassier +1, Guard units +1 or +2 as their reference card says, Russian line infantry +1.
* **Prussian Iron Will counters:** each one spent cancels 1 flag (see §7).
* **Bounce flags can never be ignored:** a flag rolled by a square against cavalry always forces the retreat, whatever the cavalry's abilities [R4; FAQ].

**Additional actions after a melee win** (the defender was eliminated or left its hex, including a lone leader that retreated) [R4]:
* **Infantry: Take Ground.** The infantry may move into the vacated hex.
  * It gets **no bonus attack**.
  * A square cannot take ground.
  * Taking ground follows normal terrain rules: [FAQ] says a unit that enters a forest, town or ford cannot take ground afterwards. **[?]** The wording is ambiguous; see the FAQ text.
* **Artillery:** never takes ground.
* **Cavalry Breakthrough:**
  * Enter the vacated hex, then optionally move 1 more hex.
  * Moving back to the original hex still counts as a breakthrough.
* **Bonus Attack** (cavalry only, after entering the vacated hex):
  * It may target any adjacent enemy.
  * One bonus attack per unit per turn.
  * If the bonus attack also succeeds, the cavalry may enter that vacated hex but gets no extra hex and no third attack.
  * A bonus attack may be made as a Combined Arms attack.
* **No take ground or breakthrough** after fire, for a unit battling back, or for a unit that used First Strike.

**Cavalry Retire and Reform** (this replaces CCA's Evade) [R4 §6]:
* **Trigger:** cavalry attacked in melee by **infantry**, including an infantry/artillery Combined Arms attack. The defender must declare it before the attacker rolls.
* **Requires** a legal 2-hex path toward the cavalry's own side.
  * Each step must get closer to its own baseline.
  * Hexes with units, impassable terrain or the board edge block the path; terrain that only stops movement does not.
* **Resolution:**
  * The attacker rolls, and **only cavalry symbols hit**: sabres and flags are ignored.
  * The cavalry then moves 2 hexes back. A leader casualty check applies if it took a hit.
  * The infantry may take ground.
  * The cavalry may not battle back.
* **Not allowed:**
  * Against fire.
  * Against an infantry unit's battle back.
  * When the infantry plays First Strike.
* **Lone leader on the path:** cavalry without a leader may retire onto a lone friendly leader 1 hex away and stop there.

**Leader casualty checks** (the opponent always rolls) [R4]:
* **Unit loses blocks but survives:** roll 2 dice; **2 sabres** kill the leader.
  * Only one check per combat roll, even if a failed retreat costs more blocks.
  * Block losses from a failed retreat also trigger a check.
* **Unit eliminated:** roll 1 die; **1 sabre** kills the leader. Otherwise the leader must retreat 1–3 hexes.
  * If he is on his own baseline he must leave the map, which gives no banner.
  * If impassable terrain stops him retreating even 1 hex, he dies and the enemy gets a banner.
* **Lone leader attacked in melee:** the attacker rolls its normal melee dice, and **any sabre** kills (even from Militia or Rifles). Otherwise the leader retreats 1–3 hexes, and the attacker may take ground or break through.
  * **In the base game a lone leader cannot be fired at.**
  * Expansion #5 allows it: 2 sabres kill, and only a fire attack of 2 or more dice can manage that.
* **Leader Escape:** when an enemy unit blocks the retreat path, the leader moves onto it.
  * That unit rolls its normal melee dice, with no terrain or card effects [FAQ]; any sabre kills.
  * If a third enemy-occupied hex is reached, the leader dies.
  * A square rolls only 1 die against an escaping leader [FAQ].
* **Each leader killed** gives 1 banner.

### Infantry squares [R4 §6; FAQ]
* **Trigger:** on the opponent's turn, when an enemy cavalry unit is about to melee one of your infantry units. The attacker must ask whether you form square.
* **Forming is not allowed:**
  * If you hold **2 or fewer** Command cards.
  * On a Town, Windmill or Field Works hex. Exception [FAQ]: on Field Works you may form square when the cavalry is *not* attacking across a works hexside.
  * Against cavalry that is battling back.
  * When the infantry is the attacker and the cavalry plays First Strike.
  * When the square track is full (4 counters in the base game).
  * [FAQ] Playing First Strike does not let you form square against that attack.
* **Hidden-information cost:** the attacker draws one card at random, unseen, from the defender's hand. It goes face down on the defender's square track, and the numbered counter goes on the unit.
  * The track cards are not part of the hand, so they reduce your Command.
  * Austrian Battalion Mass skips the card draw (Expansion #3).
* **The square fires first** in that melee, with **1 die**. A flag rolled is a **bounce flag** that cannot be ignored: the cavalry must retreat, losing 1 block for each hex it cannot complete. Any Combined Arms artillery dice for the cavalry are then lost.
  * If the cavalry survives without retreating, it attacks with **at most 1 die** (no card or unit bonuses), plus any Combined Arms artillery dice.
  * Cavalry may play First Strike against a square but still rolls 1 die.
* **A square's dice are always at most 1**, both fire and melee, whatever the cards or unit type.
  * Only Combined Arms can add dice: the square's 1 die plus the artillery's dice.
  * Terrain may reduce the square to 0 dice.
* **A square:**
  * Cannot move or take ground.
  * May be ordered to battle; it may fire only if no enemy is adjacent.
  * Can give support but cannot receive it.
  * Lets its attached leader ignore flags but never detach.
  * Loses 1 block for each retreat hex.
* **Infantry and artillery against a square:** they fire and melee with their normal dice. The square battles back with 1 die.
* **Leaving square:** only in your own Order phase, using an order, and only if **no enemy cavalry is adjacent**.
  * The counter comes off and the card returns to your hand.
  * The unit may then move and battle normally. Leaving square is not movement, so the unit may still fire with full dice if it does not move.
* **Square eliminated:** the card returns to the owner's hand.

### Combined Arms [R4 §6]
* **When:** declared before rolling, as an ordered infantry or cavalry unit melees.
* **Who:** one or more ordered artillery units that are in range of the target and have a **completely clear** line of sight.
  * The path must hold no units and no terrain.
  * A hill battery may not fire over a friendly unit here.
* **Dice:** each unit works out its own dice after terrain, then everything is rolled together.
  * The melee unit may contribute 0 dice and the artillery still rolls.
* **Battle back:** the defender battles back against the melee unit, not the artillery.
* **Lost:** the artillery dice are lost if a square bounces or kills the cavalry first, or a First Strike kills or repels the melee unit.
* **Ordering:** each participating artillery unit needs its own order. **[?]** No source says the artillery is spent for the turn afterwards; this is implied by "one order, one battle".

---

## 5. Terrain [R4 §7; SITE terrain pages and Expansion #1/#3 tiles]

Reductions are **subtracted** from the dice of the *battling unit's arm*:
* "Into" = the target stands on this terrain.
* "Out" = the battling unit stands on it.

| Terrain | Movement | Battle on the turn it is entered? | Into (Inf / Cav / Art) | Out (Inf / Cav / Art) | Blocks line of sight? | Square allowed? | Flag |
|---|---|---|---|---|---|---|---|
| Forest | Stop on entry | No, except Light / Young Guard / Rifle / other light infantry | −1 / −2 / −1 | 0 / −2 / −1 | Yes | Yes | – |
| Hill | Free | Yes | Uphill: −1 / −1 / 0. Downhill: 0 / −1 / 0. Hill to hill: infantry −1 **fire only**, otherwise 0. | – | Special (below) | Yes | – |
| Rugged Hill | Impassable | No battle into it | – | – | Yes | – | – |
| Town / Windmill | Stop on entry | No | −2 / −3 / −1. Cavalry Charge bonus cancelled. | 0 / −3 / −1. Charge bonus cancelled. | Yes | **No** | – |
| Field Works (redoubt; protected hexsides drawn on the tile; 2-, 3- and 4-sided versions exist) | Stop when crossing a works hexside | Yes | Across a works side: −1 / −2 / 0. On a hill, these **replace** the hill reductions; they do not stack. | Across a works side: 0 / −2 / 0 | No (yes if on a hill) | Not against cavalry attacking across a works side [FAQ] | Infantry and artillery attacked across a works side ignore 1 flag; cavalry do not |
| River | Impassable except at a ford or bridge | **No melee across or into it** | – | – | No | – | – |
| Fordable river / stream | Stop on entry | Yes | Melee −1, fire 0 | A unit standing in it rolls −1 for both fire and melee | No | Yes | – |
| Bridge | Cancels the river's limits | Yes | – | – | No | Yes | – |
| Sand Quarry | Stop on entry; **impassable to artillery** | Yes | Infantry −1 fire only (melee 0) / Cav −2 / Art −1 | 0 / −2 / – | No | Yes | – |
| Marsh (Exp 3) | Infantry, cavalry and leaders stop; impassable to artillery | Yes | Melee −1, fire 0 | A unit standing in it rolls −1 for fire and melee | No | No | – |
| Walled Farm (Exp 1), Church, Tower, Castle (Exp 3) | As Town | As Town | As Town | As Town | Yes | No | Walled Farm and Church: ignore 1. Castle: ignore 2. |
| Walled Garden (Exp 3) | As Forest | As Forest | As Forest | As Forest | Yes | [?] | Ignore 1 |
| Field Works in a Town or Forest (Exp 3) | As the base terrain | As the base terrain | As the base terrain | As the base terrain | – | – | Ignore 1 across a works side |
| Lake, Frozen Lake, Orchard/Vineyard | Listed on [SITE], not researched in detail | | | | | | [?] |

**How the "into" and "out" columns combine** [R4 wording; interpretation]:
* The terrain under the target and the terrain under the firer both apply.
* So cavalry in a forest attacking infantry in a town rolls −2 (out of the forest) and −3 (into the town).
* **[?]** There is no general official rule on stacking beyond the Field-Works-on-hill rule. I read the reductions as adding up.

**Line of sight** [R4]:
* Draw a line from the centre of the firer's hex to the centre of the target's hex.
* **What blocks:** any intermediate hex with a unit or leader (friend or foe), blocking terrain, **and the lateral board edge**.
* **Not blocking:** terrain in the target's own hex.
* **Along a hexside:** the line is blocked only if both hexes beside it are obstructed. This matches CCA §8.

**Hills and line of sight:**
* A hill hex blocks the view of what is behind it.
* A low unit can see onto the first hill hex, and the reverse.
* A low unit cannot see through one hill hex onto a second hill hex.
* Connected hexes of one hill form a plateau and do not block each other.
* Two hills separated by low ground do not block each other unless something in between does.

**Retreats ignore all terrain except impassable terrain**, including Marsh. This is simpler than CCA's marsh roll.

---

## 6. Victory

**Banners** [R4 §4]:
* **Sources:**
  * 1 banner for each enemy unit wholly eliminated, and 1 for each enemy leader killed.
  * Scenario objectives.
* **No banner** for:
  * A leader who escapes off his own baseline.
  * An eliminated Garrison.
  * Russian Cossacks, Expansion #2 [SITE].
* **Typical targets:** 5–9 banners [R4]. The base scenarios use **5, 5, 6, 6, 7, 6, 6, 7, 6, 6, 6, 6, 6, 9, 8** (001–015) [SCN].
* **Typical hands:** 6 cards against 5, with some 4/4, 5/5 and 6/6 [SCN].

**Objective types** [GB §2, the current official taxonomy; the older scenarios use the same ideas in their own words]:

| Type | Gained | Lost |
|---|---|---|
| **Temporary hex** | Immediately on occupying the hex | The moment the hex is vacated (move, retreat, elimination) on either player's turn. Not lost if another friendly ordered unit moves onto it in the same turn. |
| **Temporary hex (Turn Start)** | If you occupy the hex at the start of your turn | The moment it is vacated, as above |
| **Temporary Group (± Turn Start)** | When you hold every hex of the group | When any hex of the group is unoccupied |
| **Temporary Majority (± Turn Start)** | When you hold more of the group's hexes than the enemy | When you no longer hold more |
| **Permanent hex (± Turn Start)** | When you occupy the hex | Never |
| **Breakthrough** | When an ordered unit that **started its turn** on an enemy baseline hex moves off the board there: 1 permanent banner | Never |
| **Time Pressure** | The defender may play Scout, take 1 permanent banner and draw 1 card instead of 2. Not allowed for the winning banner. | Never |

* **Timing:** Turn Start banners are awarded at the start of the turn; every other banner the moment it is earned.
* **Examples** [SCN]:
  * 001 Roliça and 015 Waterloo: temporary Turn Start hexes.
  * 003 Vimiero: a 2-banner temporary group.
  * 012 Garcia Hernandez: a "units after the first count double" rule.

---

## 7. Scenarios and expansions

### Base game: 15 scenarios [SITE base-game list; SCN]

| # | Battle | Date |
|---|---|---|
| 001 | Roliça (French First Position) | 17 Aug 1808 |
| 002 | Roliça (French Second Position) | 17 Aug 1808 |
| 003 | Vimeiro | 21 Aug 1808 |
| 004 | Corunna | 16 Jan 1809 |
| 005 | Talavera | 28 Jul 1809 |
| 006 | River Côa | 24 Jul 1810 |
| 007 | Bussaco (Reynier's Assault) | 27 Sep 1810 |
| 008 | Bussaco (Ney's Assault) | 27 Sep 1810 |
| 009 | Combat at Redinha | 12 Mar 1811 |
| 010 | Salamanca (Attack on the French Left) | 22 Jul 1812 |
| 011 | Salamanca (Attack on the French Right) | 22 Jul 1812 |
| 012 | García Hernández | 23 Jul 1812 |
| 013 | Combat at Aire | 2 Mar 1814 |
| 014 | Quatre Bras | 16 Jun 1815 |
| 015 | Waterloo | 18 Jun 1815 |

GMT also posted extra Salamanca scenarios (`ccn/Salamanca.pdf`).

### Expansions

Release years are approximate and from my own knowledge **[mem]**, except 2011 (the [QRC] copyright) and 2025 (the [GB] copyright). Scenario counts are from [SITE] box pages.

| # | Title (approx. year) | Nations | New units | New mechanics | Scenarios |
|---|---|---|---|---|---|
| 1 | *The Spanish Army* (2011) | Spain (with Britain and Portugal for Anglo-Spanish battles) | Spanish LN, LT(5), GR, MI, LC, HC, CU, FA | **Guerrilla Action counters:** the Spanish spend one before French orders to cancel the French card's orders unless a French die shows a sabre. A Spanish Scout gains a counter instead of the extra card. Walled Farm, 2- and 4-sided redoubts. | 18 (+ extra Anglo-Spanish) |
| 2 | *The Russian Army* (2012 [mem]) | Russia (against France; Swedish, Turkish and others only in the history text) | Russian LN(3, ignore 1 flag), LT(3), GR, Guard Light, Guard Grenadier, MI, LC, HC, CU, GLC, GHC (block count [?]: [SITE] says 6, [GB] lists a 6-block Guard **Cuirassier** from Exp 7), **Cossacks** (2 blocks, retreat 3, no sabre hits, ignore the forest melee reduction, no banner when eliminated), FA, HA, GFA | **Mother Russia roll** before the battle: dice equal to the hand size. Infantry symbol: +1 block to a line unit. Cavalry: place a Cossack unit. Artillery: +1 artillery block. Sabre: place field works. Flag: +1 block to a light unit, or any of the above. | 20 |
| 3 | *The Austrian Army* (2013 [mem]) | Austria | Austrian LN(5, retreat 2), LT (Jäger), **Grenzer** (retreat 2, no sabre hits), GR, MI, LC, LNCR, HC, CU, FA, HA | **Battalion Mass:** Austrian line infantry forms square without giving up a card, limited to the starting hand size. Marsh, Church, Castle, Tower, Walled Garden, field works in a town or forest. | 20 |
| 4 | *The Prussian Army* (2014 [mem]) | Prussia | Prussian LN (+1 melee standing or battling back; retreat 1 then 2), LT, GR, GG, **Reserve infantry** (retreat 2), **Militia** = Landwehr (retreat 3), LC, **Lancers**, **Militia Lancers** (Landwehr cavalry), HC, CU, FA, HA. Also French LNCR and GLC. | **Iron Will counters:** each one cancels 1 flag against a Prussian unit. | 20 (401–420: Jena-Auerstedt 1806 to Ligny, Plancenoit and Wavre 1815) |
| 5 | *Generals, Marshals & Tacticians* (2015 [mem]) | Mostly 1813 French against the Russians, Prussians and Austrians | Russian Lancer and Militia Lancer, **British Rocket Battery**, French Guard Horse Artillery | **Tactician cards:** a separate deck. Draws are triggered by Scout, Cold Steel, La Grande Manoeuvre, Leadership and Rally; Élan gives both players one. Each army commander has a Tactician rating, and the default use of a card is a 3-hex leader move. **New 90-card Command deck** with Take Command; First Strike and Short Supply move to the Tactician deck. **Lone leaders can be fired at** (2 sabres kill). **Garrison markers. Grand Battery** (adjacent artillery units fire at one target together). French Conscripts [?]. | 18 |
| 6 | *EPIC Napoleonics* (2016–17 [mem]; rules reprinted 2023) | Austerlitz focus (France, Russia, Austria) | Russian Guard Horse Artillery; French Conscript markers | **EPIC:** an 11x20 board for 2–6 players. Each turn the commander plays one card from hand **and** one from a 5-card face-up Courier Rack, for two sections. **Corps Command Stars** give march moves. Squares are allowed down to 1 card in hand, up to the starting hand −1. Also **La Grande Battles:** an 11x26 board for up to 8 players. | 20 (6 standard, 12 EPIC, 2 Grand) |
| 7 | *The Grand Battles* (2025) | All six nations | Austrian Militia Cavalry, Russian Guard Cuirassier (6 blocks), British **Highland** infantry | A revised Grand Battle format (11x26, 2 mounted boards). Iconic Commanders. Square counters #5 and #6. Hungarian +1 battle-bonus counters. Revised Garrison rule. The victory-banner objective taxonomy (§6). | 10 Grand + 10 EPIC + 2 pre-printed 11x28 extended maps (Waterloo, Borodino) |

* **Later products:**
  * GMT lists *Combined Edition Vol. I: The War in Spain*, which bundles the base game with the Spanish material and the Tactician material.
  * The 6th printing of the base game is "identical to the 5th apart from errata" [GMT product pages].
  * **[?]** Contents and status were not verified: the Combined Edition page returned 404.
* **Fan scenarios:** commandsandcolors.net lists many more under its Maps section, including American War of Independence and Egypt fan scenarios. The CCN system has hundreds of scenarios.

---

## 8. Biggest differences from Ancients for an implementer (ranked by implementation impact)

1. **The dice formula changes completely.**
   * CCA uses fixed dice per unit type (CCA §4).
   * In CCN, infantry and cavalry roll dice equal to their remaining blocks. On top of that come:
     * Per-type +1 or +2 bonuses.
     * The French line infantry's +1 that only applies against infantry.
     * Halved moving fire with nation-specific rounding.
     * The Spanish −1 when moving and the Prussian +1 when standing.
   * Artillery uses range-by-block tables.
   * A square's dice are capped at 1.
   * **Why it matters:** every attack, every AI estimate and every test fixture depends on this. It needs a data-driven table keyed by (nation, unit type) with standing/moving/melee formulas, and must not branch on army name.
2. **Different dice faces and hit tables.**
   * The faces are 2×infantry, cavalry, artillery, flag, sabre, and there is **no helmet**.
   * The sabre hits only in melee, except for militia and rifles, but kills a lone leader whoever rolls it.
   * Leader checks are 2 sabres or 1 sabre.
   * **Why it matters:** the die model, the probability helpers the AI uses, the dice art and the leader logic all change. CCA's helmet logic (leader-adjacent hits, elites) does not carry over.
3. **Infantry squares** are a reactive interrupt on the opponent's turn with hidden information.
   * A random card is taken from the hand and parked on the square track, so the hand and Command shrink.
   * The square fires first, bounce flags cannot be ignored, both sides are capped at 1 die, and the square can give support but not receive it.
   * Leaving square needs an order and no adjacent enemy cavalry.
   * Forming needs 3 or more cards in hand, a free track slot, and allowed terrain.
   * **Why it matters:** it needs a new decision point inside melee resolution, a per-player square track, an "is in square" unit state that changes movement, dice and retreat, and AI policy for both sides.
4. **Terrain uses subtractive reductions by the battling unit's arm,** with separate "into" and "out" values that can differ between fire and melee, instead of CCA's caps.
   * Field Works protect only certain hexsides, so the attack direction matters.
   * Hill line of sight has its own plateau and two-hill rules.
   * Rivers forbid melee across them.
   * **Why it matters:** the terrain model has to be rebuilt (each row gets inf/cav/art × into/out × fire/melee), hexside data must be added, and line of sight must include the lateral board edge.
5. **Combined Arms**: artillery dice added to a melee roll.
   * Several units commit to one combat, each artillery unit needs a completely clear line of sight, and the artillery dice are lost if the attacker is repulsed first.
   * **Why it matters:** CCA has no multi-unit attack, so it needs a new declaration step, order bookkeeping and AI search over artillery/attacker pairs.
6. **Post-melee actions change.**
   * Infantry takes ground but gets **no bonus attack**.
   * Only cavalry breaks through, gets the +1 hex, and makes a bonus attack.
   * A leader no longer enables a bonus melee, and warriors and elephants do not exist.
   * **Why it matters:** CCA's momentum-advance and bonus-close-combat rules (CCA §9.6) can be reused, but the eligibility rules need rewriting.
7. **Retire and Reform replaces Evade.**
   * Only cavalry may do it, only when attacked by infantry, and only cavalry symbols hit.
   * It moves exactly 2 hexes toward its own side, the attacker may take ground, and there is no battle back.
   * Nothing evades cavalry, and nothing ever evades fire.
   * **Why it matters:** similar code to CCA's evade, but the triggers and hit rules differ.
8. **Leaders are weaker and safer.**
   * No helmet hits, no bolstering of bonus combat, and only +1 die when the Leadership card is played.
   * A lone leader cannot be fired at in the base game.
   * Ignoring 1 flag, leader escape and the retreat of 1–3 hexes are much as in CCA §11.
   * **Why it matters:** simplifies the leader code but changes AI valuation; Expansion #5 then reintroduces leader fire and Tactician leader cards.
9. **Retreat distances and flag-ignore sources are national data.**
   * Most units retreat 1 hex per flag. Militia retreat 3, Spaniards 2, Austrian line infantry 2, Prussian line infantry 1 then 2, conscripts 2.
   * Flag-ignores come from: Grenadier, Cuirassier, Guard 1–2, Russian line infantry, works and walled terrain, leader, support (the same 2-adjacent rule as CCA), and Iron Will.
   * Retreats ignore all non-impassable terrain, including marsh.
   * **Why it matters:** mostly data, but the "first flag 1, then 2 per flag" rule needs a formula rather than a constant.
10. **New Command deck (70 cards) and its effects.**
    * New effects: Assault (equal to Command), Scout (draw 2 keep 1), Élan (a dice-driven order roll that triggers a reshuffle), Rally (anywhere, no leader needed).
    * Short Supply teleports a unit, friendly or enemy, back to the baseline.
    * Fire and Hold, Bombard (move 3 or +2 dice), Cavalry Charge (+1 for the whole turn, Heavy cavalry move 3).
    * Two First Strike cards.
    * Leadership is one "all leaders" card rather than CCA's Inspired Leadership chains.
    * **Why it matters:** the card engine carries over, but each card's handler is new, and Command now changes with squares.
11. **Artillery movement and fire rules.**
    * Foot artillery cannot move and fire; Horse artillery cannot fire at range 4 after moving.
    * Hill batteries can fire over adjacent lower friendly units (except for Combined Arms).
    * Artillery cannot take ground.
    * **Why it matters:** new unit class with special line-of-sight exceptions.
12. **Victory objective taxonomy.**
    * Temporary, Turn Start, Group, Majority, Permanent and Breakthrough exits [GB].
    * **Why it matters:** CCA's existing objective engine (camp captures, held banners, majority, exits; CCA §13 and expansion §18.4) maps almost one-to-one, so this is low effort.
13. **Expansion mechanics to keep in mind for the data model even if not built yet.**
    * Guerrilla counters that cancel the opponent's card; the Mother Russia pre-battle roll; Iron Will counters.
    * Lancer flag re-rolls; Cuirassiers ignoring 1 infantry-fire hit; Cossacks giving no banner.
    * The Tactician deck as a second hand of reaction cards; Garrisons; Grand Battery; EPIC's two-card turns.
    * **Why it matters:** these are per-side resources and extra card zones that shape the state model.
14. **Smaller rules that differ from CCA.**
    * There is no fire/melee choice once adjacent: an adjacent unit must melee (the same as CCA's ban on ranged fire when adjacent).
    * The lateral board edge blocks line of sight.
    * The "battle in the turn it enters" exemption for forests applies only to light infantry.

**Unchanged from CCA:**
* Board geometry and sections (CCA §1).
* The turn structure (CCA §5).
* Order bookkeeping, one order per unit, and lost extra orders (CCA §6).
* Leaders attaching and detaching, mostly (CCA §6).
* Retreat direction and the 1-block loss for each blocked hex (CCA §10).
* Support needs 2 or more adjacent units (CCA §10).
* The line-of-sight hexside rule (CCA §8).
* Reshuffling when the deck runs out (CCA §5).
* First Strike's basic flow (CCA §9.4).
* Counter-Attack swapping Left and Right (CCA §12).

---

## 9. Where to get scenario setups and official rules

**Official rules PDFs (GMT S3, linked from the base-game product page https://www.gmtgames.com/p-1251-commands-colors-napoleonics-6th-printing.aspx):**
* **Rules of Play, 4th Edition:** `https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/ccn/CCN-Rules_4thEd_2023.pdf`. 24 pages, with the terrain chart and the full card list. This is the closest thing to a "rules reference".
* **Quick Reference Card** (dice per block count for each unit, French/British/Portuguese/Spanish): `https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/ccn/QuickReferenceCard.pdf`.
* **Scenario Booklet, 2nd ed.** (15 base battles: notes, banners, hands, special rules; maps are images): `https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/living_rules/CCN_Scen_Book-2012.pdf`.
* **Extra scenarios:** `…/ccn/Salamanca.pdf`.
* **Solo rules:** "Power of Three" (2021), `…/ccn/2-1-21UpdatedSoloNapoleonicsupdate.pdf`.
* **Translations:** Spanish, Russian, Czech, Greek, Korean and Ukrainian rulebooks are also on that page.
* **Expansion #7 Grand Battles rules (2025):** `https://gmtwebsiteassets.s3.us-west-2.amazonaws.com/CC_LaGrandeNapoleonics/CCN_Grand+Battles_Rules-HiRes-CROPPED.pdf`.
* **EPIC rules (2023):** a copy is hosted at `https://gamers-hq.de/media/pdf/b1/ee/c0/CCN-EPIC-RULES-2023_LR.pdf`. Not a GMT host.

There is **no separate "Living Rules" or condensed "Rules Reference" document**. The 4th-edition rulebook plus the National Unit Reference Cards, Terrain Effects cards and the [SITE] Condensed FAQs together play that role.

**Scenario setups:**
* **commandsandcolors.net scenario pages**, for example `https://www.commandsandcolors.net/napoleonics/maps/peninsular-war-1808-1814/001-rolica1-17-august-1808.html`:
  * Text you can transcribe directly: historical background, a terrain-tile count, an army list with unit counts by type, leaders, hand size and Tactician count, who moves first, banners, special rules, a FAQ and play statistics.
  * The map is a single image at `https://www.commandsandcolors.net/napoleonics/images/CCN/scenarios/NNN.jpg` (001.jpg … 015.jpg, then 1xx–7xx for the expansions).
  * **No hex coordinates are given**, so the unit and terrain placement has to be read off the map image. That is the same workflow the Ancients project uses (`design/exp*-scenario-notes.md`).
* **GMT scenario booklet PDF:** the same text. The maps can be extracted as images from the PDF for transcription.
* **VASSAL module** (v5.1.0, Dec 2024, about 239 MB): https://vassalengine.org/wiki/Module:Commands_&_Colors:_Napoleonics. It ships pre-built scenario setups. **[?]** A `.vsav` or the module's setup files could in principle be parsed for hex positions, but that was not tested.
  * The fan site says the module doubles as a scenario editor (`commandsandcolors.net/napoleonics/articles/ccn-related/scenario-editor-vassal.html`).
* **commandsandcolors.net Downloads:** blank maps, a 2011 Map Editor, unofficial scenarios, VASSAL extensions, and a "Unit and Terrain cards" player aid (`/napoleonics/downloads.html`).

---

## Open questions to settle before building

1. Was the French line infantry "+1 melee against infantry" printed on the first base-game reference card, or added later? It is on the 2011 QRC and current [SITE], so implement it.
2. Do French Grenadiers get +1 fire? [R4] text says all grenadiers do; the French [QRC] row suggests not. Check a current French National Unit Reference Card.
3. How do into/out terrain reductions stack when both hexes have terrain (other than Field Works on a hill)?
4. Are Combined Arms artillery units spent for the turn? (Assumed yes: one order, one battle.)
5. Which French LNCR and GLC blocks come in the current base box (6th printing)?
6. What is the composition of the Expansion #5 90-card deck, and the full Tactician card list (27 entries on [SITE])?
