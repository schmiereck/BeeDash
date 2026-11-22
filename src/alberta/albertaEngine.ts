import { Direction, GridPos } from '../game/types';
import {
  CLOCK_COLORS,
  CYCLE_LENGTH,
  GATE_COLORS,
  andWaveforms,
  makeClockWaveform,
  notWaveform,
  orWaveforms,
  waveformsEqual
} from './albertaLevels';
import {
  ActiveWire,
  AlbertaBlockDef,
  AlbertaEvent,
  AlbertaGameState,
  AlbertaLevelDef,
  NearbySocketAction,
  SocketDef,
  WireConnection
} from './albertaTypes';

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

const OPPOSITE_DIR: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

function allFalseWave(): boolean[] {
  return new Array<boolean>(CYCLE_LENGTH).fill(false);
}

export function getBlockOccupiedTiles(block: AlbertaBlockDef): GridPos[] {
  if (block.kind === 'source') {
    return [{ x: block.x, y: block.y }];
  }
  if (block.kind === 'target') {
    return [
      { x: block.x, y: block.y },
      { x: block.x + 1, y: block.y }
    ];
  }
  if (block.gate === 'AND' || block.gate === 'OR') {
    return [
      { x: block.x, y: block.y },
      { x: block.x, y: block.y + 1 }
    ];
  }
  return [{ x: block.x, y: block.y }];
}

export function getBlockSockets(block: AlbertaBlockDef): SocketDef[] {
  if (block.kind === 'source') {
    const sides: Direction[] = ['up', 'right', 'down', 'left'];
    return sides.map((side) => ({
      id: `${block.id}:${side}`,
      blockId: block.id,
      role: 'output' as const,
      tileX: block.x,
      tileY: block.y,
      side,
      accessX: block.x + DIR_DELTA[side].dx,
      accessY: block.y + DIR_DELTA[side].dy
    }));
  }

  if (block.kind === 'target') {
    return [
      {
        id: `${block.id}:in0`,
        blockId: block.id,
        role: 'input',
        tileX: block.x,
        tileY: block.y,
        side: 'left',
        accessX: block.x - 1,
        accessY: block.y,
        inputIndex: 0
      }
    ];
  }

  if (block.gate === 'NOT') {
    return [
      {
        id: `${block.id}:in0`,
        blockId: block.id,
        role: 'input',
        tileX: block.x,
        tileY: block.y,
        side: 'left',
        accessX: block.x - 1,
        accessY: block.y,
        inputIndex: 0
      },
      {
        id: `${block.id}:out`,
        blockId: block.id,
        role: 'output',
        tileX: block.x,
        tileY: block.y,
        side: 'right',
        accessX: block.x + 1,
        accessY: block.y
      }
    ];
  }

  // 2-tile tall AND / OR blocks: two inputs along the left side, one output on right side
  return [
    {
      id: `${block.id}:in0`,
      blockId: block.id,
      role: 'input',
      tileX: block.x,
      tileY: block.y,
      side: 'left',
      accessX: block.x - 1,
      accessY: block.y,
      inputIndex: 0
    },
    {
      id: `${block.id}:in1`,
      blockId: block.id,
      role: 'input',
      tileX: block.x,
      tileY: block.y + 1,
      side: 'left',
      accessX: block.x - 1,
      accessY: block.y + 1,
      inputIndex: 1
    },
    {
      id: `${block.id}:out`,
      blockId: block.id,
      role: 'output',
      tileX: block.x,
      tileY: block.y,
      side: 'right',
      accessX: block.x + 1,
      accessY: block.y
    }
  ];
}

function buildAllSockets(level: AlbertaLevelDef): SocketDef[] {
  const result: SocketDef[] = [];
  for (const block of level.blocks) {
    result.push(...getBlockSockets(block));
  }
  return result;
}

