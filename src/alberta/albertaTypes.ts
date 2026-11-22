import { Direction, GridPos } from '../game/types';

export type ClockPeriod = 1 | 2 | 3 | 4;
export type LogicGateKind = 'AND' | 'OR' | 'NOT';
export type SocketRole = 'output' | 'input';

export interface SocketDef {
  id: string;
  blockId: string;
  role: SocketRole;
  /** Grid tile on the block that hosts this socket */
  tileX: number;
  tileY: number;
  /** Outward side of that block tile */
  side: Direction;
  /** Walkable floor tile where Alberta stands to plug/unplug this socket */
  accessX: number;
  accessY: number;
  inputIndex?: 0 | 1;
}

export interface SourceBlockDef {
  id: string;
  kind: 'source';
  x: number;
  y: number;
  period: ClockPeriod;
}

export interface LogicBlockDef {
  id: string;
  kind: 'logic';
  gate: LogicGateKind;
  x: number;
  y: number;
}

export interface TargetBlockDef {
  id: string;
  kind: 'target';
  x: number;
  y: number;
  targetWaveform: boolean[];
  targetLabel: string;
}

export type AlbertaBlockDef = SourceBlockDef | LogicBlockDef | TargetBlockDef;

export interface WireConnection {
  id: string;
  fromSocketId: string;
  toSocketId: string;
  /** Ordered sequence of walkable floor tiles between from/to socket access tiles */
  path: GridPos[];
  colorHex: number;
}

export interface ActiveWire {
  startSocketId: string;
  startRole: SocketRole;
  startBlockId: string;
  path: GridPos[];
  colorHex: number;
}

export interface AlbertaLevelDef {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  intro: string;
  tip: string;
  width: number;
  height: number;
  start: GridPos;
  blocks: AlbertaBlockDef[];
}

export interface AlbertaPlayerState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  facing: Direction;
  movedThisTick: boolean;
}

export type AlbertaEvent =
  | { type: 'step' }
  | { type: 'wire_start' }
  | { type: 'wire_connect' }
  | { type: 'wire_unplug' }
  | { type: 'wire_cancel' }
  | { type: 'target_match'; blockId: string }
  | { type: 'win' }
  | { type: 'blocked' };

export type SocketActionKind =
  | 'start_wire'
  | 'finish_wire'
  | 'unplug'
  | 'cancel_wire';

export interface NearbySocketAction {
  socket: SocketDef;
  action: SocketActionKind;
  label: string;
}

export interface AlbertaGameState {
  level: AlbertaLevelDef;
  alberta: AlbertaPlayerState;
  sockets: SocketDef[];
  wires: WireConnection[];
  activeWire: ActiveWire | null;
  undoWires: WireConnection[][];
  socketWaveforms: Record<string, boolean[]>;
  blockOutputs: Record<string, boolean[]>;
  targetMatched: Record<string, boolean>;
  nextWireId: number;
  status: 'playing' | 'won';
  lastEvents: AlbertaEvent[];
}
