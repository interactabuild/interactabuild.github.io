/*
  INTERACTABUILD WEBSITE CONFIGURATION
  Set contactEmail to an email address you own before publishing.
  Until then, the enquiry form PREPARES a message but DOES NOT send or store anything.
  This website has no external trackers or backend.
*/
const WEBSITE_CONFIG = {
  downloadUrl: '', // add ONLY a verified, official installer URL when a release is ready
  contactEmail: '', // e.g. an email address owned by your business
  releaseTarget: '2027'
};

(() => {
  'use strict';

  const navToggle = document.getElementById('mobile-toggle');
  const nav = document.getElementById('main-nav');
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  }));
  document.getElementById('year').textContent = String(new Date().getFullYear());

  const downloadAction = document.getElementById('download-action');
  const downloadStatus = document.getElementById('download-status');
  if (WEBSITE_CONFIG.downloadUrl.trim()) {
    const proposed = WEBSITE_CONFIG.downloadUrl.trim();
    try {
      const parsed = new URL(proposed, window.location.href);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        downloadAction.href = parsed.href;
        downloadAction.innerHTML = 'Download Interactabuild <span aria-hidden="true">↗</span>';
        downloadStatus.textContent = 'OFFICIAL DOWNLOAD LINK CONFIGURED · CHECK COMPATIBILITY BEFORE INSTALLING';
      }
    } catch { /* no valid installer URL; default to release enquiry */ }
  }

  /* Small self-contained mouse/touch target mini-demo. No camera tracking is claimed. */
  const stage = document.getElementById('demo-targets');
  const scoreReadout = document.getElementById('demo-score');
  const reset = document.getElementById('demo-reset');
  let score = 0;
  const positions = [
    [{ x: 25, y: 37 }, { x: 64, y: 54 }, { x: 47, y: 30 }],
    [{ x: 33, y: 55 }, { x: 70, y: 30 }, { x: 51, y: 60 }],
    [{ x: 63, y: 36 }, { x: 28, y: 61 }, { x: 74, y: 58 }],
    [{ x: 45, y: 57 }, { x: 59, y: 25 }, { x: 24, y: 35 }]
  ];
  const colors = ['aqua', 'orange', 'blue'];
  let step = 0;
  let targets = [];
  const setScore = value => { score = value; scoreReadout.textContent = String(score).padStart(3, '0'); };
  const setPosition = (el, i, n) => {
    const p = positions[n % positions.length][i];
    el.style.left = `calc(${p.x}% - ${i === 0 ? 34 : i === 1 ? 27 : 23}px)`;
    el.style.top = `calc(${p.y}% - ${i === 0 ? 34 : i === 1 ? 27 : 23}px)`;
  };
  const hit = (target, i) => {
    setScore(score + 10);
    const bounds = target.getBoundingClientRect();
    const rootBounds = stage.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2 - rootBounds.left;
    const y = bounds.top + bounds.height / 2 - rootBounds.top;
    const fx = document.createElement('div');
    fx.className = 'hit-fx';
    fx.style.left = `${x - 25}px`;
    fx.style.top = `${y - 25}px`;
    const points = document.createElement('div');
    points.className = 'hit-points';
    points.textContent = '+10';
    points.style.left = `${x}px`;
    points.style.top = `${y}px`;
    stage.append(fx, points);
    setTimeout(() => { fx.remove(); points.remove(); }, 800);
    step += 1;
    setPosition(target, i, step);
  };
  for (let i = 0; i < 3; i++) {
    const target = document.createElement('button');
    target.type = 'button';
    target.className = `game-target ${colors[i]}`;
    target.style.width = `${[68, 54, 46][i]}px`;
    target.setAttribute('aria-label', `Hit target ${i + 1} for 10 points`);
    setPosition(target, i, 0);
    target.addEventListener('click', () => hit(target, i));
    stage.appendChild(target);
    targets.push(target);
  }
  reset.addEventListener('click', () => {
    step = 0;
    setScore(0);
    targets.forEach((t, i) => setPosition(t, i, 0));
  });

  /* Clear previews for each of the four works-in-progress. */
  const experiences = {
    wall: {
      kicker: '01 / ACTION & ENERGY', title: 'Ball to Wall',
      description: 'An energetic arcade-inspired game designed to transform a projected wall into a fast-moving, reactive target field.',
      points: ['Moving targets and visual hit feedback', 'Adjustable game visuals and challenge settings', 'Mouse-based testing and camera-assisted interaction work in progress']
    },
    pond: {
      kicker: '02 / DISCOVERY & WONDER', title: 'Interactive Fishing Pond',
      description: 'A customizable projected pond with colourful fish swimming through the scene. Imagine an aquatic world made for exploration.',
      points: ['Different pond shapes and backgrounds', 'A selection of fish species and individual controls', 'Work toward interactive play with a depth-camera setup']
    },
    ocean: {
      kicker: '03 / UNDERWATER ADVENTURE', title: 'Ocean Explorer',
      description: 'A vibrant underwater environment with sea creatures, customizable scenes and a sense of discovery.',
      points: ['Selectable underwater animals and environments', 'Reveal-the-ocean visual experience concepts', 'Natural swimming and animation under active development']
    },
    range: {
      kicker: '04 / SKILL & PRECISION', title: 'Ultimate Shooting Range',
      description: 'An arcade-style projected target range developed with foam-dart play in mind.',
      points: ['Multiple arcade-style target challenges', 'Mouse and touch preview gameplay', 'Foam-dart camera detection under development']
    }
  };
  const dialog = document.getElementById('experience-dialog');
  let lastButton = null;
  document.querySelectorAll('.open-experience').forEach(button => {
    button.addEventListener('click', () => {
      const game = experiences[button.dataset.game];
      if (!game) return;
      lastButton = button;
      document.getElementById('dialog-kicker').textContent = game.kicker;
      document.getElementById('dialog-title').textContent = game.title;
      document.getElementById('dialog-description').textContent = game.description;
      const list = document.getElementById('dialog-highlights');
      list.replaceChildren();
      game.points.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        list.appendChild(li);
      });
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });
  });
  const closeDialog = () => { dialog.close(); lastButton?.focus(); };
  document.getElementById('dialog-close').addEventListener('click', closeDialog);
  document.getElementById('dialog-cta').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });

  /* Form uses mailto only when configured; it never stores submitted data. */
  const form = document.getElementById('interest-form');
  const message = document.getElementById('form-status');
  const copyButton = document.getElementById('copy-enquiry');
  const submitButton = form.querySelector('button[type=submit]');
  const privacyMessage = form.querySelector('.form-privacy');
  let enquiryText = '';
  if (WEBSITE_CONFIG.contactEmail.trim()) {
    submitButton.innerHTML = 'Open email enquiry <span aria-hidden="true">↗</span>';
    privacyMessage.textContent = 'This opens your email app to send a message. Information is not stored by this website.';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const interest = document.getElementById('interest').value;
    enquiryText = `Hello Interactabuild,\n\nI'd like to register my interest.\n\nName: ${name}\nEmail: ${email}\nInterested in: ${interest}\n\nPlease let me know about future updates.\n`;
    message.hidden = false;
    if (WEBSITE_CONFIG.contactEmail.trim()) {
      const address = WEBSITE_CONFIG.contactEmail.trim();
      const subject = encodeURIComponent('Interactabuild early-access enquiry');
      const body = encodeURIComponent(enquiryText);
      message.textContent = 'Your email application should open with a prepared message. Please send it from there to complete the enquiry.';
      window.location.href = `mailto:${address}?subject=${subject}&body=${body}`;
      copyButton.hidden = false;
    } else {
      message.textContent = 'This is a website prototype. Your details have NOT been sent or saved. The website owner must connect a contact email before publishing. You can copy the prepared enquiry below.';
      copyButton.hidden = false;
    }
  });
  copyButton.addEventListener('click', async () => {
    if (!enquiryText) return;
    try {
      await navigator.clipboard.writeText(enquiryText);
      copyButton.textContent = 'Copied ✓';
    } catch {
      // file:// and some browsers disallow clipboard access. Offer a selectable fallback.
      const box = document.createElement('textarea');
      box.value = enquiryText;
      box.setAttribute('aria-label', 'Prepared enquiry to copy');
      box.style.cssText = 'width:100%;height:140px;margin-top:10px;';
      copyButton.after(box);
      box.focus();
      box.select();
      copyButton.hidden = true;
    }
  });
})();
