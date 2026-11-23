"use client";

/**
 * GhostFibersCanvas
 *
 * A Canvas 2D fallback for the WebGL2 `GhostFibers` background
 * (https://reactbits.dev/c/backgrounds/ghost-fibers).
 *
 * It mirrors the same camera, ribbon geometry, depth of field and additive
 * glow so users on machines without WebGL2 still get the identical hero
 * background. Fibers are drawn as additive glow sprites instead of instanced
 * GPU quads.
 */

import { useEffect, useRef } from "react";
import type { HTMLAttributes } from "react";

import "./GhostFibers.css";

type HoverEffectName = "focus" | "part" | "none";
type Rgb = [number, number, number];

export interface GhostFibersCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  glowColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  scale?: number;
  rotation?: number;
  rollSpeed?: number;
  layers?: number;
  waves?: number;
  twist?: number;
  threads?: number;
  volume?: number;
  spread?: number;
  thickness?: number;
  flow?: number;
  foldGlow?: number;
  perspective?: number;
  depthOfField?: number;
  focusDepth?: number;
  particles?: number;
  sparkle?: number;
  brightness?: number;
  vignette?: number;
  speed?: number;
  mouseInteraction?: boolean;
  hoverEffect?: HoverEffectName;
  mouseStrength?: number;
  pulseOnClick?: boolean;
  intro?: boolean;
  dpr?: number;
  paused?: boolean;
}

interface CanvasSettings {
  glowColor: string;
  lineColor: string | undefined;
  secondaryColor: string | undefined;
  scale: number;
  rotation: number;
  rollSpeed: number;
  layers: number;
  waves: number;
  twist: number;
  threads: number;
  volume: number;
  spread: number;
  thickness: number;
  flow: number;
  foldGlow: number;
  perspective: number;
  depthOfField: number;
  focusDepth: number;
  particles: number;
  sparkle: number;
  brightness: number;
  vignette: number;
  speed: number;
  mouseInteraction: boolean;
  hover: number;
  mouseStrength: number;
  pulseOnClick: boolean;
  intro: boolean;
  paused: boolean;
  dpr?: number;
}

interface CanvasState {
  time: number;
  roll: number;
  intro: number;
  width: number;
  height: number;
  fit: number;
  colorKey: string;
  glow: Rgb;
  secondary: Rgb;
  line: Rgb;
  focus: number;
  hoverPresence: number;
}

interface RibbonSample {
  s: number;
  c: [number, number, number];
  n0: [number, number, number];
  b0: [number, number, number];
  hw: number;
}

interface FiberPoint {
  x: number;
  y: number;
  depth: number;
  vis: number;
  boost: number;
}

interface ScreenProjection {
  x: number;
  y: number;
  depth: number;
}

const CAMERA = 7.5;
const FOV = 0.56;
const RIBBON_LENGTH = 24;
const INTRO_SECONDS = 2.6;
const DEG = Math.PI / 180;
const FOCAL = 1 / (2 * Math.tan(FOV / 2));
const MAX_RENDER_DIM = 2400;
const SAMPLES = 28;
const DEPTH_SPREAD = 0.12;

const PLACEMENTS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 0, 0],
  [1.9, -4.6, -0.08, 2.4],
  [-1.05, 2.0, 0.12, 4.1],
];
const RIBBON_GAIN = [1, 0.5, 0.55];
const RIBBON_TINT = [0, 0.75, 0.35];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hash11 = (n: number) => {
  const x = Math.sin(n * 91.3458) * 47453.5453;
  return x - Math.floor(x);
};
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Column-major matrices, identical to the WebGL implementation. */
const frustum = (fov: number, aspect: number, near: number, far: number): number[] => {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ];
};

const multiply = (a: number[], b: number[]): number[] => {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row]! * b[col * 4]! +
        a[4 + row]! * b[col * 4 + 1]! +
        a[8 + row]! * b[col * 4 + 2]! +
        a[12 + row]! * b[col * 4 + 3]!;
    }
  }
  return out;
};

const orientation = (yaw: number, pitch: number, roll: number): number[] => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
  const rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp];
  const rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]): number[] => {
    const out = new Array<number>(9);
    for (let col = 0; col < 3; col += 1) {
      for (let row = 0; row < 3; row += 1) {
        out[col * 3 + row] =
          a[row]! * b[col * 3]! + a[3 + row]! * b[col * 3 + 1]! + a[6 + row]! * b[col * 3 + 2]!;
      }
    }
    return out;
  };
  return mul(rz, mul(rx, ry));
};

