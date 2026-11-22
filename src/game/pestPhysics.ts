import { makeCell } from './honeyPhysics';
import { Direction, GameEvent, GameState, PestEntity, PestKind } from './types';

export const GRUB_EMPTY_COOLDOWN = 4;
export const GRUB_WAX_COOLDOWN = 6;
export const MITE_EMPTY_COOLDOWN = 2;
export const MITE_WAX_COOLDOWN = 5;
export const FLOWER_REGROW_TICKS = 18;
export const PEST_SLEEP_TICKS = 12;
export const BEE_SHOO_TICKS = 5;

const DIRS: Array<{ dir: Direction; dx: number; dy: number }> = [
  { dir: 'right', dx: 1, dy: 0 },
  { dir: 'down', dx: 0, dy: 1 },
  { dir: 'left', dx: -1, dy: 0 },
  { dir: 'up', dx: 0, dy: -1 }
];

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  up: { dx: 0, dy: -1 }
};

export function hasPestAt(
  state: GameState,
  x: number,
  y: number,
  excludeId?: number
): boolean {
  return state.pests.some((p) => p.x === x && p.y === y && p.id !== excludeId);
}

function hasPortalAt(state: GameState, x: number, y: number): boolean {
  return state.portals.some((p) => p.x === x && p.y === y);
}

/** Prevents idle or wandering pests from collapsing puzzle structures or freeing trapped bees. */
function isSafeWaxForPest(state: GameState, x: number, y: number): boolean {
  for (const { dx, dy } of DIRS) {
    if (state.grid[y + dy]?.[x + dx]?.type === 'trapped_bee') {
      return false;
    }
  }
  const above = state.grid[y - 1]?.[x]?.type;
  if (
    above === 'honeypot' ||
    above === 'honey_bowl' ||
    above === 'honey_source' ||
    above === 'honey_liquid'
  ) {
    return false;
  }
  const left = state.grid[y]?.[x - 1]?.type;
  const right = state.grid[y]?.[x + 1]?.type;
  if (
    left === 'honey_liquid' ||
    left === 'honey_source' ||
    right === 'honey_liquid' ||
    right === 'honey_source'
  ) {
    return false;
  }
  return true;
}

function isPestPassable(
  state: GameState,
  pest: PestEntity,
  x: number,
  y: number,
  justBloomed?: Set<string>
): boolean {
  if (x <= 0 || x >= state.width - 1 || y <= 0 || y >= state.height - 1) {
    return false;
  }
  if (state.player.x === x && state.player.y === y) return false;
  if (hasPestAt(state, x, y, pest.id)) return false;
  if (hasPortalAt(state, x, y)) return false;
  if (justBloomed?.has(`${x},${y}`)) return false;

  const cellType = state.grid[y][x].type;
  if (cellType === 'empty' || cellType === 'flower') return true;
  if (cellType === 'wax') return isSafeWaxForPest(state, x, y);
  return false;
}

function orderedDirs(facing: Direction): Direction[] {
  const result: Direction[] = [facing];
  for (const entry of DIRS) {
    if (entry.dir !== facing) {
      result.push(entry.dir);
    }
  }
  return result;
}

function getCooldownForStep(kind: PestKind, targetType: 'empty' | 'flower' | 'wax'): number {
  if (targetType === 'wax') {
    return kind === 'grub' ? GRUB_WAX_COOLDOWN : MITE_WAX_COOLDOWN;
  }
  return kind === 'grub' ? GRUB_EMPTY_COOLDOWN : MITE_EMPTY_COOLDOWN;
}

/** Deterministic weighted BFS to pick the first step toward the nearest reachable flower. */
function findStepTowardFlower(
  state: GameState,
  pest: PestEntity,
  justBloomed?: Set<string>
): Direction | null {
  const w = state.width;
  const h = state.height;
  const size = w * h;
  const startIdx = pest.y * w + pest.x;
  const bestCost = new Int32Array(size).fill(1_000_000);
  const firstDir = new Array<Direction | null>(size).fill(null);
  const waxCost = pest.kind === 'grub' ? 3 : 5;

  bestCost[startIdx] = 0;
  const queue: number[] = [startIdx];
  const dirOrder = orderedDirs(pest.facing);

  let foundFlowerIdx = -1;
  let foundFlowerCost = 1_000_000;

  while (queue.length > 0) {
    let bestQ = 0;
    for (let i = 1; i < queue.length; i++) {
      if (bestCost[queue[i]] < bestCost[queue[bestQ]]) {
        bestQ = i;
      }
    }
    const curIdx = queue.splice(bestQ, 1)[0];
    const curCost = bestCost[curIdx];
    if (curCost >= foundFlowerCost) break;

    const cx = curIdx % w;
    const cy = Math.floor(curIdx / w);

    if (curIdx !== startIdx && state.grid[cy][cx].type === 'flower') {
      foundFlowerIdx = curIdx;
      foundFlowerCost = curCost;
      break;
    }

    for (const d of dirOrder) {
      const { dx, dy } = DIR_DELTA[d];
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isPestPassable(state, pest, nx, ny, justBloomed)) continue;

      const tile = state.grid[ny][nx].type;
      const stepCost = tile === 'wax' ? waxCost : 1;
      const nextCost = curCost + stepCost;
      const nextIdx = ny * w + nx;

      if (nextCost < bestCost[nextIdx]) {
        bestCost[nextIdx] = nextCost;
        firstDir[nextIdx] = curIdx === startIdx ? d : firstDir[curIdx];
        queue.push(nextIdx);
      }
    }
  }

  return foundFlowerIdx >= 0 ? firstDir[foundFlowerIdx] : null;
}

