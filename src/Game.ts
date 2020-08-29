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
  Ended = 3,
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
  private players: Player[] = [];
  private hands: Hand[] = [];
  private passes: boolean[] = [];
  private stockFactory: StockFactory;
  private stock = new Deck();
  private discard = new Deck();
  private round = new Round();
  private trumpCard: Card = null;
  private roundIndex = -1;
  private attackerIndex = -1;
  private defenderIndex = -1;
  private passerIndex = -1;
  private currentIndex = -1;

  constructor(stockFactory: StockFactory = new ShuffleStockFactory()) {
    this.stockFactory = stockFactory;
  }

  clear(): void {
    this.state = GameState.Idle;
    this.players = [];
    this.hands = [];
    this.passes = [];
    this.stock.clear();
    this.discard.clear();
    this.round.clear();
    this.trumpCard = null;
    this.roundIndex = -1;
    this.attackerIndex = -1;
    this.passerIndex = -1;
    this.defenderIndex = -1;
    this.currentIndex = -1;
  }

  init(players: Player[], lastLossPlayerId = -1): boolean {
    if (this.state !== GameState.Idle) {
      return false;
    }

    this.players = players;

    for (let i = 0; i < this.players.length; i++) {
      const hand = new Hand();
      this.hands.push(hand);

      this.passes.push(false);
    }

    this.stock = this.stockFactory.build();
    this.discard = new Deck();

    assert(
      this.stock.size() > this.hands.length * config.HAND_MAX_CARDS,
      'Stock must have more cards than sum of all hands',
    );

    for (let cardIndex = 0; cardIndex < config.HAND_MAX_CARDS; cardIndex++) {
      for (const hand of this.hands) {
        const card = this.stock.pop();
        hand.push(card);
      }
    }

    this.trumpCard = this.stock.peekFront();

    const lastLossPlayerIndex = this.getPlayerIndexById(lastLossPlayerId);

    if (lastLossPlayerIndex !== -1) {
      this.updateAttackIndex(lastLossPlayerIndex - 1);
    } else {
      // Cant find lost player, select who attacks first by lowest trump
      let minTrumpHandCard: Card = null;
      let minTrumpHandIndex: number = null;

      for (let handIndex = 0; handIndex < this.hands.length; handIndex++) {
        const hand = this.hands[handIndex];
        const cards = hand.getCards();
        for (const card of cards) {
          if (card.isSameSuite(this.trumpCard)) {
            if (
              minTrumpHandCard === null ||
              card.isLowerRankThan(minTrumpHandCard)
            ) {
              minTrumpHandCard = card;
              minTrumpHandIndex = handIndex;
            }
          }
        }
      }

      let attackerIndex = 0;
      if (minTrumpHandIndex !== null) {
        attackerIndex = minTrumpHandIndex;
      }
      this.updateAttackIndex(attackerIndex);
    }

    this.state = GameState.Attack;

    return true;
  }

  act(card: Card): boolean {
    if (
      this.currentIndex === this.attackerIndex ||
      this.currentIndex === this.passerIndex
    ) {
      if (this.state === GameState.Attack) {
        // Starts a first attack in a new round
        if (this.round.isEmpty()) {
          this.roundIndex += 1;
          this.resetRound();
        }

        const attackerHand = this.hands[this.currentIndex];
        if (!attackerHand.has(card)) {
          return false;
        }

        const hasAttacked = this.round.attack(card);
        if (!hasAttacked) {
          return false;
        }

        attackerHand.remove(card);

        this.currentIndex = this.defenderIndex;

        // After a new attack passes get reset, because new cards may appear
        // and other players can now make their moves with new cards
        this.resetPasses();
        return true;
      }

      if (this.state === GameState.Take) {
        const passerHand = this.hands[this.currentIndex];
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

    if (this.currentIndex === this.defenderIndex) {
      const defenderHand = this.hands[this.defenderIndex];
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
        this.finishRoundDefended();
        this.updateAttackIndex(this.defenderIndex);
        return true;
      }

      // If defender has more cards - attack continues
      this.currentIndex = this.passerIndex;
      return true;
    }

    return false;
  }

  take(): boolean {
    if (this.currentIndex !== this.defenderIndex) {
      return false;
    }

    this.state = GameState.Take;
    this.currentIndex = this.attackerIndex;
    this.passerIndex = this.attackerIndex;

    return true;
  }

  pass(): boolean {
    if (
      this.currentIndex !== this.attackerIndex &&
      this.currentIndex !== this.passerIndex
    ) {
      return false;
    }

    if (this.state === GameState.Attack) {
      this.passes[this.currentIndex] = true;

      const nextPasserIndex = this.getNextPasserIndex(this.currentIndex);

      // Count not find next passer - all players have passed, end round
      if (nextPasserIndex === -1) {
        this.finishRoundDefended();
        this.updateAttackIndex(this.attackerIndex + 1);
        return true;
      }

      this.updatePassIndex(nextPasserIndex);
      return true;
    }

    if (this.state === GameState.Take) {
      this.passes[this.currentIndex] = true;

      const nextPasserIndex = this.getNextPasserIndex(this.currentIndex);
      if (nextPasserIndex === -1) {
        // Move all cards to defender hand
        this.state = GameState.Attack;
        this.finishRoundTaken();
        this.updateAttackIndex(this.attackerIndex + 2);
        return true;
      }

      this.updatePassIndex(nextPasserIndex);
      return true;
    }

    return false;
  }

  private finishRoundTaken(): void {
    const hand = this.hands[this.defenderIndex];
    hand.push(...this.round.getAttackCards());
    hand.push(...this.round.getDefenceCards());
    this.resetRound();
    this.resetPasses();
    this.refillHands();
    this.updatePlayers();
    this.checkEnded();
  }

  private finishRoundDefended(): void {
    this.discard.push(...this.round.getAttackCards());
    this.discard.push(...this.round.getDefenceCards());
    this.resetRound();
    this.resetPasses();
    this.refillHands();
    this.updatePlayers();
    this.checkEnded();
  }

  private refillHands(): void {
    // Iterate over all attack players and give them cards
    let attackerIndex = this.attackerIndex;
    for (let i = 0; i < this.hands.length; i++) {
      if (attackerIndex === this.defenderIndex) {
        attackerIndex = (attackerIndex + 1) % this.hands.length;
        continue;
      }

      const hand = this.hands[attackerIndex];
      const fillCards = this.stock.takeBack(hand.tillFullCount());
      hand.push(...fillCards);

      attackerIndex = (attackerIndex + 1) % this.hands.length;
    }

    // In the end give cards to defender
    const defenderHand = this.hands[this.defenderIndex];
    const defenderFillCards = this.stock.takeBack(defenderHand.tillFullCount());
    defenderHand.push(...defenderFillCards);
  }

  private updateAttackIndex(expectedAttackerIndex: number): void {
    this.attackerIndex = expectedAttackerIndex % this.hands.length;

    // Going backwards
    if (this.attackerIndex < 0) {
      this.attackerIndex = this.hands.length + this.attackerIndex;
    }

    this.passerIndex = this.attackerIndex;
    this.defenderIndex = (this.attackerIndex + 1) % this.hands.length;
    this.currentIndex = this.attackerIndex;
  }

  private updatePassIndex(expectedPasserIndex: number): void {
    this.passerIndex = expectedPasserIndex % this.hands.length;
    this.currentIndex = this.passerIndex;
  }

  private updatePlayers(): void {
    if (this.state === GameState.Idle) {
      return;
    }

    for (let i = this.hands.length - 1; i >= 0; i--) {
      const hand = this.hands[i];
      if (!hand.empty()) {
        continue;
      }

      // Remove all player related entities
      this.hands.splice(i, 1);
      this.players.splice(i, 1);
      this.passes.splice(i, 1);
    }
  }

  private resetRound(): boolean {
    const defenderHand = this.hands[this.defenderIndex];
    if (!defenderHand) {
      return false;
    }
    this.round.reset(this.trumpCard, defenderHand.size());
    return true;
  }

  private checkEnded(): void {
    if (this.state === GameState.Idle || this.state === GameState.Ended) {
      return;
    }

    if (this.players.length > 1) {
      return;
    }

    if (this.players.length === 1) {
      const player = this.players[0];
      player.addLoss();
      this.state = GameState.Ended;
      return;
    }

    // Draw

    this.state = GameState.Ended;
    return;
  }

  private getNextPasserIndex(startIndex: number): number {
    let passIndex = startIndex % this.passes.length;

    for (let i = 0; i < this.passes.length; i++) {
      passIndex = (passIndex + 1) % this.passes.length;

      if (passIndex === this.defenderIndex) {
        continue;
      }

      const pass = this.passes[passIndex];
      if (pass === false) {
        return passIndex;
      }
    }

    return -1;
  }

  private resetPasses(): void {
    for (let i = 0; i < this.passes.length; i++) {
      this.passes[i] = false;
    }
  }

  isEnded(): boolean {
    return this.state === GameState.Ended;
  }

  isEndedInLoss(): boolean {
    return this.isEnded() && this.players.length === 1;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getPlayerHand(playerToFind: Player): Hand {
    const playerIndex = this.players.findIndex(
      (player) => player.getId() === playerToFind.getId(),
    );
    const hand = this.hands[playerIndex];
    if (!hand) {
      return new Hand();
    }

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

  private getPlayerIndexById(id: number): number {
    return this.players.findIndex((player) => player.getId() === id);
  }

  private getPlayerIdByIndex(index: number): number {
    const player = this.players[index];
    if (!player) {
      return -1;
    }
    return player.getId();
  }

  toObject(): GameDto {
    return {
      players: this.players.map((player) => player.toObject()),
      state: this.state,
      trumpCard: this.trumpCard?.toObject(),
      stockCount: this.stock.size(),
      discardCount: this.discard.size(),
      attackerId: this.getPlayerIdByIndex(this.attackerIndex),
      defenderId: this.getPlayerIdByIndex(this.defenderIndex),
      passerId: this.getPlayerIdByIndex(this.passerIndex),
      currentId: this.getPlayerIdByIndex(this.currentIndex),
      round: this.round.toObject(),
    };
  }
}
