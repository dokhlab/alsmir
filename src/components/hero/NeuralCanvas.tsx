import { useEffect, useRef } from "react";

/**
 * NeuralCanvas — ALS motor pathway visualization.
 *
 * Story (loops):
 *   0 Healthy pathway forms       — cortex → spinal cord → muscle wires up
 *   1 Signals fire                — action potentials race down the corticospinal tract
 *   2 Degeneration begins         — upper motor neurons die first, then lower MN, then NMJ
 *                                   (label cycles: Upper MN → Lower MN → Muscle denervation)
 *   3 miRNAs released             — small RNA hairpins drift out into a "bloodstream" band
 *                                   and get tagged (miR-206, miR-9, miR-338-3p…)
 *   4 miRNAs circling             — biomarkers orbit while the pathway fades, then loop
 */

const C = {
  BG: "#0a1220",
  TEAL: "#00BCD4",
  LTEAL: "#B2EBF2",
  AMBER: "#FFC107",
  BRAIN: "#7DD3FC",   // upper motor neurons
  CORD: "#FBBF24",    // lower motor neurons
  MUSCLE: "#F472B6",  // muscle / NMJ
  DEAD: "#2a3142",
  WHITE: "#ffffff",
  BLOOD: "#7f1d1d",   // faint plasma band
};

const PHASES = [220, 180, 320, 240, 340];
const TOTAL = PHASES.reduce((a, b) => a + b, 0);

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function phaseAt(f: number) {
  let acc = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (f < acc + PHASES[i]) return { phase: i, pf: (f - acc) / PHASES[i], inFrame: f - acc, dur: PHASES[i] };
    acc += PHASES[i];
  }
  return { phase: PHASES.length - 1, pf: 1, inFrame: PHASES.at(-1)!, dur: PHASES.at(-1)! };
}

type Node = {
  x: number; y: number;            // current
  hx: number; hy: number;          // healthy/anatomical home position
  tx: number; ty: number;          // reserved target
  group: "brain" | "cord" | "muscle";
  r: number;
  color: string;
  alpha: number;
  pulse: number;
  born: number;                    // frame within phase 0
  dead: boolean;
  deadAt: number;
  jitter: number;
};

type Edge = {
  a: number; b: number;
  color: string;
  alpha: number;
  pulseOff: number;
  born: number;
};

type Hairpin = {
  x: number; y: number;
  vx: number; vy: number;
  born: number;
  label?: string;
  // assigned lazily when phase 4 (circling) begins
  orbitR?: number;
  orbitA?: number;
  orbitS?: number;
  orbitE?: number;
};

