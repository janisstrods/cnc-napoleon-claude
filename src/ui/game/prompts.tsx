// The prompt bar of the game screen: for the human's pending decision, the title, the explanation and the buttons; while
// the computer plays, what it is doing. Every decision kind is described by `promptSpec` (title, buttons, hexes) and every
// prompt ends with "Let the general decide"; the bespoke choosers (card, orders, move, battle, retreat, leader retreat,
// flags) keep their board clicks and highlights, with the spec's title.
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  answerError, CARD_DEFS, OFF_BOARD, UNIT_STATS, attachedLeader, battleReady, battleTargets, cardKind, effectiveCard, eligiblePieces, isLeaderId, leaderById,
  movablePieces, orderLimit, pieceHex, pieceMoves, unitById, validateOrders,
  type Answer, type Decision, type DieFace, type GameState, type HexId, type SectionName, type Side, type UndoStep,
} from '../../engine';
import { Button, CardView, DieView } from '../kit';
import { AssignPanel } from './AssignPanel';
import { assignError, currentAssign, type ElanOrRally } from './assign';
import type { GameController, ViewState } from './controller';
import { AUTO_ACTION, DECISION_TITLES, decisionTitle, promptSpec, unitLabel } from './promptSpec';
import { attackDice, combinedArmsDice, combinedArmsTotalText, effectiveGuns, expectedHits, leaderRetreatChoices, retreatChoices, toggleGun, type UiSel } from './uiModel';

/** What the prompt bar shows. `tone`: 'warn' or 'danger' colouring; `dice`: dice drawn before the text. */
export interface Prompt {
  title: string;
  text: string;
  buttons: JSX.Element[];
  tone?: string;
  /** A line under the text: what the choice under the pointer does. */
  hint?: string;
  /** The hint is one short line (no room kept for a longer one). */
  compactHint?: boolean;
  dice?: DieFace[];
  /** Shown in the prompt bar between the text and the buttons (the Scout's two cards). */
  extra?: JSX.Element;
  /** Shown beside the board (the Élan / Rally dice). */
  panel?: JSX.Element;
}

/** What the prompts read from the game screen and act on. */
export interface PromptCtx {
  controller: GameController;
  view: ViewState;
  /** The displayed state (`view.display`). */
  s: GameState;
  human: Side;
  ai: Side;
  ui: UiSel;
  setUi: Dispatch<SetStateAction<UiSel>>;
  answer: (a: Answer) => void;
  onExit: () => void;
  /** Why the last click on the board was refused (the Élan / Rally chooser). */
  assignNote?: string | null;
}

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;

export const SECTION_LABEL: Record<SectionName, string> = { left: 'Left', center: 'Centre', right: 'Right' };

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function btn(label: string, onClick: () => void, opts: { variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; key?: string; title?: string; hover?: { enter: () => void; leave: () => void } } = {}) {
  return (
    <Button
      key={opts.key ?? label} variant={opts.variant ?? 'primary'} disabled={opts.disabled} onClick={onClick} title={opts.title}
      onMouseEnter={opts.hover?.enter} onFocus={opts.hover?.enter} onMouseLeave={opts.hover?.leave} onBlur={opts.hover?.leave}
    >
      {label}
    </Button>
  );
}

/** The general's button: the computer's own policy answers for the human. */
function autoButton(c: PromptCtx): JSX.Element {
  return btn(AUTO_ACTION.label, () => void c.controller.autoAnswer(), { variant: 'ghost', key: 'auto', title: 'The computer plays this decision for you' });
}

