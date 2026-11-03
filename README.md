# Pixel Companions for DeepSeek Harness

English | [中文](README.zh.md) | [Русский](README.ru.md) | [Tiếng Việt](README.vi.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

I built Pixel Companions because I wanted my dsh sessions to feel less faceless. It is an
animated pixel companion that floats **above the whole**
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) Web GUI and
follows what the agent is doing: typing, working, waiting for your approval, done,
sleeping. I render it in the frame-wide overlay, so it stays visible on every page — a
conversation, Settings, Plugins — and you can drag it anywhere in the window. I kept it a
normal opt-in dsh **bundle**: no fork of the UI, no patched core, no prompt or response
interception. I'm kappyra, and this is my side project for dsh.

![Preview](demo/preview.webp)

I drew two characters, each with 15 animated scenes:

- **Lumi** — the pixel girl at her workstation.
- **Deepy** — the pixel whale.

**Artwork.** Deepy uses the v3 matte pixel set I picked; Whale Girl keeps the pack's v2
style. All sprites are 192×128 and transparent.

My companion is a browser-side contribution to the official frame-wide `shell.overlay`
slot. A hidden bridge entry in `conversation.input.dock` publishes session facts into the
plugin's own module store, and the overlay reads them. The gear button opens a small
settings popover that I keep in `localStorage` for this browser only (see Configuration).

## Features

- **Floats on every page.** I put the overlay above every column, so the companion stays
  visible in a conversation, Settings, and Plugins — not just next to the composer.
- **Drag anywhere.** Mouse (left button), touch, or pen moves the companion anywhere in
  the window. I added a small drag threshold to separate a drag from a click; the position
  is clamped to the viewport, re-clamped on resize, and persisted across reloads in
  `kappy.pixel-companions.ui.v1` as `position: {x, y}` (`null` until the first drag). Until
  then I place it automatically in the bottom-right above the composer area and follow
  window resizes.
- **Follows the model's own work.** I track a running tool call, streaming reasoning,
  streaming answer text, or a running turn with no live stream — never prompt text, and
  never your own typing. See [docs/scenes.md](docs/scenes.md).
- **Hover message box.** I added a hover message box: hover the companion — or the
  completion report — to type and send a message to the current session; your composer
  draft is restored afterwards. It stacks directly under the report while that is visible
  and moves under the companion once the report is dismissed. It needs an open conversation
  and is hidden while dragging or when the settings panel is open.
- **Sticky completion report.** I made the report sticky: after a turn, the first line of
  the final answer and a **Details** button stay under the companion until you hover the
  companion or a new turn starts. **Details** opens the full answer as plain text in a
  scrollable panel; hovering dismisses the report, and the panel closes with ✕, Escape, or
  an outside press.
- **30 animated WebP scenes** (15 per character) plus still PNGs for motion off; Deepy
  also has a desk-free `roaming` animation while dragged. I serve sprites from the
  plugin's own asset route and fetch them per scene, so the JS bundle stays small.
- **Six UI languages.** I translated the captions and settings labels into English,
  Русский, 中文, Tiếng Việt, 日本語 and 한국어; the first run follows `navigator.language`,
  else English.
- **Self-contained settings.** I keep everything in the pet's gear popover: character, a
  **Size** slider (50–200% in 5% steps with −/+ buttons, a live percentage, and
  50/100/150/200% preset chips), language, motion on/off, visible on/off, Reset position,
  a 15-scene manual preview grid, Auto, and Close. The same Size control is also registered
  in **Settings → General → Companion size**. I render the companion at its real scaled
  pixel size (152×98 at 100%), so its hit area, caption/gear, report/input column and
  details panel follow the chosen size.
- **Optional desktop window.** I also built a small companion that can run outside the
  browser in a frameless, always-on-top Python window on the same machine, fed by a
  localhost-only bridge; the settings row previews it and warns with the start command
  when it is not running. Off by default. See [docs/desktop.md](docs/desktop.md).
