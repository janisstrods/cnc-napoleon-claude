// Foot headgear. Stubs until Task 2 draws each kind.
import type { FootHeadgear } from '../uniform';
import type { HeadgearRenderer } from './index';
import { stubHeadgear } from './stub';

export const FOOT_HEADGEAR: Record<FootHeadgear, HeadgearRenderer> = {
  shako: stubHeadgear('shako'),
  bearskin: stubHeadgear('bearskin'),
  bearskinPlate: stubHeadgear('bearskinPlate'),
  coveredShako: stubHeadgear('coveredShako'),
  stovepipe: stubHeadgear('stovepipe'),
  barretina: stubHeadgear('barretina'),
  roundHat: stubHeadgear('roundHat'),
};
