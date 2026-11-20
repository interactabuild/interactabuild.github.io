# Interactabuild website

The public website for Interactabuild. Its job: get visitors to **download and use Interactabuild**.

Open `index.html` in any browser to see it. It is plain HTML, CSS and JavaScript, with no
trackers, cookies or server code, so it can go on any web host as it is.

## On launch day: switch on the downloads

Edit the settings at the top of `script.js`:

```javascript
const SITE = {
  launchDate: '2026-12-07',
  version: '0.1.0',
  windows: { url: '', size: '120 MB' },
  linux: { url: '', size: '127 MB' },
  contactEmail: ''
};
```

- **`windows.url` / `linux.url`**: the full `https://` address where each installer is
  hosted. While a url is empty, its buttons say "Available 7 December" and lead to the
  launch-news form. As soon as it is set, every download button on the page uses it, and
  the page changes from "Launching 7 December 2026" to "Out now".
- **`version` / `size`**: update these with each new installer.
- **`contactEmail`**: the address that should receive launch-news sign-ups and questions.
  While it is empty, the form only prepares a message the visitor can copy; nothing is sent.

Only link installers that have passed the installer tests (`release/windows/test_windows.sh`,
`release/linux/test_deb.sh` in the Interactabuild project).

## What's where

| File | What it holds |
|---|---|
| `index.html` | All the words and the page layout |
| `script.js` | The settings above, download buttons, menu and form |
| `demos.js` | The four "try it in your browser" mini games |
| `styles.css` | The site's look (colours, header, hero, demos, FAQ, footer) |
| `site.css` | Games grid, editor, download cards, kit list |
| `assets/screens/` | Real screenshots of the seven games and the editor |
| `assets/fish/` | The real fish pictures used in the pond mini game |
| `assets/artwork.jpg`, `assets/logo.png` | The Interactabuild artwork and logo |

The screenshots come from the Interactabuild program itself. Retake them when a game's look
changes, so the website always shows the real thing.