- **Safe by construction.** I made the overlay layer click-through; only the companion,
  its gear, and the panel take pointer events. The plugin owns no Host code, makes no
  network calls beyond its own asset route and the opt-in localhost desktop bridge, and
  reads only public slot props.
- **Opt-in and reversible.** Disable my plugin in Settings → Plugins or remove the bundle;
  the UI returns to stock.

## Requirements

- A dsh Web profile (`dsh web`) — I target the official Web client only.
- `pnpm` on `PATH`, because `dsh plugin` forwards package operations to pnpm.
- Node.js 22.6+ only to rebuild from source; the installed package already contains `client.js`.

## Install

I ship the package as a prebuilt bundle: `client.js` and the artwork under `assets/` are
committed, so installing needs no build step.

### From a local checkout

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

`link:` keeps the profile pointed at your working copy, so later edits under `assets/`
or `src/` (followed by `npm run build`) are served immediately.

### From a Git address or a tarball

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or, after `npm pack` in the checkout:
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Then **reload the Web page**. Adding a bundle enables it in the profile; the companion
appears near the bottom-right on every page — conversation, Settings, Plugins — and
survives page navigation. The client HMR transport usually swaps the bundle in within a
second or two anyway; a reload is safe.

Full flow (Plugins page, enabling, disabling, uninstalling, troubleshooting):
[docs/installation.md](docs/installation.md). Day-to-day use — dragging, the hover message
box, the sticky report and its details, sizing, languages and the desktop window — is in
[docs/usage.md](docs/usage.md).

## Configuration

I keep all settings in the panel opened from the companion or its gear button (⚙):

| Control | What it does | Stored as |
| --- | --- | --- |
| Character | Lumi or Deepy | `kappy.pixel-companions.ui.v1` |
| Size | 50–200% slider in 5% steps, with −/+ buttons, a live readout and 50/100/150/200% preset chips; the sprite renders at real pixel size | same key |
| Companion size (Settings → General) | The same slider, −/+ buttons, readout and presets as the gear popover; both edit the shared preference and stay in sync | same key |
| Language | English, Русский, 中文, Tiếng Việt, 日本語, 한국어 | same key |
| Motion | Animated WebP or a still PNG | same key |
| Visible | Show or hide the companion | same key |
| Desktop window | Mirror the scene into the optional desktop window; status Off / Not running / Connected | same key |
| Reset position | Return the companion to its automatic bottom-right default | same key |
| Test scene | Force any of the 15 scenes, or return to automatic (**Auto**) | session state only |
| Close | Close the panel; **Escape** or an outside click also closes it | — |

I anchor the panel to the companion, flip it above or below automatically, and clamp it to
the viewport. Preferences and the dragged position are per browser and per profile, never
written to the Host settings service; the plugin adds no separate Settings page — its size
row appears in Settings → General.

## Desktop window (optional)

I also built the same companion as a desktop window: it can run outside the browser in a
frameless, always-on-top, per-pixel-transparent window on the same machine. It is off by
default.

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

Tick **Desktop window** in the gear panel; the row shows **Connected**, **Not running**, or
**Off**. Only the scene id, character, scale, and motion flag cross the localhost bridge —
no prompt text, draft, messages, session ids, file paths, or model output. See
[docs/desktop.md](docs/desktop.md).

## Scenes

| Observed signal | Scene | Honest meaning |
| --- | --- | --- |
| Prompt submitted (`input.phase` = sending/submitting/adjudicating) | `typing` | The message is being submitted |
| A tool call is running | `working` | A tool is executing |
| Assistant streaming reasoning | `thinking` | The model is reasoning |
| Assistant streaming answer text | `typing` | The model is writing the answer |
| Turn running, no live stream (request in flight) | `thinking` | Waiting on the model |
| Running > 75 s with no live signal | `tired` | Long task, not model fatigue |
| Running > 180 s with no live signal | `coffee` | Cosmetic only |
| Pending approval / question | `waiting` | Waits for you |
| `promptError`, `lastAgentError`, or `openState = error` | `error` | A real error signal |
| Running → stopped without an error | `success` (sticky) | Stays with the report until you hover the companion or a new turn starts; may include cancellation |
| No activity for 110 s | `sleeping` | Display-only idle timer |
| Otherwise | `idle` | — |

