import { GameSettings, PLAYTIME_PRESETS } from '../game/settings';
import { Direction, FailReason, LevelDefinition } from '../game/types';
import { InputManager } from '../input/inputManager';

type DialogButtonSpec = {
  id: string;
  label: string;
  className?: string;
  onClick: () => void;
};

export class Dialogs {
  private root: HTMLElement;
  private activeButtons: DialogButtonSpec[] = [];
  private selectedBtnIndex = 0;
  private onDismissHandler: (() => void) | null = null;
  private onCleanupHandler: (() => void) | null = null;
  private calibrationRaf: number | null = null;
  private isOpenFlag = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.isOpenFlag;
  }

  close(): void {
    if (this.calibrationRaf !== null) {
      cancelAnimationFrame(this.calibrationRaf);
      this.calibrationRaf = null;
    }
    const cleanup = this.onCleanupHandler;
    this.onCleanupHandler = null;
    this.isOpenFlag = false;
    this.activeButtons = [];
    this.onDismissHandler = null;
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    cleanup?.();
  }

  moveSelection(dir: Direction): void {
    if (!this.isOpenFlag || this.activeButtons.length === 0) return;
    if (dir === 'left' || dir === 'up') {
      this.selectedBtnIndex =
        (this.selectedBtnIndex - 1 + this.activeButtons.length) % this.activeButtons.length;
    } else {
      this.selectedBtnIndex = (this.selectedBtnIndex + 1) % this.activeButtons.length;
    }
    this.updateButtonSelection();
  }

  confirmSelection(): void {
    if (!this.isOpenFlag || this.activeButtons.length === 0) return;
    const spec = this.activeButtons[this.selectedBtnIndex];
    spec?.onClick();
  }

  dismiss(): void {
    if (!this.isOpenFlag) return;
    if (this.onDismissHandler) {
      this.onDismissHandler();
    }
  }

  private updateButtonSelection(): void {
    const btns = this.root.querySelectorAll<HTMLButtonElement>('.dialog-action-btn');
    btns.forEach((btn, idx) => {
      if (idx === this.selectedBtnIndex) {
        btn.classList.add('dialog-btn-selected');
      } else {
        btn.classList.remove('dialog-btn-selected');
      }
    });
  }

  private openCard(
    html: string,
    buttons: DialogButtonSpec[],
    wide = false,
    onDismiss?: () => void
  ): void {
    this.close();
    this.isOpenFlag = true;
    this.activeButtons = buttons;
    this.selectedBtnIndex = 0;
    this.onDismissHandler = onDismiss ?? null;

    const btnHtml = buttons
      .map(
        (b, idx) =>
          `<button id="${b.id}" class="btn dialog-action-btn ${b.className ?? ''} ${idx === 0 ? 'dialog-btn-selected' : ''}" type="button">${b.label}</button>`
      )
      .join('');

    this.root.innerHTML = `
      <div class="dialog-card ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        ${html}
        <div class="dialog-buttons">${btnHtml}</div>
      </div>
    `;
    this.root.classList.remove('hidden');

    buttons.forEach((b) => {
      this.root.querySelector(`#${b.id}`)?.addEventListener('click', b.onClick);
    });
  }

  showWelcome(onContinue: () => void): void {
    this.openCard(
      `
        <div class="dialog-emoji">🐝🍯</div>
        <h2>Willkommen bei BeeDash!</h2>
        <p>„Hallo! Ich bin <strong>Frau Honig</strong>. Mein kleiner Bienenschwarm braucht deine Hilfe im Bienenstock!“</p>
        <p>Sammle bunte Blüten, befreie verirrte Bienenfreundinnen und finde am Ende meinen gelb-schwarzen Koffer.</p>
      `,
      [
        {
          id: 'dlg-welcome-go',
          label: '🍯 Zum Bienenstock',
          onClick: () => {
            this.close();
            onContinue();
          }
        }
      ],
      false,
      () => {
        this.close();
        onContinue();
      }
    );
  }

  showTip(level: LevelDefinition, onClose: () => void): void {
    this.openCard(
      `
        <div class="dialog-emoji">👒✨</div>
        <h2>Frau Honigs Tipp</h2>
        <div class="tip-bubble">„${level.tip}“</div>
      `,
      [
        {
          id: 'dlg-tip-ok',
          label: '🐝 Verstanden!',
          onClick: () => {
            this.close();
            onClose();
          }
        }
      ],
      false,
      () => {
        this.close();
        onClose();
      }
    );
  }

  showUps(
    reason: FailReason,
    canUndo: boolean,
    onUndo: () => void,
    onRetry: () => void,
    onMap: () => void
  ): void {
    const title = reason === 'sticky_wings' ? 'Huch, klebrig!' : 'Ups! Plumps!';
    const emoji = reason === 'sticky_wings' ? '🍯🐝' : '🍯💫';
    const message =
      reason === 'sticky_wings'
        ? 'Flüssiger Honig hat deine Flügel verklebt! Keine Sorge, wir wischen sie einfach sauber.'
        : 'Ein schwerer Honigtopf ist auf deinem Köpfchen gelandet! Zum Glück ist nichts passiert.';

    const buttons: DialogButtonSpec[] = [];
    if (canUndo) {
      buttons.push({
        id: 'dlg-ups-undo',
        label: '↩️ 1 Schritt zurück',
        onClick: () => {
          this.close();
          onUndo();
        }
      });
    }
    buttons.push({
      id: 'dlg-ups-retry',
      label: '🔄 Nochmal versuchen',
      className: canUndo ? 'btn-secondary' : '',
      onClick: () => {
        this.close();
        onRetry();
      }
    });
    buttons.push({
      id: 'dlg-ups-map',
      label: '🗺️ Zur Karte',
      className: 'btn-secondary',
      onClick: () => {
        this.close();
        onMap();
      }
    });

    this.openCard(
      `
        <div class="dialog-emoji">${emoji}</div>
        <h2>${title}</h2>
        <p>${message}</p>
      `,
      buttons,
      false,
      () => {
        this.close();
        if (canUndo) onUndo();
        else onRetry();
      }
    );
  }

  showWin(
    level: LevelDefinition,
    stars: number,
    collectedHoney: number,
    newlyUnlockedNumber: number | null,
    onMap: () => void,
    onReplay: () => void
  ): void {
    const starRow = '🌸'.repeat(stars) + '⚪'.repeat(3 - stars);
    const buttons: DialogButtonSpec[] = [
      {
        id: 'dlg-win-map',
        label: '🗺️ Zum Bienenstock',
        className: 'btn-green',
        onClick: () => {
          this.close();
          onMap();
        }
      },
      {
        id: 'dlg-win-replay',
        label: '🔄 Nochmal spielen',
        className: 'btn-secondary',
        onClick: () => {
          this.close();
          onReplay();
        }
      }
    ];

    this.openCard(
      `
        <div class="win-dialog-body">
          <div class="win-illustration-frame">
            <img
              class="win-illustration"
              src="assets/images/frau_honig_win.jpg"
              alt="Frau Honig auf dem Bienenkorb"
            />
          </div>
          <div class="win-dialog-info">
            <div class="dialog-emoji">🎉🐝🧳</div>
            <h2>Wunderbar gemacht!</h2>
            <p>Du hast <strong>Wabe ${level.number}: ${level.title}</strong> gemeistert!</p>
            <div class="stars-row">${starRow}</div>
            ${
              newlyUnlockedNumber !== null
                ? `<p class="win-unlock-note">✨ Wabe ${newlyUnlockedNumber} wurde auf dem Bienenstock freigeschaltet!</p>`
                : ''
            }
            ${
              collectedHoney > 0
                ? `<p class="win-honey-note">🍯 Leckerer Zusatz-Honig gesammelt: ${collectedHoney}</p>`
                : ''
            }
          </div>
        </div>
      `,
      buttons,
      true,
      () => {
        this.close();
        onMap();
      }
    );
  }

  showCalibration(inputManager: InputManager, onClose: () => void): void {
    this.close();
    this.isOpenFlag = true;
    inputManager.setActionsPaused(true);

    let cal = inputManager.getCalibration();
    type WizardStep =
      | null
      | 'up'
      | 'down'
      | 'left'
      | 'right'
      | 'confirmBtn'
      | 'undoBtn';
    let wizardStep: WizardStep = null;
    let wizardHint = '';

    const finish = () => {
      this.close();
      onClose();
    };

    this.onCleanupHandler = () => {
      inputManager.setActionsPaused(false);
    };
    this.onDismissHandler = finish;

    const renderBody = () => {
      this.root.innerHTML = `
        <div class="dialog-card wide" role="dialog" aria-modal="true">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
            <h2 style="margin:0;">🕹️ USB-Joystick einrichten</h2>
            <button id="cal-close-x" class="btn btn-secondary btn-compact" type="button">Fertig</button>
          </div>
          <p id="cal-pad-name" style="margin:0.4rem 0; font-weight:800; color:#7c5434;"></p>

          <div id="cal-wizard-banner" class="cal-status-banner ${wizardStep ? '' : 'hidden'}">
            ${wizardHint}
          </div>

          <div class="cal-grid">
            <div class="cal-panel">
              <div style="font-weight:800; margin-bottom:0.35rem; text-align:center;">Live-Richtungstest (4-Wege)</div>
              <div class="cal-rose">
                <div></div>
                <div id="rose-up" class="cal-rose-cell">↑</div>
                <div></div>
                <div id="rose-left" class="cal-rose-cell">←</div>
                <div class="cal-rose-cell">🐝</div>
                <div id="rose-right" class="cal-rose-cell">→</div>
                <div></div>
                <div id="cal-down" class="cal-rose-cell">↓</div>
                <div></div>
              </div>
              <div id="cal-raw-info" style="font-size:0.82rem; color:#7c5434; text-align:center; min-height:2.2em;"></div>
            </div>

            <div class="cal-panel" style="display:flex; flex-direction:column; gap:0.55rem;">
              <label style="font-weight:800; font-size:0.92rem;">
                Empfindlichkeit (Deadzone): <span id="cal-dz-val">${cal.deadzone.toFixed(2)}</span>
                <input id="cal-dz" type="range" min="0.20" max="0.75" step="0.05" value="${cal.deadzone}" style="width:100%;" />
              </label>

              <label style="display:flex; align-items:center; gap:0.4rem; font-weight:700; font-size:0.92rem;">
                <input id="cal-inv-x" type="checkbox" ${cal.invertX ? 'checked' : ''} /> Links/Rechts umkehren
              </label>
              <label style="display:flex; align-items:center; gap:0.4rem; font-weight:700; font-size:0.92rem;">
                <input id="cal-inv-y" type="checkbox" ${cal.invertY ? 'checked' : ''} /> Hoch/Runter umkehren
              </label>

              <div style="font-size:0.84rem; color:#7c5434; font-weight:700;">
                Achsen: X=${cal.xAxis}, Y=${cal.yAxis} • Bestätigen: Knopf ${cal.confirmButton} • Zurück: Knopf ${cal.undoButton}
              </div>

              <div style="display:flex; flex-wrap:wrap; gap:0.45rem; margin-top:auto;">
                <button id="cal-wizard-start" class="btn btn-compact" type="button">🪄 Automatisch einlernen</button>
                <button id="cal-reset" class="btn btn-secondary btn-compact" type="button">Standard</button>
              </div>
            </div>
          </div>
        </div>
      `;
      this.root.classList.remove('hidden');

      this.root.querySelector('#cal-close-x')?.addEventListener('click', finish);
      this.root.querySelector('#cal-dz')?.addEventListener('input', (e) => {
        const val = Number((e.target as HTMLInputElement).value);
        cal = { ...cal, deadzone: val };
        inputManager.updateCalibration(cal);
        const label = this.root.querySelector('#cal-dz-val');
        if (label) label.textContent = val.toFixed(2);
      });
      this.root.querySelector('#cal-inv-x')?.addEventListener('change', (e) => {
        cal = { ...cal, invertX: (e.target as HTMLInputElement).checked };
        inputManager.updateCalibration(cal);
      });
      this.root.querySelector('#cal-inv-y')?.addEventListener('change', (e) => {
        cal = { ...cal, invertY: (e.target as HTMLInputElement).checked };
        inputManager.updateCalibration(cal);
      });
      this.root.querySelector('#cal-reset')?.addEventListener('click', () => {
        cal = inputManager.resetCalibration();
        wizardStep = null;
        renderBody();
      });
      this.root.querySelector('#cal-wizard-start')?.addEventListener('click', () => {
        wizardStep = 'up';
        wizardHint = 'Schritt 1/6: Drücke den Joystick nach OBEN!';
        renderBody();
      });
    };

    renderBody();

    let waitNeutral = false;
    let prevBtns = new Set<number>();

    const pollLoop = () => {
      if (!this.isOpenFlag) return;
      const snap = inputManager.getLiveGamepadSnapshot();
      const nameEl = this.root.querySelector('#cal-pad-name');
      const rawEl = this.root.querySelector('#cal-raw-info');

      if (nameEl) {
        nameEl.textContent = snap.connected
          ? `Verbunden: ${snap.name}`
          : 'Noch kein USB-Joystick erkannt — drücke einen Knopf am Joystick oder nutze die Tastatur.';
      }
      if (rawEl) {
        rawEl.textContent = snap.connected
          ? `Achsen: [${snap.axes.join(', ')}] • Gedrückte Knöpfe: ${snap.pressedButtons.length ? snap.pressedButtons.join(', ') : 'keine'}`
          : '';
      }

      const upEl = this.root.querySelector('#rose-up');
      const downEl = this.root.querySelector('#cal-down');
      const leftEl = this.root.querySelector('#rose-left');
      const rightEl = this.root.querySelector('#rose-right');
      upEl?.classList.toggle('active', snap.resolvedDirection === 'up');
      downEl?.classList.toggle('active', snap.resolvedDirection === 'down');
      leftEl?.classList.toggle('active', snap.resolvedDirection === 'left');
      rightEl?.classList.toggle('active', snap.resolvedDirection === 'right');

      // Wizard auto-detection
      if (wizardStep && snap.connected) {
        const hasAxisActive = snap.axes.some((v) => Math.abs(v) > 0.65);
        const newButton = snap.pressedButtons.find((b) => !prevBtns.has(b));

        if (waitNeutral) {
          if (!hasAxisActive && snap.pressedButtons.length === 0) {
            waitNeutral = false;
          }
        } else if (wizardStep === 'up' || wizardStep === 'down' || wizardStep === 'left' || wizardStep === 'right') {
          if (newButton !== undefined && newButton >= 12 && newButton <= 15) {
            wizardStep = 'confirmBtn';
            wizardHint = 'D-Pad erkannt! Schritt 5/6: Drücke jetzt den Haupt-Knopf (Bestätigen)!';
            waitNeutral = true;
            renderBody();
            prevBtns = new Set(snap.pressedButtons);
            this.calibrationRaf = requestAnimationFrame(pollLoop);
            return;
          }
          let bestAxis = -1;
          let bestVal = 0;
          snap.axes.forEach((v, idx) => {
            if (Math.abs(v) > Math.abs(bestVal)) {
              bestVal = v;
              bestAxis = idx;
            }
          });
          if (bestAxis >= 0 && Math.abs(bestVal) > 0.65) {
            if (wizardStep === 'up') {
              cal = { ...cal, yAxis: bestAxis, invertY: bestVal > 0 };
              wizardStep = 'down';
              wizardHint = 'Schritt 2/6: Drücke den Joystick nach UNTEN!';
            } else if (wizardStep === 'down') {
              cal = { ...cal, yAxis: bestAxis, invertY: bestVal < 0 };
              wizardStep = 'left';
              wizardHint = 'Schritt 3/6: Drücke den Joystick nach LINKS!';
            } else if (wizardStep === 'left') {
              cal = { ...cal, xAxis: bestAxis, invertX: bestVal > 0 };
              wizardStep = 'right';
              wizardHint = 'Schritt 4/6: Drücke den Joystick nach RECHTS!';
            } else if (wizardStep === 'right') {
              cal = { ...cal, xAxis: bestAxis, invertX: bestVal < 0 };
              wizardStep = 'confirmBtn';
              wizardHint = 'Schritt 5/6: Drücke den Haupt-Knopf (Bestätigen)!';
            }
            inputManager.updateCalibration(cal);
            waitNeutral = true;
            renderBody();
          }
        } else if (wizardStep === 'confirmBtn' && newButton !== undefined) {
          cal = { ...cal, confirmButton: newButton };
          inputManager.updateCalibration(cal);
          wizardStep = 'undoBtn';
          wizardHint = 'Schritt 6/6: Drücke den Knopf für „Zurück“ (oder denselben Knopf zum Überspringen)!';
          waitNeutral = true;
          renderBody();
        } else if (wizardStep === 'undoBtn' && newButton !== undefined) {
          if (newButton !== cal.confirmButton) {
            cal = { ...cal, undoButton: newButton };
            inputManager.updateCalibration(cal);
          }
          wizardStep = null;
          wizardHint = '';
          renderBody();
        }
      }

      prevBtns = new Set(snap.pressedButtons);
      this.calibrationRaf = requestAnimationFrame(pollLoop);
    };

    this.calibrationRaf = requestAnimationFrame(pollLoop);
  }

  showSettings(
    settings: GameSettings,
    elapsedMs: number,
    progressInfo: { completedCount: number; unlockedUpTo: number; totalLevels: number },
    callbacks: {
      onChangeLimit: (minutes: number) => void;
      onResetTimer: () => void;
      onPreviewSleep: () => void;
      onResetProgress: () => void;
      onClose: () => void;
    }
  ): void {
    let currentLimit = settings.playtimeLimitMinutes;
    let currentElapsedMs = elapsedMs;
    let completedCount = progressInfo.completedCount;
    let unlockedUpTo = progressInfo.unlockedUpTo;
    let confirmingProgressReset = false;
    let progressResetDone = false;

    const formatElapsed = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins} Min ${secs.toString().padStart(2, '0')} Sek`;
    };

    const renderSettings = () => {
      const presetButtons = PLAYTIME_PRESETS.map((mins) => {
        const label = mins === 0 ? 'Aus (Test)' : `${mins} Min`;
        const active = currentLimit === mins ? 'btn-preset-active' : '';
        return `<button class="btn btn-secondary btn-compact ${active}" data-mins="${mins}" type="button">${label}</button>`;
      }).join('');

      const hasProgress = unlockedUpTo > 1 || completedCount > 0;
      const progressSection = confirmingProgressReset
        ? `
          <div class="settings-confirm-box">
            <div class="settings-confirm-title">Wirklich zurücksetzen?</div>
            <div class="settings-confirm-text">
              Alle geschafften Waben und Sterne werden gelöscht und es geht wieder bei Wabe 1 los.
            </div>
            <div class="settings-confirm-actions">
              <button id="settings-reset-progress-confirm" class="btn btn-danger btn-compact" type="button">Ja, zurücksetzen</button>
              <button id="settings-reset-progress-cancel" class="btn btn-secondary btn-compact" type="button">Abbrechen</button>
            </div>
          </div>
        `
        : `
          ${
            progressResetDone
              ? '<div class="settings-reset-done">✅ Level-Fortschritt zurückgesetzt – wieder bei Wabe 1!</div>'
              : ''
          }
          <div style="display:flex; justify-content:center; margin-top:0.55rem;">
            <button id="settings-reset-progress" class="btn btn-secondary btn-compact" type="button" ${
              hasProgress ? '' : 'disabled'
            }>🗑️ Level-Fortschritt zurücksetzen</button>
          </div>
        `;

      this.openCard(
        `
          <div class="dialog-emoji">⚙️🐝</div>
          <h2>Einstellungen</h2>
          <p style="font-weight:800; margin-bottom:0.25rem;">Spielzeit-Pause (freundliche Bienen-Schlafenszeit):</p>
          <div class="settings-preset-grid">${presetButtons}</div>
          <div class="stat-chip" style="display:inline-block; margin:0.35rem 0;">
            Bisherige Spielzeit: <span id="settings-elapsed-text">${formatElapsed(currentElapsedMs)}</span>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; margin-top:0.75rem;">
            <button id="settings-reset-timer" class="btn btn-secondary btn-compact" type="button">⏱️ Spielzeit zurücksetzen</button>
            <button id="settings-preview-sleep" class="btn btn-pink btn-compact" type="button">🎬 Pausen-Animation testen</button>
          </div>
          <hr class="settings-divider" />
          <p style="font-weight:800; margin:0.25rem 0;">Spielfortschritt:</p>
          <div class="stat-chip" style="display:inline-block; margin:0.2rem 0;">
            ${completedCount} von ${progressInfo.totalLevels} Waben geschafft
          </div>
          ${progressSection}
        `,
        [
          {
            id: 'settings-done',
            label: 'Fertig',
            onClick: () => {
              this.close();
              callbacks.onClose();
            }
          }
        ],
        false,
        () => {
          this.close();
          callbacks.onClose();
        }
      );

      this.root.querySelectorAll<HTMLButtonElement>('[data-mins]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mins = Number(btn.dataset.mins);
          currentLimit = mins;
          confirmingProgressReset = false;
          callbacks.onChangeLimit(mins);
          renderSettings();
        });
      });

      this.root.querySelector('#settings-reset-timer')?.addEventListener('click', () => {
        currentElapsedMs = 0;
        confirmingProgressReset = false;
        callbacks.onResetTimer();
        renderSettings();
      });

      this.root.querySelector('#settings-preview-sleep')?.addEventListener('click', () => {
        this.close();
        callbacks.onPreviewSleep();
      });

      this.root.querySelector('#settings-reset-progress')?.addEventListener('click', () => {
        confirmingProgressReset = true;
        progressResetDone = false;
        renderSettings();
      });

      this.root.querySelector('#settings-reset-progress-cancel')?.addEventListener('click', () => {
        confirmingProgressReset = false;
        renderSettings();
      });

      this.root.querySelector('#settings-reset-progress-confirm')?.addEventListener('click', () => {
        callbacks.onResetProgress();
        completedCount = 0;
        unlockedUpTo = 1;
        confirmingProgressReset = false;
        progressResetDone = true;
        renderSettings();
      });
    };

    renderSettings();
  }
}
