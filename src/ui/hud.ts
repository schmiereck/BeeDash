import { GameState, LevelDefinition } from '../game/types';
import { ExitScreenHint } from '../render/cameraRig';

interface HudCallbacks {
  onUndo: () => void;
  onTip: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onBackToMap: () => void;
}

export class HUD {
  private container: HTMLElement;
  private callbacks: HudCallbacks;
  private lastKey = '';
  private arrowEl: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: HudCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  private renderSlotRow(total: number, filledCount: number, emoji: string): string {
    const slots: string[] = [];
    for (let i = 0; i < total; i++) {
      const filled = i < filledCount;
      slots.push(
        `<span class="hud-slot-icon ${filled ? 'filled' : 'unfilled'}">${emoji}</span>`
      );
    }
    return slots.join('');
  }

  render(
    state: GameState,
    level: LevelDefinition,
    undoCount: number,
    isMuted: boolean
  ): void {
    const stickySec = Math.ceil(state.stickyRemainingMs / 1000);
    const dizzySec = Math.ceil(state.dizzyRemainingMs / 1000);
    const key = [
      level.number,
      state.collectedFlowers,
      state.requiredFlowers,
      state.rescuedBees,
      state.totalBees,
      state.collectedHoney,
      stickySec,
      dizzySec,
      state.filledBowls,
      state.totalBowls,
      state.gatesOpen,
      state.exitOpen,
      state.honeySourceCount,
      state.initialHoneyCount,
      undoCount,
      isMuted
    ].join('|');

    if (key === this.lastKey) return;
    this.lastKey = key;

    const flowersDone = state.collectedFlowers >= state.requiredFlowers;
    const beesDone = state.rescuedBees >= state.totalBees;
    const manyIcons = state.requiredFlowers >= 8;
    const showHoney =
      state.honeySourceCount > 0 || state.initialHoneyCount > 0 || state.collectedHoney > 0;

    this.container.innerHTML = `
      <div class="hud-top">
        <div class="hud-group hud-status-icons">
          <div class="hud-pill hud-icon-pill ${manyIcons ? 'many-icons' : ''} ${flowersDone ? 'counter-done' : ''}" aria-label="Blüten ${state.collectedFlowers} von ${state.requiredFlowers}">
            ${this.renderSlotRow(state.requiredFlowers, state.collectedFlowers, '🌸')}
          </div>
          ${
            state.totalBees > 0
              ? `<div class="hud-pill hud-icon-pill ${beesDone ? 'counter-done' : ''}" aria-label="Bienen ${state.rescuedBees} von ${state.totalBees}">
                  ${this.renderSlotRow(state.totalBees, state.rescuedBees, '🐝')}
                </div>`
              : ''
          }
          ${
            showHoney
              ? `<div class="hud-pill hud-icon-pill" aria-label="Honig ${state.collectedHoney}">
                  <span class="hud-slot-icon filled">🍯</span>
                  <span class="hud-honey-count">${state.collectedHoney}</span>
                </div>`
              : ''
          }
          ${
            state.totalBowls > 0
              ? `<div class="hud-pill hud-icon-pill ${state.gatesOpen ? 'counter-done' : ''}" aria-label="${state.gatesOpen ? 'Honig-Tor offen' : `Honigschale ${state.filledBowls} von ${state.totalBowls}`}">
                  <span class="hud-slot-icon filled">${state.gatesOpen ? '🍯🔓' : '🥣🔒'}</span>
                </div>`
              : ''
          }
          ${
            stickySec > 0
              ? `<div class="hud-pill hud-icon-pill hud-sticky-pill" aria-label="Flügel klebrig: ${stickySec} Sekunden">
                  <span class="hud-slot-icon filled">🍯🐝</span>
                  <span class="hud-honey-count">${stickySec}</span>
                </div>`
              : ''
          }
          ${
            dizzySec > 0
              ? `<div class="hud-pill hud-icon-pill hud-dizzy-pill" aria-label="Biene betäubt: ${dizzySec} Sekunden">
                  <span class="hud-slot-icon filled">💫🐝</span>
                  <span class="hud-honey-count">${dizzySec}</span>
                </div>`
              : ''
          }
          <div class="hud-pill hud-icon-pill ${state.exitOpen ? 'exit-open' : 'exit-closed'}" aria-label="${state.exitOpen ? 'Koffer offen' : 'Koffer zu'}">
            <span class="hud-slot-icon filled">${state.exitOpen ? '🧳✨' : '🧳🔒'}</span>
          </div>
        </div>

        <div class="hud-group">
          <button id="hud-undo" class="btn btn-secondary btn-compact" type="button" title="1 Schritt zurück (Z)" ${undoCount === 0 ? 'disabled' : ''}>
            ↩️ Zurück (${undoCount})
          </button>
          <button id="hud-tip" class="btn btn-pink btn-compact" type="button" title="Frau Honigs Tipp (H)">💡 Tipp</button>
          <button id="hud-restart" class="btn btn-secondary btn-compact" type="button" title="Wabe neu starten (R)">🔄 Neu</button>
          <button id="hud-mute" class="btn btn-secondary btn-compact" type="button" title="Ton an / aus">${isMuted ? '🔇' : '🔊'}</button>
          <button id="hud-map" class="btn btn-compact" type="button" title="Zur Bienenstock-Karte (Esc)">🗺️ Karte</button>
        </div>
      </div>

      <div id="exit-arrow" class="exit-arrow-indicator hidden">🧳✨</div>
    `;

    this.arrowEl = this.container.querySelector('#exit-arrow');
    this.container.querySelector('#hud-undo')?.addEventListener('click', this.callbacks.onUndo);
    this.container.querySelector('#hud-tip')?.addEventListener('click', this.callbacks.onTip);
    this.container
      .querySelector('#hud-restart')
      ?.addEventListener('click', this.callbacks.onRestart);
    this.container
      .querySelector('#hud-mute')
      ?.addEventListener('click', this.callbacks.onToggleMute);
    this.container.querySelector('#hud-map')?.addEventListener('click', this.callbacks.onBackToMap);
  }

  updateExitArrow(exitOpen: boolean, hint: ExitScreenHint | null): void {
    if (!this.arrowEl) return;
    if (!exitOpen || !hint || !hint.offscreen) {
      this.arrowEl.classList.add('hidden');
      return;
    }

    this.arrowEl.classList.remove('hidden');
    this.arrowEl.style.left = `${hint.screenX}px`;
    this.arrowEl.style.top = `${hint.screenY}px`;
    const arrowChar = this.angleToArrow(hint.angleDeg);
    this.arrowEl.textContent = `${arrowChar} 🧳✨`;
  }

  private angleToArrow(angleDeg: number): string {
    if (angleDeg >= -45 && angleDeg < 45) return '➡️';
    if (angleDeg >= 45 && angleDeg < 135) return '⬇️';
    if (angleDeg >= -135 && angleDeg < -45) return '⬆️';
    return '⬅️';
  }

  invalidate(): void {
    this.lastKey = '';
  }
}
