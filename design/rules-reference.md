# Commands & Colours: Napoleonics — Rules Reference (as implemented)

Condensed from the GMT *Rules of Play, 4th Edition* (the edition the engine follows, R68), the National Unit Reference
Cards and the 2nd-edition scenario booklet, with Richard Borg's FAQ rulings where they settle a point. This file is
the authoritative spec for the engine, its tests and the AI: every rules test is written from this file alone. Rules
questions are decided in `design/rulings.md` (Expansion #1: `design/exp1-rulings.md`, rows S1…). A statement that rests on our own interpretation carries an **[Interp]**
mark with the id of the deciding row (for example **[Interp R15]**); other statements cite the settling row as (R<n>)
where one exists. Where this file and a ruling disagree, the ruling wins and this file is corrected.

§1–§13 describe the base game (battles 001–015). §14 holds the base battles' special rules. §15 holds the Expansion #1
rules and §16 the special rules of its battles 101–118.

**Notation.** `b` = the unit's current blocks. ⌈x⌉ rounds up, ⌊x⌋ rounds down. "r2" = range 2 (hexes counted including
the target's hex but not the battling unit's). I / C / A = infantry / cavalry / artillery. Unit keys are written
`Nation/Code` (for example `FR/LN`). "Own side" = the player's own baseline.

## 1. Board and sections

* 9 rows (row 0 = top) × 13 columns. Even rows have 13 hexes (c 0..12), odd rows 12 hexes (c 0..11), odd rows shifted
  right by half a hex ("odd-r" offset layout). The part hexes at the ends of the short rows are not playable.
* Each scenario names the **top** and **bottom** army. The top army's baseline is row 0, the bottom army's is row 8.
  "Toward own side" = toward own baseline (top army: row decreases; bottom army: row increases). In all 15 base battles
  the British side is the top army.
* The two **lateral edges** are the left and right sides of the board. The two **baselines** are rows 0 and 8.
* **Sections** are relative to each player. Half-column index `x2 = 2*c + (r odd ? 1 : 0)` (0..24).
  From the **bottom** player's view: Left = `x2 <= 8`, Centre = `8 <= x2 <= 16`, Right = `x2 >= 16`.
  Hexes with x2 = 8 or 16 (even rows, c = 4 and c = 8) lie on a dotted line and belong to both the flank and the
  centre section. The **top** player's Left is the bottom player's Right and vice versa.
