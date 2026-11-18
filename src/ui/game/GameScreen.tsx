import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  COLS, ROWS, UNIT_STATS, cardKind, hexId, leaderAt, leaderUnit, other, unitAt,
  type Answer, type GameState, type HexId, type Side,
} from '../../engine';
import { UnitIcon } from '../../art';
import { BannerTrack, Button, CardBack, CardView, DiceTray, Modal, Panel } from '../kit';
import { nationInk } from '../kit/theme';
import { BattleResult } from './BattleResult';
import { Board } from './Board';
import type { GameController } from './controller';
import { CommittedCard, committedShown, GuerrillaCounters, HandSizeLine, HandStrip, HoverTip, LogPanel } from './panels';
import { PromptBar, focusNewDecision, focusPromptTarget, gamePrompt } from './prompts';
import { boardKeyStep, enterBelongsToHand, freshSelection, globalKeyAction, hexLabel, jumpTarget, nextRegion } from './boardKeys';
import { hexClick, leaderClick, type ClickResult } from './hexClick';
import { bannerCounts, objectiveSummary, objectiveTipLines } from './objectiveText';
import { boardMarks, escapeSelection, handChoices, selectionDeps, type UiSel } from './uiModel';
import { leaderLines, unitSummary } from './unitText';
import { SquareTrack } from './SquareTrack';
import { commandText, squareLines } from './squareText';
import { TerrainTipBlock } from './TerrainTipBlock';
import { terrainTip } from './terrainTips';
import { RulesDialog } from '../screens/RulesDialog';
import { HistoryButton } from '../history/HistoryButton';
import { isMuted, setMuted } from '../sound';
import { opponentPersonality } from './makeOpponent';
import './game.css';

const EMPTY_SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, hoverAction: null, assign: null, gunSel: [] };

const DIFF_LABEL = { captain: 'Captain', colonel: 'Colonel', marshal: 'Marshal' } as const;