export function isWalkableTile(
  level: AlbertaLevelDef,
  x: number,
  y: number
): boolean {
  if (x <= 0 || x >= level.width - 1 || y <= 0 || y >= level.height - 1) {
    return false;
  }
  for (const block of level.blocks) {
    const occupied = getBlockOccupiedTiles(block);
    if (occupied.some((t) => t.x === x && t.y === y)) {
      return false;
    }
  }
  return true;
}

function getBlockBaseColor(block: AlbertaBlockDef): number {
  if (block.kind === 'source') return CLOCK_COLORS[block.period].hex;
  if (block.kind === 'logic') return GATE_COLORS[block.gate];
  return 0x6ac266;
}

function makeEdgeKey(a: GridPos, b: GridPos): string {
  const first = a.x < b.x || (a.x === b.x && a.y <= b.y) ? a : b;
  const second = first === a ? b : a;
  return `${first.x},${first.y}-${second.x},${second.y}`;
}

function wireUsesEdge(wire: WireConnection, a: GridPos, b: GridPos): boolean {
  const targetKey = makeEdgeKey(a, b);
  for (let i = 0; i < wire.path.length - 1; i++) {
    if (makeEdgeKey(wire.path[i], wire.path[i + 1]) === targetKey) {
      return true;
    }
  }
  return false;
}

function getSignalColorForOutputSocket(
  state: AlbertaGameState,
  outputSocketId: string,
  visited = new Set<string>()
): number {
  const sock = state.sockets.find((s) => s.id === outputSocketId);
  if (!sock || visited.has(sock.blockId)) return 0xf5b731;
  visited.add(sock.blockId);

  const block = state.level.blocks.find((b) => b.id === sock.blockId);
  if (!block) return 0xf5b731;
  if (block.kind === 'source') return CLOCK_COLORS[block.period].hex;
  if (block.kind === 'logic') return GATE_COLORS[block.gate];
  return 0x6ac266;
}

export function evaluateCircuit(
  state: AlbertaGameState,
  events: AlbertaEvent[] = []
): void {
  const blockMap = new Map<string, AlbertaBlockDef>();
  for (const b of state.level.blocks) blockMap.set(b.id, b);

  const wireByToSocket = new Map<string, WireConnection>();
  for (const w of state.wires) {
    wireByToSocket.set(w.toSocketId, w);
  }

  const blockOutputs: Record<string, boolean[]> = {};
  const visiting = new Set<string>();

  const evalInputSocket = (socketId: string): { connected: boolean; wave: boolean[] } => {
    const wire = wireByToSocket.get(socketId);
    if (!wire) return { connected: false, wave: allFalseWave() };
    const fromSocket = state.sockets.find((s) => s.id === wire.fromSocketId);
    if (!fromSocket) return { connected: false, wave: allFalseWave() };
    return { connected: true, wave: evalBlockOutput(fromSocket.blockId) };
  };

  const evalBlockOutput = (blockId: string): boolean[] => {
    if (blockOutputs[blockId]) return blockOutputs[blockId];
    if (visiting.has(blockId)) return allFalseWave();

    const block = blockMap.get(blockId);
    if (!block) return allFalseWave();
    visiting.add(blockId);

    let result = allFalseWave();
    if (block.kind === 'source') {
      result = makeClockWaveform(block.period);
    } else if (block.kind === 'logic') {
      if (block.gate === 'NOT') {
        const in0 = evalInputSocket(`${block.id}:in0`);
        result = in0.connected ? notWaveform(in0.wave) : allFalseWave();
      } else if (block.gate === 'AND') {
        const in0 = evalInputSocket(`${block.id}:in0`);
        const in1 = evalInputSocket(`${block.id}:in1`);
        result =
          in0.connected && in1.connected ? andWaveforms(in0.wave, in1.wave) : allFalseWave();
      } else {
        const in0 = evalInputSocket(`${block.id}:in0`);
        const in1 = evalInputSocket(`${block.id}:in1`);
        result = orWaveforms(in0.wave, in1.wave);
      }
    }

    visiting.delete(blockId);
    blockOutputs[blockId] = result;
    return result;
  };

  for (const block of state.level.blocks) {
    if (block.kind !== 'target') {
      evalBlockOutput(block.id);
    }
  }

  const socketWaveforms: Record<string, boolean[]> = {};
  for (const sock of state.sockets) {
    if (sock.role === 'output') {
      socketWaveforms[sock.id] = blockOutputs[sock.blockId] ?? allFalseWave();
    } else {
      socketWaveforms[sock.id] = evalInputSocket(sock.id).wave;
    }
  }

  const prevMatched = state.targetMatched;
  const targetMatched: Record<string, boolean> = {};
  let allTargetsMatched = true;
  let targetCount = 0;

  for (const block of state.level.blocks) {
    if (block.kind !== 'target') continue;
    targetCount++;
    const in0 = evalInputSocket(`${block.id}:in0`);
    const matched = in0.connected && waveformsEqual(in0.wave, block.targetWaveform);
    targetMatched[block.id] = matched;
    if (matched && !prevMatched[block.id]) {
      events.push({ type: 'target_match', blockId: block.id });
    }
    if (!matched) {
      allTargetsMatched = false;
    }
  }

  for (const w of state.wires) {
    w.colorHex = getSignalColorForOutputSocket(state, w.fromSocketId);
  }

  state.blockOutputs = blockOutputs;
  state.socketWaveforms = socketWaveforms;
  state.targetMatched = targetMatched;

  const wasWon = state.status === 'won';
  if (targetCount > 0 && allTargetsMatched) {
    state.status = 'won';
    if (!wasWon) {
      events.push({ type: 'win' });
    }
  } else {
    state.status = 'playing';
  }
}

