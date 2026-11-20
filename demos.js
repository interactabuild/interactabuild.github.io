/*
 * INTERACTABUILD — INTERACTIVE BROWSER SHOWCASE (CONCEPT DEMONSTRATIONS)
 * Mouse / touch / keyboard only. No camera connection, actual game engine, or software download.
 * Independent from all Interactabuild project source, player saves and calibration data.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('experience-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = 960, H = 520, TAU = Math.PI * 2;
  const tabButtons = [...document.querySelectorAll('.demo-tab')];
  const tabs = Object.fromEntries(tabButtons.map(el => [el.dataset.demo, el]));
  const panel = document.getElementById('demo-panel');
  const title = document.getElementById('demo-game-name');
  const metric = document.getElementById('demo-live-metric');
  const hint = document.getElementById('demo-instruction-line');
  const helpTitle = document.getElementById('demo-help-title');
  const helpText = document.getElementById('demo-help-text');
  const interactBtn = document.getElementById('demo-interact');
  const restartBtn = document.getElementById('demo-restart');
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = {
    wall: { name: 'BALL TO WALL', caption: 'HIT THE MOVING TARGETS TO SCORE', title: 'Ready, aim, play.', help: 'Click or tap the moving targets to earn points. Each hit sends them to a new position.', action: 'Hit a target', aria: 'Ball to Wall. Hit glowing moving targets to score.' },
    pond: { name: 'INTERACTIVE FISHING POND', caption: 'TAP THE WATER TO MAKE A RIPPLE', title: 'The pond comes alive.', help: 'Tap anywhere in the pond. The fish notice the ripple and swim away. There is no scoring in this demo.', action: 'Make a ripple', aria: 'Interactive Fishing Pond. Tap water to make ripples and watch fish move.' },
    ocean: { name: 'OCEAN EXPLORER', caption: 'MOVE YOUR POINTER · TAP TO REVEAL', title: 'Discover beneath the surface.', help: 'Move your pointer to illuminate the ocean. Click or tap to reveal a wider circle of underwater life.', action: 'Reveal the ocean', aria: 'Ocean Explorer. Move the pointer to explore and tap to reveal underwater creatures.' },
    range: { name: 'ULTIMATE SHOOTING RANGE', caption: 'AIM AND TAP A TARGET · 12 SHOTS', title: 'Take your best shot.', help: 'Aim at the glowing bullseyes and fire. You have 12 shots before reloading. This is a mouse/touch preview, not foam-dart detection.', action: 'Fire at a target', aria: 'Ultimate Shooting Range. Aim at targets and click to fire. Twelve shots per round.' }
  };
  let mode = 'wall', elapsed = 0, lastTime = 0, frameVisible = true;
  let pointer = { x: 490, y: 280, active: false };
  let state = {};

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (x, y, p) => Math.hypot(x - p.x, y - p.y);
  const fill = (color, x = 0, y = 0, w = W, h = H) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const radial = (x, y, radius, stops) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    return g;
  };
  const backdrop = (top, middle, bottom) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(.52, middle); g.addColorStop(1, bottom);
    fill(g);
  };
  const circle = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const ellipse = (x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
  const strokeEllipse = (x, y, rx, ry, color, width) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };
  const line = (x1, y1, x2, y2, color, width = 1) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };
  const polygon = (points, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]); for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]); ctx.closePath(); ctx.fill(); };
  const fx = (x, y, color, label = '') => state.effects.push({ x, y, color, label, age: 0 });
  const target = (x, y, radius, color) => ({ x, y, r: radius, color, vx: rand(-42, 42) || 20, vy: rand(-30, 30) || 18 });

  function initGame(which) {
    state = { effects: [], score: 0, ripples: [], touches: 0, reveals: 0, ammo: 12, hits: 0, time: 0 };
    if (which === 'wall') {
      state.targets = [target(260, 215, 44, '#69f9e3'), target(580, 355, 36, '#ffa66b'), target(725, 185, 32, '#a6b9ff'), target(410, 370, 29, '#d8f5ff')];
    }
    if (which === 'pond') {
      const species = ['koi', 'gold', 'carp', 'trout', 'koi', 'catfish', 'gold', 'trout'];
      state.fish = species.map((name, i) => ({ type: name, x: rand(200, 750), y: rand(170, 355), angle: rand(-Math.PI, Math.PI), speed: rand(18, 34), size: rand(.83, 1.25), phase: rand(0, 10), wiggle: rand(-.16, .16) }));
    }
    if (which === 'ocean') {
      state.animals = [
        { type: 'shark', x: 760, y: 182, dir: -1, speed: 38, size: 1.2, phase: .3 },
        { type: 'ray', x: 250, y: 270, dir: 1, speed: 19, size: 1.1, phase: 1.2 },
        { type: 'turtle', x: 660, y: 355, dir: -1, speed: 23, size: .82, phase: 2.1 },
        { type: 'fish', x: 170, y: 120, dir: 1, speed: 45, size: .72, phase: 1.7 },
        { type: 'fish', x: 340, y: 175, dir: 1, speed: 40, size: .62, phase: 2.5 },
        { type: 'fish', x: 530, y: 290, dir: -1, speed: 47, size: .84, phase: 3.7 },
        { type: 'fish', x: 790, y: 105, dir: -1, speed: 43, size: .52, phase: 4.2 }
      ];
      pointer = { x: W * .53, y: H * .47, active: false };
    }
    if (which === 'range') {
      state.targets = [target(230, 190, 37, '#f7c47e'), target(500, 315, 45, '#68eeda'), target(760, 185, 36, '#fa9174'), target(410, 170, 26, '#94baff'), target(675, 367, 28, '#f8da8f')];
      state.targets.forEach((t, i) => { t.vx = (i % 2 ? -1 : 1) * rand(22, 46); t.vy = 0; });
      pointer = { x: 480, y: 280, active: false };
    }
    updateMetric();
  }

  function updateMetric() {
    if (mode === 'wall') metric.textContent = `SCORE ${String(state.score).padStart(3, '0')}`;
    if (mode === 'pond') metric.textContent = `RIPPLES ${String(state.touches).padStart(2, '0')}`;
    if (mode === 'ocean') metric.textContent = `REVEALS ${String(state.reveals).padStart(2, '0')}`;
    if (mode === 'range') metric.textContent = `SCORE ${String(state.score).padStart(3, '0')}  ·  AMMO ${state.ammo}`;
    interactBtn.textContent = (mode === 'range' && state.ammo === 0) ? 'Reload (12 shots)' : settings[mode].action;
  }

  function selectGame(next, moveFocus = false) {
    if (!settings[next]) return;
    mode = next;
    for (const tab of tabButtons) {
      const active = tab.dataset.demo === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', tabs[next].id);
    const cfg = settings[next];
    title.textContent = cfg.name;
    hint.textContent = cfg.caption;
    helpTitle.textContent = cfg.title;
    helpText.textContent = cfg.help;
    canvas.setAttribute('aria-label', cfg.aria + ' Keyboard: Space or Enter to interact.');
    initGame(next);
    if (moveFocus) tabs[next].focus();
    draw();
  }

  tabButtons.forEach((tab, index) => {
    tab.addEventListener('click', () => selectGame(tab.dataset.demo));
    tab.addEventListener('keydown', e => {
      let to = -1;
      if (e.key === 'ArrowRight') to = (index + 1) % tabButtons.length;
      if (e.key === 'ArrowLeft') to = (index + tabButtons.length - 1) % tabButtons.length;
      if (e.key === 'Home') to = 0;
      if (e.key === 'End') to = tabButtons.length - 1;
      if (to !== -1) { e.preventDefault(); selectGame(tabButtons[to].dataset.demo, true); }
    });
  });
  document.querySelectorAll('.mini-demo-link').forEach(btn => btn.addEventListener('click', () => {
    selectGame(btn.dataset.demo);
    document.getElementById('demos').scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth', block: 'start' });
  }));

  function interact(x, y, useAssist = false) {
    const point = { x, y };
    if (mode === 'wall') {
      let hit = state.targets.find(t => distance(t.x, t.y, point) <= t.r + 12);
      if (useAssist) hit = [...state.targets].sort((a, b) => distance(a.x, a.y, point) - distance(b.x, b.y, point))[0];
      if (hit) {
        state.score += 10; fx(hit.x, hit.y, hit.color, '+10');
        hit.x = rand(125, 830); hit.y = rand(130, 410);
        hit.vx = rand(-45, 45) || 29; hit.vy = rand(-25, 25) || 14;
      } else fx(x, y, '#a4c4d2');
    } else if (mode === 'pond') {
      const nx = (x - 480) / 408, ny = (y - 260) / 213;
      if (nx * nx + ny * ny <= 1.0 || useAssist) {
        if (useAssist) { x = 480; y = 260; }
        state.touches++;
        state.ripples.push({ x, y, age: 0 });
        state.fish.forEach(f => {
          const dist = distance(f.x, f.y, {x, y});
          if (dist < 180) { f.angle = Math.atan2(f.y - y, f.x - x); f.speed = clamp(f.speed + 28, 19, 85); }
        });
      }
    } else if (mode === 'ocean') {
      pointer.x = x; pointer.y = y; pointer.active = true;
      state.reveals++;
      state.ripples.push({ x, y, age: 0 });
    } else if (mode === 'range') {
      if (state.ammo === 0) { state.ammo = 12; updateMetric(); return; }
      state.ammo--;
      let hit = state.targets.find(t => distance(t.x, t.y, point) <= t.r + 9);
      if (useAssist) hit = [...state.targets].sort((a, b) => distance(a.x, a.y, point) - distance(b.x, b.y, point))[0];
      if (hit) {
        state.hits++; state.score += 25;
        fx(hit.x, hit.y, '#91ffe3', '+25');
        hit.x = rand(150, 820); hit.y = rand(145, 385);
        hit.vx *= -1;
      } else fx(x, y, '#ffcc9b', 'MISS');
    }
    updateMetric();
    draw();
  }

  const toCanvasPoint = e => {
    const box = canvas.getBoundingClientRect();
    // Preserve circles and fish proportions on narrow displays by centring a cropped 960x520 view.
    const scale = Math.max(box.width / W, box.height / H);
    const offsetX = (box.width - W * scale) / 2;
    const offsetY = (box.height - H * scale) / 2;
    return { x: (e.clientX - box.left - offsetX) / scale, y: (e.clientY - box.top - offsetY) / scale };
  };
  canvas.addEventListener('pointermove', e => {
    const p = toCanvasPoint(e);
    pointer = { ...p, active: true };
  });
  canvas.addEventListener('pointerleave', () => { if (mode !== 'ocean') pointer.active = false; });
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = toCanvasPoint(e);
    pointer = { ...p, active: true };
    interact(p.x, p.y);
  });
  canvas.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(pointer.x, pointer.y, true); }
  });
  interactBtn.addEventListener('click', () => interact(pointer.x, pointer.y, true));
  restartBtn.addEventListener('click', () => { initGame(mode); draw(); });

  function resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
    draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { frameVisible = entries[0]?.isIntersecting ?? true; }, { rootMargin: '80px' }).observe(canvas);
  }

  function update(dt) {
    state.time += dt;
    const advanceTarget = (t, i) => {
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.x < 100 + t.r || t.x > W - 100 - t.r) t.vx *= -1;
      if (t.y < 112 + t.r || t.y > H - 78 - t.r) t.vy *= -1;
    };
    if (mode === 'wall' || mode === 'range') state.targets.forEach(advanceTarget);
    if (mode === 'pond') state.fish.forEach(f => {
      f.angle += Math.sin(state.time * .61 + f.phase) * dt * .18 + f.wiggle * dt;
      f.x += Math.cos(f.angle) * f.speed * dt;
      f.y += Math.sin(f.angle) * f.speed * dt;
      f.speed += (30 - f.speed) * dt * .25;
      const nx = (f.x - 480) / 352, ny = (f.y - 260) / 154;
      if (nx * nx + ny * ny > 1) {
        f.angle = Math.atan2(260 - f.y, 480 - f.x) + rand(-.35, .35);
        f.x += Math.cos(f.angle) * 3; f.y += Math.sin(f.angle) * 3;
      }
    });
    if (mode === 'ocean') state.animals.forEach(a => {
      a.x += a.speed * a.dir * dt;
      if (a.dir > 0 && a.x > W + 150) a.x = -150;
      if (a.dir < 0 && a.x < -150) a.x = W + 150;
    });
    for (const collection of [state.effects, state.ripples]) {
      for (const item of collection) item.age += dt;
    }
    state.effects = state.effects.filter(e => e.age < .8);
    state.ripples = state.ripples.filter(e => e.age < 1.55);
  }

  function drawEffects() {
    ctx.save();
    state.effects.forEach(e => {
      const p = e.age / .8;
      ctx.globalAlpha = (1 - p) * .92;
      ctx.strokeStyle = e.color; ctx.lineWidth = 4 - 2 * p;
      ctx.beginPath(); ctx.arc(e.x, e.y, 18 + 62 * p, 0, TAU); ctx.stroke();
      if (e.label) {
        ctx.font = '900 21px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 12;
        ctx.fillText(e.label, e.x, e.y - 23 - 46 * p); ctx.shadowBlur = 0;
      }
    });
    ctx.restore();
  }

  function drawTarget(t, i, style = 'wall') {
    const { x, y, r } = t;
    const color = t.color;
    ctx.save();
    circle(x, y, r + 16, radial(x, y, r + 26, [[0, color + '40'], [1, '#ffffff00']]));
    ctx.shadowColor = color; ctx.shadowBlur = style === 'range' ? 21 : 35;
    circle(x, y, r, style === 'range' ? '#d8e6e3' : color);
    ctx.shadowBlur = 0;
    if (style === 'range') {
      circle(x, y, r * .81, '#285675'); circle(x, y, r * .60, '#dae4ec'); circle(x, y, r * .38, '#e8675f'); circle(x, y, r * .17, '#ffdc95');
      strokeEllipse(x, y, r + 9, r + 9, color + '77', 1.6);
    } else {
      circle(x, y, r * .73, '#ffffff65'); circle(x, y, r * .48, '#0b3154'); circle(x, y, r * .29, '#e8fffb');
      ctx.globalAlpha = .85; circle(x - r * .34, y - r * .4, r * .13, '#ffffff');
      ctx.globalAlpha = 1;
      strokeEllipse(x, y, r + 13, r + 13, color + '66', 1.6);
    }
    ctx.restore();
  }

  function drawWall() {
    backdrop('#0e2140', '#103757', '#071526');
    fill(radial(510, 240, 420, [[0, '#37aacf2b'], [.6, '#08749511'], [1, '#00000000']]));
    for (let x = 0; x <= W; x += 60) line(x, 0, x, H, '#a0e9f013');
    for (let y = 0; y <= H; y += 55) line(0, y, W, y, '#a0e9f014');
    line(0, 436, W, 436, '#86fff155', 2);
    for (let i = 0; i <= 14; i++) {
      const x = i * 68;
      line(480 + (x - 480) * .33, 435, x, H, '#6ae7f422');
    }
    for (let i = 0; i < 4; i++) strokeEllipse(480, 263, 135 + i * 105, 95 + i * 80, '#9bdaeb12', 1.5);
    polygon([[0, 0], [250, 0], [360, H], [0, H]], '#60e9ff05');
    state.targets.forEach((t, i) => drawTarget(t, i));
    drawEffects();
  }

  const koiPalettes = {
    koi: { body: '#f3ead7', edge: '#c7e4df', patch: '#eb7143' },
    gold: { body: '#f5a54e', edge: '#fff0a4', patch: '#f0782c' },
    carp: { body: '#8a9b61', edge: '#bfbe87', patch: '#435e4f' },
    trout: { body: '#9bb3a5', edge: '#c8e4c8', patch: '#566f5c' },
    catfish: { body: '#877b61', edge: '#b7ae82', patch: '#655c4e' }
  };
  function drawFishTop(f) {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle);
    const sc = f.size; ctx.scale(sc, sc);
    const p = koiPalettes[f.type];
    ctx.globalAlpha = .24; ellipse(-3, 8, 35, 15, '#001723'); ctx.globalAlpha = 1;
    const wag = Math.sin(state.time * 7 + f.phase) * 9;
    polygon([[-28, 0], [-51, -15 + wag], [-46, wag], [-51, 17 + wag]], p.edge);
    polygon([[-2, -6], [-23, -22], [-13, -8]], p.body);
    polygon([[-2, 6], [-23, 22], [-13, 8]], p.body);
    const g = ctx.createLinearGradient(0, -15, 0, 16); g.addColorStop(0, p.edge); g.addColorStop(.48, p.body); g.addColorStop(1, p.edge);
    ellipse(0, 0, 34, 14, g);
    if (f.type === 'koi') {
      ellipse(-8, -4, 12, 8, p.patch); ellipse(18, 2, 8, 6, p.patch);
      circle(-8, -5, 3, '#263843');
    } else if (f.type === 'trout' || f.type === 'carp') {
      for (let i = 0; i < 7; i++) circle(-15 + i * 7, (i % 2 ? 5 : -5), 1.5, p.patch);
    } else ellipse(-10, -2, 10, 5, p.patch);
    circle(24, -5, 2.5, '#142c39'); circle(24, 5, 2.5, '#142c39');
    if (f.type === 'catfish') {
      line(26, -3, 44, -13, '#d5c6aa', 1.5); line(26, 3, 44, 13, '#d5c6aa', 1.5);
    }
    ctx.restore();
  }

  function drawPond() {
    backdrop('#142c3e', '#1b4a59', '#0c2336');
    for (let i = 0; i < 45; i++) {
      const x = ((i * 157 + 25) % 990), y = ((i * 91 + 35) % 510);
      circle(x, y, 2 + i % 6, '#a6ced011');
    }
    ellipse(480, 280, 434, 222, '#12252e');
    strokeEllipse(480, 263, 424, 217, '#879b9199', 28);
    strokeEllipse(480, 263, 411, 207, '#d4d4ba65', 6);
    const water = radial(422, 187, 500, [[0, '#329ea8'], [.5, '#145a75'], [1, '#08283e']]);
    ellipse(480, 262, 400, 197, water);
    ctx.save(); ctx.beginPath(); ctx.ellipse(480, 262, 399, 196, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 19; i++) {
      const cx = (i * 143 + 70) % 960, cy = (i * 63 + 80) % 520;
      const sweep = Math.sin(state.time * .5 + i) * 12;
      ctx.beginPath(); ctx.ellipse(cx + sweep, cy, 105, 20, .3, 0, TAU);
      ctx.strokeStyle = '#c0ffff10'; ctx.lineWidth = 5; ctx.stroke();
    }
    state.fish.forEach(drawFishTop);
    state.ripples.forEach(r => {
      const p = r.age / 1.55;
      ctx.globalAlpha = 1 - p;
      strokeEllipse(r.x, r.y, 6 + 125 * p, 4 + 55 * p, '#d6ffff', 2.2);
      strokeEllipse(r.x, r.y, 5 + 91 * p, 3 + 41 * p, '#a1e8e9', 1.4);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    strokeEllipse(480, 261, 402, 199, '#e1e9cf64', 4);
    for (let i = 0; i < 6; i++) ellipse(140 + i * 140, 49 + i % 2 * 8, 20, 4, '#8babb32d');
  }

  function drawOceanAnimal(a) {
    const y = a.y + Math.sin(state.time * 1.7 + a.phase) * 13;
    ctx.save(); ctx.translate(a.x, y); ctx.scale(a.dir * a.size, a.size);
    const tail = Math.sin(state.time * 5 + a.phase) * 9;
    ctx.globalAlpha = .88;
    if (a.type === 'shark') {
      polygon([[-72, 0], [-107, -29 + tail], [-101, 0], [-107, 26 + tail]], '#799da6');
      polygon([[-4, -12], [-26, -47], [21, -11]], '#7295a1');
      polygon([[-22, 9], [-5, 33], [15, 11]], '#6b929e');
      ellipse(10, 0, 79, 19, '#8babb5');
      polygon([[74, -7], [103, 0], [74, 7]], '#a2bac3');
      circle(71, -5, 3, '#123647');
    } else if (a.type === 'ray') {
      const flap = Math.sin(state.time * 2.1 + a.phase) * 15;
      polygon([[-40, 0], [0, -44 + flap], [56, -5], [0, 44 - flap]], '#709da9');
      polygon([[-38, -2], [10, -13], [50, -4], [5, 10]], '#a9bdc0');
      line(-35, 0, -88, 7, '#9cb8c2', 3);
    } else if (a.type === 'turtle') {
      polygon([[-12, -16], [-50, -38], [-41, -5]], '#7fb6a2');
      polygon([[17, 13], [-9, 45], [23, 34]], '#7fb6a2');
      ellipse(0, 0, 43, 29, '#4d867e');
      strokeEllipse(0, 0, 32, 23, '#b0d7aa', 2);
      polygon([[-4, -16], [14, -3], [-4, 17], [-23, 2]], '#82a991');
      ellipse(47, 0, 18, 13, '#8cbdaa'); circle(54, -5, 2, '#133d4b');
    } else {
      polygon([[-28, 0], [-45, -17 + tail], [-45, 16 + tail]], '#ceab83');
      ellipse(0, 0, 34, 15, '#9cbfba');
      polygon([[-8, -10], [-2, -21], [5, -10]], '#b4d3c3');
      circle(24, -3, 2, '#152a3b');
    }
    ctx.restore();
  }

  function drawOcean() {
    backdrop('#123c5b', '#0a5372', '#071b36');
    fill(radial(355, 0, 650, [[0, '#4ae8e943'], [.7, '#00a4da05'], [1, '#00000000']]));
    for (let i = 0; i < 6; i++) {
      const x = 85 + i * 163 + Math.sin(state.time * .25 + i) * 21;
      polygon([[x, 0], [x + 32, 0], [x + 230, H], [x + 50, H]], '#8ee8ef0b');
    }
    polygon([[0, 462], [70, 445], [133, 464], [255, 443], [350, 475], [455, 453], [575, 473], [710, 444], [860, 478], [960, 451], [960, H], [0, H]], '#092f46');
    for (let i = 0; i < 12; i++) {
      const x = (i * 93 + 38) % 960;
      ctx.beginPath(); ctx.moveTo(x, 495); ctx.quadraticCurveTo(x - 18 + Math.sin(state.time + i) * 7, 420, x + Math.sin(state.time * 1.2 + i) * 18, 389 - i % 4 * 15);
      ctx.strokeStyle = i % 2 ? '#398d8177' : '#3ba3a266'; ctx.lineWidth = 5; ctx.stroke();
    }
    for (let i = 0; i < 42; i++) {
      const x = (i * 131 + 53) % W, y = (i * 67 + 16 - state.time * (8 + i % 7) + 2500) % H;
      circle(x, y, i % 3 === 0 ? 2 : 1, '#affff636');
    }
    state.animals.forEach(drawOceanAnimal);
    // The fall-off mimics a moving reveal beam; this preview does not access a projector or camera.
    const radius = state.ripples.length ? 350 : 225;
    const dark = ctx.createRadialGradient(pointer.x, pointer.y, 16, pointer.x, pointer.y, radius + 170);
    dark.addColorStop(0, '#07182700'); dark.addColorStop(.34, '#05162617'); dark.addColorStop(.68, '#06182ca8'); dark.addColorStop(1, '#041323d6');
    fill(dark);
    fill(radial(pointer.x, pointer.y, 150, [[0, '#9bf5e61c'], [.5, '#7ef4ea0a'], [1, '#00000000']]));
    state.ripples.forEach(r => {
      const p = r.age / 1.55;
      ctx.globalAlpha = 1 - p;
      strokeEllipse(r.x, r.y, 40 + p * 200, 40 + p * 200, '#7dfce5', 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawRange() {
    backdrop('#25192f', '#172c45', '#0a1528');
    fill(radial(500, 170, 460, [[0, '#9d57932b'], [.58, '#234a6618'], [1, '#00000000']]));
    polygon([[0, 0], [220, 0], [375, 440], [0, H]], '#1e2641');
    polygon([[740, 0], [W, 0], [W, H], [575, 440]], '#182238');
    polygon([[0, H], [W, H], [680, 380], [270, 380]], '#101f32');
    for (let i = 0; i < 7; i++) {
      line(i * 170 - 70, H, 480 + (i - 3) * 50, 380, '#99d2e32a');
    }
    for (let i = 0; i < 4; i++) line(0, 410 + i * 26, W, 410 + i * 26, '#9adceb20');
    for (let i = 0; i < 5; i++) {
      const x = 140 + i * 177;
      line(x, 50, x, 460, '#e2eeff19', 2);
      circle(x, 52, 5, '#f7c785');
    }
    state.targets.forEach((t, i) => drawTarget(t, i, 'range'));
    drawEffects();
    if (pointer.active) {
      const { x, y } = pointer;
      strokeEllipse(x, y, 22, 22, '#dcfefbb0', 2);
      line(x - 40, y, x - 12, y, '#dcfefbb0', 1.5);
      line(x + 12, y, x + 40, y, '#dcfefbb0', 1.5);
      line(x, y - 40, x, y - 12, '#dcfefbb0', 1.5);
      line(x, y + 12, x, y + 40, '#dcfefbb0', 1.5);
      circle(x, y, 3, '#e8ffff');
    }
    if (state.ammo === 0) {
      fill('#041320ad', 300, 194, 365, 110);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ecfff9'; ctx.font = '900 27px system-ui';
      ctx.fillText('ROUND COMPLETE', 483, 239);
      ctx.font = '600 15px system-ui'; ctx.fillStyle = '#a8d8d3'; ctx.fillText('Tap the reload button to continue', 483, 268);
    }
  }

  function draw() {
    if (!canvas.width || !canvas.height) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / W, canvas.height / H);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - W * scale) / 2, (canvas.height - H * scale) / 2);
    if (mode === 'wall') drawWall();
    if (mode === 'pond') drawPond();
    if (mode === 'ocean') drawOcean();
    if (mode === 'range') drawRange();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function tick(now) {
    const dt = Math.min(.04, Math.max(0, (now - (lastTime || now)) / 1000));
    lastTime = now;
    if (frameVisible && !document.hidden) {
      elapsed += dt;
      if (!motionReduced) update(dt);
      draw();
    }
    requestAnimationFrame(tick);
  }
  selectGame('wall');
  resize();
  requestAnimationFrame(tick);
})();
