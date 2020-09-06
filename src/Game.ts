import * as assert from 'assert';

import { StockFactory, ShuffleStockFactory } from './stock';
import { Card, CardDto } from './Card';
import { Deck } from './Deck';
import { Hand } from './Hand';
import { Round, RoundDto } from './Round';
import { Player, PlayerDto } from './Player';
import * as config from './config';

export enum GameState {
  Idle = 0,
  Attack = 1,
  Take = 2,
  DefenceShowcase = 3,
  Ended = 4,
}

export interface GameDto {
  players: PlayerDto[];
  state: number;
  trumpCard: CardDto;
  stockCount: number;
  discardCount: number;
  attackerId: number;
  defenderId: number;
  passerId: number;
  currentId: number;
  round: RoundDto;
}

export class Game {
  private state = GameState.Idle;
  private stockFactory: StockFactory;
  private stock = new Deck();
  private discard = new Deck();
  private round = new Round();
  private trumpCard: Card = null;
  private playerMap: Map<number, Player> = new Map();
  private handMap: Map<number, Hand> = new Map();
  private passMap: Map<number, boolean> = new Map();
  private attackerId = -1;
  private defenderId = -1;
  private passerId = -1;
  private currentId = -1;

  constructor(stockFactory: StockFactory = new ShuffleStockFactory()) {
    this.stockFactory = stockFactory;
  }

  clear(): void {
    this.state = GameState.Idle;
    this.stock.clear();
    this.discard.clear();
    this.round.clear();
    this.trumpCard = null;
    this.playerMap.clear();
    this.handMap.clear();
    this.passMap.clear();
    this.attackerId = -1;
    this.defenderId = -1;
    this.passerId = -1;
    this.currentId = -1;
  }

  init(players: Player[], lastLossPlayerId = -1): boolean {
    if (this.state !== GameState.Idle) {
      return false;
    }

    players.forEach((player) => {
      this.playerMap.set(player.getId(), player);
      this.handMap.set(player.getId(), new Hand());
      this.passMap.set(player.getId(), false);
    });

    this.stock = this.stockFactory.build();
    this.discard = new Deck();

    assert(
      this.stock.size() > this.handMap.size * config.HAND_MAX_CARDS,
      'Stock must have more cards than sum of all hands',
    );

    for (let cardIndex = 0; cardIndex < config.HAND_MAX_CARDS; cardIndex++) {
      this.handMap.forEach((hand) => {
        const card = this.stock.pop();
        hand.push(card);
      });
    }

    this.trumpCard = this.stock.peekFront();

    if (this.playerMap.has(lastLossPlayerId)) {
      this.updateAttackerId(this.getPrevPlayerId(lastLossPlayerId));
    } else {
      // Cant find lost player, select who attacks first by lowest trump
      let minTrumpHandCard: Card = null;
      let minTrumpPlayerId: number = null;

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

      let attackerId = this.playerMap.keys().next().value;
      if (minTrumpPlayerId !== null) {
        attackerId = minTrumpPlayerId;
      }
      this.updateAttackerId(attackerId);
    }

    this.resetRound();

    this.state = GameState.Attack;

    return true;
  }

  act(card: Card): boolean {
    if (
      this.currentId === this.attackerId ||
      this.currentId === this.passerId
    ) {
      if (this.state === GameState.Attack) {
        const attackerHand = this.handMap.get(this.currentId);
        if (!attackerHand.has(card)) {
          return false;
        }

        const hasAttacked = this.round.attack(card);
        if (!hasAttacked) {
          return false;
        }

        attackerHand.remove(card);

        this.currentId = this.defenderId;

        // After a new attack passes get reset, because new cards may appear
        // and other players can now make their moves with new cards
        this.resetPasses();
        return true;
      }

      if (this.state === GameState.Take) {
        const passerHand = this.handMap.get(this.currentId);
        if (!passerHand.has(card)) {
          return false;
        }

        const hasAttacked = this.round.attack(card);
        if (!hasAttacked) {
          return false;
        }

        passerHand.remove(card);
        return true;
      }
    }

    if (this.currentId === this.defenderId) {
      const defenderHand = this.handMap.get(this.defenderId);
      if (!defenderHand.has(card)) {
        return false;
      }

      const hasDefended = this.round.defend(card);
      if (!hasDefended) {
        return false;
      }

      defenderHand.remove(card);

      // If defender defended all his cards - finish the round and make him
      // an attacker
      if (this.round.isComplete()) {
        this.showcaseRoundDefended();
        return true;
      }

      // If defender has more cards - attack continues
      this.currentId = this.passerId;
      return true;
    }

    return false;
  }