export function createAlbertaState(level: AlbertaLevelDef): AlbertaGameState {
  const state: AlbertaGameState = {
    level,
    alberta: {
      x: level.start.x,
      y: level.start.y,
      prevX: level.start.x,
      prevY: level.start.y,
      facing: 'right',
      movedThisTick: false
    },
    sockets: buildAllSockets(level),
    wires: [],
    activeWire: null,
    undoWires: [],
    socketWaveforms: {},
    blockOutputs: {},
    targetMatched: {},
    nextWireId: 1,
    status: 'playing',
    lastEvents: []
  };
  evaluateCircuit(state);
  return state;
}

export function moveAlberta(state: AlbertaGameState, dir: Direction): AlbertaEvent[] {
  state.alberta.prevX = state.alberta.x;
  state.alberta.prevY = state.alberta.y;
  state.alberta.movedThisTick = false;
  state.alberta.facing = dir;

  const { dx, dy } = DIR_DELTA[dir];
  const nx = state.alberta.x + dx;
  const ny = state.alberta.y + dy;

  if (!isWalkableTile(state.level, nx, ny)) {
    const events: AlbertaEvent[] = [{ type: 'blocked' }];
    state.lastEvents = events;
    return events;
  }

  if (state.activeWire) {
    const path = state.activeWire.path;
    const len = path.length;
    if (len >= 2 && path[len - 2].x === nx && path[len - 2].y === ny) {
      path.pop();
    } else {
      const earlierIdx = path.findIndex((p) => p.x === nx && p.y === ny);
      if (earlierIdx >= 0) {
        state.activeWire.path = path.slice(0, earlierIdx + 1);
      } else {
        const cur = path[len - 1];
        const nextPos = { x: nx, y: ny };
        const overlapsParallelWire = state.wires.some((w) =>
          wireUsesEdge(w, cur, nextPos)
        );
        if (overlapsParallelWire) {
          const events: AlbertaEvent[] = [{ type: 'blocked' }];
          state.lastEvents = events;
          return events;
        }
        path.push(nextPos);
      }
    }
  }

  state.alberta.x = nx;
  state.alberta.y = ny;
  state.alberta.movedThisTick = true;

  const events: AlbertaEvent[] = [{ type: 'step' }];
  state.lastEvents = events;
  return events;
}

