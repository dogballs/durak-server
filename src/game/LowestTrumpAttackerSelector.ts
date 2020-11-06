import { AttackerSelector } from './AttackerSelector';

import { Card } from '../Card';
import { Hand } from '../Hand';
import { PlayerId, PLAYER_MISSING_ID } from '../Player';
import { PlayerList } from '../PlayerList';

export class LowestTrumpAttackerSelector implements AttackerSelector {
  private playerList: PlayerList;
  private handMap: Map<number, Hand>;
  private trumpCard: Card;

  constructor(
    playerList: PlayerList,
    handMap: Map<number, Hand>,
    trumpCard: Card,
  ) {
    this.playerList = playerList;
    this.handMap = handMap;
    this.trumpCard = trumpCard;
  }

  select(): PlayerId {
    let minTrumpHandCard: Card = null;
    let minTrumpPlayerId: PlayerId = PLAYER_MISSING_ID;

    this.handMap.forEach((hand, playerId) => {
      const cards = hand.getCards();

      for (const card of cards) {
        if (card.isSameSuite(this.trumpCard)) {
          if (
            minTrumpHandCard === null ||
            card.isLowerRankThan(minTrumpHandCard)
          ) {
            minTrumpHandCard = card;
            minTrumpPlayerId = playerId;
          }
        }
      }
    });

    let attackerId = this.playerList.firstId();
    if (minTrumpPlayerId !== PLAYER_MISSING_ID) {
      attackerId = minTrumpPlayerId;
    }

    return attackerId;
  }
}
