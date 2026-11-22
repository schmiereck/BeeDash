import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  cancelActiveWire,
  clearAllWires,
  computeWireCrossings,
  createAlbertaState,
  evaluateCircuit,
  getNearbySocketAction,
  interactSocket,
  moveAlberta,
  undoLastWire
} from '../src/alberta/albertaEngine';
import {
  ALBERTA_LEVELS,
  CYCLE_LENGTH,
  andWaveforms,
  getDisplayCycleLength,
  makeClockWaveform,
  notWaveform,
  orWaveforms,
  waveformsEqual
} from '../src/alberta/albertaLevels';
import {
  createLogicBlockMesh,
  createSourceCubeMesh,
  createTargetBlockMesh,
  createWireMesh,
  createWorkbenchFloor,
  setSocketRingVisual
} from '../src/alberta/albertaModels';
import { Direction } from '../src/game/types';
import { AssetFactory } from '../src/render/assetFactory';
import { animateCharacterWalk, createStageCharacter } from '../src/render/suitcaseCharacters';

function walk(
  state: ReturnType<typeof createAlbertaState>,
  steps: Array<[Direction, number]>
): void {
  for (const [dir, count] of steps) {
    for (let i = 0; i < count; i++) {
      moveAlberta(state, dir);
      expect(state.alberta.movedThisTick).toBe(true);
    }
  }
}

