# Commands & Colours: Napoleonics — Rules Reference (as implemented)

Condensed from the GMT *Rules of Play, 4th Edition* (the edition the engine follows, R68), the National Unit Reference
Cards and the 2nd-edition scenario booklet, with Richard Borg's FAQ rulings where they settle a point. This file is
the authoritative spec for the engine, its tests and the AI: every rules test is written from this file alone. Rules
questions are decided in `design/rulings.md`. A statement that rests on our own interpretation carries an **[Interp]**
mark with the id of the deciding row (for example **[Interp R15]**); other statements cite the settling row as (R<n>)
where one exists. Where this file and a ruling disagree, the ruling wins and this file is corrected.

§1–§13 describe the base game (battles 001–015). §14 holds the base battles' special rules. §15 onward is reserved for
Expansion #1.

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
(R7); they have no rows here.

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
* `sideRules` (top): the Nassau, Hanover and Dutch units are `AL` units (brown blocks): Portuguese card values, except
  that `AL/LN` retreats 2 hexes per flag (§2.4, R10).

### 14.15 015 Waterloo

* `hand` 6 / 6.
* `objectives`: `tempHex` × 3, `side` bottom, `timing` turnStart, `banners` 1 each, `hex` (3,5) La Haye Sainte, (4,1)
  Hougoumont, (4,12) Papelotte (`design/data/015.json`). All three are ordinary Town hexes with no flag-ignore **[Interp R72]**.
* `sideRules` (top): the Nassau, Brunswick, Hanover and Dutch units are `AL` units, as at 014 (§2.4, R10).
* `sideRules` (top): **impetuous British cavalry** (R72, R82) **[Interp R82]**. For `BR/LC`, `BR/HC`, `BR/GHC` only (not `AL/LC`), after
  a successful attacking melee, and only when §9.8 allows a breakthrough (not after entering a stop hex this turn,
  R35):
  * after the initial melee the unit **must** move into the vacated hex, then **must** move 1 more hex if a legal one
    exists: a vacant hex it may enter, adjacent to the vacated hex in the row next toward the French baseline (row + 1),
    and not its original hex; the Allied player chooses between two; none if the vacated hex stopped its movement;
  * the bonus melee stays optional; after a successful bonus melee it **must** move into that vacated hex (no extra hex);
  * never in a battle back, and never for a unit that used First Strike (§9.7).
* Sand quarry at (2,6) (§4, R71); a BR/RI starts on it.

## 15. Expansion #1 (reserved)

§15 onward is reserved for Expansion #1 (*The Spanish Army*, nation code `SP`). This section is intentionally empty in
the base-game reference.
