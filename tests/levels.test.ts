import { describe, expect, it } from 'vitest';
import { createGameState, stepGame } from '../src/game/engine';
import { CAMPAIGN_LEVELS, CAMPAIGN_WORLDS } from '../src/game/levels/campaign';
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
  it('contains 36 sequentially numbered levels with unique IDs and per-world coordinates', () => {
    expect(CAMPAIGN_LEVELS).toHaveLength(36);
    expect(CAMPAIGN_WORLDS).toHaveLength(3);
    const ids = new Set<string>();
    const coords = new Set<string>();

    CAMPAIGN_LEVELS.forEach((level, idx) => {
      expect(level.number).toBe(idx + 1);
      expect(ids.has(level.id)).toBe(false);
      ids.add(level.id);

      const worldNum = level.world ?? 1;
      const coordKey = `${worldNum}:${level.mapCoords.q},${level.mapCoords.r}`;
      expect(coords.has(coordKey)).toBe(false);
      coords.add(coordKey);
    });
  });

  it('validates structure, idle safety, and goal reachability for all 36 campaign levels', () => {
    const staticLevels = new Set([1, 2, 3, 4, 9, 11, 13, 15, 16, 19, 21, 22, 25, 26, 27, 30]);

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

  it('solves Wabe 13 (Welt 2 static reunion level) across both pot puzzles', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-13')!;
    expect(level).toBeDefined();
    expect(level.world).toBe(2);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 1],
        ['left', 1],
        ['down', 3], // (1,6) rescues B(1,7)
        ['up', 1],
        ['right', 1], // F(2,5)
        ['left', 1],
        ['up', 4], // (1,1)
        ['right', 3], // pushes O(4,1) into (5,1)
        [null, 2], // wait for O to drop to (5,2)
        ['right', 2], // (6,1)
        ['down', 1], // (6,2)
        ['right', 1], // (7,2)
        ['down', 1], // (7,3)
        ['right', 2], // F(9,3)
        ['left', 2], // (7,3)
        ['down', 1], // (7,4)
        ['right', 1], // (8,4)
        ['down', 1], // (8,5)
        ['left', 1], // dig (7,5) beside R(6,5)
        ['right', 1], // step aside to (8,5)
        [null, 2], // O(6,4) rolls off R(6,5) to (7,4)->(7,5)
        ['up', 1], // (8,4)
        ['left', 3], // cross vacated (6,4) to F(5,4)
        ['right', 3], // (8,4)
        ['down', 3], // (8,7)
        ['left', 1], // F(7,7)
        ['right', 4], // (11,7)
        ['up', 6] // rescues B(10,5) at (11,6) and enters E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(5);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 14 (Welt 2 scrolling dual honey source level)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-14')!;
    expect(level).toBeDefined();
    expect(level.world).toBe(2);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 4],
        ['right', 1], // F(2,6)
        ['left', 1],
        ['down', 1], // (1,7) rescues B(1,8)
        ['up', 4], // (1,3)
        ['right', 2], // (3,3)
        ['down', 1], // (3,4)
        ['right', 4], // pushes O(7,4) -> (8,4), stops at (7,4)
        ['down', 2], // (7,6) above U(7,7)
        ['up', 4], // (7,2) opening honey dam (7,2..7,6)
        ['down', 2], // exit shaft down to (7,4)
        ['left', 4], // safely back to (3,4)
        ['up', 1], // (3,3)
        ['left', 2], // (1,3)
        ['down', 6], // (1,9)
        ['right', 8] // F(9,9)
      ])
    );

    // Wait for honey to fill bowl U(7,7) and open honey gate G(14,5)
    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 1], // (10,9)
        ['up', 2], // (10,7)
        ['right', 1], // F(11,7)
        ['left', 1], // (10,7)
        ['up', 2], // (10,5)
        ['right', 5], // crosses open G(14,5) to (15,5)
        ['up', 2], // (15,3)
        ['right', 1], // F(16,3)
        ['left', 1], // (15,3)
        ['down', 3], // (15,6) rescues B(16,6)
        ['down', 3], // (15,9)
        ['right', 1], // F(16,9) -> exit opens!
        ['right', 1], // (17,9)
        ['up', 8] // enters E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 15 (static blossom pressure-plate discovery level)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-15')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 1], // (2,3)
        ['right', 3], // push O(3,3)->(4,3)->(5,3)->D(6,3), gate T(8,5) opens!
        ['left', 4], // (1,3)
        ['down', 3],
        ['right', 1], // F(2,6)
        ['up', 1],
        ['right', 7], // crosses open T(8,5) to (9,5)
        ['right', 1], // (10,5) frees B(10,6)
        ['up', 2], // F(10,3)
        ['right', 1], // (11,3)
        ['down', 4],
        ['left', 1], // F(10,7) -> exit opens!
        ['right', 1],
        ['up', 6] // enters E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 16 (static rounded-wall drop onto pressure plate)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-16')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 4],
        ['right', 1], // F(2,6)
        ['right', 2], // (4,6)
        ['up', 2], // (4,4)
        ['right', 2], // (6,4)
        ['down', 2], // (6,6)
        ['right', 1], // D(7,6)
        ['up', 5] // clears shaft up to (7,1) next to O(6,1) on R(6,2)
      ])
    );

    // Step down and away from col 7 so O(6,1) rolls cleanly onto D(7,6)
    runMoves(
      state,
      expand([
        ['down', 2], // (7,3)
        ['left', 1], // (6,3)
        [null, 8] // wait for O to roll & land on D(7,6), opening T(8,4)
      ])
    );

    expect(state.grid[6][7].type).toBe('honeypot');
    expect(state.pressedPlates).toBe(1);
    expect(state.petalGatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 1], // (6,4)
        ['right', 3], // crosses open T(8,4) to (9,4)
        ['up', 1],
        ['right', 1],
        ['up', 1], // F(10,2)
        ['right', 1], // (11,2)
        ['down', 5], // (11,7) frees B(10,7) -> exit opens!
        ['up', 6] // enters E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(3);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 17 (scrolling honey bowl + blossom pressure plate combo)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-17')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 3], // F(2,5)
        ['left', 1],
        ['down', 3], // (1,8) frees B(2,8)
        ['up', 4], // (1,4)
        ['right', 4], // (5,4)
        ['down', 2], // (5,6)
        ['right', 1], // (6,6) above U(6,7)
        ['up', 4], // opens channel (6,5..6,2) next to honey
        ['right', 1], // (7,2) safely to the right of shaft
        ['down', 2] // (7,4) waiting directly in front of G(8,4)
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 2], // crosses open G(8,4) to (9,4)
        ['down', 1], // (9,5)
        ['right', 2], // pushes O(10,5) -> D(12,5) via (11,5) -> T(13,3) opens!
        ['up', 3], // F(11,2)
        ['down', 1], // (11,3)
        ['right', 3], // crosses open T(13,3) to (14,3)
        ['down', 5], // (14,8)
        ['right', 1],
        ['up', 1], // (15,7) frees B(15,8)
        ['left', 1],
        ['down', 1], // (14,8)
        ['left', 4], // F(10,8)
        ['right', 4], // (14,8)
        ['down', 1],
        ['right', 1], // F(15,9)
        ['right', 2], // (17,9)
        ['up', 7], // (17,2)
        ['left', 1], // F(16,2) -> exit opens!
        ['right', 1],
        ['up', 1] // enters E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.gatesOpen).toBe(true);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 18 (scrolling dual simultaneous pressure plates finale)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-18')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['right', 3], // F(5,2)
        ['left', 3],
        ['down', 1], // (2,3)
        ['right', 3], // pushes O(3,3) -> D(6,3), plate 1 pressed!
        ['left', 4], // (1,3)
        ['down', 3],
        ['right', 1], // F(2,6)
        ['left', 1],
        ['down', 3], // (1,9), frees B(2,8) passing (1,8)
        ['right', 5], // (6,9)
        ['up', 1], // F(6,8)
        ['down', 1],
        ['right', 8], // (14,9)
        ['up', 1], // F(14,8)
        ['left', 1],
        ['up', 3], // (13,5)
        ['left', 3], // (10,5)
        ['down', 2], // clears (10,6) & D(10,7)
        ['up', 6], // climbs shaft up to (10,1) next to O(9,1)
        ['down', 2], // steps down to (10,3)
        ['right', 1], // steps aside to (11,3)
        [null, 10] // waits for O(9,1) to roll off R(9,2) and land on D(10,7) -> T(16,4) opens!
      ])
    );

    expect(state.pressedPlates).toBe(2);
    expect(state.petalGatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 1], // (11,4)
        ['right', 7], // crosses open T(16,4) to (18,4)
        ['down', 1], // (18,5) frees B(18,6)
        ['left', 1], // (17,5)
        ['down', 3], // (17,8) frees B(17,9)
        ['down', 1],
        ['right', 2], // F(19,9)
        ['up', 7], // (19,2)
        ['left', 1], // F(18,2) -> exit opens!
        ['right', 1],
        ['up', 1] // enters E(19,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(7);
    expect(state.rescuedBees).toBe(3);
  });

  it('solves Wabe 19 (static pressure plate + rounded wall carousel)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-19')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 4], // (1,6) frees B(1,7)
        ['right', 1], // F(2,6)
        ['left', 1],
        ['up', 1], // (1,5)
        ['right', 6], // pushes O(5,5) -> D(8,5), ends at (7,5), T(8,1) opens!
        ['left', 3], // (4,5)
        ['up', 1], // (4,4)
        ['right', 1], // (5,4)
        ['up', 1], // (5,3)
        ['right', 2], // (7,3)
        ['up', 1], // (7,2)
        ['left', 1], // (6,2)
        ['up', 1], // (6,1)
        ['right', 1], // (7,1)
        ['down', 1], // (7,2)
        [null, 3], // O(5,1) rolls off R(5,2) to (6,1)->(6,3)
        ['up', 1], // (7,1)
        ['left', 3], // F(4,1)
        ['right', 5], // crosses open T(8,1) to (9,1)
        ['down', 1], // (9,2)
        ['right', 1], // F(10,2)
        ['right', 1], // (11,2)
        ['down', 5], // passes (11,6) rescuing B(10,6), lands (11,7)
        ['left', 6], // F(5,7) -> exit opens!
        ['right', 6], // (11,7)
        ['up', 6] // enters E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(5);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 20 (scrolling pressure plate into honey-bowl gate sequence)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-20')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['right', 1],
        ['down', 1], // F(2,2)
        ['right', 3], // F(5,2)
        ['left', 3],
        ['down', 1], // (2,3)
        ['right', 2], // pushes O(3,3) -> D(5,3), T(7,5) opens!
        ['left', 3], // (1,3)
        ['down', 3], // (1,6)
        ['right', 1], // F(2,6)
        ['left', 1],
        ['down', 2], // (1,8) frees B(2,8)
        ['up', 3], // (1,5)
        ['right', 8], // crosses open T(7,5) to (9,5)
        ['down', 1], // (9,6)
        ['right', 1], // (10,6) above U(10,7)
        ['up', 4], // opens honey dam (10,2..6)
        ['right', 1], // (11,2)
        ['down', 3] // (11,5) waiting safely in front of G(12,5)
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 2], // crosses open G(12,5) to (13,5)
        ['up', 3], // (13,2)
        ['right', 1], // F(14,2)
        ['down', 4], // (14,6)
        ['right', 1], // (15,6) frees B(16,6)
        ['down', 3], // (15,9)
        ['right', 1], // F(16,9)
        ['left', 6], // F(10,9) -> exit opens!
        ['right', 7], // (17,9)
        ['up', 8] // enters E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 21 (static violet blossom portal discovery level)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-21')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 3], // F(2,5)
        ['up', 2], // (2,3)
        ['right', 2], // steps onto 1(4,3) -> warps to 1(8,3)
        ['up', 1],
        ['right', 1], // F(9,2)
        ['down', 2], // (9,4) frees B(9,5)
        ['down', 3], // F(9,7) -> exit opens!
        ['right', 2], // (11,7)
        ['up', 6] // enters E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 22 (static round-trip portal + pressure plate level)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-22')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['up', 1], // (2,1)
        ['right', 2], // enters 1(4,1) -> warps to 1(8,1)
        ['down', 1],
        ['right', 1], // F(9,2)
        ['left', 2], // (7,2)
        ['down', 1], // (7,3)
        ['right', 2], // pushes O(8,3) -> D(10,3), lands (9,3), T(4,4) opens!
        ['left', 2], // (7,3)
        ['down', 2], // (7,5)
        ['right', 2], // F(9,5)
        ['left', 1], // (8,5) frees B(8,6)
        ['left', 1], // (7,5)
        ['up', 4], // (7,1)
        ['right', 1], // steps onto 1(8,1) -> warps back to 1(4,1)
        ['down', 5], // crosses open T(4,4) to (4,6)
        ['left', 2], // F(2,6) -> exit opens!
        ['down', 1],
        ['left', 1] // enters E(1,7)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 23 (scrolling dual portal colors + honey bowl combo)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-23')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 3], // (1,5)
        ['right', 2], // F(3,5) and frees B(3,6)!
        ['left', 2], // (1,5)
        ['down', 4], // (1,9)
        ['right', 2], // F(3,9)
        ['left', 2], // (1,9)
        ['up', 6], // (1,3)
        ['right', 2], // enters 1(3,3) -> warps to 1(10,4)
        ['left', 1], // (9,4)
        ['down', 2], // (9,6) above U(9,7)
        ['up', 4], // (9,2) opens honey dam
        ['right', 2], // (11,2)
        ['down', 5], // (11,7) safely past portal 1(10,4)
        ['left', 1] // (10,7) right above G(10,8)
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 2], // crosses open G(10,8) to (10,9)
        ['left', 2], // F(8,9)
        ['right', 3], // enters 2(11,9) -> warps to 2(15,1)
        ['down', 1],
        ['left', 1], // F(14,2)
        ['left', 1], // (13,2)
        ['down', 4], // (13,6)
        ['right', 1], // F(14,6)
        ['down', 3], // (14,9)
        ['right', 1], // F(15,9)
        ['up', 2], // (15,7) frees B(16,7) -> exit opens!
        ['right', 2], // (17,7)
        ['up', 6] // enters E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.collectedFlowers).toBe(7);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 24 (Welt 2 grand finale using portals 1 & 2, pressure plate, and honey bowl)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-24')!;
    expect(level).toBeDefined();

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 4], // (1,6)
        ['right', 1], // F(2,6)
        ['down', 1], // (2,7) frees B(3,7)
        ['down', 2], // (2,9)
        ['right', 1], // F(3,9)
        ['left', 2], // (1,9)
        ['up', 6], // (1,3)
        ['right', 2], // enters 1(3,3) -> warps to 1(6,1)
        ['right', 2],
        ['down', 1], // F(8,2)
        ['left', 2], // (6,2)
        ['down', 1], // (6,3)
        ['right', 2], // pushes O(7,3) -> D(9,3), lands (8,3), T(5,5) opens!
        ['left', 2], // (6,3)
        ['up', 2], // steps onto 1(6,1) -> warps back to 1(3,3)
        ['down', 2], // (3,5)
        ['right', 5], // crosses open T(5,5) to (8,5), frees B(8,6)!
        ['down', 2], // F(8,7)
        ['up', 2], // (8,5)
        ['right', 6], // (14,5)
        ['down', 1], // (14,6) above U(14,7)
        ['up', 4], // (14,2) opens honey dam
        ['right', 1], // (15,2)
        ['down', 5] // (15,7) right above G(15,8)
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 2], // crosses open G(15,8) to (15,9)
        ['left', 1], // F(14,9)
        ['left', 2], // enters 2(12,9) -> warps to 2(17,1)
        ['right', 1],
        ['down', 2], // F(18,3)
        ['right', 1], // (19,3)
        ['down', 6], // F(19,9)
        ['left', 1], // (18,9) frees B(17,9)
        ['up', 2], // F(18,7) -> exit opens!
        ['right', 1], // (19,7)
        ['up', 6] // enters E(19,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.gatesOpen).toBe(true);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(9);
    expect(state.rescuedBees).toBe(3);
  });

  it('solves Wabe 25 (Bienenstock 3: push plate + roll pot off rounded wall)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-25')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 5], // col 1 down past wall #(2,4) to (1,6)
        ['right', 1], // F(2,6)
        ['left', 1], // (1,6)
        ['up', 4], // (1,2)
        ['right', 1], // F(2,2)
        ['up', 1], // (2,1)
        ['right', 5], // pushes O(4,1) -> D(7,1), player at (6,1), T(8,3) opens!
        ['left', 3], // (3,1)
        ['down', 3], // (3,4)
        ['up', 1], // (3,3)
        ['left', 1], // (2,3) -> O(4,3) rolls off R(4,4) to (3,3)->(3,4)
        [null, 3],
        ['right', 8], // cross (4,3) and open T(8,3) -> F(10,3)
        ['left', 2], // (8,3)
        ['down', 2], // (8,5)
        ['left', 2], // F(6,5) -> also frees B(8,6) when passing (7,5)/(8,5)
        ['down', 2], // (6,7)
        ['right', 4], // F(10,7) -> exit opens!
        ['left', 2], // (8,7)
        ['up', 4], // (8,3)
        ['right', 3], // (11,3)
        ['up', 2] // E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(5);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 26 (Bienenstock 3: portal + left-push pot onto pressure plate + dual petal gates)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-26')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['up', 1], // (2,1)
        ['right', 2], // enters 1(4,1) -> warps to 1(10,1)
        ['left', 2],
        ['down', 1], // F(8,2)
        ['right', 3], // go underneath 1(10,1) along row 2 -> (11,2)
        ['down', 1], // (11,3) behind O(10,3)
        ['left', 3], // pushes O(10,3) -> D(7,3), opens T(4,4) & T(6,6)
        ['right', 3], // (11,3)
        ['up', 2], // (11,1)
        ['left', 1], // enters 1(10,1) -> warps back to 1(4,1)
        ['down', 5], // passes open T(4,4) -> (4,6)
        ['left', 2], // F(2,6)
        ['right', 1],
        ['down', 1], // (3,7) frees B(3,7)? B is at (3,7), wait: (3,6) above B(3,7)!
        ['up', 1], // (3,6) -> already freed B(3,7) at (3,6)
        ['right', 6], // crosses open T(6,6) -> F(9,6) -> exit opens!
        ['right', 2], // (11,6)
        ['up', 1] // E(11,5)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 27 (Bienenstock 3: portal honey channel to golden bowl)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-27')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['up', 1],
        ['right', 2], // 1(4,1) -> 1(10,1)
        ['left', 1], // (9,1)
        ['down', 3], // (9,4) directly above U(9,5)
        ['up', 2], // (9,2) opens honey dam
        ['right', 1], // step aside to (10,2)
        ['up', 1] // enter 1(10,1) -> 1(4,1)
      ])
    );

    runMoves(
      state,
      expand([
        ['left', 2], // (2,1)
        ['down', 4], // (2,5) through wall gap (2,4)
        ['right', 1], // F(3,5) frees B(3,6)
        ['down', 1], // wait B(3,6) already freed -> walk to (2,7)
        ['left', 1], // (2,5)
        ['down', 2], // (2,7)
        ['right', 3] // (5,7) beside G(6,7)
      ])
    );

    for (let i = 0; i < 25 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 4], // crosses open G(6,7) -> F(9,7)
        ['right', 2] // E(11,7)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.gatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(3);
    expect(state.rescuedBees).toBe(1);
  });

  it('solves Wabe 28 (Bienenstock 3: held honey above closed petal gate drops into bowl once opened)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-28')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 5], // (1,7)
        ['right', 1], // F(2,7)
        ['right', 2], // (4,7)
        ['up', 1], // (4,6)
        ['right', 4], // (8,6)
        ['down', 1], // (8,7)
        ['up', 2], // (8,5) directly below T(8,4)
        ['down', 1], // (8,6)
        ['left', 6], // (2,6)
        ['right', 2], // (4,6) frees B(5,7) when stepping at (4,7)/(5,6)? Wait: step down (4,7) first?
        ['left', 1], // (3,6)
        ['down', 1], // (3,7)
        ['right', 1], // (4,7) frees B(5,7)
        ['left', 3], // (1,7)
        ['up', 3], // (1,4)
        ['right', 3] // pushes O(3,4) -> D(5,4), T(8,4) opens & drops honey into U(8,8)!
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.petalGatesOpen).toBe(true);
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['left', 3], // (1,4) -> only col 1 passes through row 5!
        ['down', 2], // (1,6)
        ['right', 12], // dry corridor across (8,6) & open G(11,6) -> (13,6)
        ['down', 1], // F(13,7)
        ['down', 1], // (13,8) frees B(14,8)
        ['up', 2], // (13,6)
        ['up', 4], // (13,2) = F(13,2)!
        ['right', 2], // (15,2)
        ['up', 1] // E(15,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 29 (Bienenstock 3: push plate + portal drop plate puzzle)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-29')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1], // (1,2)
        ['down', 6], // col 1 past #(2..8,7) to (1,8)
        ['down', 1], // (1,9)
        ['right', 1], // F(2,9)
        ['right', 2], // (4,9) frees B(5,9)
        ['left', 3], // (1,9)
        ['up', 3], // (1,6)
        ['right', 3], // pushes O(3,6) -> D(5,6)
        ['up', 3], // (4,3)
        ['left', 1], // enters 1(3,3) -> warps to 1(7,1)
        ['right', 2], // clear (8,1) & (9,1) beside O(10,1)!
        ['left', 1], // (8,1)
        ['down', 4], // (8,5) beside wall #(8,6)
        ['right', 1], // (9,5)
        ['down', 2], // clear (9,6) & (9,7) above D(9,8)
        ['up', 5], // clears col 9 upward to (9,2) while O(10,1) waits
        ['left', 1], // step aside to (8,2) so O(10,1) rolls left and drops to D(9,8) -> T(13,5) opens!
        [null, 10],
        ['down', 3], // (8,5)
        ['right', 7], // cross open T(13,5) -> (15,5)
        ['up', 3], // F(15,2)
        ['down', 3], // (15,5)
        ['left', 1], // (14,5) through wall gap in row 6 (# at 15,16!)
        ['down', 2], // (14,7)
        ['right', 1], // (15,7) -> frees B(16,7)
        ['left', 1], // (14,7)
        ['down', 2], // (14,9)
        ['right', 1], // F(15,9) -> exit opens!
        ['left', 1], // (14,9)
        ['up', 7], // (14,2)
        ['right', 3], // (17,2)
        ['up', 1] // E(17,1)
      ])
    );

    expect(state.petalGatesOpen).toBe(true);
    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 30 (Bienenstock 3: compact 4-chamber dual portal loop)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-30')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 3], // (2,5)
        ['left', 1], // (1,5)
        ['down', 1], // (1,6) frees B(2,6)
        ['up', 5], // (1,1)
        ['right', 2], // enters 1(3,1) -> warps to 1(5,1)
        ['down', 1],
        ['right', 1], // F(6,2)
        ['left', 1],
        ['down', 1], // (5,3)
        ['right', 2], // pushes O(6,3) -> D(8,3), opens T(9,5)
        ['left', 2], // (5,3)
        ['up', 2], // enters 1(5,1) -> warps back to 1(3,1)
        ['down', 4], // enters 2(3,5) -> warps to 2(10,1)
        ['down', 2], // F(10,3)
        ['down', 2], // (10,5)
        ['left', 4], // crosses open T(9,5) -> (6,5)
        ['down', 1], // F(6,6)
        ['up', 1], // (6,5)
        ['right', 4], // (10,5)
        ['down', 1], // (10,6) frees B(11,6) -> exit opens!
        ['right', 1], // (11,6) around portal 2(10,1)
        ['up', 5] // E(11,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 31 (Bienenstock 3: dual golden honey bowls)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-31')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 4], // F(2,6)
        ['down', 1], // (2,7) frees B(3,7)
        ['up', 2], // (2,5)
        ['right', 4], // (6,5)
        ['up', 1], // (6,4)
        ['right', 2], // pushes O(8,4) -> (9,4), lands at (7,4)
        ['right', 1], // (8,4)
        ['down', 1], // (8,5) above U1(8,6)
        ['up', 3], // (8,2) opens left honey dam -> fills U1(8,6)
        ['down', 2], // (8,4)
        ['left', 2], // (6,4)
        ['down', 4], // (6,8)
        ['right', 5], // (11,8)
        ['up', 2], // (11,6) directly below U2(11,5)
        ['down', 2], // (11,8)
        ['right', 1], // step aside to (12,8)
        [null, 3], // U2(11,5) falls down to (11,8) on #(11,9)!
        ['up', 4], // (12,4)
        ['left', 1], // (11,4)
        ['up', 2], // (11,2) opens right honey dam -> drips straight down col 11 into U2(11,8)!
        ['down', 2], // (11,4)
        ['right', 1], // (12,4)
        ['down', 3], // (12,7)
        ['right', 1] // (13,7) beside G(14,7)
      ])
    );

    for (let i = 0; i < 30 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(2);
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 3], // crosses open G(14,7) -> (16,7)
        ['up', 1], // (16,6) frees B(16,6)? B is at (16,6)! Wait: step down or stay at (15,6)
        ['down', 3], // (16,9)
        ['right', 1], // F(17,9)
        ['left', 1],
        ['up', 5], // (16,4)
        ['up', 1], // F(16,3) -> exit opens!
        ['right', 1], // (17,3)
        ['up', 2] // E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.filledBowls).toBe(2);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 32 (Bienenstock 3: dual portals, push plate, roll plate, and right petal gate)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-32')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 4], // (2,6)
        ['right', 2], // pushes O(3,6) -> D(5,6)
        ['left', 3], // (1,6)
        ['down', 3], // (1,9)
        ['right', 1], // F(2,9)
        ['right', 2], // (4,9) frees B(5,9)
        ['left', 3], // (1,9)
        ['up', 6], // (1,3)
        ['right', 2], // enters 1(3,3) -> warps to 1(6,1)
        ['right', 1], // (7,1)
        ['down', 1], // (7,2) (leaving (8,1) wax so O(9,1) stays put while we dig col 8!)
        ['right', 1], // (8,2)
        ['down', 5], // clears (8,3..7) down to (8,7) above D(8,8)
        ['up', 6], // climbs upward to (8,1) beside O(9,1)
        ['left', 1], // dodges left to (7,1) so O(9,1) rolls off R(9,2) and falls onto D(8,8) -> T(15,5) opens!
        [null, 10],
        ['down', 3], // (7,4)
        ['right', 1], // (8,4)
        ['down', 3], // drops cleanly through vacated chute to (8,7)
        ['right', 2], // enters 2(10,7) -> warps to 2(13,1)
        ['right', 1],
        ['down', 1], // F(14,2)
        ['right', 1],
        ['down', 5], // crosses open T(15,5) -> (15,7) -> frees B(15,7)!
        ['down', 2], // F(15,9) -> exit opens!
        ['up', 6], // (15,3)
        ['right', 2], // (17,3)
        ['up', 2] // E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(4);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 33 (Bienenstock 3: domino chain dropping bowl into honey pool + roll secret flower)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-33')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 1],
        ['right', 2], // pushes O(3,3) -> D(5,3), opens T(9,3) -> U(9,2) falls into honey pool (9,6) -> G(7,8) opens!
        ['up', 1], // (4,2)
        ['right', 4], // (8,2)
        ['up', 1],
        ['right', 1], // F(9,1)
        ['left', 1],
        ['down', 1], // (8,2)
        ['left', 7], // (1,2)
        ['down', 4], // (1,6) -> F(2,6)
        ['right', 2], // (3,6)
        ['right', 1], // (4,6) frees B(5,6)
        ['down', 2], // (4,8)
        ['right', 2] // (6,8) beside G(7,8)
      ])
    );

    for (let i = 0; i < 20 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.petalGatesOpen).toBe(true);
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['right', 3], // crosses open G(7,8) -> enters 1(9,8) -> warps to 1(12,1)
        ['right', 2],
        ['down', 1], // F(14,2)
        ['right', 1],
        ['down', 3], // clears (15,5)
        ['up', 1], // clears (15,4)
        ['right', 1], // step aside to (16,4)
        [null, 3], // O(14,4) rolls right off R(14,5) to (15,4)->(15,5)
        ['left', 3], // crosses (14,4) -> F(13,4)
        ['right', 3], // (16,4)
        ['down', 4], // (16,8)
        ['left', 2], // F(14,8) (also frees B(14,7))
        ['up', 1], // wait if needed: (14,8) is adjacent to B(14,7), frees B(14,7)!
        ['right', 2], // (16,8)
        ['up', 7], // (16,1)
        ['right', 1] // E(17,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 34 (Bienenstock 3: stacked dual-pot lift onto DD + honey gate)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-34')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['down', 4], // F(2,6)
        ['down', 1], // (2,7) frees B(3,7)
        ['right', 2], // (4,7)
        ['up', 3], // (4,4) -> row 5 has '#' at 5 (`#....#.....T....#...#`), row 4 is open!
        ['right', 4], // (8,4)
        ['down', 3], // (8,7)
        ['left', 1], // clear (7,7) above D(7,8)
        ['right', 1], // (8,7)
        ['up', 4], // clear (8,6),(8,5),(8,4),(8,3) up to (8,3) directly under O(8,2)
        ['left', 1], // step safely aside to (7,3)!
        ['left', 1] // (6,3)
      ])
    );

    // Wait for bottom pot O(8,2) -> D(8,8) and top pot O(8,1) -> roll off onto D(7,8)
    for (let i = 0; i < 25 && !state.petalGatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.pressedPlates).toBe(2);
    expect(state.petalGatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 2], // (6,5)
        ['right', 8], // crosses open T(11,5) -> (14,5)
        ['down', 1], // clear (14,6) directly above U(14,7)!
        ['up', 4], // (14,2) opens honey dam beside ~(13,2) -> drips down (14,3..6) into U(14,7)
        ['right', 1], // (15,2)
        ['down', 4] // wait safely at (15,6)
      ])
    );

    for (let i = 0; i < 25 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.filledBowls).toBe(1);
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['left', 2], // (13,6)
        ['down', 3], // (13,9) through cleared (13,8)
        ['right', 5], // collects F(14,9), crosses open G(16,9), collects F(18,9)
        ['left', 1], // (17,9)
        ['up', 3], // (17,6) frees B(18,6)
        ['up', 4], // (17,2)
        ['right', 1], // F(18,2) -> exit opens!
        ['right', 1], // (19,2)
        ['up', 1] // E(19,1)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.collectedFlowers).toBe(5);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 35 (Bienenstock 3: 4-quadrant portal loop & honeycomb vault)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-35')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 5], // F(2,2) & F(6,2)
        ['down', 1],
        ['right', 2], // enters 1(8,3) -> warps to 1(11,7)
        ['down', 1], // (11,8)
        ['right', 4], // pushes O(13,8) -> D(15,8), lands (14,8), T(15,3) opens!
        ['up', 1], // (14,7)
        ['right', 2], // (16,7) frees B(17,7)
        ['right', 3], // (19,7)
        ['down', 2], // (19,9) around wall #(16..18,8)
        ['left', 1], // F(18,9)
        ['left', 2] // enters 2(16,9) -> warps to 2(11,1)
      ])
    );

    expect(state.petalGatesOpen).toBe(true);
    expect(state.player.x).toBe(11);
    expect(state.player.y).toBe(1);

    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(12,2)
        ['down', 1],
        ['right', 5], // crosses open T(15,3) -> (17,3)
        ['up', 1], // (17,2) opens honey dam beside ~(18,2) -> drips down (17,3)->U(17,4)
        ['down', 1], // (17,3)
        ['left', 2] // (15,3)
      ])
    );

    for (let i = 0; i < 20 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['left', 4], // (11,3)
        ['up', 2], // enters 2(11,1) -> warps to 2(16,9)
        ['right', 3], // (19,9)
        ['up', 2], // (19,7)
        ['left', 8], // back across to 1(11,7) -> warps back to 1(8,3)
        ['left', 3], // (5,3)
        ['down', 4], // crosses open G(5,5) -> clears (5,7)
        ['down', 1], // clears (5,8)
        ['right', 1], // step aside to (6,8)
        [null, 3], // O(4,7) rolls right off R(4,8) to (5,7)->(5,8)
        ['up', 1], // (6,7)
        ['left', 3], // crosses (4,7) -> collects secret F(3,7)
        ['right', 4], // (7,7)
        ['down', 1], // F(7,8)
        ['left', 1], // (6,8)
        ['down', 1], // (6,9)
        ['left', 4], // (2,9) frees B(2,8) -> exit opens!
        ['left', 1] // E(1,9)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.collectedFlowers).toBe(6);
    expect(state.rescuedBees).toBe(2);
  });

  it('solves Wabe 36 (Bienenstock 3 grand finale combining all puzzle mechanics)', () => {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === 'wabe-36')!;
    expect(level.world).toBe(3);

    const state = createGameState(level);
    runMoves(
      state,
      expand([
        ['down', 1],
        ['right', 1], // F(2,2)
        ['left', 1],
        ['down', 2], // (1,4)
        ['right', 3], // pushes O(3,4) -> D(5,4), player at (4,4)
        ['left', 3], // (1,4)
        ['down', 4], // (1,8)
        ['right', 1], // F(2,8)
        ['up', 1], // (2,7) frees B(3,7)!
        ['down', 3], // (2,10)
        ['right', 1], // enters 1(3,10) -> warps to 1(7,1)
        ['down', 1], // (7,2)
        ['right', 1], // (8,2)
        ['down', 3], // (8,5) beside the drop shaft
        ['right', 1], // (9,5)
        ['up', 3], // clears (9,4),(9,3),(9,2) up to (9,2) while O(10,2) waits on (9,2)/(9,3)
        ['left', 1], // step safely aside to (8,2) so O(10,2) rolls off R(10,3) and drops onto D(9,6) -> T(13,4) opens!
        [null, 10],
        ['right', 3], // F(11,2)
        ['down', 2], // (11,4)
        ['right', 4], // crosses open T(13,4) -> (15,4)
        ['up', 2], // F(15,2)
        ['right', 2], // (17,2) opens honey dam beside ~(18,2) -> fills U(17,3), opens G(18,6)
        ['left', 1] // step left to (16,2)
      ])
    );

    expect(state.petalGatesOpen).toBe(true);
    for (let i = 0; i < 20 && !state.gatesOpen; i++) {
      stepGame(state, null);
    }
    expect(state.gatesOpen).toBe(true);

    runMoves(
      state,
      expand([
        ['down', 3], // (16,5)
        ['right', 2], // (18,5)
        ['down', 3], // crosses open G(18,6) -> (18,8)
        ['right', 2], // (20,8)
        ['down', 1], // F(20,9)
        ['down', 1], // (20,10) frees B(19,10)
        ['left', 5], // clears (19,10)..(15,10) so O can be pushed later
        ['right', 1], // (16,10)
        ['up', 2], // clears (16,9) & (16,8)
        ['right', 1], // step aside to (17,8)
        [null, 3], // O(15,8) rolls right off R(15,9) to (16,8)->(16,9)
        ['left', 3], // crosses (15,8) -> collects secret F(14,8)
        ['right', 3], // (17,8)
        ['down', 2], // (17,10)
        ['left', 1], // pushes O(16,10) -> (15,10), player at (16,10)
        ['down', 1], // (16,11)
        ['left', 2], // (14,11)
        ['up', 1], // enters 2(14,10) -> warps to 2(11,10)
        ['up', 1], // (11,9)
        ['left', 1], // (10,9) frees B(9,9)
        ['up', 1], // (10,8)
        ['left', 1], // F(9,8) -> exit opens!
        ['left', 2], // (7,8)
        ['down', 2] // E(7,10)
      ])
    );

    expect(state.status).toBe('won');
    expect(state.dizzyRemainingMs).toBe(0);
    expect(state.petalGatesOpen).toBe(true);
    expect(state.gatesOpen).toBe(true);
    expect(state.collectedFlowers).toBe(7);
    expect(state.rescuedBees).toBe(3);
  });
});