export function GameScreen({ controller, onExit, onRematch }: {
  controller: GameController;
  onExit: () => void;
  /** After the battle: play it again, with the same or switched sides. */
  onRematch?: (switchSides: boolean) => void;
}) {
  const view = useSyncExternalStore(controller.subscribe, controller.getView, controller.getView);
  const s = view.display;
  const human = view.humanSide;
  const ai = other(human);
  const flipped = human === 'top';
  const d = view.pending;
  const [ui, setUi] = useState<UiSel>(EMPTY_SEL);
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  // a refused click's reason, kept only while the assignment it was refused against is the one on show
  const [refusal, setRefusal] = useState<{ text: string; assign: UiSel['assign'] } | null>(null);
  const [mutedState, setMutedState] = useState(isMuted());

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __ccn: GameController }).__ccn = controller;
  }, [controller]);

  // the keyboard cursor of the board: where it is, and whether the keyboard (not the mouse) is driving it
  const [cursor, setCursor] = useState<HexId>(() => hexId(Math.floor(ROWS / 2), Math.floor(COLS / 2)));
  const [kbd, setKbd] = useState(false);
  const kbdRef = useRef(false);
  kbdRef.current = kbd;
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  /** Moves the focus to the board, the prompt's buttons or the hand. */
  const goTo = (region: 'board' | 'prompt' | 'hand') => {
    if (region === 'board') {
      document.querySelector<SVGSVGElement>('.board-svg')?.focus();
      setKbd(true);
    } else if (region === 'prompt') {
      focusPromptTarget(document);
    } else {
      const card = document.querySelector<HTMLElement>('.hand-cards [tabindex="0"]');
      if (card) card.focus(); else goTo(nextRegion('hand', false));
    }
  };

  // keyboard shortcuts: Enter = main action, Esc = clear selection, 1-9 = pick a card, B / P / F6 = move between board, prompt and hand
  const shownAt = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement || t instanceof HTMLInputElement) return;
      const modal = !!document.querySelector('.kit-modal');
      if (modal) return; // dialogs own the keyboard
      const active = document.activeElement;
      const g = globalKeyAction(
        { key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey },
        { inGame: !active || active === document.body || !!active.closest('.game-root'), typing: t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable), modal },
      );
      if (e.key === 'Enter') {
        // a focused hand card selects itself on Enter: no second action on the prompt's primary button
        if (enterBelongsToHand(t instanceof Element ? t : null, e.defaultPrevented)) return;
        // the board's own handler takes Enter while its cursor is shown; after a mouse click Enter is the main action, as elsewhere
        if (t instanceof Element && t.closest('.board-svg') && kbdRef.current) return;
        if (t instanceof HTMLButtonElement) {
          // a held Enter must not press the focused prompt button of each new decision in turn
          if ((e.repeat || performance.now() - shownAt.current < 400) && t.closest('.prompt-buttons')) e.preventDefault();
          return;
        }
        if (e.repeat) return;
        if (performance.now() - shownAt.current < 400) return; // swallow double-taps into a fresh decision
        const btn = document.querySelector<HTMLButtonElement>('.prompt-buttons .kit-btn--primary:not(:disabled):not([data-nofocus])');
        if (btn) { e.preventDefault(); btn.click(); }
      } else if (e.key === 'Escape') {
        // Escape also disarms the Élan / Rally die
        setUi((u) => escapeSelection(s, d, human, u));
      } else if (g) {
        e.preventDefault();
        if (g === 'board' || g === 'prompt') goTo(g);
        else {
          const from = active?.closest('.board-svg') ? 'board' : active?.closest('.prompt-bar') ? 'prompt' : active?.closest('.hand-cards') ? 'hand' : 'other';
          goTo(nextRegion(from, g === 'cycleBack'));
        }
      } else if (/^[1-9]$/.test(e.key) && (d?.kind === 'playCard' || d?.kind === 'moveFirst') && d.side === human) {
        const c = s.players[human].hand[Number(e.key) - 1];
        if (c !== undefined && handChoices(s, d, human).includes(c)) setUi((u) => ({ ...u, selCard: c }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, human, s]);

  // reset local selection whenever a new decision arrives
  useEffect(() => {
    shownAt.current = performance.now();
    setRefusal(null);
    setUi((u) => ({ ...freshSelection(s, d, human), hoverHex: u.hoverHex }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  // a new decision of the human's: the cursor goes to its first marked hex and, when the focus is already in the board, stays
  // there; otherwise the focus goes to the prompt (unless the pointer is on the board)
  const overBoard = useRef(false);
  useEffect(() => {
    const inBoard = !!document.activeElement?.closest('.board-svg');
    const jump = jumpTarget(s, d, human, overBoard.current, inBoard, flipped);
    if (jump) setCursor(jump.cursor);
    // the keyboard stays in the board: its tooltip and path preview appear at once, as when it steps there
    if (jump && jump.keepFocus) setUi((u) => (u.hoverHex === jump.cursor ? u : { ...u, hoverHex: jump.cursor }));
    if (jump?.keepFocus) return;
    focusNewDecision(d, human, inBoard ? false : overBoard.current, document);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, human]);

  const answer = (a: Answer) => controller.answer(a);
  // the board's marks follow the selection, not the hovered hex: a hover redraws only the path preview (and the tooltip)
  const bui = useMemo(
    () => boardMarks(s, d, ui, human),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, d, human, ...selectionDeps(ui)],
  );
  const pathPreview = useMemo(() => bui.pathAt(ui.hoverHex), [bui, ui.hoverHex]);

  const cursorLabel = useMemo(
    () => hexLabel(s, cursor, bui.highlights, { badges: bui.badges, decision: d, leaderMarks: bui.leaderHighlights }),
    [s, cursor, bui, d],
  );
  // the live region speaks when the cursor moves or jumps (or the keyboard takes the board), not whenever the hex's label
  // changes under a resting cursor: the label is read through a ref
  const labelRef = useRef(cursorLabel);
  labelRef.current = cursorLabel;
  const [live, setLive] = useState('');
  useEffect(() => {
    setLive(kbd ? labelRef.current : '');
  }, [kbd, cursor]);
  // the tooltip of the cursor hex sits at the cursor while the keyboard drives it
  useEffect(() => {
    if (!kbd) { setAnchor(null); return; }
    const r = document.getElementById(`board-cursor-${cursor}`)?.getBoundingClientRect();
    setAnchor(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
  }, [kbd, cursor, flipped]);

  const orderedIds = useMemo(() => new Set(Object.keys(s.turn.ordered)), [s]);
  const doneIds = useMemo(() => {
    const out = new Set<string>();
    if (s.turn.phase === 'battle' && s.active === human) {
      for (const op of Object.values(s.turn.ordered)) if (!op.isLeader && op.battled) out.add(op.id);
    }
    return out;
  }, [s]);

  // ------------------------------------------------------------------ clicks
  // what a click does is `hexClick` / `leaderClick` (hexClick.ts); the keyboard's Enter goes through the same two
  const apply = (r: ClickResult) => {
    if (r.ui) setUi(r.ui);
    if (r.refusal !== undefined) setRefusal(r.refusal);
    if (r.answer) answer(r.answer);
  };
  const onHexClick = (h: HexId) => apply(hexClick(s, d, ui, h, human));
  const onLeaderClick = (id: string): boolean => {
    const r = leaderClick(s, d, ui, id, human);
    if (r.handled) apply(r);
    return r.handled;
  };

  const handlers = useRef({ onHexClick, onLeaderClick, s });
  handlers.current = { onHexClick, onLeaderClick, s };
  // a click with the mouse puts the cursor on the hex and hides it: Enter after it is the main action, not a click on a stale hex
  const onHexPointer = useCallback((h: HexId) => {
    setCursor(h);
    setKbd(false);
    handlers.current.onHexClick(h);
  }, []);
  const onLeaderPointer = useCallback((id: string) => {
    const l = handlers.current.s.leaders.find((x) => x.id === id);
    if (l && l.hex >= 0) setCursor(l.hex);
    setKbd(false);
    return handlers.current.onLeaderClick(id);
  }, []);
  const onHexHoverS = useCallback((h: HexId | null) => setUi((u) => (u.hoverHex === h ? u : { ...u, hoverHex: h })), []);
  const onBoardKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = boardKeyStep({ cursor, key: e.key, shift: e.shiftKey, repeat: e.repeat, flipped, leaderAt: (h) => leaderAt(s, h)?.id ?? null, cursorShown: kbd });
    if (!step.handled) return;
    e.preventDefault();
    if (step.cursor !== undefined) setCursor(step.cursor);
    if (step.showCursor) setKbd(true);
    // the path preview, dice line and tooltip follow the cursor as they follow the pointer
    if (step.hover !== undefined) setUi((u) => (u.hoverHex === step.hover ? u : { ...u, hoverHex: step.hover as HexId }));
    if (step.leaderId !== undefined) { if (!handlers.current.onLeaderClick(step.leaderId)) handlers.current.onHexClick(cursor); }
    else if (step.clickHex !== undefined) handlers.current.onHexClick(step.clickHex);
  };
  const onBoardFocus = (e: React.FocusEvent<SVGSVGElement>) => { if (e.currentTarget.matches(':focus-visible')) setKbd(true); };
  const onBoardBlur = () => {
    if (kbdRef.current) setUi((u) => (u.hoverHex === null ? u : { ...u, hoverHex: null })); // the keyboard's hover goes with its focus
    setKbd(false);
  };

  // ------------------------------------------------------------------ prompt
  const prompt = gamePrompt({ controller, view, s, human, ai, ui, setUi, answer, onExit, assignNote: refusal && refusal.assign === ui.assign ? refusal.text : null });

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
    // each side in its nation's colour (chips, army names, log marks); yours also says "(you)"
    <div className="game-root" style={{ '--side-me': nationInk(me.nation), '--side-them': nationInk(them.nation) } as React.CSSProperties}>
      <header className="game-top">
        <div className="game-title">
          <span className="gt-name" title={`${controller.scenario.name} ${controller.scenario.year}`}>{controller.scenario.name}</span>
          <span className="gt-year">{controller.scenario.year}</span>
        </div>
        <div className="game-turn">
          Turn {s.turn.number} · <span className={`side-chip side-${s.active === human ? 'me' : 'them'}`}>{s.players[s.active].army}{s.active === human && <span className="you"> (you)</span>}</span>
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
          onMouseEnter={() => { overBoard.current = true; }}
          onMouseLeave={() => { overBoard.current = false; }}
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
            onHexClick={onHexPointer}
            onHexHover={onHexHoverS}
            onLeaderClick={onLeaderPointer}
            cursor={cursor}
            cursorLabel={cursorLabel}
            cursorShown={kbd}
            onBoardKeyDown={onBoardKeyDown}
            onBoardFocus={onBoardFocus}
            onBoardBlur={onBoardBlur}
            onBoardPointerDown={() => setKbd(false)}
          />
          <div className="board-live" role="status" aria-live="polite">{live}</div>
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
                <div className="army-cmd" title={`${them.commander} — ${persona.name}: ${persona.epithet} · ${DIFF_LABEL[controller.config.difficulty]}`}>{them.commander} · {persona.name} · {DIFF_LABEL[controller.config.difficulty]}</div>
                <div className="army-cmd army-hand">{commandText(s, ai)}</div>
                <HandSizeLine s={s} side={ai} />
              </div>
              <CommittedCard s={s} side={ai} />
              <div className="ai-hand" title={`${them.hand.length} command cards`}>
                {Array.from({ length: them.hand.length - (committedShown(s, ai) ? 1 : 0) }).map((_, i) => <CardBack key={i} size="sm" style={{ fontSize: '1.7px', marginLeft: i ? -9 : 0 }} />)}
              </div>
            </div>
            <GuerrillaCounters s={s} side={ai} />
            <BannerTrack count={themBanners.total} held={themBanners.held} target={s.bannersToWin} nation={me.nation} label="Banners won" detail={objectiveSummary(s, ai)} />
            <SquareTrack side={ai} owner={false} s={s} />
            <div className="divider" />
            <div className="army-row">
              <div>
                <div className="army-name me">{me.army} <span className="you">(you)</span></div>
                <div className="army-cmd">{me.commander}</div>
                <div className="army-cmd army-hand">{commandText(s, human)}</div>
                <HandSizeLine s={s} side={human} />
              </div>
            </div>
            <GuerrillaCounters s={s} side={human} />
            <BannerTrack count={meBanners.total} held={meBanners.held} target={s.bannersToWin} nation={them.nation} label="Banners won" detail={objectiveSummary(s, human)} />
            <SquareTrack side={human} owner s={s} />
            <div className="deck-row">Deck {s.deck.length} · Discards {s.discard.length}</div>
          </Panel>
          {prompt?.panel}
          {/* the Élan / Rally panel shows the same dice, so the tray makes room for the log while it is open */}
          {!prompt?.panel && (
            <div className="dice-slot">
              {view.dice ? (
                <DiceTray key={view.dice.id} faces={view.dice.faces} scoring={view.dice.rolling ? undefined : view.dice.scoring} rolling={view.dice.rolling} title={view.dice.title} subtitle={view.dice.subtitle} dieSize={32} />
              ) : (
                <div className="dice-empty">Battle dice will appear here</div>
              )}
            </div>
          )}
          <LogPanel log={view.log} human={human} />
        </aside>
      </div>

      <footer className="bottom-strip">
        <HandStrip s={s} d={d} human={human} ui={ui} setUi={setUi} />
        {ui.hoverCard !== null && me.hand.includes(ui.hoverCard) && (
          <div className="card-preview">
            <CardView kind={cardKind(ui.hoverCard)} size="lg" />
          </div>
        )}
        <PromptBar prompt={prompt} error={view.error} />
      </footer>

      <HoverTip active={!!hoverInfo} anchor={kbd ? anchor : null}>
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
            {squareLines(s, hoverInfo.u).map((x) => <div key={x} className="tip-line tip-square">{x}</div>)}
          </>
        )}
        {hoverInfo?.l && <div className="tip-line tip-leader">Leader: {hoverInfo.l.name || 'unnamed'}{leaderUnit(s, hoverInfo.l) ? ' (attached)' : ' (alone)'}</div>}
        {hoverInfo?.l && leaderLines(s, hoverInfo.l).map((x) => <div key={x} className="tip-line tip-leader">{x}</div>)}
        {hoverInfo?.terr && <TerrainTipBlock tip={hoverInfo.terr} alone={!hoverInfo.u && !hoverInfo.l} />}
        {hoverInfo?.obj.map((x) => <div key={x} className="tip-line tip-objective">{x}</div>)}
      </HoverTip>

      <RulesDialog open={showRules} title="Rules Reference" scenario={controller.scenario} onClose={() => setShowRules(false)} />

      <Modal open={confirmExit} title="Leave the battle?" onClose={() => setConfirmExit(false)}>
        <p className="modal-p">Your battle is saved automatically — you can continue it from the main menu.</p>
        <div className="modal-buttons">
          <Button onClick={onExit}>Return to menu</Button>
          <Button variant="secondary" data-autofocus onClick={() => setConfirmExit(false)}>Keep fighting</Button>
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