/** The prompt bar's content: null once the battle is over, and while the computer decides something that shows nothing. */
export function gamePrompt(c: PromptCtx): Prompt | null {
  const { view, s, human, ai } = c;
  const d = view.pending;
  if (view.over) return null;
  if (!d && view.fatal) {
    return { title: 'The battle stalled', text: view.error ?? 'An unexpected error occurred.', buttons: [<Button key="menu" onClick={c.onExit}>Return to menu</Button>], tone: 'danger' };
  }
  if (!d) {
    if (view.aiThinking) return { title: `${s.players[ai].commander} is considering…`, text: '', buttons: [] };
    return { title: s.active === human ? 'Resolving…' : `${s.players[ai].army} turn`, text: '', buttons: [] };
  }
  if (d.side !== human) return null;
  if (view.generalThinking) return { title: decisionTitle(d, s), text: 'Your general is deciding…', buttons: [] };
  const p = decisionPrompt(c, d);
  // no undo once a Scout's two cards are on show: it would put them back on the deck, known
  const undo = d.kind === 'scoutKeep' ? null : undoButton(c);
  return undo ? { ...p, buttons: [...p.buttons, undo] } : p;
}

/** The prompt of the human's decision `d`, without the undo button (`gamePrompt` adds it). */
function decisionPrompt(c: PromptCtx, d: Decision): Prompt {
  switch (d.kind) {
    case 'playCard':
      return playCardPrompt(c);
    case 'orders':
      return ordersPrompt(c, d);
    case 'move':
      return movePrompt(c);
    case 'battle':
      return battlePrompt(c);
    case 'ignoreFlags':
      return ignoreFlagsPrompt(c, d);
    case 'retreat':
      return retreatPrompt(c, d);
    case 'leaderRetreat':
      return leaderRetreatPrompt(c, d);
    case 'elan':
    case 'rally':
      return assignPrompt(c, d);
    case 'scoutKeep':
      return scoutPrompt(c, d);
    case 'combinedArms':
      return combinedArmsPrompt(c, d);
    case 'shortSupplyTarget':
    case 'shortSupplyHex': {
      // a click on the board chooses (a unit, or a hex); the list in the bar is the keyboard's way; then the general's button
      const p = genericPrompt(c, d);
      const spec = promptSpec(c.s, d);
      const choices = spec.actions.flatMap((a) => (a.answer === 'auto' ? [] : [{ key: a.key, label: a.label, answer: a.answer, hex: choiceHex(c.s, d, a.answer) }]));
      return {
        ...p,
        buttons: p.buttons.filter((b) => b.key === 'auto'),
        extra: <ChoicePicker label={d.kind === 'shortSupplyHex' ? 'Hex' : 'Unit'} choices={choices} onChoose={c.answer} onPreview={(h) => c.setUi((u) => ({ ...u, hoverHex: h }))} />,
      };
    }
    default:
      return genericPrompt(c, d);
  }
}

/** The board hex a list entry stands for (shown under the pointer's tooltip while it is picked). */
function choiceHex(s: GameState, d: Decision, a: Answer): HexId | null {
  if (a.kind === 'hex') return a.hex;
  if (a.kind === 'choose' && d.kind === 'shortSupplyTarget') return pieceHex(s, d.options[a.index]) ?? null;
  return null;
}

export interface PickerChoice { key: string; label: string; answer: Answer; hex: HexId | null }

