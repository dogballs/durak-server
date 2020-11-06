import { AttackerSelector } from './AttackerSelector';

import { PlayerId, PLAYER_MISSING_ID } from '../Player';
import { PlayerList } from '../PlayerList';

export class LastLossAttackerSelector implements AttackerSelector {
  private playerList: PlayerList;
  private lastLossPlayerId: PlayerId;

  constructor(
    playerList: PlayerList,
    lastLossPlayerId: PlayerId = PLAYER_MISSING_ID,
  ) {
    this.playerList = playerList;
    this.lastLossPlayerId = lastLossPlayerId;
  }

  select(): PlayerId {
    const prevId = this.playerList.prevId(this.lastLossPlayerId);

    if (prevId === PLAYER_MISSING_ID) {
      return PLAYER_MISSING_ID;
    }

    return prevId;
  }
}
