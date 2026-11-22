import { CampaignWorld, HivePersonality } from '../game/levels/campaign';

function renderPersonalityBeeInner(personality: HivePersonality): string {
  const wings = `
    <ellipse cx="26" cy="24" rx="11" ry="7" transform="rotate(-24 26 24)" fill="#f2fbff" fill-opacity="0.88" stroke="#4a321f" stroke-width="2" />
    <ellipse cx="52" cy="24" rx="11" ry="7" transform="rotate(24 52 24)" fill="#f2fbff" fill-opacity="0.88" stroke="#4a321f" stroke-width="2" />
  `;

  const baseBody = `
    <ellipse cx="40" cy="37" rx="19" ry="15" fill="#f7c22c" stroke="#4a321f" stroke-width="2.4" />
    <path d="M25 32 Q38 35 55 32" fill="none" stroke="#3b2616" stroke-width="4.2" stroke-linecap="round" />
    <path d="M23 41 Q38 44 56 41" fill="none" stroke="#3b2616" stroke-width="4.2" stroke-linecap="round" />
    <circle cx="52" cy="34" r="10.5" fill="#3b2616" stroke="#4a321f" stroke-width="2" />
    <path d="M51 24 Q55 15 60 15" fill="none" stroke="#3b2616" stroke-width="2.1" stroke-linecap="round" />
    <circle cx="60" cy="15" r="2.6" fill="#f7c22c" stroke="#3b2616" stroke-width="1.3" />
    <path d="M46 25 Q45 16 49 14" fill="none" stroke="#3b2616" stroke-width="2.1" stroke-linecap="round" />
    <circle cx="49" cy="14" r="2.6" fill="#f7c22c" stroke="#3b2616" stroke-width="1.3" />
  `;

  if (personality === 'diligent') {
    return `
      ${wings}
      ${baseBody}
      <!-- Bright focused eyes + cheerful smile + tiny golden honey pail -->
      <circle cx="55.5" cy="32.5" r="2.4" fill="#fffdf6" />
      <circle cx="56" cy="32.5" r="1.4" fill="#1e130c" />
      <circle cx="49" cy="33" r="2.2" fill="#fffdf6" />
      <circle cx="49.5" cy="33" r="1.3" fill="#1e130c" />
      <ellipse cx="52" cy="38" rx="3" ry="1.8" fill="#f58fa3" opacity="0.88" />
      <path d="M49 38.5 Q53 41.5 57.5 38.5" fill="none" stroke="#ffe599" stroke-width="1.7" stroke-linecap="round" />
      <!-- Golden honey pail carried below -->
      <path d="M35 50 Q40 46 45 50" fill="none" stroke="#7a4822" stroke-width="2" />
      <polygon points="33,50 47,50 45,60 35,60" fill="#d98218" stroke="#4a321f" stroke-width="2" stroke-linejoin="round" />
      <ellipse cx="40" cy="50" rx="6.8" ry="2.2" fill="#ffcf48" stroke="#4a321f" stroke-width="1.6" />
    `;
  }

  if (personality === 'funny') {
    return `
      ${wings}
      ${baseBody}
      <!-- Playful wink + big grin + party hat -->
      <path d="M47 32 Q50 29.5 53 32" fill="none" stroke="#fffdf6" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="56.5" cy="32.5" r="2.3" fill="#fffdf6" />
      <circle cx="57" cy="32.5" r="1.3" fill="#1e130c" />
      <ellipse cx="51" cy="37.5" rx="3.2" ry="2" fill="#f58fa3" opacity="0.92" />
      <path d="M48.5 38.5 Q53.5 43 58 38" fill="none" stroke="#ffe27a" stroke-width="2" stroke-linecap="round" />
      <!-- Festive party hat -->
      <polygon points="44,24 59,23 50,8" fill="#e85d85" stroke="#4a321f" stroke-width="2" stroke-linejoin="round" />
      <line x1="47.5" y1="16.5" x2="54.5" y2="16" stroke="#ffe27a" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="50" cy="7.5" r="3.4" fill="#ffe27a" stroke="#4a321f" stroke-width="1.6" />
    `;
  }

  if (personality === 'shy') {
    return `
      ${wings}
      ${baseBody}
      <!-- Sweet shy eyes + rosy cheeks + pink blossom shielding gently -->
      <circle cx="49" cy="33" r="2.3" fill="#fffdf6" />
      <circle cx="49.2" cy="33.3" r="1.4" fill="#1e130c" />
      <circle cx="56" cy="33" r="2.3" fill="#fffdf6" />
      <circle cx="56.2" cy="33.3" r="1.4" fill="#1e130c" />
      <ellipse cx="47.5" cy="37.5" rx="3.6" ry="2.2" fill="#ff7ca0" opacity="0.95" />
      <ellipse cx="57.5" cy="37.2" rx="3.2" ry="2" fill="#ff7ca0" opacity="0.95" />
      <g transform="translate(56, 46)">
        <circle cx="-5" cy="-2" r="4.5" fill="#f89cb0" stroke="#4a321f" stroke-width="1.5" />
        <circle cx="5" cy="-2" r="4.5" fill="#f89cb0" stroke="#4a321f" stroke-width="1.5" />
        <circle cx="0" cy="-6" r="4.5" fill="#f89cb0" stroke="#4a321f" stroke-width="1.5" />
        <circle cx="-3" cy="4" r="4.2" fill="#f89cb0" stroke="#4a321f" stroke-width="1.5" />
        <circle cx="3" cy="4" r="4.2" fill="#f89cb0" stroke="#4a321f" stroke-width="1.5" />
        <circle cx="0" cy="-0.5" r="3.2" fill="#ffd54f" stroke="#4a321f" stroke-width="1.3" />
      </g>
    `;
  }

  if (personality === 'lazy') {
    return `
      ${wings}
      ${baseBody}
      <!-- Cozy sleepy eyelids + nightcap + floating Zzz -->
      <path d="M47 33 Q49.8 35.5 52.5 33" fill="none" stroke="#fffdf6" stroke-width="2" stroke-linecap="round" />
      <path d="M54.5 33 Q57 35.5 59.5 33" fill="none" stroke="#fffdf6" stroke-width="2" stroke-linecap="round" />
      <ellipse cx="52.5" cy="37.5" rx="3" ry="1.7" fill="#f58fa3" opacity="0.85" />
      <path d="M44 25 Q51 11 61 19 L57 26 Z" fill="#639cd9" stroke="#4a321f" stroke-width="2" stroke-linejoin="round" />
      <ellipse cx="52" cy="25" rx="8.5" ry="2.8" fill="#fffaf0" stroke="#4a321f" stroke-width="1.6" />
      <circle cx="62" cy="19" r="3.2" fill="#fffaf0" stroke="#4a321f" stroke-width="1.6" />
      <text x="63" y="13" font-size="10" font-weight="900" fill="#4a321f">z</text>
      <text x="69" y="8.5" font-size="8" font-weight="900" fill="#7c5434">z</text>
    `;
  }

  // curious
  return `
    ${wings}
    ${baseBody}
    <circle cx="49" cy="33" r="3.6" fill="#fffdf6" stroke="#d99a1e" stroke-width="1.8" />
    <circle cx="57" cy="33" r="3.6" fill="#fffdf6" stroke="#d99a1e" stroke-width="1.8" />
    <line x1="52.5" y1="33" x2="53.5" y2="33" stroke="#d99a1e" stroke-width="1.8" />
    <circle cx="49.4" cy="33" r="1.5" fill="#1e130c" />
    <circle cx="57.4" cy="33" r="1.5" fill="#1e130c" />
    <path d="M50 39 Q53.5 41.5 57 38.5" fill="none" stroke="#ffe27a" stroke-width="1.7" stroke-linecap="round" />
    <path d="M67 16 L69 20 L73 22 L69 24 L67 28 L65 24 L61 22 L65 20 Z" fill="#ffe27a" stroke="#4a321f" stroke-width="1" />
  `;
}

