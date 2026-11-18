// The in-game rules reference: our own text (rulesText.ts, from design/rules-reference.md) around tables read from the
// engine: units from `UNIT_STATS`, terrain from `TERRAIN_STATS` (and the works and hill rows), cards from `CARD_DEFS`.
import { useState, type JSX } from 'react';
import {
  ARM_OF, CARD_DEFS, DIE_FACES, HILL_RELATION, NATIONS, NATION_NAMES, TERRAIN_STATS, TERRAIN_TYPES, UNIT_KEYS, UNIT_STATS, WORKS, codeOf, nationOf,
  type ArmValues, type CardKind, type Nation, type Reductions, type RowKey, type TerrainType,
} from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { UnitIcon } from '../../art';
import { CardView, DieView } from '../kit';
import { FACE_LABEL } from '../kit/Dice';
import { TerrainIcon } from '../terrain';
import { unitCardLines } from '../game/unitText';
import { DICE_ROWS, RULES_TEXT, SQUARE_CONDITIONS, rulesTabs, type RulesBlock, type RulesTab } from './rulesText';
import './screens.css';

/** In a battle, pass its scenario to show that battle's special rules above the tabs. */
export function RulesReference({ scenario }: { scenario?: ScenarioInfo } = {}) {
  const [tab, setTab] = useState<RulesTab>('basics');
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
        {rulesTabs().map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </nav>
      <div className="rules-body">
        <RulesTabBody tab={tab} />
      </div>
    </div>
  );
}

/** The Expansion #1 unit cards under each block of the tab: the Spanish rows, the Swiss rows, then the French lancers and Guard. */
const EXP1_GROUPS: Readonly<Record<string, readonly RowKey[]>> = {
  'Spanish units': ['SP/LN', 'SP/LT', 'SP/GR', 'SP/ML', 'SP/LC', 'SP/HC', 'SP/CU', 'SP/FA'],
  'Swiss infantry': ['SP/SWI', 'FR/SWI'],
  'Lancers and Guard light cavalry': ['FR/LNC', 'FR/GLC'],
};

/** What each tab adds after the text of a block, by the block's heading: tables read from the engine. */
function extras(tab: RulesTab, b: RulesBlock): JSX.Element | null {
  switch (tab) {
    case 'units': {
      const n = NATIONS.find((x: Nation) => NATION_NAMES[x] === b.heading);
      const keys = n ? UNIT_KEYS.filter((k) => nationOf(k) === n && UNIT_STATS[k].expansion === 'base') : [];
      return keys.length ? <UnitCards keys={keys} /> : null;
    }
    case 'combat':
      return b.heading === 'The battle dice' ? <DiceTable /> : null;
    case 'squares':
      return b.heading === 'Forming a square' ? <ol className="rules-conditions" type="a">{SQUARE_CONDITIONS.map((c) => <li key={c}>{c}</li>)}</ol> : null;
    case 'terrain':
      return b.heading === 'Reading the table' ? <Terrain /> : null;
    case 'exp1': {
      const keys = EXP1_GROUPS[b.heading];
      return keys ? <UnitCards keys={keys.filter((k) => UNIT_STATS[k].expansion === 'exp1')} /> : null;
    }
    case 'cards':
      return b.heading === 'Section cards' ? <Cards group="section" /> : b.heading === 'Tactic cards' ? <Cards group="tactic" /> : null;
    default:
      return null;
  }
}

/** One tab: its blocks of text, each followed by its table or cards. */
export function RulesTabBody({ tab }: { tab: RulesTab }) {
  return (
    <div className="rules-text">
      {RULES_TEXT[tab].map((b) => (
        <section key={b.heading}>
          <h3>{b.heading}</h3>
          {b.paragraphs.map((p) => <p key={p}>{p}</p>)}
          {b.reading && <p className="rules-reading">Our reading: {b.reading}</p>}
          {extras(tab, b)}
        </section>
      ))}
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

/** Units tab: the nations of the base game, each with its notes and its unit cards. */
export function Units() {
  return <RulesTabBody tab="units" />;
}

/** The dice table: each face, and what it does in fire, melee, against a lone leader and in Retire and Reform. */
function DiceTable() {
  return (
    <table className="dice-table">
      <thead>
        <tr><th>Face</th><th>Fire</th><th>Melee</th><th>Against a lone leader</th><th>Retire and Reform</th></tr>
      </thead>
      <tbody>
        {DIE_FACES.map((f) => (
          <tr key={f}>
            <th><DieView face={f} size={30} /> <span>{FACE_LABEL[f]}</span></th>
            {DICE_ROWS[f].map((c, i) => <td key={i}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
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
  if (st.cancelsCavalryCharge) parts.push('Cavalry lose the dice of a Cavalry Charge card battling into or out of it.');
  if (t === 'walledFarm') parts.push('Counts as a town for every rule, objectives included; it gives no flag-ignore.');
  if (t === 'bridge') parts.push('Carries units across a river with no movement or battle effect.');
  if (t === 'brook') parts.push('Only some battles use it; its special rules say how.');
  parts.push(st.hill ? 'Blocks line of sight in between, except across the top of one connected hill (see below).' : st.blocksSight ? 'Blocks line of sight.' : 'Does not block line of sight.');
  return parts.join(' ');
}

export interface TerrainRow { key: string; name: string; icon: JSX.Element | null; text: string }

/** The rows of the terrain table, each with a unique key: the Hill row has its icon, the hill relations none. */
export function terrainRows(): TerrainRow[] {
  const hillRel = (r: Reductions) => reductions(r).join('; ') || 'no change';
  return [
    ...TERRAIN_TYPES.filter((t) => t !== 'plain' && t !== 'void').map((t): TerrainRow => ({
      key: `terrain:${t}`, name: t === 'fordNoStop' ? `${TERRAIN_STATS[t].name} (no stop)` : TERRAIN_STATS[t].name, icon: <TerrainIcon t={t} size={28} />, text: terrainText(t),
    })),
    {
      key: 'works', name: 'Field works', icon: <TerrainIcon t="plain" works size={28} />,
      text: `Along some hexsides. Into: ${reductions(WORKS.into).join('; ')}. Out of: ${reductions(WORKS.out).join('; ')}. Defenders ignore a flag (infantry ${WORKS.flagIgnore.infantry}, artillery ${WORKS.flagIgnore.artillery}).`,
    },
    {
      key: 'hill-relations', name: 'Hill relations', icon: null,
      text: `Uphill: ${hillRel(HILL_RELATION.uphill)}. Downhill: ${hillRel(HILL_RELATION.downhill)}. Hill to hill: ${hillRel(HILL_RELATION.hillToHill)}.`,
    },
  ];
}

function Terrain() {
  return (
    <table className="terrain-table">
      <tbody>
        {terrainRows().map((r) => (
          <tr key={r.key}>
            <th>{r.icon} {r.name}</th>
            <td>{r.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The cards of one group (section cards, then tactic cards), each with its count and the card's own text. */
function Cards({ group }: { group: 'section' | 'tactic' }) {
  const kinds = (Object.keys(CARD_DEFS) as CardKind[]).filter((k) => CARD_DEFS[k].group === group);
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
