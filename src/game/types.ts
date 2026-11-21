export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileType =
  | 'empty'
  | 'wall'
  | 'rounded_wall'
  | 'wax'
  | 'flower'
  | 'trapped_bee'
  | 'honeypot'
  | 'honey_source'
  | 'honey_liquid'
  | 'honey_bowl'
  | 'honey_gate'
  | 'petal_gate'
  | 'exit';

export interface GridPos {
  x: number;
  y: number;
}

export interface PressurePlateState {
  x: number;
  y: number;
  pressed: boolean;
}

export interface PortalDef {
  x: number;
  y: number;
  pair: 0 | 1;
}

export type FallState = 'resting' | 'wobbling' | 'falling';

export type GameStatus = 'playing' | 'won' | 'lost';

export type FailReason = 'bonk_pot' | 'sticky_wings' | null;

export interface Cell {
  id: number;
  type: TileType;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  fallState: FallState;
  wobbleTicks: number;
  honeySpreadDepth: number;
  variant: number;
  filled?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  lastMoveFromX: number;
  lastMoveFromY: number;
  facing: Direction;
  movedThisTick: boolean;
}

export type GameEvent =
  | { type: 'dig'; x: number; y: number }
  | { type: 'flower'; x: number; y: number }
  | { type: 'rescue'; x: number; y: number }
  | { type: 'pot_wobble'; x: number; y: number }
  | { type: 'pot_land'; x: number; y: number }
  | { type: 'pot_push'; x: number; y: number }
  | { type: 'honey_drip'; x: number; y: number }
  | { type: 'honey_collect'; x: number; y: number }
  | { type: 'bowl_fill'; x: number; y: number }
  | { type: 'gate_open'; x: number; y: number }
  | { type: 'plate_press'; x: number; y: number }
  | { type: 'petal_gate_open'; x: number; y: number }
  | { type: 'petal_gate_close'; x: number; y: number }
  | { type: 'portal_warp'; x: number; y: number; toX: number; toY: number; pair: 0 | 1 }
  | { type: 'exit_open'; x: number; y: number }
  | { type: 'exit_locked'; x: number; y: number }
  | { type: 'bonk_pot'; x: number; y: number }
  | { type: 'sticky_wings'; x: number; y: number }
  | { type: 'sticky_blocked'; x: number; y: number }
  | { type: 'win'; x: number; y: number };

export interface LevelDefinition {
  id: string;
  number: number;
  world?: number;
  title: string;
  chapter: string;
  mapCoords: { q: number; r: number };
  intro: string;
  tip: string;
  requiredFlowers?: number;
  ascii: string[];
}

export interface GameState {
  levelId: string;
  levelNumber: number;
  width: number;
  height: number;
  grid: Cell[][];
  player: PlayerState;
  exitPos: { x: number; y: number };
  tick: number;
  status: GameStatus;
  failReason: FailReason;
  collectedFlowers: number;
  requiredFlowers: number;
  totalFlowers: number;
  rescuedBees: number;
  totalBees: number;
  collectedHoney: number;
  stickyRemainingMs: number;
  filledBowls: number;
  totalBowls: number;
  gatesOpen: boolean;
  pressurePlates: PressurePlateState[];
  petalGates: GridPos[];
  pressedPlates: number;
  totalPlates: number;
  petalGatesOpen: boolean;
  portals: PortalDef[];
  exitOpen: boolean;
  moves: number;
  nextEntityId: number;
  honeySourceCount: number;
  initialHoneyCount: number;
  sourceDripDelay: Record<string, number>;
  lastEvents: GameEvent[];
}