function getWireOnSocket(
  state: AlbertaGameState,
  socket: SocketDef
): WireConnection | undefined {
  return state.wires.find(
    (w) => w.fromSocketId === socket.id || w.toSocketId === socket.id
  );
}

function describeSocketAction(
  state: AlbertaGameState,
  socket: SocketDef
): NearbySocketAction | null {
  const active = state.activeWire;
  const existingWire = getWireOnSocket(state, socket);

  if (active) {
    if (socket.id === active.startSocketId) {
      return {
        socket,
        action: 'cancel_wire',
        label: '✖️ Kabel abbrechen'
      };
    }
    const rolesCompatible = socket.role !== active.startRole;
    const differentBlock = socket.blockId !== active.startBlockId;
    if (rolesCompatible && differentBlock && !existingWire) {
      return {
        socket,
        action: 'finish_wire',
        label:
          socket.role === 'input'
            ? '🔌 Hier einstecken!'
            : '🔌 Am Ausgang anschließen!'
      };
    }
    return null;
  }

  if (existingWire) {
    return {
      socket,
      action: 'unplug',
      label: '⏏️ Kabel ausstecken'
    };
  }

  return {
    socket,
    action: 'start_wire',
    label:
      socket.role === 'output'
        ? '🔌 Leitung vom Ausgang ziehen'
        : '🔌 Leitung vom Eingang ziehen'
  };
}

export function getNearbySocketAction(
  state: AlbertaGameState,
  preferredSocketId?: string
): NearbySocketAction | null {
  const adjacent = state.sockets.filter(
    (s) => s.accessX === state.alberta.x && s.accessY === state.alberta.y
  );
  if (adjacent.length === 0) return null;

  const ordered = [...adjacent].sort((a, b) => {
    if (preferredSocketId) {
      if (a.id === preferredSocketId) return -1;
      if (b.id === preferredSocketId) return 1;
    }
    const aFaces = OPPOSITE_DIR[a.side] === state.alberta.facing ? 0 : 1;
    const bFaces = OPPOSITE_DIR[b.side] === state.alberta.facing ? 0 : 1;
    return aFaces - bFaces;
  });

  for (const sock of ordered) {
    const action = describeSocketAction(state, sock);
    if (action) return action;
  }
  return null;
}

function cloneWires(wires: WireConnection[]): WireConnection[] {
  return wires.map((w) => ({
    ...w,
    path: w.path.map((p) => ({ ...p }))
  }));
}

export function interactSocket(
  state: AlbertaGameState,
  preferredSocketId?: string
): AlbertaEvent[] {
  const nearby = getNearbySocketAction(state, preferredSocketId);
  if (!nearby) {
    state.lastEvents = [];
    return [];
  }

  const events: AlbertaEvent[] = [];
  const { socket, action } = nearby;

  if (action === 'cancel_wire') {
    state.activeWire = null;
    events.push({ type: 'wire_cancel' });
    state.lastEvents = events;
    return events;
  }

  if (action === 'unplug') {
    state.undoWires.push(cloneWires(state.wires));
    state.wires = state.wires.filter(
      (w) => w.fromSocketId !== socket.id && w.toSocketId !== socket.id
    );
    events.push({ type: 'wire_unplug' });
    evaluateCircuit(state, events);
    state.lastEvents = events;
    return events;
  }

  if (action === 'start_wire') {
    const block = state.level.blocks.find((b) => b.id === socket.blockId);
    const colorHex = block ? getBlockBaseColor(block) : 0xffd43b;
    state.activeWire = {
      startSocketId: socket.id,
      startRole: socket.role,
      startBlockId: socket.blockId,
      path: [{ x: state.alberta.x, y: state.alberta.y }],
      colorHex
    };
    events.push({ type: 'wire_start' });
    state.lastEvents = events;
    return events;
  }

  // action === 'finish_wire'
  const active = state.activeWire!;
  const isForward = active.startRole === 'output';
  const fromSocketId = isForward ? active.startSocketId : socket.id;
  const toSocketId = isForward ? socket.id : active.startSocketId;
  const path = isForward
    ? active.path.map((p) => ({ ...p }))
    : [...active.path].reverse().map((p) => ({ ...p }));

  state.undoWires.push(cloneWires(state.wires));
  state.wires.push({
    id: `wire-${state.nextWireId++}`,
    fromSocketId,
    toSocketId,
    path,
    colorHex: active.colorHex
  });
  state.activeWire = null;
  events.push({ type: 'wire_connect' });
  evaluateCircuit(state, events);
  state.lastEvents = events;
  return events;
}

