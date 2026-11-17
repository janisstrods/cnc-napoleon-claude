// Cavalry headgear. Stubs until Task 3 draws each kind.
import type { HorseHeadgear } from '../uniform';
import type { HeadgearRenderer } from './index';
import { stubHeadgear } from './stub';

export const HORSE_HEADGEAR: Record<HorseHeadgear, HeadgearRenderer> = {
  tarleton: stubHeadgear('tarleton'),
  dragoonHelmet: stubHeadgear('dragoonHelmet'),
  cuirassierHelmet: stubHeadgear('cuirassierHelmet'),
  crestedHelmet: stubHeadgear('crestedHelmet'),
  czapka: stubHeadgear('czapka'),
};
