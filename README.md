# Interactabuild marketing website — interactive demonstrations (v2)

This is a **standalone advertising website** designed to help people understand Interactabuild and, when an approved installer becomes available, **download, install and use the Interactabuild program**.

**Important:** It is not the actual Interactabuild game software. The four browser demonstrations are original, lightweight mouse/touch/keyboard previews, not camera/projector tracking. This package is isolated from the user's existing Interactabuild development servers, files, saved projects and settings.

## Open the website in Linux Mint

1. Extract `Interactabuild_Advertising_Website_v2.zip`.
2. Open `interactabuild-website-v2/index.html` with Firefox (double-click it or choose *Open With → Firefox*).
3. Scroll to **Don't just watch. Try it.** and select one of the four tabs.
4. Use mouse/touch on the scene, or the **Interact** button beneath it. On a focused demo canvas, **Enter** or **Space** performs an assisted interaction. Use tab arrow keys to change the demonstration.

If you want to preview without extracting a ZIP, open `Interactabuild_Website_Interactive_Preview.html` (the single-file preview, with styles and scripts embedded).

Optional: to use a local web server, from the extracted folder run `python3 -m http.server 8080`, then open `http://127.0.0.1:8080`. It never needs to access or alter your Interactabuild servers.

## Interactive demos

- **Ball to Wall:** Mouse/touch/keyboard hits glowing moving targets. Score updates and targets relocate.
- **Fishing Pond:** Tap the water to make ripples, causing koi, goldfish, trout, carp and catfish to swim away. **No score**, per the current Fishing Pond design direction.
- **Ocean Explorer:** A simulated underwater reveal spotlight follows the pointer. Click/tap to open up a wider reveal pulse among animated creatures.
- **Ultimate Shooting Range:** Hit moving bullseyes, track scores, use up 12 shots and reload via the action button. This does not detect real foam darts.

## The website's primary purpose: software downloads

The most prominent journey is: **See the product → Try demos → Get Interactabuild → Download and use it**.

**No official installer has been supplied or verified.** The website intentionally shows "Public download not available yet". It does not pretend to download a program or substitute the demos for the actual application. The provisional first-subscriber target is **2027**, contingent on readiness.

Once a **real, tested and approved** program installer is available, edit `script.js`:

```javascript
const WEBSITE_CONFIG = {
  downloadUrl: 'https://your-official-domain.example/your-real-installer',
  contactEmail: 'your-real-business-email@example.com',
  releaseTarget: '2027'
};
```

Replace both example strings with legitimate addresses you control. The official download link then updates the main button automatically; don't publish a fake link. Before shipping, add clear supported operating system/hardware requirements, installation instructions, safe file hashes/signing where practical, licensing, and a support route. Confirm that the installer works on each advertised platform.

If `downloadUrl` is blank, the button directs visitors to the release enquiry area instead. If `contactEmail` is blank, the enquiry form **does not send or store details**; it only prepares text that can be copied. Set up a genuine destination, and privacy information, before public launch.

## Editable source files

- `index.html` — copy, layout, games, download section, FAQs, early-access copy.
- `styles.css` — dark visual theme and responsive layout.
- `demos.js` — four original HTML5 Canvas browser demonstrations.
- `script.js` — site navigation, hero target demo, download configuration, details dialog and enquiry fallback.
- `assets/favicon.svg` — conceptual site icon.

There are no external JavaScript/CSS dependencies, tracking scripts, browser cookies or backend. The provided interactive preview has all CSS/JavaScript embedded.

## Validation notes

- Chromium headless rendering/interaction tests were performed with scripts injected into an offline page because this environment blocked local page navigation. Desktop (1440px), tablet (768px) and mobile (390px): no uncaught JavaScript errors or horizontal overflow; all four game actions and shooting-range reset passed.
- The page has **not** yet been fully tested in Firefox or WebKit/Safari in this environment. Run those tests before public release, along with real-hosting checks and user acceptance tests.
- Keep the development project and all live game files separate; do not replace the current game dashboard or modify camera/impact APIs with these marketing demos.
