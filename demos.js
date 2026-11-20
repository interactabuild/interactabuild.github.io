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
    wall: { name: 'BALL TO WALL', caption: 'HIT THE MONSTERS BEFORE THEY REACH YOU', title: 'Ready, aim, play.', help: 'Candy monsters pop up and grow as they come towards you. Tap them before they reach you: every hit scores 10 points.', action: 'Hit a monster', aria: 'Ball to Wall. Hit the monsters before they reach you to score.' },
    pond: { name: 'PROJECTION POND PRO', caption: 'TAP A FISH TO CATCH IT', title: 'Catch the fish.', help: 'Fish, frogs and beetles swim in and out of the pond. Tap one to catch it and score. Miss, and the fish nearby dart away.', action: 'Catch a fish', aria: 'Projection Pond Pro. Tap the fish to catch them and score points.' },
    ocean: { name: 'OCEAN EXPLORER', caption: 'TAP THE WATER TO FEED THE FISH', title: 'Discover beneath the surface.', help: 'Tap the water to send out ripples and drop food, and watch the fish swim over to eat it. Tap near the pufferfish to see it puff up.', action: 'Feed the fish', aria: 'Ocean Explorer. Tap the water to make ripples and feed the fish on a coral reef.' },
    range: { name: 'ULTIMATE SHOOTING RANGE', caption: 'HIT THE MOVING BULLSEYES · 60 SECONDS', title: 'Take your best shot.', help: 'You have 60 seconds. Tap the swinging bullseyes to score 20 points, or hit the middle for double. Press Play again when time runs out.', action: 'Fire at a target', aria: 'Ultimate Shooting Range. Hit the moving bullseyes in 60 seconds.' },
  };
  let mode = 'wall', elapsed = 0, lastTime = 0, frameVisible = true;
  // Preview pictures are fetched only once the previews are near the screen, and only
  // for the preview being shown, so opening the page on a phone stays quick.
  const art = { wall: [], pond: [], ocean: [], range: [] };
  let previewsNear = false;
  const artFor = (which, src) => { const img = new Image(); art[which].push([img, src]); return img; };
  const wakeArt = which => { for (const [img, src] of art[which]) if (!img.src) img.src = src; };
  let pointer = { x: 490, y: 280, active: false };
  let state = {};

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (x, y, p) => Math.hypot(x - p.x, y - p.y);
  // A finger-sized reach (about 26 screen pixels) in preview units: on a phone the preview
  // is drawn at about a third of its size, so small targets need a bigger hit area.
  const fingerReach = () => {
    const box = canvas.getBoundingClientRect();
    return 26 / (Math.max(box.width / W, box.height / H) || 1);
  };
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

  function initGame(which) {
    state = { effects: [], score: 0, ripples: [], touches: 0, hits: 0, time: 0 };
    if (which === 'wall') {
      state.world = CANDY_WORLD;
      state.monsters = []; state.spawnIn = 0;
    }
    if (which === 'pond') {
      const species = ['koi', 'goldfish', 'carp', 'trout', 'koi', 'catfish', 'goldfish', 'trout', 'koi', 'carp', 'frog', 'frog', 'beetle', 'beetle', 'beetle'];
      state.fish = species.map(makeSwimmer);
    }
    if (which === 'ocean') {
      Reef.init();
      pointer = { x: W * .5, y: H * .45, active: false };
    }
    if (which === 'range') {
      state.targets = Array.from({ length: RANGE.count }, (_, i) => makeRangeTarget(i));
      state.clock = RANGE.seconds; state.sparks = [];
      pointer = { x: 480, y: 280, active: false };
    }
    updateMetric();
  }

  function updateMetric() {
    if (mode === 'wall') metric.textContent = `SCORE ${String(state.score).padStart(3, '0')}`;
    if (mode === 'pond') metric.textContent = `SCORE ${String(state.score).padStart(3, '0')}`;
    if (mode === 'ocean') metric.textContent = `FLAKES EATEN ${String(Reef.fed).padStart(2, '0')}`;
    if (mode === 'range') metric.textContent = `SCORE ${String(state.score).padStart(3, '0')}  ·  ${Math.ceil(state.clock)}s`;
    interactBtn.textContent = (mode === 'range' && state.clock <= 0) ? 'Play again' : settings[mode].action;
  }

  function selectGame(next, moveFocus = false) {
    if (!settings[next]) return;
    mode = next;
    if (previewsNear) wakeArt(next);
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
      // The nearest monster (drawn last) wins when they overlap; the helper button hits
      // the one closest to reaching you.
      const byNearness = [...state.monsters].sort((a, b) => b.age - a.age);
      const reach = fingerReach();
      let hit = byNearness.filter(m => distance(m.x, m.y, point) <= Math.max(reach, monsterSize(m) * .5))
        .sort((a, b) => distance(a.x, a.y, point) - distance(b.x, b.y, point))[0];
      if (useAssist) hit = byNearness[0];
      if (hit) {
        state.score += 10; fx(hit.x, hit.y, '#ff6fc8', '+10');
        state.monsters.splice(state.monsters.indexOf(hit), 1);
      } else fx(x, y, '#a4c4d2');
    } else if (mode === 'pond') {
      const seen = state.fish.filter(f => !f.away && inPond(f.x, f.y));
      const reach = fingerReach();
      let caught = seen.filter(f => distance(f.x, f.y, point) <= Math.max(reach, sizeOf(f.type) * .6))
        .sort((a, b) => distance(a.x, a.y, point) - distance(b.x, b.y, point))[0];
      if (useAssist) caught = seen.sort((a, b) => distance(a.x, a.y, POND) - distance(b.x, b.y, POND))[0];
      if (caught) {
        state.score += 10; fx(caught.x, caught.y, '#69f0d3', '+10');
        state.ripples.push({ x: caught.x, y: caught.y, age: 0 });
        // As in the game, a new fish swims in from the edge of the screen.
        reenterSwimmer(caught);
      } else if (inPond(x, y)) {
        state.touches++;
        state.ripples.push({ x, y, age: 0 });
        // Missed: nearby fish dart away from the splash.
        const now = state.time * 1000;
        state.fish.forEach(f => {
          if (!f.away && distance(f.x, f.y, point) < 180) { setMode(f, swimStyles[f.type].kind ? travelMode(f) : 'dart', now); f.desired = Math.atan2(f.y - y, f.x - x); }
        });
      }
    } else if (mode === 'ocean') {
      // The helper button feeds the water near the middle of the reef.
      if (useAssist && !pointer.active) { x = W * rand(.3, .7); y = H * rand(.3, .55); }
      Reef.touch(x, y);
    } else if (mode === 'range') {
      if (state.clock <= 0) { initGame('range'); return; }
      const live = state.targets.filter(o => o.hitTime <= 0), r = rangeR();
      const reach = Math.max(r + 6, fingerReach());
      let hit = live.filter(o => distance(o.x * W, o.y * H, point) <= reach)
        .sort((a, b) => distance(a.x * W, a.y * H, point) - distance(b.x * W, b.y * H, point))[0];
      // The helper button aims at the middle of the nearest target.
      if (useAssist) { hit = live.sort((a, b) => distance(a.x * W, a.y * H, point) - distance(b.x * W, b.y * H, point))[0]; if (hit) { x = hit.x * W; y = hit.y * H; } }
      if (hit) {
        // As in the game: the target swings on its cable and keeps the hole; a hit in
        // the middle scores double.
        const dx = clamp(x - hit.x * W, -r, r), dy = clamp(y - hit.y * H, -r, r);
        const centre = Math.hypot(dx, dy) <= r * .3, points = RANGE.points * (centre ? 2 : 1);
        state.hits++; state.score += points;
        hit.hitTime = RANGE.react; hit.pulse = .3; hit.swingDir = dx < 0 ? 1 : -1;
        hit.holes.push([dx / r, dy / r]);
        fx(x, y, '#ffd27a', centre ? `BULLSEYE +${points}` : `+${points}`);
        for (let i = 0; i < 22; i++) {
          const a = i * 2.39996 + Math.random() * .45, v = 95 + Math.random() * 180;
          state.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .45 });
        }
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
    new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || previewsNear) return;
      previewsNear = true; wakeArt(mode);
    }, { rootMargin: '250px 0px' }).observe(canvas);
  }

  function update(dt) {
    state.time += dt;
    if (mode === 'range') {
      if (state.clock > 0) {
        const before = Math.ceil(state.clock);
        state.clock = Math.max(0, state.clock - dt);
        state.targets.forEach(o => stepRangeTarget(o, dt));
        if (Math.ceil(state.clock) !== before) updateMetric();
      }
      for (const p of state.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; }
      state.sparks = state.sparks.filter(p => p.life > 0);
    }
    if (mode === 'wall') {
      // As in the game: a monster appears somewhere every 0.65-1.6 s (at most 10 at once)
      // and grows as it comes towards you; if it gets all the way, it gets through.
      state.spawnIn -= dt;
      if (state.spawnIn <= 0) {
        if (state.monsters.length < 10) state.monsters.push({ x: (.04 + Math.random() * .82) * W + MONSTER.size / 2, y: (.05 + Math.random() * .76) * H + MONSTER.size / 2, age: 0, art: state.world.monster });
        state.spawnIn = .65 + Math.random() * .95;
      }
      for (const m of state.monsters) m.age += dt;
      state.monsters = state.monsters.filter(m => {
        if (m.age < MONSTER.seconds) return true;
        fx(m.x, m.y, '#ff6b6b');
        return false;
      });
    }
    if (mode === 'pond') {
      const now = state.time * 1000;
      for (const f of state.fish) {
        if (f.away) { if (now >= f.away) reenterSwimmer(f); continue; }
        stepSwimmer(f, dt, now);
      }
    }
    if (mode === 'ocean') Reef.update(dt);
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



  // Ball to Wall: the game's ready-made Candy land world and its candy monster. Monsters
  // use the game's starting settings: 76 px, growing from 22% to 180% over 22.75 s
  // (effect speed 5), with its pink glow.
  const MONSTER = { size: 76, seconds: 22.75, from: .22, to: 1.8 };
  const CANDY_WORLD = { background: artFor('wall', 'assets/wall/candy-land.jpg'), monster: artFor('wall', 'assets/wall/candy-monster.png') };
  const monsterSize = m => MONSTER.size * (MONSTER.from + (MONSTER.to - MONSTER.from) * Math.min(1, m.age / MONSTER.seconds));
  const ready = img => img.complete && img.naturalWidth > 0;
  function drawWall() {
    const bg = state.world.background;
    if (ready(bg)) ctx.drawImage(bg, 0, (H - W * bg.naturalHeight / bg.naturalWidth) / 2, W, W * bg.naturalHeight / bg.naturalWidth);
    else backdrop('#0e2140', '#103757', '#071526');
    // Smaller (farther) monsters behind bigger (nearer) ones.
    for (const m of [...state.monsters].sort((a, b) => a.age - b.age)) {
      if (!ready(m.art)) continue;
      const size = monsterSize(m), k = Math.min(1, m.age / MONSTER.seconds);
      const w = m.art.naturalWidth >= m.art.naturalHeight ? size : size * m.art.naturalWidth / m.art.naturalHeight;
      const h = m.art.naturalWidth >= m.art.naturalHeight ? size * m.art.naturalHeight / m.art.naturalWidth : size;
      ctx.save();
      ctx.globalAlpha = .65 + .35 * k;
      ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 12;
      ctx.drawImage(m.art, m.x - w / 2, m.y - h / 2, w, h);
      ctx.restore();
    }
    readabilityShade();
    drawEffects();
  }

  /* Fish swimming, taken from Projection Pond Pro (POND_NATURAL_SWIM_V1): fish swim in
     bursts and glides, bend their bodies, turn smoothly, beat their front fins and keep
     out of each other's way. Frogs kick, glide with legs trailing and draw them up again;
     beetles row with both back legs together (POND_LIMBS_V1). As in the game they swim freely in and out of the pond
     (only seen inside it) and, once off the screen, come back in from a random edge. */
  // The open water of the game's koi pond picture: fish show only inside it.
  const POND = { x: 530, y: 255, rx: 365, ry: 155 };
  const pondPhoto = artFor('pond', 'assets/pond/koi.jpg');
  // The game's starting settings (speed 50, gentle curves), with the sizes scaled from
  // the game's 1280-wide screen to this 960-wide one (fish 85, frog 45, beetle 30).
  const FISH = { speed: 50, size: 64, path: 1 };
  const sizeOf = type => ({ frog: 34, beetle: 23 })[type] || FISH.size;
  const swimStyles = {
    koi:      { wave: .10, waveLen: 1.0, hz: [1.4, 2.8], burst: [1, 3], glide: [.6, 1.8], hover: .14, dart: .05, turn: 1.5 },
    goldfish: { wave: .12, waveLen: .9, hz: [1.8, 3.2], burst: [.6, 2], glide: [.4, 1.2], hover: .2, dart: .06, turn: 2.0 },
    trout:    { wave: .08, waveLen: 1.1, hz: [2.2, 3.8], burst: [1, 3.5], glide: [.4, 1.2], hover: .06, dart: .12, turn: 1.8 },
    catfish:  { wave: .13, waveLen: .8, hz: [1.0, 2.0], burst: [1.5, 4], glide: [.8, 2.2], hover: .25, dart: .03, turn: 1.1 },
    carp:     { wave: .09, waveLen: 1.0, hz: [1.2, 2.4], burst: [1.2, 3.5], glide: [.8, 2.2], hover: .18, dart: .04, turn: 1.2 },
    frog:     { kind: 'frog', turn: 1.4 },
    beetle:   { kind: 'beetle', turn: 2.6, hz: 3.4 }
  };
  // Legs and front fins that move: fractions of each picture (facing up); each left one is
  // mirrored for the right. body: an oval [x, y, rx, ry] never cut into a leg.
  const limbRigs = {
    frog: { body: [.5, .5, .2, .33], limbs: [
      { part: 'hind', poly: [[0, .56], [.5, .56], [.5, 1], [0, 1]], pivot: [.4, .66] },
      { part: 'arm', poly: [[0, .18], [.33, .18], [.33, .55], [0, .55]], pivot: [.33, .44] }] },
    beetle: { body: [.5, .555, .25, .335], limbs: [
      { part: 'hind', poly: [[.3, .585], [0, .75], [0, 1], [.3, 1]], pivot: [.29, .63] },
      { part: 'mid', poly: [[.3, .39], [0, .39], [0, .75], [.3, .585]], pivot: [.27, .46] }] },
    koi:      { limbs: [{ part: 'fin', poly: [[0, .195], [.295, .195], [.295, .335], [0, .335]], pivot: [.31, .215] }] },
    goldfish: { limbs: [{ part: 'fin', poly: [[0, .205], [.3, .205], [.3, .41], [0, .41]], pivot: [.32, .225] }] },
    trout:    { limbs: [{ part: 'fin', poly: [[0, .215], [.275, .215], [.275, .32], [0, .32]], pivot: [.29, .235] }] },
    catfish:  { limbs: [{ part: 'fin', poly: [[0, .225], [.255, .225], [.255, .34], [0, .34]], pivot: [.275, .245] }] },
    carp:     { limbs: [{ part: 'fin', poly: [[0, .215], [.235, .215], [.205, .35], [0, .35]], pivot: [.25, .235] }] }
  };
  const fishArt = {};
  for (const type of Object.keys(swimStyles)) {
    fishArt[type] = artFor('pond', `assets/fish/${type}.png`);
  }
  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
  const inPond = (x, y) => ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 <= 1;
  const cruiseSpeed = f => f.speed * FISH.speed / 35;

  function makeSwimmer(type) {
    const f = { type, speed: rand(24, 52), v: 0, phase: rand(0, TAU), amp: 0, bend: 0, mode: null, away: 0, kick: 0, arms: 0, stroke: 0 };
    // Already in the pond at the start.
    for (let n = 0; n < 200; n++) { f.x = rand(0, W); f.y = rand(0, H); if (inPond(f.x, f.y)) break; }
    f.angle = f.desired = rand(0, TAU);
    return f;
  }
  // How far outside the water a creature is (1 = on the edge): beyond 1 + its length, it
  // is out of sight.
  const pondReach = (f, x = f.x, y = f.y) => Math.hypot((x - POND.x) / POND.rx, (y - POND.y) / POND.ry);
  const outOfSight = f => pondReach(f) > 1 + sizeOf(f.type) / POND.ry;
  // Come back in from just outside a random point on the water's edge, heading inwards.
  // (The game brings them in from the screen edge; here the water fills most of the
  // picture, so they would spend most of their time hidden behind the rocks.)
  function reenterSwimmer(f) {
    const at = rand(0, TAU), out = 1 + sizeOf(f.type) * .6 / POND.ry;
    f.x = POND.x + Math.cos(at) * POND.rx * out; f.y = POND.y + Math.sin(at) * POND.ry * out;
    f.angle = Math.atan2(POND.y - f.y, POND.x - f.x) + rand(-.6, .6);
    f.desired = f.angle; f.v = cruiseSpeed(f) * .8; f.mode = null; f.away = 0;
  }
  function setMode(f, mode, now) {
    const st = swimStyles[f.type], wander = FISH.path === 0 ? .12 : FISH.path === 1 ? .6 : 1.5;
    f.mode = mode;
    if (mode === 'swim') { f.modeEnd = now + 1000 * rand(...(st.burst || [1, 2])); f.desired = f.angle + rand(-wander, wander); }
    else if (mode === 'glide') f.modeEnd = now + 1000 * rand(...(st.glide || [.6, 1.6]));
    else if (mode === 'hover') { f.modeEnd = now + 1000 * rand(1.5, 5); f.desired = f.angle + rand(-.8, .8) * (FISH.path === 0 ? .2 : 1); }
    else if (mode === 'dart') { f.modeEnd = now + 1000 * rand(.35, .8); f.desired = f.angle + rand(-1, 1); }
    else if (mode === 'kick') { f.modeEnd = now + 260; f.desired = f.angle + rand(-wander, wander) * .7; }
    else if (mode === 'float') f.modeEnd = now + 1000 * rand(2, 6);
    else if (mode === 'row') { f.modeEnd = now + 1000 * rand(.8, 2.6); f.desired = f.angle + rand(-wander, wander) * 1.4; }
  }
  // The mode a creature starts in and uses to cross open ground: swim, kick or row.
  const travelMode = f => f.type === 'frog' ? 'kick' : f.type === 'beetle' ? 'row' : 'swim';
  function nextMode(f, now) {
    const st = swimStyles[f.type], r = Math.random();
    // Frog: kick, glide with legs trailing (drawn up again near the end), then kick
    // again or float a while.
    if (st.kind === 'frog') {
      if (f.mode === 'kick') { setMode(f, 'glide', now); f.modeEnd = now + 1000 * rand(.6, 1.4); f.glideFrom = now; }
      else if (f.mode === 'glide' && r < .3) setMode(f, 'float', now);
      else setMode(f, 'kick', now);
      return;
    }
    // Beetle: bouts of rowing, a short coast, now and then a rest.
    if (st.kind === 'beetle') {
      if (f.mode === 'row') {
        if (r < .3) { setMode(f, 'float', now); f.modeEnd = now + 1000 * rand(1, 4); }
        else { setMode(f, 'glide', now); f.modeEnd = now + 1000 * rand(.2, .7); }
      } else setMode(f, 'row', now);
      return;
    }
    if (f.mode === 'swim' || f.mode === 'dart') setMode(f, 'glide', now);
    else if (r < st.dart) setMode(f, 'dart', now);
    else if (r < st.dart + st.hover) setMode(f, 'hover', now);
    else setMode(f, 'swim', now);
  }
  function stepSwimmer(f, dt, now) {
    const st = swimStyles[f.type], cruise = cruiseSpeed(f);
    if (!f.mode) setMode(f, travelMode(f), now);
    if (now >= f.modeEnd) nextMode(f, now);
    const here = inPond(f.x, f.y);
    // Out of sight beyond the pond: keep going straight on, so the fish soon comes back
    // into view or leaves the screen, instead of idling where nobody can see it.
    if (!here) { if (f.mode !== travelMode(f)) setMode(f, travelMode(f), now); f.desired = f.angle; }
    // Meander while swimming or gliding: a turn that drifts slowly from side to side.
    if (here && !st.kind && (f.mode === 'swim' || f.mode === 'glide')) {
      if (!(now < f.driftUntil)) { f.driftTo = rand(-1, 1) * (FISH.path === 0 ? .12 : FISH.path === 1 ? .45 : .9); f.driftUntil = now + rand(600, 1800); }
      f.drift = (f.drift || 0) + (f.driftTo - (f.drift || 0)) * Math.min(1, dt * 1.5);
      f.desired += f.drift * dt;
    }
    let desired = f.desired;
    // Keep a little space from the others.
    if (here) {
      let px = 0, py = 0;
      for (const o of state.fish) {
        if (o === f || o.away) continue;
        const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy), near = (sizeOf(f.type) + sizeOf(o.type)) * .5;
        if (d > 0 && d < near) { const w = (near - d) / near; px += dx / d * w; py += dy / d * w; }
      }
      if (px || py) { const push = Math.min(1, Math.hypot(px, py)); desired = Math.atan2(Math.sin(desired) + py * push * 1.5, Math.cos(desired) + px * push * 1.5); }
    }
    // Turn smoothly: fast fish turn wider, hovering fish can pivot slowly on the spot.
    const diff = wrapAngle(desired - f.angle);
    let maxTurn = st.turn * (f.mode === 'hover' || f.mode === 'float' ? .45 : .6 + .6 * Math.min(1, f.v / Math.max(cruise, 1)));
    if (st.kind === 'frog' && f.mode !== 'kick') maxTurn *= .3;
    const turn = clamp(diff * 2.2 * dt, -maxTurn * dt, maxTurn * dt);
    f.angle += turn;
    const turning = turn / Math.max(dt, 1e-3);
    // Speed: thrust while swimming, coast down while gliding.
    let target = 0, drag = .9, rate = f.mode === 'dart' ? 6 : 2.2;
    if (st.kind === 'frog') {
      // f.kick: how far the back legs are stretched out (0 folded, 1 straight back).
      if (f.mode === 'kick') { f.kick = Math.min(1, f.kick + dt / .14); target = cruise * 2.8; rate = 10; drag = 0; }
      else {
        const late = f.mode === 'glide' && now - f.glideFrom > .45 * (f.modeEnd - f.glideFrom);
        if (f.mode !== 'glide' || late) f.kick = Math.max(0, f.kick - dt / .4);
        drag = f.mode === 'float' ? 2.4 : 1.0;
      }
      f.arms += ((f.mode === 'float' ? 0 : f.kick) - f.arms) * Math.min(1, dt * 6);
    } else if (st.kind === 'beetle') {
      // f.stroke: 0-1 through each stroke of the back legs; the first third pushes.
      if (f.mode === 'row') {
        f.stroke = (f.stroke + dt * st.hz) % 1;
        if (f.stroke < .32) { target = cruise * 1.9; rate = 7; }
        drag = 1.8;
      } else { f.stroke = 0; drag = f.mode === 'float' ? 3 : 1.2; }
    } else {
      target = f.mode === 'swim' ? cruise : f.mode === 'dart' ? cruise * 2.4 : f.mode === 'hover' ? cruise * .08 : 0;
      drag = f.mode === 'glide' ? .8 : 1.6;
    }
    target *= 1 - .4 * Math.min(1, Math.abs(diff) / 1.6);
    if (f.v < target) f.v += (target - f.v) * Math.min(1, dt * rate);
    else f.v = Math.max(target, f.v * Math.exp(-drag * dt));
    f.x += Math.cos(f.angle) * f.v * dt;
    f.y += Math.sin(f.angle) * f.v * dt;
    f.bend += (clamp(turning * 2, -1, 1) - f.bend) * Math.min(1, dt * 4);
    // Gone from the water: wait a moment, then come back in at a random point on its edge.
    if (outOfSight(f)) f.away = now + rand(350, 1650);
    if (st.kind) return;
    // Body: tail beat follows thrust, and the body curves into turns.
    const thrusting = f.mode === 'swim' || f.mode === 'dart';
    const hz = f.mode === 'hover' ? .9 : thrusting ? st.hz[0] + (st.hz[1] - st.hz[0]) * Math.min(1, f.v / Math.max(cruise * 2, 1)) : .6;
    const amp = f.mode === 'dart' ? 1.3 : thrusting ? 1 : f.mode === 'hover' ? .22 : .18;
    f.amp += (amp - f.amp) * Math.min(1, dt * 3);
    f.phase += dt * TAU * hz;
    // Front fins: held partly back and beating while swimming, paddling when hovering,
    // spread a little to steer while gliding.
    const hovering = f.mode === 'hover' ? 1 : 0, k = Math.min(1, dt * 3);
    f.finBase = (f.finBase || 0) + ((thrusting ? .4 : hovering ? 0 : .12) - (f.finBase || 0)) * k;
    f.finAmp = (f.finAmp || 0) + ((thrusting ? .2 : hovering ? .38 : .1) - (f.finAmp || 0)) * k;
    f.finHover = (f.finHover || 0) + (hovering - (f.finHover || 0)) * k;
    f.fin = (f.fin || 0) + dt * TAU * (hovering ? 1.7 : thrusting ? 1.3 : .6);
  }

  // Each picture is cut once into its fins and body, and the body into strips that bend.
  // res: canvas pixels per unit, so the fish stay sharp on high-resolution screens.
  const fishCuts = new Map();
  function cutFish(type, art, width, height, slices, res) {
    const key = `${type}|${width}x${height}|${slices}|${res}`;
    let cut = fishCuts.get(key);
    if (cut) return cut;
    const w = Math.max(1, Math.round(width * res)), h = Math.max(slices, Math.round(height * res));
    const make = (cw, ch) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
    const body = make(w, h), bc = body.getContext('2d'); bc.drawImage(art, 0, 0, w, h);
    const rig = limbRigs[type], limbs = [];
    for (const limb of rig.limbs) for (const side of [-1, 1]) {
      const X = x => (side < 0 ? x : 1 - x) * w;
      // The leg's area as a solid shape, so the body loses it completely.
      const area = make(w, h), ac = area.getContext('2d'); ac.beginPath();
      limb.poly.forEach(([x, y], i) => i ? ac.lineTo(X(x), y * h) : ac.moveTo(X(x), y * h)); ac.fill();
      if (rig.body) { const [bx, by, rx, ry] = rig.body; ac.globalCompositeOperation = 'destination-out'; ac.beginPath(); ac.ellipse(bx * w, by * h, rx * w, ry * h, 0, 0, TAU); ac.fill(); }
      const full = make(w, h), fc = full.getContext('2d');
      fc.drawImage(art, 0, 0, w, h); fc.globalCompositeOperation = 'destination-in'; fc.drawImage(area, 0, 0);
      bc.globalCompositeOperation = 'destination-out'; bc.drawImage(area, 0, 0);
      // Keep only the leg's own box: drawing mostly-empty full-size pictures is slow.
      const xs = limb.poly.map(([x]) => X(x)), ys = limb.poly.map(([, y]) => y * h);
      const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
      const cw = Math.max(1, Math.min(w, Math.ceil(Math.max(...xs))) - x0), ch = Math.max(1, Math.min(h, Math.ceil(Math.max(...ys))) - y0);
      const c = make(cw, ch); c.getContext('2d').drawImage(full, x0, y0, cw, ch, 0, 0, cw, ch);
      const px = X(limb.pivot[0]), py = limb.pivot[1] * h;
      limbs.push({ canvas: c, part: limb.part, side, px: (px - w / 2) / res, py: (py - h / 2) / res, ox: (x0 - px) / res, oy: (y0 - py) / res, s: limb.pivot[1] });
    }
    const strips = [];
    for (let i = 0; i < slices; i++) {
      // Each strip reaches into the next, so no gaps show on the outside of a bend.
      const y0 = Math.round(h * i / slices), y1 = Math.min(h, Math.round(h * (i + 1) / slices) + 1 + Math.ceil(w * Math.min(.15, .6 / slices)));
      const strip = make(w, y1 - y0); strip.getContext('2d').drawImage(body, 0, y0, w, y1 - y0, 0, 0, w, y1 - y0);
      strips.push(strip);
    }
    cut = { body, limbs, strips, res };
    if (fishCuts.size > 40) fishCuts.clear();
    fishCuts.set(key, cut);
    return cut;
  }
  const smooth = t => t * t * (3 - 2 * t);
  // How far each leg or fin is swung back toward the tail (radians), plus stretch for frog legs.
  function limbPose(f, limb) {
    if (limb.part === 'fin') {
      // Front fins: beat gently while swimming, paddle left and right in turn to hold
      // still, and the fin on the inside of a turn flares out to brake.
      const beat = Math.sin(f.fin + (limb.side > 0 ? Math.PI * f.finHover : 0));
      const flare = limb.side * f.bend > 0 ? .45 * Math.abs(f.bend) : 0;
      return { turn: f.finBase + f.finAmp * beat - flare };
    }
    if (f.type === 'frog') {
      if (limb.part === 'hind') return { turn: .28 * f.kick, sx: 1 - .4 * f.kick, sy: 1 + .85 * f.kick };
      return { turn: 1.5 * f.arms };
    }
    // Beetle: both back legs row together, a quick push back, then a slower reach forward.
    let a = -.2;
    if (f.mode === 'row') { const p = f.stroke; a = p < .32 ? -.7 + .75 * smooth(p / .32) : .05 - .75 * smooth((p - .32) / .68); }
    return { turn: limb.part === 'hind' ? a : a * .4 };
  }
  function drawLimb(limb, pose, dx, along, res) {
    ctx.save(); ctx.translate(limb.px + dx, limb.py); ctx.rotate(limb.side * pose.turn + along);
    if (pose.sx) ctx.scale(pose.sx, pose.sy);
    ctx.drawImage(limb.canvas, limb.ox, limb.oy, limb.canvas.width / res, limb.canvas.height / res);
    ctx.restore();
  }
  // Draw a creature, bending fish along their length (pictures face up).
  function drawSwimmer(f, res) {
    const art = fishArt[f.type], st = swimStyles[f.type], size = sizeOf(f.type);
    if (!art.complete || !art.naturalWidth) { ellipse(f.x, f.y, size * .35, size * .15, '#f9be55'); return; }
    const height = size, width = Math.min(height * art.naturalWidth / art.naturalHeight, height);
    const slices = st.kind ? 1 : Math.round(Math.min(32, height / 5));
    const cut = cutFish(f.type, art, width, height, slices, res);
    // Frogs and beetles: legs drawn under a rigid body.
    if (st.kind) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle + Math.PI / 2);
      for (const limb of cut.limbs) drawLimb(limb, limbPose(f, limb), 0, 0, res);
      ctx.drawImage(cut.body, -width / 2, -height / 2, width, height);
      ctx.restore();
      return;
    }
    // The head sways a little with each tail beat.
    const sway = .045 * f.amp * Math.sin(f.phase);
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle + Math.PI / 2 + sway);
    // Side shift of the body at s (0 head, 1 tail tip): a travelling wave growing towards
    // the tail, the head counter-swinging a little, and the body curving into the turn.
    const bodyShift = s => {
      const u = Math.max(0, s - .28) / .72;
      const wave = st.wave * f.amp * (u * u * Math.sin(f.phase - u * Math.PI * 2 * st.waveLen) - (s < .28 ? .12 * (.28 - s) / .28 * Math.sin(f.phase) : 0));
      return height * (wave + f.bend * .55 * (s - .35) * (s - .35));
    };
    // Fins sit under the body, moving and turning with it where they join.
    for (const limb of cut.limbs) {
      const along = -Math.atan2(bodyShift(limb.s + .02) - bodyShift(limb.s - .02), .04 * height);
      drawLimb(limb, limbPose(f, limb), bodyShift(limb.s), along, res);
    }
    // Each strip turns to follow the curve, meeting its neighbours, so the body truly bends.
    const step = height / slices;
    for (let i = 0; i < slices; i++) {
      const strip = cut.strips[i], d0 = bodyShift(i / slices), d1 = bodyShift((i + 1) / slices);
      const mx = (d0 + d1) / 2, my = -height / 2 + (i + .5) * step, turn = -Math.atan2(d1 - d0, step);
      ctx.translate(mx, my); ctx.rotate(turn);
      ctx.drawImage(strip, -width / 2, -step / 2, width, strip.height / res);
      ctx.rotate(-turn); ctx.translate(-mx, -my);
    }
    ctx.restore();
  }

  // Soft shade so the name, score and hint stay readable on a bright picture.
  function readabilityShade() {
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, '#04141ca6'); shade.addColorStop(.13, '#04141c00');
    shade.addColorStop(.87, '#04141c00'); shade.addColorStop(1, '#04141ca6');
    fill(shade);
  }
  function drawPondFallback() {
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
    for (let i = 0; i < 19; i++) {
      const cx = (i * 143 + 70) % 960, cy = (i * 63 + 80) % 520;
      const sweep = Math.sin(state.time * .5 + i) * 12;
      ctx.beginPath(); ctx.ellipse(cx + sweep, cy, 105, 20, .3, 0, TAU);
      ctx.strokeStyle = '#c0ffff10'; ctx.lineWidth = 5; ctx.stroke();
    }
  }

  function drawPond() {
    // The game's default background (Japanese koi), cropped to fit like the game does.
    if (pondPhoto.complete && pondPhoto.naturalWidth) {
      const h = W * pondPhoto.naturalHeight / pondPhoto.naturalWidth;
      ctx.drawImage(pondPhoto, 0, (H - h) / 2, W, h);
    } else drawPondFallback();
    // Fish show only inside the pond, as in the game.
    const t = ctx.getTransform(), res = [1, 1.5, 2, 3].find(r => r >= Math.hypot(t.a, t.b) - .05) || 3;
    ctx.save(); ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); ctx.clip();
    for (const f of state.fish) if (!f.away) drawSwimmer(f, res);
    ctx.restore();
    state.ripples.forEach(r => {
      const p = r.age / 1.55;
      ctx.globalAlpha = 1 - p;
      strokeEllipse(r.x, r.y, 6 + 125 * p, 4 + 55 * p, '#d6ffff', 2.2);
      strokeEllipse(r.x, r.y, 5 + 91 * p, 3 + 41 * p, '#a1e8e9', 1.4);
      ctx.globalAlpha = 1;
    });
    readabilityShade();
    drawEffects();
  }

  /* Ocean Explorer, taken from the game (IAB_OCEAN_EXPLORER_V8_NATURAL): artist swim-cycle
     pictures, each species' own behaviour, smooth 3D body turns, depth-graded water on the
     Tropical Coral Reef. Touching the water makes ripples and bubbles, startles nearby fish
     (the pufferfish puffs up) and drops food that the fish come and eat. */
  const Reef = (() => {
    const DIR = 'assets/ocean/';
    // len: body length as a fraction of the picture height; beat: swim-cycle loops per
    // second at cruising speed. amount: how many swim in this preview (the game starts
    // with none chosen; you pick them in the editor).
    const species = [
      { id: 'clownfish', file: 'clownfish', amount: 5, speed: 48, kind: 'fish', len: .075, beat: 2.6, behave: 'home' },
      { id: 'blueTang', file: 'blue-tang', amount: 4, speed: 55, kind: 'fish', len: .12, beat: 2.0, behave: 'group' },
      { id: 'butterflyfish', file: 'butterflyfish', amount: 3, speed: 44, kind: 'fish', len: .095, beat: 1.8, behave: 'browse' },
      { id: 'moorishIdol', file: 'moorish-idol', amount: 2, speed: 42, kind: 'fish', len: .12, beat: 1.5, behave: 'browse' },
      { id: 'seahorse', file: 'seahorse', amount: 2, speed: 22, kind: 'seahorse', len: .11, beat: 1.4, behave: 'hover' },
      { id: 'angelfish', file: 'angelfish', amount: 2, speed: 38, kind: 'fish', len: .13, beat: 1.4, behave: 'browse' },
      { id: 'lionfish', file: 'lionfish', amount: 1, speed: 20, kind: 'fish', len: .15, beat: .55, behave: 'lurk' },
      { id: 'pufferfish', file: 'pufferfish', amount: 1, speed: 26, kind: 'fish', len: .13, beat: 1.1, behave: 'puffer' },
      { id: 'parrotfish', file: 'parrotfish', amount: 1, speed: 40, kind: 'fish', len: .16, beat: 1.5, behave: 'graze' }
    ];
    const byId = Object.fromEntries(species.map(s => [s.id, s]));
    // Frame layout of each swim-cycle picture (4 x 4 frames).
    const SHEET = {
      clownfish: [200, 106], 'blue-tang': [200, 99], butterflyfish: [200, 132], 'moorish-idol': [200, 144], angelfish: [200, 135],
      seahorse: [106, 200], pufferfish: [200, 169], 'pufferfish-inflated': [200, 169], lionfish: [200, 157], parrotfish: [200, 155]
    };
    const sheets = {};
    for (const file of Object.keys(SHEET)) sheets[file] = artFor('ocean', `${DIR}${file}.webp`);
    const photo = artFor('ocean', `${DIR}tropical-reef.jpg`);
    // Vertical band (fraction of height), cruising speed (body lengths per second),
    // steering agility (1/s), time for a full body turn (s), body thickness / length.
    const BAND = { clownfish: [.55, .88], blueTang: [.2, .75], butterflyfish: [.35, .85], moorishIdol: [.3, .82], seahorse: [.55, .86], angelfish: [.3, .85], lionfish: [.3, .8], pufferfish: [.3, .85], parrotfish: [.5, .88] };
    const CRUISE = { clownfish: 1.1, blueTang: 1.4, butterflyfish: .8, moorishIdol: .75, seahorse: .12, angelfish: .6, lionfish: .18, pufferfish: .45, parrotfish: .85 };
    const AGILITY = { clownfish: 4, blueTang: 2.5, butterflyfish: 3, moorishIdol: 2.5, seahorse: 1.5, angelfish: 2, lionfish: 1, pufferfish: 1.6, parrotfish: 2.2 };
    const TURN = { clownfish: .35, blueTang: .4, butterflyfish: .4, moorishIdol: .5, seahorse: .9, angelfish: .5, lionfish: 1.1, pufferfish: .8, parrotfish: .5 };
    const THICK = { clownfish: .5, blueTang: .35, butterflyfish: .36, moorishIdol: .34, seahorse: .45, angelfish: .36, lionfish: .55, pufferfish: .75, parrotfish: .45 };
    const PITCH = { fish: .35, seahorse: .12 };
    // The reef's water grading: fog colour, tint nearest and per depth band further away,
    // light from above / darkness below, caustic light strength.
    const GRADE = { fog: [24, 120, 165], base: .04, step: .07, top: .10, bottom: .10, caustic: .10 };
    const DEPTH_SHRINK = .42, BANDS = 4;
    // Caustic light texture (tileable), drawn faintly onto the creatures.
    const caustic = document.createElement('canvas'); caustic.width = caustic.height = 256;
    (() => {
      const g = caustic.getContext('2d'), lines = [];
      for (let k = 0; k < 9; k++) lines.push({ base: k * 256 / 9, a: 8 + Math.random() * 10, f: 1 + Math.floor(Math.random() * 3), p: Math.random() * TAU });
      for (const [lw, al] of [[10, .06], [5.5, .12], [2.4, .22]]) {
        g.lineWidth = lw; g.strokeStyle = `rgba(255,255,255,${al})`;
        for (const { base, a, f, p } of lines) for (const off of [-256, 0, 256]) {
          g.beginPath(); for (let x = 0; x <= 256; x += 4) { const y = base + off + Math.sin(x / 256 * TAU * f + p) * a; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          g.beginPath(); for (let y = 0; y <= 256; y += 4) { const x = base + off + Math.sin(y / 256 * TAU * f + p * 1.7) * a; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        }
      }
    })();
    let causticPattern = null;
    let swimmers = [], food = [], bubbles = [], rings = [], now = 0, fed = 0;

    const bodyLength = f => byId[f.id].len * H * (1 - DEPTH_SHRINK * f.z);
    const cruiseSpeed = f => CRUISE[f.id] * bodyLength(f);
    function pickTarget(f) {
      const s = byId[f.id], b = BAND[f.id];
      if (s.behave === 'home') {
        const dart = Math.random() < .18, r = H * (dart ? .16 : .07);
        f.tx = clamp(f.homeX + rand(-r, r), W * .05, W * .95); f.ty = clamp(f.homeY + rand(-r, r) * .6, H * b[0], H * b[1]); if (dart) f.burst = .35; return;
      }
      if (s.behave === 'lurk') {
        if (Math.random() < .3) { f.homeX = clamp(f.homeX + rand(-.18, .18) * W, W * .1, W * .9); f.homeY = clamp(f.homeY + rand(-.1, .1) * H, H * b[0], H * b[1]); }
        f.tx = clamp(f.homeX + rand(-.04, .04) * H, W * .05, W * .95); f.ty = clamp(f.homeY + rand(-.03, .03) * H, H * b[0], H * b[1]); return;
      }
      if (s.behave === 'hover') { f.tx = clamp(f.homeX + rand(-.05, .05) * H, W * .05, W * .95); f.ty = clamp(f.homeY + rand(-.04, .04) * H, H * b[0], H * b[1]); return; }
      // Next point roughly ahead, so creatures travel rather than zig-zag.
      const ahead = Math.sign(f.body || 1) * rand(.25, .6) * W; let tx = f.x + ahead;
      if (tx < W * .08 || tx > W * .92) tx = f.x - ahead * rand(.6, 1);
      f.tx = clamp(tx, W * .08, W * .92); f.ty = H * rand(b[0], b[1]);
    }
    function makeSwimmer(s) {
      const b = BAND[s.id], dir = Math.random() < .5 ? -1 : 1;
      const f = { id: s.id, z: Math.random(), x: W * rand(.1, .9), y: H * rand(b[0], b[1]), vx: 0, vy: 0, body: dir, pitch: 0,
        anim: Math.random() * 16, mode: 'travel', timer: rand(0, 3), tx: 0, ty: 0, burst: 0, phase: Math.random() * TAU };
      f.homeX = f.x; f.homeY = f.y; f.yaw = f.yawT = dir > 0 ? 0 : Math.PI; pickTarget(f); f.vx = dir * cruiseSpeed(f);
      return f;
    }
    function nearestFood(mx, my, f) {
      if (now < (f.fullUntil || 0)) return null;
      let best = null, bd = H * .45;
      for (const q of food) { if (q.eaten || q.life < .3 || now < q.born) continue; const d = Math.hypot(q.x - mx, q.y - my); if (d < bd) { bd = d; best = q; } }
      return best;
    }
    function step(f, dt) {
      const s = byId[f.id], L = bodyLength(f), vc = cruiseSpeed(f), b = BAND[f.id];
      let want = vc, dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy) || 1, ax = 0, ay = 0;
      f.timer -= dt;
      switch (s.behave) {
        case 'home': case 'hover':
          if (f.mode === 'pause') { want = vc * (s.behave === 'hover' ? .15 : .25); if (f.timer <= 0) { f.mode = 'travel'; pickTarget(f); } }
          else if (dist < L * .6) { f.mode = 'pause'; f.timer = rand(.8, 2.4); }
          break;
        case 'browse': case 'graze': case 'puffer':
          if (f.mode === 'pause') { want = vc * .12; if (f.timer <= 0) { f.mode = 'travel'; pickTarget(f); } }
          else if (dist < L * .8) { f.mode = 'pause'; f.timer = s.behave === 'graze' ? rand(2.5, 5) : rand(1.5, 4); }
          if (s.behave === 'puffer') { const tgt = now < (f.puffUntil || 0) ? 1 : 0; f.puff = (f.puff || 0) + (tgt - (f.puff || 0)) * Math.min(1, dt * (tgt ? 3 : .7)); want *= 1 - .75 * f.puff; }
          break;
        case 'lurk':
          // Lionfish hover almost still, fins fanning, then drift slowly to a new spot.
          if (f.mode === 'pause') { want = vc * .08; if (f.timer <= 0) { f.mode = 'travel'; pickTarget(f); } }
          else if (dist < L * .5) { f.mode = 'pause'; f.timer = rand(3, 7); }
          break;
        case 'group': {
          // Blue tangs keep loosely together: cohesion, alignment and separation.
          let n = 0, cx = 0, cy = 0, avx = 0, avy = 0, sx = 0, sy = 0;
          for (const o of swimmers) {
            if (o === f || o.id !== f.id) continue;
            const ox = o.x - f.x, oy = o.y - f.y, d = Math.hypot(ox, oy);
            if (d < L * 4) { n++; cx += o.x; cy += o.y; avx += o.vx; avy += o.vy; if (d < L * 1.3 && d > 0) { sx -= ox / d / d * L; sy -= oy / d / d * L; } }
          }
          if (n) {
            cx /= n; cy /= n; avx /= n; avy /= n;
            ax += (cx - f.x) / (L * 3) * vc * .25 + (avx - f.vx) * .5 + sx * vc * .8;
            ay += (cy - f.y) / (L * 3) * vc * .25 + (avy - f.vy) * .5 + sy * vc * .8;
          }
          if (dist < L * 1.2) pickTarget(f);
          break;
        }
      }
      if (f.burst > 0) { want *= 2.4; f.burst -= dt; }
      // Feeding: unless just startled or already full, head for the nearest food flake and eat it.
      if (s.kind === 'fish' && !(f.burst > 0) && food.length) {
        const dir = f.body >= 0 ? 1 : -1, mx = f.x + dir * L * .42, meal = nearestFood(mx, f.y, f);
        if (meal) {
          dx = meal.x - mx; dy = meal.y - f.y; dist = Math.hypot(dx, dy) || 1; want = vc * clamp(dist / (L * 1.2), .35, 1.5); f.mode = 'travel';
          if (dist < Math.max(L * .12, H * .012)) {
            meal.eaten = true; fed++; updateMetric(); f.fed = (f.fed || 0) + 1; f.tx = f.x; f.ty = f.y;
            if (f.fed >= 3) { f.fed = 0; f.fullUntil = now + rand(9000, 15000); }
          }
        }
      }
      if (dist < L * 2) want *= Math.max(.25, dist / (L * 2));
      // Steer: desired velocity toward the target plus behaviour forces, limited by agility.
      let dvx = dx / dist * want + ax * .5, dvy = dy / dist * want + ay * .5;
      if (f.y < H * b[0]) dvy += vc * .8;
      if (f.y > H * b[1]) dvy -= vc * .8;
      // Fish swim mostly horizontally: limit how steeply they climb or dive.
      const maxV = s.kind === 'seahorse' ? 1 : .45, sp = Math.hypot(dvx, dvy) || 1;
      if (Math.abs(dvy) > sp * maxV) { dvy = Math.sign(dvy) * sp * maxV; dvx = Math.sign(dvx || f.body) * sp * Math.sqrt(1 - maxV * maxV); }
      const ag = Math.min(1, AGILITY[f.id] * dt * (f.burst > 0 ? 2.5 : 1));
      f.vx += (dvx - f.vx) * ag; f.vy += (dvy - f.vy) * ag;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (s.kind === 'seahorse') f.y += Math.sin(now * .0012 + f.phase) * L * .06 * dt;
      f.x = clamp(f.x, -W * .05, W * 1.05); f.y = clamp(f.y, H * .05, H * .95);
      // Turning: the fish yaws round with its head swinging towards the viewer; a turn,
      // once started, is completed. f.body is the cosine of the yaw (+1 right, -1 left).
      const speed = Math.hypot(f.vx, f.vy), right = f.vx > 0;
      if (Math.abs(f.vx) > vc * .25 && (f.yawT === 0) !== right && Math.abs(f.yaw - f.yawT) < 1e-3) f.yawT = right ? 0 : Math.PI;
      const turnStep = dt * Math.PI / TURN[f.id]; f.yaw += clamp(f.yawT - f.yaw, -turnStep, turnStep); f.body = Math.cos(f.yaw);
      const maxPitch = PITCH[s.kind] || .3;
      const targetPitch = s.kind === 'seahorse' ? clamp(Math.abs(f.vx) / (vc * 4 + 1e-6), 0, 1) * maxPitch : clamp(Math.atan2(f.vy, Math.max(Math.abs(f.vx), speed * .3 + 1e-6)), -maxPitch, maxPitch);
      const peck = s.behave === 'graze' && f.mode === 'pause' ? .2 + .08 * Math.max(0, Math.sin(now * .009 + f.phase)) * Math.sin(now * .002 + f.phase) : 0;
      f.pitch += ((peck || targetPitch) - f.pitch) * Math.min(1, dt * 4);
      // Swim cycle runs faster when swimming faster.
      f.anim += dt * 16 * s.beat * clamp(speed / (vc || 1), .35, 2.4) * (f.mode === 'pause' && s.behave !== 'hover' && s.behave !== 'lurk' ? .45 : 1) * (1 - .6 * (f.puff || 0));
    }
    // Each creature is drawn into its own small canvas, graded there with the water
    // (depth tint, light from above, caustics), then placed on screen.
    function drawCreature(f, res) {
      const s = byId[f.id], im = sheets[s.file], [fw, fh] = SHEET[s.file];
      if (!ready(im)) return;
      const a = ((f.anim % 16) + 16) % 16, i0 = Math.floor(a), frac = a - i0, size = bodyLength(f);
      const w = s.kind === 'seahorse' ? size * fw / fh : size, h = s.kind === 'seahorse' ? size : size * fh / fw;
      const r = res * (1 - .45 * f.z), cw = Math.max(2, Math.ceil(w * r)), ch = Math.max(2, Math.ceil(h * r));
      if (!f.cv) { f.cv = document.createElement('canvas'); f.cx = f.cv.getContext('2d'); }
      if (f.cv.width !== cw || f.cv.height !== ch) { f.cv.width = cw; f.cv.height = ch; }
      const g = f.cx, fx = i => (i % 4) * fw, fy = i => Math.floor(i / 4) * fh;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw, ch);
      g.drawImage(im, fx(i0), fy(i0), fw, fh, 0, 0, cw, ch);
      // Seahorses blend neighbouring frames, so their slow cycle flows.
      if (s.kind === 'seahorse' && frac > .02) { g.globalAlpha = frac; g.drawImage(im, fx((i0 + 1) % 16), fy((i0 + 1) % 16), fw, fh, 0, 0, cw, ch); g.globalAlpha = 1; }
      // Pufferfish: cross-fade to the inflated picture.
      const pf = f.puff || 0, puffed = sheets['pufferfish-inflated'];
      if (pf > .01 && ready(puffed)) {
        if (pf > .5) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = (pf - .5) * 2; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'source-over'; }
        g.globalAlpha = Math.min(1, pf * 2); g.drawImage(puffed, fx(i0), fy(i0), fw, fh, 0, 0, cw, ch); g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-atop';
      // Depth tint and light from above / darkness below, in one fill.
      const a1 = Math.min(.85, GRADE.base + GRADE.step * f.z * (BANDS - 1)), yr = f.y / H, fog = GRADE.fog;
      let a2, c2;
      if (yr < .45) { a2 = GRADE.top * (1 - yr / .45); c2 = [255, 255, 255]; } else { a2 = GRADE.bottom * Math.min(1, (yr - .45) / .55); c2 = [0, 10, 25]; }
      const tint = 1 - (1 - a1) * (1 - a2);
      if (tint > .003) {
        const k1 = a1 * (1 - a2) / tint, k2 = a2 / tint; g.globalAlpha = tint;
        g.fillStyle = `rgb(${fog[0] * k1 + c2[0] * k2 | 0},${fog[1] * k1 + c2[1] * k2 | 0},${fog[2] * k1 + c2[2] * k2 | 0})`; g.fillRect(0, 0, cw, ch);
      }
      if (!causticPattern) causticPattern = g.createPattern(caustic, 'repeat');
      g.globalAlpha = GRADE.caustic * (1 - f.z * .6); g.save();
      g.translate(-((f.x * r + now * .012) % 256), -((f.y * r + now * .007) % 256)); g.fillStyle = causticPattern; g.fillRect(0, 0, cw + 512, ch + 512); g.restore();
      // Turning in 3D: narrows only to the body's thickness, the head end swinging towards
      // the viewer grows while the tail shrinks, and the side darkens as it turns away.
      const dir = f.body >= 0 ? 1 : -1, side = Math.sqrt(Math.max(0, 1 - f.body * f.body)), th = THICK[f.id] || .4;
      const wf = Math.sqrt(f.body * f.body + th * th * side * side), persp = .22 * side;
      if (side > .02) { g.globalAlpha = .32 * side; g.fillStyle = 'rgb(0,12,28)'; g.fillRect(0, 0, cw, ch); }
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.pitch * dir); ctx.scale(dir * wf, 1);
      if (persp < .01) ctx.drawImage(f.cv, 0, 0, cw, ch, -w / 2, -h / 2, w, h);
      else {
        const n = 12, sw = cw / n, dw = w / n;
        for (let i = 0; i < n; i++) { const k = 1 + persp * (2 * (i + .5) / n - 1); ctx.drawImage(f.cv, i * sw, 0, sw + .5, ch, -w / 2 + i * dw, -h * k / 2, dw + .6, h * k); }
      }
      ctx.restore();
    }
    // Small fish dart away from a touch; the pufferfish puffs up; the lionfish moves off.
    function startle(x, y) {
      for (const f of swimmers) {
        const s = byId[f.id]; if (s.kind !== 'fish') continue;
        let dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy);
        if (d > H * .22) continue;
        if (d < 1) { dx = 1; dy = 0; d = 1; }
        const vc = cruiseSpeed(f);
        if (s.behave === 'puffer') { f.puffUntil = now + rand(3500, 5000); f.mode = 'pause'; f.timer = 4; continue; }
        if (s.behave === 'lurk') { f.homeX = clamp(f.x + dx / d * W * .12, W * .1, W * .9); f.mode = 'travel'; pickTarget(f); continue; }
        f.vx += dx / d * vc * 3; f.vy += dy / d * vc * 1.5; f.burst = .5; f.mode = 'travel';
        f.tx = clamp(f.x + dx / d * W * .3, W * .08, W * .92); f.ty = clamp(f.y + dy / d * H * .15, H * BAND[f.id][0], H * BAND[f.id][1]);
      }
    }
    function dropFood(x, y) {
      for (let i = 0; i < 8; i++) food.push({ x: x + rand(-1, 1) * H * .025, y: y + rand(-1, 1) * H * .015, born: now + rand(120, 450), eaten: false,
        size: rand(.0045, .0075) * H, rot: rand(0, TAU), spin: rand(-2, 2), hue: rand(18, 38), phase: rand(0, TAU), life: 1, rest: 0 });
      if (food.length > 80) food.splice(0, food.length - 80);
    }
    return {
      get fed() { return fed; },
      init() {
        now = 0; fed = 0; food = []; bubbles = []; rings = [];
        swimmers = species.flatMap(s => Array.from({ length: s.amount }, () => makeSwimmer(s)));
      },
      // The game's touch: ripple, bubbles, startle and food.
      touch(x, y) {
        rings.push({ x, y, r: 7, life: 1, max: 45 });
        for (let i = 0; i < 3; i++) bubbles.push({ x: x + (Math.random() - .5) * 32, y: y + (Math.random() - .5) * 20, r: 2 + Math.random() * 5, vy: .45 + Math.random() * 1.3, life: 1 });
        startle(x, y); dropFood(x, y);
      },
      update(dt) {
        now += dt * 1000;
        const floor = H * .94;
        for (let i = food.length - 1; i >= 0; i--) {
          const q = food[i]; if (now < q.born) continue;
          if (q.eaten) q.life -= dt * 4;
          else if (q.y < floor) { q.y += H * .032 * dt; q.x += Math.sin(now * .0017 + q.phase) * H * .012 * dt; q.rot += q.spin * dt; }
          else { q.rest += dt; if (q.rest > 5) q.life -= dt * .4; }
          if (q.life <= 0) food.splice(i, 1);
        }
        for (const f of swimmers) step(f, dt);
        const f60 = dt * 60;
        for (const b of bubbles) { b.y -= b.vy * f60; b.x += Math.sin(now * .001 + b.y) * .25 * f60; b.life -= .0015 * f60; }
        bubbles = bubbles.filter(b => b.life > 0 && b.y > -10);
        for (const r of rings) { r.r += 1.6 * f60; r.life -= .018 * f60; }
        rings = rings.filter(r => r.life > 0 && r.r <= r.max);
      },
      draw() {
        if (ready(photo)) ctx.drawImage(photo, 0, (H - W * photo.naturalHeight / photo.naturalWidth) / 2, W, W * photo.naturalHeight / photo.naturalWidth);
        else backdrop('#123c5b', '#0a5372', '#071b36');
        for (const q of food) {
          if (now < q.born) continue;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.globalAlpha = Math.max(0, q.life);
          ctx.fillStyle = `hsl(${q.hue},62%,42%)`; ctx.beginPath(); ctx.moveTo(-q.size, -q.size * .45); ctx.lineTo(q.size * .8, -q.size * .6); ctx.lineTo(q.size, q.size * .4); ctx.lineTo(-q.size * .6, q.size * .55); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `hsla(${q.hue + 8},80%,70%,.6)`; ctx.fillRect(-q.size * .4, -q.size * .35, q.size * .7, q.size * .25); ctx.restore();
        }
        const t = ctx.getTransform(), res = Math.min(3, Math.hypot(t.a, t.b));
        // Farthest first.
        for (const f of swimmers.slice().sort((a, b) => b.z - a.z)) drawCreature(f, res);
        ctx.lineWidth = 1.2;
        for (const b of bubbles) { ctx.strokeStyle = `rgba(218,250,255,${b.life * .7})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
        ctx.lineWidth = 2;
        for (const r of rings) { ctx.strokeStyle = `rgba(177,245,255,${r.life * .8})`; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
      }
    };
  })();
  function drawOcean() {
    Reef.draw();
    readabilityShade();
  }

  // Ultimate Shooting Range: the game's starting settings (Target practice, Industrial
  // warehouse, 7 bullseyes, size 95, speed 30, mixed movement, 20 points, 60 seconds).
  const RANGE = { count: 7, size: 95, speed: 30, points: 20, seconds: 60, react: 1.0 };
  const rangePhoto = artFor('range', 'assets/range/warehouse.jpg'), bullseye = artFor('range', 'assets/range/bullseye.png');
  const rangeR = () => H * (.028 + RANGE.size / 4600);
  const RANGE_PATTERNS = ['horizontal', 'vertical', 'zigzag', 'evasive'];
  function makeRangeTarget(i) {
    const y = .20 + .57 * (.5 + .5 * Math.sin(i * 2.39996));
    return {
      x: .15 + .70 * (.5 + .5 * Math.cos(i * 2.39996)), y, homeY: y, dir: i % 2 ? -1 : 1, yDir: i % 2 ? -1 : 1,
      dirX: i % 2 ? -1 : 1, dirY: i % 2 ? -1 : 1, turnIn: .3 + i * .17, phase: i * 2.13,
      pattern: RANGE_PATTERNS[i % RANGE_PATTERNS.length], hitTime: 0, pulse: 0, spawn: 0, swingDir: 1, holes: []
    };
  }
  // The game's four movement patterns, in fractions of the screen.
  function stepRangeTarget(o, dt) {
    o.pulse = Math.max(0, o.pulse - dt); o.spawn = Math.max(0, o.spawn - dt);
    if (o.hitTime > 0) {
      // After swinging, the target is replaced by a fresh one somewhere else.
      o.hitTime = Math.max(0, o.hitTime - dt);
      if (o.hitTime === 0) { o.x = .15 + Math.random() * .70; o.y = o.homeY = .19 + Math.random() * .60; o.phase = Math.random() * TAU; o.holes = []; o.spawn = .35; }
      return;
    }
    const speed = RANGE.speed / 100, v = speed * .9;
    if (o.pattern === 'vertical') {
      o.y += o.yDir * v * .65 * dt;
      if (o.y > .83) { o.y = .83; o.yDir = -1; }
      if (o.y < .16) { o.y = .16; o.yDir = 1; }
    } else if (o.pattern === 'zigzag') {
      o.x += o.dir * v * .66 * dt;
      if (o.x > .88) { o.x = .88; o.dir = -1; }
      if (o.x < .12) { o.x = .12; o.dir = 1; }
      o.phase += dt * (1.2 + speed * 2.3);
      o.y = clamp(o.homeY + Math.sin(o.phase) * (.075 + .085 * speed), .16, .84);
    } else if (o.pattern === 'evasive') {
      o.turnIn -= dt;
      if (o.turnIn <= 0) { const a = Math.random() * TAU; o.dirX = Math.cos(a); o.dirY = Math.sin(a); o.turnIn = .4 + Math.random() * .95; }
      o.x += o.dirX * v * .65 * dt; o.y += o.dirY * v * .51 * dt;
      if (o.x < .12 || o.x > .88) o.dirX *= -1;
      if (o.y < .17 || o.y > .83) o.dirY *= -1;
      o.x = clamp(o.x, .12, .88); o.y = clamp(o.y, .17, .83);
    } else {
      o.x += o.dir * v * dt;
      if (o.x > .88) { o.x = .88; o.dir = -1; }
      if (o.x < .12) { o.x = .12; o.dir = 1; }
    }
  }
  function drawRangeTarget(o) {
    const x = o.x * W, y = o.y * H, r = rangeR(), a = o.hitTime > 0 ? RANGE.react - o.hitTime : -1;
    ctx.save();
    if (a >= 0 && o.hitTime < .25) ctx.globalAlpha = o.hitTime / .25;
    // Cable from the overhead rig.
    ctx.strokeStyle = 'rgba(30,34,40,.85)'; ctx.lineWidth = Math.max(1.5, r * .035);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,220,.35)'; ctx.lineWidth = Math.max(1, r * .012);
    ctx.beginPath(); ctx.moveTo(x + r * .012, 0); ctx.lineTo(x + r * .012, y - r); ctx.stroke();
    ctx.translate(x, y);
    if (o.spawn > 0) { const k = 1 - o.spawn / .35, b = Math.max(.01, 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)); ctx.scale(b, b); }
    // Hit: swing hard on the cable, then settle.
    if (a >= 0) { ctx.translate(0, -r); ctx.rotate(o.swingDir * .55 * Math.exp(-a * 3) * Math.sin(a * 11)); ctx.translate(0, r); }
    // Soft shadow on the wall behind (light from above).
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(r * .1, r * .16, r * 1.02, r, 0, 0, TAU); ctx.fill();
    if (ready(bullseye)) ctx.drawImage(bullseye, -r, -r, 2 * r, 2 * r);
    else for (const [k, c] of [[1, '#dbe6eb'], [.82, '#c82e38'], [.6, '#eef1ea'], [.38, '#cf3644'], [.16, '#f3bd47']]) circle(0, 0, r * k, c);
    // Holes stay in the target until it is replaced.
    for (const [hx, hy] of o.holes) {
      const s = Math.max(2, r * .07);
      circle(hx * r, hy * r, s, 'rgba(15,10,8,.92)');
      strokeEllipse(hx * r, hy * r, s * 1.35, s * 1.35, 'rgba(255,240,215,.55)', Math.max(1, s * .35));
    }
    if (o.pulse > 0) strokeEllipse(0, 0, r + 12 * (o.pulse / .3), r + 12 * (o.pulse / .3), '#e5f4ff', 5);
    ctx.restore();
  }
  function drawRange() {
    if (ready(rangePhoto)) ctx.drawImage(rangePhoto, 0, (H - W * rangePhoto.naturalHeight / rangePhoto.naturalWidth) / 2, W, W * rangePhoto.naturalHeight / rangePhoto.naturalWidth);
    else backdrop('#25192f', '#172c45', '#0a1528');
    state.targets.forEach(drawRangeTarget);
    for (const p of state.sparks) {
      ctx.globalAlpha = Math.min(1, p.life / .4);
      line(p.x, p.y, p.x - p.vx * .018, p.y - p.vy * .018, '#ffd68a', 2);
    }
    ctx.globalAlpha = 1;
    readabilityShade();
    drawEffects();
    if (pointer.active && state.clock > 0) {
      const { x, y } = pointer;
      strokeEllipse(x, y, 22, 22, '#dcfefbb0', 2);
      line(x - 40, y, x - 12, y, '#dcfefbb0', 1.5);
      line(x + 12, y, x + 40, y, '#dcfefbb0', 1.5);
      line(x, y - 40, x, y - 12, '#dcfefbb0', 1.5);
      line(x, y + 12, x, y + 40, '#dcfefbb0', 1.5);
      circle(x, y, 3, '#e8ffff');
    }
    if (state.clock <= 0) {
      fill('#041320c8', 280, 185, 400, 130);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ecfff9'; ctx.font = '900 27px system-ui';
      ctx.fillText(`TIME'S UP · ${state.score} POINTS`, 480, 238);
      ctx.font = '600 15px system-ui'; ctx.fillStyle = '#a8d8d3';
      ctx.fillText(`${state.hits} hits · tap or press Restart to play again`, 480, 270);
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