export function cancelActiveWire(state: AlbertaGameState): AlbertaEvent[] {
  if (!state.activeWire) {
    state.lastEvents = [];
    return [];
  }
  state.activeWire = null;
  const events: AlbertaEvent[] = [{ type: 'wire_cancel' }];
  state.lastEvents = events;
  return events;
}

export function undoLastWire(state: AlbertaGameState): AlbertaEvent[] {
  if (state.activeWire) {
    return cancelActiveWire(state);
  }
  const prev = state.undoWires.pop();
  if (!prev) {
    state.lastEvents = [];
    return [];
  }
  state.wires = prev;
  const events: AlbertaEvent[] = [{ type: 'wire_unplug' }];
  evaluateCircuit(state, events);
  state.lastEvents = events;
  return events;
}

export function clearAllWires(state: AlbertaGameState): AlbertaEvent[] {
  if (state.wires.length === 0 && !state.activeWire) {
    state.lastEvents = [];
    return [];
  }
  if (state.wires.length > 0) {
    state.undoWires.push(cloneWires(state.wires));
  }
  state.wires = [];
  state.activeWire = null;
  const events: AlbertaEvent[] = [{ type: 'wire_unplug' }];
  evaluateCircuit(state, events);
  state.lastEvents = events;
  return events;
}

function getSegmentOrientation(
  prev: GridPos,
  cur: GridPos,
  next: GridPos
): 'horiz' | 'vert' | 'corner' {
  if (prev.y === cur.y && next.y === cur.y && prev.x !== next.x) return 'horiz';
  if (prev.x === cur.x && next.x === cur.x && prev.y !== next.y) return 'vert';
  return 'corner';
}

/**
 * Identifies perpendicular cable crossings so the upper cable renders with a clean 3D arch
 * ("Bogen") jumping visibly over the lower cable.
 */
export function computeWireCrossings(
  wires: WireConnection[],
  activeWire: ActiveWire | null
): Array<Set<string>> {
  const allPaths: GridPos[][] = wires.map((w) => w.path);
  if (activeWire) {
    allPaths.push(activeWire.path);
  }

  const occupiedOrientations = new Map<string, Set<'horiz' | 'vert'>>();
  const crossings: Array<Set<string>> = allPaths.map(() => new Set<string>());

  for (let i = 0; i < allPaths.length; i++) {
    const path = allPaths[i];
    for (let k = 1; k < path.length - 1; k++) {
      const orient = getSegmentOrientation(path[k - 1], path[k], path[k + 1]);
      if (orient === 'corner') continue;
      const key = `${path[k].x},${path[k].y}`;
      const existing = occupiedOrientations.get(key);
      const perp: 'horiz' | 'vert' = orient === 'horiz' ? 'vert' : 'horiz';
      if (existing?.has(perp)) {
        crossings[i].add(key);
      }
      if (!existing) {
        occupiedOrientations.set(key, new Set([orient]));
      } else {
        existing.add(orient);
      }
    }
  }

  return crossings;
}
