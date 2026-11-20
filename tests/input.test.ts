import { describe, expect, it } from 'vitest';
import { MoveScheduler } from '../src/input/moveScheduler';
import { Direction } from '../src/game/types';

function runSimulation(
  scheduler: MoveScheduler,
  durationMs: number,
  frameMs: number,
  dirAt: (tMs: number) => Direction | null
): Array<{ tMs: number; dir: Direction }> {
  const moves: Array<{ tMs: number; dir: Direction }> = [];
  for (let t = 0; t <= durationMs; t += frameMs) {
    const dt = t === 0 ? frameMs : frameMs;
    const res = scheduler.update(t, dt, dirAt(t));
    if (res.shouldStep && res.moveDir !== null) {
      moves.push({ tMs: t, dir: res.moveDir });
      scheduler.markPlayerMoved(t);
    }
  }
  return moves;
}

describe('MoveScheduler (Double-step & microswitch bounce protection)', () => {
  it('moves exact 1 tile on a short tap (90ms held, then released)', () => {
    const scheduler = new MoveScheduler(260);
    const moves = runSimulation(scheduler, 600, 16, (t) => (t <= 96 ? 'right' : null));
    expect(moves).toHaveLength(1);
    expect(moves[0].dir).toBe('right');
  });

  it('moves smoothly 1 tile per tick while direction is held continuously', () => {
    const scheduler = new MoveScheduler(260);
    const moves = runSimulation(scheduler, 600, 20, () => 'right');
    // t=0 (move 1), t=260 (move 2), t=520 (move 3)
    expect(moves.map((m) => m.dir)).toEqual(['right', 'right', 'right']);
    expect(moves.map((m) => m.tMs)).toEqual([0, 260, 520]);
  });

  it('buffers a quick direction tap mid-tick and executes it on the next tick', () => {
    const scheduler = new MoveScheduler(260);
    const moves = runSimulation(scheduler, 400, 20, (t) => {
      if (t === 0) return 'right';
      if (t >= 100 && t <= 140) return 'down';
      return null;
    });
    expect(moves).toHaveLength(2);
    expect(moves[0]).toEqual({ tMs: 0, dir: 'right' });
    expect(moves[1]).toEqual({ tMs: 260, dir: 'down' });
  });

  it('ignores a 16ms mechanical microswitch release bounce without taking a 2nd step', () => {
    const scheduler = new MoveScheduler(260);
    const moves = runSimulation(scheduler, 600, 16, (t) => {
      if (t <= 80) return 'right';
      if (t === 96) return null; // release
      if (t === 112) return 'right'; // 16ms later: switch bounce
      return null;
    });
    expect(moves).toHaveLength(1);
    expect(moves[0].dir).toBe('right');
  });

  it('supports slower 380ms glides for single taps and mid-glide buffered turns', () => {
    const scheduler = new MoveScheduler(380);
    const moves = runSimulation(scheduler, 800, 20, (t) => {
      if (t === 0) return 'right';
      if (t >= 180 && t <= 220) return 'down';
      return null;
    });
    expect(moves).toEqual([
      { tMs: 0, dir: 'right' },
      { tMs: 380, dir: 'down' }
    ]);
  });
});
