import { describe, expect, it } from 'vitest';
import { createGameState, stepGame } from '../src/game/engine';
import {
  BEE_SHOO_TICKS,
  FLOWER_REGROW_TICKS,
  GRUB_EMPTY_COOLDOWN,
  GRUB_WAX_COOLDOWN,
  MITE_EMPTY_COOLDOWN,
  MITE_WAX_COOLDOWN,
  PEST_SLEEP_TICKS
} from '../src/game/pestPhysics';
import { LevelDefinition } from '../src/game/types';
import { UndoStack } from '../src/game/undoStack';

function makeTestLevel(ascii: string[], requiredFlowers?: number): LevelDefinition {
  return {
    id: 'test-pest',
    number: 99,
    world: 4,
    title: 'Test Pest',
    chapter: 'Test',
    mapCoords: { q: 0, r: 0 },
    intro: '',
    tip: '',
    requiredFlowers,
    ascii
  };
}

describe('Pests (Grubs & Mites) and Regrowing Flowers', () => {
  it('parses M as grub and m as mite with expected initial cooldowns', () => {
    const state = createGameState(
      makeTestLevel([
        '#########',
        '#P.M.mFE#',
        '#########'
      ])
    );

    expect(state.pests).toHaveLength(2);
    expect(state.pests[0].kind).toBe('grub');
    expect(state.pests[0].x).toBe(3);
    expect(state.pests[0].moveCooldown).toBe(GRUB_EMPTY_COOLDOWN);
    expect(state.pests[1].kind).toBe('mite');
    expect(state.pests[1].x).toBe(5);
    expect(state.pests[1].moveCooldown).toBe(MITE_EMPTY_COOLDOWN);
  });

  it('moves mites faster than grubs along open tunnels', () => {
    const state = createGameState(
      makeTestLevel([
        '#############',
        '#P#M   F   E#',
        '# #m   F   ##',
        '#############'
      ])
    );

    // After MITE_EMPTY_COOLDOWN (2) ticks, the mite steps right while the grub still waits
    stepGame(state, null);
    expect(state.pests[0].x).toBe(3);
    expect(state.pests[1].x).toBe(3);

    stepGame(state, null);
    expect(state.pests[0].x).toBe(3); // Grub waits until tick 4
    expect(state.pests[1].x).toBe(4); // Mite moved on tick 2

    stepGame(state, null);
    stepGame(state, null);
    expect(state.pests[0].x).toBe(4); // Grub moves on tick 4
    expect(state.pests[1].x).toBe(5); // Mite moved a second time on tick 4
  });

  it('chews through wax slower than moving in open tunnels and emits pest_dig', () => {
    const state = createGameState(
      makeTestLevel([
        '#########',
        '#P#M..FE#',
        '#########'
      ])
    );

    let digEvents = 0;
    for (let i = 0; i < GRUB_EMPTY_COOLDOWN; i++) {
      const ev = stepGame(state, null);
      digEvents += ev.filter((e) => e.type === 'pest_dig').length;
    }

    expect(state.pests[0].x).toBe(4);
    expect(digEvents).toBe(1);
    expect(state.pests[0].moveCooldown).toBe(GRUB_WAX_COOLDOWN);

    // Must wait GRUB_WAX_COOLDOWN ticks before taking the next step
    for (let i = 0; i < GRUB_WAX_COOLDOWN - 1; i++) {
      stepGame(state, null);
      expect(state.pests[0].x).toBe(4);
    }
    stepGame(state, null);
    expect(state.pests[0].x).toBe(5);

    // Also verify mite uses MITE_WAX_COOLDOWN after chewing wax
    const miteState = createGameState(
      makeTestLevel([
        '#########',
        '#P#m..FE#',
        '#########'
      ])
    );
    for (let i = 0; i < MITE_EMPTY_COOLDOWN; i++) {
      stepGame(miteState, null);
    }
    expect(miteState.pests[0].x).toBe(4);
    expect(miteState.pests[0].moveCooldown).toBe(MITE_WAX_COOLDOWN);
  });

  it('regrows eaten flowers back with their original variant after FLOWER_REGROW_TICKS', () => {
    const level = makeTestLevel([
      '###########',
      '#P..#m F E#',
      '###########'
    ]);
    const state = createGameState(level);
    const originalVariant = state.grid[1][7].variant;

    // Tick 2 -> (6,1), Tick 4 -> eats F at (7,1)
    let ateFlower = false;
    for (let i = 0; i < 4; i++) {
      const ev = stepGame(state, null);
      if (ev.some((e) => e.type === 'pest_eat_flower')) {
        ateFlower = true;
      }
    }

    expect(ateFlower).toBe(true);
    expect(state.collectedFlowers).toBe(0);
    expect(state.grid[1][7].type).toBe('empty');
    expect(state.regrowingFlowers).toHaveLength(1);
    expect(state.regrowingFlowers[0].ticksRemaining).toBe(FLOWER_REGROW_TICKS);

    // Wait FLOWER_REGROW_TICKS - 1 ticks: still regrowing
    for (let i = 0; i < FLOWER_REGROW_TICKS - 1; i++) {
      stepGame(state, null);
    }
    // Keep track of whether tile is occupied; in a 2-tile pocket, if mite stands on (7,1) at expiry,
    // regrowth safely waits until mite steps back to (6,1) / (5,1)
    let regrown = state.grid[1][7].type === 'flower';
    for (let extra = 0; extra < 6 && !regrown; extra++) {
      const ev = stepGame(state, null);
      if (ev.some((e) => e.type === 'flower_regrow') || state.grid[1][7].type === 'flower') {
        regrown = true;
      }
    }

    expect(regrown).toBe(true);
    expect(state.grid[1][7].type).toBe('flower');
    expect(state.grid[1][7].variant).toBe(originalVariant);
    expect(state.regrowingFlowers).toHaveLength(0);
  });

  it('never opens trapped_bee cages prematurely or chews wax under honeypots', () => {
    const state = createGameState(
      makeTestLevel([
        '###########',
        '#P  # .O E#',
        '#   #.B.# #',
        '#M ...F...#',
        '###########'
      ])
    );

    for (let t = 0; t < 20; t++) {
      stepGame(state, null);
    }

    expect(state.rescuedBees).toBe(0);
    expect(state.grid[1][7].type).toBe('honeypot');
    expect(state.grid[2][7].type).toBe('wax'); // Directly beneath honeypot (7,1)
    expect(state.grid[2][6].type).toBe('trapped_bee');
  });

  it('shoos pests briefly when the bee flies past and sleeps pests bonked by falling honeypots', () => {
    // 1. Player shoos a pest cleanly without dying or getting stuck
    const shooState = createGameState(
      makeTestLevel([
        '#######',
        '#Pm.FE#',
        '#######'
      ])
    );
    const shooEvents = stepGame(shooState, 'right');
    expect(shooState.status).toBe('playing');
    expect(shooState.player.x).toBe(2);
    // Decrements once on the same tick in stepPests after not moving this tick
    expect(shooState.pests[0].sleepTicks).toBe(BEE_SHOO_TICKS - 1);
    expect(shooEvents.some((e) => e.type === 'pest_sleep')).toBe(true);

    // 2. Falling honeypot bonks pest underneath into sleep/nudge
    const bonkState = createGameState(
      makeTestLevel([
        '#######',
        '#P.O E#',
        '#..M .#',
        '#.#F#.#',
        '#######'
      ])
    );
    // Tick 1: O wobbles at (3,1) above M(3,2)
    // Tick 2: O finishes wobble, bonks M(3,2), falls to (3,2)
    stepGame(bonkState, null);
    const ev2 = stepGame(bonkState, null);

    expect(bonkState.grid[2][3].type).toBe('honeypot');
    expect(ev2.some((e) => e.type === 'pest_sleep')).toBe(true);
    expect(bonkState.pests.every((p) => p.x !== 3 || p.y !== 2)).toBe(true);
    if (bonkState.pests.length > 0) {
      expect(bonkState.pests[0].sleepTicks).toBe(PEST_SLEEP_TICKS - 1);
    }
  });

  it('restores pests and regrowingFlowers accurately via UndoStack', () => {
    const state = createGameState(
      makeTestLevel([
        '#########',
        '#P#m F E#',
        '#########'
      ])
    );
    const undo = new UndoStack();
    undo.push(state);

    for (let i = 0; i < 4; i++) {
      stepGame(state, null);
    }
    expect(state.pests[0].x).toBe(5);
    expect(state.regrowingFlowers).toHaveLength(1);

    const restored = undo.pop()!;
    expect(restored.pests[0].x).toBe(3);
    expect(restored.regrowingFlowers).toHaveLength(0);
    expect(restored.grid[1][5].type).toBe('flower');
  });
});