function findPatrolStep(state: GameState, pest: PestEntity): Direction | null {
  for (const d of orderedDirs(pest.facing)) {
    const { dx, dy } = DIR_DELTA[d];
    const nx = pest.x + dx;
    const ny = pest.y + dy;
    if (nx <= 0 || nx >= state.width - 1 || ny <= 0 || ny >= state.height - 1) continue;
    if (state.player.x === nx && state.player.y === ny) continue;
    if (hasPestAt(state, nx, ny, pest.id)) continue;
    if (hasPortalAt(state, nx, ny)) continue;
    if (state.grid[ny][nx].type === 'empty') {
      return d;
    }
  }
  return null;
}

export function bonkPestByPot(
  state: GameState,
  pest: PestEntity,
  events: GameEvent[]
): boolean {
  pest.sleepTicks = PEST_SLEEP_TICKS;
  events.push({ type: 'pest_sleep', x: pest.x, y: pest.y, kind: pest.kind });

  for (const { dir, dx, dy } of DIRS) {
    const nx = pest.x + dx;
    const ny = pest.y + dy;
    if (nx <= 0 || nx >= state.width - 1 || ny <= 0 || ny >= state.height - 1) continue;
    if (state.player.x === nx && state.player.y === ny) continue;
    if (hasPestAt(state, nx, ny, pest.id)) continue;
    if (hasPortalAt(state, nx, ny)) continue;
    if (state.grid[ny][nx].type === 'empty') {
      pest.prevX = pest.x;
      pest.prevY = pest.y;
      pest.x = nx;
      pest.y = ny;
      pest.facing = dir;
      return true;
    }
  }

  // Boxed in under a falling pot: gently shoo the pest off the board so nothing overlaps
  const idx = state.pests.findIndex((p) => p.id === pest.id);
  if (idx >= 0) {
    state.pests.splice(idx, 1);
  }
  return true;
}

export function stepRegrowingFlowers(state: GameState, events: GameEvent[]): Set<string> {
  const bloomed = new Set<string>();
  for (let i = state.regrowingFlowers.length - 1; i >= 0; i--) {
    const bud = state.regrowingFlowers[i];
    bud.ticksRemaining--;

    if (bud.ticksRemaining <= 0) {
      const tileFree =
        state.grid[bud.y]?.[bud.x]?.type === 'empty' &&
        !(state.player.x === bud.x && state.player.y === bud.y) &&
        !hasPestAt(state, bud.x, bud.y);

      if (tileFree) {
        state.grid[bud.y][bud.x] = makeCell(
          state.nextEntityId++,
          'flower',
          bud.x,
          bud.y,
          bud.variant
        );
        state.regrowingFlowers.splice(i, 1);
        bloomed.add(`${bud.x},${bud.y}`);
        events.push({ type: 'flower_regrow', x: bud.x, y: bud.y });
      } else {
        bud.ticksRemaining = 1;
      }
    }
  }
  return bloomed;
}

export function stepPests(
  state: GameState,
  events: GameEvent[],
  justBloomed?: Set<string>
): void {
  for (const pest of state.pests) {
    if (pest.sleepTicks > 0) {
      pest.sleepTicks--;
      continue;
    }

    if (pest.moveCooldown > 0) {
      pest.moveCooldown--;
    }
    if (pest.moveCooldown > 0) {
      continue;
    }

    const chosenDir =
      findStepTowardFlower(state, pest, justBloomed) ?? findPatrolStep(state, pest);

    if (!chosenDir) {
      pest.moveCooldown = 2;
      continue;
    }

    const { dx, dy } = DIR_DELTA[chosenDir];
    const nx = pest.x + dx;
    const ny = pest.y + dy;
    const target = state.grid[ny]?.[nx];
    if (!target) {
      pest.moveCooldown = 2;
      continue;
    }

    const targetType = target.type;
    if (targetType !== 'empty' && targetType !== 'wax' && targetType !== 'flower') {
      pest.moveCooldown = 2;
      continue;
    }

    pest.facing = chosenDir;
    pest.x = nx;
    pest.y = ny;

    if (targetType === 'wax') {
      state.grid[ny][nx] = makeCell(state.nextEntityId++, 'empty', nx, ny);
      events.push({ type: 'pest_dig', x: nx, y: ny, kind: pest.kind });
      pest.moveCooldown = getCooldownForStep(pest.kind, 'wax');
    } else if (targetType === 'flower') {
      const variant = target.variant;
      state.grid[ny][nx] = makeCell(state.nextEntityId++, 'empty', nx, ny);
      if (!state.regrowingFlowers.some((b) => b.x === nx && b.y === ny)) {
        state.regrowingFlowers.push({
          id: state.nextEntityId++,
          x: nx,
          y: ny,
          variant,
          ticksRemaining: FLOWER_REGROW_TICKS,
          totalTicks: FLOWER_REGROW_TICKS
        });
      }
      events.push({ type: 'pest_eat_flower', x: nx, y: ny, kind: pest.kind });
      pest.moveCooldown = getCooldownForStep(pest.kind, 'flower');
    } else {
      pest.moveCooldown = getCooldownForStep(pest.kind, 'empty');
    }
  }
}
