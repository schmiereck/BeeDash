import { describe, expect, it } from 'vitest';
import { createGameState, stepGame } from '../src/game/engine';
import { LevelDefinition } from '../src/game/types';
import { UndoStack } from '../src/game/undoStack';

function runMoves(
  state: ReturnType<typeof createGameState>,
  dirs: Array<'up' | 'down' | 'left' | 'right' | null>
) {
  const allEvents = [];
  for (const dir of dirs) {
    allEvents.push(...stepGame(state, dir));
  }
  return allEvents;
}

describe('Blossom Pressure Plates (D) & Petal Gates (T)', () => {
  it('opens petal gates when a honeypot is pushed onto the pressure plate', () => {
    const level: LevelDefinition = {
      id: 'plate-push',
      number: 99,
      title: 'Push Plate',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '#########',
        '#P.O D..#',
        '#####T###',
        '#.....FE#',
        '#########'
      ]
    };

    const state = createGameState(level);
    expect(state.totalPlates).toBe(1);
    expect(state.pressedPlates).toBe(0);
    expect(state.petalGatesOpen).toBe(false);
    expect(state.grid[2][5].type).toBe('petal_gate');

    const events = runMoves(state, ['right', 'right', 'right']);
    expect(state.pressedPlates).toBe(1);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.grid[1][5].type).toBe('honeypot');
    expect(state.grid[2][5].type).toBe('empty');
    expect(events.some((e) => e.type === 'plate_press')).toBe(true);
    expect(events.some((e) => e.type === 'petal_gate_open')).toBe(true);
  });

  it('closes petal gates when honeypot leaves plate, and waits safely if bee stands in gate', () => {
    const level: LevelDefinition = {
      id: 'plate-close',
      number: 100,
      title: 'Close Plate',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '#########',
        '#..OD.TF#',
        '#..##.#E#',
        '#P......#',
        '#########'
      ]
    };

    const state = createGameState(level);
    // Push O(3,1) onto D(4,1)
    runMoves(state, ['up', 'up', 'right', 'right']);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.grid[1][6].type).toBe('empty');

    // Approach D(4,1) from the right via the lower corridor and push O left off D back to (3,1)
    runMoves(state, ['left', 'down', 'down', 'right', 'right', 'right', 'up', 'up']);
    stepGame(state, 'left'); // push O from D(4,1) -> (3,1)
    expect(state.pressedPlates).toBe(0);
    expect(state.petalGatesOpen).toBe(false);
    expect(state.grid[1][6].type).toBe('petal_gate');

    // Re-open by pushing O(3,1) back onto D(4,1) from the left via the lower corridor
    runMoves(state, [
      'right',
      'down',
      'down',
      'left',
      'left',
      'left',
      'up',
      'up',
      'right'
    ]);
    expect(state.petalGatesOpen).toBe(true);
  });

  it('keeps petal gate open while bee stands in the gate tile even after pressure drops', () => {
    const safeLevel: LevelDefinition = {
      id: 'plate-safe-delay-real',
      number: 105,
      title: 'Safe Delay Real',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '#########',
        '#..ODT.E#',
        '#P.....F#',
        '#########'
      ]
    };
    const state = createGameState(safeLevel);
    // Push O(3,1) -> D(4,1) (above wax .(4,2), so it is resting and opens T(5,1)!)
    runMoves(state, ['up', 'right', 'right']);
    expect(state.petalGatesOpen).toBe(true);
    // Move down around (3,2) -> dig (4,2) under D(4,1) -> right (5,2) -> up into open gate T(5,1) -> pot drops!
    runMoves(state, ['down', 'right', 'right', 'up']);
    // Bee is standing AT T(5,1) while pot drops off D(4,1)!
    stepGame(state, null);
    expect(state.pressedPlates).toBe(0);
    expect(state.player).toMatchObject({ x: 5, y: 1 });
    expect(state.petalGatesOpen).toBe(true); // stays open safely!
    expect(state.grid[1][5].type).toBe('empty');

    // Step right to (6,1) -> gate now closes behind bee cleanly!
    stepGame(state, 'right');
    expect(state.petalGatesOpen).toBe(false);
    expect(state.grid[1][5].type).toBe('petal_gate');
  });

  it('triggers when a falling honeypot lands on a pressure plate', () => {
    const level: LevelDefinition = {
      id: 'plate-drop',
      number: 101,
      title: 'Drop Plate',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '#######',
        '#..O..#',
        '#..P..#',
        '#..D.T#',
        '#####F#',
        '#....E#',
        '#######'
      ]
    };

    const state = createGameState(level);
    // Step right away from under O(3,1) so it falls onto D(3,3)
    runMoves(state, ['right', null, null, null, null]);
    expect(state.grid[3][3].type).toBe('honeypot');
    expect(state.grid[3][3].fallState).toBe('resting');
    expect(state.pressedPlates).toBe(1);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.grid[3][5].type).toBe('empty');
  });

  it('requires all pressure plates pressed simultaneously before opening and restores on undo', () => {
    const level: LevelDefinition = {
      id: 'plate-multi',
      number: 102,
      title: 'Multi Plate',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '###########',
        '#P.O D..T.#',
        '#.######.##',
        '#..O D..FE#',
        '###########'
      ]
    };

    const state = createGameState(level);
    const undo = new UndoStack(20);

    // Push first pot onto first plate D(5,1)
    for (const dir of ['right', 'right', 'right'] as const) {
      undo.push(state);
      stepGame(state, dir);
    }
    expect(state.pressedPlates).toBe(1);
    expect(state.petalGatesOpen).toBe(false);
    expect(state.grid[1][8].type).toBe('petal_gate');

    // Go down to second pot O(3,3) and push onto second plate D(5,3)
    for (const dir of [
      'left',
      'left',
      'left',
      'down',
      'down',
      'right',
      'right',
      'right'
    ] as const) {
      undo.push(state);
      stepGame(state, dir);
    }
    expect(state.pressedPlates).toBe(2);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.grid[1][8].type).toBe('empty');

    // Undo last push -> gate closes cleanly again
    const prev = undo.pop()!;
    expect(prev.pressedPlates).toBe(1);
    expect(prev.petalGatesOpen).toBe(false);
    expect(prev.grid[1][8].type).toBe('petal_gate');
  });
});
