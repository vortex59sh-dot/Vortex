/**
 * VORTEX Admin Dashboard - Colorful & Interactive Background Engine
 * Features:
 * - Dynamic Floating Aurora Gradient Mesh Orbs
 * - High-DPI Interactive Particle Constellation with Mouse Magnetic Links
 * - Neon Fireworks / Sparkle Particle Bursts on Click
 * - Admin Background FX Studio Controller with LocalStorage Persistence
 * - Multiple Vibrant Cyberpunk & Streetwear Themes
 */

(function () {
  "use strict";

  // Configuration & Theme Definitions
  const THEMES = {
    cyber: {
      name: "Cyber Neon",
      icon: "fa-solid fa-bolt",
      colors: ["#06b6d4", "#a855f7", "#facc15", "#ec4899", "#3b82f6"],
      particleRgb: "99, 102, 241"
    },
    sunset: {
      name: "Sunset Blaze",
      icon: "fa-solid fa-fire",
      colors: ["#f97316", "#ef4444", "#f59e0b", "#ec4899", "#fbbf24"],
      particleRgb: "249, 115, 22"
    },
    emerald: {
      name: "Aurora Emerald",
      icon: "fa-solid fa-gem",
      colors: ["#10b981", "#06b6d4", "#84cc16", "#14b8a6", "#3b82f6"],
      particleRgb: "16, 185, 129"
    },
    violet: {
      name: "Electric Violet",
      icon: "fa-solid fa-wand-magic-sparkles",
      colors: ["#a855f7", "#ec4899", "#6366f1", "#d946ef", "#3b82f6"],
      particleRgb: "168, 85, 247"
    },
    rainbow: {
      name: "Rainbow Flow",
      icon: "fa-solid fa-rainbow",
      colors: ["#f43f5e", "#a855f7", "#06b6d4", "#eab308", "#22c55e"],
      particleRgb: "236, 72, 153"
    },
    midnight: {
      name: "Midnight Dark",
      icon: "fa-solid fa-moon",
      colors: ["#06b6d4", "#a855f7", "#facc15", "#38bdf8", "#818cf8"],
      particleRgb: "147, 197, 253"
    }
  };

  const DEFAULT_CONFIG = {
    theme: "cyber",
    particlesEnabled: true,
    clickSparksEnabled: true,
    gridEnabled: true,
    speedMultiplier: 1.0
  };

  let config = Object.assign({}, DEFAULT_CONFIG);
  try {
    const saved = localStorage.getItem("vortex_admin_bg_config");
    if (saved) {
      config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
    }
  } catch (e) {
    console.warn("Could not read admin bg config from localStorage", e);
  }

  // Animation & Canvas State
  let canvas, ctx;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let animationFrameId = null;
  let particles = [];
  let sparkBursts = [];
  let mouse = { x: -9999, y: -9999, isInside: false };
  let lastMoveTime = 0;

  // 1. Initialize DOM Elements
  function initDOM() {
    // Check if background container exists
    let bgContainer = document.getElementById("adminDynamicBgContainer");
    if (!bgContainer) {
      bgContainer = document.createElement("div");
      bgContainer.id = "adminDynamicBgContainer";
      bgContainer.className = "admin-dynamic-bg";
      bgContainer.innerHTML = `
        <div id="adminGridLayer" class="admin-grid-layer"></div>
        <div id="adminOrbsLayer" class="admin-orbs-layer">
          <div class="aurora-orb aurora-orb-1"></div>
          <div class="aurora-orb aurora-orb-2"></div>
          <div class="aurora-orb aurora-orb-3"></div>
          <div class="aurora-orb aurora-orb-4"></div>
          <div class="aurora-orb aurora-orb-5"></div>
        </div>
        <canvas id="adminInteractiveCanvas"></canvas>
      `;
      document.body.prepend(bgContainer);
    }

    canvas = document.getElementById("adminInteractiveCanvas");
    if (canvas) {
      ctx = canvas.getContext("2d");
      resizeCanvas();
    }

    // Apply saved theme & visibility
    applyTheme(config.theme, false);
    toggleGrid(config.gridEnabled);

    // Initialize Floating FX Studio Widget
    initFXStudioWidget();
  }

  // 2. Setup High-DPI Canvas
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.scale(dpr, dpr);
    createParticles();
  }

  // 3. Particle System Definition
  function createParticles() {
    particles = [];
    const count = Math.min(Math.floor((width * height) / 24000), 65);
    const themeColors = THEMES[config.theme]?.colors || THEMES.cyber.colors;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7 * config.speedMultiplier,
        vy: (Math.random() - 0.5) * 0.7 * config.speedMultiplier,
        radius: Math.random() * 2.4 + 1.2,
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        alpha: Math.random() * 0.5 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  // 4. Click Fireworks / Sparkle Effect
  function spawnClickSparks(clientX, clientY) {
    if (!config.clickSparksEnabled) return;

    const themeColors = THEMES[config.theme]?.colors || THEMES.cyber.colors;
    const sparkCount = 20;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4 + 2;
      sparkBursts.push({
        x: clientX,
        y: clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.08,
        radius: Math.random() * 2.8 + 1.5,
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.02
      });
    }
  }

  // 5. Main Canvas Animation Loop
  function animate() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, width, height);

    if (config.particlesEnabled) {
      // Draw & Connect Particles
      const maxDistance = 120;
      const mouseMaxDist = 160;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries smoothly
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Pulsating Alpha
        p.angle += p.pulseSpeed;
        const currentAlpha = Math.max(0.1, p.alpha + Math.sin(p.angle) * 0.2);

        // Draw particle node with soft glowing halo
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();

        // Connect to neighboring particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${THEMES[config.theme]?.particleRgb || "99, 102, 241"}, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // Magnetic link to mouse pointer
        if (mouse.isInside) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.hypot(mdx, mdy);

          if (mdist < mouseMaxDist) {
            const mAlpha = (1 - mdist / mouseMaxDist) * 0.45;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${THEMES[config.theme]?.particleRgb || "250, 204, 21"}, ${mAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Gentle gravity pull toward cursor
            p.x -= (mdx / mdist) * 0.4;
            p.y -= (mdy / mdist) * 0.4;
          }
        }
      }
    }

    // Render Click Sparkle Bursts
    for (let k = sparkBursts.length - 1; k >= 0; k--) {
      const s = sparkBursts[k];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += s.gravity; // physics gravity
      s.vx *= 0.96; // air friction
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        sparkBursts.splice(k, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  // 6. Theme Switching Logic
  function applyTheme(themeKey, save = true) {
    if (!THEMES[themeKey]) themeKey = "cyber";
    config.theme = themeKey;

    document.body.setAttribute("data-admin-theme", themeKey);

    // Update active state in Studio UI
    document.querySelectorAll(".theme-pill-btn").forEach(btn => {
      if (btn.getAttribute("data-theme") === themeKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Recreate particles with matching new color palette
    createParticles();

    if (save) saveConfig();
  }

  function toggleGrid(enabled, save = true) {
    config.gridEnabled = enabled;
    const grid = document.getElementById("adminGridLayer");
    if (grid) {
      grid.style.opacity = enabled ? "1" : "0";
    }
    if (save) saveConfig();
  }

  function toggleParticles(enabled, save = true) {
    config.particlesEnabled = enabled;
    if (save) saveConfig();
  }

  function toggleClickSparks(enabled, save = true) {
    config.clickSparksEnabled = enabled;
    if (save) saveConfig();
  }

  function saveConfig() {
    try {
      localStorage.setItem("vortex_admin_bg_config", JSON.stringify(config));
    } catch (e) {
      console.warn("Could not save admin bg config to localStorage", e);
    }
  }

  // 7. FX Studio UI Widget Creation
  function initFXStudioWidget() {
    // 1. Floating Toggle Button
    const floatingBtn = document.createElement("button");
    floatingBtn.id = "adminFxFloatingBtn";
    floatingBtn.type = "button";
    floatingBtn.title = "ปรับแต่งสีสันและลูกเล่นพื้นหลังแอดมิน";
    floatingBtn.innerHTML = `
      <span class="fx-glow-dot"></span>
      <i class="fa-solid fa-palette text-amber-400"></i>
      <span>ลูกเล่นพื้นหลัง</span>
    `;
    document.body.appendChild(floatingBtn);

    // 2. Control Studio Drawer Modal
    const modal = document.createElement("div");
    modal.id = "adminFxStudioModal";
    modal.innerHTML = `
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-neutral-700/80 pb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-yellow-400 text-black flex items-center justify-center text-xs font-bold shadow">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h4 class="text-sm font-black text-white">BG FX STUDIO</h4>
            <p class="text-[10px] text-neutral-400">ปรับแต่งสีสันและลูกเล่นพื้นหลัง</p>
          </div>
        </div>
        <button type="button" id="adminFxCloseBtn" class="text-neutral-400 hover:text-white p-1 rounded-lg transition">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Theme Selectors -->
      <div>
        <label class="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
          <span>🎨 ธีมสีสันออโรร่า</span>
          <button type="button" id="adminFxRandomThemeBtn" class="text-[10px] text-yellow-400 hover:underline flex items-center gap-1 font-semibold">
            <i class="fa-solid fa-dice"></i> สุ่มสี
          </button>
        </label>
        <div class="grid grid-cols-2 gap-2">
          ${Object.keys(THEMES)
            .map(key => {
              const th = THEMES[key];
              const dots = th.colors
                .slice(0, 3)
                .map(c => `<span class="dot" style="background:${c}"></span>`)
                .join("");
              return `
                <button type="button" data-theme="${key}" class="theme-pill-btn ${config.theme === key ? "active" : ""}">
                  <i class="${th.icon} text-xs"></i>
                  <span class="truncate">${th.name}</span>
                  <span class="color-dots">${dots}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>

      <!-- Effects Toggles -->
      <div class="space-y-2 border-t border-neutral-700/80 pt-3 text-xs">
        <label class="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
          ⚡ ลูกเล่นเสริม (INTERACTIVE)
        </label>
        
        <label class="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition">
          <span class="flex items-center gap-2 text-neutral-200">
            <i class="fa-solid fa-circle-nodes text-cyan-400"></i> อนุภาคเคลื่อนไหวตามเมาส์
          </span>
          <input type="checkbox" id="toggleParticlesInput" ${config.particlesEnabled ? "checked" : ""} class="accent-yellow-400 w-4 h-4 cursor-pointer" />
        </label>

        <label class="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition">
          <span class="flex items-center gap-2 text-neutral-200">
            <i class="fa-solid fa-burst text-pink-400"></i> ประกายดาวเมื่อคลิกเมาส์
          </span>
          <input type="checkbox" id="toggleSparksInput" ${config.clickSparksEnabled ? "checked" : ""} class="accent-yellow-400 w-4 h-4 cursor-pointer" />
        </label>

        <label class="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition">
          <span class="flex items-center gap-2 text-neutral-200">
            <i class="fa-solid fa-border-all text-amber-400"></i> ตาราง Cyber Grid
          </span>
          <input type="checkbox" id="toggleGridInput" ${config.gridEnabled ? "checked" : ""} class="accent-yellow-400 w-4 h-4 cursor-pointer" />
        </label>
      </div>

      <!-- Footer Info -->
      <div class="border-t border-neutral-700/80 pt-2 flex items-center justify-between text-[10px] text-neutral-400">
        <span>✨ บันทึกการตั้งค่าอัตโนมัติ</span>
        <span class="text-yellow-400 font-bold">VORTEX FX</span>
      </div>
    `;
    document.body.appendChild(modal);

    // Event Listeners for FX Studio
    floatingBtn.addEventListener("click", e => {
      e.stopPropagation();
      modal.classList.toggle("active");
    });

    const closeBtn = document.getElementById("adminFxCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    }

    // Close on outside click
    document.addEventListener("click", e => {
      if (!modal.contains(e.target) && e.target !== floatingBtn && !floatingBtn.contains(e.target)) {
        modal.classList.remove("active");
      }
    });

    // Theme buttons
    modal.querySelectorAll(".theme-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const selectedTheme = btn.getAttribute("data-theme");
        applyTheme(selectedTheme, true);
      });
    });

    // Random Theme Button
    const randomBtn = document.getElementById("adminFxRandomThemeBtn");
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        const themeKeys = Object.keys(THEMES);
        const filtered = themeKeys.filter(k => k !== config.theme);
        const randomKey = filtered[Math.floor(Math.random() * filtered.length)];
        applyTheme(randomKey, true);
        if (typeof showToast === "function") {
          showToast(`เปลี่ยนธีมเป็น: ${THEMES[randomKey].name}`, "info");
        }
      });
    }

    // Toggles
    const toggleParticlesInput = document.getElementById("toggleParticlesInput");
    if (toggleParticlesInput) {
      toggleParticlesInput.addEventListener("change", e => {
        toggleParticles(e.target.checked, true);
      });
    }

    const toggleSparksInput = document.getElementById("toggleSparksInput");
    if (toggleSparksInput) {
      toggleSparksInput.addEventListener("change", e => {
        toggleClickSparks(e.target.checked, true);
      });
    }

    const toggleGridInput = document.getElementById("toggleGridInput");
    if (toggleGridInput) {
      toggleGridInput.addEventListener("change", e => {
        toggleGrid(e.target.checked, true);
      });
    }
  }

  // 8. Global Event Listeners
  function attachEventListeners() {
    window.addEventListener("resize", resizeCanvas, { passive: true });

    // Track pointer movement with throttle
    window.addEventListener(
      "pointermove",
      e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.isInside = true;
        lastMoveTime = Date.now();
      },
      { passive: true }
    );

    window.addEventListener("pointerleave", () => {
      mouse.isInside = false;
    });

    // Click Fireworks / Spark Burst
    window.addEventListener(
      "click",
      e => {
        // Do not spawn if clicking on modals or inputs to avoid distraction, or spawn subtly
        spawnClickSparks(e.clientX, e.clientY);
      },
      { passive: true }
    );

    // Visibility Change: pause animation when tab is inactive to save battery/resources
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else {
        if (!animationFrameId) {
          animate();
        }
      }
    });
  }

  // 9. Startup on Page Load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initDOM();
      attachEventListeners();
      animate();
    });
  } else {
    initDOM();
    attachEventListeners();
    animate();
  }
})();
