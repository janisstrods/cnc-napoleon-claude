// The in-game rules reference. Until Plan 6 writes the full text, the tabs are built from the tables: units from
// `UNIT_STATS`, terrain from `TERRAIN_STATS` (and the works and hill rows), command cards from `CARD_DEFS`.
import { useState, type JSX } from 'react';
import {
  ARM_OF, CARD_DEFS, HILL_RELATION, NATIONS, NATION_NAMES, TERRAIN_STATS, TERRAIN_TYPES, UNIT_KEYS, UNIT_STATS, WORKS, codeOf, nationOf,
  type ArmValues, type CardKind, type Nation, type Reductions, type RowKey, type TerrainType,
} from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { UnitIcon } from '../../art';
import { CardView, DieView } from '../kit';
import { TerrainIcon } from '../terrain';
import { unitCardLines } from '../game/unitText';
import './screens.css';

type Tab = 'basics' | 'units' | 'combat' | 'terrain' | 'cards';

const TABS: [Tab, string][] = [
  ['basics', 'Basics'],
  ['units', 'Units'],
  ['combat', 'Combat'],
  ['terrain', 'Terrain'],
  ['cards', 'Cards'],
];

/** The body of each tab. */
const TAB_BODY: Record<Tab, () => JSX.Element> = { basics: Basics, units: Units, combat: Combat, terrain: Terrain, cards: Cards };

