import { createGameState, stepGame } from '../engine';
import { LevelDefinition, TileType } from '../types';
import { parseLevelAscii } from './parser';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  totalFlowers: number;
  totalBees: number;
  width: number;
  height: number;
}

const PASSABLE_TILES = new Set<TileType>([
  'empty',
  'wax',
  'flower',
  'honey_liquid',
  'exit'
]);

export function validateLevel(level: LevelDefinition): ValidationResult {
  const errors: string[] = [];

  let parsed;
  try {
    parsed = parseLevelAscii(level);
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
      totalFlowers: 0,
      totalBees: 0,
      width: 0,
      height: 0
    };
  }

  const {
    width,
    height,
    grid,
    playerStart,
    exitPos,
    totalFlowers,
    totalBees,
    totalBowls,
    pressurePlates,
    petalGates,
    portals,
    honeySourceCount,
    initialHoneyCount
  } = parsed;
  const requiredFlowers = level.requiredFlowers ?? totalFlowers;

  if (requiredFlowers <= 0 || totalFlowers < requiredFlowers) {
    errors.push(
      `Ungültige Blütenanzahl: total=${totalFlowers}, required=${requiredFlowers}.`
    );
  }

  // Verify closed outer wall border
  for (let x = 0; x < width; x++) {
    if (grid[0][x].type !== 'wall') {
      errors.push(`Oberer Rand an x=${x} ist keine feste Wand (#).`);
    }
    if (grid[height - 1][x].type !== 'wall') {
      errors.push(`Unterer Rand an x=${x} ist keine feste Wand (#).`);
    }
  }
  for (let y = 0; y < height; y++) {
    if (grid[y][0].type !== 'wall') {
      errors.push(`Linker Rand an y=${y} ist keine feste Wand (#).`);
    }
    if (grid[y][width - 1].type !== 'wall') {
      errors.push(`Rechter Rand an y=${y} ist keine feste Wand (#).`);
    }
  }

  // Verify idle safety for 15 ticks (and no trapped bee escapes prematurely at idle)
  const sim = createGameState(level);
  for (let t = 0; t < 15; t++) {
    stepGame(sim, null);
    if (sim.status !== 'playing') {
      errors.push(
        `Startpunkt ist nicht sicher: Status wurde nach ${t + 1} Warteticks "${sim.status}" (${sim.failReason ?? 'unbekannt'}).`
      );
      break;
    }
  }
  if (sim.rescuedBees > 0) {
    errors.push(
      `${sim.rescuedBees} gefangene Biene(n) entkommen bereits im Stillstand, da neben ihnen ein leeres Feld liegt.`
    );
  }

  // Reachability BFS with fixed-point honeypot puzzle resolution
  const visited = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  const queue: Array<{ x: number; y: number }> = [{ ...playerStart }];
  visited[playerStart.y][playerStart.x] = true;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];

  const pushQueue = () => {
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (visited[ny][nx]) continue;

        const tile = grid[ny][nx].type;
        if (PASSABLE_TILES.has(tile) || tile === 'trapped_bee') {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }

      const portal = portals.find((p) => p.x === cur.x && p.y === cur.y);
      if (portal) {
        const partner = portals.find(
          (p) => p.pair === portal.pair && (p.x !== portal.x || p.y !== portal.y)
        );
        if (partner && !visited[partner.y][partner.x]) {
          visited[partner.y][partner.x] = true;
          queue.push({ x: partner.x, y: partner.y });
        }
      }
    }
  };

  let progress = true;
  while (progress) {
    pushQueue();
    progress = false;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (visited[y][x]) continue;
        const cellType = grid[y][x].type;

        if (cellType === 'honey_bowl') {
          // Digging wax/empty space beneath a golden bowl lets it drop and vacates (x, y)
          if (y + 1 < height - 1 && visited[y + 1][x]) {
            const belowType = grid[y + 1][x].type;
            if (belowType === 'wax' || belowType === 'empty') {
              visited[y][x] = true;
              queue.push({ x, y });
              progress = true;
            }
          }
          continue;
        }

        if (cellType !== 'honeypot') continue;

        let unlocked = false;

        // 1. Horizontal push into an empty space or already-reachable cleared space
        for (const dx of [-1, 1]) {
          const fromX = x - dx;
          const destX = x + dx;
          if (destX <= 0 || destX >= width - 1) continue;
          const destType = grid[y][destX].type;
          const destClearable =
            destType === 'empty' || (destType === 'wax' && visited[y][destX]);
          if (visited[y][fromX] && destClearable) {
            unlocked = true;
            break;
          }
        }

        // 2. Dig wax beneath pot and step aside so it drops down
        if (!unlocked && y + 1 < height - 1 && visited[y + 1][x]) {
          const belowType = grid[y + 1][x].type;
          if (belowType === 'wax' || belowType === 'empty') {
            unlocked = true;
          }
        }

        // 3. Roll pot off rounded_wall or another honeypot once side & drop tiles are clear
        if (!unlocked && y + 1 < height - 1) {
          const supportType = grid[y + 1][x].type;
          if (supportType === 'rounded_wall' || supportType === 'honeypot') {
            for (const s of [-1, 1]) {
              if (
                x + s > 0 &&
                x + s < width - 1 &&
                visited[y][x + s] &&
                visited[y + 1][x + s]
              ) {
                unlocked = true;
                break;
              }
            }
          }
        }

        if (unlocked) {
          visited[y][x] = true;
          queue.push({ x, y });
          progress = true;
        }
      }
    }

    // Check whether all honey bowls can be filled via reachable/present honey flow
    if (totalBowls > 0 && (honeySourceCount > 0 || initialHoneyCount > 0)) {
      let fillableBowls = 0;
      for (let by = 1; by < height - 1; by++) {
        for (let bx = 1; bx < width - 1; bx++) {
          if (grid[by][bx].type !== 'honey_bowl') continue;

          // Bowl can rest at (bx, by) or drop down through visited empty/wax tiles onto a lower ledge
          const candidateRows = [by];
          let dropY = by;
          while (dropY + 1 < height - 1 && visited[dropY + 1][bx]) {
            const bt = grid[dropY + 1][bx].type;
            if (bt !== 'wax' && bt !== 'empty') break;
            dropY++;
            candidateRows.push(dropY);
          }

          const canFeed = candidateRows.some((ry) =>
            [
              { x: bx, y: ry - 1 },
              { x: bx - 1, y: ry },
              { x: bx + 1, y: ry }
            ].some(({ x, y }) => {
              const neighbor = grid[y]?.[x];
              if (!neighbor) return false;
              return (
                visited[y][x] ||
                neighbor.type === 'honey_liquid' ||
                neighbor.type === 'honey_source'
              );
            })
          );
          if (canFeed) fillableBowls++;
        }
      }

      if (fillableBowls === totalBowls) {
        for (let gy = 1; gy < height - 1; gy++) {
          for (let gx = 1; gx < width - 1; gx++) {
            if (!visited[gy][gx] && grid[gy][gx].type === 'honey_gate') {
              visited[gy][gx] = true;
              queue.push({ x: gx, y: gy });
              progress = true;
            }
          }
        }
      }
    }

    // Check whether all blossom pressure plates can be pressed by reachable honeypots
    if (petalGates.length > 0 && pressurePlates.length > 0) {
      const allPlatesReachable = pressurePlates.every((p) => visited[p.y][p.x]);
      if (allPlatesReachable) {
        let reachablePots = 0;
        for (let py = 1; py < height - 1; py++) {
          for (let px = 1; px < width - 1; px++) {
            if (visited[py][px] && grid[py][px].type === 'honeypot') {
              reachablePots++;
            }
          }
        }
        if (reachablePots >= pressurePlates.length) {
          for (const g of petalGates) {
            if (!visited[g.y][g.x]) {
              visited[g.y][g.x] = true;
              queue.push({ x: g.x, y: g.y });
              progress = true;
            }
          }
        }
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = grid[y][x].type;
      if ((t === 'flower' || t === 'trapped_bee') && !visited[y][x]) {
        errors.push(`Ziel (${t}) bei (${x}, ${y}) ist von Start nicht erreichbar.`);
      }
    }
  }

  if (!visited[exitPos.y][exitPos.x]) {
    errors.push(`Ausgang (E) bei (${exitPos.x}, ${exitPos.y}) ist von Start nicht erreichbar.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalFlowers,
    totalBees,
    width,
    height
  };
}
