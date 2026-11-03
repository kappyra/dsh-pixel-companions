# Development

English | [中文](zh/development.md) | [Русский](ru/development.md) | [Tiếng Việt](vi/development.md) | [日本語](ja/development.md) | [한국어](ko/development.md)

## Layout

```text
package.json              bundle manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml          inserts the ui-pixel-companions row
index.js                  Host half (empty apply; the Client module does the work)
client.js                 generated browser bundle (committed, ~72 KiB)
icon.svg                  plugin inventory icon
locale/*.json             meta.title / meta.description, six languages
src/client/index.ts       registers the slot entries (overlay, bridge, Settings row)
src/client/Pet.tsx        exports Companion (draggable overlay, settings panel)
                          and CompanionBridge (hidden composer-slot entry)
src/client/bridge.ts      companion facts store and publisher/subscriber hooks
src/client/prefs.ts       shared client-local preferences store (usePrefs/updatePrefs/updatePrefsSoon)
src/client/SizeSettingsRow.tsx  Settings → General companion-size row
src/client/signals.ts     pure projections: live bits, streams, report/detail text, scale clamp
src/client/asset-url.ts   resolves asset-route references through require.asset
src/client/state.ts       SCENES + deriveScene + observed-fact types
src/client/text.ts        LANGUAGES, SCENE_LABELS, UI_TEXT, languageFromTag
src/client/desktop.ts     optional localhost bridge to the desktop window
src/client/assets.generated.ts  generated asset-route refs (committed, ~5 KiB)
assets/girl/*.webp|png    canonical art (pack v2 style, 15 scenes)
assets/whale/*.webp|png   canonical v3 matte art (15 scenes)
assets/whale/roaming.*    optional desk-free movement asset for Deepy
source-art/*.gif          pre-v3 sources for tools/build_assets.py (do not rerun)
tools/build-assets.mjs    assets/ -> content-hashed refs in assets.generated.ts
tools/build-client.mjs    src/client/index.ts -> client.js
tools/build_assets.py     legacy pre-v3 generator (see the caution below)
tests/state.test.ts       scene rules (8 tests)
tests/signals.test.ts     live bits, streams, report/detail helpers, scale clamp (8 tests)
tests/text.test.ts        translation completeness (4 tests)
demo/                     offline preview page and stills (regenerated from v3 art)
desktop/companion.py      standalone GTK 3 desktop window + localhost bridge
desktop/requirements.txt  PyGObject>=3.42, Pillow>=10
desktop/run.sh            launcher (python3 desktop/companion.py)
desktop/README.md         short desktop quickstart
```

## Commands

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build` is two steps, and each runs alone:

- `node tools/build-assets.mjs` scans `assets/` and rewrites
  `src/client/assets.generated.ts` (about 5 KiB) with plugin asset-route references of the
  form `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`.
  The query is the first 8 hex characters of the file's SHA-1, so a changed sprite gets a
  new URL. It fails if a character/scene lacks either a `.webp` or a `.png`.
- `node tools/build-client.mjs` bundles the TypeScript with esbuild, keeps `react`
  external, wraps the output in
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })`, and writes
  `client.js` (about 72 KiB). esbuild's `--check` (`node --check`) parse is part of the
  build.

`npm run assets` is the first step alone; use it when you only need refreshed references.

## How the browser bundle is shaped

The Harness loads every browser plugin through the page's module loader:

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

Because of that, `react` is never bundled: the compiled code calls
`require('react')`, which the loader answers from the shell's vendor bundle (React 18.3.1
in the verified release). Bundling a second React would break hooks.

## How sprites are delivered

