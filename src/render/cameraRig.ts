import * as THREE from 'three';
import { Direction } from '../game/types';

export interface ExitScreenHint {
  offscreen: boolean;
  screenX: number;
  screenY: number;
  angleDeg: number;
}

const FACING_LOOKAHEAD: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 0.42 },
  down: { x: 0, y: -0.42 },
  left: { x: -0.45, y: 0 },
  right: { x: 0.45, y: 0 }
};

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;

  private levelWidth = 11;
  private levelHeight = 7;
  private staticMode = true;
  private aspect = 16 / 9;

  private focusX = 0;
  private focusY = 0;
  private zDist = 14;
  private tiltYOffset = -1.25;

  constructor(width: number, height: number) {
    this.aspect = Math.max(width, 1) / Math.max(height, 1);
    this.camera = new THREE.PerspectiveCamera(38, this.aspect, 0.5, 100);
  }

  configure(levelWidth: number, levelHeight: number, startX: number, startY: number): void {
    this.levelWidth = levelWidth;
    this.levelHeight = levelHeight;
    this.staticMode = levelWidth <= 13 && levelHeight <= 9;
    this.recomputeDistance();

    if (this.staticMode) {
      this.focusX = (levelWidth - 1) / 2;
      this.focusY = -(levelHeight - 1) / 2 + 0.42;
      this.tiltYOffset = -1.1;
    } else {
      this.tiltYOffset = -1.35;
      const clamped = this.clampFocus(startX, -startY);
      this.focusX = clamped.x;
      this.focusY = clamped.y;
    }

    this.applyCameraTransform();
  }

  setAspect(width: number, height: number): void {
    this.aspect = Math.max(width, 1) / Math.max(height, 1);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.recomputeDistance();
    if (this.staticMode) {
      this.focusX = (this.levelWidth - 1) / 2;
      this.focusY = -(this.levelHeight - 1) / 2 + 0.42;
    } else {
      const clamped = this.clampFocus(this.focusX, this.focusY);
      this.focusX = clamped.x;
      this.focusY = clamped.y;
    }
    this.applyCameraTransform();
  }

  private recomputeDistance(): void {
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));

    if (this.staticMode) {
      const neededHeight = this.levelHeight + 2.65;
      const neededWidth = this.levelWidth + 1.8;
      const distForHeight = neededHeight / 2 / tanHalfFov;
      const distForWidth = neededWidth / 2 / (tanHalfFov * this.aspect);
      this.zDist = Math.max(distForHeight, distForWidth, 10.5);
    } else {
      const viewTilesH = 9.8;
      const viewTilesW = 14.5;
      const distH = viewTilesH / 2 / tanHalfFov;
      const distW = viewTilesW / 2 / (tanHalfFov * this.aspect);
      this.zDist = Math.max(distH, distW, 13.0);
    }
  }

  private clampFocus(targetX: number, targetY: number): { x: number; y: number } {
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfH = this.zDist * tanHalfFov;
    const halfW = halfH * this.aspect;

    const boardCenterX = (this.levelWidth - 1) / 2;
    const boardCenterY = -(this.levelHeight - 1) / 2;

    const minX = halfW - 1.1;
    const maxX = this.levelWidth - 1 - halfW + 1.1;
    const clampedX =
      minX >= maxX ? boardCenterX : THREE.MathUtils.clamp(targetX, minX, maxX);

    const minY = -(this.levelHeight - 1) + halfH - 1.2;
    const maxY = -halfH + 1.5;
    const clampedY =
      minY >= maxY ? boardCenterY : THREE.MathUtils.clamp(targetY, minY, maxY);

    return { x: clampedX, y: clampedY };
  }

  update(dt: number, beeWorldX: number, beeWorldY: number, facing: Direction): void {
    if (this.staticMode) {
      this.applyCameraTransform();
      return;
    }

    const ahead = FACING_LOOKAHEAD[facing];
    const desired = this.clampFocus(beeWorldX + ahead.x, beeWorldY + ahead.y);
    const alpha = 1 - Math.exp(-6.5 * Math.min(dt, 0.1));

    this.focusX = THREE.MathUtils.lerp(this.focusX, desired.x, alpha);
    this.focusY = THREE.MathUtils.lerp(this.focusY, desired.y, alpha);
    this.applyCameraTransform();
  }

  private applyCameraTransform(): void {
    this.camera.position.set(this.focusX, this.focusY + this.tiltYOffset, this.zDist);
    this.camera.lookAt(this.focusX, this.focusY, 0);
  }

  getExitScreenHint(
    exitGridX: number,
    exitGridY: number,
    viewportW: number,
    viewportH: number
  ): ExitScreenHint {
    const pos = new THREE.Vector3(exitGridX, -exitGridY, 0.35);
    pos.project(this.camera);

    const inBounds = Math.abs(pos.x) <= 0.9 && Math.abs(pos.y) <= 0.88 && pos.z < 1;
    if (inBounds) {
      return { offscreen: false, screenX: 0, screenY: 0, angleDeg: 0 };
    }

    let nx = pos.x;
    let ny = pos.y;
    if (pos.z > 1) {
      nx = -nx;
      ny = -ny;
    }

    const angle = Math.atan2(-ny, nx);
    const rawX = (nx * 0.5 + 0.5) * viewportW;
    const rawY = (-ny * 0.5 + 0.5) * viewportH;

    const screenX = THREE.MathUtils.clamp(rawX, 56, viewportW - 56);
    const screenY = THREE.MathUtils.clamp(rawY, 96, viewportH - 42);

    return {
      offscreen: true,
      screenX,
      screenY,
      angleDeg: THREE.MathUtils.radToDeg(angle)
    };
  }

  projectTileToNdc(gridX: number, gridY: number): { ndcX: number; ndcY: number } {
    const pos = new THREE.Vector3(gridX, -gridY, 0.35);
    pos.project(this.camera);
    return {
      ndcX: THREE.MathUtils.clamp(pos.x, -0.9, 0.9),
      ndcY: THREE.MathUtils.clamp(pos.y, -0.85, 0.85)
    };
  }
}
