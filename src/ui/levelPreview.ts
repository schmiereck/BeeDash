import { parseLevelAscii } from '../game/levels/parser';
import { LevelDefinition } from '../game/types';

const PETAL_COLORS = ['#ffd54f', '#f89cb0', '#fff8f0'];

export function renderLevelPreview(
  canvas: HTMLCanvasElement,
  level: LevelDefinition
): void {
  const parsed = parseLevelAscii(level);
  const { width, height, grid, playerStart } = parsed;

  const cssW = Math.max(canvas.clientWidth || 310, 220);
  const cssH = Math.round(Math.min(185, Math.max(125, cssW * 0.58)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Warm honeycomb backdrop
  ctx.fillStyle = '#f2be5c';
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.strokeStyle = 'rgba(184, 118, 36, 0.28)';
  ctx.lineWidth = 1;
  const bgHexR = 11;
  const bgDx = Math.sqrt(3) * bgHexR;
  const bgDy = 1.5 * bgHexR;
  for (let row = -1; row * bgDy < cssH + bgHexR; row++) {
    const offX = row % 2 === 0 ? 0 : bgDx * 0.5;
    for (let col = -1; col * bgDx < cssW + bgHexR; col++) {
      const hx = col * bgDx + offX;
      const hy = row * bgDy;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = ((60 * i - 30) * Math.PI) / 180;
        const px = hx + bgHexR * Math.cos(a);
        const py = hy + bgHexR * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const pad = 10;
  const tileSize = Math.floor(Math.min((cssW - pad * 2) / width, (cssH - pad * 2) / height));
  const boardW = tileSize * width;
  const boardH = tileSize * height;
  const originX = Math.floor((cssW - boardW) / 2);
  const originY = Math.floor((cssH - boardH) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      const px = originX + x * tileSize;
      const py = originY + y * tileSize;
      const cx = px + tileSize / 2;
      const cy = py + tileSize / 2;

      if (cell.type === 'wall') {
        ctx.fillStyle = '#6f4324';
        ctx.fillRect(px, py, tileSize, tileSize);
        ctx.fillStyle = '#8d5832';
        ctx.fillRect(
          px + tileSize * 0.12,
          py + tileSize * 0.12,
          tileSize * 0.76,
          tileSize * 0.76
        );
      } else if (cell.type === 'rounded_wall') {
        ctx.fillStyle = '#a5622a';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = Math.max(1, tileSize * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.25, 0, Math.PI * 2);
        ctx.stroke();
      } else if (cell.type === 'wax') {
        ctx.fillStyle = '#f6c344';
        ctx.fillRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        ctx.strokeStyle = 'rgba(205, 138, 22, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const r = tileSize * 0.3;
        for (let i = 0; i < 6; i++) {
          const a = ((60 * i - 30) * Math.PI) / 180;
          const vx = cx + r * Math.cos(a);
          const vy = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (cell.type === 'flower') {
        ctx.fillStyle = '#56a84a';
        ctx.fillRect(cx - tileSize * 0.06, cy, tileSize * 0.12, tileSize * 0.32);
        ctx.fillStyle = PETAL_COLORS[Math.abs(cell.variant) % PETAL_COLORS.length];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(
            cx + Math.cos(a) * tileSize * 0.2,
            cy - tileSize * 0.05 + Math.sin(a) * tileSize * 0.2,
            tileSize * 0.12,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(cx, cy - tileSize * 0.05, tileSize * 0.13, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.type === 'honeypot') {
        ctx.fillStyle = '#e38b29';
        ctx.beginPath();
        ctx.arc(cx, cy + tileSize * 0.06, tileSize * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f46d7a';
        ctx.fillRect(px + tileSize * 0.22, py + tileSize * 0.14, tileSize * 0.56, tileSize * 0.22);
        ctx.fillStyle = '#ffe485';
        ctx.fillRect(px + tileSize * 0.24, py + tileSize * 0.32, tileSize * 0.52, tileSize * 0.08);
      } else if (cell.type === 'honey_liquid') {
        ctx.fillStyle = '#ffb300';
        ctx.beginPath();
        ctx.roundRect(
          px + tileSize * 0.08,
          py + tileSize * 0.14,
          tileSize * 0.84,
          tileSize * 0.72,
          tileSize * 0.25
        );
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 240, 175, 0.55)';
        ctx.beginPath();
        ctx.arc(cx - tileSize * 0.12, cy - tileSize * 0.08, tileSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.type === 'honey_source') {
        ctx.fillStyle = '#c97614';
        ctx.fillRect(px + tileSize * 0.14, py + tileSize * 0.06, tileSize * 0.72, tileSize * 0.45);
        ctx.fillStyle = '#ffb300';
        ctx.beginPath();
        ctx.arc(cx, cy + tileSize * 0.18, tileSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.type === 'honey_bowl') {
        ctx.fillStyle = '#4a321f';
        ctx.fillRect(px + tileSize * 0.24, py + tileSize * 0.68, tileSize * 0.52, tileSize * 0.18);
        ctx.fillStyle = '#f2c94c';
        ctx.beginPath();
        ctx.arc(cx, cy + tileSize * 0.04, tileSize * 0.34, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#9c5308';
        ctx.lineWidth = Math.max(1, tileSize * 0.07);
        ctx.stroke();
      } else if (cell.type === 'honey_gate') {
        ctx.strokeStyle = '#6f4324';
        ctx.lineWidth = Math.max(1.5, tileSize * 0.1);
        ctx.strokeRect(px + tileSize * 0.1, py + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
        for (const frac of [0.35, 0.65]) {
          ctx.beginPath();
          ctx.moveTo(px + tileSize * frac, py + tileSize * 0.1);
          ctx.lineTo(px + tileSize * frac, py + tileSize * 0.9);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffae08';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.type === 'petal_gate') {
        ctx.strokeStyle = '#6f4324';
        ctx.lineWidth = Math.max(1.5, tileSize * 0.1);
        ctx.strokeRect(px + tileSize * 0.1, py + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
        ctx.strokeStyle = '#fff3db';
        for (const frac of [0.35, 0.65]) {
          ctx.beginPath();
          ctx.moveTo(px + tileSize * frac, py + tileSize * 0.14);
          ctx.lineTo(px + tileSize * frac, py + tileSize * 0.86);
          ctx.stroke();
        }
        ctx.fillStyle = '#f46d91';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.type === 'trapped_bee') {
        ctx.fillStyle = 'rgba(255, 243, 184, 0.75)';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f5b731';
        ctx.lineWidth = Math.max(1, tileSize * 0.09);
        ctx.stroke();
        drawMiniBee(ctx, cx, cy, tileSize * 0.58);
      } else if (cell.type === 'exit') {
        // Flat yellow-black suitcase preview
        ctx.fillStyle = '#f7c22c';
        ctx.fillRect(px + tileSize * 0.1, py + tileSize * 0.26, tileSize * 0.8, tileSize * 0.52);
        ctx.fillStyle = '#3b2616';
        ctx.fillRect(px + tileSize * 0.24, py + tileSize * 0.26, tileSize * 0.12, tileSize * 0.52);
        ctx.fillRect(px + tileSize * 0.64, py + tileSize * 0.26, tileSize * 0.12, tileSize * 0.52);
        ctx.strokeStyle = '#3b2616';
        ctx.lineWidth = Math.max(1.2, tileSize * 0.08);
        ctx.strokeRect(
          px + tileSize * 0.1,
          py + tileSize * 0.26,
          tileSize * 0.8,
          tileSize * 0.52
        );
      }
    }
  }

  // Draw blossom pressure plates underneath tiles
  for (const plate of parsed.pressurePlates) {
    const px = originX + plate.x * tileSize;
    const py = originY + plate.y * tileSize;
    const cx = px + tileSize / 2;
    ctx.fillStyle = '#6f4324';
    ctx.fillRect(px + tileSize * 0.12, py + tileSize * 0.72, tileSize * 0.76, tileSize * 0.18);
    ctx.fillStyle = '#f46d91';
    ctx.fillRect(px + tileSize * 0.18, py + tileSize * 0.58, tileSize * 0.64, tileSize * 0.18);
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(cx, py + tileSize * 0.66, tileSize * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw blossom portals underneath start marker
  for (const portal of parsed.portals) {
    const cx = originX + (portal.x + 0.5) * tileSize;
    const cy = originY + (portal.y + 0.5) * tileSize;
    ctx.fillStyle = portal.pair === 0 ? 'rgba(185, 117, 255, 0.35)' : 'rgba(56, 217, 210, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = portal.pair === 0 ? '#b975ff' : '#38d9d2';
    ctx.lineWidth = Math.max(1.5, tileSize * 0.11);
    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw grubs ('M') and mites ('m')
  for (const pest of parsed.pests) {
    const cx = originX + (pest.x + 0.5) * tileSize;
    const cy = originY + (pest.y + 0.5) * tileSize;
    if (pest.kind === 'grub') {
      const r = tileSize * 0.16;
      ctx.fillStyle = '#9cd66d';
      ctx.beginPath();
      ctx.arc(cx - r * 0.9, cy + r * 0.25, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6f0c2';
      ctx.beginPath();
      ctx.arc(cx - r * 0.1, cy + r * 0.1, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe49e';
      ctx.beginPath();
      ctx.arc(cx + r * 0.75, cy, r * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e130c';
      ctx.beginPath();
      ctx.arc(cx + r * 0.98, cy - r * 0.18, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = tileSize * 0.23;
      ctx.strokeStyle = '#6e272e';
      ctx.lineWidth = Math.max(1, tileSize * 0.07);
      for (const side of [-1, 1]) {
        for (const dy of [-0.55, 0, 0.55]) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + dy * r);
          ctx.lineTo(cx + side * r * 1.45, cy + dy * r * 1.2);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#d94854';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb74d';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.2, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw player bee at start
  const beeCx = originX + (playerStart.x + 0.5) * tileSize;
  const beeCy = originY + (playerStart.y + 0.5) * tileSize;
  drawMiniBee(ctx, beeCx, beeCy, tileSize * 0.82);

  ctx.restore();
}

function drawMiniBee(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
): void {
  const r = size * 0.34;
  // Wings
  ctx.fillStyle = 'rgba(242, 251, 255, 0.88)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.7, cy - r * 0.65, r * 0.6, r * 0.36, -0.4, 0, Math.PI * 2);
  ctx.ellipse(cx + r * 0.7, cy - r * 0.65, r * 0.6, r * 0.36, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Yellow body
  ctx.fillStyle = '#f7c22c';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.1, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brown stripe
  ctx.fillStyle = '#3b2616';
  ctx.fillRect(cx - r * 0.28, cy - r * 0.6, r * 0.42, r * 1.45);

  // Head
  ctx.beginPath();
  ctx.arc(cx + r * 0.65, cy - r * 0.05, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}