export default function NeuralCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let raf = 0;
    let frame = 0;
    let W = 0, H = 0;
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let hairpins: Hairpin[] = [];

    function build() {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(360, rect.width);
      H = Math.max(280, rect.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = [];
      edges = [];
      hairpins = [];

      // Anatomical anchors
      const brainCx = W * 0.22, brainCy = H * 0.30;
      const cordX = W * 0.50;
      const muscleX = W * 0.78;

      // BRAIN: 16 upper motor neurons in a brain-shaped cluster
      const N_BRAIN = 16;
      for (let i = 0; i < N_BRAIN; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * 70;
        const x = brainCx + Math.cos(a) * rad * 1.2;
        const y = brainCy + Math.sin(a) * rad * 0.8;
        nodes.push({
          x, y, hx: x, hy: y, tx: x, ty: y,
          group: "brain", r: 4 + Math.random() * 3, color: C.BRAIN,
          alpha: 0, pulse: Math.random() * Math.PI * 2,
          born: i * 6, dead: false, deadAt: -1, jitter: Math.random() * Math.PI * 2,
        });
      }
      // CORD: 12 lower motor neurons stacked vertically
      const N_CORD = 12;
      for (let i = 0; i < N_CORD; i++) {
        const t = i / (N_CORD - 1);
        const x = cordX + (Math.random() - 0.5) * 22;
        const y = H * 0.18 + t * H * 0.66;
        nodes.push({
          x, y, hx: x, hy: y, tx: x, ty: y,
          group: "cord", r: 4 + Math.random() * 3, color: C.CORD,
          alpha: 0, pulse: Math.random() * Math.PI * 2,
          born: 40 + i * 8, dead: false, deadAt: -1, jitter: Math.random() * Math.PI * 2,
        });
      }
      // MUSCLE: 14 fibers (NMJ endings)
      const N_MUSCLE = 14;
      for (let i = 0; i < N_MUSCLE; i++) {
        const t = i / (N_MUSCLE - 1);
        const x = muscleX + (Math.random() - 0.5) * 70;
        const y = H * 0.16 + t * H * 0.7;
        nodes.push({
          x, y, hx: x, hy: y, tx: x, ty: y,
          group: "muscle", r: 4 + Math.random() * 3, color: C.MUSCLE,
          alpha: 0, pulse: Math.random() * Math.PI * 2,
          born: 110 + i * 7, dead: false, deadAt: -1, jitter: Math.random() * Math.PI * 2,
        });
      }

      const brainStart = 0;
      const cordStart = N_BRAIN;
      const muscleStart = N_BRAIN + N_CORD;

      // Corticospinal tract: every brain → nearest 2 spinal nodes
      let edgeIdx = 0;
      for (let i = 0; i < N_BRAIN; i++) {
        const a = nodes[brainStart + i];
        const dists = [];
        for (let j = 0; j < N_CORD; j++) {
          const b = nodes[cordStart + j];
          dists.push({ j, d: Math.hypot(a.x - b.x, a.y - b.y) });
        }
        dists.sort((p, q) => p.d - q.d);
        for (let k = 0; k < 2; k++) {
          edges.push({
            a: brainStart + i, b: cordStart + dists[k].j,
            color: C.BRAIN, alpha: 0, pulseOff: Math.random(), born: 60 + edgeIdx * 2,
          });
          edgeIdx++;
        }
      }
      // Motor axon to muscle: each cord → nearest 2 muscle
      for (let i = 0; i < N_CORD; i++) {
        const a = nodes[cordStart + i];
        const dists = [];
        for (let j = 0; j < N_MUSCLE; j++) {
          const b = nodes[muscleStart + j];
          dists.push({ j, d: Math.hypot(a.x - b.x, a.y - b.y) });
        }
        dists.sort((p, q) => p.d - q.d);
        for (let k = 0; k < 2; k++) {
          edges.push({
            a: cordStart + i, b: muscleStart + dists[k].j,
            color: C.CORD, alpha: 0, pulseOff: Math.random(), born: 130 + edgeIdx * 2,
          });
          edgeIdx++;
        }
      }
    }

    function drawAnatomy(globalA: number, fade: number) {
      ctx.save();
      ctx.globalAlpha = globalA * fade * 0.18;
      ctx.strokeStyle = C.LTEAL;
      ctx.lineWidth = 1.2;

      // Brain silhouette
      const bx = W * 0.22, by = H * 0.30;
      ctx.beginPath();
      ctx.ellipse(bx, by, 95, 70, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 70, by - 10); ctx.bezierCurveTo(bx - 40, by - 50, bx + 20, by - 50, bx + 60, by - 10);
      ctx.moveTo(bx - 60, by + 15); ctx.bezierCurveTo(bx - 30, by - 15, bx + 30, by - 15, bx + 60, by + 15);
      ctx.stroke();

      // Spinal cord
      const sx = W * 0.50;
      ctx.beginPath();
      ctx.moveTo(sx - 12, H * 0.10);
      ctx.lineTo(sx - 12, H * 0.92);
      ctx.moveTo(sx + 12, H * 0.10);
      ctx.lineTo(sx + 12, H * 0.92);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const y = H * 0.12 + (i / 11) * H * 0.78;
        ctx.beginPath();
        ctx.moveTo(sx - 18, y);
        ctx.lineTo(sx + 18, y);
        ctx.stroke();
      }

      // Muscle fibers
      const mx = W * 0.78;
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * 22;
        ctx.beginPath();
        ctx.moveTo(mx + off, H * 0.12);
        ctx.bezierCurveTo(mx + off - 8, H * 0.4, mx + off + 8, H * 0.6, mx + off, H * 0.92);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawLabels(globalA: number) {
      ctx.save();
      ctx.globalAlpha = globalA * 0.85;
      ctx.fillStyle = C.LTEAL;
      ctx.font = "600 18px ui-sans-serif, system-ui, -apple-system, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("MOTOR  CORTEX", W * 0.22, H * 0.30 + 115);
      ctx.fillText("SPINAL  CORD", W * 0.50, H * 0.06);
      ctx.fillText("MUSCLE", W * 0.78, H * 0.06);
      ctx.textAlign = "start";
      ctx.restore();
    }

    function drawHairpin(x: number, y: number, scale: number, alpha: number, color: string) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      const s = scale;
      ctx.beginPath();
      ctx.moveTo(x - 4 * s, y + 10 * s);
      ctx.bezierCurveTo(x - 4 * s, y - 6 * s, x + 4 * s, y - 6 * s, x + 4 * s, y + 10 * s);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const yy = y + (i * 3 - 1) * s;
        ctx.beginPath();
        ctx.moveTo(x - 3.5 * s, yy);
        ctx.lineTo(x + 3.5 * s, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    function tick() {
      const f = frame % TOTAL;
      const { phase, pf, inFrame } = phaseAt(f);

      // Reset on loop
      if (f === 0) {
        for (const n of nodes) {
          n.alpha = 0; n.dead = false; n.deadAt = -1;
          n.x = n.hx; n.y = n.hy; n.tx = n.hx; n.ty = n.hy;
        }
        for (const e of edges) e.alpha = 0;
        hairpins = [];
      }

      // BACKGROUND
      const grd = ctx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, "#08101c");
      grd.addColorStop(1, "#0d1626");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Plasma band — fades in during phase 3, fades out during phase 4
      const plasmaA =
        phase === 3 ? Math.min(1, pf * 2) :
        phase === 4 ? clamp(1 - pf * 0.85) :
        0;
      if (plasmaA > 0) {
        const bandY = H * 0.78;
        const g = ctx.createLinearGradient(0, bandY - 30, 0, bandY + 30);
        g.addColorStop(0, "rgba(127,29,29,0)");
        g.addColorStop(0.5, `rgba(127,29,29,${0.18 * plasmaA})`);
        g.addColorStop(1, "rgba(127,29,29,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, bandY - 30, W, 60);
      }

      // Anatomy outlines & labels fade out during phase 4 so biomarkers can shine
      const anatomyFade = phase === 4 ? clamp(1 - pf * 1.2) : 1;
      drawAnatomy(1, anatomyFade);
      if (anatomyFade > 0.05) drawLabels(anatomyFade);

      // Node alpha builds during phase 0
      if (phase === 0) {
        for (const n of nodes) {
          const t = clamp((inFrame - n.born) / 50);
          n.alpha = Math.max(n.alpha, t);
        }
      }

      // Edge alpha: builds in phase 0, holds 1–3, fades in 4
      if (phase === 0) {
        for (const e of edges) {
          const t = clamp((inFrame - e.born) / 50);
          e.alpha = Math.max(e.alpha, t * 0.9);
        }
      } else if (phase >= 1 && phase <= 3) {
        for (const e of edges) e.alpha = Math.max(e.alpha, 0.85);
      } else if (phase === 4) {
        for (const e of edges) e.alpha *= 0.965;
      }

      // Nodes also fade during phase 4
      if (phase === 4) {
        for (const n of nodes) n.alpha *= 0.97;
      }

      // PHASE 2: degeneration. Brain dies first (pf 0–0.5), cord (0.3–0.8), muscle (0.6–1)
      if (phase === 2) {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          let start = 0;
          if (n.group === "brain") start = 0.0;
          else if (n.group === "cord") start = 0.3;
          else start = 0.6;
          const trigger = start + (i % 14) * 0.012;
          if (pf > trigger && !n.dead) {
            n.dead = true; n.deadAt = frame;
            hairpins.push({
              x: n.x, y: n.y,
              vx: (Math.random() - 0.2) * 0.4,
              vy: 0.6 + Math.random() * 0.4,
              born: frame,
            });
          }
        }
      }

      // PHASE 3: hairpins drift to plasma band; partway through, they get tagged
      if (phase === 3) {
        for (const h of hairpins) {
          h.x += h.vx;
          h.y += h.vy * 0.6;
          const targetY = H * 0.78;
          h.y += (targetY - h.y) * 0.02;
          h.vx *= 0.985;
        }
        if (pf > 0.4 && hairpins.length && !hairpins[0].label) {
          const labels = ["miR-206", "miR-9", "miR-338-3p", "miR-124", "miR-181a", "miR-451"];
          let li = 0;
          for (const h of hairpins) {
            if (Math.random() < 0.35) h.label = labels[li++ % labels.length];
          }
        }
      }

      // PHASE 4: miRNAs orbit the center while the pathway dissolves behind them
      if (phase === 4) {
        const centerX = W * 0.55;
        const centerY = H * 0.55;
        for (const h of hairpins) {
          if (h.orbitR === undefined) {
            const dx = h.x - centerX;
            const dy = h.y - centerY;
            h.orbitR = Math.max(90, Math.hypot(dx, dy));
            h.orbitA = Math.atan2(dy, dx);
            h.orbitS = 0.006 + Math.random() * 0.008;
            h.orbitE = 0.55 + Math.random() * 0.4;
          }
          h.orbitA! += h.orbitS!;
          h.x = centerX + Math.cos(h.orbitA!) * h.orbitR!;
          h.y = centerY + Math.sin(h.orbitA!) * h.orbitR! * h.orbitE!;
        }
      }

      // ==== DRAW EDGES ====
      for (const e of edges) {
        if (e.alpha < 0.02) continue;
        const a = nodes[e.a], b = nodes[e.b];
        const dimmed = (a.dead || b.dead) ? 0.15 : 1;
        ctx.strokeStyle = hexA(e.color, 0.32 * e.alpha * dimmed);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        // pulses
        const intensity = phase === 1 ? 1 : (phase === 0 ? 0.3 : phase === 2 ? 0.6 : 0.4);
        if (!a.dead && !b.dead && e.alpha > 0.4) {
          const t = ((frame * 0.012) + e.pulseOff) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          ctx.fillStyle = hexA(e.color, 0.9 * intensity);
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ==== DRAW NODES ====
      for (const n of nodes) {
        if (n.alpha < 0.02) continue;
        const pulse = 1 + Math.sin(frame * 0.06 + n.pulse) * 0.22;
        const r = n.dead ? n.r * 0.45 : n.r * pulse;
        const color = n.dead ? C.DEAD : n.color;
        const a = n.dead ? 0.3 * n.alpha : n.alpha;
        if (!n.dead) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.6);
          g.addColorStop(0, hexA(color, 0.18 * a));
          g.addColorStop(1, hexA(color, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = hexA(color, a);
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      }

      // ==== DRAW HAIRPINS (miRNA biomarkers) ====
      for (const h of hairpins) {
        const age = frame - h.born;
        const a = clamp(age / 30);
        drawHairpin(h.x, h.y, 1.0, 0.85 * a, C.LTEAL);
        if (h.label && phase >= 3) {
          ctx.font = "9px ui-monospace, monospace";
          ctx.fillStyle = hexA(C.LTEAL, 0.7 * a);
          ctx.fillText(h.label, h.x + 8, h.y + 4);
        }
      }

      // ==== PHASE TITLE ====
      // Phase 0–1 stay silent; phase 2 cycles three sub-titles; phases 3–4 share one.
      let sub = "";
      let subPf = pf;
      if (phase === 2) {
        if (pf < 0.34) { sub = "Upper motor neuron degeneration"; subPf = pf / 0.34; }
        else if (pf < 0.67) { sub = "Lower motor neuron degeneration"; subPf = (pf - 0.34) / 0.33; }
        else { sub = "Muscle denervation and atrophy"; subPf = (pf - 0.67) / 0.33; }
      } else if (phase === 3 || phase === 4) {
        sub = "miRNA biomarker evidence";
        subPf = pf;
      }
      if (sub) {
        const fadeIn = subPf < 0.12 ? subPf / 0.12 : subPf > 0.88 ? (1 - subPf) / 0.12 : 1;
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = hexA(C.LTEAL, 0.8 * fadeIn);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "start";
        ctx.fillText(sub, 28, 36);
        ctx.strokeStyle = hexA(C.TEAL, 0.6 * fadeIn);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(28, 44); ctx.lineTo(28 + 60, 44); ctx.stroke();
      }

      frame++;
      raf = requestAnimationFrame(tick);
    }

    build();
    const ro = new ResizeObserver(() => { build(); });
    ro.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-label="Animated ALS motor pathway and miRNA biomarker visualization" />;
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
