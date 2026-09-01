/* ==========================================================================
   曾睿铭 · 在线个人简历 —— 交互脚本
   功能：深海水墨粒子 · 光标光晕 · 打字机 · 主题切换 · 滚动动画 ·
         技能条动画 · 导航滚动监听 · 视差 · 懒加载 · 回到顶部
   ========================================================================== */
(function () {
  "use strict";

  /* 0. 样式加载检测：防止在压缩包内直接打开导致样式失效
     若样式表未加载（body 背景仍为透明），显示醒目的解压提示 */
  (function checkStyleLoaded() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
      const tip = document.createElement("div");
      tip.setAttribute("role", "alert");
      tip.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;" +
        "background:#c0502f;color:#fff;font:14px/1.6 'PingFang SC','Microsoft YaHei',sans-serif;" +
        "text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.3)";
      tip.textContent = "⚠️ 样式未加载：请先将压缩包完整解压到文件夹，再打开 index.html";
      document.body.appendChild(tip);
    }
  })();

  /* 尊重系统「减少动效」偏好 */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========================================================================
     1. 主题切换（默认深色，localStorage 持久化）
     ======================================================================== */
  const themeToggle = document.getElementById("themeToggle");
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (metaTheme) {
      metaTheme.setAttribute("content", theme === "dark" ? "#0a0f1c" : "#f4f0e7");
    }
  }

  // 初始化主题：优先读取用户上次选择，否则默认深色
  const savedTheme = (function () {
    try { return localStorage.getItem("resume-theme"); } catch (e) { return null; }
  })();
  applyTheme(savedTheme === "light" ? "light" : "dark");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("resume-theme", next); } catch (e) { /* 忽略隐私模式异常 */ }
      // 主题切换后重绘粒子，确保颜色适配
      if (ink) ink.refreshColors();
    });
  }

  /* ========================================================================
     2. 深海水墨粒子（Canvas）
     ======================================================================== */
  const canvas = document.getElementById("inkCanvas");
  const hero = document.getElementById("hero");

  const ink = (function () {
    if (!canvas || !hero || prefersReducedMotion) return null;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let width = 0, height = 0;
    let raf = null;
    let running = false;
    const mouse = { x: -9999, y: -9999 };

    // 深海荧光配色（跟随主题）
    const colorsDark = ["63,185,176", "53,214,232", "127,185,217", "47,143,158", "216,176,105"];
    const colorsLight = ["44,125,118", "18,150,166", "60,123,163", "47,120,110", "192,80,47"];
    let palette = document.documentElement.getAttribute("data-theme") === "dark" ? colorsDark : colorsLight;

    function resize() {
      const rect = hero.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制 DPR，控制性能
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    }

    function spawn() {
      const count = Math.min(Math.floor((width * height) / 16000), 130);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(makeParticle(true));
      }
    }

    function makeParticle(anywhere) {
      return {
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : height + 10,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(Math.random() * 0.28 + 0.06), // 缓缓上浮，如墨在水中晕开
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: Math.random() * 0.5 + 0.15,
        drift: Math.random() * 0.02 + 0.004, // 左右摇摆幅度
        phase: Math.random() * Math.PI * 2,
      };
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 基础运动
        p.x += p.vx + Math.sin(p.phase) * p.drift;
        p.y += p.vy;
        p.phase += 0.01;

        // 鼠标轻柔扰动（深海浮游生物的趋避）
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0.01) {
          const force = (120 - dist) / 120 * 0.5;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        // 越界回收（底部回顶部，保持画面充盈）
        if (p.y < -12 || p.x < -12 || p.x > width + 12) {
          particles[i] = makeParticle(false);
          continue;
        }

        // 呼吸式透明度
        const twinkle = 0.7 + 0.3 * Math.sin(p.phase * 2);

        // 绘制发光粒子
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + "," + (p.alpha * twinkle).toFixed(3) + ")";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(" + p.color + ",0.9)";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(step);
    }

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    function refreshColors() {
      palette = document.documentElement.getAttribute("data-theme") === "dark" ? colorsDark : colorsLight;
      particles.forEach(function (p) { p.color = palette[Math.floor(Math.random() * palette.length)]; });
    }

    // 初始化
    resize();
    window.addEventListener("resize", resize);
    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);

    // 首屏滚出视野时暂停，节省性能
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.isIntersecting ? start() : stop();
      });
    }, { threshold: 0.05 });
    io.observe(hero);

    start();

    return { refreshColors: refreshColors };
  })();

  /* ========================================================================
     3. 光标光晕（深海浮光跟随）
     ======================================================================== */
  const cursorGlow = document.getElementById("cursorGlow");
  if (cursorGlow && !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
    });
    (function animate() {
      cx += (tx - cx) * 0.12; // 平滑缓动
      cy += (ty - cy) * 0.12;
      cursorGlow.style.transform = "translate(" + (cx - 260) + "px," + (cy - 260) + "px)";
      requestAnimationFrame(animate);
    })();

    // 仅在首屏视野内点亮光晕，避免盖过其他区块文字
    const glowIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        cursorGlow.classList.toggle("is-active", entry.isIntersecting);
      });
    }, { threshold: 0.1 });
    glowIO.observe(hero);
  }

  /* ========================================================================
     4. 打字机标语
     ======================================================================== */
  const typewriterEl = document.getElementById("typewriter");
  if (typewriterEl) {
    const phrases = [
      "把大模型真正「用起来」的人",
      "本地部署开源大模型 · 数据不出本机",
      "用 AI 写代码、做演示文稿、搭网站",
      "选对工具，控制成本，把复杂做简单",
    ];
    let phraseIdx = 0, charIdx = 0, deleting = false;

    function tick() {
      const current = phrases[phraseIdx];
      if (!deleting) {
        charIdx++;
        typewriterEl.textContent = current.slice(0, charIdx);
        if (charIdx === current.length) {
          deleting = true;
          setTimeout(tick, 1600); // 停留
          return;
        }
        setTimeout(tick, 70);
      } else {
        charIdx--;
        typewriterEl.textContent = current.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(tick, 350);
          return;
        }
        setTimeout(tick, 34);
      }
    }
    if (prefersReducedMotion) {
      typewriterEl.textContent = phrases[0];
    } else {
      tick();
    }
  }

  /* ========================================================================
     5. 滚动入场动画（IntersectionObserver）
     ======================================================================== */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const revealIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    // 不支持或减少动效：直接显示
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ========================================================================
     6. 技能进度条动画
     ======================================================================== */
  const bars = document.querySelectorAll(".bar");
  if ("IntersectionObserver" in window) {
    const barIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const fill = entry.target.querySelector(".bar-fill");
          if (fill) fill.style.width = fill.getAttribute("data-width");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { barIO.observe(b); });
  } else {
    bars.forEach(function (b) {
      const fill = b.querySelector(".bar-fill");
      if (fill) fill.style.width = fill.getAttribute("data-width");
    });
  }

  /* ========================================================================
     7. 图片懒加载增强（原生 loading="lazy" 之上：进入视口淡入）
     ======================================================================== */
  const lazyImages = document.querySelectorAll("img[loading='lazy']");
  if ("IntersectionObserver" in window) {
    const imgIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.classList.add("img-loaded");
          obs.unobserve(img);
        }
      });
    }, { rootMargin: "120px" });
    lazyImages.forEach(function (img) {
      img.classList.add("img-lazy");
      imgIO.observe(img);
    });
  }

  /* ========================================================================
     8. 导航：滚动状态 + 滚动监听（高亮当前区块）
     ======================================================================== */
  const header = document.getElementById("siteHeader");
  const progressBar = document.getElementById("progressBar");
  const toTop = document.getElementById("toTop");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("main section[id]");

  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;

    // 顶部进度条
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar && docH > 0) {
      progressBar.style.transform = "scaleX(" + Math.min(y / docH, 1) + ")";
    }

    // 导航栏背景 + 回到顶部按钮显隐
    if (header) header.classList.toggle("is-scrolled", y > 30);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);

    // 滚动监听：高亮当前导航项
    let currentId = "";
    sections.forEach(function (sec) {
      if (y >= sec.offsetTop - 140) currentId = sec.getAttribute("id");
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + currentId);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ========================================================================
     9. 移动端菜单
     ======================================================================== */
  const menuToggle = document.getElementById("menuToggle");
  const navLinksWrap = document.getElementById("navLinks");
  if (menuToggle && navLinksWrap) {
    menuToggle.addEventListener("click", function () {
      const open = navLinksWrap.classList.toggle("is-open");
      menuToggle.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    // 点击链接后收起菜单
    navLinksWrap.addEventListener("click", function (e) {
      if (e.target.closest(".nav-link")) {
        navLinksWrap.classList.remove("is-open");
        menuToggle.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ========================================================================
     10. 回到顶部
     ======================================================================== */
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ========================================================================
     11. 视差（首屏水墨层随滚动缓慢漂移）
     ======================================================================== */
  const layerFar = document.querySelector(".layer-far");
  const layerNear = document.querySelector(".layer-near");
  if (layerFar && layerNear && !prefersReducedMotion) {
    window.addEventListener("scroll", function () {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (y < window.innerHeight) {
        layerFar.style.transform = "translateY(" + (y * 0.22) + "px)";
        layerNear.style.transform = "translateY(" + (y * 0.12) + "px)";
      }
    }, { passive: true });
  }

  /* ========================================================================
     12. 平滑锚点（兼容性兜底，覆盖 CSS smooth 之外的情形）
     ======================================================================== */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const id = this.getAttribute("href");
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
      }
    });
  });

  /* ========================================================================
     13. 证书图片灯箱：单击打开 / 再点或点外部关闭 / 滚轮缩放
     ======================================================================== */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxStage = document.getElementById("lightboxStage");
  const lightboxClose = document.getElementById("lightboxClose");

  if (lightbox && lightboxImg && lightboxStage) {
    let zoom = 1;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 5;

    function setZoom(value, origin) {
      zoom = Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
      lightboxImg.style.transformOrigin = origin || "50% 50%";
      lightboxImg.style.transform = "scale(" + zoom + ")";
    }
    function resetZoom() { setZoom(1); }

    // 打开灯箱（拦截证书链接，改为灯箱预览；无 JS 时链接仍可直开原图）
    document.querySelectorAll(".cert-img-link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        lightboxImg.setAttribute("src", this.getAttribute("href"));
        resetZoom();
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        if (lightboxClose) lightboxClose.setAttribute("aria-hidden", "false");
      });
    });

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      if (lightboxClose) lightboxClose.setAttribute("aria-hidden", "true");
      resetZoom();
    }

    // 再点一次图片 → 关闭
    lightboxImg.addEventListener("click", closeLightbox);

    // 点空白处（背景/舞台）→ 关闭
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target === lightboxStage) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);

    // 滚轮缩放（以光标位置为缩放中心）
    lightbox.addEventListener("wheel", function (e) {
      e.preventDefault();
      const rect = lightboxStage.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(zoom * factor, px + "% " + py + "%");
    }, { passive: false });

    // Esc 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
    });
  }
})();
