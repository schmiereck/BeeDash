import * as THREE from 'three';
import { Cell, Direction, GameEvent, GameState } from '../game/types';
import { AssetFactory } from './assetFactory';
import { ParticleSystem } from './particles';
import { HoneyBlobMotion } from './proceduralModels';

const FACING_YAW: Record<Direction, number> = {
  down: 0,
  right: Math.PI / 2,
  up: Math.PI,
  left: -Math.PI / 2
};

interface FlyingRescuedBee {
  mesh: THREE.Group;
  originX: number;
  originY: number;
  age: number;
  duration: number;
  spinDir: number;
  prevX: number;
  prevY: number;
}

interface HoneyTransition {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
  duration: number;
  kind: 'drop' | 'source_drip' | 'side_spawn' | 'side_drain';
}

interface HoneyBridgeState {
  left: number;
  right: number;
  up: number;
  down: number;
}

export class BoardRenderer {
  readonly group = new THREE.Group();
  readonly particles = new ParticleSystem();

  private assets: AssetFactory;
  private cellMeshes = new Map<number, THREE.Group>();
  private plateMeshes = new Map<string, THREE.Group>();
  private honeyTransitions = new Map<number, HoneyTransition>();
  private honeyWobbleTime = new Map<number, number>();
  private honeyBridgeBlend = new Map<number, HoneyBridgeState>();
  private potLandSquash = new Map<number, number>();
  private potLastRollDir = new Map<number, number>();
  private lastSyncedTick = -1;
  private flyingRescuedBees: FlyingRescuedBee[] = [];
  private beeMesh: THREE.Group | null = null;
  private currentBeeYaw = FACING_YAW.right;
  private currentBeePitch = 0.08;
  private beeWorldX = 0;
  private beeWorldY = 0;
  private elapsed = 0;
  private wingPhase = 0;
  private currentWingSpeed = 14;
  private rescueSpinToggle = 1;
  private suitcaseGlintTimer = 0;
  private nextTrickIndex: 0 | 1 | 2 = 0;
  private activeTrick: { type: 0 | 1 | 2; age: number; duration: number } | null = null;
  private stickyDripTimer = 0;
  private stickyShakeTimer = 0;
  private wasSticky = false;

  constructor(assets: AssetFactory) {
    this.assets = assets;
    this.group.add(this.particles.group);
  }

  triggerBeeTrick(): 0 | 1 | 2 | null {
    if (!this.beeMesh) return null;
    if (this.activeTrick && this.activeTrick.age < this.activeTrick.duration * 0.85) {
      return null;
    }
    const chosen = this.nextTrickIndex;
    this.nextTrickIndex = ((this.nextTrickIndex + 1) % 3) as 0 | 1 | 2;
    const durations: Record<0 | 1 | 2, number> = { 0: 0.64, 1: 0.68, 2: 0.72 };
    this.activeTrick = { type: chosen, age: 0, duration: durations[chosen] };
    this.particles.emitTrickSparkle(this.beeWorldX, this.beeWorldY);
    return chosen;
  }

  syncState(state: GameState, events: GameEvent[] = []): void {
    if (state.tick <= this.lastSyncedTick) {
      this.honeyTransitions.clear();
      this.honeyWobbleTime.clear();
      this.potLandSquash.clear();
      this.potLastRollDir.clear();
    }
    this.lastSyncedTick = state.tick;

    if (!this.beeMesh) {
      this.beeMesh = this.assets.createBee();
      this.beeMesh.position.set(state.player.x, -state.player.y, 0.2);
      this.currentBeeYaw = FACING_YAW[state.player.facing];
      this.group.add(this.beeMesh);
    }

    const activeIds = new Set<number>();

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x];
        if (cell.type === 'empty') continue;

        activeIds.add(cell.id);
        let obj = this.cellMeshes.get(cell.id);
        const wasNew = !obj;
        if (!obj) {
          const created = this.assets.createTileObject(cell.type, cell.variant);
          if (created) {
            obj = created;
            obj.position.set(cell.prevX, -cell.prevY, 0);
            this.cellMeshes.set(cell.id, obj);
            this.group.add(obj);
          }
        }

