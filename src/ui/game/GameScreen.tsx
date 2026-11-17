import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  UNIT_STATS, battleReady, battleTargets, cardKind, eligiblePieces, leaderAt, leaderUnit, movablePieces, other, pieceMoves, unitAt,
  type Answer, type GameState, type HexId, type Side,
} from '../../engine';
import { UnitIcon } from '../../art';
import { BannerTrack, Button, CardBack, CardView, DiceTray, DieView, Modal, Panel } from '../kit';
import { BattleResult } from './BattleResult';
import { Board } from './Board';
import type { GameController } from './controller';
import { HoverTip, LogPanel } from './panels';
import { gamePrompt } from './prompts';
import { bannerCounts, objectiveTipLines } from './objectiveText';
import { boardMarks, selectionDeps, type UiSel } from './uiModel';
import { leaderTraitLines, unitSummary } from './unitText';
import { TerrainTipBlock } from './TerrainTipBlock';
import { terrainTip } from './terrainTips';
import { RulesDialog } from '../screens/RulesDialog';
import { HistoryButton } from '../history/HistoryButton';
import { isMuted, setMuted } from '../sound';
import { opponentPersonality } from './makeOpponent';
import './game.css';

const EMPTY_SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };

const DIFF_LABEL = { recruit: 'Recruit', tribune: 'Tribune', consul: 'Consul' } as const;