export function renderPersonalityBeeSvg(
  personality: HivePersonality,
  options?: { size?: number; className?: string }
): string {
  const width = options?.size ?? 58;
  const height = Math.round((width * 64) / 80);
  const cls = options?.className ? ` class="${options.className}"` : '';
  return `<svg${cls} width="${width}" height="${height}" viewBox="0 0 80 64" aria-hidden="true">${renderPersonalityBeeInner(personality)}</svg>`;
}

export function renderMiniSkepSvg(options: {
  uid: number | string;
  accentColor: string;
  active: boolean;
  locked: boolean;
}): string {
  const gradId = `mini-skep-grad-${options.uid}`;
  const strawCoils = [
    { y: 15, rx: 14, ry: 5 },
    { y: 22, rx: 21, ry: 5.5 },
    { y: 30, rx: 27, ry: 6 },
    { y: 38, rx: 32, ry: 6.5 },
    { y: 47, rx: 35, ry: 7 },
    { y: 56, rx: 37, ry: 7.2 },
    { y: 65, rx: 38.5, ry: 7.5 }
  ];

  const coilsSvg = strawCoils
    .map(
      (c, i) => `
      <ellipse cx="46" cy="${c.y}" rx="${c.rx}" ry="${c.ry}" fill="url(#${gradId})" stroke="#6b421c" stroke-width="1.9" />
      <line x1="${46 - c.rx * 0.52}" y1="${c.y - c.ry + 1}" x2="${46 - c.rx * 0.48}" y2="${c.y + c.ry - 1}" stroke="#875424" stroke-width="1.5" opacity="0.7" />
      <line x1="46" y1="${c.y - c.ry + 1}" x2="46" y2="${c.y + c.ry - 1}" stroke="#875424" stroke-width="1.5" opacity="0.7" />
      <line x1="${46 + c.rx * 0.52}" y1="${c.y - c.ry + 1}" x2="${46 + c.rx * 0.48}" y2="${c.y + c.ry - 1}" stroke="#875424" stroke-width="1.5" opacity="0.7" />
      ${i === 0 ? `<ellipse cx="46" cy="${c.y - 2}" rx="8" ry="2.8" fill="#f0c770" stroke="#6b421c" stroke-width="1.4" />` : ''}
    `
    )
    .join('');

  return `
    <svg class="mini-skep-svg" width="84" height="72" viewBox="0 0 92 78" aria-hidden="true">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#c38433" />
          <stop offset="38%" stop-color="#f2c464" />
          <stop offset="72%" stop-color="#df9e3d" />
          <stop offset="100%" stop-color="#a86a22" />
        </linearGradient>
      </defs>
      <ellipse cx="46" cy="72" rx="40" ry="4.5" fill="rgba(74,50,31,0.22)" />
      ${coilsSvg}
      <!-- Colored ribbon band highlighting this hive -->
      <path d="M13 38 Q46 43 79 38" fill="none" stroke="${options.accentColor}" stroke-width="3.6" stroke-linecap="round" opacity="${options.locked ? '0.45' : '0.95'}" />
      <!-- Dark oval skep entrance hole on lower right -->
      <ellipse cx="63" cy="61" rx="7.5" ry="6.2" fill="#2d190b" stroke="#6b421c" stroke-width="2" />
      <ellipse cx="62" cy="60" rx="4.5" ry="3.4" fill="#170b04" />
    </svg>
  `;
}

