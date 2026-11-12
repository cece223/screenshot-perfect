import * as THREE from "three";
import type { StyleOption } from "../sim/catalog";
import { mulberry32 } from "../sim/rng";

const SIZE = 512;

function canvas(size = SIZE) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!] as const;
}

function finish(c: HTMLCanvasElement, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.repeat.set(repeat, repeat);
  return t;
}

function grain(g: CanvasRenderingContext2D, amount: number, seed = 3) {
  const r = mulberry32(seed);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${amount})` : `rgba(0,0,0,${amount})`;
    g.fillRect(r() * SIZE, r() * SIZE, 2, 2);
  }
}

const cache = new Map<string, THREE.CanvasTexture>();

/** One texture tile = 2 m x 2 m of surface. */
export function surfaceTexture(opt: StyleOption): THREE.CanvasTexture {
  const hit = cache.get(opt.id);
  if (hit) return hit;
  const [c, g] = canvas();
  const a = opt.colors[0] ?? "#ffffff";
  const b = opt.colors[1] ?? a;
  const c3 = opt.colors[2] ?? b;
  const d4 = opt.colors[3] ?? c3;
  const r = mulberry32(opt.id.length * 977);
  g.fillStyle = a;
  g.fillRect(0, 0, SIZE, SIZE);
  switch (opt.pattern) {
    case "solid":
      grain(g, 0.025);
      break;
    case "stripes":
      g.fillStyle = b;
      for (let x = 0; x < SIZE; x += 64) g.fillRect(x, 0, 32, SIZE);
      grain(g, 0.02);
      break;
    case "dots":
      g.fillStyle = b;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          g.beginPath();
          g.arc(x * 64 + (y % 2) * 32 + 16, y * 64 + 32, 9, 0, Math.PI * 2);
          g.fill();
        }
      break;
    case "trellis":
      g.strokeStyle = b;
      g.lineWidth = 5;
      for (let i = -8; i < 16; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64 + SIZE, SIZE);
        g.moveTo(i * 64 + SIZE, 0);
        g.lineTo(i * 64, SIZE);
        g.stroke();
      }
      break;
    case "planks":
      for (let row = 0; row < 8; row++) {
        const y = row * 64;
        let x = -r() * 200;
        while (x < SIZE) {
          const len = 160 + r() * 200;
          g.fillStyle = r() > 0.5 ? a : b;
          g.fillRect(x, y, len, 64);
          g.globalAlpha = 0.07;
          g.fillStyle = "#000";
          for (let k = 0; k < 5; k++) g.fillRect(x, y + 8 + r() * 48, len, 1.5);
          g.globalAlpha = 1;
          g.fillStyle = "rgba(0,0,0,0.25)";
          g.fillRect(x, y, 2, 64);
          x += len;
        }
        g.fillStyle = "rgba(0,0,0,0.22)";
        g.fillRect(0, y, SIZE, 2);
      }
      break;
    case "herringbone":
      g.fillStyle = b;
      g.fillRect(0, 0, SIZE, SIZE);
      for (let y = -2; y < 10; y++)
        for (let x = -2; x < 10; x++) {
          const px = x * 64;
          const py = y * 64 + x * 32;
          g.save();
          g.translate(px, py);
          g.rotate((x % 2 ? 1 : -1) * Math.PI / 4);
          g.fillStyle = (x + y) % 2 ? a : b;
          g.fillRect(0, 0, 90, 30);
          g.strokeStyle = "rgba(0,0,0,0.2)";
          g.strokeRect(0, 0, 90, 30);
          g.restore();
        }
      break;
    case "checker":
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? b : a;
          g.fillRect(x * 128, y * 128, 128, 128);
        }
      g.globalAlpha = 0.08;
      g.strokeStyle = "#888";
      for (let i = 0; i < 30; i++) {
        g.beginPath();
        g.moveTo(r() * SIZE, r() * SIZE);
        g.bezierCurveTo(r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    case "terrazzo":
      for (let i = 0; i < 420; i++) {
        g.fillStyle = [b, c3, d4, "#ffffff"][i % 4] ?? b;
        g.beginPath();
        const cx = r() * SIZE;
        const cy = r() * SIZE;
        const s = 3 + r() * 9;
        g.moveTo(cx + s, cy);
        for (let k = 1; k < 5; k++) g.lineTo(cx + Math.cos(k * 1.3) * s * (0.6 + r()), cy + Math.sin(k * 1.3) * s * (0.6 + r()));
        g.fill();
      }
      break;
    case "tiles":
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? b : a;
          g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
        }
      break;
  }
  const t = finish(c);
  cache.set(opt.id, t);
  return t;
}

export function labelTexture(text: string, opts: { bg: string; fg: string; font?: string; w?: number; h?: number }) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = opts.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg;
  g.font = opts.font ?? `600 ${Math.floor(h * 0.48)}px Georgia, 'Times New Roman', serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + h * 0.03);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function artTexture(seed: number) {
  const [c, g] = canvas(256);
  const r = mulberry32(seed);
  const pal = ["#d9806b", "#e0b545", "#8db5a0", "#f2a7a3", "#2f3f5c", "#f6ecdc"];
  g.fillStyle = "#f8f1e6";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = pal[Math.floor(r() * pal.length)] ?? "#d9806b";
    g.beginPath();
    if (r() > 0.5) g.arc(r() * 256, r() * 256, 30 + r() * 70, 0, Math.PI * 2);
    else g.ellipse(r() * 256, r() * 256, 40 + r() * 80, 15 + r() * 40, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