/** A labelled list and a Choose button: the keyboard's way to answer a choice made by clicking on the board. */
export function ChoicePicker(p: { label: string; choices: PickerChoice[]; onChoose: (a: Answer) => void; onPreview?: (hex: HexId | null) => void }) {
  const [key, setKey] = useState(p.choices[0]?.key ?? '');
  const cur = p.choices.find((x) => x.key === key) ?? p.choices[0];
  return (
    <div className="prompt-pick">
      <label>
        {p.label}
        <select
          value={cur?.key ?? ''}
          onChange={(e) => { setKey(e.target.value); p.onPreview?.(p.choices.find((x) => x.key === e.target.value)?.hex ?? null); }}
        >
          {p.choices.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
      </label>
      <Button variant="secondary" disabled={!cur} onClick={() => cur && p.onChoose(cur.answer)}>Choose</Button>
    </div>
  );
}

/** The prompt bar: a polite live region (it exists while there is no prompt, so the next one is announced). */
export function PromptBar({ prompt, error }: { prompt: Prompt | null; error: string | null }) {
  if (!prompt) return <div className="prompt-bar prompt-bar--idle" role="status" aria-live="polite" />;
  return (
    <div className={`prompt-bar ${prompt.tone ? `tone-${prompt.tone}` : ''}`} role="status" aria-live="polite">
      {prompt.dice && (
        <div className="prompt-dice" aria-hidden>
          {prompt.dice.map((f, i) => <DieView key={i} face={f} size={30} />)}
        </div>
      )}
      <div className="prompt-text">
        <div className="prompt-title">{prompt.title}</div>
        {prompt.text && <div className="prompt-sub" title={prompt.text}>{prompt.text}</div>}
        {prompt.hint && <div className={`prompt-hint ${prompt.compactHint ? 'prompt-hint--compact' : ''}`}>{prompt.hint}</div>}
        {error && <div className="prompt-err">{error}</div>}
      </div>
      {prompt.extra}
      <div className="prompt-buttons">{prompt.buttons}</div>
    </div>
  );
}

/** Élan and Rally: the dice panel beside the board; Confirm answers what it shows (disabled only while it is illegal). */
function assignPrompt(c: PromptCtx, d: ElanOrRally): Prompt {
  const { s, ui } = c;
  const spec = promptSpec(s, d);
  const cur = currentAssign(s, d, ui.assign);
  const err = assignError(s, d, cur.ids); // shown once, in the panel
  return {
    title: spec.title,
    text: 'Pick a die, then click a piece on the board or choose one from the list.',
    buttons: [btn('Confirm', () => c.answer({ kind: 'assign', ids: cur.ids }), { disabled: !!err, key: 'confirm' }), autoButton(c)],
    panel: <AssignPanel s={s} d={d} ui={ui} setUi={c.setUi} note={c.assignNote ?? null} text={spec.text} />,
  };
}

/**
 * Combined Arms: guns are toggled on the board; the primary button attacks with the chosen ones (only ids among the options
 * count), "All n guns" takes every candidate, and a melee unit with no dice of its own cannot attack without a gun.
 */
function combinedArmsPrompt(c: PromptCtx, d: D<'combinedArms'>): Prompt {
  const spec = promptSpec(c.s, d);
  const ids = effectiveGuns(c.ui.gunSel, d);
  const k = ids.length;
  const answer: Answer = { kind: 'select', ids };
  const blocked = answerError(c.s, d, answer);
  const role = c.s.turn.ordered[d.unit]?.bonusMeleeDone ? 'bonus' : 'attack';
  const label = k === 0 ? (d.required ? 'Choose at least one gun' : 'Attack without artillery') : `Attack with ${k} gun${k === 1 ? '' : 's'}`;
  const buttons = [btn(label, () => c.answer(answer), { disabled: !!blocked, variant: 'primary', key: 'attack' })];
  // "All n guns" only while some gun is still out (it would repeat the attack button when every gun is chosen)
  if (d.options.length > 1 && k < d.options.length) buttons.push(btn(`All ${d.options.length} guns`, () => c.answer({ kind: 'select', ids: [...d.options] }), { variant: 'secondary', key: 'all' }));
  buttons.push(autoButton(c));
  // every gun is a toggle the keyboard reaches, besides the click on the board
  const toggles = d.options.map((id) => {
    const on = ids.includes(id);
    const name = spec.actions.find((a) => a.key === id)?.label ?? id;
    return (
      <Button key={id} variant={on ? 'primary' : 'ghost'} aria-pressed={on} className="gun-toggle" onClick={() => c.setUi((u) => ({ ...u, gunSel: toggleGun(u.gunSel, id, d.options) }))}>
        {name}
      </Button>
    );
  });
  return {
    title: spec.title, text: spec.text, buttons,
    hint: combinedArmsTotalText(combinedArmsDice(c.s, d, ids, role)), compactHint: true,
    extra: <div className="gun-toggles" role="group" aria-label="Guns joining the attack">{toggles}</div>,
  };
}

/** Scout: the two cards drawn, large; a click keeps one. Only the owner's prompt is ever built (`gamePrompt` returns null otherwise). */
function scoutPrompt(c: PromptCtx, d: D<'scoutKeep'>): Prompt {
  const spec = promptSpec(c.s, d);
  return {
    title: spec.title,
    text: spec.text,
    buttons: [autoButton(c)],
    extra: (
      <div className="scout-cards">
        {d.cards.map((card, i) => (
          <CardView key={card} kind={cardKind(card)} size="sm" onClick={() => c.answer({ kind: 'choose', index: i })} />
        ))}
      </div>
    ),
  };
}

/** The hint line while no choice is under the pointer. */
export const HINT_IDLE = 'Point at a choice to see what it does.';

/** Any decision without a chooser of its own: one button per action of its spec (the first is the primary one). */
function genericPrompt(c: PromptCtx, d: Decision): Prompt {
  const spec = promptSpec(c.s, d);
  const buttons = spec.actions.map((a, i) => {
    if (a.answer === 'auto') return autoButton(c);
    const answer = a.answer;
    // the pointer or focus on a button tells the board (a path preview) and the prompt (its hint) which choice is under it
    const hover = {
      enter: () => c.setUi((u) => (u.hoverAction === a.key ? u : { ...u, hoverAction: a.key })),
      leave: () => c.setUi((u) => (u.hoverAction === a.key ? { ...u, hoverAction: null } : u)),
    };
    return btn(a.label, () => c.answer(answer), { variant: i === 0 ? 'primary' : 'secondary', key: a.key, title: a.hint, hover: a.hint ? hover : undefined });
  });
  // a prompt with hints keeps its line while none is hovered, so the bar does not change height under the pointer
  const hint = spec.actions.some((a) => a.hint) ? spec.actions.find((a) => a.key === c.ui.hoverAction)?.hint ?? HINT_IDLE : undefined;
  return { title: spec.title, text: spec.text, buttons, tone: d.kind === 'defend' ? 'danger' : undefined, hint };
}

const UNDO_LABEL: Record<UndoStep, { label: string; title: string }> = {
  move: { label: 'Undo move', title: 'Take back your last move' },
  card: { label: 'Undo card', title: 'Take the card back into your hand and choose again (nothing has moved yet)' },
};

/** The undo button, when something may be taken back: a move, or the card played until a unit moves. */
function undoButton(c: PromptCtx): JSX.Element | null {
  const step = c.view.undo;
  return step ? btn(UNDO_LABEL[step].label, () => c.controller.undo(), { variant: 'ghost', key: 'undo', title: UNDO_LABEL[step].title }) : null;
}

function playCardPrompt(c: PromptCtx): Prompt {
  const { s, human, ui } = c;
  const sel = ui.selCard;
  const def = sel !== null ? CARD_DEFS[cardKind(sel)] : null;
  let note = promptSpec(s, { kind: 'playCard', side: human }).text;
  if (sel !== null) {
    const eff = effectiveCard(s, human, sel);
    if (cardKind(sel) === 'counterAttack') note = eff.kind ? `Copies the enemy's ${CARD_DEFS[eff.kind].title}.` : 'The enemy has played nothing to copy.';
    else if (cardKind(sel) === 'firstStrike') note = 'First Strike is a reaction card: playing it now has no effect.';
    else note = def!.text;
  }
  const buttons = sel !== null ? [btn(`Play ${def!.title}`, () => c.answer({ kind: 'playCard', card: sel }))] : [];
  buttons.push(autoButton(c));
  return { title: DECISION_TITLES.playCard, text: note, buttons };
}

function ordersPrompt(c: PromptCtx, d: D<'orders'>): Prompt {
  const { s, human, ui, setUi } = c;
  const def = CARD_DEFS[d.card];
  const err = validateOrders(s, human, d.card, ui.orderSel);
  const all = eligiblePieces(s, human, d.card);
  const n = ui.orderSel.length;
  const limit = orderLimit(s, human, d.card);
  const max = limit === null ? null : Math.min(limit, all.length);
  const count = max === null ? `${n}` : `${n}/${max}`;
  const buttons = [
    btn(n ? `Confirm ${count} order${(max ?? n) > 1 ? 's' : ''}` : 'Order nothing', () => c.answer({ kind: 'orders', pieces: ui.orderSel }), { disabled: !!err, variant: n ? 'primary' : 'secondary', key: 'confirm' }),
  ];
  if (n) buttons.push(btn('Clear', () => setUi({ ...ui, orderSel: [] }), { variant: 'ghost' }));
  if (d.single) {
    // La Grande Manoeuvre's other option: one unit under the normal rules, no card bonus
    const singleErr = validateOrders(s, human, d.card, ui.orderSel, true);
    buttons.push(btn('Order 1 unit (normal rules)', () => c.answer({ kind: 'orders', pieces: ui.orderSel, single: true }), { disabled: !!singleErr, variant: 'secondary', key: 'single' }));
  }
  buttons.push(autoButton(c));
  const where = def.sections.length > 0 && def.sections.length < 3 ? ` (${def.sections.map((x) => SECTION_LABEL[x]).join(', ')})` : '';
  return {
    title: `${def.title}${d.mirrored ? ' (Counter Attack)' : ''}${where}`,
    text: err && n ? err : `${def.text} Click your units to order them.`,
    buttons,
    tone: err && n ? 'warn' : undefined,
  };
}

function movePrompt(c: PromptCtx): Prompt {
  const { s } = c;
  const movers = movablePieces(s);
  const sel = c.ui.selPiece;
  let text = `${movers.length} ordered piece${movers.length === 1 ? '' : 's'} can still move. Select one, then click a destination.`;
  if (sel) {
    const name = isLeaderId(sel) ? leaderById(s, sel)?.name || 'Leader' : unitLabel(s, sel);
    const moves = pieceMoves(s, sel);
    text = `${name}: green = may battle after moving, amber = no battle after moving.${
      moves.some((m) => m.hex === OFF_BOARD) ? ` This ${isLeaderId(sel) ? 'leader' : 'unit'} can exit the battlefield.` : ''}`;
  }
  // RR §6.2: a leader leaves his unit only by moving first
  const detach = movers.some((id) => {
    const u = unitById(s, id);
    const l = u && attachedLeader(s, u);
    return !!u && !!s.turn.ordered[id] && !!l && !!s.turn.ordered[l.id];
  });
  if (detach) text += ' To detach a leader, move him before his unit.';
  const buttons = [btn('End movement', () => c.answer({ kind: 'endMove' }), { variant: 'secondary' })];
  if (sel && pieceMoves(s, sel).some((m) => m.hex === OFF_BOARD)) {
    buttons.unshift(btn('Exit the battlefield', () => c.answer({ kind: 'move', piece: sel, to: OFF_BOARD }), { variant: 'secondary' }));
  }
  buttons.push(autoButton(c));
  return { title: DECISION_TITLES.move, text, buttons };
}

function battlePrompt(c: PromptCtx): Prompt {
  const { s, ui } = c;
  const ready = battleReady(s);
  let text = `${ready.length} unit${ready.length === 1 ? '' : 's'} can battle. Select a unit, then its target.`;
  if (ui.selPiece) {
    const u = unitById(s, ui.selPiece);
    if (u) {
      text = `${unitLabel(s, u.id)}: red = melee, orange = fire.`;
      if (ui.hoverHex !== null) {
        const t = battleTargets(s, ui.selPiece).find((x) => x.hex === ui.hoverHex);
        if (t) {
          const n = attackDice(s, u, t.hex);
          const e = expectedHits(s, u, t.hex);
          text = `${n} ${n === 1 ? 'die' : 'dice'} · expected hits ≈ ${e.toFixed(1)} · chance of at least one flag ${pct(1 - Math.pow(5 / 6, n))}`;
        }
      }
    }
  }
  const buttons = [btn('End battles', () => c.answer({ kind: 'endBattle' }), { variant: 'secondary' }), autoButton(c)];
  return { title: DECISION_TITLES.battle, text, buttons };
}

function ignoreFlagsPrompt(c: PromptCtx, d: D<'ignoreFlags'>): Prompt {
  const spec = promptSpec(c.s, d);
  const buttons: JSX.Element[] = [];
  for (let k = d.max; k >= 0; k--) {
    const left = d.flags - k;
    const label = left <= 0 ? (k === 1 ? 'Hold firm (ignore the flag)' : `Hold firm (ignore ${k})`) : k === 0 ? `Retreat (${left} flag${left > 1 ? 's' : ''})` : `Ignore ${k}, retreat for ${left}`;
    buttons.push(btn(label, () => c.answer({ kind: 'ignoreFlags', count: k }), { variant: k === d.max ? 'primary' : 'secondary', key: `f${k}` }));
  }
  buttons.push(autoButton(c));
  return { title: spec.title, text: spec.text, buttons };
}

/** At most this many end hexes get a button as well as a board click; more are chosen on the board alone. */
const MAX_CHOICE_BUTTONS = 6;

function retreatPrompt(c: PromptCtx, d: D<'retreat'>): Prompt {
  const { s } = c;
  const spec = promptSpec(s, d);
  const choices = retreatChoices(s, d);
  const blocked = d.options[0]?.losses ? ` The way is blocked: ${d.options[0].losses} block${d.options[0].losses === 1 ? '' : 's'} will be lost.` : '';
  const buttons = choices.length <= MAX_CHOICE_BUTTONS
    ? choices.map((o) => (
      <Button key={`o${o.index}`} variant="ghost" onClick={() => c.answer({ kind: 'choose', index: o.index })} onMouseEnter={() => c.setUi((u) => ({ ...u, hoverHex: o.end }))}>
        {o.label}
      </Button>
    ))
    : [];
  buttons.push(autoButton(c));
  const unit = unitById(s, d.unit);
  return {
    title: spec.title,
    text: d.reason === 'retireReform' ? spec.text : `Click a purple hex to choose where your ${unit ? UNIT_STATS[unit.key].name : 'unit'} ends up.${blocked}`,
    buttons,
  };
}

function leaderRetreatPrompt(c: PromptCtx, d: D<'leaderRetreat'>): Prompt {
  const { s } = c;
  const spec = promptSpec(s, d);
  const l = leaderById(s, d.leader);
  const all = leaderRetreatChoices(s, d);
  // above the cap a plain hex is chosen on the board; a join, an escape, leaving or falling keeps its button
  const choices = all.filter((o) => all.length <= MAX_CHOICE_BUTTONS || o.kind !== 'hex' || o.attach || o.escapes > 0);
  const buttons: JSX.Element[] = choices.map((o) => (
    <Button
      key={`${o.kind}${o.index}`} variant={o.kind === 'hex' && !o.escapes ? 'secondary' : 'ghost'}
      onClick={() => c.answer({ kind: 'choose', index: o.index })}
      onMouseEnter={() => c.setUi((u) => ({ ...u, hoverHex: o.end }))}
    >
      {o.label}
    </Button>
  ));
  buttons.push(autoButton(c));
  const name = l?.name || 'Your leader';
  const hexRisk = all.some((o) => o.kind === 'hex' && o.escapes > 0);
  const offRisk = all.some((o) => o.kind === 'off' && o.escapes > 0);
  const noWay = all.every((o) => o.kind === 'dead');
  const risk = [hexRisk ? 'taking an amber hex' : '', offRisk ? 'leaving the battlefield' : ''].filter(Boolean).join(' or ');
  const riskText = risk ? ` Beware: ${risk} means passing enemy units: each may strike at him as he slips by.` : '';
  return {
    title: spec.title,
    text: noWay ? `${name} has no way out.` : `${name} must retreat. Click a hex (joining a friendly unit is safest).${riskText}`,
    buttons,
  };
}
