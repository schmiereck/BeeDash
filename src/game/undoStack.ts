import { cloneGameState } from './engine';
import { GameState } from './types';

export class UndoStack {
  private readonly maxSize: number;
  private stack: GameState[] = [];

  constructor(maxSize = 30) {
    this.maxSize = maxSize;
  }

  push(state: GameState): void {
    this.stack.push(cloneGameState(state));
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  pop(): GameState | null {
    const item = this.stack.pop();
    return item ? cloneGameState(item) : null;
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  size(): number {
    return this.stack.length;
  }

  clear(): void {
    this.stack = [];
  }
}
