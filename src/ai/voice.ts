// The commanders' voice (Plan 5 Task 9): short lines in the temperament's own manner, spoken at a few moments of a turn. Lines are
// original prose in British spelling, at most 80 characters once filled in. They never reveal hidden information: a card is
// named only when the caller gives it as `ctx.card` (the card just played, which is public from then on), and nothing here
// refers to the cards still in hand. The caller limits speech to once per turn.
import { CARD_DEFS, type CardKind } from '../engine';
import type { Personality, Voice } from './personality';
import type { Rng } from './rand';

export const MOMENTS = ['cardPlayed', 'bigHit', 'unitLost', 'squareFormed', 'charge', 'leaderLost', 'winning', 'losing'] as const;
export type Moment = (typeof MOMENTS)[number];

/** What a line may mention: the card just played and a unit's name (a line that needs one is not used without it). */
export interface SayCtx {
  card?: CardKind;
  unit?: string;
}

/** The chance to speak is the temperament's `chatter` times this. */
const TALK_SHARE = 0.5;

/**
 * Four plain lines for every voice and moment, and one more that names the card or the unit. No line contains a card title other
 * than through `{card}` (kept clear of Forward, Bombard, Rally, Leadership and Élan in particular).
 */
const LINES: Record<Voice, Record<Moment, readonly string[]>> = {
  bold: {
    cardPlayed: [
      'No sense in waiting. Let us be about it.', 'Fortune favours the bold, gentlemen.', 'Spend the day as we spend the cards: freely.',
      'Boldness first; the details can follow.', '{card}! Now we shall see what they are made of.',
    ],
    bigHit: [
      'That rocked them back on their heels!', 'Press the advantage while it is warm!', 'A fine blow, well struck!',
      'They will remember that for a week.', 'Well done, the {unit}! That was handsomely struck.',
    ],
    unitLost: [
      'A setback only. We shall have it back with interest.', 'They bit hard. Bite harder.', 'Close the gap and keep your heads up!',
      'Give ground today, take it back tomorrow.', 'The {unit} will be avenged, I promise it.',
    ],
    squareFormed: [
      'Form square! Let the horsemen break themselves upon it!', 'Stand firm, lads, and show them the points!', 'Bayonets out! They shall not pass.',
      'A hedge of steel, and let them try it!', 'Square, the {unit}! Quickly now!',
    ],
    charge: [
      'Trumpeters, sound it! Ride them down!', 'Sabres out, and let none stand!', 'Charge! The day is ours for the taking!',
      'Over them like a wave! Go!', 'The {unit} will go in like a thunderbolt!',
    ],
    leaderLost: [
      'The general is down! Fight on for him!', 'They have struck at our head. Strike back!', 'No man leaves the field while the colours stand!',
      'Avenge him, and let that be an end of talk!', 'The {unit} have lost their general. Avenge him.',
    ],
    winning: [
      'The day is ours if we keep our nerve!', 'They are wavering. Keep up the pressure!', 'Victory is near, gentlemen; I can smell it.',
      'A few more blows and they will break.',
    ],
    losing: [
      'We are behind, but not beaten. Think of the next blow!', 'I have lost battles before, but never my nerve.',
      'Courage! The day has hours left in it.', 'They lead. Let us take it back, and sooner rather than later.',
    ],
  },
  methodical: {
    cardPlayed: [
      'A measured choice. Let the orders go out.', 'Everything in its proper sequence, if you please.', 'The plan holds; I merely give it a push.',
      'Check the orders twice before they leave.', '{card} suits the ground. Carry on.',
    ],
    bigHit: [
      'A satisfactory blow. Consolidate the ground.', 'Note the gap, and see it closed behind us.', 'Good. A neat manoeuvre, and nothing wasted.',
      'The drill has told, as drill should.', 'The {unit} did their work exactly as trained.',
    ],
    unitLost: [
      'A loss, and a lesson. Redress the line.', 'Fill the gap and count the cost later.', 'Report the numbers; we shall adjust our plans.',
      'This was foreseen, though not welcome.', 'The {unit} fell back in good order, at least.',
    ],
    squareFormed: [
      'Square, in good order. Rear ranks, close up.', 'Dress the faces and mind the corners.', 'As drilled: front rank kneel, second rank steady.',
      'Count the files; no gaps for horsemen.', 'The {unit} form square as they were drilled to.',
    ],
    charge: [
      'The charge goes in at the stated moment, not before.', 'Keep the knee-to-knee line; no straggling.',
      'Walk, trot, then gallop. Mind the order of it.', 'Choose the point; strike only there.', 'The {unit} go in on the word, and not an instant sooner.',
    ],
    leaderLost: [
      'The general is lost. The next in rank takes over.', 'A grievous blow. Reorder the command at once.',
      'Notify the staff and keep the line steady.', 'The plan must now be amended; hold meanwhile.', 'The {unit} look to the next officer for orders.',
    ],
    winning: [
      'The balance favours us. Let us not spoil it.', 'We lead on the count. Keep the discipline.', 'Steady progress. Let the work finish itself.',
      'No flourishes now, only sound conduct.',
    ],
    losing: [
      'The count is against us. Reassess and reorder.', 'Recoverable, with care and a little luck.', 'We shall change what must be changed.',
      'A poor position; there is time to improve it.',
    ],
  },
  reckless: {
    cardPlayed: [
      'Enough thinking! Send them in!', 'The cards are with us. Hurry, hurry!', 'Fortune, take me or leave me!', 'Let the whole line feel it!',
      '{card}! Surely nothing can stop us now.',
    ],
    bigHit: [
      'Another like that and they are finished!', 'Break them! Break them all!', 'Did you see them reel? On, on!',
      'Glory is cheap today, gentlemen!', 'The {unit} will have songs written about them!',
    ],
    unitLost: [
      'Curse them! Send in the next, and quickly!', 'No matter! There are more where those came from!', 'Is that all they can do? Again!',
      'They will pay twice over for that!', 'My poor {unit}! They shall be repaid in full.',
    ],
    squareFormed: [
      'Square! And then, when they come, charge out!', 'Let them break their horses, and then we break them!',
      'Steel on every side! Let them come!', 'Hold, hold, and then we pounce!', 'Hold fast, the {unit}! Nothing shall shake you!',
    ],
    charge: [
      'Charge! Charge! Why do you linger?', 'Ride, ride, ride! Let the earth shake!', 'Sabres! Give them no breathing space!',
      'At the gallop, gentlemen, and devil take the rest!', 'The {unit} cannot be held back, and nor shall I!',
    ],
    leaderLost: [
      'They have shot the general! Revenge, revenge!', 'No! Then we fight for all of us!', 'He will be avenged a hundredfold!',
      'Take the field in his name, and be quick about it!', 'The {unit} will fight twice as hard, mark me.',
    ],
    winning: [
      'We have them! One more push and it is done!', 'They are finished! Finish them!', 'The victory is within reach! Seize it!',
      'Run them off the field, gentlemen!',
    ],
    losing: [
      'Behind? Then there is nothing for it but to charge!', 'They shall not have the day! Not while I breathe!',
      'Fortune, why have you deserted me?', 'All or nothing, gentlemen, and all it shall be!',
    ],
  },
  cunning: {
    cardPlayed: [
      'They will not see the point of this until too late.', 'A small move now, a large one later.', 'Let them guess; guessing tires a man.',
      'Patience has a sharp edge, as you shall see.', '{card}. Watch the left, gentlemen, and then the right.',
    ],
    bigHit: [
      'Exactly the weak point I wanted.', 'They have opened a door; we may as well walk through.', 'Easy, and now they must answer for it.',
      'One thread pulled, and the cloth comes apart.', 'The {unit} found the seam. Splendid.',
    ],
    unitLost: [
      'A fair price for what comes next, perhaps.', 'Let them think it was their doing.', 'They have taken a pawn and left the rest.',
      'Draw them on; the ground has more to say.', 'The {unit} did what was asked of them, and no more.',
    ],
    squareFormed: [
      'Let them see a hedgehog and wonder what to do.', 'A square is a wall that argues back.', 'They will gallop, and we will be waiting.',
      'Close the ranks. They will do the rest for us.', 'Square, the {unit}, and let their horse be foolish.',
    ],
    charge: [
      'Now, while their eyes are on the other flank.', 'A short, sharp stroke where they least expect it.', 'In at the seam, out before they can answer.',
      'Time it well and it costs us nothing.', 'The {unit} will find the soft place. Go.',
    ],
    leaderLost: [
      'A grave loss. They will hope we shall falter.', 'Let the enemy think it has done something. It has not.',
      'Put another officer up and show no alarm.', 'We will mourn when the matter is settled.', 'The {unit} must not see me worried.',
    ],
    winning: [
      'They think they hold something. They do not.', 'All goes to plan, and then a little further.', 'We lead, and they do not yet know why.',
      'Let them believe it is close. It is not.',
    ],
    losing: [
      'Let them have their little lead. It will cost them.', 'The score is not the battle, remember.', 'Behind, yes, but they have forgotten the reserves.',
      'A weakness shown is a weakness to exploit later.',
    ],
  },
  stoic: {
    cardPlayed: [
      'The orders are given. We carry them out.', 'No fuss. This is simply the next step.', 'As expected. Proceed.', 'We do what the day requires.',
      '{card}. That is all that need be said.',
    ],
    bigHit: [
      'That has told on them. Hold what we have won.', 'Good work. Keep your places.', 'It cost us little. Remember that.',
      'Steady. One blow does not make a battle.', 'The {unit} have done well. Say nothing, but note it.',
    ],
    unitLost: [
      'It is the way of war. Carry on.', 'Mourn later. Close up now.', 'Hard luck. The line stays.', 'The colours are still flying; that will do.',
      'The {unit} gave all they had. Honour them by holding.',
    ],
    squareFormed: [
      'Form square. We have done this before.', 'The square holds. It always has.', 'Steady in the ranks. Let them come.',
      'Dress it up; nothing more is needed.', 'The {unit} stand in square. That is enough.',
    ],
    charge: [
      'The charge is ordered. See it done.', 'Go in hard and finish it quickly.', 'No speeches. Simply go.', 'The moment is right. Ride.',
      'The {unit} have their orders.',
    ],
    leaderLost: [
      'The general has fallen. We hold.', 'A bad day for it. Carry on regardless.', 'Command passes. The duty does not.',
      'Say a prayer later; the line comes first.', 'The {unit} will hold, as their general would have wished.',
    ],
    winning: [
      'We are ahead. That is all.', 'The tally is in our favour. Keep at it.', 'No cheering yet. The day is not over.', 'Good. Now hold what we have.',
    ],
    losing: [
      'We are behind. The task is unchanged.', 'It is not yet lost, and that will do.', 'Hard fighting, then. No more than we expected.',
      'We hold on and wait for the turn.',
    ],
  },
};

/**
 * A line for `moment` in the personality's voice, or undefined (silence). The chance of speaking is `p.chatter × 0.5`; a line that
 * names the card or the unit is used only when `ctx` gives it. Draws only from `rand`: one for the chance, one more to pick.
 */
export function sayFor(p: Personality, moment: Moment, ctx: SayCtx, rand: Rng): string | undefined {
  if (!rand.chance(p.chatter * TALK_SHARE)) return undefined;
  const usable = (LINES[p.voice]?.[moment] ?? []).filter((l) => (!l.includes('{card}') || ctx.card !== undefined) && (!l.includes('{unit}') || ctx.unit !== undefined));
  if (usable.length === 0) return undefined;
  const line = usable[rand.int(usable.length)];
  return line.replace('{card}', ctx.card !== undefined ? CARD_DEFS[ctx.card].title : '').replace('{unit}', ctx.unit ?? '');
}
