# Desktop window

English | [中文](zh/desktop.md) | [Русский](ru/desktop.md) | [Tiếng Việt](vi/desktop.md) | [日本語](ja/desktop.md) | [한국어](ko/desktop.md)

`desktop/companion.py` is an **optional standalone desktop window** that shows the same
pixel companion outside the browser. It is frameless, always on top, per-pixel
transparent, draggable with the left mouse button, and has a right-click menu. It is a
plain Python 3 program (GTK 3 via PyGObject, Pillow, and a tiny localhost HTTP bridge); it
is not a Harness plugin and it does not change the Web GUI.

The window is the sprite; the Web page is the brain. The browser half is part of the
normal bundle and stays idle until you turn on **Desktop window** in the companion's
settings panel. The default is off, so a page without the desktop app never probes the
local port. Both halves must run on the same machine: the bridge binds `127.0.0.1` only and
has no authentication.

Statuses now track the assistant's own work — a running tool call, streaming reasoning or
answer text, or a request in flight — and the desktop mirror shows the same scenes; the
bridge protocol is unchanged. The browser holds a finished turn's `success` scene and report
stickily, so the desktop window mirrors `success` for as long as the page keeps it; the
report row and its details panel are browser-only.

## Requirements

- Python 3.10+ on the same machine as the browser page.
- GTK 3 with PyGObject, Cairo bindings, and Pillow:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
```

`python3-cairo` is what makes the window per-pixel-transparent. Without it (or without a
compositing window manager) the window still runs, but it draws the sprite on a solid dark
background. `desktop/requirements.txt` lists `PyGObject>=3.42` and `Pillow>=10` for pip;
PyGObject normally comes from the distro, not pip.

The sprite frames come from the repository's `assets/` directory (`assets/girl/`,
`assets/whale/`); no extra download is needed in a checkout.

## Run it

From the repository root:

```sh
python3 desktop/companion.py
# or
./desktop/run.sh
```

| Flag | Meaning |
| --- | --- |
| `--port PORT` | Bridge port, default `37421`. The page always probes `37421` in this version, so keep the default. |
| `--assets DIR` | Asset directory; defaults to the repository's `assets/`. |
| `--scale 0.5\|…\|2.0` | Initial sprite scale, any value from `0.5` to `2.0` (rounded to 1%); out-of-range values exit with a usage error. Afterwards the right-click menu owns the look. |
| `--no-animation` | Start with the still PNG instead of the animated WebP. |
| `--lang en\|ru\|zh\|vi\|ja\|ko` | Reserved. The window draws no text, so this changes nothing visually. |
| `--stale-ms MS` | Staleness window in milliseconds; a testing hook, default `10000`. |
| `--self-test` | Run the headless acceptance test and exit; no display needed. |

The window starts as `offline` until the page sends its first state. Preferences (look,
position, always-on-top) are saved to `~/.config/dsh-pixel-companions/desktop.json`:

```json
{"character": "girl", "scale": 1, "animation": true, "alwaysOnTop": true, "x": 1200, "y": 600}
```

On first run, if that file has no saved character, the first browser payload may choose it;
after that the menu is authoritative and the payload only drives the scene. A saved
`scale` accepts any value from `0.5` to `2.0` (rounded to 1%); legacy `0.8` / `1` / `1.2`
values still load.

## Enable the browser side

1. Make sure the bundle is enabled in **Settings → Plugins** and the Web page is open
   (normally `http://127.0.0.1:3080`).
2. Start the desktop window (or start it after; the page re-probes every 10 seconds).
3. Open the companion's gear panel and tick **Desktop window**.

The row shows the current state:

| Status | Meaning |
| --- | --- |
| **Off** | Disabled. The page does not probe the desktop port at all. |
| **Not running** | Enabled, but nothing answers on `127.0.0.1:37421`. |
| **Connected** | The desktop window answered the last probe; the scene is being mirrored. |

While **Desktop window** is on, a preview card appears directly under the row: a
checkerboard-backed stage shows the current sprite exactly as the desktop window would
render it (same character, scene, motion state and pixelated scaling), titled **Desktop
window preview**. It shows a green **Connected** or an amber **⚠ Not running — start
`desktop/companion.py`**. The card is display-only — no button, no protocol change — and it
disappears when the option is off; hovering the row also shows the start hint.

While enabled and connected, the page probes `GET /health` every 10 seconds, posts its
state when the scene or the look changes, and sends a 4-second heartbeat. The window
picks up changes within about 120 ms of a post. Keep the page open for live state: if no
state arrives for more than 10 seconds (page closed, page reloading, network blocked), the
window shows `offline` and keeps running.

## Right-click menu

- **Character** — Lumi (`girl`) or Deepy (`whale`).
- **Motion** — animated WebP, or the still PNG.
- **Size** — 50%, 75%, 100%, 125%, 150%, 200%.
- **Always on top** — toggle the window's keep-above hint.
- **Reset position** — return to the bottom-right default.
- **Hide for 1 hour** — hide the window; it reappears automatically after an hour.
- **Quit** — save preferences and exit.

