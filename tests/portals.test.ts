import { describe, expect, it } from 'vitest';
import { createGameState, stepGame } from '../src/game/engine';
import { parseLevelAscii } from '../src/game/levels/parser';
import { LevelDefinition } from '../src/game/types';
import { UndoStack } from '../src/game/undoStack';

describe('Magical Blossom Portals (1 & 2)', () => {
  it('teleports bee cleanly between paired portals without ping-ponging', () => {
    const level: LevelDefinition = {
      id: 'portal-basic',
      number: 90,
      title: 'Basic Portal',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '#########',
        '#P1.#.1.#',
        '#####.FE#',
        '#########'
      ]
    };

    const state = createGameState(level);
    expect(state.portals).toHaveLength(2);

    const evs = stepGame(state, 'right'); // steps onto 1(2,1) -> warps to 1(6,1)
    expect(state.player.x).toBe(6);
    expect(state.player.y).toBe(1);
    expect(state.player.prevX).toBe(6);
    expect(state.player.prevY).toBe(1);
    expect(evs.some((e) => e.type === 'portal_warp' && e.toX === 6 && e.toY === 1)).toBe(true);

    // Waiting on exit portal does not ping-pong back
    stepGame(state, null);
    expect(state.player.x).toBe(6);
    expect(state.player.y).toBe(1);

    // Stepping back onto portal warps back left; stepping right avoids re-trigger
    stepGame(state, 'right');
    expect(state.player.x).toBe(7);
    stepGame(state, 'left'); // back onto 1(6,1) -> warps to 1(2,1)
    expect(state.player.x).toBe(2);
    expect(state.player.y).toBe(1);
  });

  it('keeps portal pairs 1 and 2 independent by color', () => {
    const level: LevelDefinition = {
      id: 'portal-pairs',
      number: 91,
      title: 'Two Portal Pairs',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '###########',
        '#P1.#2..1.#',
        '#####.###.#',
        '#..2..F..E#',
        '###########'
      ]
    };

    const state = createGameState(level);
    stepGame(state, 'right'); // 1(2,1) -> 1(8,1)
    expect(state.player).toMatchObject({ x: 8, y: 1 });

    // Walk left along row 1 to 2(5,1) -> warps to 2(3,3)
    stepGame(state, 'left');
    stepGame(state, 'left');
    const evs = stepGame(state, 'left');
    expect(state.player).toMatchObject({ x: 3, y: 3 });
    expect(evs.some((e) => e.type === 'portal_warp' && e.pair === 1)).toBe(true);
  });

  it('skips teleportation safely if partner portal tile is blocked by a honeypot', () => {
    const oneRoom: LevelDefinition = {
      id: 'portal-blocked',
      number: 93,
      title: 'Blocked Partner',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: [
        '###########',
        '#P1..O  1.#',
        '#.......#.#',
        '#F.......E#',
        '###########'
      ]
    };
    const s2 = createGameState(oneRoom);
    // Walk underneath 1(2,1) via row 2 to reach left side of O(5,1) at (4,1), then push O onto 1(8,1)
    for (const dir of ['down', 'right', 'right', 'right', 'up'] as const) {
      stepGame(s2, dir);
    }
    stepGame(s2, 'right'); // O(5,1) -> (6,1)
    stepGame(s2, 'right'); // O(6,1) -> (7,1)
    stepGame(s2, 'right'); // O(7,1) -> 1(8,1)! Bee at (7,1)
    expect(s2.grid[1][8].type).toBe('honeypot');

    // Go back underneath via row 2 and step onto 1(2,1) while partner 1(8,1) is blocked
    for (const dir of [
      'down',
      'left',
      'left',
      'left',
      'left',
      'left'
    ] as const) {
      stepGame(s2, dir);
    }
    const blockedEvs = stepGame(s2, 'up'); // steps onto 1(2,1)
    expect(s2.player).toMatchObject({ x: 2, y: 1 });
    expect(blockedEvs.some((e) => e.type === 'portal_warp')).toBe(false);
  });

  it('rejects unpaired or over-paired portals in parseLevelAscii', () => {
    const singlePortal: LevelDefinition = {
      id: 'bad-single',
      number: 94,
      title: 'Bad',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: ['#####', '#P1.#', '#.FE#', '#####']
    };
    const triplePortal: LevelDefinition = {
      id: 'bad-triple',
      number: 95,
      title: 'Bad 3',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: ['#######', '#P1.1.#', '#.1.FE#', '#######']
    };

    expect(() => parseLevelAscii(singlePortal)).toThrow(/2x/);
    expect(() => parseLevelAscii(triplePortal)).toThrow(/2x/);
  });

  it('restores player cleanly to entrance side when undoing a portal warp', () => {
    const level: LevelDefinition = {
      id: 'portal-undo',
      number: 96,
      title: 'Undo Portal',
      chapter: 'Test',
      mapCoords: { q: 0, r: 0 },
      intro: '',
      tip: '',
      ascii: ['#######', '#P1#1.#', '#F.#.E#', '#######']
    };

    const state = createGameState(level);
    const undo = new UndoStack(10);
    undo.push(state);
    stepGame(state, 'right'); // warps 1(2,1) -> 1(4,1)
    expect(state.player).toMatchObject({ x: 4, y: 1 });

    const prev = undo.pop()!;
    expect(prev.player).toMatchObject({ x: 1, y: 1 });
  });
});
