import { CampaignWorld } from '../game/levels/campaign';
import { isLevelUnlocked, ProgressState } from '../game/progress';
import { Direction, LevelDefinition } from '../game/types';
import { parseLevelAscii } from '../game/levels/parser';
import { AssetFactory } from '../render/assetFactory';
import { MapBeeOverlay } from '../render/mapBeeOverlay';
import {
  renderMainSkepBackdropSvg,
  renderMiniSkepSvg,
  renderPersonalityBeeSvg
} from './hiveArtwork';
import { renderLevelPreview } from './levelPreview';

interface HiveMapCallbacks {
  onSelectLevel: (level: LevelDefinition) => void;
  onStartLevel: (level: LevelDefinition) => void;
  onOpenCalibration: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
}

interface HexScreenPos {
  level: LevelDefinition;
  cx: number;
  cy: number;
}

const HEX_RADIUS = 56;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_RADIUS * Math.sqrt(3) * (q + r / 2);
  const y = HEX_RADIUS * 1.52 * r;
  return { x, y };
}

function pointyHexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export class HiveMap {
  private container: HTMLElement;
  private levels: LevelDefinition[];
  private worlds: CampaignWorld[];
  private assets: AssetFactory;
  private callbacks: HiveMapCallbacks;
  private activeWorldNumber = 1;
  private selectedLevelNumber = 1;
  private progress!: ProgressState;
  private isMuted = false;
  private positions: HexScreenPos[] = [];
  private lockedNotice = '';

  private shellBuilt = false;
  private hasRenderedOnce = false;
  private svgEl: SVGSVGElement | null = null;
  private worldTabsEl: HTMLElement | null = null;
  private sideCardEl: HTMLElement | null = null;
  private muteBtnEl: HTMLButtonElement | null = null;
  private beeOverlay: MapBeeOverlay | null = null;

  constructor(
    container: HTMLElement,
    levels: LevelDefinition[],
    worlds: CampaignWorld[],
    assets: AssetFactory,
    callbacks: HiveMapCallbacks
  ) {
    this.container = container;
    this.levels = levels;
    this.worlds = worlds;
    this.assets = assets;
    this.callbacks = callbacks;
    this.positions = levels.map((level) => {
      const p = axialToPixel(level.mapCoords.q, level.mapCoords.r);
      return { level, cx: p.x, cy: p.y };
    });
  }

  private getWorldForLevel(level: LevelDefinition): number {
    return level.world ?? 1;
  }

  private ensureShell(): void {
    if (this.shellBuilt) return;
    this.shellBuilt = true;

    this.container.innerHTML = `
      <header class="map-header">
        <div class="map-brand">
          <div class="map-brand-badge map-brand-avatar">
            <img
              src="assets/images/frau_honig_avatar.jpg"
              alt="Frau Honig"
            />
          </div>
          <div>
            <h1>BeeDash – Frau Honigs Bienenstock</h1>
            <p>Wähle eine Wabe aus, befreie deine Freundinnen und sammle alle Blüten!</p>
          </div>
        </div>
        <div class="map-actions">
          <button id="btn-map-cal" class="btn btn-secondary btn-compact" type="button">🕹️ Joystick einrichten</button>
          <button id="btn-map-settings" class="btn btn-secondary btn-compact" type="button">⚙️ Einstellungen</button>
          <button id="btn-map-mute" class="btn btn-secondary btn-compact" type="button">🔊 Ton an</button>
        </div>
      </header>

      <main class="map-layout">
        <section class="hive-board-card">
          <div id="world-tabs-bar" class="world-tabs-bar"></div>
          <div class="hive-stage">
            <svg id="hive-svg" class="hive-svg" viewBox="-235 -265 660 480" aria-label="Sechseck-Bienenstock-Karte"></svg>
            <div id="map-bee-layer" class="map-bee-layer"></div>
          </div>
          <div class="map-legend">
            <span><i class="legend-dot" style="background:#ffe27a"></i>Aktuelle Wabe</span>
            <span><i class="legend-dot" style="background:#f5b731"></i>Geschafft (wiederholbar)</span>
            <span><i class="legend-dot" style="background:#e8d7b3"></i>Noch verschlossen</span>
          </div>
        </section>

        <aside id="map-side-card" class="map-side-card"></aside>
      </main>
    `;

    this.svgEl = this.container.querySelector('#hive-svg');
    this.worldTabsEl = this.container.querySelector('#world-tabs-bar');
    this.sideCardEl = this.container.querySelector('#map-side-card');
    this.muteBtnEl = this.container.querySelector('#btn-map-mute');

    const beeLayerEl = this.container.querySelector('#map-bee-layer') as HTMLElement | null;
    if (beeLayerEl) {
      this.beeOverlay = new MapBeeOverlay(beeLayerEl, this.assets);
    }

    this.container.querySelector('#btn-map-cal')?.addEventListener('click', () => {
      this.callbacks.onOpenCalibration();
    });

    this.container.querySelector('#btn-map-settings')?.addEventListener('click', () => {
      this.callbacks.onOpenSettings();
    });

    this.muteBtnEl?.addEventListener('click', () => {
      this.callbacks.onToggleMute();
    });
  }

  render(progress: ProgressState, isMuted: boolean, focusNumber?: number): void {
    this.ensureShell();
    this.progress = progress;
    this.isMuted = isMuted;

    if (focusNumber && isLevelUnlocked(focusNumber, progress)) {
      const targetLevel = this.levels.find((l) => l.number === focusNumber);
      if (targetLevel) {
        this.activeWorldNumber = this.getWorldForLevel(targetLevel);
      }
      this.selectedLevelNumber = focusNumber;
      this.lockedNotice = '';
    } else {
      const currentSelected = this.levels.find((l) => l.number === this.selectedLevelNumber);
      if (
        !currentSelected ||
        this.getWorldForLevel(currentSelected) !== this.activeWorldNumber
      ) {
        const fallback =
          this.levels.find((l) => l.number === Math.min(progress.unlockedUpTo, this.levels.length)) ??
          this.levels[0];
        this.activeWorldNumber = this.getWorldForLevel(fallback);
        this.selectedLevelNumber = fallback.number;
        this.lockedNotice = '';
      } else if (
        !isLevelUnlocked(this.selectedLevelNumber, progress) &&
        !this.lockedNotice
      ) {
        const fallback =
          this.levels.find((l) => l.number === Math.min(progress.unlockedUpTo, this.levels.length)) ??
          this.levels[0];
        this.activeWorldNumber = this.getWorldForLevel(fallback);
        this.selectedLevelNumber = fallback.number;
      }
    }

    if (this.muteBtnEl) {
      this.muteBtnEl.textContent = isMuted ? '🔇 Ton aus' : '🔊 Ton an';
    }

    if (this.worldTabsEl) {
      this.worldTabsEl.innerHTML = this.worlds
        .map((w) => {
          const wLevels = this.levels.filter((l) => this.getWorldForLevel(l) === w.number);
          const wUnlocked = wLevels.some((l) => isLevelUnlocked(l.number, progress));
          const wDone = wLevels.filter((l) => Boolean(progress.completed[l.id])).length;
          const isActive = w.number === this.activeWorldNumber;
          return `
            <button
              class="hive-skep-tab ${isActive ? 'active' : ''} ${wUnlocked ? '' : 'locked'}"
              data-world="${w.number}"
              type="button"
              title="${w.title} (${w.personalityTag})"
            >
              <span class="hive-skep-bee">${renderPersonalityBeeSvg(w.personality, { size: 54 })}</span>
              ${renderMiniSkepSvg({
                uid: `tab-${w.number}`,
                accentColor: w.accentColor,
                active: isActive,
                locked: !wUnlocked
              })}
              <span class="hive-skep-name">${w.shortTitle}</span>
              <span class="world-tab-badge">${wUnlocked ? `${wDone}/${wLevels.length}` : '🔒'}</span>
            </button>
          `;
        })
        .join('');

      this.worldTabsEl
        .querySelectorAll<HTMLButtonElement>('.hive-skep-tab')
        .forEach((btn) => {
          btn.addEventListener('click', () => {
            const worldNum = Number(btn.dataset.world);
            this.selectWorld(worldNum);
          });
        });
    }

    const worldPositions = this.positions.filter(
      (p) => this.getWorldForLevel(p.level) === this.activeWorldNumber
    );

    const selected =
      this.levels.find((l) => l.number === this.selectedLevelNumber) ??
      worldPositions[0]?.level ??
      this.levels[0];
    const parsed = parseLevelAscii(selected);
    const completion = progress.completed[selected.id];
    const unlocked = isLevelUnlocked(selected.number, progress);

    const trailPoints = worldPositions
      .map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`)
      .join(' ');

    const hexCellsSvg = worldPositions
      .map(({ level, cx, cy }) => {
        const cellUnlocked = isLevelUnlocked(level.number, progress);
        const cellDone = Boolean(progress.completed[level.id]);
        const isNext = cellUnlocked && !cellDone;
        const isSelected = level.number === this.selectedLevelNumber;
        const stars = progress.completed[level.id]?.stars ?? 0;

        let fill = '#e8d7b3';
        let stroke = '#8f6b47';
        if (cellDone) {
          fill = isSelected ? '#ffd24d' : '#f5b731';
          stroke = '#4a321f';
        } else if (isNext) {
          fill = isSelected ? '#fff3b0' : '#ffe27a';
          stroke = '#4a321f';
        }

        const classes = [
          'hex-cell',
          cellUnlocked ? 'unlocked' : 'locked',
          isSelected ? 'selected' : '',
          isNext ? 'next-pulse' : ''
        ]
          .filter(Boolean)
          .join(' ');

        const statusLabel = cellDone
          ? '★'.repeat(stars) + '☆'.repeat(3 - stars)
          : cellUnlocked
            ? '✦'
            : '🔒';

        return `
          <g class="${classes}" data-level="${level.number}" tabindex="${cellUnlocked ? '0' : '-1'}" role="button" aria-label="Wabe ${level.number}: ${level.title}">
            <polygon class="hex-shape" points="${pointyHexPoints(cx, cy, HEX_RADIUS - 3)}" fill="${fill}" stroke="${stroke}" stroke-width="3.5" stroke-linejoin="round" />
            <polygon class="hex-outline" points="${pointyHexPoints(cx, cy, HEX_RADIUS - 8)}" fill="none" stroke="${isSelected ? '#d65a72' : 'rgba(255,255,255,0.45)'}" stroke-width="${isSelected ? '5.5' : '2'}" stroke-linejoin="round" />
            <text x="${cx}" y="${cy - 22}" text-anchor="middle" font-size="18" font-weight="900" fill="${cellUnlocked ? '#4a321f' : '#856b50'}">${level.number}</text>
            <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="${cellDone ? '13' : '15'}" font-weight="800" fill="${cellUnlocked ? '#4a321f' : '#856b50'}">
              ${statusLabel}
            </text>
          </g>
        `;
      })
      .join('');

    const activeWorld =
      this.worlds.find((w) => w.number === this.activeWorldNumber) ?? this.worlds[0];

    if (this.svgEl) {
      this.svgEl.innerHTML = `
        ${activeWorld ? renderMainSkepBackdropSvg(activeWorld) : ''}
        <polyline points="${trailPoints}" fill="none" stroke="#995b17" stroke-width="5" stroke-dasharray="8 8" stroke-linecap="round" stroke-linejoin="round" opacity="0.65" />
        ${hexCellsSvg}
      `;
    }

    const starDisplay = completion
      ? '🌸'.repeat(completion.stars) + '⚪'.repeat(3 - completion.stars)
      : 'Noch nicht gesummt';

    if (this.sideCardEl) {
      this.sideCardEl.innerHTML = `
        <span class="chapter-tag">${selected.chapter}</span>
        <h2>Wabe ${selected.number}: ${selected.title}</h2>
        <div class="level-preview-frame">
          <canvas id="level-preview-canvas" class="level-preview-canvas"></canvas>
        </div>
        <p class="map-side-intro">${selected.intro}</p>
        <div class="map-stats-row">
          <span class="stat-chip">🌸 ${parsed.totalFlowers} Blüten</span>
          ${parsed.totalBees > 0 ? `<span class="stat-chip">🐝 ${parsed.totalBees} Biene${parsed.totalBees > 1 ? 'n' : ''}</span>` : ''}
          <span class="stat-chip">${parsed.width <= 13 && parsed.height <= 9 ? '🖼️ Feste Ansicht' : '🎥 Mitlaufende Welt'}</span>
        </div>
        <div class="stat-chip" style="align-self:flex-start">Wertung: ${starDisplay}</div>
        ${this.lockedNotice ? `<div class="cal-status-banner">${this.lockedNotice}</div>` : ''}
        <button id="btn-start-level" class="btn" type="button" ${unlocked ? '' : 'disabled'}>
          🐝 Losfliegen!
        </button>
        <div style="font-size:0.84rem; color:#7c5434; font-weight:700;">
          Steuerung: Pfeiltasten / WASD / USB-Joystick • Enter oder Knopf zum Starten
        </div>
      `;

      const previewCanvas = this.sideCardEl.querySelector(
        '#level-preview-canvas'
      ) as HTMLCanvasElement | null;
      if (previewCanvas) {
        renderLevelPreview(previewCanvas, selected);
      }

      this.sideCardEl
        .querySelector('#btn-start-level')
        ?.addEventListener('click', () => this.startSelected());
    }

    this.bindHexEvents();

    const selectedPos =
      worldPositions.find((p) => p.level.number === selected.number) ??
      worldPositions[0] ??
      this.positions[0];
    const isFirstRender = !this.hasRenderedOnce;
    this.hasRenderedOnce = true;
    this.beeOverlay?.setTarget(selectedPos.cx, selectedPos.cy, isFirstRender);
    this.beeOverlay?.handleResize();
  }

  private selectWorld(worldNum: number): void {
    if (!this.progress) return;
    const worldLevels = this.levels.filter((l) => this.getWorldForLevel(l) === worldNum);
    if (worldLevels.length === 0) return;

    this.activeWorldNumber = worldNum;
    const unlockedInWorld = worldLevels.filter((l) => isLevelUnlocked(l.number, this.progress));
    if (unlockedInWorld.length > 0) {
      const target = unlockedInWorld[unlockedInWorld.length - 1];
      this.selectedLevelNumber = target.number;
      this.lockedNotice = '';
      this.callbacks.onSelectLevel(target);
    } else {
      const first = worldLevels[0];
      this.selectedLevelNumber = first.number;
      this.lockedNotice = `Schließe zuerst Wabe ${Math.min(this.progress.unlockedUpTo, this.levels.length)} ab, um diesen Bienenstock freizuschalten!`;
    }
    this.render(this.progress, this.isMuted);
  }

  private bindHexEvents(): void {
    if (!this.svgEl) return;
    this.svgEl.querySelectorAll<SVGGElement>('.hex-cell').forEach((el) => {
      const num = Number(el.dataset.level);
      const level = this.levels.find((l) => l.number === num);
      if (!level) return;

      el.addEventListener('click', () => {
        if (!isLevelUnlocked(num, this.progress)) {
          this.lockedNotice = `Schließe zuerst Wabe ${this.progress.unlockedUpTo} ab, um Wabe ${num} freizuschalten!`;
          this.render(this.progress, this.isMuted);
          return;
        }
        this.lockedNotice = '';
        if (this.selectedLevelNumber === num) {
          this.callbacks.onStartLevel(level);
        } else {
          this.selectedLevelNumber = num;
          this.callbacks.onSelectLevel(level);
          this.render(this.progress, this.isMuted);
        }
      });

      el.addEventListener('dblclick', () => {
        if (isLevelUnlocked(num, this.progress)) {
          this.callbacks.onStartLevel(level);
        }
      });
    });
  }

  moveSelection(dir: Direction): void {
    if (!this.progress) return;
    const current = this.positions.find((p) => p.level.number === this.selectedLevelNumber);
    if (!current) return;

    const dirVec: Record<Direction, { x: number; y: number }> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const v = dirVec[dir];

    let best: HexScreenPos | null = null;
    let bestScore = Infinity;

    for (const candidate of this.positions) {
      if (this.getWorldForLevel(candidate.level) !== this.activeWorldNumber) continue;
      if (candidate.level.number === current.level.number) continue;
      if (!isLevelUnlocked(candidate.level.number, this.progress)) continue;

      const dx = candidate.cx - current.cx;
      const dy = candidate.cy - current.cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      const dot = (dx * v.x + dy * v.y) / dist;
      if (dot <= 0.25) continue;

      const score = dist / dot;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) {
      this.lockedNotice = '';
      this.selectedLevelNumber = best.level.number;
      this.callbacks.onSelectLevel(best.level);
      this.render(this.progress, this.isMuted);
    } else if (dir === 'right' || dir === 'left') {
      const nextWorld = this.activeWorldNumber + (dir === 'right' ? 1 : -1);
      const nextLevels = this.levels.filter(
        (l) => this.getWorldForLevel(l) === nextWorld && isLevelUnlocked(l.number, this.progress)
      );
      if (nextLevels.length > 0) {
        this.activeWorldNumber = nextWorld;
        const target = dir === 'right' ? nextLevels[0] : nextLevels[nextLevels.length - 1];
        this.lockedNotice = '';
        this.selectedLevelNumber = target.number;
        this.callbacks.onSelectLevel(target);
        this.render(this.progress, this.isMuted);
      }
    }
  }

  startSelected(): void {
    if (!this.progress || !isLevelUnlocked(this.selectedLevelNumber, this.progress)) return;
    const level = this.levels.find((l) => l.number === this.selectedLevelNumber);
    if (level) {
      this.callbacks.onStartLevel(level);
    }
  }

  onShow(): void {
    this.beeOverlay?.handleResize();
  }

  updateAnimation(dt: number): void {
    this.beeOverlay?.update(dt);
  }

  dispose(): void {
    this.beeOverlay?.dispose();
    this.beeOverlay = null;
  }
}
