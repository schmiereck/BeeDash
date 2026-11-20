import { GameEvent } from '../game/types';

export type SoundKey =
  | GameEvent['type']
  | 'bgm'
  | 'map_bgm'
  | 'ui_click'
  | 'bee_move'
  | 'trick_1'
  | 'trick_2'
  | 'trick_3'
  | 'sticky_clean'
  | 'suitcase_zoom'
  | 'suitcase_open';

const MUTE_STORAGE_KEY = 'beedash_muted_v1';

const MAP_MELODY_NOTES: Array<number | null> = [
  349.23, 440.0, 523.25, null,
  587.33, 523.25, 440.0, null,
  392.0, 440.0, 523.25, null,
  440.0, 392.0, 349.23, null,
  523.25, 587.33, 698.46, null,
  587.33, 523.25, 440.0, null,
  392.0, 440.0, 523.25, 392.0,
  349.23, null, null, null
];
const MAP_BASS_NOTES = [174.61, 130.81, 146.83, 116.54, 174.61, 130.81, 116.54, 174.61];

export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private customBuffers = new Map<string, AudioBuffer>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmStarted = false;
  private mapMusicWanted = false;
  private mapBgmSource: AudioBufferSourceNode | null = null;
  private mapIntervalId: number | null = null;
  private mapStepIndex = 0;
  private lastPlayedAt = new Map<string, number>();
  private lastHumPitchFactor = 1;

  constructor() {
    this.muted = this.loadMutedState();
  }

  private loadMutedState(): boolean {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    } catch {
      // Ignore storage errors
    }

    if (muted) {
      if (this.bgmSource) {
        try {
          this.bgmSource.stop();
        } catch {
          // Ignore already stopped
        }
        this.bgmSource = null;
        this.bgmStarted = false;
      }
      this.stopMapMusic();
    } else {
      if (this.mapMusicWanted) {
        this.startMapMusicIfNeeded();
      } else if (this.customBuffers.has('bgm') && !this.bgmStarted) {
        this.startBgmIfAvailable();
      }
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && !this.muted) {
      if (this.mapMusicWanted) {
        this.startMapMusicIfNeeded();
      } else if (!this.bgmStarted) {
        this.startBgmIfAvailable();
      }
    }
  }

  setMapMusicActive(active: boolean): void {
    this.mapMusicWanted = active;
    if (active) {
      this.startMapMusicIfNeeded();
    } else {
      this.stopMapMusic();
    }
  }

  private startMapMusicIfNeeded(): void {
    if (this.muted || !this.mapMusicWanted) return;
    if (this.mapBgmSource || this.mapIntervalId !== null) return;
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const customMap = this.customBuffers.get('map_bgm');
    if (customMap) {
      const src = this.ctx.createBufferSource();
      src.buffer = customMap;
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.22;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);
      this.mapBgmSource = src;
      return;
    }

    this.playNextMapNote();
    this.mapIntervalId = window.setInterval(() => {
      this.playNextMapNote();
    }, 900);
  }

  private stopMapMusic(): void {
    if (this.mapBgmSource) {
      try {
        this.mapBgmSource.stop();
      } catch {
        // Ignore already stopped
      }
      this.mapBgmSource = null;
    }
    if (this.mapIntervalId !== null) {
      window.clearInterval(this.mapIntervalId);
      this.mapIntervalId = null;
    }
  }

  private playNextMapNote(): void {
    if (this.muted || !this.mapMusicWanted || !this.ctx || this.ctx.state !== 'running') {
      return;
    }
    const ctx = this.ctx;
    const step = this.mapStepIndex % MAP_MELODY_NOTES.length;
    this.mapStepIndex++;

    const noteFreq = MAP_MELODY_NOTES[step];
    if (noteFreq !== null) {
      const start = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, start);
      filter.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(noteFreq, start);
      g1.gain.setValueAtTime(0.0001, start);
      g1.gain.linearRampToValueAtTime(0.048, start + 0.04);
      g1.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);
      osc1.connect(g1);
      g1.connect(filter);
      osc1.start(start);
      osc1.stop(start + 1.4);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(noteFreq, start);
      g2.gain.setValueAtTime(0.0001, start);
      g2.gain.linearRampToValueAtTime(0.012, start + 0.04);
      g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);
      osc2.connect(g2);
      g2.connect(filter);
      osc2.start(start);
      osc2.stop(start + 0.9);
    }

    if (step % 4 === 0) {
      const bassFreq = MAP_BASS_NOTES[Math.floor(step / 4) % MAP_BASS_NOTES.length];
      const start = ctx.currentTime;
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, start);
      bassGain.gain.setValueAtTime(0.0001, start);
      bassGain.gain.linearRampToValueAtTime(0.026, start + 0.14);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(start);
      bassOsc.stop(start + 2.45);
    }
  }

  async loadManifestAudio(audioMap: Record<string, string>): Promise<void> {
    const entries = Object.entries(audioMap);
    if (entries.length === 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    await Promise.all(
      entries.map(async ([key, url]) => {
        if (!url) return;
        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const arr = await resp.arrayBuffer();
          const buf = await ctx.decodeAudioData(arr);
          this.customBuffers.set(key, buf);
        } catch (err) {
          console.warn(`Konnte Sound "${key}" (${url}) nicht laden.`, err);
        }
      })
    );
  }

  startBgmIfAvailable(): void {
    if (this.muted || this.bgmStarted) return;
    const buf = this.customBuffers.get('bgm');
    const ctx = this.ensureContext();
    if (!buf || !ctx) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    this.bgmSource = src;
    this.bgmStarted = true;
  }

  playEvents(events: GameEvent[]): void {
    if (this.muted || events.length === 0) return;
    const seen = new Set<string>();
    for (const ev of events) {
      if (!seen.has(ev.type)) {
        seen.add(ev.type);
        this.play(ev.type);
      }
    }
  }

  play(key: SoundKey): void {
    if (this.muted || key === 'bgm' || key === 'map_bgm') return;

    const nowMs = performance.now();
    if (
      key === 'pot_wobble' ||
      key === 'honey_drip' ||
      key === 'bee_move' ||
      key === 'sticky_blocked'
    ) {
      const prev = this.lastPlayedAt.get(key) ?? 0;
      if (nowMs - prev < 140) return;
    }
    this.lastPlayedAt.set(key, nowMs);

    const ctx = this.ensureContext();
    if (!ctx) return;

    const custom = this.customBuffers.get(key);
    if (custom) {
      const src = ctx.createBufferSource();
      src.buffer = custom;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      return;
    }

    this.playSynth(ctx, key);
  }

  private playTone(
    ctx: AudioContext,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private playBeeHum(ctx: AudioContext): void {
    const start = ctx.currentTime;
    let pitchFactor = 0.88 + Math.random() * 0.24;
    if (Math.abs(pitchFactor - this.lastHumPitchFactor) < 0.05) {
      pitchFactor = pitchFactor > 1 ? pitchFactor - 0.08 : pitchFactor + 0.08;
    }
    this.lastHumPitchFactor = pitchFactor;

    const duration = 0.28 + Math.random() * 0.04;
    const peakVol = 0.055 + Math.random() * 0.025;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(136 * pitchFactor, start);
    osc.frequency.linearRampToValueAtTime(152 * pitchFactor, start + 0.1);
    osc.frequency.linearRampToValueAtTime(132 * pitchFactor, start + duration);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(23 + Math.random() * 7, start);
    lfoGain.gain.setValueAtTime(6, start);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(315 + Math.random() * 55, start);
    filter.Q.setValueAtTime(1.2, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakVol, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    lfo.start(start);
    osc.stop(start + duration + 0.02);
    lfo.stop(start + duration + 0.02);
  }

  private playDig(ctx: AudioContext): void {
    const start = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(460, start);
    filter.Q.setValueAtTime(0.9, start);
    filter.connect(ctx.destination);

    const triggerNibble = (delay: number, fStart: number, fEnd: number, dur: number, vol: number) => {
      const t = start + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(fStart, t);
      osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    triggerNibble(0, 175, 145, 0.09, 0.18);
    triggerNibble(0.042, 145, 120, 0.08, 0.13);
  }

  private playSynth(ctx: AudioContext, key: SoundKey): void {
    switch (key) {
      case 'ui_click':
        this.playTone(ctx, 520, 620, 0.06, 'sine', 0.09);
        break;
      case 'bee_move':
        this.playBeeHum(ctx);
        break;
      case 'dig':
        this.playDig(ctx);
        break;
      case 'trick_1':
        // Mini-Purzelbaum: comical slide up + bounce
        this.playTone(ctx, 240, 540, 0.18, 'sine', 0.15, 0);
        this.playTone(ctx, 300, 460, 0.14, 'triangle', 0.14, 0.14);
        break;
      case 'trick_2':
        // Fröhliche Pirouette: bubbly 4-note ascending twirl
        this.playTone(ctx, 523.25, 523.25, 0.08, 'triangle', 0.13, 0);
        this.playTone(ctx, 659.25, 659.25, 0.08, 'triangle', 0.13, 0.06);
        this.playTone(ctx, 783.99, 783.99, 0.08, 'triangle', 0.13, 0.12);
        this.playTone(ctx, 1046.5, 1046.5, 0.15, 'sine', 0.15, 0.18);
        break;
      case 'trick_3':
        // Bienen-Schwänzeltanz: double cartoon bounce + cheerful hum
        this.playTone(ctx, 220, 400, 0.14, 'sine', 0.15, 0);
        this.playTone(ctx, 260, 480, 0.14, 'sine', 0.15, 0.14);
        this.playTone(ctx, 115, 145, 0.12, 'triangle', 0.1, 0.28);
        break;
      case 'flower':
        this.playTone(ctx, 587.33, 587.33, 0.11, 'sine', 0.16, 0);
        this.playTone(ctx, 880, 880, 0.16, 'sine', 0.15, 0.06);
        break;
      case 'rescue':
        this.playTone(ctx, 523.25, 523.25, 0.12, 'triangle', 0.16, 0);
        this.playTone(ctx, 659.25, 659.25, 0.12, 'triangle', 0.16, 0.08);
        this.playTone(ctx, 783.99, 1046.5, 0.22, 'sine', 0.18, 0.16);
        break;
      case 'pot_wobble':
        this.playTone(ctx, 210, 260, 0.06, 'triangle', 0.08, 0);
        this.playTone(ctx, 240, 190, 0.06, 'triangle', 0.07, 0.05);
        break;
      case 'pot_land':
        this.playTone(ctx, 140, 68, 0.14, 'sine', 0.2);
        break;
      case 'pot_push':
        this.playTone(ctx, 180, 150, 0.09, 'triangle', 0.1);
        break;
      case 'honey_drip':
        this.playTone(ctx, 420, 660, 0.08, 'sine', 0.07);
        break;
      case 'honey_collect':
        this.playTone(ctx, 440, 740, 0.12, 'sine', 0.14, 0);
        this.playTone(ctx, 740, 920, 0.1, 'sine', 0.1, 0.08);
        break;
      case 'exit_open':
        this.playTone(ctx, 523.25, 523.25, 0.15, 'sine', 0.15, 0);
        this.playTone(ctx, 659.25, 659.25, 0.15, 'sine', 0.15, 0.08);
        this.playTone(ctx, 783.99, 783.99, 0.15, 'sine', 0.15, 0.16);
        this.playTone(ctx, 1046.5, 1046.5, 0.35, 'triangle', 0.18, 0.24);
        break;
      case 'exit_locked':
        this.playTone(ctx, 220, 170, 0.09, 'square', 0.06, 0);
        this.playTone(ctx, 190, 140, 0.09, 'square', 0.05, 0.08);
        break;
      case 'bonk_pot':
        this.playTone(ctx, 320, 120, 0.22, 'triangle', 0.22, 0);
        this.playTone(ctx, 220, 290, 0.16, 'sine', 0.14, 0.12);
        break;
      case 'sticky_wings':
        this.playTone(ctx, 380, 180, 0.26, 'sine', 0.18, 0);
        this.playTone(ctx, 240, 140, 0.22, 'triangle', 0.12, 0.14);
        break;
      case 'sticky_blocked':
        this.playTone(ctx, 210, 155, 0.09, 'sine', 0.11, 0);
        this.playTone(ctx, 165, 220, 0.07, 'triangle', 0.07, 0.04);
        break;
      case 'sticky_clean':
        this.playTone(ctx, 587.33, 880, 0.11, 'sine', 0.11);
        break;
      case 'bowl_fill':
        this.playTone(ctx, 392, 523.25, 0.14, 'triangle', 0.15, 0);
        this.playTone(ctx, 523.25, 659.25, 0.18, 'sine', 0.14, 0.09);
        break;
      case 'gate_open':
        this.playTone(ctx, 440, 440, 0.12, 'sine', 0.13, 0);
        this.playTone(ctx, 554.37, 554.37, 0.12, 'sine', 0.13, 0.07);
        this.playTone(ctx, 659.25, 659.25, 0.14, 'sine', 0.13, 0.14);
        this.playTone(ctx, 880, 880, 0.28, 'triangle', 0.15, 0.21);
        break;
      case 'win':
        this.playTone(ctx, 523.25, 523.25, 0.14, 'triangle', 0.16, 0);
        this.playTone(ctx, 659.25, 659.25, 0.14, 'triangle', 0.16, 0.1);
        this.playTone(ctx, 783.99, 783.99, 0.14, 'triangle', 0.16, 0.2);
        this.playTone(ctx, 1046.5, 1046.5, 0.42, 'sine', 0.22, 0.3);
        break;
      case 'suitcase_zoom':
        // Gentle warm rising bell/pad chime as the suitcase zooms toward the player
        this.playTone(ctx, 261.63, 392.0, 0.55, 'sine', 0.11, 0);
        this.playTone(ctx, 329.63, 523.25, 0.52, 'triangle', 0.08, 0.04);
        break;
      case 'suitcase_open': {
        // Double brass clasp snap + shimmering ascending harp glissando
        this.playTone(ctx, 980, 620, 0.045, 'triangle', 0.09, 0);
        this.playTone(ctx, 1120, 720, 0.045, 'triangle', 0.09, 0.07);
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1567.98];
        notes.forEach((n, idx) => {
          const delay = 0.12 + idx * 0.065;
          this.playTone(ctx, n, n * 1.004, 0.32, 'sine', 0.09, delay);
          this.playTone(ctx, n, n, 0.22, 'triangle', 0.04, delay);
        });
        break;
      }
    }
  }
}
