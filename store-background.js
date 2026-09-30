/**
 * VORTEX Streetwear — Store Background Engine (Monochrome Edition)
 * Style: Urban Ink + Halftone Dust Particles + Mouse Trail Brushstrokes
 * Concept: คนละแบบกับแอดมิน (ขาว-ดำ มินิมอล สตรีทแวร์ ไม่มีสีสด)
 *
 * Features:
 * - Floating Monochrome Dust Particles with gentle wind drift
 * - Mouse-responsive ink brushstroke trail (black on white, minimal)
 * - Pulsing halftone dot nodes connecting in constellation network
 * - Visibility-aware animation pause for performance
 */

(function () {
  "use strict";

  // ── Canvas & State ────────────────────────────────────────────────────
  let canvas, ctx;
  let width  = window.innerWidth;
  let height = window.innerHeight;
  let dpr    = Math.min(window.devicePixelRatio || 1, 2);
  let animFrameId = null;

  let particles   = [];  // floating dust nodes
  let trailPoints = [];  // mouse ink trail
  let mouse = { x: -9999, y: -9999, active: false };

  // ── Init DOM Structure ────────────────────────────────────────────────
  function initDOM() {
    if (document.getElementById("storeDynamicBgContainer")) return;

    const bg = document.createElement("div");
    bg.id = "storeDynamicBgContainer";
    bg.className = "store-dynamic-bg";
    bg.innerHTML = `
      <!-- Paper Grain -->
      <div class="store-grain-layer"></div>
      <!-- Blueprint Grid -->
      <div class="store-grid-layer"></div>
      <!-- Halftone Dots -->
      <div class="store-halftone-layer"></div>
      <!-- Ink Bleed Blobs -->
      <div class="store-ink-layer"></div>
      <!-- VORTEX Watermark Text -->
      <div class="store-watermark-layer" aria-hidden="true"></div>
      <!-- Accent Lines -->
      <div class="store-accent-line store-accent-line-top"></div>
      <div class="store-accent-line store-accent-line-mid"></div>
      <div class="store-accent-line store-accent-line-bot"></div>
      <!-- Corner Bracket Decorations -->
      <div class="store-corner-decor store-corner-tl" aria-hidden="true"></div>
      <div class="store-corner-decor store-corner-tr" aria-hidden="true"></div>
      <div class="store-corner-decor store-corner-bl" aria-hidden="true"></div>
      <div class="store-corner-decor store-corner-br" aria-hidden="true"></div>
      <!-- Interactive Canvas -->
      <canvas id="storeInteractiveCanvas"></canvas>
    `;
    document.body.prepend(bg);

    canvas = document.getElementById("storeInteractiveCanvas");
    if (canvas) {
      ctx = canvas.getContext("2d");
      resizeCanvas();
    }
  }

  // ── High-DPI Canvas Resize ────────────────────────────────────────────
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    width  = window.innerWidth;
    height = window.innerHeight;
    dpr    = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(width  * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width  = width  + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);
    spawnParticles();
  }

  // ── Particle Factory: Monochrome Dust ─────────────────────────────────
  function spawnParticles() {
    particles = [];
    // Adaptive count: fewer on small screens, capped at 55
    const count = Math.min(Math.floor((width * height) / 28000), 55);

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 2.2 + 0.6;
      // mostly near-black, some near-white for depth contrast
      const shade = Math.random() < 0.75
        ? Math.floor(Math.random() * 60)         // dark dust (0–60)
        : Math.floor(200 + Math.random() * 40);  // light fleck (200–240)

      particles.push({
        x:     Math.random() * width,
        y:     Math.random() * height,
        vx:    (Math.random() - 0.5) * 0.35,
        vy:    (Math.random() - 0.5) * 0.35 - 0.15, // gentle upward drift
        size,
        shade,
        alpha:       Math.random() * 0.45 + 0.10,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed:  Math.random() * 0.018 + 0.008,
      });
    }
  }

  // ── Mouse Ink Trail ───────────────────────────────────────────────────
  const MAX_TRAIL = 32;

  function pushTrail(x, y) {
    trailPoints.push({ x, y, age: 0 });
    if (trailPoints.length > MAX_TRAIL) trailPoints.shift();
  }

  function drawTrail() {
    if (trailPoints.length < 2) return;

    for (let i = 1; i < trailPoints.length; i++) {
      const p0 = trailPoints[i - 1];
      const p1 = trailPoints[i];
      const t  = i / trailPoints.length;

      // Ink brush: tapers from thick to thin, black → transparent
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(0, 0, 0, ${t * 0.18})`;
      ctx.lineWidth   = t * 2.8 + 0.4;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
    }

    // Age out trail points
    trailPoints = trailPoints.filter(pt => {
      pt.age++;
      return pt.age < 60;
    });
  }

  // ── Particle Constellation Lines ──────────────────────────────────────
  function drawConstellation() {
    const maxDist = 100;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b    = particles[j];
        const dx   = a.x - b.x;
        const dy   = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < maxDist) {
          const lineAlpha = (1 - dist / maxDist) * 0.10;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 0, 0, ${lineAlpha})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }
  }

  // ── Mouse Magnetic Pull ───────────────────────────────────────────────
  function applyMouseMagnetics() {
    if (!mouse.active) return;
    const pullDist = 130;

    for (const p of particles) {
      const dx   = p.x - mouse.x;
      const dy   = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < pullDist && dist > 1) {
        // Subtle repulsion (ink spreading away from brush)
        const force = ((pullDist - dist) / pullDist) * 0.3;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;

        // Draw a connection line to mouse
        const lineA = (1 - dist / pullDist) * 0.14;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(0, 0, 0, ${lineA})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }

      // Clamp velocity to prevent runaway particles
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 2.5) {
        p.vx = (p.vx / speed) * 2.5;
        p.vy = (p.vy / speed) * 2.5;
      }
    }
  }

  // ── Main Animation Loop ───────────────────────────────────────────────
  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // Constellation network lines (drawn first, behind particles)
    drawConstellation();

    // Mouse magnetic connections & repulsion
    applyMouseMagnetics();

    // Update & draw each dust particle
    for (const p of particles) {
      // Apply gentle upward wind drift + velocity damping
      p.vx *= 0.992;
      p.vy *= 0.992;
      p.x  += p.vx;
      p.y  += p.vy;

      // Wrap around with soft margin
      if (p.x < -20)        p.x = width  + 20;
      if (p.x > width  + 20) p.x = -20;
      if (p.y < -20)        p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      // Breathing alpha (pulsate slowly)
      p.pulseOffset += p.pulseSpeed;
      const displayAlpha = Math.max(0.05, p.alpha + Math.sin(p.pulseOffset) * 0.12);

      // Draw particle dot
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.shade}, ${p.shade}, ${p.shade}, ${displayAlpha})`;

      // Soft shadow for dark particles to lift them off background
      if (p.shade < 80) {
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur  = 4;
      }
      ctx.fill();
      ctx.restore();
    }

    // Ink mouse trail
    drawTrail();

    animFrameId = requestAnimationFrame(animate);
  }

  // ── Event Listeners ───────────────────────────────────────────────────
  function attachEvents() {
    window.addEventListener("resize", resizeCanvas, { passive: true });

    window.addEventListener("pointermove", e => {
      mouse.x      = e.clientX;
      mouse.y      = e.clientY;
      mouse.active = true;
      pushTrail(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("pointerleave", () => {
      mouse.active = false;
    });

    // Pause when tab hidden (battery/perf save)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      } else if (!animFrameId) {
        animate();
      }
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────
  function boot() {
    initDOM();
    attachEvents();
    animate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