Sprites are **not embedded** in the bundle. `package.json` exports `"./assets/*": "./assets/*"`,
so the Harness asset route serves the package's own artwork at
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`.

- `src/client/assets.generated.ts` holds those references, not image bytes.
- `src/client/asset-url.ts` resolves one reference through the loader's `require.asset(...)`
  helper when it exists, and falls back to the raw document-relative reference otherwise.
- The browser fetches a sprite on demand for the current character/scene (and for the other
  scene when it changes), instead of parsing 62 embedded images at boot.
- Each URL is immutable for its content hash, so the browser can cache it long-term; the
  `?v=<sha1-8>` query busts that cache whenever the file changes.

The committed JS bundle stays about 72 KiB; the artwork ships as ordinary files under
`assets/`. Running `npm run build` after an artwork change is what updates the manifest and
the bundle.

## How the slot entries work

`src/client/index.ts` injects three entries:

| Slot | Entry | Registration |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge` (renders `null`) | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion` (the draggable overlay) | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow` (Settings → General) | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock` is the only slot that receives the per-session `SessionSnapshot`,
`InputState`, the Chat snapshot and the composer actions, so `CompanionBridge` publishes
those facts (plus the `useSessionStatus` pending-interaction flag) into the module store in
`src/client/bridge.ts`. The bridge shallow-diffs its facts and publishes only when a field
changes; user activity such as typing refreshes the idle timer (at most once every 5 s for draft typing) without changing the scene.
It also extracts the full settled answer once per settled assistant node into
`CompanionFacts.detail` (bounded to 8000 characters) and freezes both `report` and `detail`
while a turn runs, publishing them at stop; `detail` stays in the page and is never sent
over the desktop bridge. When it unmounts, `useDisconnectOnUnmount` publishes
`connected: false` and keeps the last facts; the overlay then falls back to idle/sleeping
behaviour.

`shell.overlay` is frame-wide, so `Companion` can float above every column on every page.
It reads the store through `useCompanionFacts()`, also subscribes to `useSessionStatus`
(so a pending approval is still visible outside a conversation), derives the scene with
`deriveScene`, and draws the sprite at the dragged position. The overlay layer is
click-through; only the sprite, its gear button, and the settings panel take pointer events.
The 1 s clock and the desktop health probe/heartbeat pause while the tab is hidden, and the
completion report is announced with `role="status"` / `aria-live="polite"`.

`settings.general.item` is the host's standard General-settings list. `SizeSettingsRow`
renders only the companion-size controls (title, description, slider, −/+ buttons, live
readout and 50/100/150/200% presets). It shares `src/client/prefs.ts`
(`usePrefs` / `updatePrefs` / `updatePrefsSoon`) with the pet popover, so either surface
updates the other immediately and both persist to `localStorage` under
`kappy.pixel-companions.ui.v1` with a 180 ms debounce and a `pagehide` flush.

High-frequency slider drags call `updatePrefsSoon`, which coalesces updates to at most one
per animation frame (`requestAnimationFrame`, 16 ms timeout fallback); preset and −/+ clicks
use `updatePrefs`, which skips no-op patches. The overlay re-clamps the saved position only
when the scaled sprite actually leaves the viewport, the scene-preview grid and
desktop-preview card are wrapped in `React.memo`, and desktop mirroring is debounced to
about 140 ms.

## Editing behaviour

- Scene rules: `src/client/state.ts`, tests in `tests/state.test.ts`.
- Pure Chat snapshot/report projections: `src/client/signals.ts`, tests in
  `tests/signals.test.ts`.
- Captions, settings copy, and the six-language list: `src/client/text.ts`, tests in
  `tests/text.test.ts`.
- Overlay markup, pointer dragging, settings panel, styles: `src/client/Pet.tsx`.
- Facts store, draft diffing and the bridge lifecycle: `src/client/bridge.ts`.
- Shared client-local preferences (`usePrefs` / `updatePrefs` / `updatePrefsSoon`):
  `src/client/prefs.ts`.
- Settings → General size row: `src/client/SizeSettingsRow.tsx`.
- Asset-route resolution: `src/client/asset-url.ts`.
- Optional desktop bridge (`useDesktopBridge`, port, probe/heartbeat timings):
  `src/client/desktop.ts`.
- Desktop window, right-click menu, prefs and the HTTP bridge: `desktop/companion.py`.
- Slot registration and the module id: `src/client/index.ts`.

After a change: `npm run build`, then reload the page. If the profile uses a `link:`
install, the rebuilt `client.js` is served directly and the HMR transport swaps it in.
Preferences and the dragged `position` live in `localStorage` under
`kappy.pixel-companions.ui.v1`; clear that key to reproduce a first-run state. When
`position` is `null` the automatic spot is the bottom-right, 96 px from the right and
150 px from the bottom window edges, and it is re-clamped on resize; **Reset position**
sets `position` back to `null`.

## Editing artwork

`assets/` is canonical and currently holds the v3 artwork update: 15 scene sprites per
character (animated WebP + still PNG, 192×128 RGBA with transparency) plus the optional
`assets/whale/roaming.{webp,png}` movement visual for Deepy. Regenerate the manifest and
bundle only through the normal build:

1. Replace or add `assets/<character>/<scene>.webp` (animated) and
   `assets/<character>/<scene>.png` (still), both 192×128 with a transparent background.
2. Run `npm run build` — `tools/build-assets.mjs` rewrites the content-hashed references
   and `tools/build-client.mjs` rebuilds `client.js`.
3. Commit `assets/`, the regenerated `src/client/assets.generated.ts`, and `client.js`.

Do not hand-edit `src/client/assets.generated.ts` or `client.js`; the build owns them.

Because sprites are served by the asset route rather than embedded, the committed
`client.js` stays about 72 KiB; the images are fetched per scene from the package and cached
immutably. The `?v=<sha1-8>` hash changes with the file content, so browsers pick up new
artwork without a rename.

**Caution:** `tools/build_assets.py` and the eight GIFs in `source-art/` reproduce the
**earlier, pre-v3** artwork generation. `assets/` is canonical after the v3 update, so
running that generator would revert the art. Do not run it unless you intend to revert;
normal changes go through `npm run build` only.

## Tests

`npm test` runs every `tests/*.test.ts` with Node's test runner:

- `tests/state.test.ts` — 8 tests for `deriveScene` and the scene rules.
- `tests/signals.test.ts` — 8 tests for `liveBits`, `streamOf`, `cleanReport`,
  `lastResponse`, `lastAssistantNode`, `assistantText`, the `MAX_DETAIL` bound and
  `clampScale` range handling.
- `tests/text.test.ts` — 4 tests: every scene captioned in all six languages, every UI
  string present in all six languages, captions distinct per scene, and `languageFromTag`
  mapping/fallback.

That is 20 tests in total. The desktop half keeps its own headless `--self-test` (92
animated decodes at 0.5, 1.0 and 2.0 scale, 31 still decodes, 260 checks).

## Packaging

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files` includes the built `client.js`, `assets/`, sources, tools, demo, desktop, docs
(English and `docs/zh/`), `README.md`, `README.zh.md`, and the six `locale/*.json` files;
it does not include `source-art/`, `node_modules/`, or tests-only artifacts. The `assets/`
tree must ship: the asset route serves it from the installed package. The tarball installs
with `dsh plugin --profile web add <tgz>`.

## Release checklist

1. `npm run build` and `npm test` (20 tests).
2. `python3 -m py_compile desktop/companion.py` and
   `python3 desktop/companion.py --self-test`.
3. `npm pack --dry-run`: `client.js`, `assets/**`, `locale/*.json` (six languages),
   `icon.svg`, `README.md`, `README.zh.md`, `docs/**`, `desktop/**`, `LICENSE`,
   `ASSETS_NOTICE.md` present.
4. Install the tarball or a `link:` checkout into a `web` profile and reload. Confirm the
   companion appears on a conversation page, in Settings, and on the Plugins page, and
   that its sprites load from the asset route (no 404s in the network panel).
5. Drag the companion, reload the page, and confirm the position is restored; resize the
   window and confirm it stays clamped; use **Reset position**.
6. Open the settings panel and check the six languages, motion on/off, visible on/off,
   the Size slider and the 50/100/150/200% preset chips, the 15-scene preview,
   Escape-to-close, and both theme modes. Open **Settings → General** and confirm the
   **Companion size** row shows the same control and stays in sync with the popover.
7. Optional desktop window: run `python3 desktop/companion.py`, tick **Desktop window**,
   confirm the row reads **Connected**, the window mirrors the scene, and the right-click
   menu (character, motion, size, always on top, reset, hide, quit) works.
8. Bump `version` in `package.json`; commit `package.json`, the regenerated `client.js`,
   `src/client/assets.generated.ts`, and any changed docs with it.