Left-drag anywhere on the sprite moves the window; the position is saved. While the window
is being moved, Deepy switches to his desk-free `roaming` animation and returns to the
mirrored scene on release; Whale Girl keeps her scene sprite. This is a movement visual
only — the bridge protocol and the 15-scene set are unchanged. The window is frameless and
has no tray icon; right-click **Quit** closes it.

## Local bridge and privacy boundary

Base URL: `http://127.0.0.1:37421`. The bridge is a small HTTP server on the loopback
interface only.

| Request | Response |
| --- | --- |
| `GET /health` | `200` `{"ok":true,"v":1}` |
| `POST /state` | `204`, no body |
| `OPTIONS /state`, `OPTIONS /health` | `204` with CORS headers (`Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`) |
| Unknown path | `404` |
| Malformed JSON, unknown scene, missing/invalid length, body over 8 KB | `400` |

`POST /state` payload (up to 8 KB; unknown fields are ignored):

```json
{"v": 1, "scene": "typing", "character": "girl", "scale": 1, "animation": true, "updatedAt": 1780000000000}
```

`scene` is one of the 15 scene ids (`idle`, `typing`, `thinking`, `planning`, `reading`,
`searching`, `working`, `success`, `waiting`, `error`, `tired`, `coffee`, `sleeping`,
`debugging`, `offline`). Only `scene` is used on every post; `character` is adopted only on
first run before a character is saved; `scale` and `animation` are the desktop menu's
business; `updatedAt` is informational.

What crosses the bridge is presentation state only — **no prompt text, draft text,
messages, session ids, file paths, or model output are ever sent**. The bridge:

- binds `127.0.0.1` only, has no authentication, no cookies, and no TLS;
- rejects request bodies over 8 KB and any body whose scene id is unknown;
- never logs request payloads and serves no files;
- allows the browser origin via CORS only so the local page can post.

## Staleness and offline behaviour

The window remembers the last received state and the time it arrived. If no state arrives
for more than 10 seconds, `effective_scene` becomes `offline`; the window keeps rendering
(and keeps animating that scene when motion is on) until a fresh post arrives. The page
side mirrors this: the settings row falls back to **Not running** if a health probe or a
post fails.

Exactly 10.000 s is still fresh; the switch happens just after that. `--self-test` checks
this boundary with an injected clock.

## Verification

The headless parts are verified:

```sh
python3 -m py_compile desktop/companion.py
python3 desktop/companion.py --self-test
```

The self-test decodes both characters × all 15 scenes at 0.5, 1.0 and 2.0 scale, plus
Deepy's optional `roaming` animation, checks frame sizes and durations, writes 30
first-frame PNGs into a temporary directory outside the repository as visual evidence,
starts the bridge on an ephemeral port and exercises `GET /health`, both CORS preflights, a
valid `POST /state`, malformed/unknown-scene bodies (`400`) and an unknown path (`404`), then
checks the 10-second staleness rule. It prints an `ok:` summary
(`ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks`) and exits
non-zero on failure.

A roaming switch test also passes
(`whale: moving→roaming, released→idle; girl: no roaming`). The browser-side payload was
verified in a headless React render
(`scene=typing` → `success`), with no draft or session data in the request body, and a
headless browser drag test shows the whale switching to `roaming` while dragged and back to
the scene on release (the girl is unchanged).

Not verifiable without a graphical session: the actual window, per-pixel transparency on a
machine without the Cairo bridge (the opaque fallback is expected there), always-on-top and
drag behaviour, and Wayland window positioning.

## Limitations

- Needs a graphical session (X11 or Wayland). A headless server or plain WSL has no
  display; use X forwarding or a virtual display, or run `--self-test`.
- Wayland compositors may ignore the requested window position, and some backends refuse
  the window-move request; an X11 session is the most predictable.
- No tray icon, no notifications, no window decorations, no text. Closing is via the
  right-click **Quit** (or **Hide for 1 hour**).
- The page must stay open for live state. The window is a display target, not a second
  client.
- Same machine only: the bridge is loopback-only and unauthenticated, so do not expose the
  port. The window has no access to the conversation beyond the tiny payload.
- A page served over HTTPS usually blocks `http://127.0.0.1` requests as mixed content;
  use the normal `http://127.0.0.1:3080` page.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Window never appears | Is a display available? Run `python3 desktop/companion.py --self-test` first; on a server use X forwarding or a virtual display. |
| `cannot listen on 127.0.0.1:37421` | Another companion instance is running. Quit it (the page uses 37421, so keeping the default port is easiest). |
| Solid dark rectangle instead of transparency | Install `python3-cairo`, use a compositing window manager, and run an X11 or composited Wayland session. This is the expected opaque fallback, not a crash. |
| Scene stays `offline` | Is the page open, the bundle enabled, and **Desktop window** ticked? Check `curl http://127.0.0.1:37421/health` and that the page and window use the same port. |
| Settings say **Not running** while the window is open | The page cannot reach the bridge: check the port, a local firewall, another process on 37421, or a page served over HTTPS (mixed content). |
| Window cannot be moved on Wayland | The compositor may ignore move requests; try an X11 session or drag from another spot on the sprite. |
| Window on the wrong monitor / off-screen | **Reset position** in the right-click menu; some Wayland compositors ignore positioning entirely. |

More in [installation.md](installation.md), [development.md](development.md), and
[troubleshooting.md](troubleshooting.md).
