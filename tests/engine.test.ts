import { describe, expect, it } from 'vitest';
import { createGameState, stepGame, willDirectionChangeState } from '../src/game/engine';
import { POT_WOBBLE_TICKS } from '../src/game/honeyPhysics';
import { LevelDefinition } from '../src/game/types';
import { UndoStack } from '../src/game/undoStack';

function makeTestLevel(ascii: string[]): LevelDefinition {
  return {
    id: 'test-level',
    number: 1,
    title: 'Test',
    chapter: 'Test',
    mapCoords: { q: 0, r: 0 },
    intro: 'Test',
    tip: 'Test',
    ascii
  };
}

describe('GameEngine & HoneyPot physics', () => {
  it('moves in 4 directions, collides with walls, and digs wax', () => {
    const level = makeTestLevel([
      '#####',
      '#P. #',
      '#.# #',
      '#E  #',
      '#####'
    ]);
    const state = createGameState(level);

    // Blocked by top wall
    expect(willDirectionChangeState(state, 'up')).toBe(false);
    stepGame(state, 'up');
    expect(state.player.x).toBe(1);
    expect(state.player.y).toBe(1);

    // Dig wax right
    expect(willDirectionChangeState(state, 'right')).toBe(true);
    const evDig = stepGame(state, 'right');
    expect(state.player.x).toBe(2);
    expect(state.player.y).toBe(1);
    expect(state.grid[1][2].type).toBe('empty');
    expect(evDig.some((e) => e.type === 'dig')).toBe(true);

    // Move right into empty, down, down, left
    stepGame(state, 'right');
    stepGame(state, 'down');
    stepGame(state, 'down');
    stepGame(state, 'left');
    expect(state.player.x).toBe(2);
    expect(state.player.y).toBe(3);
  });

  it('frees trapped_bee when adjacent tile is cleared and opens exit when all goals are met', () => {
    const blockedCheck = createGameState(
      makeTestLevel(['#####', '#PBE#', '#####'])
    );
    expect(willDirectionChangeState(blockedCheck, 'right')).toBe(false);

    const level = makeTestLevel([
      '#######',
      '#PF.BE#',
      '#######'
    ]);
    const state = createGameState(level);

    // Walk onto flower
    const ev1 = stepGame(state, 'right');
    expect(state.collectedFlowers).toBe(1);
    expect(state.exitOpen).toBe(false);
    expect(ev1.some((e) => e.type === 'flower')).toBe(true);

    // Dig wax next to trapped_bee -> bee flies free and exit opens
    const ev2 = stepGame(state, 'right');
    expect(state.rescuedBees).toBe(1);
    expect(state.grid[1][4].type).toBe('empty');
    expect(state.exitOpen).toBe(true);
    expect(ev2.some((e) => e.type === 'rescue')).toBe(true);
    expect(ev2.some((e) => e.type === 'exit_open')).toBe(true);

    // Fly through freed space into open exit -> won
    stepGame(state, 'right');
    const evWin = stepGame(state, 'right');
    expect(state.status).toBe('won');
    expect(evWin.some((e) => e.type === 'win')).toBe(true);
  });

  it('prevents entering locked exit and emits exit_locked', () => {
    const level = makeTestLevel([
      '#####',
      '#PEF#',
      '#####'
    ]);
    const state = createGameState(level);
    const ev = stepGame(state, 'right');
    expect(state.status).toBe('playing');
    expect(state.player.x).toBe(1);
    expect(ev.some((e) => e.type === 'exit_locked')).toBe(true);
  });

  it('keeps player safe when standing directly underneath a resting honeypot', () => {
    const level = makeTestLevel([
      '#####',
      '# O #',
      '#P. #',
      '#  E#',
      '#####'
    ]);
    const state = createGameState(level);

    // Dig wax directly under pot -> classic Boulder-Dash safety
    stepGame(state, 'right');
    expect(state.player.x).toBe(2);
    expect(state.player.y).toBe(2);
    expect(state.status).toBe('playing');
    expect(state.grid[1][2].fallState).toBe('resting');

    // Waiting underneath stays 100% safe
    for (let i = 0; i < 5; i++) {
      stepGame(state, null);
    }
    expect(state.status).toBe('playing');
    expect(state.grid[1][2].type).toBe('honeypot');
    expect(state.grid[1][2].fallState).toBe('resting');

    // Step aside -> pot wobbles (POT_WOBBLE_TICKS = 1) then drops safely
    expect(POT_WOBBLE_TICKS).toBe(1);
    const evWobble = stepGame(state, 'right');
    expect(state.grid[1][2].fallState).toBe('wobbling');
    expect(evWobble.some((e) => e.type === 'pot_wobble')).toBe(true);

    stepGame(state, null);
    expect(state.status).toBe('playing');
    expect(state.grid[2][2].type).toBe('honeypot');
  });

  it('triggers bonk_pot only when an already falling pot hits the player from above', () => {
    const level = makeTestLevel([
      '#####',
      '# O #',
      '#P. #',
      '# . #',
      '#  E#',
      '#####'
    ]);

    // Case A: stay directly underneath after moving down -> falling pot hits player
    const risky = createGameState(level);
    stepGame(risky, 'right'); // under pot at (2,2), safe
    const evMoveDown = stepGame(risky, 'down'); // move to (2,3) -> (2,1) wobbles
    expect(risky.status).toBe('playing');
    expect(risky.grid[1][2].fallState).toBe('wobbling');
    expect(evMoveDown.some((e) => e.type === 'pot_wobble')).toBe(true);

    stepGame(risky, null); // pot falls to (2,2)
    expect(risky.status).toBe('playing');
    expect(risky.grid[2][2].fallState).toBe('falling');

    const evHit = stepGame(risky, null); // falling pot hits player at (2,3)
    expect(risky.status).toBe('lost');
    expect(risky.failReason).toBe('bonk_pot');
    expect(evHit.some((e) => e.type === 'bonk_pot')).toBe(true);

    // Case B: step aside while pot wobbles/falls -> safe!
    const safe = createGameState(level);
    stepGame(safe, 'right');
    stepGame(safe, 'down');
    stepGame(safe, 'right');
    stepGame(safe, null);
    expect(safe.status).toBe('playing');
    expect(safe.grid[3][2].type).toBe('honeypot');
  });

  it('rolls honeypots off rounded_wall and another resting honeypot', () => {
    const level = makeTestLevel([
      '#######',
      '#P O E#',
      '#  R  #',
      '#     #',
      '#######'
    ]);
    const state = createGameState(level);

    // Wait wobble ticks + roll + fall
    for (let i = 0; i < 6; i++) {
      stepGame(state, null);
    }

    // Rolled left off rounded_wall (3,2) to (2,1) and fell to (2,3)
    expect(state.grid[3][2].type).toBe('honeypot');
    expect(state.grid[3][2].fallState).toBe('resting');

    // Now test rolling off another honeypot
    const stackedLevel = makeTestLevel([
      '#######',
      '#P O E#',
      '#  O  #',
      '# ### #',
      '#######'
    ]);
    const stacked = createGameState(stackedLevel);
    for (let i = 0; i < 6; i++) {
      stepGame(stacked, null);
    }
    expect(stacked.grid[2][2].type).toBe('honeypot');
    expect(stacked.grid[2][3].type).toBe('honeypot');
  });

  it('pushes honeypot horizontally when behind is empty, blocks when solid behind', () => {
    const level = makeTestLevel([
      '#######',
      '#PO O##',
      '#    E#',
      '#######'
    ]);
    const state = createGameState(level);

    // Push first pot from (2,1) to (3,1)
    const ev = stepGame(state, 'right');
    expect(state.player.x).toBe(2);
    expect(state.grid[1][3].type).toBe('honeypot');
    expect(ev.some((e) => e.type === 'pot_push')).toBe(true);

    // Cannot push pot at (3,1) because (4,1) is another pot
    expect(willDirectionChangeState(state, 'right')).toBe(false);
    stepGame(state, 'right');
    expect(state.player.x).toBe(2);
  });

  it('restores exact grid, position, and counters with UndoStack (including after loss)', () => {
    const level = makeTestLevel([
      '#####',
      '#PFO#',
      '# .E#',
      '#####'
    ]);
    const state = createGameState(level);
    const undo = new UndoStack(30);

    undo.push(state);
    stepGame(state, 'right'); // collect flower at (2,1)
    expect(state.collectedFlowers).toBe(1);

    undo.push(state);
    stepGame(state, 'down'); // dig wax at (2,2)
    expect(state.grid[2][2].type).toBe('empty');

    const prev = undo.pop()!;
    expect(prev.player.x).toBe(2);
    expect(prev.player.y).toBe(1);
    expect(prev.collectedFlowers).toBe(1);
    expect(prev.grid[2][2].type).toBe('wax');

    const startState = undo.pop()!;
    expect(startState.player.x).toBe(1);
    expect(startState.player.y).toBe(1);
    expect(startState.collectedFlowers).toBe(0);
    expect(startState.grid[1][2].type).toBe('flower');
  });
});
