// Headgear of officers and leaders. A stub until Task 6 draws the bicorne.
import type { CommandHeadgear } from '../uniform';
import type { HeadgearRenderer } from './index';
import { stubHeadgear } from './stub';

export const COMMAND_HEADGEAR: Record<CommandHeadgear, HeadgearRenderer> = {
  bicorne: stubHeadgear('bicorne'),
};
