import './style.css';
import { SoundManager } from './audio/soundManager';
import {
  createGameState,
  stepGame,
  tickStickyTimer,
  willDirectionChangeState
} from './game/engine';
import { CAMPAIGN_LEVELS, CAMPAIGN_WORLDS } from './game/levels/campaign';
import {
  completeLevel,
  loadProgress,
  ProgressState,
  resetProgress
} from './game/progress';
import {
  GameSettings,
  isPlaytimeLimitReached,
  loadSettings,
  saveSettings
} from './game/settings';
import { GameState, LevelDefinition } from './game/types';
import { UndoStack } from './game/undoStack';
import { InputManager } from './input/inputManager';
import { MoveScheduler } from './input/moveScheduler';
import { AssetFactory } from './render/assetFactory';
import { BoardRenderer } from './render/boardRenderer';
import { CameraRig } from './render/cameraRig';
import { SceneManager } from './render/sceneManager';
import { SleepSwarmOverlay } from './render/sleepSwarmOverlay';
import { SuitcaseStageOverlay } from './render/suitcaseStageOverlay';
import { Dialogs } from './ui/dialogs';
import { HiveMap } from './ui/hiveMap';
import { HUD } from './ui/hud';

const TICK_MS = 380;
const WELCOMED_KEY = 'beedash_welcomed_v1';

