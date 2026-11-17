// Headgear renderers by kind. Each draws in the head-local frame (origin at the head's centre, head radius 2.4, facing
// right) and its root element carries data-head={kind}.
import { createElement } from 'react';
import type { Fig } from '../draw';
import type { HeadgearKind, Headwear } from '../uniform';
import { COMMAND_HEADGEAR } from './command';
import { FOOT_HEADGEAR } from './foot';
import { HORSE_HEADGEAR } from './horse';

export type HeadgearRenderer = (p: { head: Headwear; f: Fig }) => JSX.Element;

export { COMMAND_HEADGEAR, FOOT_HEADGEAR, HORSE_HEADGEAR };

export const HEADGEAR: Record<HeadgearKind, HeadgearRenderer> = { ...FOOT_HEADGEAR, ...HORSE_HEADGEAR, ...COMMAND_HEADGEAR };

/** The headgear `head` describes, on a head in the head-local frame. */
export function Headgear({ head, f }: { head: Headwear; f: Fig }): JSX.Element {
  return createElement(HEADGEAR[head.kind], { head, f });
}
