import { describe, expect, it } from 'vitest';
import { createGameState, stepGame } from '../src/game/engine';
import { CAMPAIGN_LEVELS } from '../src/game/levels/campaign';
import { parseLevelAscii } from '../src/game/levels/parser';
import { validateLevel } from '../src/game/levels/solver';
import { Direction } from '../src/game/types';

function runMoves(
  state: ReturnType<typeof createGameState>,
  steps: Array<Direction | null>
): void {
  for (const dir of steps) {
    stepGame(state, dir);
  }
}

function expand(moves: Array<[Direction | null, number]>): Array<Direction | null> {
  const result: Array<Direction | null> = [];
  for (const [dir, count] of moves) {
    for (let i = 0; i < count; i++) {
      result.push(dir);
    }
  }
  return result;
}

describe('Campaign Levels Validation', () => {
  it('contains 12 sequentially numbered levels with unique IDs and coordinates', () => {
    expect(CAMPAIGN_LEVELS).toHaveLength(12);
    const ids = new Set<string>();
    const coords = new Set<string>();

    CAMPAIGN_LEVELS.forEach((level, idx) => {
      expect(level.number).toBe(idx + 1);
      expect(ids.has(level.id)).toBe(false);
      ids.add(level.id);

      const coordKey = `${level.mapCoords.q},${level.mapCoords.r}`;
      expect(coords.has(coordKey)).toBe(false);
      coords.add(coordKey);
    });
  });

  it('validates structure, idle safety, and goal reachability for all 12 campaign levels', () => {
    const staticLevels = new Set([1, 2, 3, 4, 9, 11]);

    for (const level of CAMPAIGN_LEVELS) {
      const result = validateLevel(level);
      expect(result.errors, `Fehler in ${level.id}: ${result.errors.join('; ')}`).toEqual([]);
      expect(result.valid).toBe(true);

      if (staticLevels.has(level.number)) {
        expect(result.width).toBeLessThanOrEqual(13);
        expect(result.height).toBeLessThanOrEqual(9);
      } else {
        expect(result.width > 13 || result.height > 9).toBe(true);
      }
    }
  });

  it('solves Wabe 9 (static puzzle) strictly using both honeypot puzzles', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-9')!;
    expect(level).toBeDefined();

    // Verify E cannot be reached without moving/dropping the blocking honeypots
    const parsed = parseLevelAscii(level);
    const visited = Array.from({ length: parsed.height }, () =>
      Array<boolean>(parsed.width).fill(false)
    );
    const q = [{ ...parsed.playerStart }];
    visited[parsed.playerStart.y][parsed.playerStart.x] = true;
    while (q.length > 0) {
      const cur = q.shift()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const t = parsed.grid[ny]?.[nx]?.type;
        if (
          t &&
          !visited[ny][nx] &&
          t !== 'wall' &&
          t !== 'rounded_wall' &&
          t !== 'honeypot'
        ) {
          visited[ny][nx] = true;
          q.push({ x: nx, y: ny });
        }
      }
    }
    expect(visited[parsed.exitPos.y][parsed.exitPos.x]).toBe(false);

    // Full playthrough through both gates
    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1],
        ['down', 1],
        ['left', 1],
        ['down', 2],
        ['right', 1],
        ['left', 1],
        ['up', 2],
        ['right', 3], // push O(4,3) into pit (5,3)
        [null, 2], // wait for O to fall to (5,4)
        ['right', 2],
        ['up', 1],
        ['right', 1],
        ['down', 4],
        ['right', 1], // dig beneath O(8,5) at (8,6)
        ['left', 1], // step aside to (7,6)
        [null, 2], // O drops into (8,6)
        ['up', 1],
        ['right', 4], // frees B(10,6) at (10,5) and reaches (11,5)
        ['up', 3], // climb col 11 to (11,2)
        ['left', 1], // collect F(10,2) -> exit opens
        ['up', 1],
        ['right', 1] // enter suitcase E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 10 (scrolling multi-puzzle labyrinth) across all four chambers', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-10')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        // Chamber 1: flowers F(2,2) & F(4,2), push O(3,5) onto shelf (4,5)
        ['right', 1],
        ['down', 1],
        ['right', 2],
        ['left', 3],
        ['down', 3],
        ['right', 2], // push O(3,5) -> (4,5)
        ['down', 2], // enter Chamber 2 at (3,7)

        // Chamber 2: flower F(2,8), rescue B(2,10), roll O(8,9) off R(8,10)
        ['left', 1],
        ['down', 2], // frees B(2,10)
        ['up', 2],
        ['right', 4],
        ['down', 3],
        ['right', 1], // dig (7,10)
        ['left', 1],
        ['up', 1],
        ['right', 1], // dig (7,9)
        ['left', 1], // step aside to (6,9)
        [null, 2], // wait for O(8,9) to roll to (7,9)->(7,10)
        ['right', 3], // pass through (8,9) into Chamber 3 at (9,9)

        // Chamber 3: flowers F(11,10), F(12,7), F(8,3), rescue B(10,5), drop O(15,4)
        ['right', 2],
        ['down', 1], // F(11,10)
        ['up', 1],
        ['right', 1],
        ['up', 4], // collects F(12,7), ends at (12,5)
        ['left', 1], // frees B(10,5)
        ['up', 1],
        ['left', 3],
        ['up', 1], // F(8,3)
        ['down', 1],
        ['right', 6],
        ['down', 1],
        ['right', 1], // dig (15,5) under O(15,4)
        ['left', 1], // step aside to (14,5)
        [null, 2], // wait for O(15,4) to drop to (15,5)
        ['up', 1],
        ['right', 2], // pass through (15,4) into Chamber 4 at (16,4)

        // Chamber 4: F(18,1), rescue B(20,1), push O(18,6), F(20,8), F(17,10), E(21,10)
        ['up', 2],
        ['right', 2],
        ['up', 1], // F(18,1)
        ['right', 1], // frees B(20,1)
        ['left', 1],
        ['down', 1],
        ['left', 2],
        ['down', 2],
        ['right', 1],
        ['down', 2],
        ['right', 1], // push O(18,6) -> (19,6)
        [null, 2], // wait for O to drop into (19,7)
        ['down', 3], // go down shaft to (18,9)
        ['right', 2],
        ['up', 1], // F(20,8)
        ['down', 1],
        ['left', 2],
        ['down', 1],
        ['left', 1], // F(17,10) -> exit opens!
        ['right', 4] // enter suitcase E(21,10)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(9);
    expect(state.rescuedBees).toBe(3);
  });

  it('solves Wabe 11 (static golden honey bowl puzzle) by channeling honey to open the gate', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-11')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 3], // F(2,5)
        ['up', 1], // (2,4)
        ['right', 4], // (6,4)
        ['down', 2], // (6,6)
        ['right', 1], // dig (7,6) above bowl U(7,7)
        ['up', 4], // dig (7,5),(7,4),(7,3),(7,2) opening honey dam!
        ['down', 2], // return to (7,4)
        ['left', 2] // step out safely to (5,4)
      ])
    );

    // Wait for honey to flow down into bowl U(7,7) and open gate G(8,4)
    for (let i = 0; i < 20 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);

    // Move right up to (6,4), wait for cell (7,3) directly above the crossing to clear, then dash through gate
    stepGame(state, 'right'); // (6,4)
    for (let i = 0; i < 6 && state.grid[3][7].type !== 'empty'; i++) {
      stepGame(state, null);
    }

    runMoves(
      state,
      expand([
        ['right', 4], // (7,4)->(8,4) gate->(9,4)->(10,4), frees B(10,5)
        ['down', 3],
        ['right', 1], // F(11,7)
        ['up', 4], // (11,3)
        ['left', 1],
        ['up', 1], // F(10,2) -> exit opens!
        ['up', 1],
        ['right', 1] // enter E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 12 (scrolling falling-bowl ledge & honey channel puzzle) across all stages', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-12')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 1],
        ['right', 2], // (4,3)
        ['down', 5], // (4,8)
        ['left', 1], // (3,8) frees B(2,8)
        ['down', 1],
        ['right', 1], // F(4,9)
        ['right', 4], // (8,9)
        ['up', 1], // (8,8)
        ['right', 1], // dig (9,8)
        ['up', 1], // dig (9,7) directly below U(9,6)
        ['down', 1], // (9,8)
        ['left', 1], // step aside to (8,8)
        [null, 2] // wait for U(9,6) to fall onto stone ledge #(9,9) at (9,8)
      ])
    );

    expect(state.grid[8][9].type).toBe('honey_bowl');

    runMoves(
      state,
      expand([
        ['left', 1], // (7,8)
        ['up', 1], // (7,7)
        ['right', 2], // (9,7)
        ['up', 2], // climb through vacated (9,6) up to (9,5)
        ['left', 1], // dig (8,5) beneath blocking honeypot O(8,4)
        ['right', 1], // step aside to (9,5)
        [null, 2], // O(8,4) falls to (8,5) on #(8,6)
        ['up', 1], // (9,4)
        ['left', 2], // clear (8,4) & (7,4)
        ['up', 1], // dig (7,3)
        ['down', 1], // (7,4)
        ['left', 3], // clear (6,4),(5,4),(4,4)
        ['up', 2], // (4,2)
        ['right', 3], // open plug (7,2) under S(7,1)
        ['left', 2] // step out safely to (5,2)
      ])
    );

    // Wait for honey from S(7,1) -> (7,4) -> (8,4) -> (9,4) -> drip down into U(9,8) and open G(10,10)
    for (let i = 0; i < 40 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);
    expect(state.grid[10][10].type).toBe('empty');

    runMoves(
      state,
      expand([
        ['left', 1], // (4,2)
        ['down', 8], // dry corridor to (4,10)
        ['right', 8], // passes beneath ledge #(9,9) and through open G(10,10) to (12,10)
        ['up', 1], // F(12,9)
        ['up', 6], // (12,3)
        ['right', 1],
        ['up', 1], // F(13,2)
        ['down', 2], // (13,4)
        ['right', 1], // dig (14,4)
        ['left', 1],
        ['up', 1],
        ['right', 1], // dig (14,3)
        ['left', 1], // step aside to (13,3)
        [null, 2], // wait for O(15,3) to roll off R(15,4) into (14,3)->(14,4)
        ['right', 3], // cross through (15,3) to (16,3)
        ['up', 1],
        ['right', 1], // (17,2) frees B(18,2)
        ['down', 4], // col 17 down around wall #(16,4) to F(17,6)
        ['left', 1], // (16,6)
        ['down', 1], // (16,7)
        ['right', 1], // push O(17,7) into pit (18,7)
        [null, 2], // O drops to (18,8)
        ['down', 3], // down shaft to (17,10)
        ['left', 1], // F(16,10) -> exit opens!
        ['right', 3] // enter E(19,10)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });
});