  take(): boolean {
    if (this.currentId !== this.defenderId) {
      return false;
    }

    this.state = GameState.Take;
    this.currentId = this.attackerId;
    this.passerId = this.attackerId;

    return true;
  }

  pass(): boolean {
    if (
      this.currentId !== this.attackerId &&
      this.currentId !== this.passerId
    ) {
      return false;
    }

    if (this.state === GameState.Attack) {
      this.passMap.set(this.currentId, true);

      const nextPasserId = this.getNextPasserId(this.currentId);

      // Count not find next passer - all players have passed, end round
      if (nextPasserId === -1) {
        this.discardDefenceCards();
        this.finishRound(this.defenderId);
        return true;
      }

      this.updatePasserId(nextPasserId);
      return true;
    }

    if (
      this.state === GameState.Take ||
      this.state === GameState.DefenceShowcase
    ) {
      this.passMap.set(this.currentId, true);

      const nextPasserId = this.getNextPasserId(this.currentId);
      if (nextPasserId === -1) {
        const prevState = this.state;

        this.state = GameState.Attack;

        if (prevState === GameState.Take) {
          this.takeDefenceCards();
          this.finishRound(this.getNextPlayerId(this.defenderId));
        } else {
          this.discardDefenceCards();
          this.finishRound(this.defenderId);
        }
        return true;
      }

      this.updatePasserId(nextPasserId);
      return true;
    }

    return false;
  }

  private showcaseRoundDefended(): void {
    if (this.state !== GameState.Attack) {
      return;
    }
    if (this.currentId !== this.defenderId) {
      return;
    }

    this.state = GameState.DefenceShowcase;
    this.currentId = this.attackerId;
    this.passerId = this.attackerId;
  }

  private takeDefenceCards(): void {
    const hand = this.handMap.get(this.defenderId);
    hand.push(...this.round.getAttackCards());
    hand.push(...this.round.getDefenceCards());
  }

  private discardDefenceCards(): void {
    this.discard.push(...this.round.getAttackCards());
    this.discard.push(...this.round.getDefenceCards());
  }

  private finishRound(expectedAttackerId: number): void {
    this.resetPasses();
    this.refillHands();

    let nextAttackerId = expectedAttackerId;

    // Remove players who have no cards left
    Array.from(this.handMap).forEach(([id, hand]) => {
      // Keep the player if he still has cards
      if (!hand.empty()) {
        return;
      }

      // Select next attacker clockwise. make sure to do it before deleting
      // the player
      if (nextAttackerId === id) {
        nextAttackerId = this.getNextPlayerId(id);
      }

      // Remove all player related entities
      this.handMap.delete(id);
      this.playerMap.delete(id);
      this.passMap.delete(id);
    });

    this.updateAttackerId(nextAttackerId);

    // Round reset requires knew ids to be set
    this.resetRound();

    // Check for end requires player hands dealt
    this.checkEnded();
  }

  private refillHands(): void {
    // Iterate over all attack players and give them cards first.
    // First is the initial attacker, and the the rest of assisting players
    // clockwise.
    let attackerId = this.attackerId;

    this.handMap.forEach(() => {
      if (attackerId === this.defenderId) {
        attackerId = this.getNextPlayerId(attackerId);
        return;
      }

      const hand = this.handMap.get(attackerId);
      const fillCards = this.stock.takeBack(hand.tillFullCount());
      hand.push(...fillCards);

      attackerId = this.getNextPlayerId(attackerId);
    });

    // In the end give cards to defender
    const defenderHand = this.handMap.get(this.defenderId);
    const defenderFillCards = this.stock.takeBack(defenderHand.tillFullCount());
    defenderHand.push(...defenderFillCards);
  }

