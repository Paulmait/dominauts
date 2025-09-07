import { Tile } from './Tile';
import { v4 as uuidv4 } from 'uuid';

export interface IPlayer {
  id: string;
  name: string;
  hand: Tile[];
  score: number;
  isAI: boolean;
  avatar?: string;
}

export class Player implements IPlayer {
  public id: string;
  public hand: Tile[] = [];
  public score: number = 0;
  public coins: number = 0;
  public wins: number = 0;
  public losses: number = 0;

  constructor(
    public name: string,
    public isAI: boolean = false,
    public avatar?: string
  ) {
    this.id = uuidv4();
  }

  addTile(tile: Tile): void {
    this.hand.push(tile);
  }

  removeTile(tile: Tile): boolean {
    const index = this.hand.findIndex(t => t.equals(tile));
    if (index !== -1) {
      this.hand.splice(index, 1);
      return true;
    }
    return false;
  }

  hasTile(tile: Tile): boolean {
    return this.hand.some(t => t.equals(tile));
  }

  canPlay(boardEnds: number[]): boolean {
    return this.hand.some(tile => 
      boardEnds.some(end => tile.hasValue(end))
    );
  }

  getValidMoves(boardEnds: number[]): Tile[] {
    return this.hand.filter(tile =>
      boardEnds.some(end => tile.hasValue(end))
    );
  }

  getTotalPips(): number {
    return this.hand.reduce((sum, tile) => sum + tile.getValue(), 0);
  }

  hasEmptyHand(): boolean {
    return this.hand.length === 0;
  }

  sortHand(): void {
    this.hand.sort((a, b) => {
      if (a.isDouble() && !b.isDouble()) return -1;
      if (!a.isDouble() && b.isDouble()) return 1;
      return b.getValue() - a.getValue();
    });
  }

  reset(): void {
    this.hand = [];
    this.score = 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      hand: this.hand.map(t => ({ left: t.left, right: t.right })),
      score: this.score,
      coins: this.coins,
      isAI: this.isAI,
      avatar: this.avatar,
    };
  }
}