I made the rules language-independent; only the captions under the companion are localized.
`thinking` means the assistant is reasoning — drafting a message in the composer changes
nothing. `planning`, `reading`, `searching`, `debugging`, and `offline` are
**manual-preview only** until the client exposes typed signals for them; the plugin never
guesses them from prompt words. Full rules: [docs/scenes.md](docs/scenes.md).

## Compatibility

I verified it against a live dsh `0.2.2-alpha.2` Web profile: the bundle installs, the
Client module loads through the Harness module loader, the entries register in
`shell.overlay` (companion) and `conversation.input.dock` (hidden bridge), the served
bundle bytes match the repository, and the component renders with the real slot props.
[docs/compatibility.md](docs/compatibility.md) lists the exact APIs, the bridge → overlay
data flow, the six-language dictionaries, and the optional desktop bridge. Visual checks
(light/dark, drag feel, exact placement) are yours to confirm.

## Development

```sh
npm install            # esbuild, dev-only
npm run build          # build the asset manifest, then bundle client.js
npm test               # unit tests (Node 22.6+)
```

Browser code: `src/client/bridge.ts` (facts store), `Pet.tsx` (overlay, drag and roaming,
hidden bridge, hover box, report), `state.ts` (scene rules), `signals.ts` and `asset-url.ts`
(pure helpers and asset-route resolution), `text.ts` (six languages), `desktop.ts` (optional
desktop bridge). I documented the pipeline, packaging and layout in
[docs/development.md](docs/development.md).

## License and assets

- I release the **plugin code under MIT** — see [LICENSE](LICENSE).
- I created the **mascot artwork** in `assets/`, `source-art/`, `demo/`, and the copies the
  plugin serves for this project; it ships with the project. It is not covered by the MIT
  grant on the code, and I retain its rights. See [ASSETS_NOTICE.md](ASSETS_NOTICE.md).
- DeepSeek and DeepSeek Harness are trademarks of their respective owner. This is an
  unofficial community plugin, not affiliated with or endorsed by DeepSeek. It only uses
  the public plugin APIs documented by the Harness.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No companion anywhere | Settings → Plugins: is the bundle enabled? Reload the page. An open conversation is not required. |
| Companion visible but frozen | The still PNG may be selected (motion off) or the OS asks for reduced motion. |
| Companion does not move when dragged | Move a few pixels before releasing (there is a drag threshold), and drag the sprite itself, not the empty overlay. |
| Companion off-screen after resizing or changing monitors | Gear → **Reset position**; it returns to the automatic bottom-right default. |
| Sprite is too big or too small | Click a **50/100/150/200%** preset chip or drag the **Size** slider (50–200%) in the gear popover or in Settings → General → **Companion size**; the saved position re-clamps automatically, and **Reset position** restores the automatic bottom-right spot. |
| Cannot find the size control | It is in **Settings → General → Companion size** and in the companion's ⚙ popover; both edit the same preference. If neither appears, a hard reload is needed (the page is running an old client bundle). |
| Wrong language | Gear → **Language**. The first run follows the browser language; otherwise it is English. |
| Settings popover clipped | The panel flips and is clamped to the viewport; **Reset position**, then report the window size. |
| Desktop window stays offline or is an opaque box | Page open and **Desktop window** ticked; install `python3-cairo` for transparency; check `curl http://127.0.0.1:37421/health`. See [docs/desktop.md](docs/desktop.md). |
| Sprites are stale or 404 after changing the artwork | Run `npm run build` — the `?v=` content hash is part of each sprite URL — then reload the page. |
| `client.js` failed to load | The profile must serve the package; run `dsh plugin --profile web add` again and check the pnpm log under `$DSH_HOME/profiles/web/.plugin-manager/logs/`. |

More in [docs/troubleshooting.md](docs/troubleshooting.md).