* **Neighbours** ("odd-r"): a hex (r, c) on an **even** row touches (r, c−1), (r, c+1), (r−1, c−1), (r−1, c),
  (r+1, c−1), (r+1, c); a hex on an **odd** row touches (r, c−1), (r, c+1), (r−1, c), (r−1, c+1), (r+1, c),
  (r+1, c+1). Neighbours off the board (c < 0, c beyond the row's last hex, r < 0 or r > 8) do not exist. The board
  has 5 even rows × 13 + 4 odd rows × 12 = 113 hexes.
* **Distance** is hex distance (the number of hex steps). Adjacent = distance 1.
* **Retreat neighbours:** the two hexes adjacent to a hex on its own-side row (for the top army, the two neighbours in
  row r−1; for the bottom army, in row r+1). A hex on the board edge may have only one, or none. Examples (top army):
  (4,5) → {(3,4), (3,5)}; (2,0) → {(1,0)}; any hex of row 0 → none.
* No unit or leader may leave the board except where §11.3 (a leader retreating off his own baseline) or a scenario
  objective (§13.4) allows it.

## 2. Units

A unit is a group of blocks in one hex; its arm is **infantry**, **cavalry** or **artillery**, which decides which die
symbol hits it (§3). Blocks never split or merge. A leader is one block and is **not a unit** (§2.7, §11).

### 2.1 Unit classes used by rules and cards

| Class | Codes | Used by |
|---|---|---|
| Infantry | LN, LT, RI, GR, YG, OG, GG, ML | arms, Bayonet Charge, Force March, Fire and Hold, squares |
| Light-infantry movement (1 & battle, or 2 & no battle) | LT, RI, YG | §7, forest battle exception (§4) |
| Grenadier (Force March) | GR | §12 |
| Guard infantry | YG, OG, GG | Bayonet Charge +1, Force March |
| Cavalry | LC, HC, CU, GHC | arms, Cavalry Charge, Retire and Reform, breakthrough |
| Heavy cavalry (move 1–2; 3 under Cavalry Charge) | HC, CU, GHC | §7, §12 |
| Guard cavalry (+2 on Cavalry Charge) | GHC | §12 |
| Artillery | FA, HA, GA | arms, Bombard, Fire and Hold, Combined Arms |
| Foot artillery movement (1 & no battle, or 0 & battle) | FA, GA | §7 |
| Guard artillery (+3 on Bombard) | GA | §12 |
| No sabre hits against units | ML, RI | §3 |

Leaders of every nation (`FR/LDR`, `BR/LDR`, `PT/LDR`, `AL/LDR`) all use §2.7.

French lancers (`FR/LNC`) and Guard light cavalry (`FR/GLC`) are not in the base box and no base battle uses them
(R7); their rows, with the Spanish and Swiss rows, are in §15.1 (S13).

### 2.2 France (FR) — moving fire rounds up

| Code | Unit | Blocks | Move | Melee dice | Standing fire | Moving fire | Range | Retreat / flag | Flags ignored | Sabre hits | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LN | Line infantry | 4 | 0–1 & battle | b, **b+1 if the target is an infantry unit** (R2) | b | ⌈b/2⌉ | 2 | 1 | 0 | yes | The +1 applies to attack, battle back, First Strike and its share of Combined Arms against infantry (squares included); not against cavalry, artillery or a leader (R2). |
| LT | Light infantry | 4 | 0–1 & battle, or 2 & no battle | b | b+1 | ⌈b/2⌉+1 | 2 | 1 | 0 | yes | |
| GR | Grenadier | 4 | 0–1 & battle | b+1 | b | ⌈b/2⌉ | 2 | 1 | 1 | yes | No extra fire die (R1). |
| YG | Young Guard | 4 | 0–1 & battle, or 2 & no battle | b+1 | b+1 | ⌈b/2⌉+1 | 2 | 1 | 1 | yes | Guard infantry. |
| OG | Old Guard | 4 | 0–1 & battle | b+2 | b+1 | ⌈b/2⌉+1 | 2 | 1 | 2 | yes | Guard infantry. |
| ML | Militia | 4 | 0–1 & battle | b | b | ⌈b/2⌉ | 2 | **3** | 0 | **no** | Sabres still kill a lone leader (§3). |
| LC | Light cavalry | 4 | 0–3 & battle | b | — | — | — | 1 | 0 | yes | |
| HC | Heavy cavalry | 4 | 0–2 & battle | b+1 | — | — | — | 1 | 0 | yes | |
| CU | Cuirassier | 4 | 0–2 & battle | b+1 | — | — | — | 1 | 1 | yes | Ignores 1 hit in each **infantry** ranged attack against it (not artillery fire, not melee, not Retire and Reform) (R8, R34). |
| GHC | Guard heavy cavalry | 4 | 0–2 & battle | b+1 | — | — | — | 1 | 2 | yes | Guard cavalry. |
| FA | Foot artillery | 3 | 1 & no battle, or 0 & battle | §2.5 | §2.5 | cannot battle | 5 | 1 | 0 | yes | |
| HA | Horse artillery | 3 | 0–1 & battle, or 2 & no battle | §2.5 | §2.5 | §2.5 (no r4) | 4 | 1 | 0 | yes | 1 block: may not move and battle (R12). |
| GA | Guard foot artillery | 3 | 1 & no battle, or 0 & battle | §2.5 | §2.5 | cannot battle | 5 | 1 | 2 | yes | Moves as foot artillery (R13). |

### 2.3 Britain (BR) — moving fire rounds up

| Code | Unit | Blocks | Move | Melee dice | Standing fire | Moving fire | Range | Retreat / flag | Flags ignored | Sabre hits | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LN | Line infantry | 4 | 0–1 & battle | b | **b+1** | ⌈b/2⌉ (no +1) | 2 | 1 | 0 | yes | The +1 is lost when the unit moved (R5, R9). |
| LT | Light infantry | 5 | 0–1 & battle, or 2 & no battle | b | b+1 | ⌈b/2⌉+1 | 2 | 1 | 0 | yes | |
| RI | Rifle light infantry | 3 | 0–1 & battle, or 2 & no battle | b | b+1 | ⌈b/2⌉+1 | **3** | 1 | 0 | **no** | Sabres still kill a lone leader. |
| GR | Grenadier | 4 | 0–1 & battle | b+1 | b+1 | ⌈b/2⌉+1 | 2 | 1 | 1 | yes | British grenadiers do get the fire die (R1). |
| GG | Guard grenadier | 5 | 0–1 & battle | b+1 | b+1 | ⌈b/2⌉+1 | 2 | 1 | 2 | yes | Guard infantry. |
| LC | Light cavalry | 3 | 0–3 & battle | b | — | — | — | 1 | 0 | yes | |
| HC | Heavy cavalry | 3 | 0–2 & battle | b+1 | — | — | — | 1 | 0 | yes | |
| GHC | Guard heavy cavalry | 3 | 0–2 & battle | b+1 | — | — | — | 1 | 2 | yes | Guard cavalry. |
| FA | Foot artillery | 3 | 1 & no battle, or 0 & battle | §2.5 | §2.5 | cannot battle | 5 | 1 | 0 | yes | |
| HA | Horse artillery | 3 | 0–1 & battle, or 2 & no battle | §2.5 | §2.5 | §2.5 (no r4) | 4 | 1 | 0 | yes | 1 block: may not move and battle. |

### 2.4 Portugal (PT) and the Allied contingents (AL) — moving fire rounds down

**PT**

| Code | Unit | Blocks | Move | Melee dice | Standing fire | Moving fire | Range | Retreat / flag | Flags ignored | Sabre hits | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LN | Line infantry | 4 | 0–1 & battle | b | b | ⌊b/2⌋ | 2 | 1 | 0 | yes | Moving fire 0 at 1 block: cannot fire, whatever card ordered it (R5, R15). |
| LT | Light infantry | 3 | 0–1 & battle, or 2 & no battle | b | b+1 | ⌊b/2⌋+1 | 2 | 1 | 0 | yes | |
| ML | Militia | 4 | 0–1 & battle | b | b | ⌊b/2⌋ | 2 | **3** | 0 | **no** | Moving fire 0 at 1 block: cannot fire, whatever card ordered it (R15). |
| LC | Light cavalry | 3 | 0–3 & battle | b | — | — | — | 1 | 0 | yes | |
| HC | Heavy cavalry | 3 | 0–2 & battle | b+1 | — | — | — | 1 | 0 | yes | |
| FA | Foot artillery | 3 | 1 & no battle, or 0 & battle | §2.5 | §2.5 | cannot battle | 5 | 1 | 0 | yes | |

**AL** (Nassau, Hanover, Dutch-Belgian and Brunswick units at 014–015). Every value is the Portuguese one, except that
`AL/LN` retreats **2** hexes per flag (R10). AL units belong to the British side: they are friendly to British and
Portuguese units and leaders, and AL leaders attach to any unit of that side (R10).

| Code | Unit | Blocks | Move | Melee dice | Standing fire | Moving fire | Range | Retreat / flag | Flags ignored | Sabre hits | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LN | Line infantry | 4 | 0–1 & battle | b | b | ⌊b/2⌋ | 2 | **2** | 0 | yes | Moving fire 0 at 1 block: cannot fire, whatever card ordered it (R15). |
| LT | Light infantry | 3 | 0–1 & battle, or 2 & no battle | b | b+1 | ⌊b/2⌋+1 | 2 | 1 | 0 | yes | |
| ML | Militia | 4 | 0–1 & battle | b | b | ⌊b/2⌋ | 2 | **3** | 0 | **no** | Moving fire 0 at 1 block: cannot fire, whatever card ordered it (R15). |
| LC | Light cavalry | 3 | 0–3 & battle | b | — | — | — | 1 | 0 | yes | |
| FA | Foot artillery | 3 | 1 & no battle, or 0 & battle | §2.5 | §2.5 | cannot battle | 5 | 1 | 0 | yes | |

### 2.5 Infantry fire dice by blocks (the formulas above, worked out)

"S" = standing (did not move), "M" = moved (1 hex; 2 hexes only under Force March, R73). Columns are the unit's current
blocks. These are base dice before cards and terrain (§3.2). A 0 (PT/LN, PT/ML, AL/LN, AL/ML at 1 block, moved) means
the unit cannot fire, whatever card ordered it: no card bonus creates the shot (R5, R15).

| Unit | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|
| FR/LN, FR/GR, FR/ML — S | | 4 | 3 | 2 | 1 |
| FR/LN, FR/GR, FR/ML — M | | 2 | 2 | 1 | 1 |
| FR/LT, FR/YG, FR/OG — S | | 5 | 4 | 3 | 2 |
| FR/LT, FR/YG, FR/OG — M | | 3 | 3 | 2 | 2 |
| BR/LN — S | | 5 | 4 | 3 | 2 |
| BR/LN — M | | 2 | 2 | 1 | 1 |
| BR/LT, BR/GG — S | 6 | 5 | 4 | 3 | 2 |
| BR/LT, BR/GG — M | 4 | 3 | 3 | 2 | 2 |
| BR/RI — S | | | 4 | 3 | 2 |
| BR/RI — M | | | 3 | 2 | 2 |
| BR/GR — S | | 5 | 4 | 3 | 2 |
| BR/GR — M | | 3 | 3 | 2 | 2 |
| PT/LN, PT/ML, AL/LN, AL/ML — S | | 4 | 3 | 2 | 1 |
| PT/LN, PT/ML, AL/LN, AL/ML — M | | 2 | 1 | 1 | 0 |
| PT/LT, AL/LT — S | | | 4 | 3 | 2 |
| PT/LT, AL/LT — M | | | 2 | 2 | 1 |

A light unit (LT, RI, YG) that moved 2 hexes cannot fire (or melee). Coming out of square, being rallied and being
placed by Short Supply are not movement (R5). Where the 2011 web reference card shows other numbers for BR/LT, BR/RI or
PT/LT, this table wins (R5).

### 2.6 Artillery dice by range

Artillery dice do not equal blocks; they come from this table and change only at 1 block (R11). r1 is adjacent, which
is always melee; r2–r5 are fire. "—" = 0 base dice, so the unit cannot battle at that range; no card bonus (Bombard,
Élan, Leadership, Fire and Hold) creates the shot **[Interp R15]**.

| Unit | Blocks | r1 (melee) | r2 | r3 | r4 | r5 |
|---|---|---|---|---|---|---|
| FA | 3 or 2 | 4 | 3 | 2 | 1 | 1 |
| FA | 1 | 3 | 2 | 1 | 1 | — |
| GA | 3 or 2 | 5 | 3 | 2 | 1 | 1 |
| GA | 1 | 4 | 2 | 1 | 1 | — |
| HA, did not move | 3 or 2 | 3 | 2 | 1 | 1 | — |
| HA, did not move | 1 | 2 | 1 | 1 | — | — |
| HA, moved 1 hex | 3 or 2 | 3 | 2 | 1 | — | — |
| HA, moved 1 hex | 1 | — | — | — | — | — |
| FA, GA moved; HA moved 2 | any | — | — | — | — | — |

* GA's +1 is in melee only (R11).
* Cards add dice (§12) only to a shot the unit could already make, never at a "—" cell: a 1-block FA cannot fire at r5,
  nor a moved HA at r4, under any card (R11, R15).
* The rows govern **declaration**. A unit reduced after it declared keeps its battle and rolls the value for its new
  block count: an HA that moved 1 hex, declared a melee and was cut to 1 block by First Strike still melees with 2 dice
  (R12).
* A battle back is made on the opponent's turn, when the artillery has not moved that turn: it uses the "did not move"
  rows.

### 2.7 Leaders (LDR)

| Property | Value |
|---|---|
| Blocks | 1 (not a unit) |
| Move | 0–3 hexes, alone or detached (§6, §7) |
| Battle | Never; a lone leader cannot battle, battle back or play First Strike |
| Attached effect | The unit may ignore 1 flag (§10); +1 die only when the unit is ordered by the Leadership card (R20) |
| No other effect | Never adds dice or hits otherwise, never enables a bonus melee, take ground or breakthrough (R20, R37) |
| Lone leader | Counts as 1 supporting unit (R22); may be attacked in melee, never fired at (R6) |
| Nation | Any friendly leader may attach to any friendly unit (R10) |
| Banner | 1 to the enemy when killed or eliminated; none when he leaves by his own baseline (R65) |

## 3. Dice and hit scoring

### 3.1 Faces

Each die has 6 equally likely faces: **2 infantry**, 1 cavalry, 1 artillery, 1 flag, 1 sabre (R16). There is no
helmet or leader face.

| Roll | Fire | Melee (against a unit) | Melee or escape against a lone leader | Retire and Reform roll | Leader casualty check |
|---|---|---|---|---|---|
| Symbol matching the target's arm | 1 hit | 1 hit | no effect | cavalry symbol only: 1 hit | no effect |
| Other arm symbol | miss | miss | no effect | miss | no effect |
| Sabre | miss | 1 hit, except when rolled by ML or RI (0) | **kills him**, even from ML or RI | miss | counts toward the kill (§11) |
| Flag | retreat (§10) | retreat (§10) | no effect | ignored | no effect |

* **Combined Arms:** the artillery dice score sabres as the melee unit does: they hit unless the melee unit is ML or RI
  (R17). Artillery sabres always score in the artillery's own melee.
* Hits are applied before retreats. Each hit removes 1 block; hits beyond the target's blocks are lost (R16).
* An eliminated unit's flags have no effect; the attached leader follows §11.2.

### 3.2 How many dice

Work out each battling unit's dice in this order (R5, R31):

1. **Base:** infantry fire = blocks (standing) or the halved value (moved 1 hex, or 1–2 under Force March, R73; §2.5); infantry melee = blocks;
   cavalry melee = blocks; artillery = §2.6.
2. **Unit type bonus** from §2 (for example +1 for `FR/LT` fire, +1 for `HC` melee, +1 for `FR/LN` melee against
   infantry). For moving fire the bonus is added after halving.
3. **Card additions** for ordered units on the active turn (§12): Bombard, Cavalry Charge, Élan, Fire and Hold, Give
   Them the Cold Steel, Leadership, Bayonet Charge.
4. **Cap:** an infantry unit in square rolls at most 1 die in fire and melee; a cavalry unit meleeing a square rolls at
   most 1 die. Steps 2–3 never lift these above 1 (R31).
5. **Terrain reductions** (§4), subtracted after the cap (R31).
6. **Floor at 0.**

**Zero base dice:** base fire dice are the §2.5 or §2.6 cell for that target, type bonus included. If that cell is 0
or "—", the unit cannot fire at that target, and no card (Élan, Leadership, Fire and Hold, Bombard) creates the shot
**[Interp R15]**.

Otherwise, a unit may declare fire or melee only if this total (plus any Combined Arms artillery dice) is at least 1.
If its dice fall to 0 after declaration (a square formed, First Strike losses), the attack still goes ahead with no dice, has no
effect, and still counts as the unit's battle for the turn; a 0-die melee against a lone leader does not make him
retreat **[Interp R15]**.

### 3.3 Lone leaders and escape

* A lone leader can never be the target of fire (R6).
* Melee against a lone leader: the attacker rolls its normal melee dice for that hex, terrain and card additions
  included, but the `FR/LN` +1 does not apply **[Interp R2]** (R21). Any sabre kills him; nothing else affects him.
* Leader escape (§11.4): the enemy unit rolls its normal melee dice with its own type bonus and formation cap (a square
  rolls 1) but **no** terrain and **no** card additions; any sabre kills (R24).

### 3.4 Leader casualty checks

The opponent always rolls (R18). Details and timing are in §11.1.

| Situation | Dice | Kills the leader |
|---|---|---|
| Attached leader's unit lost blocks but survives | 2 | 2 sabres |
| Attached leader's unit eliminated | 1 | 1 sabre (otherwise he retreats, §11.2) |

## 4. Terrain

Reductions are subtracted from the battling unit's dice (§3.2 step 5), read for the battling unit's arm and for fire or
melee. "Into" = the target stands on the terrain; "out" = the battling unit stands on it. A unit battling back or using
First Strike works its reductions as if it were the attacker: its own hex is "out of", the enemy's hex is "into" (R3).

### 4.1 Movement, battle, squares, line of sight, flags

| Terrain | Movement | Battle the turn it is entered | Square allowed | Blocks line of sight | Flag effect |
|---|---|---|---|---|---|
| Open | none | yes | yes | no | — |
| Forest | stop on entry (units and leaders) | **no**, except LT, RI, YG | yes | yes | — |
| Hill | none | yes | yes | special (§8.3) | — |
| Rugged hill | impassable | no unit can be there; no battle into it | — | yes | — |
| Town / Windmill | stop on entry (units and leaders) | **no** | **no** | yes | — (006 fortress: §14) |
| Field Works | stop on crossing a works hexside, either direction (units and leaders) | yes | yes, unless the cavalry attacks across a works hexside (§4.4) | no (a hill under it still blocks as a hill) | infantry and artillery (squares included) attacked across a works hexside ignore 1 flag; cavalry never (R23) |
| River | impassable (no unit or leader can enter); crossed only at a bridge or ford | no melee into or out of a river hex; units on opposite banks are not adjacent (R48) | — | no | — |
| Fordable river | stop on entry (units and leaders) | yes | yes (R69) | no | — |
| Bridge | cancels the river's or fordable river's movement and battle limits (no reductions) | yes | yes | no | — |
| Sand quarry | stop on entry; **impassable to artillery** | yes | yes | no | — |

* Retreats (§10), leader retreats (§11) and Retire and Reform (§9.4) ignore all terrain except impassable terrain
  (R42).
* A unit that entered a forest by moving 2 hexes (LT, RI, YG) cannot battle anyway (§7).
* Terrain in the target's own hex never blocks line of sight (R44).
* Scenario rules change some of these per battle (fords, streams, the Portina Brook): §14 and R47, R83.
* Map tile names: river bends, river ends (stream sources) and Y junctions are River hexes (art only); the 013 ford tile
  is a fordable river hex (§14.13); an entrenchment is Field Works (on open ground or on a hill); the 006 Fortress of
  Almeida is a Town (R84); a town with windmill is Town / Windmill. Walled Farm tiles are not used in the base game
  (R72).

### 4.2 Battle dice reductions

Values are subtracted (shown as negatives). Cavalry never fires, so fire columns are I / A only. "n/a" = that arm
cannot be on the terrain.

| Terrain | Into, fire I / A | Into, melee I / C / A | Out, fire I / A | Out, melee I / C / A | Notes |
|---|---|---|---|---|---|
| Forest | −1 / −1 | −1 / −2 / −1 | 0 / −1 | 0 / −2 / −1 | |
| Town / Windmill | −2 / −1 | −2 / −3 / −1 | 0 / −1 | 0 / −3 / −1 | A cavalry unit loses its Cavalry Charge dice when battling into or out of a town (R60). |
| Field Works (across a works hexside only) | −1 / 0 | −1 / −2 / 0 | 0 / 0 | 0 / −2 / 0 | "Out" applies only when battling out across a works hexside. Cavalry Charge dice are kept (R46). No effect through an open hexside. |
| Fordable river | 0 / 0 | −1 / −1 / −1 | −1 / −1 | −1 / −1 / −1 | |
| Sand quarry | −1 / −1 | 0 / −2 / 0 | 0 / n/a | 0 / −2 / n/a | 4th-edition values; artillery −1 only when firing into it (R71). |
| Open, Bridge | 0 | 0 | 0 | 0 | |

**Hill** reductions depend on the relation between the two hexes, counted once per battle (R3, R43). A Field Works hill
hex is a hill hex.

| Relation | Fire I / A | Melee I / C / A |
|---|---|---|
| Uphill: battling unit not on a hill, target on a hill hex | −1 / 0 | −1 / −1 / 0 |
| Downhill: battling unit on a hill hex, target not on a hill | 0 / 0 | 0 / −1 / 0 |
| Hill to hill: both on hill hexes (the same hill or another) | −1 / 0 | 0 / 0 / 0 |
| Neither on a hill | 0 / 0 | 0 / 0 / 0 |

### 4.3 Combining reductions

Total reduction = "out" value of the battling unit's hex + "into" value of the target's hex + the hill relation value,
each for the battling unit's arm and for fire or melee (R3). Example: cavalry in a forest meleeing infantry in a town
rolls −2 −3 = −5. A unit in a ford attacking another ford hex takes both penalties (R47). The rule that Field Works
"do not stack" limits only the target hex's terrain and never cancels the battling unit's "out of" value: infantry on a
fordable river attacking across a works hexside rolls −1 −1 = −2 **[Interp R3]**.

**Field Works on a hill** (R45, R79): when the battle crosses a works hexside of a Field Works hill hex, use the Field
Works value and **ignore the hill relation**: attacking into it (so cavalry hill to hill across works rolls −2), and
also battling out of it across a works hexside (only the works "out" values: cavalry −2, infantry and artillery 0)
**[Interp R79]**. When it comes through an open hexside the hill relation applies and the works give nothing. Field Works
on open ground add to the hill relation like any other terrain (R3).

### 4.4 Field Works hexsides

* Each Field Works tile protects only the hexsides drawn on it (its works hexsides); the others are open (R46).
* **Across a works hexside** **[Interp R46]**: let D be the works hex and N the hex across one of its works hexsides. A hex A is across
  that hexside when the angle at D's centre between the directions D→N and D→A is at most 30°. That is the closed 60°
  wedge projecting out from the hexside: N itself, and every hex further out between (and on) the two lines from D's
  centre through that hexside's corners. A hex beside N (60° off) is not in the wedge. For melee this means exactly:
  the attacker stands on N (R46).
* An attack (fire or melee) is across a works hexside when the attacker's hex is across any works hexside of the
  target's hex. Only then do the works give their reductions, their flag-ignore (infantry and artillery only) and forbid
  forming square (R23, R26, R46).
* A unit on a works hex battles out across a works hexside when the target's hex is across one of its own works
  hexsides (same test with the roles swapped): cavalry then rolls −2 (§4.2).
* Moving from D to N, or from N to D, across a works hexside stops the move in the hex entered. Retreats ignore works.

## 5. Turn sequence and Command

### 5.1 Setting up

Scenario data gives the board, units, leaders, hand sizes, starting player, banner target and special rules. Shuffle
the 70 Command cards (§12) and deal each side its hand. 012 places two French squares at setup (§14).

### 5.2 The turn

0. **Turn start:** temporary turn-start banners are awarded now, before the card is played (§13.3).
1. **Command phase:** play 1 card face up. If it can order nothing, skip phases 2–4 and go to phase 5.
2. **Order phase:** announce every unit and leader ordered, within the card's limits (§6).
3. **Movement phase:** move ordered units and leaders one at a time, each completed before the next (§7). All
   movement is finished before any battle.
4. **Combat phase:** battle with ordered units one at a time, each unit's combat (with all its follow-ups) completed
   before the next unit's begins (§8, §9).
5. **Draw phase:** discard the played card and draw 1 (§12.4 for Scout, Élan and First Strike).

The game ends the moment a side reaches its banner target, whatever phase or player's turn (§13).

### 5.3 Command

* **Command** = the number of Command cards in the player's hand, **including** the card just played. Cards on the
  square track are never counted (R28).
* Each unit in square therefore lowers Command by 1: its card is on the track, and the hand stays one card short until
  the card returns when the unit leaves square or is eliminated (a player draws only one card per turn) (R28).
* Command for Assault, Élan and Rally is fixed when the card is played. A square that comes out during that turn's
  Order phase returns its card to the hand but does not raise that card's Command **[Interp R28]**.
* Example: hand of 5 with one unit in square = 4 cards in hand; playing Assault gives Command 4 (R52).

## 6. Orders, leaders attaching and detaching, ordering a square

### 6.1 Orders

* Only ordered units and leaders may move, battle or take a special action. Each unit or leader gets at most one order
  per turn. Orders beyond the eligible units or leaders are lost.
* Section cards order "units or leaders" in named sections; a piece on a dotted-line hex may be ordered from either
  section (§1). Tactic cards name what they order (§12); where no location is named, anywhere on the board.
* An ordered unit or leader need not move or battle.

### 6.2 Attached leaders

* A leader in the same hex as a friendly unit is **attached**. Ordering the unit orders its attached leader with it
  (one order); the leader moves with the unit.
* **Detaching** costs one order for the leader and is allowed only when the card is a Section card, Leadership,
  La Grande Manoeuvre, or the order is an Élan flag result (or a Counter-Attack copying one of these). The unit he
  leaves is not ordered by that order; ordering it too costs a second order. With two orders the owner chooses whether
  the leader or the unit moves first.
* A leader that ends his move in the hex of a friendly unit that has no leader **attaches** and stops. Attaching does
  not order that unit, nor the unit he left. A unit that a leader joined may not move afterwards this turn (it may still
  battle in place if ordered; it may have moved before he joined).
* Two leaders may never share a hex.
* A leader attached to a unit **in square** cannot be ordered to detach. When the square is ordered and comes out of
  square, the leader may detach the same turn with an additional order (R32).

### 6.3 Ordering a square

* A unit in square is ordered like any unit. When ordered, it may come out of square only if **no enemy cavalry unit is
  adjacent at that moment** (in the Order phase); if cavalry is adjacent it stays in square all turn, even if the
  cavalry is driven off later (R32).
* Coming out: the counter returns to the track and the card to the hand. The unit then moves and battles normally;
  coming out is not movement, so it may fire with standing dice (R32, R5).
* A unit that stays in square cannot move; it may battle (§9.5).
* La Grande Manoeuvre's group order cannot be given to a square; its "order 1 unit" option and any other order can
  (R32, R62).

## 7. Movement

### 7.1 Movement allowances

| Units | Allowance |
|---|---|
| LN, GR, OG, GG, ML | 0–1 hex and battle |
| LT, RI, YG | 0–1 hex and battle, or 2 hexes and no battle (neither fire nor melee) |
| LC | 0–3 hexes and battle |
| HC, CU, GHC | 0–2 hexes and battle |
| FA, GA | 1 hex and no battle, or no move and battle (R13) |
| HA | 0–1 hex and battle (no fire at r4), or 2 hexes and no battle; a 1-block HA may not move and battle (R12) |
| Leader (lone or detached) | 0–3 hexes; never battles |

Cards change these (§12): Bayonet Charge, Force March, Cavalry Charge, Bombard, La Grande Manoeuvre.

### 7.2 Movement rules

* Move one ordered unit or leader at a time; finish it before starting the next. Each moves at most once per turn.
* A unit may not enter or pass through a hex holding any other unit (friend or foe) or an enemy leader.
* A unit without an attached leader may enter a hex holding a lone friendly leader; it stops there and the leader
  attaches. A unit with an attached leader may not enter it, and so cannot pass through it either (R80).
* A lone or detached leader may pass through hexes with friendly units (with or without a leader) and lone friendly
  leaders; he may not end on another friendly leader (lone or attached); he may stop on a friendly unit without a
  leader and attach (§6.2). He may not enter an enemy unit's or enemy leader's hex except by escape (§11.4).
* Terrain (§4.1) applies to units and leaders alike: forest, town, windmill, fordable river and sand quarry stop on
  entry; crossing a works hexside stops; river and rugged hill are impassable; sand quarry is impassable to artillery.
* No unit or leader may move off the board unless a scenario allows it (§13.4).
* **"Moved"** (for fire dice and battle limits) means the unit moved at least 1 hex in this turn's Movement phase.
  Taking ground, breakthrough, retreats, Retire and Reform, coming out of square, rallying and Short Supply are not
  movement (R5).
* A unit that entered a forest (except LT, RI, YG) or a town / windmill this turn may not battle this turn (R42).

## 8. Fire

### 8.1 Who and what

* Only infantry and artillery fire. Cavalry and leaders never fire.
* The target must be an enemy **unit** at distance ≥ 2 and within range: infantry 2, RI 3, FA / GA 5, HA 4 (3 after
  moving 1 hex), and artillery only where its §2.6 cell is not "—" (a 1-block FA / GA reaches r4, a 1-block HA r3). Range counts the target's hex but not the firer's (= hex distance).
* A lone leader can never be fired at (R6).
* A unit adjacent to any enemy unit may not fire at all; if it battles it must melee an adjacent enemy unit. An
  adjacent lone enemy leader does not prevent fire.
* A unit in square may fire only if no enemy unit is adjacent, with at most 1 die (R33).
* Each ordered unit makes at most one battle (fire **or** melee) per turn, at one target, with all its dice.

### 8.2 Procedure

1. Announce the firer and target; check range and line of sight.
2. Work out the dice (§3.2).
3. Roll. Score hits (matching arm symbol only; §3.1). A Cuirassier ignores 1 hit per infantry fire attack.
4. Remove blocks; leader casualty check if the target lost blocks (§11.1).
5. Apply flags (§10).

No battle back, no Retire and Reform, no take ground after fire.

### 8.3 Line of sight

* Draw a line from the centre of the firer's hex to the centre of the target's hex. It is blocked if any intermediate
  hex (not the firer's or the target's) is **obstructed**.
* **Obstructed hexes:** any hex holding a unit or a leader (friend or foe); forest, town / windmill, rugged hill; a hill
  hex as below; and the off-board area beyond each lateral edge, including the part hexes on the short rows **[Interp R50]**.
  The baselines play no part in line of sight.
* If the line runs exactly along a hexside, it is blocked only if the hexes on **both** sides are obstructed (R49,
  R50).
* **Hills** (R49): an intermediate hill hex is obstructed, except when the firer and the target both stand on hill
  hexes of the same connected hill and that intermediate hex belongs to that hill (the plateau); a unit or leader on such
  a plateau hex still obstructs. Consequences: a unit on lower ground sees onto the first hill hex of a hill and is seen
  from it, but not through one hill hex onto a second; units on two hills separated by lower ground see each other unless
  an intermediate low hex is obstructed.
* Field Works, river, fordable river, bridge and sand quarry do not obstruct (R44); a Field Works hill hex obstructs as
  a hill.

### 8.4 Hill batteries

An artillery unit on a hill hex may fire over one friendly unit or leader on an **adjacent** hex of lower elevation
(a non-hill hex), provided that hex has no line-of-sight-blocking terrain: that hex is treated as unobstructed, and the
rest of the line is checked normally. The target may be at any elevation, including another hill across low ground
**[Interp R14]**. Only artillery may do this, only over the adjacent hex, and never for Combined Arms (§9.6).

## 9. Melee

### 9.1 Who and what

* Every unit may melee an adjacent enemy unit or lone enemy leader (a leader alone never battles). A FA / GA that
  moved, a HA that moved 2, a 1-block HA that moved, and a LT / RI / YG that moved 2 may not (§7.1).
* A unit that entered a forest (except LT, RI, YG) or a town / windmill this turn may not melee (R42); nothing can
  melee into a rugged hill or into or out of a river hex (R48).
* Melee by several units against one target is made one attacker at a time, except Combined Arms (§9.6).

### 9.2 Sequence

1. **Declare** the attacking unit, the target and any Combined Arms artillery (§9.6), before any dice.
2. **Defender's reaction** — at most one per melee (R77) **[Interp R77]**. The attacker asks first about Retire and
   Reform or forming square, then about First Strike:
   * **Retire and Reform** (§9.4) if the target is cavalry attacked by infantry; a cavalry unit that declares it cannot
     then play First Strike in that melee;
   * **Form square** (§9.5) if the target is infantry attacked by cavalry and it may form square;
   * **First Strike** (§12.3) if he holds it, took neither option above, and the attacker is not battling back;
   * none.
   A square attacked by cavalry always fires first (§9.5) without any choice.
3. **Dice** (§3.2), then **roll**, **score hits** (§3.1), **remove blocks**, **leader casualty check** (§11.1),
   **retreats** with flag-ignores (§10).
4. **Additional actions** if the defender was eliminated or left its hex (including a lone leader killed or retreated,
   and a Retire and Reform): take ground (§9.7) or cavalry breakthrough and bonus melee (§9.8).
5. **Battle back** (§9.3) if the defender is still in its hex with at least 1 block, unless an exception in §9.3 or
   §9.5 applies (Retire and Reform, First Strike, a square that already fought first).

### 9.3 Battle back

* The defender battles back if at least 1 block survived and it did not leave its hex (a defender that failed a
  retreat and lost blocks for it still battles back) (R38).
* It uses its normal melee dice (§3.2 steps 1–2, cap and terrain), with its own terrain reductions (R3); card additions
  never apply to it, because it is not the active player's ordered unit. Its hits and flags work as usual against the
  attacker (who may ignore flags as usual, §10).
* **No battle back:** against fire; after a Retire and Reform; by a unit that used First Strike; against a battle back;
  by a lone leader.
* A defender attacked by several units battles back against each in turn while it survives in place.
* Against Combined Arms it battles back against the infantry or cavalry unit, never the artillery (R38).
* A unit battling back never takes ground or breaks through; First Strike cannot be played against it (R38).

### 9.4 Retire and Reform (cavalry)

* **Trigger:** a cavalry unit attacked in melee by an infantry unit (including an infantry-led Combined Arms attack
  and a square ordered to attack) may declare Retire and Reform after the attack is announced and before any attacking
  dice are rolled. **Not** against fire, artillery or cavalry; not against an infantry battle back; and a cavalry unit
  that attacked an infantry unit cannot Retire and Reform from that infantry's First Strike roll (R34).
* **Path:** exactly 2 hexes, each step to a retreat neighbour (§1), i.e. each hex closer to the cavalry's own
  baseline. A hex with any unit or an enemy leader, impassable terrain, or the board edge blocks it; terrain that only
  stops movement does not **[Interp R34]**. A cavalry unit without an attached leader may instead retire 1 hex onto a
  lone friendly leader and stop there (he attaches). A cavalry unit that has a leader may pass through a lone friendly
  leader's hex but may not end on it. If no legal path exists it cannot Retire and Reform (R34).
* **Hits:** the attacker rolls all its dice (Combined Arms artillery dice included, R40); only **cavalry symbols**
  score; sabres and flags are ignored; a Cuirassier cannot ignore a hit. Any hit triggers a leader casualty check
  (§11.1).
* **After:** if it survived, the cavalry moves its 2 hexes (or 1 onto a leader). It does not battle back. The infantry
  may take ground (R34).

### 9.5 Infantry squares

**Forming** (R26, R27):
* An infantry unit of any type and size may form square when an enemy cavalry unit declares a melee against it on the
  enemy's turn (an initial or a bonus melee, Combined Arms included).
* It may **not** form square when:

| # | Condition |
|---|---|
| a | its owner holds 2 or fewer Command cards (square-track cards do not count) |
| b | it is on a Town or Windmill hex |
| c | it is on a Field Works hex and the cavalry attacks across a works hexside (through an open hexside it may) (R70) |
| d | the cavalry is battling back |
| e | the infantry is attacking the cavalry and the cavalry plays First Strike |
| f | its owner plays First Strike against that melee |
| g | all 4 spaces of the owner's square track are full |

* A unit forced out of its hex and then attacked again by the same cavalry's bonus melee may form square for that new
  melee (R26).
* **Procedure:** the attacking player's side takes one card at random from the defender's hand without seeing it; it
  goes face down on the defender's square track and the matching numbered counter (1–4) goes on the unit. The owner may
  look at his track cards but never rearranges them. The engine picks the card uniformly with the seeded game RNG; the
  attacker learns only that a card left the hand (R27).

**A square fights first against cavalry** (R29):
* Whenever enemy cavalry melees an infantry unit in square (the turn it forms and every later melee), the square rolls
  first with 1 die (cap, then terrain). Every flag it rolls is a **bounce flag** (§10.3).
* If the cavalry is neither eliminated nor forced out of its hex, it then rolls its capped die (at most 1, R31) plus
  any Combined Arms artillery dice; the square does **not** battle back afterwards.
* Exception: when the square itself is ordered to attack cavalry, the cavalry may play First Strike and roll first
  (with at most 1 die).

**Infantry and artillery against a square:** they fire and melee with their normal dice and roll first; a square
attacked in melee then battles back with 1 die (R29, R31). A square's flags against infantry or artillery are ordinary
flags (R30).

**Other properties** (R31, R33):
* Dice: at most 1 in fire and melee; only Combined Arms adds dice (the square's die plus the artillery's).
* A square cannot move, take ground or break through. It may be ordered to battle: fire only if no enemy unit is
  adjacent; melee normally (with 1 die).
* Retreats: each retreat hex it cannot complete costs 1 block, so every accepted flag costs it its full per-flag
  distance in blocks (`ML` in square loses 3 per flag).
* Flags: it may ignore flags for an attached leader, its unit type and Field Works, never for support. It gives
  support to units not in square.
* It cannot be chosen for Short Supply. It can be rallied (it is then ordered and may come out of square under §6.3)
  **[Interp R33]**.
* When it loses its last block, the counter returns to the track and the card to the owner's hand; the enemy gains the
  normal banner. A square counter is never a block.

### 9.6 Combined Arms

* **Who:** when an ordered infantry or cavalry unit declares a melee against an enemy unit, one or more ordered
  artillery units of the same player may combine with it. The target must be an enemy unit, never a lone leader (R76). Each
  artillery unit must not yet have battled this turn, must be able to battle (§2.6, §7.1), be within its range of the
  target at a cell that is not "—" (R15), and have a **clear** line of sight: no unit or leader of either side and no sight-blocking terrain in any
  intermediate hex, under the hexside rule (R39). Unlike ordinary fire, a hill battery may **not** fire over an adjacent
  lower friendly unit **[Interp R39]**. An artillery unit adjacent to the target always qualifies. An artillery unit
  adjacent to some other enemy unit may join only a Combined Arms attack on an adjacent enemy (R39).
* **Declared** with the melee, before the defender's reaction and before any dice (R40).
* **Dice:** each unit works out its own dice: the melee unit as usual (capped at 1 against a square, or as a square);
  each artillery unit from §2.6 (melee dice if adjacent, range dice otherwise) with its own card additions and its own
  terrain reductions (out of its hex, into the target's, hill relation between its hex and the target's). All dice are
  rolled together; hits and flags apply together; sabres per §3.1 (R41). The melee unit's share may be 0 while the
  artillery still rolls.
* **Spent:** an artillery unit that joins has made its one battle for the turn, even if its dice are lost; each
  artillery unit joins at most one combat per turn (R4).
* **Lost dice:** if a square fighting first eliminates or bounces the cavalry, or the defender's First Strike
  eliminates the melee unit or forces it out of its hex, the artillery dice are not rolled and the artillery is still
  spent **[Interp R40]**. If the melee unit survives in place, its dice are recounted for its remaining blocks and the
  artillery dice are rolled with them (R40).
* Against Retire and Reform the artillery dice are still rolled; only cavalry symbols score (R34, R40).
* Flags from the artillery dice in a roll that includes a square's die against cavalry are bounce flags (R30).
* A cavalry bonus melee may be a Combined Arms attack with any ordered artillery unit that has not yet battled this
  turn (R41). There is no Combined Arms in a battle back, and only the active player's ordered units can combine (R41).
* The defender battles back against the melee unit; First Strike is aimed at the melee unit (R38, R63).

### 9.7 Taking ground (infantry)

* When an attacking infantry unit's melee eliminates the defender or forces it (or a lone leader) out of its hex,
  including a Retire and Reform, it may move into the vacated hex. Optional (R35).
* Subject to terrain movement: it may enter a forest, town, ford or cross a works hexside, and stops there.
* **Never** take ground: after fire; a unit in square; an artillery unit; a unit battling back; a unit that used First
  Strike; a unit that this turn already entered a hex that stops movement (forest, town / windmill, fordable river,
  sand quarry, a hex reached by crossing a works hexside, or a lone friendly leader's hex) **[Interp R35]**. A unit that
  began the turn in such a hex and did not move may advance out of it normally (R35).
* No bonus melee for infantry or artillery, ever (R37).

### 9.8 Cavalry breakthrough and bonus melee

* When an attacking cavalry unit's melee eliminates the defender or forces it (or a lone leader) out of its hex, it may
  move into the vacated hex and then, optionally, 1 more hex in any direction; moving back into its original hex still
  counts as a breakthrough. Both steps obey terrain: entering a stop hex ends the move. The same limits as §9.7 apply
  (no breakthrough after a stop-hex entry this turn, none in a battle back or after First Strike) (R35, R36).
* **Bonus melee:** only a cavalry unit that entered the vacated hex may make one, against any adjacent enemy unit or
  lone leader (not necessarily the first target). It is a full melee: the defender may form square or play First
  Strike and battles back normally. Terrain battle limits apply: cavalry that broke through into a forest or town hex
  cannot make it (R36).
* If the bonus melee also succeeds, the cavalry may move into that vacated hex only: no extra hex and no further
  attack.
* Each cavalry unit makes at most one bonus melee per turn (R37).
* Turn-long card additions (Cavalry Charge, Élan, Leadership) apply to the bonus melee; Give Them the Cold Steel's +1
  does not (R36, R61).
* The initial melee, breakthrough and bonus melee all finish before the next unit's combat.

## 10. Retreats and ignoring flags

### 10.1 Retreat movement

* After hits are removed and the leader casualty check is made, each flag not ignored moves the unit its per-flag
  distance (§2: 1, `AL/LN` 2, `ML` 3) toward its own side. Total distance = accepted flags × per-flag distance.
* Each step must move to one of the hex's retreat neighbours (§1), regardless of where the attack came from; never
  sideways or toward the enemy. The owner chooses the path.
* A step may not enter a hex with any other unit (friend or foe) or an enemy leader, impassable terrain, or leave the
  board. Other terrain is ignored (no stopping).
* **Leaders stop retreats:** a unit without an attached leader may retreat onto a lone friendly leader; he attaches and
  the retreat ends there (remaining hexes are cancelled, not lost): a path ending on him is a complete retreat (R74). A unit with an attached leader may pass through a
  lone friendly leader's hex but may not end its retreat there (R75).
* Each retreat hex that cannot be completed costs 1 block. If any legal path completes the full distance, the owner
  must take one (his choice among them); otherwise he takes a path going as far as possible and the unit loses 1 block
  per hex short (R74).
* An attached leader retreats with his unit. Block losses from a failed retreat trigger a leader casualty check unless
  the same roll already caused one (§11.1).
* A unit in square never moves: every retreat hex costs 1 block (R33).
* Retreats never carry a unit off the board, not even where an exit objective exists (R67).

### 10.2 Ignoring flags (Bolster Morale)

Ignoring is optional and chosen flag by flag; the sources add up (R23):

| Source | Flags | Conditions |
|---|---|---|
| Attached leader | 1 | If the unit lost blocks in that roll, only if he survived the casualty check (R18). |
| Support | 1 | 2 or more friendly units, squares or lone leaders adjacent, in any mix; more never give a second (R22). Never for a unit in square. |
| Field Works | 1 | Infantry and artillery (squares included) attacked across a works hexside (§4.4). Not cavalry. |
| GR, CU | 1 | Unit type. |
| YG | 1 | Unit type. |
| OG, GG, GHC, GA | 2 | Unit type. |
| Scenario | per §14 | 006 Almeida fortress: 1 for British-side units (BR, PT) on a fortress hex (R23, R84). |

A unit may ignore flags each time it is attacked. Lone leaders are not affected by flags at all.

### 10.3 Bounce flags

* Every flag rolled by an infantry unit in square against a cavalry unit is a **bounce flag**, including flags from the
  artillery dice of a Combined Arms roll that includes the square's die (R30).
* A bounce flag can **never** be ignored: no leader, support, unit type or other source counts (R30).
* The cavalry retreats its per-flag distance (1 hex for every base-game cavalry unit) and loses 1 block per hex it
  cannot complete.

## 11. Leaders

### 11.1 Casualty checks

The opponent always rolls (R18).

* **Unit loses blocks and survives** (from fire, melee, Retire and Reform, or a retreat it could not complete): roll 2
  dice; 2 sabres kill the leader (banner to the enemy).
* **Unit eliminated:** roll 1 die; 1 sabre kills him; otherwise he must retreat 1–3 hexes (§11.2). Flags rolled at the
  unit do not affect him.
* **One check per combat roll.** Order: remove hits, make the check, then resolve retreats. If hits left the unit
  alive (2-dice check made) and the failed retreat then destroys it, there is no second check; the surviving leader
  retreats from the hex where the last block was removed. If the unit took no hits but loses blocks only through a
  failed retreat, that loss triggers the check: 2 dice if it survives, 1 die if it is eliminated (R18).
* A leader killed in the check cannot provide his flag-ignore (R18).
* A battle back, a bonus melee and each escape roll are separate rolls.

### 11.2 Leader whose unit is destroyed

After surviving the 1-die check he retreats 1–3 hexes (§11.3) (R19).
* If he is on his own baseline he must leave the map: no banner for the enemy.
* If enemy units fill every retreat path he must escape (§11.4). This also applies when his unit lost its last block
  because enemy units filled its only retreat hexes.
* If impassable terrain stops him retreating even 1 hex, he is eliminated and the enemy gains a banner.
* Once he has left the hex, the attacker may take ground or break through into it (R19).

### 11.3 Leader retreat

* A retreating leader moves 1, 2 or 3 hexes toward his own side, each step to a retreat neighbour; the owner chooses
  the distance and path (R25).
* Non-impassable terrain has no effect. He may pass through hexes with friendly units (attached or not) and lone
  friendly leaders; he may stop and attach to a friendly unit that has no leader; he may not end on another friendly
  leader or on an enemy unit or leader; he passes enemy units only by escape (§11.4), which the owner may choose even when a free path exists. A hex holding only a lone enemy
  leader can be passed through with no roll (R24).
* Retreating off his own baseline, forced or by choice, removes him with no banner for the enemy (R25).

### 11.4 Lone leaders and escape

* **Lone leader attacked in melee** (R21): the attacker rolls its melee dice (§3.3). Any sabre kills him (banner).
  Otherwise flags have no effect and he must retreat 1–3 hexes (§11.3). There is no battle back. The attacker may then
  take ground or break through, and cavalry that broke through may make its bonus melee. A lone leader can never be
  fired at (R6).
* **Escape** (R24): when the leader's chosen retreat path enters a hex with an enemy unit (the owner may choose such a
  path even when a free one exists), he moves onto it and that enemy
  unit rolls (§3.3: normal melee dice, own type bonus and formation cap, no terrain, no cards). Any sabre kills him
  (even from ML or RI). If he survives he continues; a second enemy-occupied hex means a second escape roll; if a third
  hex is also enemy-occupied he is eliminated. Each elimination gives the enemy a banner.
* **Support:** a lone friendly leader adjacent to a unit counts as one supporting unit (R22).
* Objectives are never held by lone leaders (R65).

## 12. Command cards

The deck has **70** cards: 48 Section cards and 22 Tactic cards. "Units or leaders" means each order may go to a unit
or a leader; detaching follows §6.2.

### 12.1 Section cards (48)

All Section cards allow an attached leader to detach (except from a square). "Command" per §5.3.

| Card | Count (L / C / R) | Orders |
|---|---|---|
| Scout | 2 / 2 / 2 | 1 unit or leader in the section; Draw phase: draw 2, keep 1, discard 1 (§12.4) |
| Probe | 4 / 6 / 4 | 2 units or leaders in the section |
| Attack | 4 / 6 / 4 | 3 units or leaders in the section |
| Assault | 2 / 2 / 2 | up to Command units or leaders in the section (R52) |
| Coordinated Advance | 2 | 1 on the Left, 2 in the Centre, 1 on the Right |
| Flank Attack | 2 | 2 on the Left and 2 on the Right |
| Forward | 2 | 2 in each section |
| Recon in Force | 2 | 1 in each section |

Counts: Scout 6, Probe 14, Attack 14, Assault 6, the four multi-section cards 2 each = 48.

### 12.2 Tactic cards (22)

Terrain movement and battle restrictions still apply unless a card says otherwise. Card additions apply to ordered
units on the active turn only, never to a battle back on the opponent's turn. A square's or a cavalry-versus-square
roll is never lifted above 1 die (R31). "Fallback" = order 1 unit of the player's choice when he has **no** unit of the
named kind anywhere on the board; the unit so ordered (never a lone leader) uses only its own normal rules, with no
extra dice, no extra movement and none of the card's limits **[Interp R57]**.

| Card | Count | Effect |
|---|---|---|
| Bayonet Charge | 2 | Order up to 4 infantry units. They may move up to 2 hexes and still melee (LT, RI, YG included). They may not fire. Guard infantry (YG, OG, GG) melee with +1 die. Fallback: no infantry units. |
| Bombard | 2 | Order up to 4 artillery units. Each either moves up to 3 hexes and does not battle, or does not move and battles (fire, or melee if adjacent) with +2 dice (GA +3). HA has only these two choices **[Interp R59]**. Movement obeys terrain. The +2 (GA +3) is added only to a shot the unit could already make, never at a "—" cell (R59) **[Interp R15]**. Fallback: no artillery units. |
| Cavalry Charge | 3 | Order up to 4 cavalry and/or horse artillery units. Ordered cavalry rolls +1 die in every battle this turn (GHC +2), bonus melee included. HC, CU, GHC may move up to 3 hexes and still battle; LC moves its normal 3. HA moves and battles normally with no extra die. The bonus is lost battling into or out of a town / windmill, kept across Field Works (R60). Fallback: no cavalry and no horse artillery units. |
| Counter-Attack | 2 | Becomes a copy of the card the opponent played in Phase 1 of his last turn (§12.5). |
| Élan | 1 | Roll dice equal to Command. Each infantry, cavalry or artillery symbol orders 1 unit of that arm (HA is artillery); each flag orders any 1 unit or leader, and a flag-ordered leader may detach; sabres order nothing. Unused results are lost. Ordered units roll +1 die in every battle this turn, bonus melee and Combined Arms share included. Draw phase: reshuffle (§12.4) (R53). |
| Fire and Hold | 2 | Order up to 4 infantry and/or artillery units that are not adjacent to an enemy unit when ordered. They fire with +1 die and may not move before or after. A square with no enemy cavalry adjacent may come out of square and then fires with standing dice +1; one that stays in square fires 1 die. A unit that has an enemy retreat next to it before it fires cannot fire and may not melee instead (R58). Fallback: no infantry or artillery units. |
| First Strike | 2 | Reactive (§12.3). May also be played as one's own turn card, ordering nothing (R63). |
| Force March | 2 | Order **all** infantry units in one section (player's choice). LT, RI, GR, Guard infantry (YG, OG, GG) and any infantry unit with an attached leader may move up to 2 hexes and battle. Other infantry (LN, ML without a leader) may stay, move 1 hex and battle, or move 2 hexes and not battle. A unit that moved 1 or 2 hexes fires with moving dice (§2.5), so `BR/LN` loses its +1 **[Interp R73]**. Fallback: no infantry units. |
| Give Them the Cold Steel | 1 | Order every unit of the player adjacent to an enemy unit at the moment the card is played (lone leaders are not ordered). They may not move before melee and may not fire; each melee gets +1 die. After a successful melee, infantry may take ground and cavalry may break through and make a bonus melee with its standard dice (no +1). An ordered artillery unit adjacent to the same target may join a Combined Arms attack, and both units get the +1. A unit no longer adjacent when its turn to battle comes cannot battle (R61). |
| Leadership | 2 | Order every leader. A unit whose leader stays attached is also ordered; ordered units roll +1 die in each battle they make this turn, bonus melee included (R20) **[Interp R20]**. A leader may detach (his former unit is then not ordered); a leader that joins a unit does not order it. Fallback: no leaders. |
| La Grande Manoeuvre | 1 | Either order up to 4 units or leaders (not units in square) to move up to 4 hexes each with no battle, obeying all terrain movement rules; ordered leaders may detach. Or order 1 unit of the player's choice under its own normal rules (it may be a square) (R62). |
| Rally | 1 | Roll dice equal to Command. Each infantry, cavalry or artillery symbol returns 1 block to any under-strength unit of that arm anywhere on the board, split as the player likes; no unit may exceed the blocks it started the scenario with. Flags and sabres do nothing; leaders never return. Every unit that gains at least 1 block is ordered and may move and battle normally (R54). |
| Short Supply | 1 | Choose one unit, friendly or enemy, not in square (not a lone leader). Its owner places it on a hex of its **own** baseline in the same section that it may enter (vacant, not impassable to it); if none, on a vacant enterable hex of the row in front of that baseline in the same section. Lifted, not moved (no path); an attached leader goes with it. A unit on a dotted-line hex may use either section; if neither row has a legal hex it stays **[Interp R55]**. Orders no unit. A friendly unit so moved may not battle this turn; an enemy unit battles back normally later (R55). |

Counts: 2 + 2 + 3 + 2 + 1 + 2 + 2 + 2 + 1 + 2 + 1 + 1 + 1 = 22.

### 12.3 First Strike

* Played by the defender after a melee against his unit is declared and before the attacker's dice (R63).
* His unit battles first with its normal dice and terrain (no card additions). If the attacker is neither eliminated
  nor forced out of its hex, it then attacks as ordered (its dice recounted for its remaining blocks) and the defender
  does **not** battle back.
* Only one First Strike per melee. It may be used against a bonus melee but not against a battle back. It is aimed at
  the infantry or cavalry unit of a Combined Arms attack, never the artillery (R63).
* The unit that used it never takes ground or breaks through (it is not the attacker).
* An infantry unit whose owner plays First Strike may not form square against that melee, and the attacking cavalry
  cannot Retire and Reform from the First Strike roll. When an infantry unit attacks cavalry and the cavalry plays First
  Strike, the infantry may not form square against it (§9.4, §9.5).
* A defender may play more than one First Strike in a turn (one per melee). At the end of that turn he draws one
  replacement per First Strike played, all before the active player draws (R63, R78) **[Interp R78]**.

### 12.4 Draw phase details

* Normal: discard the played card face up, draw 1.
* **Scout** (R51): the played Scout goes to the discard pile, then the player draws 2 cards, keeps 1 and discards the
  other face up **[Interp R51]**. If the deck runs out between the two draws, the discard pile (now including the
  Scout) is shuffled into a new deck. Scout gives the 2-card draw even when it ordered no unit.
* **First Strike:** a player who played First Strike this turn draws his replacements first, one per First Strike
  (R51, R63, R78).
* **Élan** (R53): the played Élan is discarded, the discard pile is shuffled together with the draw deck, then the draws
  happen (First Strike player first); the Élan can be drawn straight back. Square-track cards are never shuffled in. A
  Scout discard of an unplayed Élan does not reshuffle.
* **Empty deck:** shuffle the discards to form a new draw deck.

### 12.5 Counter-Attack

* Played only as the player's own Phase 1 card; it becomes a copy of the Command card the opponent played in Phase 1
  of his last turn. A First Strike the opponent played reactively during your turn is not that card (R56).
* A copied Section card swaps Left and Right (Centre stays).
* Copying Scout gives Scout in the mirrored section, including its 2-card draw. Copying First Strike (discarded as the
  opponent's turn card) orders nothing; the turn ends with a normal draw **[Interp R56]**. Copying a Counter-Attack
  copies whatever that one copied; copying Élan also copies its reshuffle; copying Assault, Élan or Rally uses your own
  Command. Detaching is allowed whenever the copied card allows it.
* On the very first turn of a game (no opponent card yet) Counter-Attack orders nothing **[Interp R56]**.
* A copied card's fallback applies as for the original (R57).

## 13. Victory and objectives

### 13.1 Winning

* Each scenario sets a banner target per side. A side wins the instant its banner total reaches the target (R64).
* Check after every banner gained or lost, at once and wherever it happens: mid-combat, after a leader check, during a
  retreat, at turn start, or during a battle back (which can give victory to the non-active player).
* One event is applied fully before the check (for example a unit eliminated on its own objective hex gives the enemy a
  banner and removes its side's held banner at the same moment) **[Interp R64]**.
* **Banner total** = permanent banners + banners currently held from temporary objectives.

### 13.2 Banner sources

| Source | Banners | Rule |
|---|---|---|
| Enemy unit wholly eliminated (including by a failed retreat, and a square) | 1 permanent | R65 (012 weighting: §13.4) |
| Enemy leader killed or eliminated (casualty check, escape, failed retreat into impassable terrain) | 1 permanent | R65 |
| Leader leaving by his own baseline | 0 | R25 |
| Scenario objectives | §13.4 | Held only by units, never by lone leaders (R65) |

### 13.3 Temporary objectives: timing

* **Turn start:** if the objective's side has a unit on the hex at the start of **its own** turn (before playing a
  card), it gains the banner (R66).
* **Loss:** the banner is lost the instant the unit leaves the hex (move, retreat, Retire and Reform, take ground or
  breakthrough, Short Supply) or is eliminated, on either player's turn. It stays lost even if another unit of that side
  enters the hex later that turn; it can be regained only at a later start of that side's own turn (R66).
* A banner never accumulates: holding a hex for several turns still gives 1.
* A banner gained at turn start that reaches the target wins at once.

### 13.4 Objective types (data definitions)

Each objective is one record in the scenario data. Fields are listed per type.

**`tempHex`** — temporary hex, turn start (001, 013, 014, 015).

| Field | Meaning |
|---|---|
| `side` | The side that can gain it. |
| `hex` | One hex. A battle with several such hexes has one record per hex. |
| `timing` | `turnStart` (the only timing in the base game). |
| `banners` | 1. |
| Gain | §13.3: a unit of `side` on `hex` at the start of `side`'s turn. |
| Lose | §13.3. |

**`tempGroup`** — temporary group, turn start (003).

| Field | Meaning |
|---|---|
| `side` | The side that can gain it. |
| `hexes` | All hexes of the group (003: the two Vimiero town hexes). |
| `timing` | `turnStart`. |
| `banners` | 2 (003), gained and lost together. |
| Gain | Units of `side` on **every** hex of the group at the start of `side`'s turn. |
| Lose | Both banners the instant **either** hex holds no unit of `side`; they come back only at a later start of `side`'s turn with every hex held (R66; booklet 003: "immediately lost"). |

**`exit`** — breakthrough exit (006 only; R67).

| Field | Meaning |
|---|---|
| `side` | The side whose units may exit (006: British side, i.e. BR, PT). |
| `hex` | The exit hex (006: the bridge hex). |
| `banners` | 1 permanent per unit exited, whatever its strength. |
| Gain | During its normal move, an ordered unit of `side` steps off the board from `hex`; stepping off costs 1 hex of its allowance, so it may reach `hex` and exit in one move if its allowance permits (FA and GA, moving 1, must start on `hex`). No start-of-turn requirement. A unit whose move has already been stopped (terrain, a joined leader) cannot step off. It is removed and does not battle **[Interp R67]**. |
| `leadersScore` | false: a leader may exit the same way but gives nothing to either side. |
| `retreatOff` | false: retreats never carry a unit off; each blocked hex costs 1 block. A unit eliminated on `hex` gives the enemy only the ordinary kill banner, not an extra one (R67). |

No other edge exits exist in the base game (R67).

**`killWeight`** — elimination weighting (012).

| Field | Meaning |
|---|---|
| `side` | The side that receives the banners (012: British side). |
| `enemyArm` | The arm counted (012: infantry). |
| `first` | Banners for the first such enemy unit eliminated (012: 1). |
| `later` | Banners for each later one (012: 2). |
| Note | Replaces the 1-banner kill for that arm only; other enemy losses (cavalry, artillery, leaders) count normally (R65). |

## 14. Base-scenario special rules

Each battle's rules, as data a scenario file carries. Setups (terrain, units, leaders) come from the verified
transcriptions in `design/data/NNN.json`; hexes are given as (r, c) in the §1 grid, from those files, and the
transcription notes are in `design/data/notes-*.md`. In all 15 battles the **top** army is the British side (BR, with PT or AL
where present) and the **bottom** army is the French (FR). Only the Command card number on the maps is a hand
size; the Tactician numbers are ignored (R86). Every battle also scores the ordinary banners of §13.2.

**Fields used below.**
* `hand`: Command cards dealt to top / bottom; `first`: the side that takes the first turn; `banners`: the target for
  both sides.
* `objectives`: records of §13.4 (`tempHex`, `tempGroup`, `exit`, `killWeight`).
* `rivers`: how the map's River hexes behave: `impassable` (§4.1 River; bridge hexes cross), `fordable` (every River
  hex is a Fordable river hex: stop on entry, its battle reductions, §4.1–§4.2), `fordableNoStop` (fordable river whose
  entry does not stop movement, R83), `brook` (005 only, R83).
* `sideRules`: rules that fall on one side, naming it.
* `setup`: anything placed at the start beyond units, leaders and terrain.

| Battle | hand (top / bottom) | first | banners | objectives | rivers | other |
|---|---|---|---|---|---|---|
| 001 | 6 / 5 | top | 5 | 2 × `tempHex` (top) | fordable | — |
| 002 | 6 / 5 | top | 5 | — | — (no river) | rugged hills |
| 003 | 6 / 5 | bottom | 6 | `tempGroup` (bottom, 2 banners) | fordable | rugged hills (4 hexes) |
| 004 | 5 / 5 | bottom | 6 | — | fordable | — |
| 005 | 6 / 5 | bottom | 7 | — | brook | Field Works on a hill |
| 006 | 4 / 4 | top | 6 | `exit` (top) | impassable | fortress, windmill, Field Works |
| 007 | 6 / 5 | bottom | 6 | — | fordable | — |
| 008 | 6 / 5 | bottom | 7 | — | — (no river) | — |
| 009 | 6 / 5 | top | 6 | — | impassable | — |
| 010 | 6 / 5 | bottom | 6 | — | impassable | — |
| 011 | 6 / 5 | top | 6 | — | fordableNoStop | — |
| 012 | 6 / 6 | bottom | 6 | `killWeight` (top) | — (no river) | squares at setup |
| 013 | 6 / 5 | top | 6 | 2 × `tempHex` (top) | fordable, ford tile no stop | — |
| 014 | 6 / 5 | bottom | 9 | `tempHex` (bottom) | fordableNoStop | Allied contingent |
| 015 | 6 / 6 | bottom | 8 | 3 × `tempHex` (bottom) | — (no river) | Allied contingent, impetuous cavalry, sand quarry |

### 14.1 001 Roliça (French First Position)

* `objectives`: `tempHex` × 2, `side` top, `timing` turnStart, `banners` 1 each, `hex` (8,2) and (8,11): the two hill
  hexes on the French baseline (`design/data/001.json`). Any unit of the British side (BR or PT) holds them **[Interp R81]**.
* `rivers`: fordable (the whole river, R47).

### 14.2 002 Roliça (French Second Position)

* No special rules or objectives. The rugged hills are impassable and block line of sight (§4.1).

### 14.3 003 Vimiero

* `objectives`: `tempGroup`, `side` bottom, `timing` turnStart, `banners` 2, `hexes` (1,3) and (1,4): the two Vimiero
  town hexes (`design/data/003.json`). Both must hold French units at the start of the French turn; both banners go the
  instant either hex holds no French unit (R66). A BR/LN starts on (1,3).
* `rivers`: fordable (the Maceiro River, R47).

### 14.4 004 Corunna

* `rivers`: fordable (all streams, both pieces, the junction and the stream ends included, R47).

### 14.5 005 Talavera

* `rivers`: brook. The Portina Brook's River hexes stop movement on entry (units and leaders), cause no battle
  reductions, allow squares and do not block line of sight; a unit that entered one this turn may not take ground or
  break through (R47, R83) **[Interp R83]**.
* Field Works on a hill at (2,0), works hexsides SW, SE, E (`design/data/005.json`; a BR/FA starts on it): §4.3–§4.4,
  R45, R79.

### 14.6 006 River Côa

* `hand` 4 / 4.
* `objectives`: `exit`, `side` top (BR, PT), `hex` (0,4): the bridge hex on the British baseline; the unit steps off the
  top edge of the board from it (`design/data/006.json`). 1 permanent banner per unit exited, whatever its strength;
  leaders may exit but score nothing; no start-of-turn requirement; FA moving 1 must start on the hex (§13.4, R67).
* `retreatOff` false: a British-side unit on the bridge hex that must retreat stays and loses 1 block per hex it cannot
  complete; if eliminated, the French gain only the ordinary kill banner (R67).
* `rivers`: impassable except at the bridge hex (0,4) (R47).
* `sideRules`: the two Fortress of Almeida hexes (0,11) and (0,12) are Town hexes; a British-side unit (BR or PT) on one
  may ignore 1 flag whenever flags are rolled against it; French units there get nothing (R84). The windmill hex (4,10)
  is Town / Windmill.
* Field Works on open ground: (2,4) with works hexsides W, SW, SE, and (2,5) with SW, SE, E; a PT/LT starts on each.

### 14.7 007 Bussaco (Reynier's Assault)

* `rivers`: fordable (the stream, R47).

### 14.8 008 Bussaco (Ney's Assault)

* No special rules or objectives.

### 14.9 009 Combat at Redinha

* `rivers`: impassable except at the bridge hex (6,2) (the Ancos River, R47).
* Pack is a Portuguese leader stacked with a PT/LN (R72); any friendly leader may attach to any friendly unit (R10).

### 14.10 010 Salamanca (Attack on the French Left)

* `rivers`: impassable except at the bridge hex (4,1) (the Azan River, R47).

### 14.11 011 Salamanca (Attack on the French Right)

* `rivers`: fordableNoStop. Every Pela Gracia River hex is a fordable river whose entry does not stop movement (units and
  leaders); its fordable-river battle reductions apply; entering it does not bar taking ground or breakthrough **[Interp R83]**.
  Bridge hex (3,10) (R47).

### 14.12 012 García Hernández

* `hand` 6 / 6.
* `setup`: the two FR/LT units at (3,8) and (3,9) start in square, with French square counters 1 and 2. After the
  French hand is dealt, 2 random cards (seeded RNG) go face down on the French square track: the French start with 4
  cards in hand, Command 4. Normal square rules apply from then on (R85, R26–R33).
* `objectives`: `killWeight`, `side` top, `enemyArm` infantry, `first` 1, `later` 2: the first French infantry unit
  eliminated gives the British 1 banner, each later one 2; French cavalry, artillery and leaders give 1 as usual (R65).
  The French score kills normally.

### 14.13 013 Combat at Aire

* `objectives`: `tempHex` × 2, `side` top, `timing` turnStart, `banners` 1 each, `hex` (7,0) Nauzeilles and (8,11)
  Seminary, both town hexes (`design/data/013.json`). Any unit of the British side (BR or PT) holds them **[Interp R81]**.
* `rivers`: fordable. Every River Grave hex is a fordable river (stop on entry), except the ford tile hex (2,8), which has
  the same battle effects but does not stop movement **[Interp R83]**. Bridge hexes (3,1) and (3,10) (R47).
* The French leaders Harispe and Villatte, missing from the older map, are placed as lone leaders (setup per
  `design/data/013.json`, R72).

### 14.14 014 Quatre Bras

* `objectives`: `tempHex`, `side` bottom, `timing` turnStart, `banners` 1, `hex` (1,5): the Quatre Bras town hex
  (`design/data/014.json`).
* `rivers`: fordableNoStop (the whole stream, as at 011): fordable-river battle effects, no movement stop, no bar on
  taking ground **[Interp R83]**. Bridge hexes (5,4) and (5,10) (R47).
* The Nassau, Hanover and Dutch units are `AL/*` rows (§2.4, R10); no side rule.

### 14.15 015 Waterloo

* `hand` 6 / 6.
* `objectives`: `tempHex` × 3, `side` bottom, `timing` turnStart, `banners` 1 each, `hex` (3,5) La Haye Sainte, (4,1)
  Hougoumont, (4,12) Papelotte (`design/data/015.json`). All three are ordinary Town hexes with no flag-ignore **[Interp R72]**.
* The Nassau, Hanover, Dutch and Brunswick units are `AL/*` rows (§2.4, R10); no side rule.
* `sideRules` (top): **impetuous British cavalry** (R72, R82) **[Interp R82]**. For `BR/LC`, `BR/HC`, `BR/GHC` only (not `AL/LC`), after
  a successful attacking melee, and only when §9.8 allows a breakthrough (not after entering a stop hex this turn,
  R35):
  * after the initial melee the unit **must** move into the vacated hex, then **must** move 1 more hex if a legal one
    exists: a vacant hex it may enter, adjacent to the vacated hex in the row next toward the French baseline (row + 1),
    and not its original hex; the Allied player chooses between two; none if the vacated hex stopped its movement;
  * the bonus melee stays optional; after a successful bonus melee it **must** move into that vacated hex (no extra hex);
  * never in a battle back, and never for a unit that used First Strike (§9.7).
* Sand quarry at (2,6) (§4, R71); a BR/RI starts on it.

## 15. Expansion #1 rules

Expansion #1 (*The Spanish Army*, battles 101–118) adds the Spanish nation (`SP`), Swiss infantry for both sides, French
lancers and Guard light cavalry, Guerrilla Action, new terrain tiles, and new objective and side rules. Its rulings are
the S rows of `design/exp1-rulings.md`: a statement settled by a row cites it as (S<n>); one resting on an `[Interp]`
row carries **[Interp S<n>]**. Every rule of §1–§14 and every R ruling applies to the expansion unless this section
changes it; S40 lists the changes.

**Sides.** In every battle 101–118 the **top** army is the Allied side (Spanish, or British with Spanish and Portuguese
units) and the **bottom** army is the French. The engine knows only top and bottom: a rule that falls on one side names
that side in the scenario data (§15.8) and never goes by nation or army name. The side that holds Guerrilla counters is
**the guerrilla side** and the other **its opponent**.

### 15.1 Spanish, Swiss and new French unit rows

Notation as §2. "M" columns are the values after the unit **moved** this turn (§15.2); moving fire and moving melee
never go below 0, and a 0 is a "–" cell (§15.2). Spanish and both Swiss rows round moving fire **down** (R5, S14).

| Key | Unit | Blocks | Move | Range | Fire, standing | Fire, moved | Melee, standing | Melee, moved | Retreat / flag | Flags ignored | Sabre hits | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SP/LN` | Line infantry | 4 | 0–1 & battle | 2 | b | ⌊b/2⌋−1 | b | b−1 | **2** | 0 | yes | S1. |
| `SP/LT` | Light infantry | 5 | 0–1 & battle, or 2 & no battle | 2 | b | ⌊b/2⌋ (no −1) | b | b−1 | **2** | 0 | yes | Light: may battle the turn it enters a forest (R42) (S2). |
| `SP/GR` | Grenadier | 4 | 0–1 & battle | 2 | b | ⌊b/2⌋ | b+1 | b+1 | **2** | 1 | yes | No moving melee penalty; battle back and First Strike b+1; no extra fire die (S3). |
| `SP/ML` | Militia | 4 | 0–1 & battle | 2 | b | ⌊b/2⌋−1 | b | b−1 | **3** | 0 | **no** | Sabres still kill a lone leader; in a Combined Arms roll it leads, the artillery's sabres do not score either (R17) (S4). |
| `SP/SWI` | Swiss infantry | 5 | 0–1 & battle | 2 | b **[Interp S11]** | ⌊b/2⌋ | b | b | 1 | 0 | yes | May form square (S11). |
| `SP/LC` | Light cavalry | 3 | 0–3 & battle | — | — | — | b | b | **2** | 0 | yes | S5. |
| `SP/HC` | Heavy cavalry | 3 | 0–2 & battle | — | — | — | b+1 | b+1 | **2** | 0 | yes | Heavy: moves 3 under Cavalry Charge (R60) (S5). |
| `SP/CU` | Cuirassier | 3 | 0–2 & battle | — | — | — | b+1 | b+1 | **2** | 1 | yes | Ignores 1 hit in each infantry ranged attack against it (as `CU`, §2.2); a lancer attacking it never re-rolls flags (§15.4) (S5). |
| `SP/FA` | Foot artillery | 3 | 1 & no battle, or 0 & battle | 5 | §2.6 FA | cannot battle | §2.6 FA (r1) | cannot battle | 1 | 0 | yes | Identical to the base foot artillery (S6). |
| `FR/SWI` | Swiss infantry | 5 | 0–1 & battle | 2 | b **[Interp S11]** | ⌊b/2⌋ | b | b | 1 | 0 | yes | Not `FR/LN`: never the French line +1 melee die (S11). Battle 101's break rule: §16.1. |
| `FR/LNC` | Light lancers | 4 | 0–3 & battle | — | — | — | b | b | 1 | 0 | yes | Flag re-roll (§15.4) (S12). |
| `FR/GLC` | Guard light cavalry | 4 | 0–3 & battle | — | — | — | b | b | 1 | **2** | yes | Guard cavalry: +2 under Cavalry Charge (R60) (S13). |

* **Classes (§2.1).** Infantry: `SP/LN`, `SP/LT`, `SP/GR`, `SP/ML`, `SP/SWI`, `FR/SWI`. Light-infantry movement:
  `SP/LT`. Grenadier (Force March): `SP/GR`. Cavalry: `SP/LC`, `SP/HC`, `SP/CU`, `FR/LNC`, `FR/GLC`. Heavy cavalry:
  `SP/HC`, `SP/CU`. Guard cavalry (+2 on Cavalry Charge): `FR/GLC`. Artillery with foot artillery movement: `SP/FA`. No
  sabre hits against units: `SP/ML`. No new row is Guard infantry or Guard artillery.
* Every cavalry unit, whatever its retreat distance, Retire and Reforms exactly 2 hexes (S5, R34).
* `SP/LDR` is an ordinary leader (§2.7, S6). The two Swiss leaders of 101 are an `SP/LDR` and an `FR/LDR` (S11). Any
  friendly leader attaches to any friendly unit, whatever its nation (S27).
* `FR/GA` is unchanged (§2.2, S13). §2.1's note that `FR/LNC` and `FR/GLC` are unused holds only for the base game.
* `FR/LN`'s +1 melee die applies against every Spanish and Swiss infantry unit, squares included (R2, S14).
* Every unit of 101–118 starts at the block count of its row; no battle sets another strength (S41).

### 15.2 Moving penalties and 0-dice cells

**Moved** (S8). A unit has moved when it changed hex during its own Movement phase this turn, by 1 or 2 hexes and under
any card (Force March and Bayonet Charge included, R73). It has not moved if it stayed put, only came out of square,
was rallied, or was placed by Short Supply; taking ground or breaking through after a melee changes nothing.

* The moved values apply to the unit's fire, its melee and its share of a Combined Arms roll on that turn (S8).
* Battle back and First Strike, always on the enemy's turn, use the standing values (S8).
* A Spanish or Swiss unit rolling at an escaping leader (§3.3) uses its standing melee dice **[Interp S8]**; a lancer
  never re-rolls there (§15.4).

**Base dice by blocks** (the §15.1 formulas worked out; "S" standing, "M" moved; before card additions, the `FR/LN`
die, caps and terrain, §3.2).

| Unit | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|
| Fire: `SP/LN`, `SP/ML` — S | | 4 | 3 | 2 | 1 |
| Fire: `SP/LN`, `SP/ML` — M | | 1 | 0 | 0 | 0 |
| Fire: `SP/LT` — S | 5 | 4 | 3 | 2 | 1 |
| Fire: `SP/LT` — M | 2 | 2 | 1 | 1 | 0 |
| Fire: `SP/GR` — S | | 4 | 3 | 2 | 1 |
| Fire: `SP/GR` — M | | 2 | 1 | 1 | 0 |
| Fire: `SP/SWI`, `FR/SWI` — S | 5 | 4 | 3 | 2 | 1 |
| Fire: `SP/SWI`, `FR/SWI` — M | 2 | 2 | 1 | 1 | 0 |
| Melee: `SP/LN`, `SP/ML` — S | | 4 | 3 | 2 | 1 |
| Melee: `SP/LN`, `SP/ML` — M | | 3 | 2 | 1 | 0 |
| Melee: `SP/LT` — S | 5 | 4 | 3 | 2 | 1 |
| Melee: `SP/LT` — M | 4 | 3 | 2 | 1 | 0 |
| Melee: `SP/GR` — S or M | | 5 | 4 | 3 | 2 |
| Melee: `SP/SWI`, `FR/SWI` — S or M | 5 | 4 | 3 | 2 | 1 |
| Melee: `SP/LC` — S or M | | | 3 | 2 | 1 |
| Melee: `SP/HC`, `SP/CU` — S or M | | | 4 | 3 | 2 |
| Melee: `FR/LNC`, `FR/GLC` — S or M | | 4 | 3 | 2 | 1 |

A light unit (`SP/LT`) that moved 2 hexes cannot battle at all (§7.1), except where Bayonet Charge or Force March lets it (§12).

**A 0 fire cell** (S7, R15). A moved `SP/LN` or `SP/ML` with 1–3 blocks, or a moved `SP/LT`, `SP/GR` or Swiss unit with
1 block, cannot fire, and no card (Élan, Leadership, Fire and Hold) creates the shot, exactly as §3.2's zero base dice.

**A 0 melee cell** **[Interp S7]**. A moved `SP/LN`, `SP/LT` or `SP/ML` with 1 block has 0 base melee dice; this is a
value, not a ban. Its dice are worked out by §3.2 from that 0 (card additions, cap, terrain, floor at 0, never below
0), and it may declare a melee when that total plus any Combined Arms artillery dice is at least 1 (§3.2, R15). So:

* ordered by Leadership with its leader attached (+1), it may melee an enemy unit on open ground (1 die), but not one in
  a forest (1 − 1 = 0) unless an artillery unit joins;
* ordered by Probe (no card die), it may melee only by leading a Combined Arms attack, rolling no dice of its own while
  the artillery rolls (R41);
* in either case it still cannot fire (the 0 fire cell).

### 15.3 Retreats of 2 and 3 hexes

| Per-flag distance | Rows |
|---|---|
| 1 | `SP/FA`, `SP/SWI`, `FR/SWI`, `FR/LNC`, `FR/GLC` |
| 2 | `SP/LN`, `SP/LT`, `SP/GR`, `SP/LC`, `SP/HC`, `SP/CU` |
| 3 | `SP/ML` |

* Every flag not ignored moves the unit its full per-flag distance; total = accepted flags × distance. Ignoring a flag
  cancels its whole distance (S9).
* The path follows §10.1 unchanged: each step to a retreat neighbour; no step into a hex with any other unit or an
  enemy leader, into impassable terrain (an impassable river hex included), or off the board. If any legal path
  completes the distance the owner must take one; otherwise the longest possible, and the unit loses **1 block per
  hex short** (R74). A Spanish unit blocked at once therefore loses 2 blocks per accepted flag (`SP/ML` 3). Examples:
  an `SP/LN` on its own baseline with 1 accepted flag loses 2 blocks; an `SP/LN` with 2 accepted flags (4 hexes) whose
  only legal path ends after 1 hex moves that hex and loses 3.
* A retreat ending on a lone friendly leader is complete; the hexes left are cancelled, not lost (R74).
* **In square** the unit never moves, so it loses its whole per-flag distance in blocks per accepted flag: 2 for
  Spanish infantry, 3 for `SP/ML`, 1 for Swiss (S9, R33).
* **Bounce flags** against Spanish cavalry: 2 hexes per bounce flag, 1 block per hex not completed (S9, R30); bounce
  flags are never ignored (§10.3).
* Retire and Reform stays exactly 2 hexes (S5); a lone leader still retreats 1–3 hexes (R25); an attached leader
  retreats with his unit, and failed-retreat losses trigger the leader check as §10.1.
* A unit eliminated by a failed retreat is eliminated for every rule (the enemy's banner, §16.1's Swiss break,
  §16.5's sudden death).

### 15.4 Lancers and Guard light cavalry

**`FR/LNC` flag re-roll** (S12):

1. When an ordered lancer melees (an initial melee or a bonus melee), after its roll it re-rolls, once, every die that
   shows a flag, the artillery dice of a Combined Arms roll it leads included.
2. On the re-rolled dice, symbols matching the target and sabres score as in §3.1. Flags rolled on the re-roll are
   **added** to the flags of the first roll, which still count. A re-rolled die is never re-rolled again. The re-roll is
   logged as a second roll marked as a re-roll.
3. It applies against a square (to the lancer's single die, and any artillery dice with it) and against a lone leader,
   where a re-rolled sabre kills him **[Interp S12]**.
4. It never applies when the target is a cuirassier (`SP/CU`, `FR/CU`), in a battle back, or in a leader-escape roll. A
   defending lancer re-rolls only in its own First Strike roll (and not against a cuirassier).

**`FR/GLC`** (S13): 4 blocks, moves 0–3 and battles, melee b, ignores 2 flags, retreats 1 hex per flag, may Retire and
Reform, and rolls +2 under Cavalry Charge as Guard cavalry (R60).

### 15.5 Guerrilla Action

Only a battle whose data has a `guerrilla` side rule (§15.8) uses it: 101–113, 115, 117 and 118, never 114 or 116
(there Scout works normally and no counters exist) (S15).

**Counters** (S15, S16, S20):

* There are **6** counters. The guerrilla side starts holding the rule's `counters` (§16: 1 or 0); the others form the
  pool. Held + pool = 6 at all times; the opponent never holds any. Held counters are public and kept until spent.
* Counters belong to the side, not to a nation: they may be spent against any card the opponent plays, whatever it
  orders; any Scout the guerrilla side plays may gain one, whichever unit it orders; no minimum of Spanish units
  applies, and the rule stays in force after every Spanish unit is gone **[Interp S16]**.

**Spending a counter** (S17, S18, S45):

1. On every turn of the opponent, right after its Command card is played (turn-start banners already taken, §5.2) and
   before its Order phase, the guerrilla side is asked once whether to spend a counter, but only while it holds at
   least one **[Interp S45]**. The question names the card's effective kind (for a Counter-Attack, the card it copies).
   It is never asked on the guerrilla side's own turn, and never about a First Strike the opponent plays reactively.
2. Every card qualifies, Section or Tactic: Counter-Attack, Short Supply, Élan, Rally, and a First Strike played as the
   turn card included (S17).
3. **No:** nothing happens. **Yes:** the counter goes to the pool at once, and the opponent rolls **1** die. Nothing
   adds dice to that roll or changes its result (S18).
   * **Sabre:** the action fails; the card is carried out normally.
   * **Any other face:** the action succeeds; the card is cancelled (below). The spent counter is in the pool either
     way **[Interp S18]**.
4. At most one attempt per opponent turn (S17). The die is a random step, so undo cannot go back past it (as for every
   roll).

**A cancelled card** (S19, S21):

* It is discarded as the card the opponent played that turn: no unit or leader is ordered, nothing moves, no battle
  happens. Then the opponent draws **one** card in its Draw phase and the turn ends.
* A cancelled **Scout** gives that one card, not the two-and-keep-one draw. A cancelled **Élan** still reshuffles the
  discard pile into the deck before the draw (R53, §12.4). A cancelled **Rally** rolls no dice and returns no block. A
  cancelled **Short Supply** places no unit. A cancelled **Counter-Attack** is cancelled as the card it copied.
* It remains the card that turn's player played: a Counter-Attack on the next turn copies it in full (mirrored if a
  Section card, R56), as if it had not been cancelled, an Élan copy reshuffling again (S21).
* A cancelled turn has no melee, so no First Strike can be played in it (S21). Turn-start banners taken before the card
  stand (S17).
* A cancelled Cavalry Charge does not start Stewart's Folly at 115; one that stood does (§16.15, S37).

**Gaining a counter** (S20, S45):

* In the guerrilla side's Draw phase after it played a Scout (a Counter-Attack copying a Scout included), after any
  First Strike replacements of the opponent are drawn (R51) and before any of its own cards is drawn, it is asked
  whether to take a counter, only while the pool holds at least one **[Interp S45]**. **Yes:** it takes 1 counter from
  the pool and draws **1** card. **No:** the normal Scout draw (2, keep 1, §12.4).
* With an empty pool (6 held) it is not asked and draws normally. Six counters are the only limit on holding
  **[Interp S20]**. The question comes even when the Scout ordered nothing (§12.4).

**Other cards** (S21): the guerrilla side's own First Strike is never affected by counters; an opponent's
Counter-Attack is itself a card that may be cancelled.

### 15.6 Terrain: Walled Farm, 2- and 4-sided redoubts, river tiles and per-battle water

* **Walled Farm** (terrain `walledFarm`): a Town hex in every respect (§4.1–§4.2, R42–R44): stop on entry, no battle the
  turn it is entered, the Town reductions, Cavalry Charge's dice lost, no square, blocks line of sight, counts as a town
  for objectives. It gives **no** flag-ignore **[Interp S22]**. No battle 101–118 uses it.
* **2-sided and 4-sided redoubts** are `fieldworks` with 2 or 4 `sides` (3 in the base game), flat (`on: 'plain'`) or
  on a hill (`on: 'hill'`). Every Field Works rule applies unchanged with the listed works hexsides (§4.1–§4.4, R23,
  R26, R46, R70, R79): reductions, flag-ignore for infantry and artillery and the square ban apply only to an attack
  across a works hexside; the hill versions follow §4.3 (S23). In the battles: 105's 4-sided redoubt, 109's two flat
  3-sided works and 118's three hill works (§16); the 2-sided tiles are unused.
* **River tiles.** River bends, river ends (stream sources) and Y junctions are River hexes **[Interp S24]**; a bridge
  on a straight or bend river hex is a Bridge (R48); the ford tiles of 115 are fordable river hexes that do not stop
  movement (below).
* **Per-battle water** (S24). The battle's `rivers` rule applies to every River hex; a River hex may carry its own
  `river` rule, which replaces the battle's rule for that hex (§15.8; only 104 uses it).

| Rule | Battles |
|---|---|
| `fordable` (§4.1: stop on entry, fordable-river reductions) | 101, 102, 103, 110, 115, 117; 104's Shallow Stream (per hex) |
| `impassable` (crossed only at a bridge hex, where one exists) | 104 (River Trueba), 106, 107, 113, 114, 116, 118 |
| `brook` (as 005, R47, R83) | 109 |
| no river | 105, 108, 111, 112 |

* **115 fords** (S24, S42): every Albuera River hex is fordable and stops movement, except the four ford tile hexes
  (5,0), (5,1), (5,3) and (6,4), which keep the fordable-river battle effects but do not stop movement and do not bar
  taking ground or breakthrough (as 013's ford, §14.13) **[Interp S24]**. Bridge (5,9).
* **109 Portina Brook** is exactly 005's brook: it stops movement, has no battle reductions, allows squares, does not
  block line of sight, and a unit that entered it this turn cannot take ground or break through (S25).
* **108 Abbey of Santa Fe** is a Town hex with no extra effect (S26).

### 15.7 Mixed armies, the square track, first player

* **Mixed armies** (109, 114, 115, 116, 118; the Swiss at 101): each side is one player with one hand, one Command, one
  deck and one banner count. Every unit and leader of a side is friendly to every other, whatever its nation: any
  leader may attach to any friendly unit and gives his flag-ignore, support and escape cover across nations. The
  commander's name has no rules effect. A battle rule naming "the British player" or "the Spanish player" means that
  side and all its units (S27, R81). Block colours and the nation a leader is drawn in are presentation only.
* **Square track** (S28) **[Interp S28]**: each side has one track of 4 spaces, shared by all its nations' infantry
  (Spanish, British, Portuguese, Swiss). R26–R33 apply unchanged (§9.5); 106 adds its cap (§16.6).
* **First player** (S29): the bottom (French) side moves first in every battle except 106 and 108 (top side first) and
  116 (Move First by revealed cards, §15.8). The second number beside each commander on the maps (Tactician cards) is
  ignored (R86). Banner targets are the page values (§16).

### 15.8 Objective types and side rules added (data definitions)

Each record is part of the scenario data, as §13.4. Fields are listed per type; a field with a default may be omitted.
"Refused" gives the start of the message with which setup rejects bad data (each message ends with the battle id).

**`tempAny`** — temporary group held by any unit, turn start (115). A single-hex objective stays `tempHex` (§13.4; 113).

| Field | Meaning |
|---|---|
| `side` | The side that can gain it (115: bottom). |
| `hexes` | At least 2 hexes (115: the two Albuera hexes). |
| `timing` | `turnStart`. |
| `banners` | Default 1: one banner for the whole group, never one per hex. |
| Gain | At the start of `side`'s turn, if a unit of `side` stands on any hex of `hexes`, the banner is gained (or kept), and the units of `side` then on those hexes become its holders (`holders`), replacing any earlier holders (S35). |
| Lose | The instant no holder stands on a hex of `hexes`, on either turn (moved off, retreated, eliminated). A holder that moves from one hex of the group to another stays a holder. A unit of `side` that enters a hex during a turn becomes a holder only at the next start of `side`'s turn, so it does not keep the banner **[Interp S35]**. |
| Refused | `tempAny objective needs at least 2 hexes`. |

**`majority`** — group majority banner, turn start (114, 117).

| Field | Meaning |
|---|---|
| `side` | The side that can gain it. A group that both sides contest is **two records** with the same `hexes`, one per side. |
| `hexes` | At least 2 hexes: the group. |
| `banners` | Default 1. |
| `startHeld` | Default false. True if `side` holds the banner at setup (114: top; 117: top, all three groups). Setup refuses it unless `side` then has a majority. |
| Count | A side's count is the number of hexes of the group holding one of its units (lone leaders never count, R65). |
| Gain | At the start of `side`'s **own** turn, if its count is greater than the enemy's (1 against 0 is enough), it gains the banner. |
| Lose | The instant its count is no longer greater than the enemy's, on either player's turn: one of its units leaves the group (move, retreat, Retire and Reform, taking ground, breakthrough, Short Supply) or is eliminated, or an enemy unit enters a group hex to tie or pass it. It is regained only at a later start of `side`'s turn with a majority (S36). |
| Note | The two records of a group are never held together: a holder loses the instant the enemy ties it, and the enemy gains only with a greater count at its own turn start. The banner is temporary: it counts toward victory only while held (§13.1), and a turn-start gain that reaches the target wins at once (R64). |
| Refused | `majority objective needs at least 2 hexes`; `majority objective starts held by ${side} without a majority`. |

**`exitEdge`** — exits off a board edge (102).

| Field | Meaning |
|---|---|
| `side` | The side whose units may exit (102: top). |
| `row` | 0 or 8: the edge (102: 0, the top army's baseline). |
| `free` | Default 0. Exits that score nothing before banners start (102: 3). |
| `banners` | Default 1. Permanent banners for each unit exited after the first `free`. |
| Gain | An ordered unit of `side` on a hex of `row` may step off the board during its normal move; the step costs 1 hex of its allowance, so a unit that moves 1 must start on `row`, and a unit whose move was already stopped (terrain, joining a leader) cannot step off. It is removed, not eliminated: the enemy gains nothing. The first `free` exited units score nothing; each later one gives `side` `banners` permanent banners (S31) **[Interp S31]**. |
| Leaders | A leader may exit the same way, alone or with the unit he is attached to. He scores nothing, is not counted among `free`, and can no longer be killed. |
| Only ordered movement | Retreats, Retire and Reform, taking ground, breakthrough and Short Supply never carry a unit off (R67). A leader retreating off his own baseline is §11.3, unchanged. |
| Refused | `exitEdge row must be 0 or 8`. |

**`suddenDeath`** — instant win on losses of a named enemy row (105).

| Field | Meaning |
|---|---|
| `side` | The side that wins (105: bottom). |
| `keys` | Enemy unit rows counted (105: `SP/FA`). |
| `need` | Resolved at setup: the number of enemy units of `keys` on the board then (105: 3). |
| Win | `side` wins the instant the `need`-th enemy unit of `keys` is eliminated (by hits or a failed retreat, on either turn, in an attack, battle back or First Strike), checked with the banner check after every elimination (R64). A win reached in an earlier event stands; an event that both completes the count and brings `side` to its banner target is a win for `side` either way (S32). |
| `text` | The reason shown for that win. |
| Refused | `suddenDeath: no enemy unit of ${keys}`. |

**`guerrilla`** side rule (§15.5).

| Field | Meaning |
|---|---|
| `side` | The guerrilla side (top in every battle that has the rule). |
| `counters` | Counters held at the start, 0–6 (§16: 0 or 1); the pool is 6 − held. |
| Refused | `guerrilla counters must be 0..6`; `two guerrilla rules`. |

**`breakOnLosses`** side rule (101).

| Field | Meaning |
|---|---|
| `side` | The side whose units break (101: bottom). |
| `keys` | The rows that break (101: `FR/SWI`). |
| `losses` | The number of eliminations that breaks them (101: 2). |
| `start` | Resolved at setup: the units of `side` with a key in `keys` (101: 4). |
| Effect | The instant the `losses`-th such unit is eliminated (by hits or a failed retreat, on either turn), every remaining unit of `side` with those keys is **removed** from the board at once. The eliminations score the enemy their normal banners; the removals score nothing, cause no leader casualty check and count as an elimination for no other rule. A removed unit in square returns its card to the hand and its counter to the track (R33). A leader attached to a removed unit stays in the hex as a lone leader **[Interp S30]**. Victory is checked after the eliminating event (R64). |
| In a combat | A removed unit takes no further part: any step still pending by or against it (its battle, battle back, retreat, Combined Arms share, or an ordered battle later that turn) does not happen; the combat that caused the elimination finishes normally. |
| Refused | `breakOnLosses: unknown unit key`. |

**`handShrink`** side rule (106).

| Field | Meaning |
|---|---|
| `side` | The side whose hand shrinks (106: top). |
| `floor` | The lowest hand size, 1 to the hand size (106: 3). |
| Hand size H | Cards held plus cards on the side's square track; starts at the side's `cards`. |
| Effect | Each time the enemy gains a **permanent** banner while H > `floor`, H falls by 1 and one card is taken at once, uniformly at random (seeded RNG), from the cards `side` holds (never a square-track card, never the card played this turn) and goes face up to the discard pile. Two banners from one event cost two cards while H > `floor`. Temporary banners do not count **[Interp S33]** **[Interp S46]**. |
| No card to take | If `side` holds no card at that moment, H still falls and the card is taken the same way right after that side's next draw **[Interp S46]**. |
| Draw | The normal draws then keep the hand at H. Command (Assault, Élan, Rally) is the cards held (R28); holding 2 or fewer only stops new squares (R26 a). |
| Refused | `handShrink floor must be 1..cards`. |

**`squareCap`** side rule (106).

| Field | Meaning |
|---|---|
| `side` | The side capped (106: top). |
| `units` | The most units that may ever form square in the battle (106: 2). |
| Effect | A unit of `side` may form square only if it has formed square before in this battle (or started in square), or fewer than `units` different units of `side` have done so. Every other R26 limit still applies (S34) **[Interp S34]**. |

**`cavalryChargeFolly`** side rule (115).

| Field | Meaning |
|---|---|
| `side` | The side barred (115: top). |
| Active | On the enemy's turn, from the moment its card's effective kind is Cavalry Charge (a Counter-Attack copying Cavalry Charge included) until that turn ends, unless a Guerrilla counter cancelled the card. A counter whose die rolled a sabre leaves it active. |
| Effect | While active, no unit of `side` may form square and `side` may not play First Strike (S37) **[Interp S37]**. |

**`moveFirst`** scenario field (116): `moveFirst: 'reveal'`; `first` then names the tie side (116: top). Refused:
`moveFirst must be 'reveal'`. **[Interp S38]**, **[Interp S43]**, **[Interp S44]**.

1. After the hands are dealt and before the first turn, each side secretly picks one card from its hand. The top side is
   asked first, then the bottom side (S44).
2. Counter-Attack, Élan, First Strike, Leadership and Rally may not be picked. A side holding no other card is not asked:
   it picks nothing (S43).
3. Both picks are revealed together. Neither the AI nor the screen may read or show a side's pick to the other side
   before the reveal, and undo cannot take back a pick once revealed (S44).
4. **Values** (S38): Scout 1, Probe 2, Attack 3, Recon in Force 3, Coordinated Advance 4, Flank Attack 4, Forward 6,
   Assault = the picker's Command at the reveal; Bayonet Charge, Bombard, Cavalry Charge, Fire and Hold and La Grande
   Manoeuvre 4; Short Supply 1; Force March and Give Them the Cold Steel above every numbered card. A side that picked
   nothing counts above every card, Force March and Give Them the Cold Steel included (S43).
5. The lower value moves first; any tie (two equal values, or both sides picking nothing) goes to the `first` side.
6. Each side that picked must play its picked card on its first turn, where it is discarded as played. Until then the
   second player's card stays face up beside its hand: it counts as held for Command and for the two-card square limit
   (R26 a, R28), but the random square draw (R27) cannot take it. A side that picked nothing plays any card on its first
   turn. Cards not picked stay in hand; First Strike may be played from them reactively.

**Terrain entries** (§15.6):

| Field | Meaning |
|---|---|
| `t: 'walledFarm'` | A Walled Farm hex (a Town, name "Walled farm"). |
| `river` | On a River hex only: `impassable`, `fordable`, `fordableNoStop` or `brook`, replacing the battle's `rivers` rule for that hex; a `crossing` there works under this rule (104: the four Shallow Stream hexes, `fordable`). Refused: `unknown river rule ${x} at (r,c)`; `river override on a non-river hex at (r,c)`. |

## 16. Expansion #1 battle special rules

Each battle's rules, as data a scenario file carries, in the style of §14. Setups come from the verified
transcriptions `design/data/1NN.json` (notes and verification logs beside them); hexes are (r, c) in the §1 grid. The
**top** army is the Allied side and the **bottom** army the French (§15). Every unit starts at its row's block count
(S41). Every battle also scores the ordinary banners of §13.2.

**Fields used below** (as §14, with §15.8's additions).
* `hand`: cards dealt to top / bottom; `first`: the side that takes the first turn; `banners`: the target for both
  sides.
* `objectives`: §13.4 and §15.8 records.
* `rivers`: the battle's water rule (§15.6); a hex's own `river` rule is named where used.
* `sideRules`: §15.8 side rules, naming their side. `guerrilla n` = a `guerrilla` rule for the top side with `counters`
  n.

| Battle | hand (top / bottom) | first | banners | objectives | rivers | other |
|---|---|---|---|---|---|---|
| 101 | 5 / 5 | bottom | 7 | — | fordable | guerrilla 0; Swiss; `breakOnLosses` (bottom) |
| 102 | 4 / 5 | bottom | 6 | `exitEdge` (top, row 0, free 3) | fordable | guerrilla 0 |
| 103 | 5 / 6 | bottom | 6 | — | fordable | guerrilla 1 |
| 104 | 5 / 5 | bottom | 7 | — | impassable; Shallow Stream `fordable` per hex | guerrilla 1 |
| 105 | 4 / 6 | bottom | 7 | `suddenDeath` (bottom, `SP/FA`) | — (no river) | guerrilla 1; 4-sided redoubt; `FR/GLC`, `FR/GA` |
| 106 | 6 / 5 | top | 6 | — | impassable | guerrilla 1; `handShrink`, `squareCap` (top) |
| 107 | 5 / 5 | bottom | 6 | — | impassable | guerrilla 1 |
| 108 | 5 / 5 | top | 6 | — | — (no river) | guerrilla 1; abbey (Town) |
| 109 | 5 / 5 | bottom | 6 | — | brook | guerrilla 1; two flat redoubts; SP and BR |
| 110 | 6 / 6 | bottom | 8 | — | fordable | guerrilla 1 |
| 111 | 5 / 6 | bottom | 7 | — | — (no river) | guerrilla 1; cavalry only; `SP/CU` |
| 112 | 4 / 5 | bottom | 6 | — | — (no river) | guerrilla 0; `FR/LNC` |
| 113 | 4 / 5 | bottom | 6 | `tempHex` (bottom, bridge) | impassable | guerrilla 0 |
| 114 | 6 / 5 | bottom | 7 | 2 × `majority` (top held at start) | impassable | no guerrilla; BR, SP, PT |
| 115 | 5 / 5 | bottom | 8 | `tempAny` (bottom, 1 banner) | fordable, 4 ford tiles no stop | guerrilla 0; `cavalryChargeFolly` (top); `FR/LNC`; BR, SP, PT |
| 116 | 5 / 4 | `moveFirst` (tie: top) | 9 | — | impassable | no guerrilla; BR, PT, SP |
| 117 | 5 / 5 | bottom | 8 | 6 × `majority` (top holds all three groups) | fordable | guerrilla 1 |
| 118 | 5 / 6 | bottom | 6 | — | impassable | guerrilla 1; three hill redoubts; SP and BR |

### 16.1 101 Bailén

* `sideRules`: `guerrilla` top, `counters` 0 (S15). `breakOnLosses`, `side` bottom, `keys` [`FR/SWI`], `losses` 2,
  `start` 4: the four `FR/SWI` at (6,2), (6,3), (6,4), (6,5). The instant the second is eliminated, the others are
  removed at once and score the Spanish nothing; a leader on a removed unit stays as a lone leader; victory is checked
  after the second elimination (S30) **[Interp S30]**. The Spanish Swiss have no such rule.
* Swiss: `SP/SWI` at (2,2) and (2,3), `FR/SWI` as above, all 5 blocks (§15.1, S11) **[Interp S11]**. The Swiss leaders
  are Reding (`SP/LDR`, with the `SP/SWI` at (2,3)) and Schramm (`FR/LDR`, with the `FR/SWI` at (6,4)), ordinary leaders
  of their side (S11, S27).
* `rivers`: fordable: the whole Rumblar, (3,1) (stream source), (4,1), (5,0), (6,1), (7,0), (8,0) (junction), (8,1)
  (S24) **[Interp S24]**.

### 16.2 102 Zornoza

* `hand` 4 / 5.
* `objectives`: `exitEdge`, `side` top, `row` 0, `free` 3, `banners` 1: an ordered Allied unit on row 0 may step off the
  top edge as part of its move (1 hex of movement); the first three exits score nothing, each later one 1 permanent
  banner; leaders may exit for nothing and are not counted; only ordered movement exits (S31) **[Interp S31]**. The two
  printed exit signs mark the ends of the edge and are not objective hexes.
* `rivers`: fordable (the whole river); bridge (3,3).
* `sideRules`: `guerrilla` top, `counters` 0.

### 16.3 103 Gamonal

* `rivers`: fordable (the Pico, (0,2) to (8,2)).
* `sideRules`: `guerrilla` top, `counters` 1.
* Towns: Vellimar (2,12), (3,11); El Palacio (4,0). The `SP/HC` at (1,3), drawn with 4 blocks, starts with 3 (S41).
* No other rule (S39).

### 16.4 104 Espinosa de los Monteros

* `rivers`: impassable: the River Trueba, (0,1), (0,2), (0,3), (0,4), (1,0), (2,0), no bridge.
* Per-hex `river` `fordable` on the Shallow Stream: (5,10) (stream source), (6,11), (7,11), (8,12) (S24)
  **[Interp S24]**.
* `sideRules`: `guerrilla` top, `counters` 1.
* Towns: Espinosa (0,6), (0,7); Quintana (6,6), (6,7). No other rule (S39).

### 16.5 105 Somosierra

* `hand` 4 / 6.
* `objectives`: `suddenDeath`, `side` bottom, `keys` [`SP/FA`], `need` 3: the `SP/FA` at (1,6), (3,5) and (5,3). The
  French win the instant the third is eliminated, by hits or a failed retreat, on either turn (S32).
* Field Works (4-sided redoubt) on plain at (5,3), works hexsides E, SE, SW, W (open NE and NW); an `SP/FA` starts on it
  (S23).
* French Guard: `FR/GLC` at (8,5) and (8,6), `FR/GA` at (8,3) (S13). The `SP/LN` at (3,0) and the `FR/LN` at (7,6)
  start with 4 blocks (S41).
* `sideRules`: `guerrilla` top, `counters` 1.

### 16.6 106 Medellín

* `hand` 6 / 5. `first` top (S29).
* `rivers`: impassable except at the bridge (8,9): the Guadiana (6,0), (6,1), (7,1), (7,2), (8,3) and the Hortiga
  (4,12), (5,11), (6,11), (7,10), (7,9), (8,9).
* `sideRules`: `guerrilla` top, `counters` 1. `handShrink`, `side` top, `floor` 3: H starts at 6; each permanent banner
  the French gain while H > 3 takes one random card from the Allied cards held (not the square track, not the card
  played this turn) face up to the discard pile (S33, S46) **[Interp S33]** **[Interp S46]**. `squareCap`, `side` top,
  `units` 2: at most two different Allied units ever form square; either may form square again (S34)
  **[Interp S34]**.
* Town: Mengabril (2,12).

### 16.7 107 Alcañiz

* `rivers`: impassable except at the bridge (0,6): the Guadalope, (0,5), (0,6), (0,7), (0,8).
* `sideRules`: `guerrilla` top, `counters` 1. No other rule (S39).

### 16.8 108 María

* `first` top (S29).
* The Abbey of Santa Fe at (8,0) is a Town hex with no extra effect (S26).
* `sideRules`: `guerrilla` top, `counters` 1.

### 16.9 109 Talavera (Spanish Flank)

* Mixed army: Spanish and British units are one side (S27); the commander shown as Cuesta (Wellesley) has no effect.
* `rivers`: brook: the Portina Brook (0,9), (0,10), (1,10), (2,11), (3,11), exactly as 005's brook (S25).
* Field Works (Pajar de Vergara) on plain: (2,9) works hexsides W, SW, SE with an `SP/FA`; (2,10) SW, SE, E with a
  `BR/FA` (S23, S25) **[Interp S25]**.
* Town: Talavera (0,2), (0,3), (1,3).
* `sideRules`: `guerrilla` top, `counters` 1 (the Allied side, S16) **[Interp S16]**.

### 16.10 110 Tamames

* `hand` 6 / 6.
* `rivers`: fordable (the Stream, (6,5), (7,4), (7,3), (8,3), its source included) **[Interp S24]**.
* Town: Tamames (5,5), (5,6), (6,6).
* The `SP/LN` at (3,4), drawn with 5 blocks, starts with 4 (S41).
* `sideRules`: `guerrilla` top, `counters` 1. No other rule (S39).

### 16.11 111 Ocaña (Cavalry Action)

* Cavalry and horse artillery only: no squares and no Retire and Reform arise (S39). `SP/CU` at (0,9) (S5).
* `sideRules`: `guerrilla` top, `counters` 1.

### 16.12 112 Ocaña

* `hand` 4 / 5.
* `FR/LNC` at (7,0) (S12).
* Town: Ocaña (1,8), (2,8), (2,9).
* `sideRules`: `guerrilla` top, `counters` 0. No other rule (S39).

### 16.13 113 Alba de Tormes

* `hand` 4 / 5.
* `objectives`: `tempHex`, `side` bottom, `timing` turnStart, `banners` 1, `hex` (0,6): the bridge hex. Gained at the
  start of the French turn with a French unit on it; lost the instant that unit leaves or is eliminated (§13.3, S35).
* `rivers`: impassable except at the bridge (0,6): the Tormes, (0,0), (0,1), (1,1), (1,2), (1,3), (0,4), (0,5), (0,6),
  (0,7), (0,8), (0,9).
* `sideRules`: `guerrilla` top, `counters` 0.

### 16.14 114 Barrosa

* `hand` 6 / 5.
* Mixed army: British, Spanish and Portuguese units are one side (S27).
* `objectives`: two `majority` records over the Barrosa Ridge, `hexes` (2,3), (3,1), (3,2), (3,3), (4,2), (4,3), (4,4),
  (5,2), (5,3), (5,4), (6,3), `banners` 1 each: one for top with `startHeld` true (the `SP/LN` at (3,1), (3,2), (3,3)
  hold 3 hexes against 0), one for bottom (S36).
* `rivers`: impassable, no bridge: (0,11), (1,11), (2,12), (3,11), (4,12).
* Town: Barrosa (4,0). The 5-block `BR/LN` of the map starts with 4 (S41).
* No `guerrilla` rule: Scout works normally (S15).

### 16.15 115 Albuera

* Mixed army: British, Spanish and Portuguese units are one side (S27).
* `objectives`: `tempAny`, `side` bottom, `timing` turnStart, `banners` 1, `hexes` (4,9), (4,10): the Albuera hexes; one
  banner for either (S35) **[Interp S35]**. A `BR/LT` starts on (4,9).
* `rivers`: fordable; the ford tile hexes (5,0), (5,1), (5,3), (6,4) do not stop movement; bridge (5,9). The other river
  hexes: (5,2), (5,5), (5,6), (5,7), (5,8), (5,10), (4,11), (3,11), (6,5) (S24, S42) **[Interp S24]**.
* `sideRules`: `guerrilla` top, `counters` 0 (the page's "British player" is the Allied side, S16) **[Interp S16]**.
  `cavalryChargeFolly`, `side` top: Stewart's Folly (S37) **[Interp S37]**.
* `FR/LNC` at (6,0) (S12).

### 16.16 116 Vitoria

* `hand` 5 / 4. `moveFirst` `'reveal'`, `first` top (the tie side): the §15.8 procedure (S38, S43, S44)
  **[Interp S38]** **[Interp S43]** **[Interp S44]**. Assault counts 5 for the top side and 4 for the bottom at the
  reveal.
* Mixed army: British, Portuguese and Spanish units are one side (S27).
* `rivers`: impassable except at the bridges (1,7) and (1,10): the Zadorra, (0,6), (1,6), (1,7), (1,8), (1,9), (1,10),
  (2,11), (3,11), (4,12), (5,11), (6,12).
* Towns: Villodas (0,7), Tres Puentes (0,12), Arinez (6,7).
* No `guerrilla` rule: Scout works normally (S15).

### 16.17 117 San Marcial

* `objectives`: six `majority` records, two per group (one per side), `banners` 1 each; the three top records have
  `startHeld` true (S36):
  * left: (1,1), (2,1), (2,2), (3,0), (3,2), (4,0);
  * centre: (1,6), (1,7), (2,4), (2,5), (2,6), (2,8), (3,6);
  * right: (1,10), (2,11), (3,9), (3,10), (3,11), (4,12).
* `rivers`: fordable (the Bidassoa).
* `sideRules`: `guerrilla` top, `counters` 1.

### 16.18 118 Ordal Cross

* `hand` 5 / 6.
* Mixed army: Spanish and British units are one side (S27).
* Field Works on a hill at (3,4) (a `BR/FA` on it), (4,9) (an `SP/LN`) and (5,3) (a `BR/LN`), works hexsides SW, SE, E on
  all three (S23).
* `rivers`: impassable except at the bridge (8,10): (7,10), (7,11), (8,10).
* `sideRules`: `guerrilla` top, `counters` 1. No other rule (S39).