export function renderMainSkepBackdropSvg(world: CampaignWorld): string {
  const uid = world.number;
  const wallGradId = `main-skep-straw-${uid}`;
  const combGradId = `main-skep-comb-${uid}`;

  // Stacked horizontal straw coil bands behind the open cutaway interior (outer x spans roughly -212..402, center 95)
  const bands = [
    { y: -176, w: 230, h: 30, rx: 15 },
    { y: -150, w: 356, h: 32, rx: 16 },
    { y: -120, w: 462, h: 34, rx: 17 },
    { y: -88, w: 536, h: 36, rx: 18 },
    { y: -52, w: 584, h: 36, rx: 18 },
    { y: -16, w: 612, h: 36, rx: 18 },
    { y: 20, w: 626, h: 36, rx: 18 },
    { y: 56, w: 632, h: 36, rx: 18 },
    { y: 92, w: 634, h: 36, rx: 18 },
    { y: 128, w: 636, h: 36, rx: 18 },
    { y: 164, w: 642, h: 36, rx: 18 }
  ];

  const strawCoilsHtml = bands
    .map((b) => {
      const x = 95 - b.w / 2;
      const stitchXs = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42].map((f) => 95 + f * b.w);
      const stitches = stitchXs
        .map(
          (sx) =>
            `<line x1="${sx.toFixed(1)}" y1="${b.y + 3}" x2="${sx.toFixed(1)}" y2="${b.y + b.h - 3}" stroke="#7f4c1c" stroke-width="3.2" stroke-linecap="round" opacity="0.55" />`
        )
        .join('');
      return `
        <rect x="${x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.rx}" fill="url(#${wallGradId})" stroke="#5d3817" stroke-width="3.5" />
        <line x1="${x + 16}" y1="${b.y + 7}" x2="${x + b.w - 16}" y2="${b.y + 7}" stroke="#ffdf8e" stroke-width="2.2" stroke-linecap="round" opacity="0.55" />
        ${stitches}
      `;
    })
    .join('');

  return `
    <g class="hive-skep-backdrop" aria-hidden="true">
      <defs>
        <linearGradient id="${wallGradId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#b4742a" />
          <stop offset="22%" stop-color="#e3a748" />
          <stop offset="50%" stop-color="#f5c96e" />
          <stop offset="80%" stop-color="#d89738" />
          <stop offset="100%" stop-color="#9f6321" />
        </linearGradient>
        <radialGradient id="${combGradId}" cx="50%" cy="46%" r="60%">
          <stop offset="0%" stop-color="#fff4c4" />
          <stop offset="68%" stop-color="#fbd783" />
          <stop offset="100%" stop-color="#e3a843" />
        </radialGradient>
      </defs>

      <!-- Warm soft shadow underneath the giant straw beehive -->
      <ellipse cx="95" cy="204" rx="314" ry="13" fill="rgba(74,50,31,0.22)" />

      <!-- Top straw knob crown -->
      <ellipse cx="95" cy="-184" rx="74" ry="15" fill="url(#${wallGradId})" stroke="#5d3817" stroke-width="3.5" />

      <!-- Outer coiled straw skep layers -->
      ${strawCoilsHtml}

      <!-- Broad cutaway honey-lit hive chamber holding all 12 playable hexes -->
      <path
        d="M -168,154 L -172,-36 C -172,-138 -80,-158 95,-158 C 270,-158 362,-138 362,-36 L 358,154 C 356,164 344,170 326,170 L -136,170 C -154,170 -166,164 -168,154 Z"
        fill="url(#${combGradId})"
        stroke="#5d3817"
        stroke-width="6"
      />
      <path
        d="M -160,149 L -164,-34 C -164,-130 -76,-150 95,-150 C 266,-150 354,-130 354,-34 L 350,149 C 348,157 338,162 322,162 L -132,162 C -148,162 -158,157 -160,149 Z"
        fill="none"
        stroke="#c9882f"
        stroke-width="3"
        stroke-dasharray="10 7"
        opacity="0.5"
      />

      <!-- Cozy bee entrance opening on bottom right of the straw wall -->
      <ellipse cx="372" cy="176" rx="26" ry="17" fill="#3a210f" stroke="#5d3817" stroke-width="3.5" />
      <ellipse cx="370" cy="175" rx="17" ry="10.5" fill="#1d0f06" />

      <!-- Crest medallion with the recognizable personality bee hovering on top of the hive -->
      <circle cx="95" cy="-226" r="34" fill="#fff9e8" stroke="${world.accentColor}" stroke-width="5.5" />
      <circle cx="95" cy="-226" r="35.5" fill="none" stroke="#4a321f" stroke-width="3" />
      <svg x="51" y="-261" width="88" height="70" viewBox="0 0 80 64">
        ${renderPersonalityBeeInner(world.personality)}
      </svg>

      <!-- Wooden hive nameplate pinned cleanly above the cutaway arch -->
      <rect x="-56" y="-194" width="302" height="29" rx="14.5" fill="#fff8e7" stroke="#4a321f" stroke-width="3" />
      <text x="95" y="-175" text-anchor="middle" font-size="14" font-weight="900" fill="#4a321f">
        ${world.emoji} ${world.shortTitle} • ${world.personalityTag}
      </text>
    </g>
  `;
}