describe('Albertas Erfinder-Werkstatt (Logic Circuit Puzzles)', () => {
  it('generates 1s..4s clock waveforms with LCM 24s cycle and exact boolean gates', () => {
    const w1 = makeClockWaveform(1);
    const w2 = makeClockWaveform(2);
    const w3 = makeClockWaveform(3);
    const w4 = makeClockWaveform(4);

    expect(w1).toHaveLength(CYCLE_LENGTH);
    expect(w1.slice(0, 4)).toEqual([true, false, true, false]);
    expect(w2.slice(0, 6)).toEqual([true, true, false, false, true, true]);
    expect(w3.slice(0, 6)).toEqual([true, true, true, false, false, false]);
    expect(w4.slice(0, 8)).toEqual([true, true, true, true, false, false, false, false]);

    expect(andWaveforms(w1, w2).slice(0, 4)).toEqual([true, false, false, false]);
    expect(orWaveforms(w1, w2).slice(0, 4)).toEqual([true, true, true, false]);
    expect(notWaveform(w2).slice(0, 4)).toEqual([false, false, true, true]);
    expect(waveformsEqual(w2, makeClockWaveform(2))).toBe(true);
    expect(waveformsEqual(w2, w1)).toBe(false);
  });

  it('retracts active wire on step-back, blocks parallel overlap, and detects perpendicular crossings', () => {
    const state = createAlbertaState(ALBERTA_LEVELS[0]);
    // Start wire from S1(2,2):right at access (3,2)
    walk(state, [['up', 1], ['left', 1]]);
    expect(getNearbySocketAction(state)?.socket.id).toBe('S1:right');
    interactSocket(state);
    expect(state.activeWire).not.toBeNull();
    expect(state.activeWire!.path).toHaveLength(1);

    // Pull right 2 tiles, then step back left 1 -> cleanly retracts without tangling
    moveAlberta(state, 'right');
    moveAlberta(state, 'right');
    expect(state.activeWire!.path).toHaveLength(3);
    moveAlberta(state, 'left');
    expect(state.activeWire!.path).toHaveLength(2);

    // Finish wire to T1:in0 at (6,3): path runs (3,2)->(4,2)->(5,2)->(6,2)->(6,3)
    walk(state, [['right', 2], ['down', 1]]);
    interactSocket(state, 'T1:in0');
    expect(state.status).toBe('won');
    expect(state.wires).toHaveLength(1);

    // Now test perpendicular crossing on another wire from S2(2,5):up -> crosses (4,2) vertically!
    walk(state, [['down', 1], ['left', 4]]); // (2,4)
    interactSocket(state, 'S2:up');
    moveAlberta(state, 'up'); // (2,3)
    walk(state, [['right', 2]]); // (4,3)
    expect(state.alberta.x).toBe(4);
    expect(state.alberta.y).toBe(3);

    // Crossing (4,2) perpendicularly from (4,3)->(4,2)->(4,1) works smoothly and gets flagged with an arch!
    moveAlberta(state, 'up'); // (4,2)
    expect(state.alberta.movedThisTick).toBe(true);
    moveAlberta(state, 'up'); // (4,1)
    const crossings = computeWireCrossings(state.wires, state.activeWire);
    expect(crossings[1].has('4,2')).toBe(true);

    // Trying to trace in parallel along an already-occupied completed edge (4,2)->(5,2) is blocked cleanly
    moveAlberta(state, 'down'); // back to (4,2)
    const blockedEvents = moveAlberta(state, 'right');
    expect(blockedEvents.some((e) => e.type === 'blocked')).toBe(true);
    expect(state.alberta.x).toBe(4);

    // Cancel & undo work cleanly
    cancelActiveWire(state);
    expect(state.activeWire).toBeNull();
    undoLastWire(state);
    expect(state.wires).toHaveLength(0);
    expect(state.status).toBe('playing');
  });

  it('safely handles feedback cycles and partial OR/AND/NOT inputs', () => {
    const state = createAlbertaState(ALBERTA_LEVELS[3]); // has G1(OR), G2(NOT)
    state.wires.push({
      id: 'loop-1',
      fromSocketId: 'G1:out',
      toSocketId: 'G1:in0',
      path: [{ x: 7, y: 2 }, { x: 5, y: 2 }],
      colorHex: 0x20c997
    });
    expect(() => evaluateCircuit(state)).not.toThrow();
    expect(state.blockOutputs['G1'].every((v) => v === false)).toBe(true);

    clearAllWires(state);
    expect(state.wires).toHaveLength(0);
  });

  it('solves all 5 Alberta inventor puzzles step-by-step', () => {
    // Puzzle 1: 2s direct to T1
    const s1 = createAlbertaState(ALBERTA_LEVELS[0]);
    walk(s1, [['up', 1], ['left', 1]]); // S1:right at (3,2)
    interactSocket(s1, 'S1:right');
    walk(s1, [['right', 3], ['down', 1]]); // T1:in0 at (6,3)
    interactSocket(s1, 'T1:in0');
    expect(s1.status).toBe('won');

    // Puzzle 2: 2s -> NOT -> T1
    const s2 = createAlbertaState(ALBERTA_LEVELS[1]);
    walk(s2, [['up', 2], ['left', 1]]); // S1:right at (3,3)
    interactSocket(s2, 'S1:right');
    walk(s2, [['right', 1]]); // G1:in0 at (4,3)
    interactSocket(s2, 'G1:in0');
    walk(s2, [['up', 1], ['right', 2], ['down', 1]]); // G1:out at (6,3)
    interactSocket(s2, 'G1:out');
    walk(s2, [['right', 1]]); // T1:in0 at (7,3)
    interactSocket(s2, 'T1:in0');
    expect(s2.status).toBe('won');

    // Puzzle 3: 1s AND 2s -> T1
    const s3 = createAlbertaState(ALBERTA_LEVELS[2]);
    walk(s3, [['up', 2], ['left', 1]]); // S1:right (3,2)
    interactSocket(s3, 'S1:right');
    walk(s3, [['right', 2], ['down', 1]]); // G1:in0 (5,3)
    interactSocket(s3, 'G1:in0');
    walk(s3, [['down', 3], ['left', 2]]); // S2:right (3,6)
    interactSocket(s3, 'S2:right');
    walk(s3, [['right', 1], ['up', 2], ['right', 1]]); // G1:in1 (5,4)
    interactSocket(s3, 'G1:in1');
    walk(s3, [['down', 1], ['right', 2], ['up', 2]]); // G1:out (7,3)
    interactSocket(s3, 'G1:out');
    walk(s3, [['right', 1]]); // T1:in0 (8,3)
    interactSocket(s3, 'T1:in0');
    expect(s3.status).toBe('won');

    // Puzzle 4: (2s OR 3s -> T1) + (NOT 3s -> T2) using two sockets on S2
    const s4 = createAlbertaState(ALBERTA_LEVELS[3]);
    walk(s4, [['up', 2], ['left', 1]]); // S1:right (3,2)
    interactSocket(s4, 'S1:right');
    walk(s4, [['right', 2]]); // G1:in0 (5,2)
    interactSocket(s4, 'G1:in0');
    walk(s4, [['left', 1], ['down', 3], ['left', 2]]); // S2:up (2,5)
    interactSocket(s4, 'S2:up');
    walk(s4, [['right', 2], ['up', 2], ['right', 1]]); // G1:in1 (5,3)
    interactSocket(s4, 'G1:in1');
    walk(s4, [['down', 1], ['right', 2], ['up', 2]]); // G1:out (7,2)
    interactSocket(s4, 'G1:out');
    walk(s4, [['right', 2]]); // T1:in0 (9,2)
    interactSocket(s4, 'T1:in0');
    expect(s4.targetMatched['T1']).toBe(true);
    expect(s4.status).toBe('playing');

    walk(s4, [['down', 2], ['left', 6], ['down', 2]]); // S2:right (3,6)
    interactSocket(s4, 'S2:right');
    walk(s4, [['right', 2]]); // G2:in0 (5,6)
    interactSocket(s4, 'G2:in0');
    walk(s4, [['up', 1], ['right', 2], ['down', 1]]); // G2:out (7,6)
    interactSocket(s4, 'G2:out');
    walk(s4, [['right', 2]]); // T2:in0 (9,6)
    interactSocket(s4, 'T2:in0');
    expect(s4.status).toBe('won');

    // Puzzle 5: (1s AND 4s -> T1) + (NOT(4s) OR 3s -> T2)
    const s5 = createAlbertaState(ALBERTA_LEVELS[4]);
    walk(s5, [['up', 3], ['left', 1]]); // S1:right (3,2)
    interactSocket(s5, 'S1:right');
    walk(s5, [['right', 2]]); // G1:in0 (5,2)
    interactSocket(s5, 'G1:in0');

    walk(s5, [['left', 1], ['down', 2], ['left', 2]]); // S2:up (2,4)
    interactSocket(s5, 'S2:up');
    walk(s5, [['right', 2], ['up', 1], ['right', 1]]); // G1:in1 (5,3)
    interactSocket(s5, 'G1:in1');

    walk(s5, [['down', 1], ['right', 2], ['up', 2]]); // G1:out (7,2)
    interactSocket(s5, 'G1:out');
    walk(s5, [['right', 4]]); // T1:in0 (11,2)
    interactSocket(s5, 'T1:in0');
    expect(s5.targetMatched['T1']).toBe(true);

    // Wire S2(2,6):down -> G2(4,6):in0
    walk(s5, [
      ['down', 2],
      ['left', 7],
      ['down', 2],
      ['left', 2]
    ]); // (2,6)
    interactSocket(s5, 'S2:down');
    walk(s5, [['right', 2]]); // G2:in0 (4,6)
    interactSocket(s5, 'G2:in0');

    // Wire G2(6,6):out -> G3(8,6):in0
    walk(s5, [['up', 1], ['right', 2], ['down', 1]]); // G2:out (6,6)
    interactSocket(s5, 'G2:out');
    walk(s5, [['right', 2]]); // G3:in0 (8,6)
    interactSocket(s5, 'G3:in0');

    // Wire S3(3,8):right -> G3(8,7):in1
    walk(s5, [['down', 1], ['left', 1], ['down', 1], ['left', 4]]); // S3:right (3,8)
    interactSocket(s5, 'S3:right');
    walk(s5, [['right', 5], ['up', 1]]); // G3:in1 (8,7)
    interactSocket(s5, 'G3:in1');

    // Wire G3(10,6):out -> T2(11,6):in0
    walk(s5, [['down', 1], ['right', 2], ['up', 2]]); // G3:out (10,6)
    interactSocket(s5, 'G3:out');
    walk(s5, [['right', 1]]); // T2:in0 (11,6)
    interactSocket(s5, 'T2:in0');

    expect(s5.targetMatched['T2']).toBe(true);
    expect(s5.status).toBe('won');
  });

  it('builds and updates Alberta 3D workshop models, cables with arches, and character cleanly', () => {
    const assets = new AssetFactory();
    const state = createAlbertaState(ALBERTA_LEVELS[4]);

    const floor = createWorkbenchFloor(state.level.width, state.level.height);
    expect(floor.root.children.length).toBeGreaterThan(0);

    for (const block of state.level.blocks) {
      const socks = state.sockets.filter((s) => s.blockId === block.id);
      if (block.kind === 'source') {
        const vis = createSourceCubeMesh(block, socks);
        expect(vis.socketRings.size).toBe(socks.length);
        for (const ring of vis.socketRings.values()) {
          setSocketRingVisual(ring, 'idle', 0.5);
          expect(ring.scale.x).toBe(1);
          setSocketRingVisual(ring, 'compatible', 0.5);
          expect(ring.scale.x).toBeGreaterThan(1.1);
          setSocketRingVisual(ring, 'nearby', 0.5);
          expect(ring.scale.x).toBeGreaterThan(1.2);
        }
        expect(() => vis.setLit(true)).not.toThrow();
        expect(() => vis.setLit(false)).not.toThrow();
        vis.ownedMaterials.forEach((m) => m.dispose());
      } else if (block.kind === 'logic') {
        const vis = createLogicBlockMesh(block, socks);
        expect(vis.socketRings.size).toBe(socks.length);
        expect(() => vis.setOutputLit(true)).not.toThrow();
        expect(() => vis.setOutputLit(false)).not.toThrow();
        vis.ownedMaterials.forEach((m) => m.dispose());
      } else {
        const vis = createTargetBlockMesh(block, socks);
        expect(vis.socketRings.size).toBe(socks.length);
        expect(() => vis.setStates(true, true, true)).not.toThrow();
        expect(() => vis.setStates(false, false, false)).not.toThrow();
        vis.ownedMaterials.forEach((m) => m.dispose());
      }
    }

    const startSock = state.sockets[0];
    const endSock = state.sockets[state.sockets.length - 1];
    const wireVis = createWireMesh(
      [
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 }
      ],
      startSock,
      endSock,
      null,
      new Set(['4,2']),
      0xffd43b
    );
    expect(() => wireVis.updateSignal(true, 1.2)).not.toThrow();
    expect(() => wireVis.updateSignal(false, 2.0)).not.toThrow();
    wireVis.ownedMaterials.forEach((m) => m.dispose());

    const alberta = createStageCharacter(assets, 'alberta');
    expect(() => animateCharacterWalk(alberta.root, 0.8, true, true, false)).not.toThrow();
    expect(() => animateCharacterWalk(alberta.root, 1.4, false, false, true)).not.toThrow();
    alberta.ownedMaterials.forEach((m) => m.dispose());
    floor.ownedMaterials.forEach((m) => m.dispose());
  });

  it('computes compact beat display cycle lengths cleanly across all Alberta levels', () => {
    expect(ALBERTA_LEVELS.map(getDisplayCycleLength)).toEqual([8, 8, 8, 12, 24]);
  });
});
