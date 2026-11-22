import { Cell, GameEvent, GameState } from './types';

export const POT_WOBBLE_TICKS = 1;
export const HONEY_DROP_INTERVAL = 2;
export const HONEY_SPREAD_INTERVAL = 4;
export const MAX_HONEY_SPREAD = 4;
export const STICKY_DURATION_MS = 10_000;
export const DIZZY_DURATION_MS = 15_000;

export function makeCell(
  id: number,
  type: Cell['type'],
  x: number,
  y: number,
  variant = 0
): Cell {
  return {
    id,
    type,
    x,
    y,
    prevX: x,
    prevY: y,
    fallState: 'resting',
    wobbleTicks: 0,
    honeySpreadDepth: 0,
    variant,
    filled: false
  };
}

function isSafeRetreat(state: GameState, x: number, y: number): boolean {
  if (x <= 0 || x >= state.width - 1 || y <= 0 || y >= state.height - 1) {
    return false;
  }
  if (state.player.x === x && state.player.y === y) {
    return false;
  }
  return state.grid[y][x].type === 'empty';
}

function hasHoneyAbove(state: GameState, x: number, y: number): boolean {
  if (y <= 0) return false;
  const above = state.grid[y - 1][x].type;
  return above === 'honey_liquid' || above === 'honey_source';
}

function hasFallingPotAbove(state: GameState, x: number, y: number): boolean {
  if (y <= 0) return false;
  const above = state.grid[y - 1][x];
  return (
    above.type === 'honeypot' &&
    (above.fallState === 'falling' || above.fallState === 'wobbling')
  );
}

export function applyBonkPotHit(
  state: GameState,
  events: GameEvent[],
  potCol: number
): boolean {
  state.dizzyRemainingMs = DIZZY_DURATION_MS;
  events.push({ type: 'bonk_pot', x: state.player.x, y: state.player.y });

  const candidates: Array<{ x: number; y: number }> = [];
  const lastDx = Math.abs(state.player.lastMoveFromX - state.player.x);
  const lastDy = Math.abs(state.player.lastMoveFromY - state.player.y);
  if (lastDx + lastDy === 1) {
    candidates.push({ x: state.player.lastMoveFromX, y: state.player.lastMoveFromY });
  }

  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1]
  ]) {
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    if (!candidates.some((c) => c.x === nx && c.y === ny)) {
      candidates.push({ x: nx, y: ny });
    }
  }

  let retreat: { x: number; y: number } | null = null;
  for (const c of candidates) {
    if (
      c.x !== potCol &&
      isSafeRetreat(state, c.x, c.y) &&
      !hasFallingPotAbove(state, c.x, c.y)
    ) {
      retreat = c;
      break;
    }
  }

  if (!retreat) {
    for (const c of candidates) {
      if (isSafeRetreat(state, c.x, c.y) && !hasFallingPotAbove(state, c.x, c.y)) {
        retreat = c;
        break;
      }
    }
  }

  if (!retreat) {
    for (const c of candidates) {
      if (isSafeRetreat(state, c.x, c.y)) {
        retreat = c;
        break;
      }
    }
  }

  if (retreat) {
    state.player.prevX = state.player.x;
    state.player.prevY = state.player.y;
    state.player.x = retreat.x;
    state.player.y = retreat.y;
    state.player.lastMoveFromX = retreat.x;
    state.player.lastMoveFromY = retreat.y;
    state.player.movedThisTick = true;
    return true;
  }

  return false;
}

export function applyStickyHoneyHit(state: GameState, events: GameEvent[]): boolean {
  state.stickyRemainingMs = STICKY_DURATION_MS;
  events.push({ type: 'sticky_wings', x: state.player.x, y: state.player.y });

  const candidates: Array<{ x: number; y: number }> = [];
  const lastDx = Math.abs(state.player.lastMoveFromX - state.player.x);
  const lastDy = Math.abs(state.player.lastMoveFromY - state.player.y);
  if (lastDx + lastDy === 1) {
    candidates.push({ x: state.player.lastMoveFromX, y: state.player.lastMoveFromY });
  }

  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1]
  ]) {
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    if (!candidates.some((c) => c.x === nx && c.y === ny)) {
      candidates.push({ x: nx, y: ny });
    }
  }

  let retreat: { x: number; y: number } | null = null;
  for (const c of candidates) {
    if (isSafeRetreat(state, c.x, c.y) && !hasHoneyAbove(state, c.x, c.y)) {
      retreat = c;
      break;
    }
  }

  if (!retreat) {
    for (const c of candidates) {
      if (isSafeRetreat(state, c.x, c.y)) {
        retreat = c;
        break;
      }
    }
  }

  if (retreat) {
    state.player.prevX = state.player.x;
    state.player.prevY = state.player.y;
    state.player.x = retreat.x;
    state.player.y = retreat.y;
    state.player.lastMoveFromX = retreat.x;
    state.player.lastMoveFromY = retreat.y;
    state.player.movedThisTick = true;
    return true;
  }

  return false;
}

