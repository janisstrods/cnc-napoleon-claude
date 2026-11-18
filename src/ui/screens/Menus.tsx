import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UNIT_STATS, createGame, leaderUnit, nationOf, type GameState, type RowKey, type Side } from '../../engine';
import { SCENARIOS, type Expansion, type ScenarioInfo } from '../../scenarios';
import { LEADER_ATTACH_OFFSET, LeaderToken, UnitToken } from '../../art';
import { BoardArt, ObjectiveMarkers } from '../terrain';
import { ALL_DIE_FACES, Button, DieSymbol, Icon, Modal, Panel } from '../kit';
import { BOARD_H, BOARD_W, hexCenterId } from '../geometry';
import type { Difficulty, SavedGame } from '../game/controller';
import { boardArtProps, leaderTokenProps, unitTokenProps } from '../game/boardProps';
import { PERSONALITIES, personalityFor } from '../../ai/personality';
import { RulesDialog } from './RulesDialog';
import { HistoryButton } from '../history/HistoryButton';
import { PICKER_TABS, battlesOf, visibleBattles, loadPickerTab, randomPick, savePickerTab, tabForKey } from './picker';
import { BUILD_TIME, RELEASE, buildLabel } from '../../version';
import { storage, storageKey } from '../storage';
import { MEDAL_FOR, beatenLevels, loadRecord, recordTotals, sideStanding, sideTally } from '../record';
import { Medal, MedalPair } from './Medal';
import { MenuTally, TriumphsDialog } from './Triumphs';
import './screens.css';

const MENU_ARMY_L: RowKey[] = ['FR/GR', 'FR/LN', 'FR/CU'];
const MENU_ARMY_R: RowKey[] = ['BR/RI', 'BR/LN', 'BR/HC'];

/** The credits dialog's text. GMT's spelling of the game's name appears only in the disclaimer. */
export function CreditsText() {
  return (
    <div className="credits">
      <p>An unofficial, fan-made digital edition of <i>Commands &amp; Colours: Napoleonics</i>, based on <i>Commands &amp; Colors: Napoleonics</i>, designed by Richard Borg and published by GMT Games. Commands &amp; Colors is a trademark of GMT Games LLC. This edition uses original artwork and paraphrased rules text; it is not affiliated with or endorsed by GMT Games.</p>
      <p>Scenario setups follow the 15 battles of the base game (the Spanish Army expansion is to come), transcribed hex by hex from the community's published battle maps. Rules are paraphrased and battle summaries original.</p>
      <p><b>Battle histories:</b> original summaries written from the standard histories of the Peninsular War and the Waterloo campaign, each with its sources. The maps are schematic reconstructions; numbers and details of the period are often uncertain.</p>
      <p><b>Fonts:</b> IM Fell English SC (Igino Marini) and EB Garamond (Georg Duffner, Octavio Pardo) — SIL Open Font License 1.1.</p>
      <p><b>Icons:</b> game-icons.net by Lorc and Delapouite — CC BY 3.0 (see CREDITS.md for the full list).</p>
      <p><b>Miniatures, terrain, cards and dice:</b> original SVG artwork made for this edition.</p>
    </div>
  );
}

