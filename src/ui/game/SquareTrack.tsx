// A side's square track: four numbered slots, the card of the square with that counter in each. The owner may look at his
// own cards (RR §9.5); the opponent's lie face down, and nothing about them (title, kind, id) reaches the markup.
import { CARD_DEFS, cardKind, type GameState, type Side } from '../../engine';
import { CardBack, CardView } from '../kit';

export function SquareTrack({ side, owner, s }: { side: Side; owner: boolean; s: GameState }) {
  const track = s.players[side].squareTrack;
  return (
    <div className="square-track" role="group" aria-label="Square track">
      <span className="sq-label">Squares</span>
      {[0, 1, 2, 3].map((i) => {
        const card = track[i];
        const held = card !== null && card !== undefined;
        const title = held && owner ? `Square ${i + 1}: ${CARD_DEFS[cardKind(card)].title}` : held ? `Square ${i + 1}: a card face down` : `Square ${i + 1}: free`;
        return (
          <div key={i} className={`sq-slot ${held ? 'is-held' : ''}`} title={title}>
            <span className="sq-num">{i + 1}</span>
            {held && (owner
              ? <CardView kind={cardKind(card)} size="sm" className="sq-card" />
              : <CardBack size="sm" className="sq-card" />)}
          </div>
        );
      })}
    </div>
  );
}