export function openHoneyGatesIfReady(state: GameState, events: GameEvent[]): void {
  if (state.totalBowls > 0 && state.filledBowls >= state.totalBowls && !state.gatesOpen) {
    state.gatesOpen = true;
    for (let y = 1; y < state.height - 1; y++) {
      for (let x = 1; x < state.width - 1; x++) {
        if (state.grid[y][x].type === 'honey_gate') {
          state.grid[y][x] = makeCell(state.nextEntityId++, 'empty', x, y);
          events.push({ type: 'gate_open', x, y });
        }
      }
    }
  }
}

export function updatePressurePlates(state: GameState, events: GameEvent[]): void {
  if (state.totalPlates === 0) return;

  let pressedCount = 0;
  for (const plate of state.pressurePlates) {
    const cell = state.grid[plate.y]?.[plate.x];
    const nowPressed = Boolean(
      cell &&
        cell.type === 'honeypot' &&
        (cell.fallState === 'resting' || cell.fallState === 'wobbling')
    );
    if (nowPressed && !plate.pressed) {
      events.push({ type: 'plate_press', x: plate.x, y: plate.y });
    }
    plate.pressed = nowPressed;
    if (nowPressed) pressedCount++;
  }
  state.pressedPlates = pressedCount;

  if (pressedCount >= state.totalPlates && !state.petalGatesOpen) {
    state.petalGatesOpen = true;
    for (const pos of state.petalGates) {
      if (state.grid[pos.y]?.[pos.x]?.type === 'petal_gate') {
        state.grid[pos.y][pos.x] = makeCell(state.nextEntityId++, 'empty', pos.x, pos.y);
        events.push({ type: 'petal_gate_open', x: pos.x, y: pos.y });
      }
    }
  } else if (pressedCount < state.totalPlates && state.petalGatesOpen) {
    const allClear = state.petalGates.every(
      (pos) =>
        state.grid[pos.y]?.[pos.x]?.type === 'empty' &&
        !(state.player.x === pos.x && state.player.y === pos.y)
    );
    if (allClear) {
      state.petalGatesOpen = false;
      for (const pos of state.petalGates) {
        state.grid[pos.y][pos.x] = makeCell(state.nextEntityId++, 'petal_gate', pos.x, pos.y);
        events.push({ type: 'petal_gate_close', x: pos.x, y: pos.y });
      }
    }
  }
}

function moveCell(state: GameState, fromX: number, fromY: number, toX: number, toY: number): void {
  const cell = state.grid[fromY][fromX];
  cell.prevX = fromX;
  cell.prevY = fromY;
  cell.x = toX;
  cell.y = toY;
  state.grid[toY][toX] = cell;
  state.grid[fromY][fromX] = makeCell(state.nextEntityId++, 'empty', fromX, fromY);
}

function isFreeForRoll(state: GameState, x: number, y: number): boolean {
  if (x <= 0 || x >= state.width - 1 || y <= 0 || y >= state.height - 1) {
    return false;
  }
  if (state.player.x === x && state.player.y === y) {
    return false;
  }
  return state.grid[y][x].type === 'empty';
}

function countLiquidHoney(state: GameState): number {
  let count = 0;
  for (let y = 1; y < state.height - 1; y++) {
    for (let x = 1; x < state.width - 1; x++) {
      if (state.grid[y][x].type === 'honey_liquid') {
        count++;
      }
    }
  }
  return count;
}

