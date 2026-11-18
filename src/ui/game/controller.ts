// Game session controller: owns the engine driver, runs the AI, and turns engine events into paced animations.
import {
  CARD_LIST, GameDriver, OFF_BOARD, bannerTotal, battleTargets, cloneState, createGame, freshSeed, other, pieceById, randomAnswer,
  type Answer, type CardKind, type Decision, type DieFace, type GameEvent, type GameState, type HexId, type Leader, type QueuedEvent,
  type RollPurpose, type Side, type UndoStep, type Unit,
} from '../../engine';
import { DIFFICULTIES, chooseAnswer, newMemory, personalityById, type AiMemory, type AiOptions, type Difficulty } from '../../ai';
import { SCENARIOS, scenarioById } from '../../scenarios';
import type { Opponent } from './opponent';
import { eventLog, pieceKind, rollSummary, rollTitle } from './logText';
import { sfx } from '../sound';
import { storage, storageKey } from '../storage';
import { outcomeFor, recordFinished, type Medal } from '../record';

export type { Difficulty };

export interface SessionConfig {
  scenarioId: string;
  humanSide: Side;
  difficulty: Difficulty;
  seed: number;
  /** Personality id override (optional). */
  personality?: string;
  /** Dev/testing: card kinds dealt into the human's opening hand. */
  devCards?: CardKind[];
  /** Extra AI options merged into every AI the session builds (tests: budget and determinism). */
  ai?: Partial<AiOptions>;
  /** The second battle of a both-sides match (started with Switch sides): how the first one ended. */
  firstLeg?: LegResult;
}

/** How a finished battle ended, kept to sum up a both-sides match. */
export interface LegResult {
  /** The army the human commanded. */
  humanSide: Side;
  /** Banners each side had won (held banners included). */
  banners: Record<Side, number>;
  winner: Side | 'draw';
}

export function legResult(state: GameState, humanSide: Side, winner: Side | 'draw'): LegResult {
  const won = (side: Side) => Math.max(0, bannerTotal(state, side));
  return { humanSide, banners: { top: won('top'), bottom: won('bottom') }, winner };
}

export interface SavedGame {
  version: 1;
  /** Engine/scenario data version: saves from another version are discarded. */
  engine?: number;
  config: SessionConfig;
  answers: Answer[];
  savedAt: number;
  /** Consistency check for the replay. */
  check?: { n: number; rngCalls: number };
}

/** Bump when engine rules or scenario data change in a way that breaks replays of old saves. */
export const ENGINE_VERSION = 3;

export interface LogLine {
  id: number;
  text: string;
  side?: Side;
  kind: 'info' | 'card' | 'combat' | 'result' | 'banner' | 'say' | 'turn' | 'victory';
}

export interface DiceShow {
  id: number;
  title: string;
  subtitle: string;
  faces: DieFace[];
  scoring: boolean[];
  rolling: boolean;
  purpose: RollPurpose;
}

export interface Flash {
  id: number;
  hex: HexId;
  text: string;
  kind: 'hit' | 'flag' | 'banner' | 'info' | 'rally';
}

export interface CardShow {
  id: number;
  kind: CardKind;
  side: Side;
}

export interface ViewState {
  display: GameState;
  pending: Decision | null; // decision awaiting the human
  humanSide: Side;
  log: LogLine[];
  dice: DiceShow | null;
  flashes: Flash[];
  cardShow: CardShow | null;
  /** Position overrides while a piece walks along a path. */
  walking: Record<string, HexId>;
  /** Combat highlight: attacker and target hexes. */
  combat: { from: HexId; to: HexId } | null;
  aiThinking: boolean;
  /** "Let the general decide" is waiting for his answer: the prompt shows no answer buttons. */
  generalThinking: boolean;
  error: string | null;
  /** The battle is over: who won, why, and the medal the human's side earned by it, when better than before. */
  over: { winner: Side | 'draw'; reason: string; newMedal?: Medal } | null;
  /** What the human's Undo takes back now: a move, a placement, or the card just played with its orders; null for none. */
  undo: UndoStep | null;
  speed: number; // 1 = normal, 2 = fast, 0.6 = slow
  /** Centre-board announcement: 'turn' = "Your turn"; 'notice' = a longer message (why a click did nothing). */
  toast: { id: number; text: string; kind?: 'turn' | 'notice' } | null;
  /** The game loop failed and cannot continue. */
  fatal: boolean;
}

