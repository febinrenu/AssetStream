"use client";

import { useEffect, useRef } from "react";

type Shape = "circle" | "diamond" | "cross";

interface Particle {
  x: number;
  y: number;
  vx: number;   // horizontal drift speed
  vy: number;   // upward speed
  r: number;    // radius / half-size
  opacity: number;
  opacityTarget: number;
  opacitySpeed: number;
  phase: number; // sine wave phase offset
  shape: Shape;
  color: string;
}

interface FloatingParticlesProps {
  /** Number of particles. Default 55. */
  count?: number;
  /** Canvas className for positioning. Default: "absolute inset-0 pointer-events-none" */
  className?: string;
  /** Base particle color (CSS hex). Default: teal (#2dd4bf) mixed with white  */
  tealRatio?: number; // 0–1, fraction of teal vs white particles
}

export function FloatingParticles({
  count = 55,
  className = "absolute inset-0 pointer-events-none",
  tealRatio = 0.35,
}: FloatingParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const SHAPES: Shape[] = ["circle", "circle", "diamond", "cross", "circle"];
    const TEAL = "#2dd4bf";
    const WHITE = "#e4e6f3";

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const spawn = (forceY?: number): Particle => {
      const isTeal = Math.random() < tealRatio;
      return {
        x: Math.random() * (canvas.width || 400),
        y: forceY !== undefined ? forceY : Math.random() * (canvas.height || 600),
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(Math.random() * 0.28 + 0.12), // upward
        r: Math.random() * 1.6 + 0.6,
        opacity: 0,
        opacityTarget: Math.random() * 0.22 + 0.06,
        opacitySpeed: Math.random() * 0.004 + 0.002,
        phase: Math.random() * Math.PI * 2,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: isTeal ? TEAL : WHITE,
      };
    };

    const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    };

    const drawCross = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      const t = r * 0.32;
      ctx.beginPath();
      ctx.rect(x - t, y - r, t * 2, r * 2);
      ctx.rect(x - r, y - t, r * 2, t * 2);
    };

    const drawParticle = (p: Particle) => {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "diamond") {
        drawDiamond(ctx, p.x, p.y, p.r * 1.3);
        ctx.fill();
      } else {
        drawCross(ctx, p.x, p.y, p.r * 1.5);
        ctx.fill();
      }
    };

    // Initialise particles spread across the whole canvas
    resize();
    for (let i = 0; i < count; i++) particles.push(spawn());

    let t = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008;

      for (const p of particles) {
        // Sine-wave horizontal sway
        const sway = Math.sin(t + p.phase) * 0.22;
        p.x += p.vx + sway;
        p.y += p.vy;

        // Fade in toward target then breathe slightly
        if (p.opacity < p.opacityTarget) {
          p.opacity = Math.min(p.opacity + p.opacitySpeed, p.opacityTarget);
        } else {
          // Slow pulse ±15%
          p.opacity += Math.sin(t * 0.8 + p.phase) * 0.0006;
        }

        // Wrap x
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Reset when floated off-screen top
        if (p.y < -10) {
          const fresh = spawn(canvas.height + 10);
          Object.assign(p, fresh);
        }

        drawParticle(p);
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(tick);
    };

    tick();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [count, tealRatio]);

  return <canvas ref={canvasRef} className={className} />;
}