export function GameScreen({ controller, onExit, onRematch }: {
  controller: GameController;
  onExit: () => void;
  /** After the battle: play it again, with the same or switched sides. */
  onRematch?: (switchSides: boolean) => void;
}) {
  const view = useSyncExternalStore(controller.subscribe, controller.getView);
  const s = view.display;
  const human = view.humanSide;
  const ai = other(human);
  const flipped = human === 'top';
  const d = view.pending;
  const [ui, setUi] = useState<UiSel>(EMPTY_SEL);
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [mutedState, setMutedState] = useState(isMuted());

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __ccn: GameController }).__ccn = controller;
  }, [controller]);

  // keyboard shortcuts: Enter = main action, Esc = clear selection, 1-9 = pick a card
  const shownAt = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement || t instanceof HTMLInputElement) return;
      if (document.querySelector('.kit-modal, .assign-float')) return; // dialogs own the keyboard
      if (e.key === 'Enter') {
        if (e.repeat || t instanceof HTMLButtonElement) return;
        if (performance.now() - shownAt.current < 400) return; // swallow double-taps into a fresh decision
        const btn = document.querySelector<HTMLButtonElement>('.prompt-buttons .kit-btn--primary:not(:disabled)');
        if (btn) { e.preventDefault(); btn.click(); }
      } else if (e.key === 'Escape') {
        setUi((u) => ({ ...u, selPiece: null, selCard: null }));
      } else if (/^[1-9]$/.test(e.key) && d?.kind === 'playCard' && d.side === human) {
        const c = s.players[human].hand[Number(e.key) - 1];
        if (c !== undefined) setUi((u) => ({ ...u, selCard: c }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [d, human, s]);

  // reset local selection whenever a new decision arrives
  useEffect(() => {
    shownAt.current = performance.now();
    setUi((u) => ({ ...EMPTY_SEL, hoverHex: u.hoverHex }));
    if (d?.kind === 'move' && d.side === human) {
      const movers = movablePieces(s);
      if (movers.length === 1) setUi((u) => ({ ...u, selPiece: movers[0] }));
    }
    if (d?.kind === 'battle' && d.side === human) {
      const ready = battleReady(s);
      if (ready.length === 1) setUi((u) => ({ ...u, selPiece: ready[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const answer = (a: Answer) => controller.answer(a);
  // the board's marks follow the selection, not the hovered hex: a hover redraws only the path preview (and the tooltip)
  const bui = useMemo(
    () => boardMarks(s, d, ui, human),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, d, human, ...selectionDeps(ui)],
  );
  const pathPreview = useMemo(() => bui.pathAt(ui.hoverHex), [bui, ui.hoverHex]);

  const orderedIds = useMemo(() => new Set(Object.keys(s.turn.ordered)), [s]);
  const doneIds = useMemo(() => {
    const out = new Set<string>();
    if (s.turn.phase === 'battle' && s.active === human) {
      for (const op of Object.values(s.turn.ordered)) if (!op.isLeader && op.battled) out.add(op.id);
    }
    return out;
  }, [s]);

  // ------------------------------------------------------------------ clicks
  const onHexClick = (h: HexId) => {
    if (!d || d.side !== human) return;
    const u = unitAt(s, h);
    const l = leaderAt(s, h);
    switch (d.kind) {
      case 'orders': {
        const elig = new Set(eligiblePieces(s, human, d.card));
        let id: string | null = null;
        if (u && u.side === human && elig.has(u.id)) id = u.id;
        else if (l && l.side === human && elig.has(l.id)) id = l.id;
        if (!id) return;
        toggleOrder(id);
        return;
      }
      case 'move': {
        if (ui.selPiece) {
          const m = pieceMoves(s, ui.selPiece).find((x) => x.hex === h);
          if (m) {
            answer({ kind: 'move', piece: ui.selPiece, to: h });
            return;
          }
        }
        const movers = new Set(movablePieces(s));
        if (u && movers.has(u.id)) setUi({ ...ui, selPiece: u.id });
        else if (l && movers.has(l.id)) setUi({ ...ui, selPiece: l.id });
        else setUi({ ...ui, selPiece: null });
        return;
      }
      case 'battle': {
        if (ui.selPiece) {
          const t = battleTargets(s, ui.selPiece).find((x) => x.hex === h);
          if (t) {
            answer({ kind: 'attack', unit: ui.selPiece, target: h });
            return;
          }
        }
        const ready = new Set(battleReady(s));
        if (u && ready.has(u.id)) setUi({ ...ui, selPiece: u.id });
        else setUi({ ...ui, selPiece: null });
        return;
      }
      case 'retreat':
      case 'leaderRetreat': {
        const i = d.options.findIndex((o) => o.end === h && !('offBoard' in o && o.offBoard));
        if (i >= 0) answer({ kind: 'choose', index: i });
        return;
      }
      case 'advance':
        if (h === d.hex) answer({ kind: 'yesno', yes: true });
        return;
      case 'breakthroughExtra':
        if (d.options.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      case 'bonusMelee':
        if (d.targets.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      case 'shortSupplyHex':
        if (d.options.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      case 'shortSupplyTarget': {
        const i = u ? d.options.indexOf(u.id) : -1;
        if (i >= 0) answer({ kind: 'choose', index: i });
        return;
      }
      case 'combinedArms':
        // a click on one of the listed guns chooses it alone; "No artillery" is a button
        if (u && d.options.includes(u.id)) answer({ kind: 'select', ids: [u.id] });
        return;
      default:
        return;
    }
  };

  const onLeaderClick = (id: string): boolean => {
    if (!d || d.side !== human) return false;
    if (d.kind === 'orders') {
      if (!eligiblePieces(s, human, d.card).includes(id)) return false;
      toggleOrder(id);
      return true;
    }
    if (d.kind === 'move') {
      if (!movablePieces(s).includes(id)) return false;
      setUi({ ...ui, selPiece: id });
      return true;
    }
    return false;
  };

  const toggleOrder = (id: string) => {
    if (!d || d.kind !== 'orders') return;
    const sel = ui.orderSel.includes(id) ? ui.orderSel.filter((x) => x !== id) : [...ui.orderSel, id];
    setUi({ ...ui, orderSel: sel });
  };

  const handlers = useRef({ onHexClick, onLeaderClick });
  handlers.current = { onHexClick, onLeaderClick };
  const onHexClickS = useCallback((h: HexId) => handlers.current.onHexClick(h), []);
  const onLeaderClickS = useCallback((id: string) => handlers.current.onLeaderClick(id), []);
  const onHexHoverS = useCallback((h: HexId | null) => setUi((u) => (u.hoverHex === h ? u : { ...u, hoverHex: h })), []);

  // ------------------------------------------------------------------ prompt
  const prompt = gamePrompt({ controller, view, s, human, ai, ui, setUi, answer, onExit });

  // ------------------------------------------------------------------ hover tooltip
  const hoverInfo = useMemo(() => {
    if (ui.hoverHex === null) return null;
    const h = ui.hoverHex;
    const u = unitAt(s, h);
    const l = leaderAt(s, h);
    const terr = terrainTip(s, h, flipped);
    const obj = objectiveTipLines(s, h);
    if (!u && !l && !terr && !obj.length) return null;
    return { u, l, terr, obj };
  }, [ui.hoverHex, s, flipped]);

  const me = s.players[human];
  const them = s.players[ai];
  // banner totals: permanent banners plus those held through objectives (§18.4)
  const meBanners = bannerCounts(s, human);
  const themBanners = bannerCounts(s, ai);
  const persona = useMemo(() => opponentPersonality(controller.config), [controller]);

  return (
    <div className="game-root">
      <header className="game-top">
        <div className="game-title">
          <span className="gt-name">{controller.scenario.name}</span>
          <span className="gt-year">{controller.scenario.year}</span>
        </div>
        <div className="game-turn">
          Turn {s.turn.number} · <span className={`side-chip side-${s.active === human ? 'me' : 'them'}`}>{s.players[s.active].army}</span>
          {view.aiThinking && <span className="thinking-dots">thinking</span>}
        </div>
        <div className="game-actions">
          <label className="speed">
            Speed
            <select value={view.speed} onChange={(e) => controller.setSpeed(Number(e.target.value))}>
              <option value={0.6}>Slow</option>
              <option value={1}>Normal</option>
              <option value={2}>Fast</option>
              <option value={4}>Very fast</option>
            </select>
          </label>
          <Button variant="ghost" onClick={() => { setMuted(!mutedState); setMutedState(!mutedState); }} title="Sound effects">{mutedState ? 'Sound: off' : 'Sound: on'}</Button>
          <HistoryButton scenario={controller.scenario} flipped={flipped} />
          <Button variant="ghost" onClick={() => setShowRules(true)}>Rules</Button>
          <Button variant="ghost" onClick={() => setConfirmExit(true)}>Menu</Button>
        </div>
      </header>

      <div className="game-main">
        <section
          className="board-wrap"
          onClick={() => !view.pending && !view.over && controller.hurry()}
        >
          <Board
            state={s}
            flipped={flipped}
            humanSide={human}
            walking={view.walking}
            highlights={bui.highlights}
            leaderHighlights={bui.leaderHighlights}
            badges={bui.badges}
            sectionShade={bui.sectionShade}
            pathPreview={pathPreview}
            combat={view.combat}
            flashes={view.flashes}
            orderedIds={orderedIds}
            doneIds={doneIds}
            onHexClick={onHexClickS}
            onHexHover={onHexHoverS}
            onLeaderClick={onLeaderClickS}
          />
          {view.toast && (
            <div
              className={`turn-toast ${view.toast.kind === 'notice' ? 'toast-notice' : ''}`}
              key={view.toast.id}
              {...(view.toast.kind === 'notice' ? { role: 'status', 'aria-live': 'polite' as const } : {})}
            >
              {view.toast.text}
            </div>
          )}
          {view.cardShow && (
            <div className="card-show" key={view.cardShow.id}>
              <div className="card-show-label">{s.players[view.cardShow.side].commander} plays</div>
              <CardView kind={view.cardShow.kind} size="lg" />
            </div>
          )}
        </section>

        <aside className="side-col">
          <Panel className="army-panel">
            <div className="army-row">
              <div>
                <div className="army-name them">{them.army}</div>
                <div className="army-cmd" title={`${them.commander} — ${persona.name}: ${persona.epithet} · ${DIFF_LABEL[controller.config.difficulty]} · ${commandLabel(s, ai)}`}>{them.commander} · {persona.name} · {DIFF_LABEL[controller.config.difficulty]}</div>
              </div>
              <div className="ai-hand" title={`${them.hand.length} command cards`}>
                {Array.from({ length: them.hand.length }).map((_, i) => <CardBack key={i} size="sm" style={{ fontSize: '1.7px', marginLeft: i ? -9 : 0 }} />)}
              </div>
            </div>
            <BannerTrack count={themBanners.total} held={themBanners.held} target={s.bannersToWin} nation={me.nation} label="Banners won" />
            <div className="divider" />
            <div className="army-row">
              <div>
                <div className="army-name me">{me.army} <span className="you">(you)</span></div>
                <div className="army-cmd">{me.commander} · {commandLabel(s, human)}</div>
              </div>
            </div>
            <BannerTrack count={meBanners.total} held={meBanners.held} target={s.bannersToWin} nation={them.nation} label="Banners won" />
            <div className="deck-row">Deck {s.deck.length} · Discards {s.discard.length}</div>
          </Panel>
          <div className="dice-slot">
            {view.dice ? (
              <DiceTray key={view.dice.id} faces={view.dice.faces} scoring={view.dice.rolling ? undefined : view.dice.scoring} rolling={view.dice.rolling} title={view.dice.title} subtitle={view.dice.subtitle} dieSize={32} />
            ) : (
              <div className="dice-empty">Battle dice will appear here</div>
            )}
          </div>
          <LogPanel log={view.log} human={human} />
        </aside>
      </div>

      <footer className="bottom-strip">
        <div className="hand-cards">
          {me.hand.map((c) => {
            const playable = d?.kind === 'playCard' && d.side === human;
            const k = cardKind(c);
            return (
              <div key={c} className={`hand-slot ${ui.selCard === c ? 'is-selected' : ''} ${playable ? 'is-playable' : ''}`}>
                <CardView
                  kind={k}
                  size="sm"
                  selected={ui.selCard === c}
                  disabled={!playable}
                  onClick={() => playable && setUi({ ...ui, selCard: ui.selCard === c ? null : c })}
                  onHover={(hv) => setUi((u) => ({ ...u, hoverCard: hv ? c : u.hoverCard === c ? null : u.hoverCard }))}
                />
              </div>
            );
          })}
        </div>
        {ui.hoverCard !== null && me.hand.includes(ui.hoverCard) && (
          <div className="card-preview">
            <CardView kind={cardKind(ui.hoverCard)} size="lg" />
          </div>
        )}
        {prompt && (
            <div className={`prompt-bar ${prompt.tone ? `tone-${prompt.tone}` : ''}`}>
              {prompt.dice && (
                <div className="prompt-dice" aria-hidden>
                  {prompt.dice.map((f, i) => <DieView key={i} face={f} size={30} />)}
                </div>
              )}
              <div className="prompt-text">
                <div className="prompt-title">{prompt.title}</div>
                {prompt.text && <div className="prompt-sub" title={prompt.text}>{prompt.text}</div>}
                {view.error && <div className="prompt-err">{view.error}</div>}
              </div>
              <div className="prompt-buttons">{prompt.buttons}</div>
            </div>
          )}
      </footer>

      <HoverTip active={!!hoverInfo}>
        {hoverInfo?.u && (
          <>
            <div className="tip-head">
              <svg width={46} height={46} viewBox="-25 -27 50 50"><UnitIcon unitKey={hoverInfo.u.key} size={42} /></svg>
              <div>
                <div className="tip-title">{s.players[hoverInfo.u.side].army} {UNIT_STATS[hoverInfo.u.key].name}</div>
                <div className="tip-sub">{hoverInfo.u.blocks}/{hoverInfo.u.maxBlocks} blocks</div>
              </div>
            </div>
            {unitSummary(hoverInfo.u).map((x) => <div key={x} className="tip-line">{x}</div>)}
          </>
        )}
        {hoverInfo?.l && <div className="tip-line tip-leader">Leader: {hoverInfo.l.name || 'unnamed'}{leaderUnit(s, hoverInfo.l) ? ' (attached)' : ' (alone)'}</div>}
        {hoverInfo?.l && leaderTraitLines(hoverInfo.l).map((x) => <div key={x} className="tip-line tip-leader">{x}</div>)}
        {hoverInfo?.terr && <TerrainTipBlock tip={hoverInfo.terr} alone={!hoverInfo.u && !hoverInfo.l} />}
        {hoverInfo?.obj.map((x) => <div key={x} className="tip-line tip-objective">{x}</div>)}
      </HoverTip>

      <RulesDialog open={showRules} title="Rules Reference" scenario={controller.scenario} onClose={() => setShowRules(false)} />

      <Modal open={confirmExit} title="Leave the battle?" onClose={() => setConfirmExit(false)}>
        <p className="modal-p">Your battle is saved automatically — you can continue it from the main menu.</p>
        <div className="modal-buttons">
          <Button onClick={onExit}>Return to menu</Button>
          <Button variant="secondary" onClick={() => setConfirmExit(false)}>Keep fighting</Button>
        </div>
      </Modal>

      <Modal open={!!view.over} title={view.over ? (view.over.winner === human ? 'Victory!' : view.over.winner === 'draw' ? 'A Draw' : 'Defeat') : ''}>
        {view.over && <BattleResult
          state={s} human={human} over={view.over} onExit={onExit} onRematch={onRematch} firstLeg={controller.config.firstLeg}
        />}
      </Modal>
    </div>
  );
}

/** The size of a side's hand, for its army line. */
function commandLabel(s: GameState, side: Side): string {
  return `${s.players[side].cards} cards`;
}