function stepHoneyPots(
  state: GameState,
  events: GameEvent[],
  pushedThisTick: Set<number>
): void {
  const updatedIds = new Set<number>();

  for (let y = state.height - 2; y >= 1; y--) {
    for (let x = 1; x < state.width - 1; x++) {
      const cell = state.grid[y][x];
      if (cell.type !== 'honeypot') continue;
      if (updatedIds.has(cell.id) || pushedThisTick.has(cell.id)) continue;

      updatedIds.add(cell.id);
      const below = state.grid[y + 1][x];
      const isPlayerBelow = state.player.x === x && state.player.y === y + 1;

      if (below.type === 'empty' && !isPlayerBelow) {
        if (cell.fallState === 'resting') {
          cell.fallState = 'wobbling';
          cell.wobbleTicks = 1;
          events.push({ type: 'pot_wobble', x, y });
        } else if (cell.fallState === 'wobbling') {
          if (cell.wobbleTicks < POT_WOBBLE_TICKS) {
            cell.wobbleTicks++;
            events.push({ type: 'pot_wobble', x, y });
          } else {
            cell.fallState = 'falling';
            cell.wobbleTicks = 0;
            moveCell(state, x, y, x, y + 1);
          }
        } else {
          moveCell(state, x, y, x, y + 1);
        }
        continue;
      }

      if (isPlayerBelow) {
        if (cell.fallState === 'falling') {
          const vacated = applyBonkPotHit(state, events, x);
          if (vacated) {
            moveCell(state, x, y, x, y + 1);
            const underNew = state.grid[y + 2]?.[x];
            const playerBelowNew = state.player.x === x && state.player.y === y + 2;
            if (!underNew || underNew.type !== 'empty' || playerBelowNew) {
              cell.fallState = 'resting';
              cell.wobbleTicks = 0;
              events.push({ type: 'pot_land', x, y: y + 1 });
            }
          } else {
            cell.fallState = 'resting';
            cell.wobbleTicks = 0;
          }
          continue;
        }
        // Classic Boulder-Dash safety: standing below a resting pot supports it safely
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
        continue;
      }

      // Solid support below
      if (cell.fallState === 'falling') {
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
        events.push({ type: 'pot_land', x, y });
        continue;
      }

      const canRollOff =
        below.type === 'rounded_wall' ||
        (below.type === 'honeypot' && below.fallState === 'resting');

      if (canRollOff) {
        let rollDir = 0;
        if (isFreeForRoll(state, x - 1, y) && isFreeForRoll(state, x - 1, y + 1)) {
          rollDir = -1;
        } else if (isFreeForRoll(state, x + 1, y) && isFreeForRoll(state, x + 1, y + 1)) {
          rollDir = 1;
        }

        if (rollDir !== 0) {
          if (cell.fallState === 'resting') {
            cell.fallState = 'wobbling';
            cell.wobbleTicks = 1;
            events.push({ type: 'pot_wobble', x, y });
          } else if (cell.fallState === 'wobbling') {
            if (cell.wobbleTicks < POT_WOBBLE_TICKS) {
              cell.wobbleTicks++;
              events.push({ type: 'pot_wobble', x, y });
            } else {
              cell.fallState = 'falling';
              cell.wobbleTicks = 0;
              moveCell(state, x, y, x + rollDir, y);
            }
          }
          continue;
        }
      }

      if (cell.fallState === 'wobbling') {
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
      }
    }
  }
}

function stepHoneyBowls(state: GameState, events: GameEvent[]): void {
  const updatedIds = new Set<number>();

  for (let y = state.height - 2; y >= 1; y--) {
    for (let x = 1; x < state.width - 1; x++) {
      const cell = state.grid[y][x];
      if (cell.type !== 'honey_bowl') continue;
      if (updatedIds.has(cell.id)) continue;

      updatedIds.add(cell.id);
      const below = state.grid[y + 1][x];
      const isPlayerBelow = state.player.x === x && state.player.y === y + 1;

      if (below.type === 'empty' && !isPlayerBelow) {
        if (cell.fallState === 'resting') {
          cell.fallState = 'wobbling';
          cell.wobbleTicks = 1;
          events.push({ type: 'pot_wobble', x, y });
        } else if (cell.fallState === 'wobbling') {
          if (cell.wobbleTicks < POT_WOBBLE_TICKS) {
            cell.wobbleTicks++;
            events.push({ type: 'pot_wobble', x, y });
          } else {
            cell.fallState = 'falling';
            cell.wobbleTicks = 0;
            moveCell(state, x, y, x, y + 1);
          }
        } else {
          moveCell(state, x, y, x, y + 1);
        }
        continue;
      }

      if (isPlayerBelow) {
        // Golden honey bowls never hurt the bee — wait safely above until she moves
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
        continue;
      }

      if (cell.fallState === 'falling') {
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
        events.push({ type: 'pot_land', x, y });
      } else if (cell.fallState === 'wobbling') {
        cell.fallState = 'resting';
        cell.wobbleTicks = 0;
      }
    }
  }
}

