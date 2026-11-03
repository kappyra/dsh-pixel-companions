# Desktop companion

A small **standalone desktop window** that shows the same pixel companion as the
[DeepSeek Harness](../README.md) browser plugin, outside the browser. It is frameless,
always on top, per-pixel transparent, draggable with the left mouse button, and has a
right-click menu. It follows the live scene the Web page publishes: the page is the
brain, this window is just the sprite. Statuses track the assistant's own work (a running
tool call, streaming reasoning or answer text, or a request in flight); the bridge protocol
is unchanged by that. A finished turn's `success` scene stays sticky in the browser and
mirrors to this window while the page holds it; the report/details panel is browser-only.

It is a plain Python 3 script: GTK 3 (PyGObject) for the window, Pillow to decode the
WebP frames, and the standard library for a tiny localhost HTTP bridge. It makes no
network requests other than binding the local bridge.

This page is the short quickstart. The full guide — bridge protocol, privacy boundary,
limitations and troubleshooting — is in [../docs/desktop.md](../docs/desktop.md).

## Requirements

- Python 3.10+
- GTK 3 with PyGObject, and Pillow:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0
python3 -m pip install --user Pillow
```

`desktop/requirements.txt` lists the same packages for `pip`
(`PyGObject` normally comes from the distro, not pip).

The animated sprites come from the repository's `assets/` directory (`assets/girl/`,
`assets/whale/`). No extra download is needed in a checkout. The desktop app reads those
files from disk, so the browser's asset-route delivery does not affect it. Per-pixel
transparency also uses the Cairo bindings that ship with PyGObject on most desktops
(`python3-cairo`); without them the window still runs but draws the sprite on a solid
dark background.

## Run

From the repository root:

```sh
python3 desktop/companion.py
# or
./desktop/run.sh
```

Options:

| Flag | Meaning |
| --- | --- |
| `--port PORT` | Bridge port (default `37421`, keep it in sync with the browser) |
| `--assets DIR` | Asset directory (default: the repository's `assets/`) |
| `--scale 0.5\|…\|2.0` | Initial sprite scale, any value from 0.5 to 2.0 (rounded to 1%; out of range exits with a usage error; later the menu owns it) |
| `--no-animation` | Draw the still PNG instead of the animated WebP |
| `--lang en\|ru\|zh\|vi\|ja\|ko` | Reserved; the window shows no text |
| `--self-test` | Headless acceptance test, no display needed |
| `--stale-ms MS` | Staleness window; testing hook (default 10000) |

The window starts as `offline` until the page sends its first state (or after ten
seconds without state). It keeps animating offline.

## Enable the browser side

The browser half is built by the main plugin. Make sure the plugin/bundle is enabled
in **Settings → Plugins** and the Web page is running at `http://127.0.0.1:3080`. The
page posts its current scene to `http://127.0.0.1:37421/state`; the desktop window picks
it up within ~120 ms. Both halves must run on the same machine (the bridge binds
`127.0.0.1` only and has no auth).

The page always probes `37421` in this version, so keep the default port. Enable
**Desktop window** in the companion's settings popover (gear button) to start mirroring;
it stays off until you do, so a page without the desktop app never probes the port. While
it is on, the settings panel shows a preview card of the window and warns with the start
command until the app answers.

## Right-click menu

- **Character** — Lumi (`girl`) or Deepy (`whale`).
- **Motion** — animated WebP, or the still PNG.
- **Size** — 50%, 75%, 100%, 125%, 150%, 200%.
- **Always on top** — toggle the window's keep-above hint.
- **Reset position** — return to the bottom-right default.
- **Hide for 1 hour** — hide the window; it reappears automatically after an hour.
- **Quit** — save preferences and exit.

Left-drag anywhere on the sprite moves the window. While the window is being moved it
shows Deepy's desk-free `roaming` animation and returns to the mirrored scene on release;
Whale Girl has no roaming asset and keeps her scene sprite. The bridge and the 15-scene
set are unchanged. Position and look are saved to
`~/.config/dsh-pixel-companions/desktop.json`:

```json
{"character": "girl", "scale": 1, "animation": true, "alwaysOnTop": true, "x": 1200, "y": 600}
```

On first run, if that file has no character yet, the first browser payload may choose
it. After that the menu is authoritative and the payload only drives the scene. A saved
`scale` accepts any value from 0.5 to 2.0 (rounded to 1%); legacy 0.8 / 1 / 1.2 values still
load.

## Local bridge

Base URL: `http://127.0.0.1:37421`.

| Request | Response |
| --- | --- |
| `GET /health` | `200` `{"ok":true,"v":1}` |
| `POST /state` | `204`, no body |
| `OPTIONS /state`, `OPTIONS /health` | `204` with CORS headers |
| Unknown path | `404` |
| Malformed body, unknown scene, body > 8 KB | `400` |

`POST /state` body (≤ 8 KB, unknown fields ignored):

```json
{"v": 1, "scene": "typing", "character": "girl", "scale": 1, "animation": true, "updatedAt": 1780000000000}
```

`scene` is one of `idle`, `typing`, `thinking`, `planning`, `reading`, `searching`,
`working`, `success`, `waiting`, `error`, `tired`, `coffee`, `sleeping`, `debugging`,
`offline`. Only `scene` (and, on first run, `character`) is used; `scale` and
`animation` are the desktop menu's business. If no state arrives for more than 10
seconds, the window shows `offline` until new data arrives.

The bridge is **localhost only** (`127.0.0.1`, no auth, no cookies). It carries
presentation state only: no prompt text, no model output, and no request bodies are
logged. Responses contain no filesystem paths.

## No display? Self-test

The window needs a graphical session (`X11` or `Wayland`). It cannot appear on a
headless server or in WSL without one. For remote machines, use X forwarding
(`ssh -X`), a Wayland session with XWayland, or a virtual display. On Wayland,
compositors may ignore the requested window position, and some backends refuse the move
request; try an X11 session if dragging does not work.

Everything except the window can be verified without a display:

```sh
python3 desktop/companion.py --self-test
```

It decodes both characters × all 15 scenes at 0.5, 1.0 and 2.0 scale, plus Deepy's optional
`roaming` animation, checks every pixbuf size, writes one first-frame PNG per scene into a
temporary directory (outside the repo) as visual evidence, starts the bridge on an
ephemeral port and exercises `GET /health`, `OPTIONS`, a valid `POST /state`,
malformed/unknown-scene bodies (`400`) and an unknown path (`404`), then verifies the
10-second staleness rule with an injected clock. It is designed to finish in a couple of
seconds and prints an `ok:` summary (`ok: … 92 animated decodes, 31 still decodes, 260
checks`); failures print a clear message and exit non-zero.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Window never appears | Is a display available? Run with `--self-test` first; on a server use X forwarding. |
| Window appears but frozen | The still PNG may be selected (Motion off) or the page is not sending state; check the bridge with `curl http://127.0.0.1:37421/health`. |
| `cannot listen on 127.0.0.1:37421` | Another companion instance is running; quit it or use `--port`. |
| Scene stays `offline` | The page is not posting (plugin disabled/reloaded?) or its port differs from `--port`. |
| Settings say **Not running** while the window is open | The page cannot reach the bridge: wrong port, local firewall, another process on 37421, or an HTTPS page blocking the request as mixed content. |
| Solid dark rectangle instead of transparency | No compositing RGBA visual / no Cairo bindings; install `python3-cairo` and use a compositing WM. |
| Cannot move the window on Wayland | The compositor may ignore `move`/`begin_move_drag`; try an X11 session. |
