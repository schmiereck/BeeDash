import {
  applyStickyHoneyHit,
  makeCell,
  stepPhysics,
  updatePressurePlates
} from './honeyPhysics';
import { parseLevelAscii } from './levels/parser';
import {
  BEE_SHOO_TICKS,
  GRUB_EMPTY_COOLDOWN,
  MITE_EMPTY_COOLDOWN,
  hasPestAt,
  stepPests,
  stepRegrowingFlowers
} from './pestPhysics';
import { Direction, GameEvent, GameState, LevelDefinition, PestEntity } from './types';

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

export function createGameState(level: LevelDefinition): GameState {
  const parsed = parseLevelAscii(level);
  const requiredFlowers = level.requiredFlowers ?? parsed.totalFlowers;
  let nextEntityId = parsed.nextEntityId;
  const pests: PestEntity[] = parsed.pests.map((p) => ({
    id: nextEntityId++,
    kind: p.kind,
    x: p.x,
    y: p.y,
    prevX: p.x,
    prevY: p.y,
    facing: 'right',
    moveCooldown: p.kind === 'grub' ? GRUB_EMPTY_COOLDOWN : MITE_EMPTY_COOLDOWN,
    sleepTicks: 0
  }));

  return {
    levelId: level.id,
    levelNumber: level.number,
    width: parsed.width,
    height: parsed.height,
    grid: parsed.grid,
    player: {
      x: parsed.playerStart.x,
      y: parsed.playerStart.y,
      prevX: parsed.playerStart.x,
      prevY: parsed.playerStart.y,
      lastMoveFromX: parsed.playerStart.x,
      lastMoveFromY: parsed.playerStart.y,
      facing: 'right',
      movedThisTick: false
    },
    exitPos: parsed.exitPos,
    tick: 0,
    status: 'playing',
    failReason: null,
    collectedFlowers: 0,
    requiredFlowers,
    totalFlowers: parsed.totalFlowers,
    rescuedBees: 0,
    totalBees: parsed.totalBees,
    collectedHoney: 0,
    stickyRemainingMs: 0,
    dizzyRemainingMs: 0,
    filledBowls: 0,
    totalBowls: parsed.totalBowls,
    gatesOpen: parsed.totalBowls === 0,
    pressurePlates: parsed.pressurePlates.map((p) => ({ ...p, pressed: false })),
    petalGates: parsed.petalGates.map((g) => ({ ...g })),
    pressedPlates: 0,
    totalPlates: parsed.pressurePlates.length,
    petalGatesOpen: parsed.pressurePlates.length === 0,
    portals: parsed.portals.map((p) => ({ ...p })),
    pests,
    regrowingFlowers: [],
    exitOpen: requiredFlowers === 0 && parsed.totalBees === 0,
    moves: 0,
    nextEntityId,
    honeySourceCount: parsed.honeySourceCount,
    initialHoneyCount: parsed.initialHoneyCount,
    sourceDripDelay: {},
    lastEvents: []
  };
}

export function tickStickyTimer(state: GameState, dtMs: number): boolean {
  if (state.status !== 'playing' || state.stickyRemainingMs <= 0) {
    return false;
  }
  state.stickyRemainingMs = Math.max(0, state.stickyRemainingMs - dtMs);
  return state.stickyRemainingMs === 0;
}

export function tickDizzyTimer(state: GameState, dtMs: number): boolean {
  if (state.status !== 'playing' || state.dizzyRemainingMs <= 0) {
    return false;
  }
  state.dizzyRemainingMs = Math.max(0, state.dizzyRemainingMs - dtMs);
  return state.dizzyRemainingMs === 0;
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
    player: { ...state.player },
    exitPos: { ...state.exitPos },
    pressurePlates: state.pressurePlates.map((p) => ({ ...p })),
    petalGates: state.petalGates.map((g) => ({ ...g })),
    portals: state.portals.map((p) => ({ ...p })),
    pests: state.pests.map((p) => ({ ...p })),
    regrowingFlowers: state.regrowingFlowers.map((f) => ({ ...f })),
    sourceDripDelay: { ...state.sourceDripDelay },
    lastEvents: state.lastEvents.map((e) => ({ ...e }))
  };
}

