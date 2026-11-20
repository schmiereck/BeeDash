import { describe, expect, it } from 'vitest';
import { createGameState, stepGame, tickStickyTimer } from '../src/game/engine';
import { STICKY_DURATION_MS } from '../src/game/honeyPhysics';
import { LevelDefinition } from '../src/game/types';

function makeLevel(ascii: string[]): LevelDefinition {
  return {
    id: 'honey-test',
    number: 1,
    title: 'Honey Test',
    chapter: 'Test',
    mapCoords: { q: 0, r: 0 },
    intro: 'Test',
    tip: 'Test',
    ascii
  };
}

describe('Liquid Honey Physics & Player Rules', () => {
  it('drips liquid honey slowly from honey_source into an empty corridor below', () => {
    const level = makeLevel([
      '######',
      '#P S #',
      '#    #',
      '#   E#',
      '######'
    ]);
    const state = createGameState(level);

    // Run 12 ticks (source emits at interval 4, drops at interval 2)
    for (let i = 0; i < 12; i++) {
      stepGame(state, null);
    }

    // Honey should have reached bottom row y=3 at x=3
    expect(state.grid[3][3].type).toBe('honey_liquid');
    expect(state.status).toBe('playing');
  });

  it('safely collects resting liquid honey from above or from the side', () => {
    const level = makeLevel([
      '#######',
      '#P    #',
      '#  ~~ #',
      '# ####E',
      '#######'
    ]);
    const state = createGameState(level);

    // Move to (3,1) above ~(3,2), then collect from above (down)
    stepGame(state, 'right'); // (2,1)
    stepGame(state, 'right'); // (3,1)
    const evTop = stepGame(state, 'down'); // (3,2) from above
    expect(state.status).toBe('playing');
    expect(state.collectedHoney).toBe(1);
    expect(state.grid[2][3].type).toBe('empty');
    expect(evTop.some((e) => e.type === 'honey_collect')).toBe(true);

    // Now collect ~(4,2) from the side (right)
    const evSide = stepGame(state, 'right');
    expect(state.status).toBe('playing');
    expect(state.collectedHoney).toBe(2);
    expect(state.grid[2][4].type).toBe('empty');
    expect(evSide.some((e) => e.type === 'honey_collect')).toBe(true);
  });

  it('applies 10s sticky wings and retreats safely instead of losing when flying upward into liquid honey', () => {
    const cleanLevel = makeLevel([
      '######',
      '# ~  #',
      '#P   #',
      '#   E#',
      '######'
    ]);
    const s2 = createGameState(cleanLevel);
    stepGame(s2, 'right'); // (2,2) directly under ~(2,1)
    const ev = stepGame(s2, 'up'); // flies UP into ~(2,1)
    expect(s2.status).toBe('playing');
    expect(s2.stickyRemainingMs).toBe(STICKY_DURATION_MS);
    expect(ev.some((e) => e.type === 'sticky_wings')).toBe(true);
    // Automatically stepped safely back to (1,2) away from the honey column
    expect(s2.player.x).toBe(1);
    expect(s2.player.y).toBe(2);
  });

  it('gives drip warning when digging wax beneath liquid honey; stepping aside avoids sticky_wings, staying triggers 10s sticky retreat', () => {
    const level = makeLevel([
      '######',
      '# ~  #',
      '#P.  #',
      '#   E#',
      '######'
    ]);

    // Case A: dig wax under honey, wait until drop interval warns, then step aside safely
    const safeState = createGameState(level);
    stepGame(safeState, 'right'); // dig (2,2), tick 1
    expect(safeState.status).toBe('playing');
    expect(safeState.stickyRemainingMs).toBe(0);
    stepGame(safeState, null); // tick 2: honey wobbles above player, still safe!
    expect(safeState.status).toBe('playing');
    expect(safeState.grid[1][2].fallState).toBe('wobbling');

    stepGame(safeState, 'right'); // step aside to (3,2)
    stepGame(safeState, null); // tick 4: honey drops safely onto (2,2)
    expect(safeState.status).toBe('playing');
    expect(safeState.stickyRemainingMs).toBe(0);
    expect(safeState.grid[2][2].type).toBe('honey_liquid');

    // Case B: stay underneath after wobble warning -> 10s sticky wings + safe 1-step retreat, still playing!
    const riskyState = createGameState(level);
    stepGame(riskyState, 'right'); // (2,2), tick 1
    stepGame(riskyState, null); // tick 2: wobbling warning
    expect(riskyState.status).toBe('playing');
    stepGame(riskyState, null); // tick 3
    const evHit = stepGame(riskyState, null); // tick 4: honey drips on bee
    expect(riskyState.status).toBe('playing');
    expect(riskyState.stickyRemainingMs).toBe(STICKY_DURATION_MS);
    expect(evHit.some((e) => e.type === 'sticky_wings')).toBe(true);
    expect(riskyState.player.x).toBe(1);
    expect(riskyState.player.y).toBe(2);
    expect(riskyState.grid[2][2].type).toBe('honey_liquid');
  });

  it('blocks digging wax during 10s sticky duration while keeping open movement working, then restores digging after 10s', () => {
    const level = makeLevel([
      '#######',
      '# ~   #',
      '#P  . #',
      '#    E#',
      '#######'
    ]);
    const state = createGameState(level);

    // Trigger sticky_wings at (2,2) -> retreats to (1,2)
    stepGame(state, 'right'); // (2,2)
    stepGame(state, 'up'); // hits ~(2,1), retreats to (1,2)
    expect(state.stickyRemainingMs).toBe(STICKY_DURATION_MS);

    // Flying along open corridor to (3,2) still works while sticky
    stepGame(state, 'right'); // (2,2)
    stepGame(state, 'right'); // (3,2)
    expect(state.player.x).toBe(3);

    // Trying to dig wax at (4,2) is blocked while sticky
    const evBlocked = stepGame(state, 'right');
    expect(state.player.x).toBe(3);
    expect(state.grid[2][4].type).toBe('wax');
    expect(evBlocked.some((e) => e.type === 'sticky_blocked')).toBe(true);

    // After 10 seconds elapse, bee is clean and can dig again
    expect(tickStickyTimer(state, 5000)).toBe(false);
    expect(state.stickyRemainingMs).toBe(5000);
    expect(tickStickyTimer(state, 5000)).toBe(true);
    expect(state.stickyRemainingMs).toBe(0);

    const evDig = stepGame(state, 'right');
    expect(state.player.x).toBe(4);
    expect(state.grid[2][4].type).toBe('empty');
    expect(evDig.some((e) => e.type === 'dig')).toBe(true);
  });

  it('fills honey_bowl from dripping or sideways honey and opens honey_gate', () => {
    // Drop-in test (bowl resting on stone shelf #)
    const dropLevel = makeLevel([
      '#######',
      '#P S  #',
      '#     #',
      '#  UG #',
      '#  # E#',
      '#######'
    ]);
    const sDrop = createGameState(dropLevel);
    let sawFill = false;
    let sawOpen = false;
    for (let i = 0; i < 16; i++) {
      const ev = stepGame(sDrop, null);
      if (ev.some((e) => e.type === 'bowl_fill')) sawFill = true;
      if (ev.some((e) => e.type === 'gate_open')) sawOpen = true;
    }
    expect(sawFill).toBe(true);
    expect(sawOpen).toBe(true);
    expect(sDrop.filledBowls).toBe(1);
    expect(sDrop.gatesOpen).toBe(true);
    expect(sDrop.grid[3][3].filled).toBe(true);
    expect(sDrop.grid[3][4].type).toBe('empty');

    // Sideways spread test
    const sideLevel = makeLevel([
      '########',
      '#P S  G#',
      '# ~~U  #',
      '# ####E#',
      '########'
    ]);
    const sSide = createGameState(sideLevel);
    for (let i = 0; i < 8; i++) {
      stepGame(sSide, null);
    }
    expect(sSide.filledBowls).toBe(1);
    expect(sSide.gatesOpen).toBe(true);
    expect(sSide.grid[1][6].type).toBe('empty');
  });

  it('drains a liquid honey pool sideways down an opened drop-off channel', () => {
    const level = makeLevel([
      '#######',
      '#P~~. #',
      '# ### #',
      '#    E#',
      '#######'
    ]);
    const state = createGameState(level);

    // Dig the side wax plug at (4,1) from above/side -> wait walk around right? Put P at (4,1) after dig:
    const drainLevel = makeLevel([
      '########',
      '# ~~.P #',
      '####   #',
      '#     E#',
      '########'
    ]);
    const s = createGameState(drainLevel);
    // Dig wax plug at (4,1) and step back right
    stepGame(s, 'left'); // (4,1) now empty
    stepGame(s, 'right'); // back to (5,1), out of the way

    for (let i = 0; i < 12; i++) {
      stepGame(s, null);
    }

    // Honey at (3,1) should have drained sideways into (4,1) and fallen down to (4,3)!
    expect(s.grid[3][4].type).toBe('honey_liquid');
    expect(s.status).toBe('playing');
  });

  it('tracks origin prevX/prevY when honey_source emits a new liquid honey droplet and resets next tick', () => {
    const level = makeLevel([
      '######',
      '#P S #',
      '#    #',
      '#   E#',
      '######'
    ]);
    const state = createGameState(level);

    // Source S is at (3, 1); HONEY_SPREAD_INTERVAL is 4 so emission occurs on tick 4
    for (let i = 0; i < 4; i++) {
      stepGame(state, null);
    }

    const drop = state.grid[2][3];
    expect(drop.type).toBe('honey_liquid');
    expect(drop.prevX).toBe(3);
    expect(drop.prevY).toBe(1);

    // Next tick snapshots prevX/prevY to the cell's current coordinates
    stepGame(state, null);
    expect(drop.prevX).toBe(3);
    expect(drop.prevY).toBe(2);
  });

  it('tracks origin prevX/prevY when liquid honey spreads sideways along a flat floor', () => {
    const level = makeLevel([
      '########',
      '#P S  E#',
      '#      #',
      '########'
    ]);
    const state = createGameState(level);

    let spawnedSideCell: { x: number; y: number; prevX: number; prevY: number } | null = null;
    for (let i = 0; i < 12; i++) {
      stepGame(state, null);
      for (let y = 1; y < state.height - 1; y++) {
        for (let x = 1; x < state.width - 1; x++) {
          const cell = state.grid[y][x];
          if (
            cell.type === 'honey_liquid' &&
            cell.prevY === cell.y &&
            Math.abs(cell.x - cell.prevX) === 1
          ) {
            spawnedSideCell = {
              x: cell.x,
              y: cell.y,
              prevX: cell.prevX,
              prevY: cell.prevY
            };
          }
        }
      }
      if (spawnedSideCell) break;
    }

    expect(spawnedSideCell).not.toBeNull();
    expect(spawnedSideCell!.prevY).toBe(2);
    expect(spawnedSideCell!.y).toBe(2);
    expect(spawnedSideCell!.prevX).toBe(3);
    expect(Math.abs(spawnedSideCell!.x - spawnedSideCell!.prevX)).toBe(1);
  });

  it('drops honey_bowl safely onto a lower ledge without hurting the bee underneath, then fills from above', () => {
    const level = makeLevel([
      '#######',
      '#  S  #',
      '#  U  #',
      '#P . G#',
      '#  # E#',
      '#######'
    ]);
    const state = createGameState(level);

    // Move under U(3,2) to dig (3,3) and wait 2 ticks -> U waits safely above bee!
    stepGame(state, 'right'); // (2,3)
    stepGame(state, 'right'); // (3,3) digs wax directly below U(3,2)
    stepGame(state, null);
    stepGame(state, null);
    expect(state.status).toBe('playing');
    expect(state.grid[2][3].type).toBe('honey_bowl');

    // Step aside to (2,3) -> U wobbles and falls safely onto ledge #(3,4) at (3,3)
    stepGame(state, 'left'); // (2,3)
    stepGame(state, null);
    stepGame(state, null);
    expect(state.grid[3][3].type).toBe('honey_bowl');
    expect(state.status).toBe('playing');

    // Source S(3,1) now drips down onto landed U(3,3) and opens gate G(5,3)
    for (let i = 0; i < 12 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);
    expect(state.grid[3][5].type).toBe('empty');
  });
});