export function MainMenu(p: {
  saved: SavedGame | null;
  notice?: string | null;
  /** Open the battle picker (on the battle clicked in the Triumphs record, if any). */
  onNew: (battleId?: string) => void;
  onContinue: () => void;
}) {
  const [rules, setRules] = useState(false);
  const [credits, setCredits] = useState(false);
  const [triumphs, setTriumphs] = useState(false);
  const [record, setRecord] = useState(loadRecord);
  const savedName = p.saved ? SCENARIOS.find((s) => s.id === p.saved!.config.scenarioId)?.name : null;
  return (
    <div className="menu-root">
      <div className="menu-hero">
        <div className="menu-emblem" aria-hidden>
          <Icon name="laurels" size={150} gradient={['#fbe7a6', '#e0b85a', '#a87c2c']} />
          <div className="menu-emblem-swords">
            <Icon name="crossedSwords" size={58} gradient={['#fbe7a6', '#d8b064', '#8a6226']} />
          </div>
        </div>
        <h1 className="menu-title">Commands &amp; Colours</h1>
        <div className="menu-sub">NAPOLEONICS</div>
        <p className="menu-tag">Commands &amp; Colours: Napoleonics — battles of the Peninsular War and the Hundred Days</p>
        <div className="menu-armies" aria-hidden>
          <svg viewBox="-52 -48 524 96" width="620" height="114">
            {MENU_ARMY_L.map((t, i) => (
              <g key={t} transform={`translate(${i * 80}, ${i % 2 ? 4 : 0})`}>
                <UnitToken unitKey={t} nation={nationOf(t)} blocks={UNIT_STATS[t].blocks} maxBlocks={UNIT_STATS[t].blocks} facing="right" />
              </g>
            ))}
            {MENU_ARMY_R.map((t, i) => (
              <g key={t} transform={`translate(${420 - i * 80}, ${i % 2 ? 4 : 0})`}>
                <UnitToken unitKey={t} nation={nationOf(t)} blocks={UNIT_STATS[t].blocks} maxBlocks={UNIT_STATS[t].blocks} facing="left" />
              </g>
            ))}
          </svg>
        </div>
        {p.notice && <div className="menu-notice">{p.notice}</div>}
        <div className="menu-buttons">
          {p.saved && (
            <Button onClick={p.onContinue}>Continue: {savedName}</Button>
          )}
          <Button variant={p.saved ? 'secondary' : 'primary'} onClick={() => p.onNew()}>New Battle</Button>
          <Button variant="ghost" onClick={() => setRules(true)}>How to Play</Button>
          <Button variant="ghost" onClick={() => setTriumphs(true)}>Triumphs</Button>
          <Button variant="ghost" onClick={() => setCredits(true)}>Credits</Button>
        </div>
        <MenuTally record={record} />
      </div>
      <div className="menu-version">
        <div>v{RELEASE.number} “{RELEASE.name}”</div>
        <div className="menu-build">{buildLabel(BUILD_TIME)}</div>
      </div>
      <RulesDialog open={rules} title="How to Play" onClose={() => setRules(false)} />
      <TriumphsDialog
        open={triumphs}
        record={record}
        onClose={() => setTriumphs(false)}
        onRecord={setRecord}
        onPick={(id) => {
          setTriumphs(false);
          p.onNew(id);
        }}
      />
      <Modal open={credits} title="Credits" onClose={() => setCredits(false)} width={640}>
        <CreditsText />
      </Modal>
    </div>
  );
}

function SetupPreview({ state, flipped, humanSide }: { state: GameState; flipped: boolean; humanSide: Side }) {
  const nations = { top: state.players.top.nation, bottom: state.players.bottom.nation };
  return (
    <svg className="preview-svg" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
      <BoardArt {...boardArtProps(state, flipped)} />
      <ObjectiveMarkers objectives={state.scenario.objectives} objState={state.special.objState} flipped={flipped} nations={nations} />
      {state.units.map((u) => {
        const { x, y } = hexCenterId(u.hex, flipped);
        return (
          <g key={u.id} transform={`translate(${x}, ${y})`}>
            <UnitToken {...unitTokenProps(u, humanSide)} />
          </g>
        );
      })}
      {/* a leader still off the board is not drawn */}
      {state.leaders.filter((l) => l.hex >= 0).map((l) => {
        const { x, y } = hexCenterId(l.hex, flipped);
        const att = !!leaderUnit(state, l);
        return (
          <g key={l.id} transform={`translate(${x + (att ? LEADER_ATTACH_OFFSET.x : 0)}, ${y + (att ? LEADER_ATTACH_OFFSET.y : 0)})`}>
            <LeaderToken {...leaderTokenProps(state, l, att, humanSide)} name={l.name} />
          </g>
        );
      })}
    </svg>
  );
}

