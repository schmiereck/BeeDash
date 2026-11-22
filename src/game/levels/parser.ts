import { Cell, GridPos, LevelDefinition, PestKind, PortalDef, TileType } from '../types';
import { makeCell } from '../honeyPhysics';

export interface ParsedLevel {
  width: number;
  height: number;
  grid: Cell[][];
  playerStart: { x: number; y: number };
  exitPos: { x: number; y: number };
  totalFlowers: number;
  totalBees: number;
  honeySourceCount: number;
  initialHoneyCount: number;
  totalBowls: number;
  pressurePlates: GridPos[];
  petalGates: GridPos[];
  portals: PortalDef[];
  pests: Array<{ x: number; y: number; kind: PestKind }>;
  nextEntityId: number;
}

const CHAR_TO_TILE: Record<string, TileType> = {
  '#': 'wall',
  R: 'rounded_wall',
  '.': 'wax',
  ' ': 'empty',
  P: 'empty',
  D: 'empty',
  '1': 'empty',
  '2': 'empty',
  M: 'empty',
  m: 'empty',
  F: 'flower',
  B: 'trapped_bee',
  O: 'honeypot',
  S: 'honey_source',
  '~': 'honey_liquid',
  U: 'honey_bowl',
  G: 'honey_gate',
  T: 'petal_gate',
  E: 'exit'
};

export function parseLevelAscii(level: LevelDefinition): ParsedLevel {
  const rows = level.ascii;
  if (rows.length === 0) {
    throw new Error(`Level "${level.id}" hat keine Zeilen.`);
  }

  const height = rows.length;
  const width = rows[0].length;
  if (width === 0) {
    throw new Error(`Level "${level.id}" hat leere Zeilen.`);
  }

  let nextEntityId = 1;
  let playerStart: { x: number; y: number } | null = null;
  let exitPos: { x: number; y: number } | null = null;
  let totalFlowers = 0;
  let totalBees = 0;
  let honeySourceCount = 0;
  let initialHoneyCount = 0;
  let totalBowls = 0;
  const pressurePlates: GridPos[] = [];
  const petalGates: GridPos[] = [];
  const portals: PortalDef[] = [];
  const pests: Array<{ x: number; y: number; kind: PestKind }> = [];

  const grid: Cell[][] = [];

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row.length !== width) {
      throw new Error(
        `Level "${level.id}" Zeile ${y} hat Länge ${row.length}, erwartet ${width}.`
      );
    }

    const gridRow: Cell[] = [];
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      const tileType = CHAR_TO_TILE[ch];
      if (!tileType) {
        throw new Error(
          `Level "${level.id}" enthält unbekanntes Zeichen "${ch}" an (${x}, ${y}).`
        );
      }

      if (ch === 'P') {
        if (playerStart) {
          throw new Error(`Level "${level.id}" hat mehr als einen Startpunkt (P).`);
        }
        playerStart = { x, y };
      } else if (ch === 'E') {
        if (exitPos) {
          throw new Error(`Level "${level.id}" hat mehr als einen Ausgang (E).`);
        }
        exitPos = { x, y };
      }

      if (ch === 'D') pressurePlates.push({ x, y });
      if (ch === '1') portals.push({ x, y, pair: 0 });
      if (ch === '2') portals.push({ x, y, pair: 1 });
      if (ch === 'M') pests.push({ x, y, kind: 'grub' });
      if (ch === 'm') pests.push({ x, y, kind: 'mite' });
      if (tileType === 'flower') totalFlowers++;
      if (tileType === 'trapped_bee') totalBees++;
      if (tileType === 'honey_source') honeySourceCount++;
      if (tileType === 'honey_liquid') initialHoneyCount++;
      if (tileType === 'honey_bowl') totalBowls++;
      if (tileType === 'petal_gate') petalGates.push({ x, y });

      const variant = (x * 7 + y * 13) % 3;
      gridRow.push(makeCell(nextEntityId++, tileType, x, y, variant));
    }
    grid.push(gridRow);
  }

  if (!playerStart) {
    throw new Error(`Level "${level.id}" fehlt der Startpunkt (P).`);
  }
  if (!exitPos) {
    throw new Error(`Level "${level.id}" fehlt der Ausgang (E).`);
  }

  for (const pair of [0, 1] as const) {
    const count = portals.filter((p) => p.pair === pair).length;
    if (count !== 0 && count !== 2) {
      throw new Error(
        `Level "${level.id}": Portal-Paar "${pair + 1}" muss genau 2x vorkommen (gefunden: ${count}).`
      );
    }
  }

  return {
    width,
    height,
    grid,
    playerStart,
    exitPos,
    totalFlowers,
    totalBees,
    honeySourceCount,
    initialHoneyCount,
    totalBowls,
    pressurePlates,
    petalGates,
    portals,
    pests,
    nextEntityId
  };
}