function stepLiquidHoneyDrop(state: GameState, events: GameEvent[]): void {
  const updatedIds = new Set<number>();

  for (let y = state.height - 2; y >= 1; y--) {
    for (let x = 1; x < state.width - 1; x++) {
      const cell = state.grid[y][x];
      if (cell.type !== 'honey_liquid') continue;
      if (updatedIds.has(cell.id)) continue;

      updatedIds.add(cell.id);
      const below = state.grid[y + 1][x];
      const isPlayerBelow = state.player.x === x && state.player.y === y + 1;

      if (below.type === 'honey_bowl' && !below.filled) {
        if (cell.fallState === 'resting') {
          cell.fallState = 'wobbling';
          cell.wobbleTicks = 1;
          events.push({ type: 'honey_drip', x, y });
        } else {
          below.filled = true;
          state.filledBowls++;
          state.grid[y][x] = makeCell(state.nextEntityId++, 'empty', x, y);
          events.push({ type: 'bowl_fill', x, y: y + 1 });
          openHoneyGatesIfReady(state, events);
        }
        continue;
      }

      if (below.type === 'empty' && !isPlayerBelow) {
        if (cell.fallState === 'resting') {
          cell.fallState = 'wobbling';
          cell.wobbleTicks = 1;
          events.push({ type: 'honey_drip', x, y });
        } else {
          cell.fallState = 'falling';
          cell.wobbleTicks = 0;
          cell.honeySpreadDepth = 0;
          moveCell(state, x, y, x, y + 1);
        }
        continue;
      }

      if (isPlayerBelow) {
        if (cell.fallState === 'resting') {
          cell.fallState = 'wobbling';
          cell.wobbleTicks = 1;
          events.push({ type: 'honey_drip', x, y });
        } else {
          const vacated = applyStickyHoneyHit(state, events);
          if (vacated) {
            cell.fallState = 'falling';
            cell.wobbleTicks = 0;
            cell.honeySpreadDepth = 0;
            moveCell(state, x, y, x, y + 1);
          } else {
            state.grid[y][x] = makeCell(state.nextEntityId++, 'empty', x, y);
          }
        }
        continue;
      }

      cell.fallState = 'resting';
      cell.wobbleTicks = 0;
    }
  }
}