/** A picker tab's medals won, when there are any: a small laurel and the count. */
function TabMedals({ won, of }: { won: number; of: number }) {
  if (!won) return null;
  return (
    <span className="tab-medals" role="img" aria-label={`${won} of ${of} medals won`} title={`${won} of ${of} medals won`}>
      <Icon name="laurels" size={12} />
      {won}
    </span>
  );
}

const DIFFS: { id: Difficulty; name: string; text: string }[] = [
  { id: 'captain', name: 'Captain', text: 'A forgiving opponent that makes mistakes.' },
  { id: 'colonel', name: 'Colonel', text: 'A capable general. Recommended.' },
  { id: 'marshal', name: 'Marshal', text: 'Thinks deeper and punishes errors.' },
];

/** Your record from one side of a battle, for its "Command the" button. */
function sideRecordText(won: number, lost: number, draw: number, army: string): string {
  if (!won && !lost && !draw) return `Not fought yet as ${army}`;
  const parts = [`${won} won`, `${lost} lost`];
  if (draw) parts.push(`${draw} drawn`);
  return `Your record as ${army}: ${parts.join(', ')}`;
}

type ScenarioSelectProps = {
  onBack: () => void;
  onStart: (scenarioId: string, side: Side, difficulty: Difficulty, personality?: string) => void;
  /** The battle to open on (picked in the Triumphs record); else the first of the tab shown last time. */
  initialBattle?: string;
};

/** The picker when no battle is visible (only the hidden drill exists): an empty list and briefing, Start disabled. */
function EmptyScenarioSelect(p: { onBack: () => void }) {
  return (
    <div className="select-root">
      <div className="select-list">
        <div className="select-head">
          <Button variant="ghost" onClick={p.onBack}>← Back</Button>
          <h2>Choose a Battle</h2>
        </div>
        <div className="select-tabs" role="tablist" aria-label="Battles">
          {PICKER_TABS.map((t, i) => (
            <button key={t.id} id={`battle-tab-${t.id}`} role="tab" aria-selected={i === 0} aria-controls="battle-list" tabIndex={i === 0 ? 0 : -1} className={i === 0 ? 'active' : ''}>
              {t.label} <small>0</small>
            </button>
          ))}
        </div>
        <div className="select-scroll" id="battle-list" role="tabpanel" aria-labelledby={`battle-tab-${PICKER_TABS[0].id}`} />
        <Button variant="ghost" className="random-btn" disabled>Random battle</Button>
      </div>
      <div className="select-detail">
        <Panel variant="parchment" className="brief">
          <div className="brief-head"><div className="brief-title">No battles yet</div></div>
        </Panel>
        <div className="choose-row">
          <Button variant="primary" className="start-btn" disabled>To Battle!</Button>
        </div>
      </div>
    </div>
  );
}

export function ScenarioSelect(p: ScenarioSelectProps) {
  const fallback = visibleBattles(SCENARIOS)[0];
  return fallback ? <ScenarioSelectBody {...p} fallback={fallback} /> : <EmptyScenarioSelect onBack={p.onBack} />;
}

