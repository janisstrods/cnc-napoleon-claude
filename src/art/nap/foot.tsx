// The foot figure. A stub until Task 2 draws it; parts (FootBody) never carry data-fig, only the root does.
import type { NationLook } from './nations';
import { StubFigure } from './stub';
import type { FootSpec } from './uniform';

export function FootFigure({ spec: _spec, n, i }: { spec: FootSpec; n: NationLook; i: number }) {
  return <StubFigure drawing="foot" n={n} i={i} />;
}
