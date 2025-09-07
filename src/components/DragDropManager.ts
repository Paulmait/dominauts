/**
 * Dominauts™ - Drag & Drop Manager
 * Advanced drag and drop with snap-to-grid functionality
 */

import { DominoTile, Position } from '../types';
import { EventEmitter } from '../core/utils/EventEmitter';

interface DragState {
  isDragging: boolean;
  draggedTile: DominoTile | null;
  startPosition: Position;
  currentPosition: Position;
  offset: Position;
}

interface DropZone {
  id: string;
  position: Position;
  width: number;
  height: number;
  isValid: boolean;
  highlight: boolean;
}

export class DragDropManager extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private dragState: DragState;
  private dropZones: Map<string, DropZone> = new Map();
  private gridSize: number = 30;
  private snapThreshold: number = 15;
  private isEnabled: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    
    this.dragState = {
      isDragging: false,
      draggedTile: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      offset: { x: 0, y: 0 }
    };
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.isEnabled) return;
    
    const position = this.getEventPosition(e);
    this.startDrag(position);
  }

  /**
   * Handle mouse move
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isEnabled) return;
    
    const position = this.getEventPosition(e);
    
    if (this.dragState.isDragging) {
      this.updateDrag(position);
    } else {
      this.handleHover(position);
    }
  }

  /**
   * Handle mouse up
   */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isEnabled || !this.dragState.isDragging) return;
    
    const position = this.getEventPosition(e);
    this.endDrag(position);
  }

  /**
   * Handle mouse leave
   */
  private handleMouseLeave(): void {
    if (this.dragState.isDragging) {
      this.cancelDrag();
    }
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.isEnabled || e.touches.length !== 1) return;
    
    e.preventDefault();
    const position = this.getTouchPosition(e.touches[0]);
    this.startDrag(position);
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isEnabled || !this.dragState.isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    const position = this.getTouchPosition(e.touches[0]);
    this.updateDrag(position);
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isEnabled || !this.dragState.isDragging) return;
    
    e.preventDefault();
    
    // Use last touch position
    if (e.changedTouches.length > 0) {
      const position = this.getTouchPosition(e.changedTouches[0]);
      this.endDrag(position);
    } else {
      this.cancelDrag();
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(): void {
    this.cancelDrag();
  }

  /**
   * Start dragging
   */
  private startDrag(position: Position): void {
    const tile = this.getTileAtPosition(position);
    
    if (!tile) return;
    
    this.dragState = {
      isDragging: true,
      draggedTile: tile,
      startPosition: { ...position },
      currentPosition: { ...position },
      offset: this.calculateOffset(tile, position)
    };
    
    // Add visual feedback
    this.canvas.style.cursor = 'grabbing';
    
    // Highlight valid drop zones
    this.updateDropZones(tile);
    
    this.emit('dragStart', {
      tile,
      position
    });
  }

  /**
   * Update drag position
   */
  private updateDrag(position: Position): void {
    if (!this.dragState.isDragging) return;
    
    this.dragState.currentPosition = { ...position };
    
    // Check for hover over drop zones
    const hoveredZone = this.getDropZoneAtPosition(position);
    
    // Update highlights
    this.dropZones.forEach((zone, id) => {
      zone.highlight = hoveredZone?.id === id;
    });
    
    // Add snap preview
    if (hoveredZone && hoveredZone.isValid) {
      const snappedPosition = this.snapToGrid(position);
      
      this.emit('dragPreview', {
        tile: this.dragState.draggedTile,
        position: snappedPosition,
        zone: hoveredZone
      });
    }
    
    this.emit('dragMove', {
      tile: this.dragState.draggedTile,
      position,
      hoveredZone
    });
  }

  /**
   * End dragging
   */
  private endDrag(position: Position): void {
    if (!this.dragState.isDragging || !this.dragState.draggedTile) return;
    
    const dropZone = this.getDropZoneAtPosition(position);
    
    if (dropZone && dropZone.isValid) {
      // Snap to grid
      const snappedPosition = this.snapToGrid(position);
      
      this.emit('drop', {
        tile: this.dragState.draggedTile,
        position: snappedPosition,
        zone: dropZone
      });
      
      // Add drop animation
      this.animateDrop(snappedPosition);
    } else {
      // Invalid drop - return to original position
      this.animateReturn();
      
      this.emit('dropInvalid', {
        tile: this.dragState.draggedTile,
        position
      });
    }
    
    this.resetDragState();
  }

  /**
   * Cancel dragging
   */
  private cancelDrag(): void {
    if (!this.dragState.isDragging) return;
    
    this.animateReturn();
    
    this.emit('dragCancel', {
      tile: this.dragState.draggedTile
    });
    
    this.resetDragState();
  }

  /**
   * Handle hover
   */
  private handleHover(position: Position): void {
    const tile = this.getTileAtPosition(position);
    
    if (tile) {
      this.canvas.style.cursor = 'grab';
      
      this.emit('tileHover', {
        tile,
        position
      });
    } else {
      this.canvas.style.cursor = 'default';
      
      this.emit('tileHoverEnd');
    }
  }

  /**
   * Reset drag state
   */
  private resetDragState(): void {
    this.dragState = {
      isDragging: false,
      draggedTile: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      offset: { x: 0, y: 0 }
    };
    
    this.canvas.style.cursor = 'default';
    
    // Clear drop zone highlights
    this.dropZones.forEach(zone => {
      zone.highlight = false;
    });
    
    this.emit('dragEnd');
  }

  /**
   * Get event position relative to canvas
   */
  private getEventPosition(e: MouseEvent): Position {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Get touch position relative to canvas
   */
  private getTouchPosition(touch: Touch): Position {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /**
   * Get tile at position
   * This should be implemented based on your tile rendering
   */
  private getTileAtPosition(position: Position): DominoTile | null {
    // Emit event to let the game handle tile detection
    const result = { tile: null as DominoTile | null };
    
    this.emit('getTileAtPosition', {
      position,
      callback: (tile: DominoTile | null) => {
        result.tile = tile;
      }
    });
    
    return result.tile;
  }

  /**
   * Calculate offset for dragging
   */
  private calculateOffset(tile: DominoTile, position: Position): Position {
    // This should calculate the offset from the tile's center
    // For now, return zero offset
    return { x: 0, y: 0 };
  }

  /**
   * Update drop zones based on current tile
   */
  private updateDropZones(tile: DominoTile): void {
    // Request valid drop zones from the game
    this.emit('requestDropZones', {
      tile,
      callback: (zones: DropZone[]) => {
        this.dropZones.clear();
        zones.forEach(zone => {
          this.dropZones.set(zone.id, zone);
        });
      }
    });
  }

  /**
   * Get drop zone at position
   */
  private getDropZoneAtPosition(position: Position): DropZone | null {
    for (const zone of this.dropZones.values()) {
      if (this.isPositionInZone(position, zone)) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Check if position is in zone
   */
  private isPositionInZone(position: Position, zone: DropZone): boolean {
    return position.x >= zone.position.x &&
           position.x <= zone.position.x + zone.width &&
           position.y >= zone.position.y &&
           position.y <= zone.position.y + zone.height;
  }

  /**
   * Snap position to grid
   */
  private snapToGrid(position: Position): Position {
    return {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize
    };
  }

  /**
   * Animate drop
   */
  private animateDrop(position: Position): void {
    // Emit animation event
    this.emit('animateDrop', {
      from: this.dragState.currentPosition,
      to: position,
      duration: 200
    });
  }

  /**
   * Animate return to original position
   */
  private animateReturn(): void {
    this.emit('animateReturn', {
      from: this.dragState.currentPosition,
      to: this.dragState.startPosition,
      duration: 300
    });
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.gridSize = size;
  }

  /**
   * Set snap threshold
   */
  setSnapThreshold(threshold: number): void {
    this.snapThreshold = threshold;
  }

  /**
   * Enable/disable drag and drop
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.cancelDrag();
    }
  }

  /**
   * Add drop zone
   */
  addDropZone(zone: DropZone): void {
    this.dropZones.set(zone.id, zone);
  }

  /**
   * Remove drop zone
   */
  removeDropZone(id: string): void {
    this.dropZones.delete(id);
  }

  /**
   * Clear all drop zones
   */
  clearDropZones(): void {
    this.dropZones.clear();
  }

  /**
   * Get current drag state
   */
  getDragState(): DragState {
    return { ...this.dragState };
  }

  /**
   * Is currently dragging
   */
  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    
    this.removeAllListeners();
  }
}