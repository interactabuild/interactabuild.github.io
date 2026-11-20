/*
  INTERACTABUILD WEBSITE SETTINGS — the only part you normally need to edit.

  Downloads: put the full https:// address of each installer in `url`. While a url is
  empty, its buttons say "Available February 2027" and lead to the launch-news form instead.
  launchDate: a day ('2027-02-15', shown as "15 February 2027") or just a month ('2027-02',
  shown as "February 2027").
  Contact: put the email address that should receive launch-news sign-ups and questions in
  `contactEmail`. While it is empty, the form only prepares a message the visitor can copy;
  nothing is sent or stored. This website has no trackers, cookies or server code.
*/
const SITE = {
  launchDate: '2027-02',             // shown as "February 2027"
  version: '0.1.0',
  windows: { url: '', size: '120 MB' },  // e.g. 'https://…/Interactabuild-Setup-0.1.0.exe'
  linux: { url: '', size: '127 MB' },    // e.g. 'https://…/interactabuild_0.1.0_amd64.deb'
  contactEmail: 'contactus@interactabuild.com'
};

(() => {
  'use strict';

  /* Always open at the top. Phones remember addresses like /#notify (from tapping a
     button) and restore old scroll positions, which opened the page half way down.
     In-page links still scroll to their section, but no longer change the address. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const openedAtSection = Boolean(location.hash);
  if (openedAtSection) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', () => window.scrollTo(0, 0));
  // Firefox jumps to the old section only after the page has loaded.
  if (openedAtSection) window.addEventListener('load', () => setTimeout(() => window.scrollTo(0, 0), 0));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : document.documentElement;
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // The "skip to content" link also moves keyboard focus, as a normal link would.
    if (link.classList.contains('skip-link')) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

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

  /* Downloads. A button works only once a real https address is set above. */
  const monthOnly = /^\d{4}-\d{2}$/.test(SITE.launchDate);
  const launch = new Date(`${SITE.launchDate}${monthOnly ? '-01' : ''}T00:00:00`);
  const launchText = launch.toLocaleDateString('en-GB', monthOnly ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  const shortLaunch = monthOnly ? launchText : launch.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const safeUrl = value => {
    const text = String(value || '').trim();
    // An empty address would otherwise mean "this page", which on the live site looks
    // like a real https download.
    if (!text) return '';
    try {
      const url = new URL(text, window.location.href);
      return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost') ? url.href : '';
    } catch { return ''; }
  };
  const links = { windows: safeUrl(SITE.windows.url), linux: safeUrl(SITE.linux.url) };
  const anyLive = Boolean(links.windows || links.linux);
  const names = { windows: 'Windows', linux: 'Ubuntu' };

  document.querySelectorAll('[data-download]').forEach(el => {
    const os = el.dataset.download, url = links[os], label = el.querySelector('[data-dl-text]');
    if (url) {
      if (el.tagName === 'A') { el.href = url; el.setAttribute('download', ''); }
      if (label) label.textContent = `Download for ${names[os]}`;
      el.classList.remove('is-waiting');
    } else {
      // Not out yet: send people to the launch-news form instead of a dead link.
      if (el.tagName === 'A') el.href = '#notify';
      if (label) label.textContent = `Available ${shortLaunch}`;
      el.classList.add('is-waiting');
    }
  });
  document.querySelectorAll('[data-dl-size]').forEach(el => { el.textContent = SITE[el.dataset.dlSize].size; });
  document.querySelectorAll('[data-dl-version]').forEach(el => { el.textContent = SITE.version; });
  document.querySelectorAll('[data-dl-meta="windows"]').forEach(el => {
    el.firstChild.textContent = `Windows 11 · 64-bit · ${SITE.windows.size} · `;
  });

  if (anyLive) {
    document.querySelectorAll('[data-release-label]').forEach(el => { el.textContent = `OUT NOW · VERSION ${SITE.version}`; });
    document.querySelectorAll('[data-release-pill]').forEach(el => { el.textContent = `OUT NOW · VERSION ${SITE.version}`; });
    const lead = document.querySelector('[data-release-lead]');
    if (lead) lead.textContent = 'Choose your computer below. Installing takes about a minute.';
    const faq = document.querySelector('[data-release-faq]');
    if (faq) faq.innerHTML = 'Now. <a href="#download">Go to the download.</a>';
  } else {
    document.querySelectorAll('[data-release-label], [data-release-pill]').forEach(el => { el.textContent = `LAUNCHING ${launchText.toUpperCase()}`; });
  }

  /* Launch-news form: opens the visitor's email app when a contact address is set;
     otherwise prepares text to copy. It never stores anything. */
  const form = document.getElementById('interest-form');
  const message = document.getElementById('form-status');
  const copyButton = document.getElementById('copy-enquiry');
  const submitButton = form.querySelector('button[type=submit]');
  const privacyMessage = form.querySelector('.form-privacy');
  const contact = SITE.contactEmail.trim();
  let enquiryText = '';
  if (contact) {
    submitButton.innerHTML = 'Send by email <span aria-hidden="true">↗</span>';
    privacyMessage.textContent = 'This opens your email app with the message ready to send. This website doesn’t store your details.';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const interest = document.getElementById('interest').value;
    enquiryText = `Hello Interactabuild,\n\nPlease keep me posted.\n\nName: ${name}\nEmail: ${email}\nInterested in: ${interest}\n`;
    message.hidden = false;
    copyButton.hidden = false;
    if (contact) {
      const subject = encodeURIComponent('Interactabuild launch news');
      message.textContent = 'Your email app should open with the message ready. Press send there to finish.';
      window.location.href = `mailto:${contact}?subject=${subject}&body=${encodeURIComponent(enquiryText)}`;
    } else {
      message.textContent = 'Sign-ups open soon. Nothing has been sent or saved yet. You can copy your message below.';
    }
  });
  copyButton.addEventListener('click', async () => {
    if (!enquiryText) return;
    try {
      await navigator.clipboard.writeText(enquiryText);
      copyButton.textContent = 'Copied ✓';
    } catch {
      // file:// and some browsers block the clipboard: offer the text to select instead.
      const box = document.createElement('textarea');
      box.value = enquiryText;
      box.setAttribute('aria-label', 'Your message, ready to copy');
      box.style.cssText = 'width:100%;height:140px;margin-top:10px;';
      copyButton.after(box);
      box.focus();
      box.select();
      copyButton.hidden = true;
    }
  });
})();
