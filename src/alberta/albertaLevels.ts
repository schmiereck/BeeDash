import { AlbertaLevelDef, ClockPeriod, LogicGateKind } from './albertaTypes';

/** LCM(2, 4, 6, 8) = 24 seconds: exact full repetition period for 1s, 2s, 3s, and 4s clocks */
export const CYCLE_LENGTH = 24;

export const CLOCK_COLORS: Record<
  ClockPeriod,
  { hex: number; css: string; name: string }
> = {
  1: { hex: 0xffd43b, css: '#ffd43b', name: 'Gelb (1s)' },
  2: { hex: 0x4dabf7, css: '#4dabf7', name: 'Blau (2s)' },
  3: { hex: 0x51cf66, css: '#51cf66', name: 'Grün (3s)' },
  4: { hex: 0xcc5de8, css: '#cc5de8', name: 'Lila (4s)' }
};

export const GATE_COLORS: Record<LogicGateKind, number> = {
  AND: 0xff922b,
  OR: 0x20c997,
  NOT: 0xff6b9d
};

export function makeClockWaveform(period: ClockPeriod): boolean[] {
  const wave: boolean[] = [];
  for (let t = 0; t < CYCLE_LENGTH; t++) {
    wave.push(Math.floor(t / period) % 2 === 0);
  }
  return wave;
}

export function andWaveforms(a: boolean[], b: boolean[]): boolean[] {
  return a.map((v, i) => Boolean(v && b[i]));
}

export function orWaveforms(a: boolean[], b: boolean[]): boolean[] {
  return a.map((v, i) => Boolean(v || b[i]));
}

export function notWaveform(a: boolean[]): boolean[] {
  return a.map((v) => !v);
}

export function waveformsEqual(a: boolean[], b: boolean[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Boolean(a[i]) !== Boolean(b[i])) return false;
  }
  return true;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/**
 * Compact display cycle length for the live beat comparison strip:
 * full LCM of all source blink periods (2 * period), at least 8s and capped at CYCLE_LENGTH (24s).
 */
export function getDisplayCycleLength(level: AlbertaLevelDef): number {
  let periodLcm = 1;
  for (const block of level.blocks) {
    if (block.kind === 'source') {
      periodLcm = lcm(periodLcm, block.period * 2);
    }
  }
  return Math.max(8, Math.min(CYCLE_LENGTH, periodLcm));
}

const W1 = makeClockWaveform(1);
const W2 = makeClockWaveform(2);
const W3 = makeClockWaveform(3);
const W4 = makeClockWaveform(4);

