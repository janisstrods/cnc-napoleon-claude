// One piece of a gun unit: the gun itself, a crewman or a driver. A stub until Task 5 draws them.
import type { NationLook } from './nations';
import { StubFigure } from './stub';
import type { GunPiece, GunSpec } from './uniform';

export function GunPieceFigure({ spec: _spec, n, i, piece }: { spec: GunSpec; n: NationLook; i: number; piece: GunPiece }) {
  return <StubFigure drawing="gun" n={n} i={i} piece={piece} />;
}