function ScenarioSelectBody(p: ScenarioSelectProps & { fallback: ScenarioInfo }) {
  const initial = visibleBattles(SCENARIOS).find((s) => s.id === p.initialBattle);
  const [tab, setTab] = useState<Expansion>(() => initial?.expansion ?? loadPickerTab());
  const battles = useMemo(() => battlesOf(SCENARIOS, tab), [tab]);
  const [sel, setSel] = useState<ScenarioInfo>(() => initial ?? battles[0] ?? p.fallback);
  // the player's record: read once, as nothing changes it while the picker is open
  const [record] = useState(loadRecord);
  const switchTab = (t: Expansion) => {
    if (t === tab) return;
    setTab(t);
    savePickerTab(t);
    const first = battlesOf(SCENARIOS, t)[0];
    if (first) setSel(first);
  };
  // ARIA tabs: arrow keys (and Home/End) move between the tabs and select them; only the selected tab is in the tab order
  const tabRefs = useRef<Partial<Record<Expansion, HTMLButtonElement | null>>>({});
  const onTabKey = (e: KeyboardEvent) => {
    const t = tabForKey(tab, e.key);
    if (!t) return;
    e.preventDefault();
    switchTab(t);
    tabRefs.current[t]?.focus();
  };
  const [side, setSide] = useState<Side>('bottom');
  const [diff, setDiff] = useState<Difficulty>(() => {
    const v = storage.get(storageKey('difficulty'));
    return DIFFS.find((d) => d.id === v)?.id ?? 'colonel';
  });
  // Random battle: a battle from any box and a side; the list then scrolls to it (only after a random pick, or when the
  // picker opens on a battle from the Triumphs record)
  const listRef = useRef<HTMLDivElement>(null);
  const reveal = useRef(!!initial);
  const [rolls, setRolls] = useState(0);
  const pickRandom = () => {
    const pick = randomPick(SCENARIOS, sel.id);
    if (!pick) return; // no visible battle (the drill battle 000 is hidden)
    if (pick.battle.expansion !== tab) {
      setTab(pick.battle.expansion);
      savePickerTab(pick.battle.expansion);
    }
    setSel(pick.battle);
    setSide(pick.side);
    setRolls((n) => n + 1);
    reveal.current = true;
  };
  useEffect(() => {
    if (!reveal.current) return;
    reveal.current = false;
    listRef.current?.querySelector('.scen-item.active')?.scrollIntoView({ block: 'center' });
  }, [sel]);
  const preview = useMemo(() => createGame(sel.setup, 1), [sel]);
  const beaten = beatenLevels(record, sel.id, side);
  const tabMedals = useMemo(() => {
    const out = {} as Record<Expansion, number>;
    for (const t of PICKER_TABS) {
      const n = recordTotals(record, battlesOf(SCENARIOS, t.id).map((s) => s.id));
      out[t.id] = n.gold + n.silver + n.bronze;
    }
    return out;
  }, [record]);
  const [persona, setPersona] = useState<string>('');
  const enemy = sel.setup[side === 'top' ? 'bottom' : 'top'];
  const historical = personalityFor(enemy.commander, enemy.army);
  const armies = { top: sel.setup.top, bottom: sel.setup.bottom };
  const cardsText = (sd: Side) => `${armies[sd].cards} cards`;
  const start = () => {
    storage.set(storageKey('difficulty'), diff);
    p.onStart(sel.id, side, diff, persona || undefined);
  };
  return (
    <div className="select-root">
      <div className="select-list">
        <div className="select-head">
          <Button variant="ghost" onClick={p.onBack}>← Back</Button>
          <h2>Choose a Battle</h2>
        </div>
        <div className="select-tabs" role="tablist" aria-label="Battles">
          {PICKER_TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`battle-tab-${t.id}`}
              role="tab"
              aria-selected={t.id === tab}
              aria-controls="battle-list"
              tabIndex={t.id === tab ? 0 : -1}
              className={t.id === tab ? 'active' : ''}
              onClick={() => switchTab(t.id)}
              onKeyDown={onTabKey}
            >
              {t.label} <small>{battlesOf(SCENARIOS, t.id).length}</small>
              <TabMedals won={tabMedals[t.id]} of={2 * battlesOf(SCENARIOS, t.id).length} />
            </button>
          ))}
        </div>
        <div className="select-scroll" key={tab} ref={listRef} id="battle-list" role="tabpanel" aria-labelledby={`battle-tab-${tab}`}>
          {battles.map((s) => (
            <button key={s.id} className={`scen-item ${s.id === sel.id ? 'active' : ''}`} onClick={() => setSel(s)}>
              <span className="scen-num">{Number(s.id)}</span>
              <span className="scen-name">{s.name}</span>
              <span className="scen-year">{s.year}</span>
              <span className="scen-hint">{s.difficultyHint}</span>
              <MedalPair rec={record} sc={s} size={17} className="scen-medals" />
            </button>
          ))}
        </div>
        <Button variant="ghost" className="random-btn" onClick={pickRandom} title="Pick a battle from any box, and a side, at random">
          <span key={rolls} className={`random-die ${rolls ? 'is-rolled' : ''}`} aria-hidden>
            <DieSymbol face={ALL_DIE_FACES[(rolls + 5) % ALL_DIE_FACES.length]} />
          </span>
          Random battle
        </Button>
      </div>
      <div className="select-detail">
        <Panel variant="parchment" className="brief">
          <div className="brief-head">
            <div className="brief-title">{sel.name} <span>{sel.year}</span></div>
            <HistoryButton scenario={sel} flipped={side === 'top'} variant="secondary" className="brief-history" />
          </div>
          {/* a long briefing scrolls here, so the map preview and To Battle! stay in view (back at the top for each battle) */}
          <div className="brief-scroll" key={sel.id}>
            <p className="brief-blurb">{sel.blurb}</p>
            <div className="brief-facts">
              <span>{sel.setup.banners} banners to win</span>
              <span>{armies[sel.setup.first].army} move first</span>
              <span>{armies.top.army}: {cardsText('top')} · {armies.bottom.army}: {cardsText('bottom')}</span>
            </div>
            {sel.specialText.length > 0 && (
              <ul className="brief-special">
                {sel.specialText.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        </Panel>
        <div className="preview-wrap">
          <SetupPreview state={preview} flipped={side === 'top'} humanSide={side} />
        </div>
        <div className="choose-row">
          <div className="choose-group">
            <div className="choose-label">Command the</div>
            {(['bottom', 'top'] as Side[]).map((sd) => {
              const standing = sideStanding(record, sel.id, sd);
              const t = sideTally(record, sel.id, sd);
              return (
                <button
                  key={sd}
                  className={`choice ${side === sd ? 'active' : ''} ${standing === 'none' ? '' : 'has-medal'}`}
                  onClick={() => setSide(sd)}
                  title={sideRecordText(t.won, t.lost, t.draw, armies[sd].army)}
                >
                  <b>{armies[sd].army}</b>
                  <small>{armies[sd].commander}</small>
                  {standing !== 'none' && <Medal standing={standing} size={18} className="choice-medal" />}
                </button>
              );
            })}
          </div>
          <div className="choose-group">
            <div className="choose-label">Opponent</div>
            {DIFFS.map((d) => {
              const won = beaten.includes(d.id);
              const metal = MEDAL_FOR[d.id];
              const note = `${won ? 'Beaten' : 'Not beaten yet'} as ${armies[side].army} (${metal}).`;
              return (
                <button key={d.id} className={`choice has-medal ${diff === d.id ? 'active' : ''}`} onClick={() => setDiff(d.id)} title={`${d.text} ${note}`}>
                  <b>{d.name}</b>
                  <small>{d.text}</small>
                  <Medal standing={metal} faint={!won} size={18} className="choice-medal" />
                </button>
              );
            })}
          </div>
          <div className="choose-group persona-group">
            <div className="choose-label">General</div>
            <label className="persona">
              <span className="persona-name">{enemy.commander}</span>
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                <option value="">{historical.name} (historical)</option>
                {PERSONALITIES.filter((x) => x.id !== historical.id).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              <small>{(persona ? PERSONALITIES.find((x) => x.id === persona)! : historical).epithet}</small>
            </label>
          </div>
          <Button className="start-btn" onClick={start}>To Battle!</Button>
        </div>
      </div>
    </div>
  );
}