export const ALBERTA_LEVELS: AlbertaLevelDef[] = [
  {
    id: 'alberta-1',
    number: 1,
    title: 'Hallo, Glühbirne!',
    subtitle: 'Takt-Vergleich (1s & 2s)',
    intro:
      'Alberta probiert ihre neuen Blink-Würfel aus! Stecke eine Leitung vom richtigen Takt-Würfel zur freien Steckdose neben der Zielbirne, sodass beide Glühbirnen rechts gleich blinken.',
    tip: 'Die rechte Zielbirne blinkt im langsamen 2-Sekunden-Takt (Blau). Stelle dich neben eine Steckdose des blauen 2s-Würfels, drücke Leertaste / Enter, laufe zur linken Seite des Ziel-Würfels und stecke die Leitung dort ein!',
    width: 11,
    height: 8,
    start: { x: 4, y: 3 },
    blocks: [
      { id: 'S1', kind: 'source', x: 2, y: 2, period: 2 },
      { id: 'S2', kind: 'source', x: 2, y: 5, period: 1 },
      {
        id: 'T1',
        kind: 'target',
        x: 7,
        y: 3,
        targetWaveform: W2,
        targetLabel: '2s'
      }
    ]
  },
  {
    id: 'alberta-2',
    number: 2,
    title: 'Das Gegenteil – NICHT!',
    subtitle: 'NICHT-Baustein',
    intro:
      'Hoppla – die Zielbirne blinkt genau umgekehrt zum 2s-Würfel! Zum Glück hat Alberta ihren rosa NICHT-Baustein erfunden, der AN und AUS einfach umdreht.',
    tip: 'Verbinde zuerst den 2s-Würfel mit dem linken Eingang des NICHT-Bausteins. Ziehe danach eine zweite Leitung vom rechten Ausgang des NICHT-Bausteins bis zur Zielbirne!',
    width: 12,
    height: 7,
    start: { x: 4, y: 5 },
    blocks: [
      { id: 'S1', kind: 'source', x: 2, y: 3, period: 2 },
      { id: 'G1', kind: 'logic', gate: 'NOT', x: 5, y: 3 },
      {
        id: 'T1',
        kind: 'target',
        x: 8,
        y: 3,
        targetWaveform: notWaveform(W2),
        targetLabel: '! 2s'
      }
    ]
  },
  {
    id: 'alberta-3',
    number: 3,
    title: 'Beide zugleich – UND!',
    subtitle: '2er-Würfel UND-Logik',
    intro:
      'Dieser große UND-Baustein ist zwei Würfel hoch und hat links zwei Eingänge! Sein Ausgang leuchtet nur dann, wenn BEIDE Eingänge gleichzeitig AN sind.',
    tip: 'Schließe links oben am UND-Baustein den gelben 1s-Würfel an und links unten den blauen 2s-Würfel. Verbinde dann den rechten Ausgang mit der Zielbirne!',
    width: 13,
    height: 9,
    start: { x: 4, y: 4 },
    blocks: [
      { id: 'S1', kind: 'source', x: 2, y: 2, period: 1 },
      { id: 'S2', kind: 'source', x: 2, y: 6, period: 2 },
      { id: 'G1', kind: 'logic', gate: 'AND', x: 6, y: 3 },
      {
        id: 'T1',
        kind: 'target',
        x: 9,
        y: 3,
        targetWaveform: andWaveforms(W1, W2),
        targetLabel: '1s & 2s'
      }
    ]
  },
  {
    id: 'alberta-4',
    number: 4,
    title: 'ODER & Zwei Ziele!',
    subtitle: 'Vier Steckdosen clever nutzen',
    intro:
      'Gleich zwei Zielbirnen warten gleichzeitig! Der grüne 3s-Würfel muss dafür gleich zwei Leitungen abgeben – gut, dass jeder Takt-Würfel rundherum vier Steckdosen hat!',
    tip: 'Stecke beim ODER-Baustein links den blauen 2s-Würfel und den grünen 3s-Würfel ein (über seine obere Steckdose) und führe den Ausgang zum oberen Ziel. Nutze eine weitere Steckdose des 3s-Würfels für den NICHT-Baustein zum unteren Ziel!',
    width: 14,
    height: 9,
    start: { x: 4, y: 4 },
    blocks: [
      { id: 'S1', kind: 'source', x: 2, y: 2, period: 2 },
      { id: 'S2', kind: 'source', x: 2, y: 6, period: 3 },
      { id: 'G1', kind: 'logic', gate: 'OR', x: 6, y: 2 },
      { id: 'G2', kind: 'logic', gate: 'NOT', x: 6, y: 6 },
      {
        id: 'T1',
        kind: 'target',
        x: 10,
        y: 2,
        targetWaveform: orWaveforms(W2, W3),
        targetLabel: '2s|3s'
      },
      {
        id: 'T2',
        kind: 'target',
        x: 10,
        y: 6,
        targetWaveform: notWaveform(W3),
        targetLabel: '! 3s'
      }
    ]
  },
  {
    id: 'alberta-5',
    number: 5,
    title: 'Albertas Meister-Schaltung!',
    subtitle: 'UND, NICHT & ODER kombiniert',
    intro:
      'Das große Erfinder-Finale! Baue oben mit 1s und 4s eine UND-Schaltung – und leite unten den lila 4s-Würfel erst durch NICHT, bevor er mit dem grünen 3s-Würfel ins ODER geht!',
    tip: '1) Oben: 1s und 4s in den UND-Baustein -> oberes Ziel. 2) Unten: Zweite Steckdose von 4s in den NICHT-Baustein -> NICHT-Ausgang oben in ODER, 3s unten in ODER -> unteres Ziel! Kleine Kabel-Kreuzungen überspringt die Leitung mit einem Bogen.',
    width: 16,
    height: 11,
    start: { x: 4, y: 5 },
    blocks: [
      { id: 'S1', kind: 'source', x: 2, y: 2, period: 1 },
      { id: 'S2', kind: 'source', x: 2, y: 5, period: 4 },
      { id: 'S3', kind: 'source', x: 2, y: 8, period: 3 },
      { id: 'G1', kind: 'logic', gate: 'AND', x: 6, y: 2 },
      { id: 'G2', kind: 'logic', gate: 'NOT', x: 5, y: 6 },
      { id: 'G3', kind: 'logic', gate: 'OR', x: 9, y: 6 },
      {
        id: 'T1',
        kind: 'target',
        x: 12,
        y: 2,
        targetWaveform: andWaveforms(W1, W4),
        targetLabel: '1s & 4s'
      },
      {
        id: 'T2',
        kind: 'target',
        x: 12,
        y: 6,
        targetWaveform: orWaveforms(notWaveform(W4), W3),
        targetLabel: '!4s | 3s'
      }
    ]
  }
];
