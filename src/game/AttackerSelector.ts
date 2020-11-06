import { PlayerId } from '../Player';

export interface AttackerSelector {
  select(): PlayerId;
}