  private resetRound(): boolean {
    const defenderHand = this.handMap.get(this.defenderId);
    if (!defenderHand) {
      return false;
    }

    let roundMaxCards = config.ROUND_MAX_CARDS;
    if (this.discard.size() === 0) {
      roundMaxCards = config.SHORT_ROUND_MAX_CARDS;
    }
    if (roundMaxCards > defenderHand.size()) {
      roundMaxCards = defenderHand.size();
    }

    this.round.reset(this.trumpCard, roundMaxCards);

    return true;
  }

  private checkEnded(): void {
    if (this.state === GameState.Idle || this.state === GameState.Ended) {
      return;
    }

    if (this.playerMap.size > 1) {
      return;
    }

    if (this.playerMap.size === 1) {
      const player = this.playerMap.values().next().value;
      player.addLoss();
      this.round.clear();
      this.state = GameState.Ended;
      return;
    }

    // Draw
    this.round.clear();
    this.state = GameState.Ended;
    return;
  }

  private updateAttackerId(expectedAttackerId: number): void {
    if (this.playerMap.has(expectedAttackerId)) {
      this.attackerId = expectedAttackerId;
    } else {
      this.attackerId = this.getNextPlayerId(expectedAttackerId);
    }

    this.passerId = this.attackerId;
    this.defenderId = this.getNextPlayerId(this.attackerId);
    this.currentId = this.attackerId;
  }

  private updatePasserId(passerId): void {
    this.passerId = passerId;
    this.currentId = this.passerId;
  }

  private getNextPasserId(startId: number): number {
    const ids = Array.from(this.passMap.keys());

    let index = ids.indexOf(startId);

    for (let i = 0; i < ids.length; i++) {
      index = (index + 1) % ids.length;

      const id = ids[index];

      if (id === this.defenderId) {
        continue;
      }

      if (!this.passMap.get(id)) {
        return id;
      }
    }

    return -1;
  }

  private getPrevPlayerId(id: number): number {
    const ids = Array.from(this.playerMap.keys());

    const index = ids.indexOf(id);
    if (index === -1) {
      return index;
    }

    let prevIndex = index - 1;
    if (prevIndex < 0) {
      prevIndex = ids.length + prevIndex;
    }

    const prevId = ids[prevIndex];
    return prevId;
  }

  private getNextPlayerId(id: number): number {
    const ids = Array.from(this.playerMap.keys());

    const index = ids.indexOf(id);
    if (index === -1) {
      return index;
    }

    const nextIndex = (index + 1) % ids.length;
    const nextId = ids[nextIndex];
    return nextId;
  }

  private resetPasses(): void {
    this.passMap.forEach((pass, id) => {
      this.passMap.set(id, false);
    });
  }

  isEnded(): boolean {
    return this.state === GameState.Ended;
  }

  isEndedInLoss(): boolean {
    return this.isEnded() && this.playerMap.size === 1;
  }

  getPlayers(): Player[] {
    return Array.from(this.playerMap.values());
  }

  getPlayerHand(player: Player): Hand {
    const id = player.getId();

    if (!this.handMap.has(id)) {
      return new Hand();
    }

    const hand = this.handMap.get(id);
    return hand;
  }

  getTrumpCard(): Card {
    return this.trumpCard;
  }

  getStockCount(): number {
    return this.stock.size();
  }

  getDiscardCount(): number {
    return this.discard.size();
  }

  toObject(): GameDto {
    return {
      players: Array.from(this.playerMap.values()).map((player) =>
        player.toObject(),
      ),
      state: this.state,
      trumpCard: this.trumpCard?.toObject(),
      stockCount: this.stock.size(),
      discardCount: this.discard.size(),
      attackerId: this.attackerId,
      defenderId: this.defenderId,
      passerId: this.passerId,
      currentId: this.currentId,
      round: this.round.toObject(),
    };
  }
}
