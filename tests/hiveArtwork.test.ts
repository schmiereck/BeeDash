import { describe, expect, it } from 'vitest';
import { CAMPAIGN_WORLDS, HivePersonality } from '../src/game/levels/campaign';
import {
  renderMainSkepBackdropSvg,
  renderMiniSkepSvg,
  renderPersonalityBeeSvg
} from '../src/ui/hiveArtwork';

describe('Woven Skep Beehive Artwork & Personality Bees', () => {
  it('assigns valid beehive personalities and short titles to every campaign hive', () => {
    const validPersonalities: HivePersonality[] = [
      'diligent',
      'funny',
      'shy',
      'lazy',
      'curious'
    ];
    expect(CAMPAIGN_WORLDS.length).toBeGreaterThanOrEqual(2);

    for (const world of CAMPAIGN_WORLDS) {
      expect(world.title).toContain('Bienenstock');
      expect(world.shortTitle.trim().length).toBeGreaterThan(0);
      expect(world.personalityTag.trim().length).toBeGreaterThan(0);
      expect(validPersonalities).toContain(world.personality);
    }
  });

  it('renders distinct SVGs for all 5 bee personalities', () => {
    const personalities: HivePersonality[] = [
      'diligent',
      'funny',
      'shy',
      'lazy',
      'curious'
    ];
    const svgs = personalities.map((p) => renderPersonalityBeeSvg(p, { size: 60 }));

    for (const svg of svgs) {
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    }
    expect(new Set(svgs).size).toBe(personalities.length);
  });

  it('renders valid mini skep and main skep backdrop SVGs with hive nameplate', () => {
    for (const world of CAMPAIGN_WORLDS) {
      const mini = renderMiniSkepSvg({
        uid: world.number,
        accentColor: world.accentColor,
        active: true,
        locked: false
      });
      expect(mini).toContain('<svg');
      expect(mini).toContain(`mini-skep-grad-${world.number}`);

      const backdrop = renderMainSkepBackdropSvg(world);
      expect(backdrop).toContain('hive-skep-backdrop');
      expect(backdrop).toContain(world.shortTitle);
      expect(backdrop).toContain(world.personalityTag);
      expect(backdrop).toContain(`main-skep-straw-${world.number}`);
    }
  });
});