function stepLiquidHoneySpread(state: GameState, events: GameEvent[]): void {
  const updatedIds = new Set<number>();
  let honeyCount = countLiquidHoney(state);
  const maxHoneyTiles = state.honeySourceCount * 12 + state.initialHoneyCount;

  // 1. Spread or drain existing resting liquid honey
  for (let y = state.height - 2; y >= 1; y--) {
    for (let x = 1; x < state.width - 1; x++) {
      const cell = state.grid[y][x];
      if (cell.type !== 'honey_liquid') continue;
      if (updatedIds.has(cell.id) || cell.fallState !== 'resting') continue;

      const aboveType = state.grid[y - 1][x].type;
      const isFed = aboveType === 'honey_liquid' || aboveType === 'honey_source';
      const dirs = (x + y) % 2 === 0 ? [-1, 1] : [1, -1];

      // Fill any adjacent golden honey bowl first
      let filledBowl = false;
      for (const dx of dirs) {
        const nx = x + dx;
        if (nx <= 0 || nx >= state.width - 1) continue;
        const neighbor = state.grid[y][nx];
        if (neighbor.type === 'honey_bowl' && !neighbor.filled) {
          neighbor.filled = true;
          state.filledBowls++;
          events.push({ type: 'bowl_fill', x: nx, y });
          openHoneyGatesIfReady(state, events);
          filledBowl = true;
        }
      }
      if (filledBowl) continue;

      let handled = false;
      // Check drainage drop-off next so honey flows cleanly down channels
      for (const dx of dirs) {
        const nx = x + dx;
        if (nx <= 0 || nx >= state.width - 1) continue;
        const sideEmpty =
          state.grid[y][nx].type === 'empty' &&
          !(state.player.x === nx && state.player.y === y);
        const dropBelowType = state.grid[y + 1][nx].type;
        const dropBelowFree =
          (dropBelowType === 'empty' || dropBelowType === 'honey_bowl') &&
          !(state.player.x === nx && state.player.y === y + 1);

        if (sideEmpty && dropBelowFree) {
          if (!isFed) {
            updatedIds.add(cell.id);
            cell.fallState = 'wobbling';
            cell.wobbleTicks = 1;
            cell.honeySpreadDepth = 0;
            moveCell(state, x, y, nx, y);
            events.push({ type: 'honey_drip', x: nx, y });
            handled = true;
            break;
          } else if (honeyCount < maxHoneyTiles) {
            const spawned = makeCell(state.nextEntityId++, 'honey_liquid', nx, y);
            spawned.prevX = x;
            spawned.prevY = y;
            spawned.fallState = 'wobbling';
            spawned.wobbleTicks = 1;
            spawned.honeySpreadDepth = 0;
            state.grid[y][nx] = spawned;
            updatedIds.add(spawned.id);
            honeyCount++;
            events.push({ type: 'honey_drip', x: nx, y });
            handled = true;
            break;
          }
        }
      }

      if (handled) continue;

      // Pressurized horizontal spread along flat tunnels
      if (isFed && cell.honeySpreadDepth < MAX_HONEY_SPREAD && honeyCount < maxHoneyTiles) {
        for (const dx of dirs) {
          const nx = x + dx;
          if (nx <= 0 || nx >= state.width - 1) continue;
          const sideEmpty =
            state.grid[y][nx].type === 'empty' &&
            !(state.player.x === nx && state.player.y === y);
          if (sideEmpty) {
            const spawned = makeCell(state.nextEntityId++, 'honey_liquid', nx, y);
            spawned.prevX = x;
            spawned.prevY = y;
            spawned.fallState = 'resting';
            spawned.honeySpreadDepth = cell.honeySpreadDepth + 1;
            state.grid[y][nx] = spawned;
            updatedIds.add(spawned.id);
            honeyCount++;
            events.push({ type: 'honey_drip', x: nx, y });
            break;
          }
        }
      }
    }
  }

  // 2. Emit from honey sources
  for (let y = 1; y < state.height - 1; y++) {
    for (let x = 1; x < state.width - 1; x++) {
      if (state.grid[y][x].type !== 'honey_source') continue;
      const key = `${x},${y}`;
      const isPlayerBelow = state.player.x === x && state.player.y === y + 1;

      if (isPlayerBelow) {
        if ((state.sourceDripDelay[key] ?? 0) === 0) {
          state.sourceDripDelay[key] = 1;
          events.push({ type: 'honey_drip', x, y });
        } else {
          const vacated = applyStickyHoneyHit(state, events);
          delete state.sourceDripDelay[key];
          if (vacated && honeyCount < maxHoneyTiles) {
            const drop = makeCell(state.nextEntityId++, 'honey_liquid', x, y + 1);
            drop.prevX = x;
            drop.prevY = y;
            drop.fallState = 'wobbling';
            drop.wobbleTicks = 1;
            state.grid[y + 1][x] = drop;
            honeyCount++;
          }
        }
        continue;
      }

      delete state.sourceDripDelay[key];
      if (
        y + 1 < state.height - 1 &&
        state.grid[y + 1][x].type === 'honey_bowl' &&
        !state.grid[y + 1][x].filled
      ) {
        state.grid[y + 1][x].filled = true;
        state.filledBowls++;
        events.push({ type: 'bowl_fill', x, y: y + 1 });
        openHoneyGatesIfReady(state, events);
        continue;
      }

      if (
        y + 1 < state.height - 1 &&
        state.grid[y + 1][x].type === 'empty' &&
        honeyCount < maxHoneyTiles
      ) {
        const drop = makeCell(state.nextEntityId++, 'honey_liquid', x, y + 1);
        drop.prevX = x;
        drop.prevY = y;
        drop.fallState = 'wobbling';
        drop.wobbleTicks = 1;
        state.grid[y + 1][x] = drop;
        honeyCount++;
        events.push({ type: 'honey_drip', x, y: y + 1 });
      }
    }
  }
}

export function stepPhysics(
  state: GameState,
  events: GameEvent[],
  pushedThisTick: Set<number> = new Set()
): void {
  stepHoneyPots(state, events, pushedThisTick);
  if (state.status !== 'playing') return;

  stepHoneyBowls(state, events);

  if (state.tick % HONEY_DROP_INTERVAL === 0) {
    stepLiquidHoneyDrop(state, events);
    if (state.status !== 'playing') return;
  }

  if (state.tick % HONEY_SPREAD_INTERVAL === 0) {
    stepLiquidHoneySpread(state, events);
  }
}