export function willDirectionChangeState(state: GameState, dir: Direction): boolean {
  if (state.status !== 'playing' || state.dizzyRemainingMs > 0) return false;
  const { dx, dy } = DIR_DELTA[dir];
  const tx = state.player.x + dx;
  const ty = state.player.y + dy;
  if (tx < 0 || tx >= state.width || ty < 0 || ty >= state.height) {
    return false;
  }

  const target = state.grid[ty][tx];
  switch (target.type) {
    case 'empty':
    case 'flower':
    case 'honey_liquid':
      return true;
    case 'wax':
      return state.stickyRemainingMs <= 0;
    case 'exit':
      return state.exitOpen;
    case 'honeypot': {
      if ((dir === 'left' || dir === 'right') && target.fallState === 'resting') {
        const bx = tx + dx;
        if (
          bx > 0 &&
          bx < state.width - 1 &&
          state.grid[ty][bx].type === 'empty' &&
          !hasPestAt(state, bx, ty)
        ) {
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

function rescueAdjacentFreeBees(state: GameState, events: GameEvent[]): void {
  const dirs = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 }
  ];
  const freed: Array<{ x: number; y: number }> = [];

  for (let y = 1; y < state.height - 1; y++) {
    for (let x = 1; x < state.width - 1; x++) {
      if (state.grid[y][x].type !== 'trapped_bee') continue;
      const hasOpenNeighbor = dirs.some(
        ({ dx, dy }) => state.grid[y + dy]?.[x + dx]?.type === 'empty'
      );
      if (hasOpenNeighbor) {
        freed.push({ x, y });
      }
    }
  }

  for (const pos of freed) {
    state.grid[pos.y][pos.x] = makeCell(state.nextEntityId++, 'empty', pos.x, pos.y);
    state.rescuedBees++;
    events.push({ type: 'rescue', x: pos.x, y: pos.y });
  }
}

function updateExitOpen(state: GameState, events: GameEvent[]): void {
  if (
    !state.exitOpen &&
    state.collectedFlowers >= state.requiredFlowers &&
    state.rescuedBees >= state.totalBees
  ) {
    state.exitOpen = true;
    events.push({ type: 'exit_open', x: state.exitPos.x, y: state.exitPos.y });
  }
}

function tryPortalWarp(state: GameState, events: GameEvent[]): void {
  if (!state.player.movedThisTick || state.status !== 'playing') return;
  const portal = state.portals.find(
    (p) => p.x === state.player.x && p.y === state.player.y
  );
  if (!portal) return;

  const partner = state.portals.find(
    (p) => p.pair === portal.pair && (p.x !== portal.x || p.y !== portal.y)
  );
  if (!partner) return;
  if (state.grid[partner.y]?.[partner.x]?.type !== 'empty') return;

  state.player.x = partner.x;
  state.player.y = partner.y;
  state.player.prevX = partner.x;
  state.player.prevY = partner.y;
  state.player.lastMoveFromX = partner.x;
  state.player.lastMoveFromY = partner.y;
  events.push({
    type: 'portal_warp',
    x: portal.x,
    y: portal.y,
    toX: partner.x,
    toY: partner.y,
    pair: portal.pair
  });
}

export function stepGame(state: GameState, dir: Direction | null): GameEvent[] {
  if (state.status !== 'playing') {
    state.lastEvents = [];
    return [];
  }

  // Snapshot previous positions for smooth 60 FPS interpolation
  state.player.prevX = state.player.x;
  state.player.prevY = state.player.y;
  state.player.movedThisTick = false;
  for (const pest of state.pests) {
    pest.prevX = pest.x;
    pest.prevY = pest.y;
  }
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.grid[y][x];
      cell.prevX = cell.x;
      cell.prevY = cell.y;
    }
  }

  state.tick++;
  const events: GameEvent[] = [];
  const pushedThisTick = new Set<number>();

  const moveDir = state.dizzyRemainingMs > 0 ? null : dir;
  if (moveDir !== null) {
    state.player.facing = moveDir;
    const { dx, dy } = DIR_DELTA[moveDir];
    const tx = state.player.x + dx;
    const ty = state.player.y + dy;

    if (tx >= 0 && tx < state.width && ty >= 0 && ty < state.height) {
      const target = state.grid[ty][tx];

      if (target.type === 'empty') {
        state.player.lastMoveFromX = state.player.prevX;
        state.player.lastMoveFromY = state.player.prevY;
        state.player.x = tx;
        state.player.y = ty;
        state.player.movedThisTick = true;
        state.moves++;
      } else if (target.type === 'wax') {
        if (state.stickyRemainingMs > 0) {
          events.push({ type: 'sticky_blocked', x: tx, y: ty });
        } else {
          state.player.lastMoveFromX = state.player.prevX;
          state.player.lastMoveFromY = state.player.prevY;
          state.grid[ty][tx] = makeCell(state.nextEntityId++, 'empty', tx, ty);
          state.player.x = tx;
          state.player.y = ty;
          state.player.movedThisTick = true;
          state.moves++;
          events.push({ type: 'dig', x: tx, y: ty });
        }
      } else if (target.type === 'flower') {
        state.player.lastMoveFromX = state.player.prevX;
        state.player.lastMoveFromY = state.player.prevY;
        state.grid[ty][tx] = makeCell(state.nextEntityId++, 'empty', tx, ty);
        state.player.x = tx;
        state.player.y = ty;
        state.player.movedThisTick = true;
        state.moves++;
        state.collectedFlowers++;
        events.push({ type: 'flower', x: tx, y: ty });
      } else if (target.type === 'exit') {
        if (state.exitOpen) {
          state.player.lastMoveFromX = state.player.prevX;
          state.player.lastMoveFromY = state.player.prevY;
          state.player.x = tx;
          state.player.y = ty;
          state.player.movedThisTick = true;
          state.moves++;
          state.status = 'won';
          events.push({ type: 'win', x: tx, y: ty });
          state.lastEvents = events;
          return events;
        } else {
          events.push({ type: 'exit_locked', x: tx, y: ty });
        }
      } else if (target.type === 'honeypot') {
        if ((moveDir === 'left' || moveDir === 'right') && target.fallState === 'resting') {
          const bx = tx + dx;
          if (
            bx > 0 &&
            bx < state.width - 1 &&
            state.grid[ty][bx].type === 'empty' &&
            !hasPestAt(state, bx, ty)
          ) {
            target.prevX = tx;
            target.prevY = ty;
            target.x = bx;
            target.y = ty;
            state.grid[ty][bx] = target;
            state.grid[ty][tx] = makeCell(state.nextEntityId++, 'empty', tx, ty);
            pushedThisTick.add(target.id);

            state.player.lastMoveFromX = state.player.prevX;
            state.player.lastMoveFromY = state.player.prevY;
            state.player.x = tx;
            state.player.y = ty;
            state.player.movedThisTick = true;
            state.moves++;
            events.push({ type: 'pot_push', x: bx, y: ty });
          }
        }
      } else if (target.type === 'honey_liquid') {
        if (moveDir === 'up') {
          applyStickyHoneyHit(state, events);
        } else {
          state.player.lastMoveFromX = state.player.prevX;
          state.player.lastMoveFromY = state.player.prevY;
          state.grid[ty][tx] = makeCell(state.nextEntityId++, 'empty', tx, ty);
          state.player.x = tx;
          state.player.y = ty;
          state.player.movedThisTick = true;
          state.moves++;
          state.collectedHoney++;
          events.push({ type: 'honey_collect', x: tx, y: ty });
        }
      }
    }
  }

  tryPortalWarp(state, events);
  if (state.player.movedThisTick && state.status === 'playing') {
    for (const pest of state.pests) {
      if (pest.x === state.player.x && pest.y === state.player.y && pest.sleepTicks === 0) {
        pest.sleepTicks = BEE_SHOO_TICKS;
        events.push({ type: 'pest_sleep', x: pest.x, y: pest.y, kind: pest.kind });
      }
    }
  }
  updatePressurePlates(state, events);
  rescueAdjacentFreeBees(state, events);
  updateExitOpen(state, events);

  if (state.status === 'playing') {
    stepPhysics(state, events, pushedThisTick);
    if (state.status === 'playing') {
      const bloomed = stepRegrowingFlowers(state, events);
      stepPests(state, events, bloomed);
      updatePressurePlates(state, events);
      rescueAdjacentFreeBees(state, events);
      updateExitOpen(state, events);
    }
  }

  state.lastEvents = events;
  return events;
}
