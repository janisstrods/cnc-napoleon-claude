// A plain stand-in for a headgear kind, in the head-local frame (origin at the head's centre, radius 2.4, facing right).
// The owning task replaces each kind's stub with its drawing.
import { OL, OW } from '../draw';
import type { HeadgearRenderer } from './index';
import type { HeadgearKind } from '../uniform';

const DEFAULT_BODY = '#2a2622';

export function stubHeadgear(kind: HeadgearKind): HeadgearRenderer {
  return function StubHeadgear({ head }) {
    const c = head.body ?? DEFAULT_BODY;
    return (
      <g data-head={kind}>
        <path d="M-2.5 -0.6 L-2.1 -4.6 L2.1 -4.6 L2.5 -0.6 Z" fill={c} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      </g>
    );
  };
}