        if (
          cell.type === 'honey_liquid' &&
          (cell.prevX !== cell.x || cell.prevY !== cell.y)
        ) {
          const dx = cell.x - cell.prevX;
          const dy = cell.y - cell.prevY;
          let kind: HoneyTransition['kind'] | null = null;
          let duration = 0.5;

          if (dy > 0) {
            if (state.grid[cell.prevY]?.[cell.prevX]?.type === 'honey_source') {
              kind = 'source_drip';
              duration = 0.54;
            } else {
              kind = 'drop';
              duration = 0.46;
            }
          } else if (dx !== 0) {
            if (wasNew) {
              kind = 'side_spawn';
              duration = 0.62;
            } else {
              kind = 'side_drain';
              duration = 0.56;
            }
          }

          if (kind) {
            this.honeyTransitions.set(cell.id, {
              fromX: cell.prevX,
              fromY: cell.prevY,
              toX: cell.x,
              toY: cell.y,
              age: 0,
              duration,
              kind
            });
            this.honeyWobbleTime.set(cell.id, 0);

            if (kind === 'side_spawn') {
              this.honeyBridgeBlend.set(cell.id, {
                left: dx > 0 ? 0.85 : 0,
                right: dx < 0 ? 0.85 : 0,
                up: 0,
                down: 0
              });
            }
          }
        }
      }
    }

    // Remove meshes for collected/cleared cells
    for (const [id, obj] of this.cellMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.group.remove(obj);
        this.disposeProceduralObj(obj);
        this.cellMeshes.delete(id);
        this.honeyTransitions.delete(id);
        this.honeyWobbleTime.delete(id);
        this.honeyBridgeBlend.delete(id);
        this.potLandSquash.delete(id);
        this.potLastRollDir.delete(id);
      }
    }

    // Sync persistent blossom pressure plates under tiles
    const activePlateKeys = new Set<string>();
    for (const plate of state.pressurePlates) {
      const key = `${plate.x},${plate.y}`;
      activePlateKeys.add(key);
      if (!this.plateMeshes.has(key)) {
        const plateObj = this.assets.createPressurePlate();
        plateObj.position.set(plate.x, -plate.y, 0);
        this.plateMeshes.set(key, plateObj);
        this.group.add(plateObj);
      }
    }
    for (const [key, plateObj] of this.plateMeshes.entries()) {
      if (!activePlateKeys.has(key)) {
        this.group.remove(plateObj);
        this.disposeProceduralObj(plateObj);
        this.plateMeshes.delete(key);
      }
    }

    // Emit particles for tick events
    for (const ev of events) {
      switch (ev.type) {
        case 'pot_land': {
          const landed = state.grid[ev.y]?.[ev.x];
          if (landed && landed.id > 0) {
            this.potLandSquash.set(landed.id, 1);
          }
          break;
        }
        case 'dig':
          this.particles.emitDig(ev.x, ev.y);
          break;
        case 'flower':
          this.particles.emitFlower(ev.x, ev.y);
          break;
        case 'rescue': {
          this.particles.emitRescue(ev.x, ev.y);
          const rescuedMesh = this.assets.createRescuedBee();
          rescuedMesh.position.set(ev.x, -ev.y, 0.25);
          this.group.add(rescuedMesh);
          this.flyingRescuedBees.push({
            mesh: rescuedMesh,
            originX: ev.x,
            originY: -ev.y,
            age: 0,
            duration: 1.9,
            spinDir: this.rescueSpinToggle,
            prevX: ev.x,
            prevY: -ev.y
          });
          this.rescueSpinToggle *= -1;
          break;
        }
        case 'honey_collect':
          this.particles.emitHoneyCollect(ev.x, ev.y);
          break;
        case 'sticky_wings':
          this.particles.emitStickySplash(ev.x, ev.y);
          this.stickyShakeTimer = 0.35;
          break;
        case 'sticky_blocked':
          this.particles.emitStickyDrip(ev.x, -ev.y);
          this.stickyShakeTimer = 0.28;
          break;
        case 'bowl_fill':
          this.particles.emitBowlFill(ev.x, ev.y);
          break;
        case 'gate_open':
          this.particles.emitGateOpen(ev.x, ev.y);
          break;
        case 'plate_press':
          this.particles.emitPlatePress(ev.x, ev.y);
          break;
        case 'petal_gate_open':
          this.particles.emitPetalGateOpen(ev.x, ev.y);
          break;
        case 'exit_open':
          this.particles.emitExitOpen(ev.x, ev.y);
          break;
        case 'win':
          this.particles.emitWin(ev.x, ev.y);
          break;
      }
    }
  }

  update(state: GameState, tickProgress: number, dt: number): void {
    this.elapsed += dt;
    const t = THREE.MathUtils.clamp(tickProgress, 0, 1);

    // Smoothly interpolate and animate player bee
    if (this.beeMesh) {
      const isFlying = state.player.movedThisTick && t < 0.99;
      const smoothStepT = t * t * (3 - 2 * t);
      const easedT = THREE.MathUtils.lerp(t, smoothStepT, 0.35);

      this.beeWorldX = THREE.MathUtils.lerp(state.player.prevX, state.player.x, easedT);
      this.beeWorldY = THREE.MathUtils.lerp(-state.player.prevY, -state.player.y, easedT);
      const bobSpeed = isFlying ? 8.5 : 3.8;
      let hoverZ = (isFlying ? 0.27 : 0.21) + Math.sin(this.elapsed * bobSpeed) * 0.04;

      const targetYaw = FACING_YAW[state.player.facing];
      let deltaYaw = targetYaw - this.currentBeeYaw;
      while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      this.currentBeeYaw += deltaYaw * Math.min(1, dt * 15);

      const targetBasePitch = isFlying ? 0.24 : 0.08;
      this.currentBeePitch = THREE.MathUtils.lerp(
        this.currentBeePitch,
        targetBasePitch,
        Math.min(1, dt * 12)
      );
      let trickPitchOffset = 0;
      let yawOffset = 0;
      let rollZ = 0;
      this.beeMesh.scale.set(1, 1, 1);

      let trickActive = false;
      if (this.activeTrick) {
        this.activeTrick.age += dt;
        const p = Math.min(1, this.activeTrick.age / this.activeTrick.duration);
        const e = p * p * (3 - 2 * p);
        trickActive = true;

        if (this.activeTrick.type === 0) {
          // Mini-Purzelbaum (forward 360 somersault - completes full 2π seamlessly)
          hoverZ += Math.sin(p * Math.PI) * 0.42;
          trickPitchOffset = e * Math.PI * 2;
        } else if (this.activeTrick.type === 1) {
          // Fröhliche Pirouette (double spin)
          hoverZ += Math.sin(p * Math.PI) * 0.36;
          yawOffset += e * Math.PI * 4;
          rollZ = Math.sin(p * Math.PI * 4) * 0.25;
        } else {
          // Lustiger Bienen-Schwänzeltanz (bouncy hop & wiggle)
          const hop = Math.abs(Math.sin(p * Math.PI * 2));
          hoverZ += hop * 0.36;
          const sy = 1 + (hop - 0.35) * 0.22;
          const sxz = 1 / Math.sqrt(sy);
          this.beeMesh.scale.set(sxz, sy, sxz);
          rollZ = Math.sin(p * Math.PI * 6) * 0.42;
        }

        if (p >= 1) {
          this.activeTrick = null;
        }
      }

      const isSticky = state.stickyRemainingMs > 0;
      if (this.stickyShakeTimer > 0) {
        this.stickyShakeTimer = Math.max(0, this.stickyShakeTimer - dt);
        rollZ +=
          Math.sin(this.elapsed * 42) * 0.24 * (this.stickyShakeTimer / 0.35);
      }

      this.beeMesh.position.set(this.beeWorldX, this.beeWorldY, hoverZ);
      this.beeMesh.rotation.y = this.currentBeeYaw + yawOffset;
      this.beeMesh.rotation.x = this.currentBeePitch + trickPitchOffset;
      this.beeMesh.rotation.z = rollZ;

      const baseWingSpeed = trickActive ? 62 : isFlying ? 50 : 14;
      const targetWingSpeed = isSticky ? baseWingSpeed * 0.65 : baseWingSpeed;
      this.currentWingSpeed = THREE.MathUtils.lerp(
        this.currentWingSpeed,
        targetWingSpeed,
        Math.min(1, dt * 14)
      );
      this.wingPhase += dt * this.currentWingSpeed;
      const wingAmp = trickActive ? 0.52 : isFlying ? 0.48 : 0.26;

      const { leftWing, rightWing, stickyGroup } = this.beeMesh.userData as {
        leftWing?: THREE.Object3D;
        rightWing?: THREE.Object3D;
        stickyGroup?: THREE.Group;
      };
      const flap = Math.sin(this.wingPhase) * wingAmp;
      if (leftWing) leftWing.rotation.z = 0.25 + flap;
      if (rightWing) rightWing.rotation.z = -0.25 - flap;

      if (stickyGroup) {
        stickyGroup.visible = isSticky;
        if (isSticky) {
          for (const child of stickyGroup.children) {
            const { baseY, baseScale, phase } = child.userData as {
              baseY?: number;
              baseScale?: [number, number, number];
              phase?: number;
            };
            if (baseY !== undefined && baseScale && phase !== undefined) {
              const pulse = 1 + Math.sin(this.elapsed * 4.2 + phase) * 0.14;
              child.position.y = baseY + Math.sin(this.elapsed * 2.5 + phase) * 0.015;
              child.scale.set(
                baseScale[0] * pulse,
                baseScale[1] / Math.sqrt(pulse),
                baseScale[2] * pulse
              );
            }
          }
        }
      }

      if (isSticky) {
        this.stickyDripTimer += dt;
        if (this.stickyDripTimer >= 0.55) {
          this.stickyDripTimer = 0;
          this.particles.emitStickyDrip(this.beeWorldX, this.beeWorldY);
        }
      } else {
        this.stickyDripTimer = 0;
        if (this.wasSticky) {
          this.particles.emitTrickSparkle(this.beeWorldX, this.beeWorldY);
        }
      }
      this.wasSticky = isSticky;
    }

    // Animate rescued bees flying away in a joyful spiral
    for (let i = this.flyingRescuedBees.length - 1; i >= 0; i--) {
      const entry = this.flyingRescuedBees[i];
      entry.age += dt;
      if (entry.age >= entry.duration) {
        this.group.remove(entry.mesh);
        this.disposeProceduralObj(entry.mesh);
        this.flyingRescuedBees.splice(i, 1);
        continue;
      }

      const p = entry.age / entry.duration;
      const angle = entry.spinDir * p * Math.PI * 5.2;
      const radius = 0.22 + p * 1.45;
      const wx = entry.originX + Math.cos(angle) * radius;
      const wy = entry.originY + Math.sin(angle) * radius * 0.65 + p * p * 7.8;
      const wz = 0.28 + p * 5.2;

      const dx = wx - entry.prevX;
      const dy = wy - entry.prevY;
      entry.prevX = wx;
      entry.prevY = wy;

      entry.mesh.position.set(wx, wy, wz);
      if (Math.hypot(dx, dy) > 0.0001) {
        entry.mesh.rotation.y = Math.atan2(dx, -dy);
      }
      entry.mesh.rotation.x = 0.28;

      if (p > 0.8) {
        const s = Math.max(0.05, 1 - (p - 0.8) / 0.2);
        entry.mesh.scale.setScalar(s);
      }

      const { leftWing, rightWing } = entry.mesh.userData as {
        leftWing?: THREE.Object3D;
        rightWing?: THREE.Object3D;
      };
      const flap = Math.sin(this.elapsed * 52 + i * 1.7) * 0.5;
      if (leftWing) leftWing.rotation.z = 0.25 + flap;
      if (rightWing) rightWing.rotation.z = -0.25 - flap;
    }

    // Interpolate and animate grid cells
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x];
        if (cell.type === 'empty') continue;

        const obj = this.cellMeshes.get(cell.id);
        if (!obj) continue;

        if (cell.type === 'honey_liquid') {
          this.updateLiquidHoneyCell(state, cell, obj, dt);
          continue;
        }

        const wx = THREE.MathUtils.lerp(cell.prevX, cell.x, t);
        const wy = THREE.MathUtils.lerp(-cell.prevY, -cell.y, t);
        obj.position.set(wx, wy, 0);

        if (cell.type === 'honeypot') {
          if (cell.fallState === 'falling' && cell.prevX !== cell.x) {
            // Smooth 360-degree somersault when rolling sideways off a rounded wall or pot
            const rollDir = Math.sign(cell.x - cell.prevX);
            this.potLastRollDir.set(cell.id, rollDir);
            const e = t * t * (3 - 2 * t);
            obj.rotation.z = -rollDir * e * Math.PI * 2;
            obj.position.y = wy + Math.sin(t * Math.PI) * 0.16 - t * t * 0.08;
            obj.scale.set(1, 1, 1);
          } else if (cell.fallState === 'resting' && cell.prevX !== cell.x) {
            const pushDir = Math.sign(cell.x - cell.prevX);
            obj.rotation.z = -pushDir * Math.sin(t * Math.PI) * 0.12;
            obj.scale.set(1, 1, 1);
          } else if (cell.fallState === 'wobbling') {
            obj.rotation.z = Math.sin(this.elapsed * 28 + cell.id) * 0.16;
            obj.scale.set(1, 1, 1);
          } else {
            // Normalize rotation angle modulo 2*PI so a completed 360° roll never spins backwards
            let normZ = obj.rotation.z % (Math.PI * 2);
            if (normZ > Math.PI) normZ -= Math.PI * 2;
            if (normZ < -Math.PI) normZ += Math.PI * 2;

            if (cell.fallState === 'falling' && this.potLastRollDir.has(cell.id)) {
              const rd = this.potLastRollDir.get(cell.id)!;
              obj.rotation.z = -rd * Math.sin(t * Math.PI) * 0.22;
            } else {
              this.potLastRollDir.delete(cell.id);
              obj.rotation.z = THREE.MathUtils.lerp(normZ, 0, Math.min(1, dt * 14));
            }

            let sq = this.potLandSquash.get(cell.id) ?? 0;
            if (sq > 0) {
              sq = Math.max(0, sq - dt * 4.2);
              const bounce = Math.sin(sq * Math.PI) * 0.14;
              obj.scale.set(1 + bounce, 1 - bounce, 1 + bounce * 0.6);
              obj.position.y -= bounce * 0.12;
              if (sq <= 0) {
                this.potLandSquash.delete(cell.id);
                obj.scale.set(1, 1, 1);
              } else {
                this.potLandSquash.set(cell.id, sq);
              }
            } else {
              obj.scale.set(1, 1, 1);
            }
          }
        } else if (cell.type === 'flower') {
          obj.position.z = 0.06 + Math.sin(this.elapsed * 3.2 + cell.id) * 0.04;
          obj.rotation.z = Math.sin(this.elapsed * 2 + cell.id) * 0.12;
        } else if (cell.type === 'trapped_bee') {
          obj.position.z = 0.08 + Math.sin(this.elapsed * 3.8 + cell.id) * 0.05;
          const { miniBee } = obj.userData as { miniBee?: THREE.Object3D };
          if (miniBee) {
            miniBee.rotation.y = Math.sin(this.elapsed * 2.5 + cell.id) * 0.45;
            const { leftWing, rightWing } = miniBee.userData as {
              leftWing?: THREE.Object3D;
              rightWing?: THREE.Object3D;
            };
            const flap = Math.sin(this.elapsed * 30 + cell.id) * 0.35;
            if (leftWing) leftWing.rotation.z = 0.2 + flap;
            if (rightWing) rightWing.rotation.z = -0.2 - flap;
          }
        } else if (cell.type === 'honey_source') {
          const { hangingDrop, hangingBubbler, dripNeck } = obj.userData as {
            hangingDrop?: THREE.Object3D;
            hangingBubbler?: THREE.Object3D;
            dripNeck?: THREE.Object3D;
          };
          if (hangingDrop) {
            const belowCell = state.grid[cell.y + 1]?.[cell.x];
            const playerBelow = state.player.x === cell.x && state.player.y === cell.y + 1;
            const canDrip = belowCell?.type === 'empty' || playerBelow;

            if (canDrip) {
              const cycle = (this.elapsed * 0.68 + cell.id * 0.37) % 1;
              const stretch = Math.pow(cycle, 1.35);
              const dropRadius = THREE.MathUtils.lerp(0.08, 0.175, stretch);
              const dropY = THREE.MathUtils.lerp(-0.34, -0.52, stretch);
              const sway = Math.sin(this.elapsed * 8.5 + cell.id);
              const breathe = Math.sin(this.elapsed * 6.0 + cell.id * 1.4);

              hangingDrop.position.set(sway * 0.032 * stretch, dropY, 0.01);
              hangingDrop.rotation.z = -sway * 0.18 * stretch;
              hangingDrop.scale.set(
                dropRadius * (0.94 + breathe * 0.14),
                dropRadius * (1.18 - breathe * 0.14),
                dropRadius * 0.94
              );

              const spoutY = -0.28;
              const dropTopY = dropY + dropRadius * 0.65;
              if (dripNeck) {
                const neckLen = Math.max(0.04, spoutY - dropTopY);
                dripNeck.visible = spoutY > dropTopY + 0.01;
                dripNeck.position.set(hangingDrop.position.x * 0.45, (spoutY + dropTopY) * 0.5, 0);
                dripNeck.rotation.z = Math.atan2(
                  hangingDrop.position.x,
                  Math.max(0.1, spoutY - dropTopY)
                );
                const neckThickness =
                  THREE.MathUtils.lerp(1.15, 0.62, stretch) * (1 + breathe * 0.12);
                dripNeck.scale.set(neckThickness, neckLen, neckThickness);
              }

              if (hangingBubbler) {
                hangingBubbler.visible = true;
                const bubR =
                  dropRadius * (0.56 + 0.18 * Math.sin(this.elapsed * 7.4 + cell.id + 1.2));
                hangingBubbler.position.set(
                  hangingDrop.position.x +
                    Math.cos(this.elapsed * 4.6 + cell.id) * dropRadius * 0.72,
                  dropY + 0.04 + Math.sin(this.elapsed * 5.4 + cell.id) * dropRadius * 0.48,
                  0.05
                );
                hangingBubbler.scale.set(bubR * 1.08, bubR * 0.94, bubR);
              }
            } else {
              const pulse = 1 + Math.sin(this.elapsed * 2.4 + cell.id) * 0.06;
              hangingDrop.position.set(0, -0.37, 0);
              hangingDrop.rotation.z = 0;
              hangingDrop.scale.set(0.14 * pulse, 0.16 / pulse, 0.14 * pulse);
              if (dripNeck) {
                dripNeck.visible = true;
                dripNeck.position.set(0, -0.31, 0);
                dripNeck.rotation.z = 0;
                dripNeck.scale.set(1.1, 0.09, 1.1);
              }
              if (hangingBubbler) {
                hangingBubbler.visible = true;
                const bubPulse = 0.078 + Math.sin(this.elapsed * 3.1 + cell.id + 0.9) * 0.018;
                hangingBubbler.position.set(
                  Math.cos(this.elapsed * 2.2 + cell.id) * 0.085,
                  -0.35 + Math.sin(this.elapsed * 2.7 + cell.id) * 0.03,
                  0.045
                );
                hangingBubbler.scale.set(bubPulse * 1.06, bubPulse * 0.94, bubPulse);
              }
            }
          }
        } else if (cell.type === 'exit') {
          const {
            lidGroup,
            amberBedMat,
            amberHazeMat,
            amberLight,
            sparkleGroup
          } = obj.userData as {
            lidGroup?: THREE.Object3D;
            amberBedMat?: THREE.MeshStandardMaterial;
            amberHazeMat?: THREE.MeshBasicMaterial;
            amberLight?: THREE.PointLight;
            sparkleGroup?: THREE.Group;
          };
          const targetAngle = state.exitOpen ? -1.55 : 0;
          if (lidGroup) {
            lidGroup.rotation.x = THREE.MathUtils.lerp(
              lidGroup.rotation.x,
              targetAngle,
              Math.min(1, dt * 8)
            );
          }

          const shimmer = 0.5 + 0.5 * Math.sin(this.elapsed * 4.2);
          const blend = Math.min(1, dt * 7);

          if (amberBedMat) {
            const targetEmissive = state.exitOpen ? 1.55 + shimmer * 0.35 : 0;
            amberBedMat.emissiveIntensity = THREE.MathUtils.lerp(
              amberBedMat.emissiveIntensity,
              targetEmissive,
              blend
            );
          }
          if (amberHazeMat) {
            const targetHaze = state.exitOpen ? 0.36 + shimmer * 0.18 : 0;
            amberHazeMat.opacity = THREE.MathUtils.lerp(
              amberHazeMat.opacity,
              targetHaze,
              blend
            );
          }
          if (amberLight) {
            const targetLight = state.exitOpen ? 2.1 + shimmer * 0.7 : 0;
            amberLight.intensity = THREE.MathUtils.lerp(
              amberLight.intensity,
              targetLight,
              blend
            );
          }
          if (sparkleGroup) {
            sparkleGroup.visible = state.exitOpen;
            if (state.exitOpen) {
              for (const child of sparkleGroup.children) {
                const { baseX, baseZ, phase, speed, mat } = child.userData as {
                  baseX: number;
                  baseZ: number;
                  phase: number;
                  speed: number;
                  mat: THREE.MeshBasicMaterial;
                };
                const cycle = (this.elapsed * speed + phase) % 1;
                child.position.set(
                  baseX + Math.sin(this.elapsed * 3.1 + phase) * 0.04,
                  0.02 + cycle * 0.38,
                  baseZ
                );
                child.rotation.y += dt * 4;
                child.rotation.z += dt * 3;
                const twinkle = Math.sin(cycle * Math.PI);
                mat.opacity = 0.2 + twinkle * 0.75;
                child.scale.setScalar(0.65 + twinkle * 0.55);
              }
            }
          }

          if (state.exitOpen) {
            this.suitcaseGlintTimer += dt;
            if (this.suitcaseGlintTimer >= 0.24) {
              this.suitcaseGlintTimer = 0;
              this.particles.emitSuitcaseAmberGlint(cell.x, cell.y);
            }
          } else {
            this.suitcaseGlintTimer = 0;
          }
        } else if (cell.type === 'honey_bowl') {
          if (cell.fallState === 'wobbling') {
            obj.rotation.z = Math.sin(this.elapsed * 24 + cell.id) * 0.11;
          } else {
            obj.rotation.z = THREE.MathUtils.lerp(obj.rotation.z, 0, Math.min(1, dt * 14));
          }
          const { fillGroup, fillBlobs } = obj.userData as {
            fillGroup?: THREE.Group;
            fillBlobs?: THREE.Mesh[];
          };
          if (fillGroup) {
            if (cell.filled) {
              fillGroup.visible = true;
              const s = THREE.MathUtils.lerp(
                fillGroup.scale.x,
                1,
                Math.min(1, dt * 8)
              );
              fillGroup.scale.setScalar(s);
              if (fillBlobs) {
                for (let i = 0; i < fillBlobs.length; i++) {
                  const b = fillBlobs[i];
                  const wave = this.elapsed * (1.8 + i * 0.45) + cell.id + i * 2.1;
                  const bx = (i === 0 ? -0.11 : 0.12) + Math.sin(wave) * 0.04;
                  const bz = (i === 0 ? 0.06 : -0.05) + Math.cos(wave * 1.1) * 0.04;
                  const p = 1 + Math.sin(wave * 1.4) * 0.14;
                  b.position.set(bx, 0.05, bz);
                  b.scale.set(0.13 * p, 0.09 / Math.sqrt(p), 0.13 * p);
                }
              }
            } else {
              fillGroup.visible = false;
              fillGroup.scale.setScalar(0.01);
            }
          }
        } else if (cell.type === 'honey_gate' || cell.type === 'petal_gate') {
          const { crestMesh } = obj.userData as { crestMesh?: THREE.Object3D };
          if (crestMesh) {
            const p = 1 + Math.sin(this.elapsed * 2.8 + cell.id) * 0.06;
            crestMesh.scale.setScalar(p);
          }
        }
      }
    }

    for (const plate of state.pressurePlates) {
      const plateObj = this.plateMeshes.get(`${plate.x},${plate.y}`);
      if (!plateObj) continue;
      const { padGroup, glowMat } = plateObj.userData as {
        padGroup?: THREE.Group;
        glowMat?: THREE.MeshStandardMaterial;
      };
      if (padGroup) {
        const targetY = plate.pressed ? -0.425 : -0.37;
        padGroup.position.y = THREE.MathUtils.lerp(
          padGroup.position.y,
          targetY,
          Math.min(1, dt * 16)
        );
      }
      if (glowMat) {
        const targetEmissive = plate.pressed
          ? 0.72 + Math.sin(this.elapsed * 5) * 0.14
          : 0.2 + Math.sin(this.elapsed * 2.4) * 0.08;
        glowMat.emissiveIntensity = THREE.MathUtils.lerp(
          glowMat.emissiveIntensity,
          targetEmissive,
          Math.min(1, dt * 12)
        );
      }
    }

    this.particles.update(dt);
  }

  private isHoneyLike(state: GameState, x: number, y: number): boolean {
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
      return false;
    }
    const type = state.grid[y][x].type;
    return type === 'honey_liquid' || type === 'honey_source';
  }

  private updateLiquidHoneyCell(
    state: GameState,
    cell: Cell,
    obj: THREE.Group,
    dt: number
  ): void {
    const { blobCluster, blobs, bridges, dripThread, dripBulb, dripBubbler } = obj.userData as {
      blobCluster?: THREE.Group;
      blobs?: THREE.Mesh[];
      bridges?: {
        left: THREE.Mesh;
        right: THREE.Mesh;
        up: THREE.Mesh;
        down: THREE.Mesh;
      };
      dripThread?: THREE.Mesh;
      dripBulb?: THREE.Mesh;
      dripBubbler?: THREE.Mesh;
    };

    if (!blobCluster || !blobs || !bridges || !dripThread || !dripBulb) {
      obj.position.set(cell.x, -cell.y, 0);
      return;
    }

    // 1. Continuous 4-blob organic ooze & breathing motion
    const seed = cell.id * 1.6180339;
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const m = blob.userData.motion as HoneyBlobMotion | undefined;
      if (!m) continue;
      const bx = Math.sin(this.elapsed * m.freqX + seed + m.phaseX) * m.orbitX;
      const by = Math.cos(this.elapsed * m.freqY + seed * 1.3 + m.phaseY) * m.orbitY;
      const bz = m.baseZ + Math.sin(this.elapsed * m.freqZ + seed + m.phaseX) * 0.03;
      const stretch = 1 + Math.sin(this.elapsed * m.pulseFreq + seed + m.phaseP) * 0.1;
      const bsx = m.rx * stretch;
      const bsy = m.ry / Math.sqrt(stretch);
      blob.position.set(bx, by, bz);
      blob.scale.set(bsx, bsy, m.rz);
    }

    // 2. Default transform values
    let wx = cell.x;
    let wy = -cell.y;
    let sx = 1;
    let sy = 1;
    let sz = 1;
    let clusterOffsetY = 0;
    let clusterRotZ = 0;

    dripThread.visible = false;
    dripThread.position.x = 0;
    dripThread.rotation.z = 0;
    dripBulb.visible = false;
    dripBulb.rotation.z = 0;
    if (dripBubbler) {
      dripBubbler.visible = false;
    }

    // 3. Active flow/drip transition between tiles
    const tr = this.honeyTransitions.get(cell.id);
    let trP = 1;
    let overrideParentSide: 'left' | 'right' | null = null;
    let sideSpawnE = 1;
    let parentLocalX = 0;

    if (tr) {
      tr.age += dt;
      trP = Math.min(1, tr.age / tr.duration);
      const p = trP;

      if (tr.kind === 'side_spawn') {
        const flowDir = Math.sign(tr.toX - tr.fromX);
        const s = p * p * (3 - 2 * p);
        const e = Math.pow(s, 1.15);
        sideSpawnE = e;

        wx = THREE.MathUtils.lerp(tr.fromX + flowDir * 0.25, tr.toX, e);
        wy = -tr.toY - Math.sin(p * Math.PI) * 0.06;

        sx = THREE.MathUtils.lerp(0.42, 1.0, e) + Math.sin(p * Math.PI) * 0.24;
        sy =
          THREE.MathUtils.lerp(0.42, 1.0, Math.pow(p, 0.85)) -
          Math.sin(p * Math.PI) * 0.08;
        sz = THREE.MathUtils.lerp(0.48, 1.0, e);

        for (const blob of blobs) {
          const m = blob.userData.motion as HoneyBlobMotion | undefined;
          if (m) {
            blob.position.x += flowDir * (1 - e) * m.leadBias;
          }
        }

        overrideParentSide = flowDir > 0 ? 'left' : 'right';
        parentLocalX = tr.fromX - wx;
      } else if (tr.kind === 'side_drain') {
        const flowDir = Math.sign(tr.toX - tr.fromX);
        const e = p * p * (3 - 2 * p);
        wx = THREE.MathUtils.lerp(tr.fromX, tr.toX, e);
        wy = -tr.toY - Math.pow(p, 2.2) * 0.08;
        sx = 1 + Math.sin(p * Math.PI) * 0.28;
        sy = 1 - Math.sin(p * Math.PI) * 0.16;
        clusterRotZ = -flowDir * Math.sin(p * Math.PI) * 0.18;
      } else {
        // 'drop' or 'source_drip'
        if (p < 0.78) {
          const fp = p / 0.78;
          const fallE = fp * fp * (2.1 - 1.1 * fp);
          const startY = tr.kind === 'source_drip' ? -tr.fromY - 0.26 : -tr.fromY;

          const stretch = Math.sin(fp * Math.PI);
          const base =
            tr.kind === 'source_drip'
              ? THREE.MathUtils.lerp(0.62, 1.0, Math.min(1, fp / 0.55))
              : 1.0;

          const fallBreathe = Math.sin(this.elapsed * 11.0 + seed) * 0.13;
          const fallWobble = Math.sin(this.elapsed * 8.5 + seed * 1.3) * 0.045;

          wx = tr.toX + fallWobble * stretch;
          wy = THREE.MathUtils.lerp(startY, -tr.toY, fallE);

          sx = base * (1 - stretch * 0.15 + fallBreathe);
          sy = base * (1 + stretch * 0.26 - fallBreathe * 0.85);
          sz = base * (1 - stretch * 0.07 + fallBreathe * 0.45);
          clusterRotZ = -fallWobble * 2.5 * stretch;

          for (let i = 0; i < blobs.length; i++) {
            blobs[i].position.x +=
              Math.sin(this.elapsed * 4.8 + seed + i * 2.1) * 0.055 * stretch;
            blobs[i].position.y +=
              Math.cos(this.elapsed * 5.4 + seed + i * 1.7) * 0.065 * stretch;
          }

          if (fp < 0.88) {
            const topLocalY =
              -tr.fromY - wy - (tr.kind === 'source_drip' ? 0.28 : 0.1);
            const bottomLocalY = 0.14;
            if (topLocalY > bottomLocalY + 0.04) {
              dripThread.visible = true;
              dripThread.position.set(
                -fallWobble * stretch * 0.45,
                (topLocalY + bottomLocalY) * 0.5,
                0
              );
              dripThread.rotation.z = -fallWobble * 1.3;
              const radiusScale =
                Math.max(0.25, (1 - fp / 0.88) * 1.15) *
                (1 + Math.sin(this.elapsed * 9 + seed) * 0.14);
              dripThread.scale.set(radiusScale, topLocalY - bottomLocalY, radiusScale);
            }
          }

          if (dripBubbler && fp < 0.92) {
            const bubR =
              base * (0.115 + 0.04 * Math.sin(this.elapsed * 9.5 + seed + 0.8));
            const bubBreathe = 1 + Math.sin(this.elapsed * 8.2 + seed) * 0.14;
            dripBubbler.visible = true;
            dripBubbler.position.set(
              Math.sin(this.elapsed * 6.5 + seed) * 0.15,
              0.14 + Math.cos(this.elapsed * 5.4 + seed) * 0.13,
              0.07
            );
            dripBubbler.scale.set(bubR * bubBreathe, bubR / Math.sqrt(bubBreathe), bubR);
          }
        } else {
          const lp = (p - 0.78) / 0.22;
          wx = tr.toX;
          wy = -tr.toY;
          if (cell.fallState === 'resting') {
            const sq = Math.sin(lp * Math.PI) * (1 - lp * 0.3);
            sx = 1 + sq * 0.26;
            sy = 1 - sq * 0.24;
            sz = 1 + sq * 0.14;
            clusterOffsetY = -sq * 0.08;
          } else {
            const contBreathe = Math.sin(this.elapsed * 10 + seed) * 0.1;
            const contWobble = Math.sin(this.elapsed * 8 + seed * 1.3) * 0.03;
            sx = 0.96 + contBreathe;
            sy = 1.06 - contBreathe;
            sz = 0.98 + contBreathe * 0.5;
            clusterRotZ = -contWobble * 2.0;

            if (dripBubbler) {
              const bubR = 0.11 + 0.035 * Math.sin(this.elapsed * 8.8 + seed);
              const bubBreathe = 1 + Math.sin(this.elapsed * 7.6 + seed) * 0.12;
              dripBubbler.visible = true;
              dripBubbler.position.set(
                Math.sin(this.elapsed * 6.0 + seed) * 0.14,
                0.08 + Math.cos(this.elapsed * 5.2 + seed) * 0.11,
                0.065
              );
              dripBubbler.scale.set(bubR * bubBreathe, bubR / Math.sqrt(bubBreathe), bubR);
            }
          }
        }
      }
    }

    // 4. Swelling hanging droplet before falling
    const hasActiveTr = tr !== undefined && trP < 1;
    const isSidePreWobble =
      hasActiveTr &&
      (tr!.kind === 'side_spawn' || tr!.kind === 'side_drain') &&
      trP > 0.65;

    if (cell.fallState === 'wobbling' && (!hasActiveTr || isSidePreWobble)) {
      let we: number;
      if (isSidePreWobble) {
        we = ((trP - 0.65) / 0.35) * 0.45;
        this.honeyWobbleTime.set(
          cell.id,
          Math.max(this.honeyWobbleTime.get(cell.id) ?? 0, 0.3)
        );
      } else {
        const wobbleAge = (this.honeyWobbleTime.get(cell.id) ?? 0) + dt;
        this.honeyWobbleTime.set(cell.id, wobbleAge);
        const w = THREE.MathUtils.clamp(wobbleAge / 0.68, 0, 1);
        we = 1 - (1 - w) * (1 - w);
      }

      const bulbY = -0.26 - we * 0.36;
      const bulbR = 0.065 + we * 0.115;
      const wobbleWave = Math.sin(this.elapsed * 9.5 + seed);
      const breatheWave = Math.sin(this.elapsed * 6.4 + seed * 1.7);
      const bulbX = wobbleWave * 0.048 * (0.45 + we * 0.55);

      dripBulb.visible = true;
      dripBulb.position.set(bulbX, bulbY, 0.02);
      dripBulb.rotation.z = -wobbleWave * 0.22;
      dripBulb.scale.set(
        bulbR * (0.94 + breatheWave * 0.15),
        bulbR * (1.22 - breatheWave * 0.15),
        bulbR * (0.94 + breatheWave * 0.08)
      );

      const topY = -0.14;
      const bottomY = bulbY + bulbR * 0.4;
      dripThread.visible = true;
      dripThread.position.set(bulbX * 0.45, (topY + bottomY) * 0.5, 0.01);
      dripThread.rotation.z = Math.atan2(bulbX, Math.max(0.12, topY - bottomY));
      const threadRadius =
        (1.15 - we * 0.42) * (1 + Math.sin(this.elapsed * 7.8 + seed) * 0.15);
      dripThread.scale.set(
        threadRadius,
        Math.max(0.05, topY - bottomY),
        threadRadius
      );

      if (dripBubbler) {
        const bubR =
          bulbR * (0.6 + 0.18 * Math.sin(this.elapsed * 7.2 + seed + 1.5));
        const bubBreathe = 1 + Math.sin(this.elapsed * 6.8 + seed + 0.5) * 0.14;
        dripBubbler.visible = true;
        dripBubbler.position.set(
          bulbX + Math.cos(this.elapsed * 4.8 + seed) * bulbR * 0.78,
          bulbY + 0.06 + Math.sin(this.elapsed * 5.6 + seed * 1.4) * bulbR * 0.56,
          0.06
        );
        dripBubbler.scale.set(bubR * bubBreathe, bubR / Math.sqrt(bubBreathe), bubR);
      }

      clusterOffsetY -= we * 0.05;
      sy *= 1 + we * 0.08;
      sx *= 1 - we * 0.04;
    } else if (cell.fallState !== 'wobbling') {
      this.honeyWobbleTime.set(cell.id, 0);
    }

    // 5. Dynamic neighbor fusion bridges
    const inAirDrop =
      hasActiveTr &&
      trP < 0.75 &&
      (tr!.kind === 'drop' || tr!.kind === 'source_drip');
    const inSourceAirDrop = hasActiveTr && trP < 0.75 && tr!.kind === 'source_drip';

    const targetLeft =
      !inAirDrop && this.isHoneyLike(state, cell.x - 1, cell.y) ? 1 : 0;
    const targetRight =
      !inAirDrop && this.isHoneyLike(state, cell.x + 1, cell.y) ? 1 : 0;
    const targetUp =
      !inSourceAirDrop && this.isHoneyLike(state, cell.x, cell.y - 1) ? 1 : 0;
    const targetDown =
      !inAirDrop && this.isHoneyLike(state, cell.x, cell.y + 1) ? 1 : 0;

    let blend = this.honeyBridgeBlend.get(cell.id);
    if (!blend) {
      blend = {
        left: targetLeft,
        right: targetRight,
        up: targetUp,
        down: targetDown
      };
      this.honeyBridgeBlend.set(cell.id, blend);
    } else {
      const k = Math.min(1, dt * 8);
      blend.left = THREE.MathUtils.lerp(blend.left, targetLeft, k);
      blend.right = THREE.MathUtils.lerp(blend.right, targetRight, k);
      blend.up = THREE.MathUtils.lerp(blend.up, targetUp, k);
      blend.down = THREE.MathUtils.lerp(blend.down, targetDown, k);
    }

    const applyHorizBridge = (
      side: 'left' | 'right',
      bridge: THREE.Mesh,
      sign: number,
      value: number
    ) => {
      const bp = seed + (sign > 0 ? 1.1 : 3.4);
      if (overrideParentSide === side) {
        bridge.visible = true;
        bridge.position.set(
          parentLocalX * 0.52,
          Math.sin(this.elapsed * 3.2 + bp) * 0.025,
          0
        );
        bridge.rotation.z = Math.sin(this.elapsed * 2.6 + bp) * 0.08;
        bridge.scale.set(
          Math.max(0.26, Math.abs(parentLocalX) * 0.5),
          0.15 + 0.06 * sideSpawnE,
          0.16 + 0.06 * sideSpawnE
        );
      } else if (value > 0.04) {
        const driftX = Math.sin(this.elapsed * 1.15 + bp) * 0.045;
        const driftY = Math.cos(this.elapsed * 1.55 + bp * 1.2) * 0.055;
        const driftZ = Math.sin(this.elapsed * 1.05 + bp) * 0.025;
        const breathe = 1 + Math.sin(this.elapsed * 1.9 + bp) * 0.13;
        bridge.visible = true;
        bridge.position.set(sign * 0.48 + driftX, driftY, driftZ);
        bridge.rotation.z = Math.sin(this.elapsed * 1.4 + bp) * 0.14;
        bridge.scale.set(
          0.3 * value * breathe,
          (0.2 * value) / Math.sqrt(breathe),
          0.21 * value * (0.94 + 0.06 * Math.cos(this.elapsed * 1.7 + bp))
        );
      } else {
        bridge.visible = false;
        bridge.rotation.z = 0;
      }
    };

    const applyVertBridge = (bridge: THREE.Mesh, sign: number, value: number) => {
      const bp = seed + (sign > 0 ? 2.2 : 4.7);
      if (value > 0.04) {
        const driftX = Math.sin(this.elapsed * 1.45 + bp) * 0.048;
        const driftY = Math.cos(this.elapsed * 1.25 + bp * 1.1) * 0.045;
        const driftZ = Math.sin(this.elapsed * 1.1 + bp) * 0.025;
        const breathe = 1 + Math.sin(this.elapsed * 1.85 + bp) * 0.13;
        bridge.visible = true;
        bridge.position.set(driftX, sign * 0.48 + driftY, driftZ);
        bridge.rotation.z = Math.sin(this.elapsed * 1.35 + bp) * 0.13;
        bridge.scale.set(
          (0.18 * value) / Math.sqrt(breathe),
          0.3 * value * breathe,
          0.2 * value * (0.94 + 0.06 * Math.cos(this.elapsed * 1.65 + bp))
        );
      } else {
        bridge.visible = false;
        bridge.rotation.z = 0;
      }
    };

    applyHorizBridge('left', bridges.left, -1, blend.left);
    applyHorizBridge('right', bridges.right, 1, blend.right);
    applyVertBridge(bridges.up, 1, blend.up);
    applyVertBridge(bridges.down, -1, blend.down);

    // 6. Apply transforms
    obj.position.set(wx, wy, 0);
    blobCluster.position.y = clusterOffsetY;
    blobCluster.scale.set(sx, sy, sz);
    blobCluster.rotation.z = clusterRotZ;

    if (tr && trP >= 1) {
      this.honeyTransitions.delete(cell.id);
    }
  }

  getBeeWorldPosition(): { x: number; y: number } {
    return { x: this.beeWorldX, y: this.beeWorldY };
  }

  private disposeProceduralObj(obj: THREE.Object3D): void {
    if (obj.userData.isCustomModel) return;
    if (obj.userData.glowMat instanceof THREE.Material) {
      obj.userData.glowMat.dispose();
    }
    if (Array.isArray(obj.userData.disposableMaterials)) {
      for (const mat of obj.userData.disposableMaterials as THREE.Material[]) {
        mat.dispose();
      }
    }
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && !mesh.userData.sharedGeo) {
        mesh.geometry.dispose();
      }
    });
  }

  reset(): void {
    for (const obj of this.cellMeshes.values()) {
      this.group.remove(obj);
      this.disposeProceduralObj(obj);
    }
    this.cellMeshes.clear();
    for (const plateObj of this.plateMeshes.values()) {
      this.group.remove(plateObj);
      this.disposeProceduralObj(plateObj);
    }
    this.plateMeshes.clear();
    this.honeyTransitions.clear();
    this.honeyWobbleTime.clear();
    this.honeyBridgeBlend.clear();
    this.potLandSquash.clear();
    this.potLastRollDir.clear();
    this.lastSyncedTick = -1;

    if (this.beeMesh) {
      this.group.remove(this.beeMesh);
      this.disposeProceduralObj(this.beeMesh);
      this.beeMesh = null;
    }

    for (const entry of this.flyingRescuedBees) {
      this.group.remove(entry.mesh);
      this.disposeProceduralObj(entry.mesh);
    }
    this.flyingRescuedBees = [];
    this.wingPhase = 0;
    this.currentWingSpeed = 14;
    this.currentBeePitch = 0.08;
    this.suitcaseGlintTimer = 0;
    this.activeTrick = null;
    this.nextTrickIndex = 0;
    this.stickyDripTimer = 0;
    this.stickyShakeTimer = 0;
    this.wasSticky = false;

    this.particles.clear();
  }
}
