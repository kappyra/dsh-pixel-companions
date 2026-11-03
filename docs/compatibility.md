# Compatibility notes

English | [中文](zh/compatibility.md) | [Русский](ru/compatibility.md) | [Tiếng Việt](vi/compatibility.md) | [日本語](ja/compatibility.md) | [한국어](ko/compatibility.md)

The project started as a source-checkout prototype: two workspace packages to copy into a
`deepseek-harness` clone and build with tsdown/tsc. This repository is the **installable
form**, verified against a live Harness installation. The companion was later moved from
the composer dock to the frame-wide overlay and gained draggable placement, six UI
languages, and an optional desktop window; those changes are described below and marked
where they depend on the user's window.

## Verified environment

| Item | Value |
| --- | --- |
| Harness release | `0.2.2-alpha.2` (commit `d21f653`), installed CLI, `web` profile |
| Page React | `18.3.1` (shell vendor bundle, shared module table) |
| Verification | installed through the plugin manager, Client module loaded, slot entry active |

What was actually checked for the installable bundle:

- The package installs into the profile and reports `application: applied`; the bundle is
  appended to `dsh.profile.bundles`.
- The bundle is part of the composed Web boot graph as
  `{"id":"dsh-pixel-companions","immediately":true,...}` and its bundle bytes served over
  `/plugins/??dsh-pixel-companions/client.js&rev=…` match the repository's `client.js`.
- The Client module loads through the module loader, and the live GUI lists both entries
  active: `shell.overlay` → `kappy-pixel-companions` (order 50) and
  `conversation.input.dock` → `kappy-pixel-companions.bridge` (order 80).
- `node tools/build-client.mjs` reproduces the committed `client.js` (about 72 KiB), and
  `npm test` runs 20 tests — 8 scene rules, 8 pure-helper tests (including `clampScale`
  range handling) and 4 translation-completeness tests — all passing.
- The Harness asset route serves the generated sprite references
  (`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`) as
  `200 image/webp` / `image/png`; `src/client/assets.generated.ts` is about 5 KiB.
- Performance/logic checks: `publishFacts` shallow-diffs and skips unchanged snapshots;
  typing refreshes the idle timer at most once every 5 s and never changes the scene; the 1 s clock and the desktop
  probe/heartbeat pause while the tab is hidden and resume on visibility; the answer
  preview is frozen during a run and published once at stop; and the report pill carries
  `role="status"` with `aria-live="polite"`. User activity (drafting, clicking/dragging)
  refreshes the idle timer without changing the scene.
- Size-change performance: both sliders go through `updatePrefsSoon`, coalescing preference
  updates to at most one per animation frame (`requestAnimationFrame`, with a 16 ms timeout
  fallback), while preset and −/+ clicks still apply immediately; `updatePrefs` ignores
  no-op patches; the overlay re-clamps the saved position only when the scaled sprite
  actually leaves the viewport; the scene-preview grid and desktop-preview card are
  memoized; and desktop mirroring is debounced to about 140 ms, so a slider drag posts once
  after the drag settles (scene/look changes still mirror promptly).
- The scene mapping was also evaluated with the page's exact React version (`18.3.1`)
  against real slot prop shapes (idle, running, sending, pending interaction, error, open
  error, tool call, reasoning stream, answer stream); every rule produced the expected
  caption and artwork.
- A headless UI test covers the completion and hover behaviour: a typed draft stays
  `Idle`, a reasoning stream shows `Thinking`, an answer stream shows `Typing`, a running
  tool shows `Working`, a finished turn shows a sticky one-line report whose Details button
  opens the bounded plain-text panel, hovering the companion dismisses the report after the
  320 ms dwell, a new turn re-opens it, and the hover message box sends a message and
  restores the previous draft.
- The v3 artwork was checked headlessly: all 62 sprite files decode at 192×128 RGBA with
  transparency, every animated WebP has at least two frames, and a headless drag test
  shows Deepy switching to `roaming` while dragged and returning to the scene on release
  (Whale Girl is unchanged).
