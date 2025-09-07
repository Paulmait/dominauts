export interface ITile {
  left: number;
  right: number;
  id: string;
}

export class Tile implements ITile {
  public readonly id: string;

  constructor(
    public readonly left: number,
    public readonly right: number
  ) {
    this.id = `${left}-${right}`;
  }

  isDouble(): boolean {
    return this.left === this.right;
  }

  getValue(): number {
    return this.left + this.right;
  }

  hasValue(value: number): boolean {
    return this.left === value || this.right === value;
  }

  canConnect(other: Tile): boolean {
    return this.hasValue(other.left) || this.hasValue(other.right);
  }

  flip(): Tile {
    return new Tile(this.right, this.left);
  }

  equals(other: Tile): boolean {
    return (this.left === other.left && this.right === other.right) ||
           (this.left === other.right && this.right === other.left);
  }

  toString(): string {
    return `[${this.left}|${this.right}]`;
  }
}