async function bootstrap(): Promise<void> {
  const mapScreenEl = document.getElementById('map-screen')!;
  const gameScreenEl = document.getElementById('game-screen')!;
  const canvasWrapEl = document.getElementById('game-canvas-wrap')!;
  const hudRootEl = document.getElementById('hud-root')!;
  const dialogRootEl = document.getElementById('dialog-root')!;
  const toastEl = document.getElementById('level-toast')!;
  const sleepLockRootEl = document.getElementById('sleep-lock-root')!;
  const suitcaseStageRootEl = document.getElementById('suitcase-stage-root')!;

  const assets = new AssetFactory();
  await assets.init();

  const sounds = new SoundManager();
  void sounds.loadManifestAudio(assets.getAudioManifest());

  const input = new InputManager();
  const dialogs = new Dialogs(dialogRootEl);
  const suitcaseStage = new SuitcaseStageOverlay(suitcaseStageRootEl, assets);

  const sceneManager = new SceneManager(canvasWrapEl);
  const initialSize = sceneManager.getSize();
  const cameraRig = new CameraRig(initialSize.width, initialSize.height);
  const boardRenderer = new BoardRenderer(assets);
  sceneManager.boardGroup.add(boardRenderer.group);

  sceneManager.setOnResize((w, h) => {
    cameraRig.setAspect(w, h);
  });

  let progress: ProgressState = loadProgress();
  let settings: GameSettings = loadSettings();
  let sessionElapsedMs = 0;
  let settingsOpen = false;
  let activeScreen: 'map' | 'game' = 'map';
  let currentLevel: LevelDefinition | null = null;
  let gameState: GameState | null = null;
  let undoStack = new UndoStack(30);
  let undosInLevel = 0;
  let outcomeHandled = false;
  let outcomeTimer: number | null = null;
  let toastTimer: number | null = null;

  const scheduler = new MoveScheduler(TICK_MS);
  let lastFrameTime = performance.now();

  const unlockAudio = () => sounds.unlock();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  input.onAnyInput(unlockAudio);

  const clearTimers = () => {
    if (outcomeTimer !== null) {
      window.clearTimeout(outcomeTimer);
      outcomeTimer = null;
    }
    if (toastTimer !== null) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
  };

  const hideToast = () => {
    toastEl.classList.add('hidden');
    if (toastTimer !== null) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
  };

  const showToast = (level: LevelDefinition) => {
    hideToast();
    toastEl.innerHTML = `
      <div class="level-toast-title">Wabe ${level.number}: ${level.title}</div>
      <div class="level-toast-text">${level.intro}</div>
    `;
    toastEl.classList.remove('hidden');
    toastTimer = window.setTimeout(hideToast, 4000);
  };

  const refreshMap = (focusNumber?: number) => {
    hiveMap.render(progress, sounds.isMuted(), focusNumber);
  };

  const sleepOverlay = new SleepSwarmOverlay(sleepLockRootEl, assets, () => {
    sessionElapsedMs = 0;
    input.setActionsPaused(false);
    if (activeScreen === 'map') {
      sounds.setMapMusicActive(true);
    }
  });

  const enterSleepLock = () => {
    if (sleepOverlay.isActive()) return;
    settingsOpen = false;
    clearTimers();
    suitcaseStage.stop();
    dialogs.close();
    hideToast();
    scheduler.clearPendingInput();
    sounds.setMapMusicActive(false);
    input.setActionsPaused(true);
    sleepOverlay.start();
  };

  const returnToMap = (focusNumber?: number) => {
    clearTimers();
    suitcaseStage.stop();
    dialogs.close();
    hideToast();
    scheduler.reset();
    activeScreen = 'map';
    gameScreenEl.classList.add('hidden');
    mapScreenEl.classList.remove('hidden');
    refreshMap(focusNumber ?? currentLevel?.number);
    hiveMap.onShow();
    sounds.setMapMusicActive(true);
  };

  const startLevel = (level: LevelDefinition) => {
    clearTimers();
    suitcaseStage.stop();
    dialogs.close();
    sounds.setMapMusicActive(false);
    sounds.play('ui_click');

    currentLevel = level;
    gameState = createGameState(level);
    undoStack.clear();
    undosInLevel = 0;
    outcomeHandled = false;
    scheduler.reset();

    boardRenderer.reset();
    sceneManager.buildHoneycombBackdrop(gameState.width, gameState.height);
    boardRenderer.syncState(gameState, []);
    cameraRig.configure(
      gameState.width,
      gameState.height,
      gameState.player.x,
      gameState.player.y
    );

    activeScreen = 'game';
    mapScreenEl.classList.add('hidden');
    gameScreenEl.classList.remove('hidden');

    // Re-sync renderer size now that gameScreen is visible
    const sz = sceneManager.getSize();
    sceneManager.renderer.setSize(sz.width, sz.height);
    cameraRig.setAspect(sz.width, sz.height);

    hud.invalidate();
    hud.render(gameState, level, undoStack.size(), sounds.isMuted());
    showToast(level);
  };

  const performUndo = () => {
    if (!gameState || !currentLevel) return;
    const prev = undoStack.pop();
    if (!prev) return;

    clearTimers();
    dialogs.close();
    sounds.play('ui_click');

    gameState = prev;
    undosInLevel++;
    outcomeHandled = false;
    scheduler.reset();
    boardRenderer.syncState(gameState, []);
    hud.invalidate();
    hud.render(gameState, currentLevel, undoStack.size(), sounds.isMuted());
  };

  const openTipDialog = () => {
    if (!currentLevel || activeScreen !== 'game' || dialogs.isOpen()) return;
    hideToast();
    sounds.play('ui_click');
    dialogs.showTip(currentLevel, () => {
      sounds.play('ui_click');
    });
  };

  const hiveMap = new HiveMap(mapScreenEl, CAMPAIGN_LEVELS, CAMPAIGN_WORLDS, assets, {
    onSelectLevel: () => {
      sounds.play('bee_move');
    },
    onStartLevel: (level) => {
      startLevel(level);
    },
    onOpenCalibration: () => {
      sounds.play('ui_click');
      dialogs.showCalibration(input, () => {
        sounds.play('ui_click');
      });
    },
    onOpenSettings: () => {
      sounds.play('ui_click');
      settingsOpen = true;
      dialogs.showSettings(
        settings,
        sessionElapsedMs,
        {
          completedCount: Object.keys(progress.completed).length,
          unlockedUpTo: progress.unlockedUpTo,
          totalLevels: CAMPAIGN_LEVELS.length
        },
        {
          onChangeLimit: (minutes) => {
            settings = { ...settings, playtimeLimitMinutes: minutes };
            saveSettings(settings);
            sounds.play('ui_click');
          },
          onResetTimer: () => {
            sessionElapsedMs = 0;
            sounds.play('ui_click');
          },
          onPreviewSleep: () => {
            settingsOpen = false;
            enterSleepLock();
          },
          onResetProgress: () => {
            progress = resetProgress();
            currentLevel = null;
            sounds.play('ui_click');
            refreshMap(1);
          },
          onClose: () => {
            settingsOpen = false;
            sounds.play('ui_click');
          }
        }
      );
    },
    onToggleMute: () => {
      sounds.toggleMute();
      sounds.play('ui_click');
      refreshMap();
    }
  });

  const hud = new HUD(hudRootEl, {
    onUndo: performUndo,
    onTip: openTipDialog,
    onRestart: () => {
      if (currentLevel) startLevel(currentLevel);
    },
    onToggleMute: () => {
      sounds.toggleMute();
      sounds.play('ui_click');
      if (gameState && currentLevel) {
        hud.render(gameState, currentLevel, undoStack.size(), sounds.isMuted());
      }
    },
    onBackToMap: () => {
      sounds.play('ui_click');
      returnToMap();
    }
  });

  input.onMenuNav((dir) => {
    if (dialogs.isOpen()) {
      dialogs.moveSelection(dir);
    } else if (suitcaseStage.isActive()) {
      suitcaseStage.moveSelection(dir);
    } else if (activeScreen === 'map') {
      hiveMap.moveSelection(dir);
    }
  });

  input.onAction((action) => {
    if (dialogs.isOpen()) {
      if (action === 'confirm') {
        dialogs.confirmSelection();
      } else if (action === 'menu') {
        dialogs.dismiss();
      } else if (action === 'undo' && gameState?.status === 'lost' && undoStack.canUndo()) {
        performUndo();
      }
      return;
    }

    if (suitcaseStage.isActive()) {
      if (action === 'confirm') {
        suitcaseStage.confirmSelection();
      } else if (action === 'menu') {
        suitcaseStage.finish();
      }
      return;
    }

    if (activeScreen === 'map') {
      if (action === 'confirm') {
        hiveMap.startSelected();
      }
      return;
    }

    if (activeScreen === 'game' && currentLevel) {
      if (action === 'confirm' && gameState?.status === 'playing') {
        const trickIdx = boardRenderer.triggerBeeTrick();
        if (trickIdx !== null) {
          const trickSounds = ['trick_1', 'trick_2', 'trick_3'] as const;
          sounds.play(trickSounds[trickIdx]);
        }
      } else if (action === 'undo') {
        performUndo();
      } else if (action === 'restart') {
        startLevel(currentLevel);
      } else if (action === 'tip') {
        openTipDialog();
      } else if (action === 'menu') {
        sounds.play('ui_click');
        returnToMap();
      }
    }
  });

  // Initial render of Hexagonal Hive Map & start calm map melody
  refreshMap(Math.min(progress.unlockedUpTo, CAMPAIGN_LEVELS.length));
  sounds.setMapMusicActive(true);

  try {
    if (!localStorage.getItem(WELCOMED_KEY)) {
      dialogs.showWelcome(() => {
        try {
          localStorage.setItem(WELCOMED_KEY, 'true');
        } catch {
          // Ignore storage error
        }
        sounds.play('ui_click');
      });
    }
  } catch {
    // Ignore storage error
  }

  const frame = (nowMs: number) => {
    const dt = Math.min((nowMs - lastFrameTime) / 1000, 0.08);
    lastFrameTime = nowMs;

    if (sleepOverlay.isActive()) {
      sleepOverlay.update(dt);
      requestAnimationFrame(frame);
      return;
    }

    if (!settingsOpen) {
      sessionElapsedMs += dt * 1000;
      if (isPlaytimeLimitReached(sessionElapsedMs, settings.playtimeLimitMinutes)) {
        enterSleepLock();
        requestAnimationFrame(frame);
        return;
      }
    }

    const dir = input.poll(nowMs);

    if (activeScreen === 'map') {
      hiveMap.updateAnimation(dt);
    }

    if (activeScreen === 'game' && gameState && currentLevel) {
      const paused =
        dialogs.isOpen() || suitcaseStage.isActive() || gameState.status !== 'playing';
      let tickProgress = 1;

      if (paused) {
        scheduler.clearPendingInput();
      } else {
        if (tickStickyTimer(gameState, dt * 1000)) {
          sounds.play('sticky_clean');
        }
        if (dir !== null) {
          hideToast();
        }

        const stepRes = scheduler.update(nowMs, dt * 1000, dir);
        tickProgress = stepRes.tickProgress;

        if (stepRes.shouldStep) {
          const moveDir = stepRes.moveDir;

          if (moveDir !== null && willDirectionChangeState(gameState, moveDir)) {
            undoStack.push(gameState);
          }

          const events = stepGame(gameState, moveDir);
          if (gameState.player.movedThisTick) {
            scheduler.markPlayerMoved(nowMs);
          }

          boardRenderer.syncState(gameState, events);
          sounds.playEvents(events);
          if (
            gameState.player.movedThisTick &&
            !events.some((e) => e.type === 'sticky_wings')
          ) {
            sounds.play('bee_move');
          }

          if (gameState.status === 'won' && !outcomeHandled) {
            outcomeHandled = true;
            const wonLevel = currentLevel;
            const wonHoney = gameState.collectedHoney;
            const stars = undosInLevel <= 3 ? 3 : 2;
            const wasNextAlreadyUnlocked = progress.unlockedUpTo > wonLevel.number;
            progress = completeLevel(progress, wonLevel.number, wonLevel.id, stars, wonHoney);

            const nextLevel =
              CAMPAIGN_LEVELS.find((l) => l.number === wonLevel.number + 1) ?? null;
            const newlyUnlockedNumber =
              !wasNextAlreadyUnlocked && nextLevel ? nextLevel.number : null;

            const exitX = gameState.exitPos.x;
            const exitY = gameState.exitPos.y;

            outcomeTimer = window.setTimeout(() => {
              hideToast();
              hud.updateExitArrow(false, null);
              const originNdc = cameraRig.projectTileToNdc(exitX, exitY);
              suitcaseStage.start(wonLevel, originNdc, {
                onZoomStart: () => sounds.play('suitcase_zoom'),
                onLidOpen: () => sounds.play('suitcase_open'),
                onContinue: () => {
                  sounds.play('ui_click');
                  dialogs.showWin(
                    wonLevel,
                    stars,
                    wonHoney,
                    newlyUnlockedNumber,
                    () => returnToMap(newlyUnlockedNumber ?? wonLevel.number),
                    () => startLevel(wonLevel)
                  );
                }
              });
            }, 380);
          } else if (gameState.status === 'lost' && !outcomeHandled) {
            outcomeHandled = true;
            const lostLevel = currentLevel;
            const reason = gameState.failReason;

            outcomeTimer = window.setTimeout(() => {
              dialogs.showUps(
                reason,
                undoStack.canUndo(),
                performUndo,
                () => startLevel(lostLevel),
                () => returnToMap(lostLevel.number)
              );
            }, 420);
          }
        }

        if (gameState.status !== 'playing') {
          tickProgress = 1;
        }
      }

      boardRenderer.update(gameState, tickProgress, dt);

      const beePos = boardRenderer.getBeeWorldPosition();
      cameraRig.update(dt, beePos.x, beePos.y, gameState.player.facing);

      hud.render(gameState, currentLevel, undoStack.size(), sounds.isMuted());

      const sz = sceneManager.getSize();
      const exitHint = cameraRig.getExitScreenHint(
        gameState.exitPos.x,
        gameState.exitPos.y,
        sz.width,
        sz.height
      );
      hud.updateExitArrow(gameState.exitOpen && gameState.status === 'playing', exitHint);

      sceneManager.render(cameraRig.camera);

      if (suitcaseStage.isActive()) {
        suitcaseStage.update(dt);
      }
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

void bootstrap();
