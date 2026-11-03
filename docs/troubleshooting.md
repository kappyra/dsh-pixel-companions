# Troubleshooting

English | [中文](zh/troubleshooting.md) | [Русский](ru/troubleshooting.md) | [Tiếng Việt](vi/troubleshooting.md) | [日本語](ja/troubleshooting.md) | [한국어](ko/troubleshooting.md)

## The companion is missing

1. **Is the bundle enabled?** Settings → Plugins → Plugin list. The entry is named
   *Pixel companions*. If it shows `disabled`, enable it.
2. **Is it hidden?** The settings panel has a **Visible** switch. When it is off, only a
   small 🐳 button stays at the companion's position; click it to bring the companion
   back.
3. **Reload the page.** A newly installed bundle is usually hot-swapped within a second
   or two, but a reload is always safe. The companion renders in the frame-wide overlay,
   so an open conversation is not required: it appears on every page, including Settings
   and Plugins.
4. **Restart the Host.** `Ctrl+C` the `dsh web` process and start it again; a
   `package.json` change (for example a version bump) needs a restart.
5. **Check the profile.** `dsh --profile web --dump-config` should list a row named
   `dsh-pixel-companions`. If it is absent, the bundle was not enrolled: run
   `dsh plugin --profile web add link:"$PWD"` again.

## The companion is visible but frozen

- **Motion is off** in the settings panel, or the OS requests reduced motion
  (`prefers-reduced-motion: reduce`). Both draw the still PNG by design.
- The scene itself may be a still-looking scene (`sleeping`, `waiting`); check the
  caption above the sprite.

## The companion does not move when dragged

- Drag the **sprite itself** (or the 🐳 button when the companion is hidden), not the
  empty space around it; the overlay layer is click-through by design.
- Press and move more than the 3-pixel drag threshold before releasing. A shorter press is
  treated as a click and opens the settings panel instead.
- Mouse, touch, and pen all work; a secondary mouse button does not start a drag.
- If the position is stale or the pointer seems stuck, open the gear and choose
  **Reset position**, then try again.

## The companion is too big or too small

Open **Settings → General → Companion size**, or the companion's ⚙ popover; both show the
same control and edit the same preference. The fastest fix is one of the
**50/100/150/200%** preset chips under the Size row; for fine adjustment use the **Size**
slider (50–200%, 5% steps, with −/+ buttons and a live percentage). The sprite renders at
its real scaled pixel size, so the hit area, caption/gear, report/input column and details
panel follow it. The saved position re-clamps automatically when the size changes;
**Reset position** restores the automatic bottom-right spot if the companion ends up
somewhere awkward. If neither control appears, the page is running an old client bundle —
hard-reload it (and restart `dsh web` if the bundle was just updated).

## The hover message box does not appear

The one-line input opens on mouse hover over the companion only when a conversation is
mounted, the composer is available, and the companion is visible. It is hidden while you
drag the companion or while the settings panel is open, and it does not open on touch
devices. Move the pointer onto the sprite and keep it there; the box sits below (or above)
the companion and is clamped to the viewport. While the completion report is visible, the
input sits in the same clamped column directly under the report: hovering the report reveals
it and keeps the report open, while the report row and its **Details** button do not open the
message box by themselves. Hovering the sprite starts the 320 ms dwell that dismisses a
sticky completion; after dismissal the input moves back under the companion. Leaving the
report hides the input again, and the report stays until the sprite is hovered or a new turn
starts.

## The message box swallowed my draft

The box sends through the composer (`setDraft` + `submit`) and then restores your previous
composer draft right after queueing the message. If the composer is locked in a submission
or admission phase at that moment, the restore can fail and the draft can be lost; an empty
draft is simply left empty. Retype the draft if needed; sending from the box does not
change the session history.

## The completion report is missing

The report is sticky: after a successful turn, the one-line preview (first non-empty line,
≤ 120 characters, markdown markers stripped) stays until you hover the companion or a new
turn starts. A 320 ms hover dwell dismisses it; hovering the report row itself does not.
Once dismissed, the next finished turn re-opens it. An empty answer shows nothing, and the
**Details** button only appears when a settled assistant answer supplied text; when it is
present, it opens the full answer as capped plain text.

## The companion is off-screen after changing the monitor or window size

The position is clamped to the viewport and re-clamped on resize, but a saved position can
still be awkward after a monitor change, a zoom change, or a very small window. Open the
gear and choose **Reset position**; the companion returns to its automatic bottom-right
spot and starts following window resizes again. Clearing the `position` field in
`localStorage` has the same effect.

## The settings panel is clipped or opens off screen

The panel is anchored to the companion, flips above or below it depending on the available
room, and is clamped to the viewport:

- If the companion sits in a corner, drag it towards the middle before opening the panel.
- **Reset position** returns it to the default spot.
- In an unusually small window the panel scrolls; resize the window or report the size if
  it is still unusable.

## Sprites are stale or 404 after changing the artwork