const SAVE_KEY = storageKey('autosave-v1');

export function loadSaved(): SavedGame | null {
  const raw = storage.get(SAVE_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SavedGame;
    const ok = !!s && s.version === 1 && s.engine === ENGINE_VERSION && typeof s.config?.scenarioId === 'string' &&
      (DIFFICULTIES as readonly string[]).includes(s.config.difficulty) &&
      Array.isArray(s.answers) && SCENARIOS.some((x) => x.id === s.config.scenarioId);
    if (!ok) {
      clearSaved();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSaved() {
  storage.remove(SAVE_KEY);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The opening position of a session: the scenario (also when a save is replayed), plus any dev opening hand. */
export function initialState(config: SessionConfig): GameState {
  const initial = createGame(scenarioById(config.scenarioId).setup, config.seed);
  if (config.devCards?.length) {
    const hand = initial.players[config.humanSide].hand;
    config.devCards.forEach((k, i) => {
      const id = initial.deck.findIndex((c) => CARD_LIST[c] === k);
      if (id >= 0 && i < hand.length) {
        const card = initial.deck.splice(id, 1)[0];
        initial.deck.push(hand[i]);
        hand[i] = card;
      }
    });
  }
  return initial;
}

let seq = 1;

/**
 * The in-thread general (tests, and a session built without one): the computer's own policy answers for the human side,
 * cheaply and the same way every run.
 */
export class LocalGeneral implements Opponent {
  private readonly mem: AiMemory = newMemory();
  /** The options of the latest decision. */
  lastOpts: AiOptions | null = null;
  constructor(private readonly config: SessionConfig) {}
  async decide(state: GameState, d: Decision) {
    const opts: AiOptions = {
      side: d.side, difficulty: this.config.difficulty, personality: personalityById('veteran'), seed: this.config.seed,
      budgetScale: 0.05, deterministic: true, ...this.config.ai,
    };
    this.lastOpts = opts;
    return chooseAnswer(state, d, opts, this.mem);
  }
  dispose() {}
}

export class GameController {
  readonly config: SessionConfig;
  driver: GameDriver;
  view: ViewState;
  private listeners = new Set<() => void>();
  private opponent: Opponent;
  private busy = false;
  private disposed = false;
  /** When the human declared a melee (an attack or a bonus melee) whose first card or roll is not yet shown. */
  private declaredAt: number | null = null;
  private skipAnim = false;
  /** The piece the latest 'removed' event took off the board: the banner event after an exit names it. */
  private gone: { id: string; name: string } | null = null;
  /** Toasts waiting for the notice on the board to run its full time (see `toast`). */
  private toastQueue: { text: string; kind: 'turn' | 'notice'; ms: number; stale?: () => boolean }[] = [];
  /** The turn whose "Your turn" toast has been shown: once per turn, also when its first decision is taken back. */
  private toldTurn = -1;
  /**
   * For each of the human's answers, by its place among the recorded answers, the id the next log line got when it was
   * given: an undo drops the lines with an id from there on (the log is capped, so a line's place in it is no stable index).
   */
  private logMarks = new Map<number, number>();
  /**
   * The finished battle as it went into the player's record, with the medal it earned: recorded once, however often the
   * loop comes back to the end.
   */
  private recorded: { newMedal?: Medal } | null = null;

  constructor(config: SessionConfig, opponent: Opponent, answers: Answer[] = [], check?: SavedGame['check'], general?: Opponent) {
    this.config = config;
    this.opponent = opponent;
    this.general = general ?? new LocalGeneral(config);
    const sc = scenarioById(config.scenarioId);
    const initial = initialState(config);
    if (answers.length) {
      this.driver = GameDriver.replay(initial, answers, { snapshots: true });
      if (check && (this.driver.answers.length !== check.n || this.driver.state.rngCalls !== check.rngCalls)) {
        throw new Error('incompatible save');
      }
    } else {
      this.driver = new GameDriver(initial, { snapshots: true });
    }
    const speed = initialSpeed(storage.get(storageKey('speed')), prefersReducedMotion());
    this.view = {
      display: cloneState(this.driver.state),
      pending: null,
      humanSide: config.humanSide,
      log: [],
      dice: null,
      flashes: [],
      cardShow: null,
      walking: {},
      combat: null,
      aiThinking: false,
      generalThinking: false,
      error: null,
      over: null,
      undo: null,
      speed,
      toast: null,
      fatal: false,
    };
    if (answers.length) this.addLog({ text: 'Battle resumed from your last save.', kind: 'info' });
    else {
      this.addLog({ text: `${sc.name} (${sc.year}).`, kind: 'turn' });
      if (!this.driver.state.special.moveFirst) this.addLog({ text: `The ${this.driver.state.players[this.driver.state.first].army} army moves first.`, kind: 'info' });
    }
    if (answers.length) this.driver.drainEvents();
    this.run();
  }

  private run() {
    this.pump().catch((e) => this.fail(e));
  }

  private fail(e: unknown) {
    console.error('Game loop failed', e);
    this.busy = false;
    const msg = e instanceof Error ? e.message : String(e);
    this.set({ aiThinking: false, pending: null, error: `The battle could not continue: ${msg}`, fatal: true });
  }

  // ---------------------------------------------------------------- subscription
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  /** The general who decides for the human ("Let the general decide"): in the app a worker of his own. */
  private general: Opponent;
  /** Bumped when an answer in flight is no longer wanted (the player answered or took back a move). */
  private thinkSeq = 0;
  /**
   * "Let the general decide": the general answers the pending human decision. His answer comes late, so it is applied only
   * if that same decision is still pending and the controller still lives; otherwise it is dropped.
   */
  async autoAnswer(): Promise<void> {
    const d = this.view.pending;
    if (!d || this.busy || this.view.fatal || this.view.generalThinking || this.disposed) return;
    const seq = ++this.thinkSeq;
    this.set({ generalThinking: true });
    let answer: Answer;
    try {
      answer = (await this.general.decide(cloneState(this.driver.state), d)).answer;
    } catch (e) {
      if (this.disposed || seq !== this.thinkSeq) return;
      console.error('The general failed', e);
      answer = randomAnswer(this.driver.state, d, Math.random);
    }
    if (this.disposed || seq !== this.thinkSeq) return;
    this.set({ generalThinking: false });
    if (this.view.pending !== d) return;
    this.answer(answer);
  }
  private set(patch: Partial<ViewState>) {
    this.view = { ...this.view, ...patch };
    for (const l of this.listeners) l();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.opponent.dispose();
    this.general.dispose();
    this.listeners.clear();
  }

  setSpeed(speed: number) {
    storage.set(storageKey('speed'), String(speed));
    this.set({ speed });
  }

  /** Skip the remaining animations of the current batch. */
  hurry() {
    this.skipAnim = true;
  }

  private dur(ms: number) {
    if (this.skipAnim) return 0;
    return ms / (this.view.speed || 1);
  }

  private addLog(l: Omit<LogLine, 'id'>) {
    const log = [...this.view.log, { ...l, id: seq++ }];
    if (log.length > 400) log.splice(0, log.length - 400);
    this.set({ log });
  }

  private save() {
    if (this.disposed) return;
    const s: SavedGame = {
      version: 1, engine: ENGINE_VERSION, config: this.config, answers: this.driver.answers, savedAt: Date.now(),
      check: { n: this.driver.answers.length, rngCalls: this.driver.state.rngCalls },
    };
    if (this.driver.state.winner) clearSaved();
    else storage.set(SAVE_KEY, JSON.stringify(s));
  }

  // ---------------------------------------------------------------- human input
  answer(a: Answer) {
    if (!this.view.pending || this.busy || this.view.fatal) return;
    const d = this.view.pending;
    const at = this.driver.answers.length;
    const melee = a.kind === 'attack'
      ? battleTargets(this.driver.state, a.unit).find((t) => t.hex === a.target)?.kind === 'melee'
      : d.kind === 'bonusMelee' && a.kind === 'hex' && a.hex !== null;
    let ok: boolean;
    try {
      ok = this.driver.answer(a);
    } catch (e) {
      console.error(e);
      // the generator is dead: rebuild it from the recorded answers
      this.driver = GameDriver.replay(this.driver.initial, this.driver.answers, { snapshots: true });
      this.set({ error: 'That order could not be resolved — try another.', pending: this.driver.pending, display: cloneState(this.driver.state), undo: this.undoable(this.driver.pending) });
      return;
    }
    if (!ok) {
      this.set({ error: this.driver.lastError });
      return;
    }
    if (melee) this.declaredAt = performance.now();
    this.logMarks.set(at, seq);
    this.thinkSeq++;
    this.set({ pending: null, error: null, undo: null, generalThinking: false });
    this.save();
    this.run();
  }

  /**
   * What the human may take back at decision `d` (`GameDriver.undoStep`): a move, or the card played with its orders until a
   * unit moves or battles.
   */
  private undoable(d: Decision | null): UndoStep | null {
    // never after a Scout's cards are shown: undoing would return them to the deck top, known to the player
    return d?.side === this.config.humanSide && d.kind !== 'scoutKeep' ? this.driver.undoStep() : null;
  }

  undo() {
    if (!this.view.undo || this.busy || !this.driver.canUndo()) return;
    this.thinkSeq++;
    this.declaredAt = null;
    this.driver = this.driver.undo();
    this.driver.drainEvents();
    // the lines the step logged go with it ("… plays …", an arrival)
    const from = this.driver.answers.length;
    const mark = this.logMarks.get(from);
    for (const k of this.logMarks.keys()) if (k >= from) this.logMarks.delete(k);
    if (mark !== undefined) this.set({ log: this.view.log.filter((l) => l.id < mark) });
    const p = this.driver.pending;
    this.set({ display: cloneState(this.driver.state), pending: p && p.side === this.config.humanSide ? p : null, undo: this.undoable(p), error: null, walking: {}, generalThinking: false });
    this.save();
    if (p && p.side !== this.config.humanSide) this.run();
  }

  // ---------------------------------------------------------------- main loop
  private async pump() {
    if (this.busy || this.disposed) return;
    this.busy = true;
    try {
      for (;;) {
        const asked = this.askAhead();
        await this.playEvents();
        if (this.disposed) return;
        const st = this.driver.state;
        if (st.winner || !this.driver.pending) {
          if (!st.winner) throw new Error('the battle ended without a winner');
          const winner = st.winner;
          const { scenarioId, humanSide, difficulty } = this.config;
          this.recorded ??= { newMedal: recordFinished(scenarioId, humanSide, difficulty, outcomeFor(humanSide, winner)) ?? undefined };
          const over = { winner, reason: st.winReason, newMedal: this.recorded.newMedal };
          this.set({ over, pending: null, display: cloneState(st), aiThinking: false });
          if (winner === this.config.humanSide) sfx.victory();
          else sfx.defeat();
          this.save();
          return;
        }
        const d = this.driver.pending;
        if (d.side === this.config.humanSide) {
          if (d.kind === 'playCard') this.yourTurn(st.turn.number);
          const combat = d.kind === 'defend'
            ? { from: this.hexOf(d.attacker, st), to: this.hexOf(d.target, st) }
            : d.kind === 'battle' || d.kind === 'move' || d.kind === 'playCard' || d.kind === 'orders' ? null : this.view.combat;
          this.set({ pending: d, display: cloneState(st), undo: this.undoable(d), aiThinking: false, combat });
          return;
        }
        // AI decision (asked before the animations when it could be: see askAhead); its pacing runs from here
        // a defend decision is raised only when the AI has something to choose (it may hold First Strike): no indicator, one pause
        const pace = aiPacing(d);
        this.set({ aiThinking: pace.indicator });
        const t0 = performance.now();
        let res: { answer: Answer; say?: string };
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          res = await Promise.race([
            asked?.decision === d ? asked.answer : this.opponent.decide(cloneState(st), d),
            new Promise<never>((_, rej) => {
              // Last-resort guard (the AI client has its own in-thread fallback). If the page was frozen
              // (e.g. a backgrounded tab) the timer fires late: give the AI a little more time instead.
              const limit = 90000;
              let due = Date.now() + limit;
              const arm = (ms: number) => {
                timer = setTimeout(() => {
                  const late = Date.now() - due;
                  if (late > 2000) {
                    due = Date.now() + 5000;
                    arm(5000);
                  } else rej(new Error('AI timeout'));
                }, ms);
              };
              arm(limit);
            }),
          ]);
        } catch (e) {
          console.error('AI failed', e);
          res = { answer: randomAnswer(st, d, Math.random) };
        } finally {
          clearTimeout(timer);
        }
        if (this.disposed) return;
        const minThink = pace.minMs;
        const spent = performance.now() - t0;
        if (spent < this.dur(minThink)) await sleep(this.dur(minThink) - spent);
        if (this.disposed) return;
        if (res.say) this.addLog({ text: res.say, side: d.side, kind: 'say' });
        if (!this.driver.answer(res.answer)) {
          console.warn('AI answer rejected', this.driver.lastError, res.answer, d);
          let ok = false;
          for (let i = 0; i < 30 && !ok; i++) {
            const a = randomAnswer(this.driver.state, this.driver.pending!, Math.random);
            ok = this.driver.answer(a);
          }
          if (!ok) throw new Error('AI could not produce a legal answer');
        }
        this.save();
      }
    } finally {
      this.busy = false;
      this.skipAnim = false;
    }
  }

  /**
   * The computer's pending decision, asked before the events that lead to it are played: the engine is already past them,
   * so the opponent thinks while the board animates, and its answer is often ready when they end. Nothing can answer or
   * take back a decision meanwhile (`busy`), so this is the decision and the state the loop then waits on: the opponent
   * is asked the same things in the same order as when asked after the animations. Only an opponent that thinks off the
   * main thread is asked early (an in-thread fallback would stall the animations); null when there is nothing to ask.
   */
  private askAhead(): { decision: Decision; answer: Promise<{ answer: Answer; say?: string }> } | null {
    const d = this.driver.pending;
    if (!d || d.side === this.config.humanSide || this.driver.state.winner || !this.opponent.usingWorker) return null;
    const answer = this.opponent.decide(cloneState(this.driver.state), d);
    // awaited after the animations; a dispose during them rejects it unawaited
    answer.catch(() => {});
    return { decision: d, answer };
  }

  // ---------------------------------------------------------------- animation
  private async playEvents() {
    const evs = this.driver.drainEvents();
    for (const q of evs) {
      if (this.disposed) return;
      await this.animate(q);
    }
    this.skipAnim = false;
  }

  /**
   * Leader or unit `id` of `s`, else as the board last showed it: a piece the events being played have removed from `s` is
   * still on the display.
   */
  private piece(id: string, s: GameState): Leader | Unit | undefined {
    return pieceById(s, id) ?? pieceById(this.view.display, id);
  }

  private hexOf(id: string, s: GameState): HexId {
    return this.piece(id, s)?.hex ?? OFF_BOARD;
  }

  /**
   * Show a centre-board toast for `ms` (real time: the CSS animation does not follow the game speed). A notice (why a
   * click did nothing) is never cut short: a toast that comes while one is up waits for it, in order. "Your turn" is dropped
   * if the human has answered by the time it would show.
   */
  private toast(text: string, kind: 'turn' | 'notice', ms: number) {
    let stale: (() => boolean) | undefined;
    if (kind === 'turn') {
      const answers = this.driver.answers.length;
      stale = () => this.driver.answers.length !== answers;
    }
    if (this.view.toast?.kind === 'notice') this.toastQueue.push({ text, kind, ms, stale });
    else this.showToast(text, kind, ms);
  }

  /**
   * Tell the human, on the board, why a click did nothing (a short notice toast). The same notice is never stacked, so a
   * player who keeps clicking does not queue it up.
   */
  notice(text: string) {
    if (this.view.toast?.text === text || this.toastQueue.some((q) => q.text === text)) return;
    this.toast(text, 'notice', 2000);
  }

  /** "Your turn", once per turn: at the human's first decision of it, or as a dice side's turn begins (310). */
  private yourTurn(turn: number) {
    if (this.toldTurn === turn) return;
    this.toldTurn = turn;
    sfx.turn();
    this.toast('Your turn', 'turn', 1400);
  }

  private showToast(text: string, kind: 'turn' | 'notice', ms: number) {
    const toast = { id: seq++, text, kind };
    this.set({ toast });
    setTimeout(() => {
      if (this.view.toast?.id !== toast.id) return;
      let next = this.toastQueue.shift();
      while (next?.stale?.()) next = this.toastQueue.shift();
      if (next) this.showToast(next.text, next.kind, next.ms);
      else this.set({ toast: null });
    }, ms);
  }

  /** Remove the flashes still showing on a hex (so a new one does not overlap them). */
  private clearFlashes(hex: HexId) {
    if (this.view.flashes.some((f) => f.hex === hex)) this.set({ flashes: this.view.flashes.filter((f) => f.hex !== hex) });
  }

  private flash(hex: HexId, text: string, kind: Flash['kind']) {
    if (hex < 0) return;
    const f: Flash = { id: seq++, hex, text, kind };
    this.set({ flashes: [...this.view.flashes, f] });
    setTimeout(() => this.set({ flashes: this.view.flashes.filter((x) => x.id !== f.id) }), 1500 / (this.view.speed || 1));
  }

  private async walk(id: string, path: HexId[], stepMs: number) {
    const steps = path.filter((h) => h >= 0);
    for (let i = 1; i < steps.length; i++) {
      if (!this.skipAnim) sfx.march();
      this.set({ walking: { ...this.view.walking, [id]: steps[i] } });
      await sleep(this.dur(stepMs));
    }
  }

  private async animate(q: QueuedEvent) {
    const e: GameEvent = q.e;
    const after = q.state!;
    const before = this.view.display;
    const human = this.config.humanSide;
    // the log line of every event is worded in logText; each case below logs it where its animation wants it
    const line = eventLog(e, before, after, human, this.gone ?? undefined);
    const log = () => {
      if (line) this.addLog(line);
    };
    // one pause between a declared melee and the first card or roll it shows, whether or not the computer was asked how to
    // defend (that wait counts): a pause only when asked would tell the player the computer holds First Strike
    if (this.declaredAt !== null && (e.t === 'cardPlayed' || e.t === 'combat')) {
      const wait = this.declaredAt + this.dur(600) - performance.now();
      this.declaredAt = null;
      if (wait > 0) await sleep(wait);
    }
    switch (e.t) {
      case 'turnStart': {
        log();
        this.set({ display: after, combat: null });
        break;
      }
      case 'cardPlayed': {
        // `side` need not be the active side: a First Strike is played by the defender
        log();
        sfx.card();
        if (e.side !== human) {
          this.set({ display: after, cardShow: { id: seq++, kind: e.kind, side: e.side } });
          await sleep(this.dur(1600));
          this.set({ cardShow: null });
        } else this.set({ display: after });
        break;
      }
      case 'ordered': {
        log();
        this.set({ display: after });
        if (e.side !== human) await sleep(this.dur(350));
        break;
      }
      case 'move':
      case 'retreat':
      case 'retire':
      case 'leaderRetreat':
      case 'advance': {
        const stepMs = e.t === 'move' ? 230 : 190;
        // walk on the 'before' display, then commit
        await this.walk(e.id, e.path, stepMs);
        const walking = { ...this.view.walking };
        delete walking[e.id];
        this.set({ display: after, walking });
        log();
        break;
      }
      case 'combat': {
        const from = this.hexOf(e.attacker, after);
        const to = this.hexOf(e.target, after);
        if (e.purpose !== 'fire') sfx.clash();
        log();
        this.set({ display: after, combat: from >= 0 && to >= 0 ? { from, to } : null });
        await sleep(this.dur(e.purpose === 'battleBack' ? 300 : 420));
        break;
      }
      case 'roll': {
        const title = rollTitle(e.purpose, e.by, e.against, after, e.reroll === true);
        const id = seq++;
        const sub = rollSummary(e.purpose, e.faces, e.scoring);
        sfx.dice(e.faces.length);
        this.set({ dice: { id, title, subtitle: 'Rolling…', faces: e.faces, scoring: e.scoring, rolling: true, purpose: e.purpose } });
        await sleep(this.dur(650));
        log();
        this.set({ dice: { id, title, subtitle: sub, faces: e.faces, scoring: e.scoring, rolling: false, purpose: e.purpose }, display: after });
        await sleep(this.dur(e.purpose === 'leaderCheck' || e.purpose === 'escape' ? 750 : 1050));
        break;
      }
      case 'damage': {
        this.flash(this.hexOf(e.id, before), `−${e.amount}`, 'hit');
        sfx.hit();
        log();
        this.set({ display: after });
        await sleep(this.dur(380));
        break;
      }
      case 'eliminated': {
        log();
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      }
      case 'removed': {
        // leaves the board like an eliminated unit, but no banner is awarded
        this.flash(this.hexOf(e.id, before), 'Removed', 'info');
        this.gone = { id: e.id, name: pieceKind(e.id, before) };
        log();
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      }
      case 'leaderKilled': {
        this.flash(this.hexOf(e.id, before), 'Leader slain', 'hit');
        log();
        this.set({ display: after });
        await sleep(this.dur(600));
        break;
      }
      case 'flags': {
        if (e.ignored > 0) this.flash(this.hexOf(e.id, after), e.ignored >= e.flags ? 'Holds firm!' : `Ignores ${e.ignored}`, 'flag');
        log();
        this.set({ display: after });
        break;
      }
      case 'squareFormed':
        this.flash(this.hexOf(e.id, after), 'Square!', 'info');
        log();
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      case 'rallied':
        this.flash(this.hexOf(e.id, after), `+${e.blocks}`, 'rally');
        log();
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      case 'shortSupply':
        this.flash(e.hex, 'Short supply', 'info');
        log();
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      case 'banner':
        sfx.banner();
        log();
        this.set({ display: after });
        await sleep(this.dur(500));
        break;
      case 'held':
        log();
        this.set({ display: after });
        await sleep(this.dur(350));
        break;
      case 'leaderSafe':
      case 'leaderLeft':
      case 'attach':
      case 'squareLeft':
      case 'cardReturned':
      case 'draw':
      case 'scoutDrew':
      case 'discarded':
      case 'reshuffle':
      case 'log':
      case 'victory':
      // Expansion #1: the counter panel and the reveal of the opening cards follow these events
      case 'guerrilla':
      case 'moveFirst':
        log();
        this.set({ display: after });
        break;
    }
  }

  get scenario() {
    return scenarioById(this.config.scenarioId);
  }

  opponentSide(): Side {
    return other(this.config.humanSide);
  }
}

/**
 * How the computer's decision `d` is paced: whether the "thinking" indicator shows, and the least time it takes. A defend
 * decision is raised only when the defender has an option besides standing (it may hold First Strike), so it shows no
 * indicator and has no pause of its own: the one pause of a declared melee is held in `animate`.
 */
export function aiPacing(d: Decision): { indicator: boolean; minMs: number } {
  // a Move First pick is asked only of a side with an eligible card: any tell of the computer's hand would leak it
  if (d.kind === 'defend' || d.kind === 'moveFirst') return { indicator: false, minMs: 0 };
  return { indicator: true, minMs: d.kind === 'playCard' ? 700 : d.kind === 'move' || d.kind === 'battle' ? 260 : 150 };
}

/** The animation speed a new game starts at: the player's stored choice wins; else 4 under reduced motion, 1 otherwise. */
export function initialSpeed(stored: string | null, reducedMotion: boolean): number {
  return Number(stored) || (reducedMotion ? 4 : 1);
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Dev shortcut `#/play/<scenario>/<top|bottom>/<captain|colonel|marshal>[/<seed>][?cards=k1,k2]`: the session it starts
 * (any scenario id: 000 for now), or null when the hash is not such a
 * route or names no known battle.
 */
export function devRouteConfig(hash: string): SessionConfig | null {
  const m = hash.match(/^#\/play\/(\d{3})\/(top|bottom)\/(captain|colonel|marshal)(?:\/(\d+))?(?:\?.*)?$/);
  if (!m || !SCENARIOS.some((x) => x.id === m[1])) return null;
  const cfg = newSessionConfig(m[1], m[2] as Side, m[3] as Difficulty);
  if (m[4]) cfg.seed = Number(m[4]);
  const cards = hash.match(/[?&]cards=([a-zA-Z0-9,]+)/);
  if (cards) cfg.devCards = cards[1].split(',') as CardKind[];
  return cfg;
}

export function newSessionConfig(scenarioId: string, humanSide: Side, difficulty: Difficulty): SessionConfig {
  return { scenarioId, humanSide, difficulty, seed: freshSeed() };
}

/**
 * The session for playing a finished battle again: same battle and difficulty, a fresh seed. With
 * `switchSides` the human takes the other army and the computer uses its new general's default personality (a
 * personality picked in the briefing was for the old enemy general); dev opening hands are not carried over.
 * Switching sides after a single battle makes the two a match: `finished` goes along, so that the second battle's end
 * can sum up both. A match is two battles, so switching again after the second starts a new one.
 */
export function rematchConfig(config: SessionConfig, switchSides: boolean, finished?: LegResult): SessionConfig {
  const side = switchSides ? other(config.humanSide) : config.humanSide;
  const cfg = newSessionConfig(config.scenarioId, side, config.difficulty);
  if (cfg.seed === config.seed) cfg.seed = (config.seed + 1) >>> 0;
  if (!switchSides && config.personality) cfg.personality = config.personality;
  if (switchSides && finished && !config.firstLeg) cfg.firstLeg = finished;
  return cfg;
}