- The optional desktop half was checked headlessly:
  `python3 -m py_compile desktop/companion.py` succeeds,
  `python3 desktop/companion.py --self-test` reports
  `ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks` (scenes
  decoded at 0.5, 1.0 and 2.0 scale); live `curl` checks cover `/health`, CORS preflight,
  `POST /state`, `400` and `404`, and a second instance on the same port exits `1`. A
  roaming switch test passes (`whale: moving→roaming, released→idle; girl: no roaming`).
  The browser payload was verified in a headless React render (`scene=typing` → `success`)
  with no draft or session data in the body.

Marked user-confirmed (they depend on the host window and were not re-verified from this
repository): drag/pointer interaction, overlay placement above every column, settings
panel flipping and clamping, light/dark appearance, and switching through the six UI
languages. Confirm them in your own `dsh web` window; see
[installation.md](installation.md#verify).

## API contract relied on

Confirmed from the installed packages' type declarations:

| Source | Used for |
| --- | --- |
| `shell.overlay` (frame-wide overlay slot) | the companion itself: register `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }`. The overlay layer is click-through; only the companion, its gear button, and the settings panel take pointer events. |
| `conversation.input.dock` (hidden facts bridge) | the only slot that receives per-session props: register `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }`. It renders `null` (no DOM, no layout gap) and only publishes facts. |
| `settings.general.item` (Settings → General list slot) | registers the companion-size row: `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }`. It renders the same slider/presets as the pet popover and edits the shared prefs store; this is the host's standard General-list slot, no new API. |
| Slot owner props `{ session: SessionSnapshot, input: InputState }` | session facts and composer state, received by the hidden bridge |
| companion facts store (`src/client/bridge.ts`) | module-level `CompanionFacts` plus `publishFacts`, `useCompanionFacts`, `useFactsPublisher`, `useDisconnectOnUnmount`; shallow-diffs its snapshot and carries `connected` |
| `useSessionStatus(selector)` over `ReadonlyMap<SessionId, SessionStatus>` | `pendingInteraction` (approval / question); the overlay subscribes too, so a pending approval still shows while the user is on a non-conversation page |
| `SessionSnapshot.running`, `.promptError`, `.lastAgentError`, `.openState`, `.sessionId` | run state, error state |
| `InputState.phase` (`plain` / `adjudicating` / `claimed` / `submitting` / `sending`), `.draft` | submission phase for the brief `typing` scene; the hover message box snapshots `.draft` to restore it after sending |
| `useChat(selector)` → `ChatSnapshot` | live assistant work: `legacy.runningCalls` (tool running) and `legacy.partial.blocks[].kind` `reasoning` / `text` with non-empty `text` (streaming); published as the 1/2/4 `live` bitfield within the same frame |
| `ChatSnapshot.navigation.items()[].response` | one-line completion preview: first non-empty line, markdown markers stripped, ≤ 120 chars; kept sticky in the report row until dismissed or a new turn starts, and falls back to the cleaned detail when empty |
| `ChatSnapshot.legacy.nodes[]` (newest `kind === 'assistant'`) with `blocks[].kind === 'text'` | full settled answer text for the details panel, extracted once per settled assistant node, bounded to 8000 characters (`MAX_DETAIL`), and published as `CompanionFacts.detail`; page-only, never sent over the desktop bridge |
| `inputActions.setDraft(text)` / `inputActions.submit()` | hover message box sends through the composer, then restores the user's previous draft best-effort |
| `localStorage` key `kappy.pixel-companions.ui.v1` | character, `scale` (50–200% at 1% precision; legacy 0.8 / 1 / 1.2 values are accepted and clamped), language, motion, visible, desktop toggle, and the dragged `position: {x, y}` (`null` until the first drag); per browser and per profile, never the Host settings |
| Page `fetch` to the local desktop bridge (`src/client/desktop.ts` → `http://127.0.0.1:37421`) | optional desktop mirror: `GET /health`, `POST /state`, CORS preflight; no new Harness API is used and the desktop half is a standalone Python process, not a plugin |
| `window.__ModuleLoader__.load({ id, factory })`, `factory(require)` returning `{ inject, apply }` | the browser bundle format |
| `require('react')` from the shared module table | React, never bundled |
| `require.asset(reference)` from the module loader, plus `package.json` `"./assets/*": "./assets/*"` | maps the generated content-hashed sprite references to page URLs; `src/client/asset-url.ts` falls back to the raw document-relative reference when the resolver is absent |
| `$PWD/profiles/web/node_modules` bundle resolution and `/plugins/<package>/…` serving | package delivery, including the plugin asset route |

The Chat snapshot fields, navigation response and composer actions are already public slot
props/hooks; the size row uses the host's existing `settings.general.item` list slot; the
asset route uses the module loader's existing `require.asset` and the package `exports` map.
No new Harness API is used, and the 15-scene set is unchanged.

## Bridge → overlay data flow

1. The hidden `conversation.input.dock` entry (`CompanionBridge` in `src/client/Pet.tsx`,
   using `src/client/bridge.ts`) receives the current `SessionSnapshot`, `InputState`, the
   Chat snapshot (live bits, the answer preview and the newest settled assistant node), the
   `useSessionStatus` pending-interaction flag, and the composer actions.
2. It merges them into the module-level companion facts store and notifies subscribers. The
   facts include run start/stop timestamps, the `live` bitfield (1 tool, 2 reasoning,
   4 answer), the one-line `report` and the full `detail`; live bits update within the same
   frame as the Chat snapshot, and `report`/`detail` are frozen while a turn runs and
   published once at stop.
3. The `shell.overlay` component (`Companion`) reads the store through
   `useCompanionFacts()` and also subscribes to `useSessionStatus`, then derives the scene
   with `deriveScene` from `src/client/state.ts`.
4. When the conversation unmounts, the bridge publishes `connected: false` with
   `running: false` and keeps the last facts. The overlay then falls back to
   idle/sleeping behaviour instead of claiming a run state that no session is publishing.
5. No prompt text is read for scene selection and no model call is made; the draft is only
   snapshotted so the hover message box can restore it after sending through the composer.
6. The completion is sticky: `success` and the report row stay until the user hovers the
   companion (a 320 ms dwell) or a new turn starts, and the report falls back to the cleaned
   `detail` when the navigation preview is empty. The Details button opens a viewport-clamped
   `role="dialog"` with the full answer as React-escaped plain text (line breaks preserved,
   capped at 8000 characters), closed by ✕, Escape, or an outside press. The report text
   keeps `role="status"` / `aria-live="polite"` and the button exposes `aria-expanded`.

## Six-language dictionaries

All UI copy lives in `src/client/text.ts`, not in the Host locale files:

- `LANGUAGES` — the six languages and their display labels: English, Русский, 中文,
  Tiếng Việt, 日本語, 한국어.
- `languageFromTag(tag)` — resolves a BCP 47 tag (for example `navigator.language`) to a
  language id and defaults to English.
- `SCENE_LABELS` — one caption per scene in all six languages.
- `UI_TEXT` — every settings and message-box label, including the Reset position, Close,
  and the hover input's placeholder and Send controls.

`locale/*.json` remains the plugin-inventory metadata shown in Settings → Plugins
(`meta.title` / `meta.description`) and now covers the same six languages. Scene captions
and UI copy were reworded for natural, accurate phrasing in all six languages, and the
inventory titles/descriptions were rewritten the same way. Translation completeness is
covered by `tests/text.test.ts`.

## Changes made to the prototype

1. **One installable package instead of two workspace packages.** The `-ui` and
   `-bundle` split only makes sense inside a DSH source checkout; `cordis.patch.yml`,
   `index.js`, `package.json` (`dsh.bundle` + `dsh.client`), and the locale metadata now
   live at the repository root.
2. **A dependency-free build for the committed client bundle.** `tools/build-assets.mjs`
   writes content-hashed asset-route references and `tools/build-client.mjs` bundles the
   TypeScript with esbuild, keeps `react` external, and wraps the result in the
   module-loader registration. The generated `client.js` is committed, so installs need no
   toolchain.
3. **Real theme tokens.** `--dsw-alias-border-l3` and `--dsw-specific-input-major` are not
   shipped tokens; the plugin uses `--dsw-alias-border-l2`,
   `--dsw-alias-bg-layer-1`, `--dsw-alias-bg-overlay`, and
   `--dsw-alias-brand-primary`, each with a literal fallback, so the overlay and its
   panel follow the host theme instead of a hard-coded dark palette.
4. **Frame-wide overlay instead of a composer-dock visual.** The companion moved to
   `shell.overlay` (above every column, on every page). Only the hidden facts bridge stays
   in `conversation.input.dock`, so no layout gap is added to the composer.
5. **Click-through overlay layer.** The overlay layer is `pointer-events: none`; only the
   companion, its gear, and the panel accept pointer input, so the rest of the page keeps
   scrolling and selecting as before.
6. **Drag-anywhere placement.** A small drag threshold separates a drag from a click; the
   position is clamped to the viewport, re-clamped on resize, and stored as
   `position: {x, y}` in `kappy.pixel-companions.ui.v1` (`null` until the first drag, so
   the automatic bottom-right default keeps following resizes until then).
7. **Six UI languages.** `src/client/text.ts` holds the dictionaries and
   `languageFromTag`; the first run follows `navigator.language`, otherwise English. The
   settings panel switches languages live.
8. **Plugin inventory metadata.** `locale/en.json`, `locale/ru.json`, `locale/zh.json`,
   `locale/ja.json`, and the new `locale/vi.json` / `locale/ko.json` carry `meta.title` /
   `meta.description`, and `icon.svg` is exported, so Settings → Plugin list shows the
   plugin by name rather than by package id.
9. **Source-checkout installer removed.** `install-to-dsh.sh` and the
   `packages/experimental/**` tree were dropped; the documented path is the profile
   bundle.
10. **Optional desktop window.** `desktop/companion.py` draws the same sprite in a
    frameless, always-on-top, per-pixel-transparent GTK 3 window and receives presentation
    state from the page over a loopback-only HTTP bridge (`src/client/desktop.ts`). It is
    off by default, carries no prompt/draft/message/session data, and requires no new
    Harness API.
11. **v3 artwork and roaming movement visual.** `assets/` now holds the 30 girl + 30 whale
    sprites (15 scenes each) plus the optional `assets/whale/roaming.{webp,png}` pair.
    While Deepy is dragged — in the overlay or the desktop window — the desk-free
    `roaming` animation replaces the scene so fixed furniture does not travel, and the
    scene returns on release. `roaming` is not a scene: the 15-state machine,
    `deriveScene`, the bridge payload and the desktop protocol are unchanged, and no
    Harness API was added.
12. **Live status, hover message box, sticky completion and details.** The scene now follows
    the assistant's own work — a running tool call, streaming reasoning, streaming answer
    text, or a running turn with no live stream — so `thinking` is never triggered by the
    user drafting. A finished turn is sticky: `success` and the one-line report plus a
    localized **Details** button stay until the user hovers the companion or a new turn
    starts; hovering dismisses them, and Details opens the full answer as bounded plain text.
    The companion also hosts a one-line input that sends through the composer and restores
    the previous draft. The report and the hover message box share one viewport-clamped
    column, with the input directly under the report until the completion is dismissed.
    These use the existing Chat snapshot, composer actions and
    `useSessionStatus` props; no Harness API changed and the 15-scene set is unchanged.
    Scene captions and UI copy were revised in all six languages.
13. **Asset-route delivery and performance pass.** Sprites are no longer embedded: the
    manifest holds `plugins/dsh-pixel-companions/assets/...?v=<sha1-8>` references served
    by the Harness asset route, resolved through `require.asset` with a raw fallback. The
    committed `client.js` drops from about 3.3 MB to about 72 KiB; sprites are fetched per
    scene and cached immutably, with the content hash busting the cache. The bridge
    shallow-diffs its facts, the 1 s clock and desktop probe/heartbeat pause in hidden
    tabs, the answer preview is published once at stop, user activity refreshes the idle timer without changing the scene (typing is throttled to once every 5 s), and the report pill is announced with
    `role="status"` / `aria-live="polite"`. No Harness API was added; the 15-scene set,
    scene rules, hover box, report, desktop bridge and desktop app are unchanged.
14. **Continuous companion sizing.** The browser Size row is a 50–200% range slider in 5%
    steps with −/+ buttons, a live percentage and 50/100/150/200% preset chips (the active
    preset is marked with `aria-pressed`, and the slider stays for fine adjustment); the
    sprite is rendered at its real scaled pixel size (152×98 at 100%, 76×49 at 50%, 304×196
    at 200%), so the hit area, caption and gear, viewport clamping, report/input column
    anchor and details panel all follow it. Stored values accept 1% precision and are
    clamped to 50–200 on load; legacy 0.8 / 1 / 1.2 values keep working, and slider changes
    persist with a 180 ms debounce flushed on unmount. The desktop app accepts `--scale`
    from 0.5 to 2.0 (rounded to 1%) and its Size menu offers 50 / 75 / 100 / 125 / 150 /
    200%. The same size control is also registered in the host's Settings → General list
    (`settings.general.item`, id `pixel-companions-size`, order 40), with a localized
    **Companion size** title and description. Both surfaces use the shared client-local
    prefs store (`src/client/prefs.ts`, `usePrefs` / `updatePrefs`), so a change in either
    place updates the other immediately and persists in the same `localStorage` key with a
    180 ms debounce and a `pagehide` flush. No new Harness API, no protocol or scene changes.

## Known limits

- The committed JS bundle is about 72 KiB. The 62 sprite files (30 girl + 32 whale,
  including the optional roaming pair) are served separately by the plugin asset route and
  cached immutably; `?v=<sha1-8>` busts the cache when a file changes. This keeps boot cheap
  but means the `assets/` tree must ship with the package.
- The scene mapping cannot distinguish "finished" from "stopped/cancelled": the client
  currently exposes `running` as a boolean. The `success` scene therefore means
  "stopped without an error".
- A pending interaction is visible on other pages only because the overlay subscribes to
  `useSessionStatus` itself; the facts bridge is unmounted outside a conversation, and
  the retained facts are flagged `connected: false`.
- The completion is sticky, not timed: the report row and `success` scene stay until the
  user hovers the companion (320 ms dwell) or a new turn starts; hovering the report row
  itself does not dismiss it. An empty answer shows nothing, and the Details button only
  appears when a settled assistant node supplied text. The panel renders plain text only —
  bounded to 8000 characters — and `detail` stays in the page, never crossing the desktop
  bridge. The hover message box needs a mounted conversation and restores the previous draft
  best-effort: if the composer is locked during submission admission, that draft can be
  lost.
- The desktop window cannot be verified without a graphical session: the actual window,
  per-pixel transparency where the Cairo bridge is missing (the opaque fallback is
  expected), always-on-top/drag/menu rendering, and Wayland positioning are unverified
  here. Its bridge requires the page to stay open and both halves to run on the same host;
  it is unauthenticated loopback traffic, so the port must not be exposed.
- A page served over HTTPS usually blocks the loopback bridge as mixed content; use the
  normal `http://127.0.0.1:3080` page.
- Both slot surfaces are wrapped in a React error boundary: a render failure logs
  `[dsh-pixel-companions] surface failed` and renders nothing instead of crashing the slot
  entry, so the rest of the Harness UI keeps working.
- The optional desktop bridge checks that `fetch` exists before probing; a browser without
  it reports **Not running** instead of throwing.
- The companion reacts to what the Web client publishes; a Host that changes
  `SessionSnapshot`, `InputState`, `shell.overlay`, or the slot registration shape would
  need a matching update here. The slots, props, and module format are public plugin
  APIs, so a break is visible in the plugin's own code, not in the Harness UI.