/** In a battle, pass its scenario to show that battle's special rules above the tabs. */
export function RulesReference({ scenario }: { scenario?: ScenarioInfo } = {}) {
  const [tab, setTab] = useState<Tab>('basics');
  const Body = TAB_BODY[tab];
  return (
    <div className="rules">
      {scenario && scenario.specialText.length > 0 && (
        <section className="rules-battle">
          <h3>Special rules: {scenario.name}</h3>
          <ul>
            {scenario.specialText.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      )}
      <nav className="rules-tabs">
        {TABS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>
      <div className="rules-body">
        <Body />
      </div>
    </div>
  );
}

function Basics() {
  return (
    <div className="rules-text">
      <p className="rules-note">The full rules reference arrives with the Napoleonic battles; these pages follow the game&apos;s tables.</p>
      <h3>Goal</h3>
      <p>Be the first to capture the number of <b>Victory Banners</b> the battle requires. You win a banner for every enemy unit you destroy and every enemy leader you kill (some battles add objectives).</p>
      <h3>Your turn</h3>
      <ol>
        <li><b>Play a command card.</b> It tells you where (left, centre or right section) and how many units you may order.</li>
        <li><b>Order units</b> and play out the card.</li>
        <li><b>Move</b> the ordered units one at a time.</li>
        <li><b>Battle</b> with the ordered units: melee against an adjacent enemy, or fire at range.</li>
        <li>You then <b>draw</b> a new card.</li>
      </ol>
      <h3>Controls</h3>
      <p>Click to select; hover a unit for its stats, any hex for what its terrain does, and a card to preview it. <b>Let the general decide</b> answers any decision for you.</p>
    </div>
  );
}

/** One card per unit row: icon, stats line, notes line (exported for the unit-text test). */
export function UnitCards({ keys }: { keys: readonly RowKey[] }) {
  return (
    <div className="rules-units">
      {keys.map((k) => {
        const st = UNIT_STATS[k];
        const [statsLine, notesLine] = unitCardLines(k);
        return (
          <div key={k} className="unit-card">
            <svg width={64} height={64} viewBox="-30 -30 60 60">
              <UnitIcon unitKey={k} size={54} />
            </svg>
            <div>
              <div className="unit-card-title">{NATION_NAMES[nationOf(k)]} {st.name} <span className={`cls cls-${ARM_OF[codeOf(k)]}`}>{ARM_OF[codeOf(k)]}</span></div>
              <div className="unit-card-line">{statsLine}</div>
              <div className="unit-card-line muted">{notesLine}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Units tab: every row of `UNIT_STATS`, by nation. */
export function Units() {
  return (
    <>
      {NATIONS.map((n: Nation) => {
        const keys = UNIT_KEYS.filter((k) => nationOf(k) === n);
        return keys.length ? (
          <section key={n}>
            <h3>{NATION_NAMES[n]}</h3>
            <UnitCards keys={keys} />
          </section>
        ) : null;
      })}
    </>
  );
}

function Combat() {
  return (
    <div className="rules-text">
      <h3>The battle dice</h3>
      <div className="dice-legend">
        <span><DieView face="infantry" size={30} /> hits infantry</span>
        <span><DieView face="cavalry" size={30} /> hits cavalry</span>
        <span><DieView face="artillery" size={30} /> hits artillery</span>
        <span><DieView face="sabre" size={30} /> hits in melee for units whose sabres count</span>
        <span><DieView face="flag" size={30} /> forces a retreat</span>
      </div>
      <h3>Melee and fire</h3>
      <p>A unit rolls dice by its blocks and its row in the unit table (see the Units tab): more against infantry for some, fewer for others, and fire by range. Terrain takes dice away (see the Terrain tab).</p>
      <h3>Retreats</h3>
      <p>Each flag pushes a unit back toward its own baseline by its retreat distance. A unit may ignore as many flags as its row says, and a supported unit ignores one. Every hex a unit cannot retreat costs a block.</p>
    </div>
  );
}

const ARM_LABEL: Record<keyof ArmValues, string> = { infantry: 'infantry', cavalry: 'cavalry', artillery: 'artillery' };
const arms = (v: ArmValues): string | null => {
  const parts = (Object.keys(ARM_LABEL) as (keyof ArmValues)[]).filter((a) => v[a] !== 0).map((a) => `${ARM_LABEL[a]} −${Math.abs(v[a])}`);
  return parts.length ? parts.join(', ') : null;
};
const reductions = (r: Reductions): string[] => {
  const out: string[] = [];
  const [fire, melee] = [arms(r.fire), arms(r.melee)];
  if (fire) out.push(`fire ${fire}`);
  if (melee) out.push(`melee ${melee}`);
  return out;
};

/** The rules-reference line of a terrain row, from the table. */
function terrainText(t: TerrainType): string {
  const st = TERRAIN_STATS[t];
  const parts: string[] = [];
  if (st.impassable) parts.push('Impassable.');
  else {
    if (st.stopsOnEntry) parts.push('Stops units entering it.');
    if (st.closedTo.length) parts.push(`Closed to ${st.closedTo.join(' and ')}.`);
    if (st.noBattleAfterEntering === 'all') parts.push('A unit that enters it may not battle that turn.');
    if (st.noBattleAfterEntering === 'notLight') parts.push('After entering it, only light troops may battle that turn.');
  }
  const into = reductions(st.into);
  const out = reductions(st.out);
  if (into.length) parts.push(`Into it: ${into.join('; ')}.`);
  if (out.length) parts.push(`Out of it: ${out.join('; ')}.`);
  if (st.noMeleeInto) parts.push('No melee into it.');
  if (!st.squareAllowed && !st.impassable) parts.push('No square.');
  parts.push(st.blocksSight ? 'Blocks line of sight.' : 'Does not block line of sight.');
  return parts.join(' ');
}

function Terrain() {
  const rows: [TerrainType | 'works', string, string][] = [
    ...TERRAIN_TYPES.filter((t) => t !== 'plain' && t !== 'void').map((t): [TerrainType, string, string] => [t, TERRAIN_STATS[t].name, terrainText(t)]),
    ['works', 'Field works', `Along some hexsides. Into: ${reductions(WORKS.into).join('; ')}. Out of: ${reductions(WORKS.out).join('; ')}. Defenders ignore a flag (infantry ${WORKS.flagIgnore.infantry}, artillery ${WORKS.flagIgnore.artillery}).`],
    ['hill', 'Hill relations', `Uphill: ${reductions(HILL_RELATION.uphill).join('; ') || 'no change'}. Downhill: ${reductions(HILL_RELATION.downhill).join('; ') || 'no change'}. Hill to hill: ${reductions(HILL_RELATION.hillToHill).join('; ') || 'no change'}.`],
  ];
  return (
    <table className="terrain-table">
      <tbody>
        {rows.map(([t, name, text]) => (
          <tr key={name}>
            <th>{t === 'works' ? <TerrainIcon t="plain" works size={28} /> : t === 'hill' ? null : <TerrainIcon t={t} size={28} />} {name}</th>
            <td>{text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cards() {
  const kinds = Object.keys(CARD_DEFS) as CardKind[];
  return (
    <div className="rules-cards">
      {kinds.map((k) => (
        <div key={k} className="rules-card">
          <CardView kind={k} size="sm" />
          <div>
            <div className="unit-card-title">{CARD_DEFS[k].title} <span className="muted">×{CARD_DEFS[k].count}</span></div>
            <div className="unit-card-line">{CARD_DEFS[k].text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