Sprite URLs include a content hash (`?v=<sha1-8>`), and the manifest is generated at build
time. After replacing files under `assets/`, run `npm run build` so
`src/client/assets.generated.ts` and `client.js` are regenerated, then reload the page. If
old art still appears, do a hard reload to drop the cached document. A 404 means the
installed package no longer contains the `assets/` tree — reinstall the bundle.

## The desktop window does not open

The desktop app is a separate Python process, not part of the bundle. Start it from the
checkout with `python3 desktop/companion.py` (or `./desktop/run.sh`).

- **No display.** The window needs X11 or Wayland. On a server, use `ssh -X`, a Wayland
  session with XWayland, or a virtual display; a plain WSL host needs an X server. Run
  `python3 desktop/companion.py --self-test` to check everything that does not need a
  screen.
- **Port already in use.** `cannot listen on 127.0.0.1:37421` means another companion
  instance is running. Quit it; the page always probes 37421, so keeping the default port
  is easiest.
- **Missing GTK or Pillow.** The script exits with a PyGObject/GTK message or a Pillow
  `ImportError`: install `python3-gi gir1.2-gtk-3.0` and
  `python3 -m pip install --user Pillow`.

## The desktop window is an opaque dark box

Without the Cairo bindings or a compositing window manager, the window draws the sprite on
a solid dark background by design. Install `python3-cairo`, use a compositing WM/session,
and restart the window.

## The desktop window stays `offline`

- The page must stay open and **Desktop window** must be ticked in the gear panel; the row
  shows **Off**, **Not running**, or **Connected**. When it is on, the preview card under
  the row repeats the state and names the start command, and hovering the row gives the
  same hint.
- Check the bridge: `curl http://127.0.0.1:37421/health` should return
  `{"ok":true,"v":1}`. If it fails, the window is not running or another process owns the
  port.
- The page and the window must run on the same machine; the bridge is loopback-only.
- A page served over HTTPS usually blocks `http://127.0.0.1:37421` as mixed content. Use
  the normal `http://127.0.0.1:3080` page; CORS is already handled by the bridge.
- The window switches to `offline` after 10 s without a post and keeps animating the
  offline scene until state returns.

## The desktop window is hard to move or on the wrong monitor

- Left-drag anywhere on the sprite. Wayland compositors may ignore the requested position
  or refuse the move request; try an X11 session.
- **Reset position** in the right-click menu returns it to the bottom-right default.
- Desktop preferences are saved in `~/.config/dsh-pixel-companions/desktop.json`; delete
  that file to reset the look, position, and always-on-top state.

## Wrong language

Open the gear and use the **Language** selector: English, Русский, 中文, Tiếng Việt,
日本語, 한국어. The first run follows `navigator.language` when it matches one of them and
otherwise starts in English. The choice is per browser; scene captions and the panel copy
switch together. To go back to the browser-derived first-run language, clear the
`kappy.pixel-companions.ui.v1` key.

## Two companions appear

Two different plugins are registering into `shell.overlay` (or the older composer dock).
Only one companion plugin should be enabled in a profile: check Settings → Plugins for
another pet or decoration plugin and disable it.

## The plugin list shows the package id instead of a title

The locale metadata did not resolve. Confirm that the matching `locale/<language>.json`
(`en`, `ru`, `zh`, `vi`, `ja`, `ko`) exists in the installed package and contains
`meta.title` and `meta.description`, and that `package.json` exports
`"./locale/*.json"`. A linked checkout shows file changes immediately; a fetched package
needs a reinstall.

## `client.js` fails to load

Symptoms: the plugin list reports a failed module, or the browser console shows
`loaded without registering "dsh-pixel-companions"`.

1. Confirm the served bundle starts with
   `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` — the id must equal the
   package name in `package.json`.
2. Confirm the package is installed in the profile:
   `ls $DSH_HOME/profiles/web/node_modules/dsh-pixel-companions`.
3. Look at the install log under `$DSH_HOME/profiles/web/.plugin-manager/logs/`.
4. Reinstall: `dsh plugin --profile web remove dsh-pixel-companions` then
   `dsh plugin --profile web add link:"$PWD"`.

## The scene stays on `error`

`lastAgentError` is a session fact: after a failed turn the session keeps reporting it
until the next turn starts. The pet shows `error` for that period (with a one-shot flash
when the turn stops). This is intended; a successful turn returns it to normal scenes.

## Reset the preferences

The plugin stores its settings, including the dragged `position`, in `localStorage` under
`kappy.pixel-companions.ui.v1`. **Reset position** in the settings panel clears only the
position; to return every preference to its default, clear that key in the browser
devtools (Application → Local Storage) and reload.

## Reading the browser console

The Harness reports a plugin component that throws as
`slot entry crashed in 'shell.overlay'` (the companion) or
`slot entry crashed in 'conversation.input.dock'` (the hidden facts bridge). That message
means the component threw during render, not that the bundle failed to load. Include it,
plus the Harness release (`dsh --version`), in any report.

## Uninstall completely

```sh
dsh plugin --profile web remove dsh-pixel-companions
```

Then reload the page. The profile's `package.json`, lockfile, and bundle list lose the
package; no Host settings are left behind because the plugin never writes any.
