import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  gravity: number;
  spin: number;
}

const PARTICLE_GEO = new THREE.SphereGeometry(0.085, 8, 6);

export class ParticleSystem {
  readonly group = new THREE.Group();
  private particles: Particle[] = [];

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    colors: number[],
    speed: number,
    gravity = 4.2,
    maxAge = 0.65,
    scale = 1
  ): void {
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(PARTICLE_GEO, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale * (0.7 + Math.random() * 0.6));

      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.75);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd + 1.2;
      const vz = 0.6 + Math.random() * 1.4;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        age: 0,
        maxAge: maxAge * (0.8 + Math.random() * 0.35),
        gravity,
        spin: (Math.random() - 0.5) * 6
      });
    }
  }

  emitDig(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.25, 7, [0xf6c344, 0xffe285, 0xdd9b1e], 2.2, 3.5, 0.45, 0.85);
  }

  emitFlower(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.35, 12, [0xffd54f, 0xf89cb0, 0xffffff, 0x98df82], 2.8, 2.2, 0.68, 1.05);
  }

  emitRescue(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.4, 16, [0xff85a1, 0xffe066, 0xffffff, 0xf7b2bd], 3.2, -1.2, 0.85, 1.15);
  }

  emitHoneyCollect(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.3, 10, [0xffb300, 0xffe270, 0xffd000], 2.5, 3.2, 0.55, 0.95);
  }

  emitExitOpen(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.45, 18, [0xffe066, 0xa7e49e, 0xffffff], 3.4, 0.5, 0.95, 1.2);
  }

  emitSuitcaseAmberGlint(gridX: number, gridY: number): void {
    this.spawnBurst(
      gridX + (Math.random() - 0.5) * 0.4,
      -gridY + 0.05,
      0.34,
      2,
      [0xffae24, 0xffe066, 0xff8c00],
      0.55,
      -1.1,
      0.9,
      0.58
    );
  }

  emitWin(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.5, 28, [0xffd54f, 0xf89cb0, 0x6ac266, 0x70d6ff, 0xffffff], 4.4, 2.8, 1.15, 1.3);
  }

  emitTrickSparkle(worldX: number, worldY: number): void {
    this.spawnBurst(worldX, worldY, 0.35, 8, [0xffe066, 0xf89cb0, 0xffffff, 0xffae24], 2.4, 0.8, 0.58, 0.9);
  }

  emitStickySplash(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.35, 9, [0xffb300, 0xffae08, 0xffe270], 2.6, 3.8, 0.55, 0.92);
  }

  emitStickyDrip(worldX: number, worldY: number): void {
    this.spawnBurst(
      worldX + (Math.random() - 0.5) * 0.22,
      worldY - 0.1,
      0.24,
      2,
      [0xffae08, 0xffc933],
      0.45,
      4.8,
      0.52,
      0.65
    );
  }

  emitBowlFill(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.38, 12, [0xffae08, 0xffe066, 0xffffff], 2.8, 2.4, 0.72, 1.0);
  }

  emitGateOpen(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY, 0.42, 18, [0xffe066, 0x6ac266, 0xa7e49e, 0xffffff], 3.4, 1.4, 0.88, 1.15);
  }

  emitPlatePress(gridX: number, gridY: number): void {
    this.spawnBurst(gridX, -gridY - 0.15, 0.36, 12, [0xf46d91, 0xffb3c8, 0xffe066], 2.7, 2.2, 0.65, 0.95);
  }

  emitPetalGateOpen(gridX: number, gridY: number): void {
    this.spawnBurst(
      gridX,
      -gridY,
      0.42,
      18,
      [0xf46d91, 0xfff3db, 0x98df82, 0xffe066],
      3.5,
      1.3,
      0.88,
      1.15
    );
  }

  emitPortalWarp(gridX: number, gridY: number, pair: 0 | 1): void {
    const colors =
      pair === 0
        ? [0xc77dff, 0xb975ff, 0xffe066, 0xffffff]
        : [0x38d9d2, 0x80ffdb, 0xffe066, 0xffffff];
    this.spawnBurst(gridX, -gridY, 0.36, 16, colors, 3.2, 0.4, 0.72, 1.05);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.z += p.spin * dt;

      const t = p.age / p.maxAge;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - t);
      p.mesh.scale.multiplyScalar(1 - dt * 0.55);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
