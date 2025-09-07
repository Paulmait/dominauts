import { Tile } from './Tile';

export interface BoardEnd {
  value: number;
  isDouble: boolean;
  position: 'left' | 'right' | 'top' | 'bottom';
}

export interface PlacedTile {
  tile: Tile;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  branch?: string;
}

export class Board {
  private tiles: PlacedTile[] = [];
  private branches: Map<string, PlacedTile[]> = new Map();
  private spinner: Tile | null = null;
  
  constructor() {
    this.branches.set('main', []);
  }

  placeTile(
    tile: Tile, 
    position: 'left' | 'right' | 'spinner' = 'right',
    branch: string = 'main'
  ): boolean {
    if (this.isEmpty() && position !== 'spinner') {
      this.addFirstTile(tile);
      return true;
    }

    const branchTiles = this.branches.get(branch) || [];
    
    if (position === 'spinner' && tile.isDouble()) {
      this.setSpinner(tile);
      return true;
    }

    const canPlace = this.validatePlacement(tile, position, branch);
    if (!canPlace) return false;

    const placement = this.calculatePlacement(tile, position, branch);
    const placedTile: PlacedTile = {
      tile,
      ...placement,
      branch
    };

    this.tiles.push(placedTile);
    branchTiles.push(placedTile);
    this.branches.set(branch, branchTiles);

    return true;
  }

  private addFirstTile(tile: Tile): void {
    const placedTile: PlacedTile = {
      tile,
      x: 0,
      y: 0,
      orientation: tile.isDouble() ? 'vertical' : 'horizontal',
      branch: 'main'
    };

    this.tiles.push(placedTile);
    this.branches.get('main')!.push(placedTile);

    if (tile.isDouble()) {
      this.spinner = tile;
    }
  }

  private setSpinner(tile: Tile): void {
    if (!this.spinner && tile.isDouble()) {
      this.spinner = tile;
      this.branches.set('top', []);
      this.branches.set('bottom', []);
      this.branches.set('left', []);
      this.branches.set('right', []);
    }
  }

  private validatePlacement(
    tile: Tile, 
    position: 'left' | 'right' | 'spinner',
    branch: string
  ): boolean {
    const branchTiles = this.branches.get(branch);
    if (!branchTiles || branchTiles.length === 0) {
      return this.isEmpty() || branch !== 'main';
    }

    const endTile = position === 'left' 
      ? branchTiles[0] 
      : branchTiles[branchTiles.length - 1];

    return tile.canConnect(endTile.tile);
  }

  private calculatePlacement(
    tile: Tile,
    position: 'left' | 'right' | 'spinner',
    branch: string
  ): { x: number; y: number; orientation: 'horizontal' | 'vertical' } {
    const branchTiles = this.branches.get(branch) || [];
    
    if (branchTiles.length === 0) {
      return { x: 0, y: 0, orientation: 'horizontal' };
    }

    const referenceTile = position === 'left' 
      ? branchTiles[0]
      : branchTiles[branchTiles.length - 1];

    const tileWidth = 60;
    const tileHeight = 30;
    const gap = 5;

    let x = referenceTile.x;
    let y = referenceTile.y;
    let orientation: 'horizontal' | 'vertical' = 'horizontal';

    if (branch === 'main' || branch === 'left' || branch === 'right') {
      orientation = 'horizontal';
      if (position === 'left') {
        x -= tileWidth + gap;
      } else {
        x += tileWidth + gap;
      }
    } else {
      orientation = 'vertical';
      if (position === 'left') {
        y -= tileHeight + gap;
      } else {
        y += tileHeight + gap;
      }
    }

    return { x, y, orientation };
  }

  getEnds(): BoardEnd[] {
    const ends: BoardEnd[] = [];

    for (const [branchName, branchTiles] of this.branches) {
      if (branchTiles.length > 0) {
        const leftTile = branchTiles[0].tile;
        const rightTile = branchTiles[branchTiles.length - 1].tile;

        ends.push({
          value: leftTile.left,
          isDouble: leftTile.isDouble(),
          position: 'left'
        });

        ends.push({
          value: rightTile.right,
          isDouble: rightTile.isDouble(),
          position: 'right'
        });
      }
    }

    return ends;
  }

  getEndValues(): number[] {
    return this.getEnds().map(end => end.value);
  }

  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  getTiles(): PlacedTile[] {
    return [...this.tiles];
  }

  getBranches(): Map<string, PlacedTile[]> {
    return new Map(this.branches);
  }

  getSpinner(): Tile | null {
    return this.spinner;
  }

  reset(): void {
    this.tiles = [];
    this.branches.clear();
    this.branches.set('main', []);
    this.spinner = null;
  }

  toJSON() {
    return {
      tiles: this.tiles.map(pt => ({
        tile: { left: pt.tile.left, right: pt.tile.right },
        x: pt.x,
        y: pt.y,
        orientation: pt.orientation,
        branch: pt.branch
      })),
      spinner: this.spinner ? { left: this.spinner.left, right: this.spinner.right } : null
    };
  }
}