const projectPoint = (m: number[], x: number, y: number, z: number): ScreenProjection => {
  const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  const cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
  const inv = 1 / (Math.abs(cw) < 1e-6 ? 1e-6 : cw);
  return { x: cx * inv, y: cy * inv, depth: cw };
};

const parseColor = (value?: string): Rgb | null => {
  if (!value) return null;
  let hex = String(value).trim();
  if (hex[0] === "#") hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length !== 6) return null;
  const num = Number.parseInt(hex, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const makeGlowSprite = (rgb: Rgb, tight: boolean) => {
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext("2d")!;
  const [r, g, b] = rgb;
  const grad = spriteCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(tight ? 0.3 : 0.16, `rgba(${r},${g},${b},${tight ? 0.5 : 0.62})`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},${tight ? 0.08 : 0.16})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  spriteCtx.fillStyle = grad;
  spriteCtx.fillRect(0, 0, size, size);
  return sprite;
};

const GhostFibersCanvas = ({
  glowColor = "#8b5cf6",
  lineColor,
  secondaryColor,
  scale = 1,
  rotation = 18,
  rollSpeed = 0.15,
  layers = 3,
  waves = 1,
  twist = 1.2,
  threads = 56,
  volume = 0.7,
  spread = 1,
  thickness = 1,
  flow = 0.4,
  foldGlow = 1,
  perspective = 0.65,
  depthOfField = 0.85,
  focusDepth = 0,
  particles = 0.5,
  sparkle = 0.5,
  brightness = 1,
  vignette = 0.3,
  speed = 0.5,
  mouseInteraction = true,
  hoverEffect = "none",
  mouseStrength = 1,
  pulseOnClick = true,
  intro = true,
  dpr,
  paused = false,
  className = "",
  ...rest
}: GhostFibersCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({ x: 0, y: 0, inside: false });
  const lookRef = useRef<{ x: number; y: number; vx: number; vy: number }>({ x: 0, y: 0, vx: 0, vy: 0 });
  const hoverRef = useRef<{ x: number; y: number; presence: number; placed: boolean }>({
    x: 0,
    y: 0,
    presence: 0,
    placed: false,
  });
  const pulseRef = useRef<{ s: number; age: number; strength: number; ribbon: number }>({
    s: 0,
    age: 9,
    strength: 0,
    ribbon: 0,
  });

  const settings: CanvasSettings = {
    glowColor,
    lineColor,
    secondaryColor,
    scale: clamp(scale, 0.3, 3),
    rotation,
    rollSpeed,
    layers: clamp(Math.round(layers), 1, 3),
    waves: Math.max(0, waves),
    twist: Math.max(0, twist),
    threads: clamp(Math.round(threads), 6, 72),
    volume: clamp(volume, 0, 2),
    spread: clamp(spread, 0.2, 3),
    thickness: clamp(thickness, 0.2, 4),
    flow,
    foldGlow: clamp(foldGlow, 0, 3),
    perspective: clamp(perspective, 0, 1),
    depthOfField: clamp(depthOfField, 0, 2),
    focusDepth: clamp(focusDepth, -1, 1),
    particles: clamp(particles, 0, 2),
    sparkle: clamp(sparkle, 0, 2),
    brightness: Math.max(0, brightness),
    vignette: clamp(vignette, 0, 1),
    speed: Math.max(0, speed),
    mouseInteraction,
    hover: hoverEffect === "part" ? 1 : 0,
    mouseStrength: Math.max(0, mouseStrength),
    pulseOnClick,
    intro,
    paused,
    dpr,
  };
  const settingsRef = useRef<CanvasSettings>(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const state: CanvasState = {
      time: 0,
      roll: 0,
      intro: settingsRef.current.intro && !reduce ? 0 : INTRO_SECONDS,
      width: 1,
      height: 1,
      fit: 1,
      colorKey: "",
      glow: [140, 92, 246],
      secondary: [112, 74, 196],
      line: [230, 204, 250],
      focus: CAMERA + (settingsRef.current.focusDepth ?? 0) * 3,
      hoverPresence: 0,
    };
    let raf = 0;
    let last = 0;
    let visible = true;
    let alive = true;

    let glowSprite = makeGlowSprite(state.glow, false);
    let highlightSprite = makeGlowSprite(state.line, true);
    let ribbonColors = RIBBON_TINT.map((tint) =>
      state.glow.map((c, i) => Math.round(c + (state.secondary[i]! - c) * tint)),
    );

    const resolveColors = (conf: CanvasSettings): void => {
      const key = `${conf.glowColor}|${conf.lineColor}|${conf.secondaryColor}`;
      if (key === state.colorKey) return;
      state.colorKey = key;
      const glow: Rgb = parseColor(conf.glowColor) || [140, 92, 246];
      const secondary: Rgb =
        parseColor(conf.secondaryColor) || (glow.map((c) => Math.round(c * 0.8)) as Rgb);
      const line: Rgb =
        parseColor(conf.lineColor) || (glow.map((c) => Math.round(c + (255 - c) * 0.72)) as Rgb);
      state.glow = glow;
      state.secondary = secondary;
      state.line = line;
      glowSprite = makeGlowSprite(glow, false);
      highlightSprite = makeGlowSprite(line, true);
      ribbonColors = RIBBON_TINT.map((tint) =>
        glow.map((c, i) => Math.round(c + (secondary[i]! - c) * tint)),
      );
    };

    const centerLocal = (
      s: number,
      t: number,
      place: readonly [number, number, number, number],
      waves: number,
    ): [number, number, number] => {
      const ph = place[3];
      const x = s * RIBBON_LENGTH;
      const y =
        waves *
          (0.52 * Math.sin(x * 0.43 + t * 0.31 + ph) +
            0.26 * Math.sin(x * 0.79 - t * 0.23 + 1.3 + ph * 0.7)) +
        place[0] +
        x * place[2];
      const z = waves * 0.65 * Math.sin(x * 0.33 + t * 0.19 + 0.7 + ph * 1.3) + place[1];
      return [x, y, z];
    };

    const buildPath = (ribbon: number, conf: CanvasSettings): RibbonSample[] => {
      const place = PLACEMENTS[ribbon]!;
      const width = 0.62 * conf.spread;
      const out = new Array<RibbonSample>(SAMPLES);
      for (let i = 0; i < SAMPLES; i += 1) {
        const s = (i + 0.5) / SAMPLES - 0.5;
        const c0 = centerLocal(s, state.time, place, conf.waves);
        const c1 = centerLocal(s + 0.004, state.time, place, conf.waves);
        let tx = c1[0] - c0[0];
        let ty = c1[1] - c0[1];
        let tz = c1[2] - c0[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl;
        ty /= tl;
        tz /= tl;
        const dotUp = ty;
        let n0x = -tx * dotUp;
        let n0y = 1 - ty * dotUp;
        let n0z = -tz * dotUp;
        const nl = Math.hypot(n0x, n0y, n0z) || 1;
        n0x /= nl;
        n0y /= nl;
        n0z /= nl;
        const b0x = ty * n0z - tz * n0y;
        const b0y = tz * n0x - tx * n0z;
        const b0z = tx * n0y - ty * n0x;
        const hw = width * (0.78 + 0.22 * Math.cos(s * Math.PI));
        out[i] = { s, c: c0, n0: [n0x, n0y, n0z], b0: [b0x, b0y, b0z], hw };
      }
      return out;
    };

    const render = (): void => {
      const conf = settingsRef.current;
      resolveColors(conf);
      const deviceW = canvas.width;
      const deviceH = canvas.height;
      const ratio = deviceW / Math.max(state.width, 1);
      const introA = conf.paused || reduce ? 1 : clamp(state.intro / INTRO_SECONDS, 0, 1);
      const introEase = 1 - (1 - introA) * (1 - introA) * (1 - introA);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, deviceW, deviceH);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const aspect = state.width / Math.max(state.height, 1);
      const eye: [number, number, number] = [0, 0, CAMERA];
      const projection = frustum(FOV, aspect, 0.1, 60);
      const view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -eye[0], -eye[1], -eye[2], 1];
      const viewProj = multiply(projection, view);
      const orient = orientation(
        conf.perspective * 0.85 + lookRef.current.x * 0.22,
        0.12 - lookRef.current.y * 0.14,
        conf.rotation * DEG,
      );
      const scaleFit = conf.scale * state.fit;

      const paths = new Array<RibbonSample[]>(conf.layers);
      for (let ribbon = 0; ribbon < conf.layers; ribbon += 1) {
        paths[ribbon] = buildPath(ribbon, conf);
      }

      const core = Math.max(0.55 * conf.thickness * ratio, 0.6);
      const brightness = conf.brightness;
      const pulse = pulseRef.current;

      for (let ribbon = 0; ribbon < conf.layers; ribbon += 1) {
        const place = PLACEMENTS[ribbon]!;
        const path = paths[ribbon]!;
        const gain = RIBBON_GAIN[ribbon]!;
        const color = ribbonColors[ribbon] || state.glow;
        const rgb = `${color[0]},${color[1]},${color[2]}`;
        const perLayer = Math.max(Math.floor(conf.threads / 3), 1);

        for (let f = 0; f < conf.threads; f += 1) {
          const layer = (f % 3) - 1;
          const slot = Math.floor(f / 3);
          const seed = hash11(f * 1.731 + ribbon * 17);
          const vVal =
            ((slot + 0.5) / perLayer) * 2 -
            1 +
            (hash11(f * 3.113 + 4) - 0.5) * (1.6 / perLayer) +
            (layer * 0.12) / perLayer;
          const depthRand = (hash11(f * 7.919 + 2) - 0.5) * DEPTH_SPREAD;
          const strength =
            mix(0.45, 1, hash11(f * 5.37 + 1)) * mix(1, 0.72, Math.abs(layer) * conf.volume);
          const twPhase = hash11(f * 13.7 + ribbon * 3);
          const pulseGate = Math.abs(pulse.ribbon - ribbon) < 0.5 ? 1 : 0.35;

          const pts = new Array<FiberPoint>(SAMPLES);
          for (let i = 0; i < SAMPLES; i += 1) {
            const base = path[i]!;
            const s = base.s;
            const x = s * RIBBON_LENGTH;
            const th =
              conf.twist * 0.483 * x +
              state.roll +
              place[3] * 0.6 +
              layer * conf.volume * 0.42 +
              0.5 * Math.sin(x * 0.26 + state.time * 0.27 + place[3]);
            const ct = Math.cos(th);
            const st = Math.sin(th);
            const n0 = base.n0;
            const b0 = base.b0;
            const nOff = depthRand * (0.35 + 6 * s * s);
            const hw = base.hw;
            const off = (nOff + layer * conf.volume * 0.16) * hw;
            const lx =
              base.c[0] + (ct * n0[0] + st * b0[0]) * vVal * hw + (-st * n0[0] + ct * b0[0]) * off;
            const ly =
              base.c[1] + (ct * n0[1] + st * b0[1]) * vVal * hw + (-st * n0[1] + ct * b0[1]) * off;
            const lz =
              base.c[2] + (ct * n0[2] + st * b0[2]) * vVal * hw + (-st * n0[2] + ct * b0[2]) * off;
            const sx0 = lx * scaleFit;
            const sy0 = ly * scaleFit;
            const sz0 = lz * scaleFit;
            const wx = orient[0]! * sx0 + orient[3]! * sy0 + orient[6]! * sz0;
            const wy = orient[1]! * sx0 + orient[4]! * sy0 + orient[7]! * sz0;
            const wz = orient[2]! * sx0 + orient[5]! * sy0 + orient[8]! * sz0;
            const clip = projectPoint(viewProj, wx, wy, wz);
            const depth = clip.depth;
            const endFade = smoothstep(0.5, 0.4, Math.abs(s)) * smoothstep(1.6, 4.2, depth);
            const appear = smoothstep(0, 0.12, introEase * 1.3 - (s + 0.5) - seed * 0.12);
            const pulseGap = Math.abs(s - pulse.s) - pulse.age * 0.42;
            const pulseBoost =
              pulse.strength * Math.exp(-(pulseGap * pulseGap) / 0.0018) * pulseGate;
            pts[i] = {
              x: (clip.x * 0.5 + 0.5) * deviceW,
              y: (0.5 - clip.y * 0.5) * deviceH,
              depth,
              vis: endFade * appear,
              boost: pulseBoost,
            };
          }

          let run: FiberPoint[] = [];
          const flush = () => {
            if (run.length < 2) {
              run = [];
              return;
            }
            let depthSum = 0;
            let boostSum = 0;
            for (let k = 0; k < run.length; k += 1) {
              depthSum += run[k]!.depth;
              boostSum += run[k]!.boost;
            }
            const avgDepth = depthSum / run.length;
            const avgBoost = boostSum / run.length;
            const coc = Math.min(
              conf.depthOfField *
                Math.abs(1 - state.focus / Math.max(avgDepth, 0.1)) *
                deviceH *
                0.02,
              22 * ratio,
            );
            const width = core + coc * 0.5;
            const energy = core / (core + coc * 0.9);
            const alpha = clamp(
              0.6 * strength * gain * energy * brightness * (1 + avgBoost * 3),
              0,
              1,
            );
            if (alpha > 0.004) {
              ctx.beginPath();
              ctx.moveTo(run[0]!.x, run[0]!.y);
              for (let k = 1; k < run.length; k += 1) {
                ctx.lineTo(run[k]!.x, run[k]!.y);
              }
              ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.14).toFixed(3)})`;
              ctx.lineWidth = width * 5;
              ctx.stroke();
              ctx.strokeStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
              ctx.lineWidth = width;
              ctx.stroke();
            }
            run = [];
          };

          for (let i = 0; i < SAMPLES; i += 1) {
            const p = pts[i]!;
            if (p.vis > 0.001 && p.depth > 0.2) run.push(p);
            else flush();
          }
          flush();

          if (conf.sparkle > 0) {
            const twinkle =
              Math.pow(
                Math.max(Math.sin(state.time * (1.2 + 2.6 * twPhase) * 3 + twPhase * 61), 0),
                36,
              ) * conf.sparkle;
            if (twinkle > 0.02) {
              const idx = Math.min(SAMPLES - 1, Math.floor(twPhase * SAMPLES));
              const p = pts[idx];
              if (p && p.depth > 0.2 && p.vis > 0.001) {
                const r = core * 2.4;
                ctx.globalAlpha = clamp(twinkle * 0.9, 0, 1);
                ctx.drawImage(highlightSprite, p.x - r, p.y - r, r * 2, r * 2);
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      }

      const dustCount = Math.round(220 * conf.particles);
      if (dustCount > 0) {
        const box: [number, number, number] = [9, 5.4, 6];
        for (let id = 0; id < dustCount; id += 1) {
          const se: [number, number, number] = [
            hash11(id * 1.37 + 0.3),
            hash11(id * 2.91 + 1.7),
            hash11(id * 4.17 + 2.9),
          ];
          const px = (se[0] - 0.5) * box[0] + 0.18 * Math.sin(state.time * 0.21 + se[0] * 40);
          const py = (se[1] - 0.5) * box[1] + 0.18 * Math.sin(state.time * 0.17 + se[1] * 40);
          const pz =
            (se[2] - 0.5) * box[2] - 0.6 + 0.18 * Math.sin(state.time * 0.13 + se[2] * 40);
          const clip = projectPoint(viewProj, px, py, pz);
          if (clip.depth <= 0.2) continue;
          const sx = (clip.x * 0.5 + 0.5) * deviceW;
          const sy = (0.5 - clip.y * 0.5) * deviceH;
          const size = 2.2 * conf.thickness * mix(0.5, 1.4, hash11(id * 7.7));
          const baseRadius = Math.max(
            (0.5 * size * ratio * CAMERA) / Math.max(clip.depth, 0.1),
            0.45,
          );
          const coc = Math.min(
            conf.depthOfField *
              Math.abs(1 - state.focus / Math.max(clip.depth, 0.1)) *
              deviceH *
              0.035,
            26 * ratio * 1.6,
          );
          const radius = baseRadius + coc;
          const twinkle = Math.pow(
            Math.max(Math.sin(state.time * (0.8 + 1.6 * se[1]) * 2 + se[2] * 50), 0),
            8,
          );
          const intensity =
            mix(0.4, 1, se[0]) *
            (0.35 + 0.65 * twinkle) *
            smoothstep(0.3, 1, introEase) *
            0.5;
          if (intensity < 0.002) continue;
          ctx.globalAlpha = clamp(intensity, 0, 1);
          ctx.drawImage(glowSprite, sx - radius, sy - radius, radius * 2, radius * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (conf.vignette > 0.001) {
        const grad = ctx.createRadialGradient(
          deviceW / 2,
          deviceH / 2,
          Math.min(deviceW, deviceH) * 0.25,
          deviceW / 2,
          deviceH / 2,
          Math.max(deviceW, deviceH) * 0.75,
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${(0.55 * conf.vignette).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, deviceW, deviceH);
      }
    };

    const resize = (): void => {
      const conf = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const baseDpr = Math.min(conf.dpr || window.devicePixelRatio || 1, 2);
      const longest = Math.max(width, height) * baseDpr;
      const ratio = longest > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longest : baseDpr;
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      state.width = width;
      state.height = height;
      state.fit = clamp(width / height / 1.5, 0.6, 1);
      render();
    };

    const frame = (now: number): void => {
      raf = 0;
      if (!alive || !visible || document.hidden) return;
      const conf = settingsRef.current;
      const elapsed = last ? (now - last) / 1000 : 1 / 60;
      const dt = Math.min(0.05, elapsed);
      last = now;
      const moving = !conf.paused && !reduce;
      if (moving) {
        state.time += dt * conf.speed;
        state.roll += dt * conf.speed * conf.rollSpeed;
        state.intro += Math.min(elapsed, 1);
      } else if (state.intro < INTRO_SECONDS) {
        state.intro = INTRO_SECONDS;
      }
      pulseRef.current.age += dt;
      pulseRef.current.strength = Math.max(0, 1 - pulseRef.current.age / 1.8) ** 2;

      const pointer = pointerRef.current;
      const hover = hoverRef.current;
      const look = lookRef.current;
      const active = conf.mouseInteraction && pointer.inside && !reduce;
      if (active && !hover.placed) {
        hover.x = pointer.x;
        hover.y = pointer.y;
        hover.placed = true;
      }
      hover.x += (pointer.x - hover.x) * (1 - Math.exp(-dt / 0.08));
      hover.y += (pointer.y - hover.y) * (1 - Math.exp(-dt / 0.08));
      const goal = active ? 1 : 0;
      hover.presence +=
        (goal - hover.presence) * (1 - Math.exp(-dt / (goal > hover.presence ? 0.3 : 0.6)));
      if (!active && hover.presence < 0.001) hover.placed = false;
      state.hoverPresence = hover.presence;

      const lookX = active ? (pointer.x / state.width - 0.5) * 0.5 : 0;
      const lookY = active ? (0.5 - pointer.y / state.height) * 0.5 : 0;
      look.vx += (30 * (lookX - look.x) - 11 * look.vx) * dt;
      look.vy += (30 * (lookY - look.y) - 11 * look.vy) * dt;
      look.x += look.vx * dt;
      look.y += look.vy * dt;

      render();
      const settling =
        Math.abs(goal - hover.presence) > 0.002 ||
        Math.abs(lookX - look.x) > 0.0002 ||
        Math.abs(lookY - look.y) > 0.0002 ||
        pulseRef.current.strength > 0.001;
      if (moving || settling) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = (): void => {
      if (!raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent): void => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      pointerRef.current.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      wake();
    };

    const onPointerDown = (event: PointerEvent): void => {
      const conf = settingsRef.current;
      if (!conf.mouseInteraction || !conf.pulseOnClick || event.button !== 0 || reduce) return;
      if (
        event.target instanceof Element &&
        event.target.closest('a, button, input, textarea, select, label, [role="button"]')
      ) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      pulseRef.current = {
        s: clamp((x / Math.max(rect.width, 1) - 0.5) * 1.7, -0.5, 0.5),
        age: 0,
        strength: 1,
        ribbon: Math.round(hash11(x + y) * (conf.layers - 1)),
      };
      wake();
    };

    const onPointerLeave = (): void => {
      pointerRef.current.inside = false;
      wake();
    };

    const onVisibility = (): void => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`ghost-fibers-container${className ? ` ${className}` : ""}`}
      {...rest}
    >
      <canvas ref={canvasRef} className="ghost-fibers-canvas" aria-hidden="true" />
    </div>
  );
};

export default GhostFibersCanvas;
