// The horse, drawn alone: shared by the rider (Task 3), the leader (Task 6) and the horse-artillery team (Task 5). A stub
// until Task 3. Parts never carry data-fig, so a horse-artillery driver still counts once.
import type { NationLook } from './nations';
import type { HorseCoatName } from './uniform';

export function Horse({ n: _n, coat: _coat }: { n: NationLook; coat: HorseCoatName }) {
  return <g data-part="horse" />;
}
