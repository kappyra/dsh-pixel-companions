#!/usr/bin/env python3
"""Standalone desktop companion for dsh-pixel-companions (Python 3 + GTK 3 + Pillow).
The browser plugin draws the same companion in the DeepSeek Harness Web GUI; this
script shows it in a frameless, always-on-top, per-pixel-transparent window and follows
the scene the page publishes over a tiny localhost bridge:
    GET /health -> 200 {"ok":true,"v":1}   POST /state -> 204   OPTIONS -> CORS 204
The bridge carries presentation state only (a scene id, plus the character on first
run); prompt text is never sent, bodies are not logged, bodies over 8 KB are rejected,
and it binds 127.0.0.1 only.
Transparency: the undecorated app-paintable Gtk.Window gets the RGBA visual; its draw
handler clears with cairo OPERATOR_SOURCE and paints the GdkPixbuf at 0,0. Without a
compositor/pycairo the sprite is flattened onto dark background via Gtk.Image instead.
Only stdlib, PyGObject and Pillow are needed; --self-test runs headless.
"""
from __future__ import annotations
import argparse, http.client, json, os, sys, tempfile, threading, time, traceback
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
try:
    import gi
    gi.require_version("Gdk", "3.0")
    gi.require_version("GdkPixbuf", "2.0")
    gi.require_version("Gtk", "3.0")
    from gi.repository import Gdk, GdkPixbuf, GLib, Gtk
except (ImportError, ValueError) as exc:  # pragma: no cover - environment guard
    print(f"companion: PyGObject with GTK 3 is required ({exc}).", file=sys.stderr)
    print("  sudo apt install python3-gi gir1.2-gtk-3.0", file=sys.stderr)
    raise SystemExit(2)
from PIL import Image
try:  # Both pycairo and PyGObject's cairo bridge are needed for the transparent path.
    import cairo
    gi.require_foreign("cairo")  # registers the cairo.Context foreign-struct converter
except (ImportError, ValueError, AttributeError):  # pragma: no cover - slim installs
    cairo = None
APP_NAME = "dsh-pixel-companion"
PROTOCOL_VERSION = 1
DEFAULT_PORT, DEFAULT_STALE_MS = 37421, 10_000
POLL_MS, MAX_BODY_BYTES = 120, 8192
SPRITE_W, SPRITE_H, DEFAULT_FRAME_MS = 192, 128, 120
FALLBACK_BG = (20, 30, 54, 255)
SCENES = (
    "idle", "typing", "thinking", "planning", "reading", "searching",
    "working", "success", "waiting", "error", "tired", "coffee",
    "sleeping", "debugging", "offline",
)
CHARACTERS = ("girl", "whale")
CHARACTER_NAMES = {"girl": "Lumi", "whale": "Deepy"}
MIN_SCALE, MAX_SCALE = 0.5, 2.0
SCALES = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
LANGUAGES = ("en", "ru", "zh", "vi", "ja", "ko")

def log(message: str) -> None:
    print(f"companion: {message}", file=sys.stderr)  # payload contents are never logged

# ------------------------------------------------------------- state and HTTP bridge
def scene_at(scene: str | None, last_rx: float | None, now: float, stale_ms: int) -> str:
    """Scene to show; stale or missing data means offline (the page may be closed)."""
    stale = scene is None or last_rx is None or (now - last_rx) * 1000.0 > stale_ms
    return "offline" if stale else scene

class StateHub:
    """Thread-safe last payload: the HTTP thread writes, the GLib loop reads."""
    def __init__(self, clock: Callable[[], float] = time.monotonic, stale_ms: int = DEFAULT_STALE_MS):
        self._clock, self.stale_ms = clock, stale_ms
        self._lock = threading.Lock()
        self._scene = self._character = self._last_rx = None
    def publish(self, scene: str, character: str | None = None) -> None:
        with self._lock:
            self._scene, self._last_rx = scene, self._clock()
            if character is not None:
                self._character = character
    def snapshot(self) -> tuple[str | None, str | None, float | None]:
        with self._lock:
            return self._scene, self._character, self._last_rx
    def effective_scene(self) -> str:
        scene, _, last_rx = self.snapshot()
        return scene_at(scene, last_rx, self._clock(), self.stale_ms)

class CompanionRequestHandler(BaseHTTPRequestHandler):
    """Minimal CORS bridge for the Web page; bound to 127.0.0.1 by the server."""
    protocol_version = "HTTP/1.1"
    server_version = APP_NAME
    sys_version = ""
    def log_message(self, format: str, *args: Any) -> None:
        pass  # never log requests or payloads
    log_error = log_message  # type: ignore[assignment]
    @property
    def route(self) -> str:
        return self.path.split("?", 1)[0]
    def _respond(self, status: int, body: bytes = b"", preflight: bool = False) -> None:
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        if preflight:
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "content-type")
            self.send_header("Access-Control-Max-Age", "600")
        if status != HTTPStatus.NO_CONTENT:
            self.send_header("Content-Length", str(len(body)))
            if body:
                self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        if body:
            self.wfile.write(body)
    def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        allowed = self.route in ("/state", "/health")
        self._respond(HTTPStatus.NO_CONTENT if allowed else HTTPStatus.NOT_FOUND, preflight=allowed)
    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.route == "/health":
            self._respond(HTTPStatus.OK, json.dumps({"ok": True, "v": PROTOCOL_VERSION}, separators=(",", ":")).encode())
        else:
            self._respond(HTTPStatus.NOT_FOUND)
    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.route != "/state":
            self.close_connection = True  # an unread body would poison keep-alive
            self._respond(HTTPStatus.NOT_FOUND)
            return
        raw_length = self.headers.get("Content-Length")
        try:
            length = int(raw_length) if raw_length is not None else -1
        except ValueError:
            length = -2
        if not 0 <= length <= MAX_BODY_BYTES:
            self.close_connection = True
            self._respond(HTTPStatus.BAD_REQUEST)
            return
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8")) if len(body) == length else None
        except (UnicodeDecodeError, ValueError):
            payload = None
        if not isinstance(payload, dict) or payload.get("scene") not in SCENES:
            self._respond(HTTPStatus.BAD_REQUEST)
            return
        character = payload.get("character")
        self.server.hub.publish(payload["scene"], character if character in CHARACTERS else None)  # type: ignore[attr-defined]
        self._respond(HTTPStatus.NO_CONTENT)

class CompanionServer(ThreadingHTTPServer):
    """Localhost bridge; the request handler reads the hub from ``server.hub``."""
    daemon_threads = True
    allow_reuse_address = True
    def __init__(self, hub: StateHub, port: int = DEFAULT_PORT, host: str = "127.0.0.1") -> None:
        super().__init__((host, port), CompanionRequestHandler)
        self.hub = hub
        self.port = int(self.server_address[1])
        self._thread: threading.Thread | None = None
    def start(self) -> None:
        self._thread = threading.Thread(target=self.serve_forever, name="companion-bridge", daemon=True)
        self._thread.start()
    def stop(self) -> None:
        if self._thread is None:
            self.server_close()
            return
        self.shutdown()
        self.server_close()
        self._thread.join(timeout=2.0)
        self._thread = None

# -------------------------------------------------------------------------- animation
@dataclass(slots=True)
class FrameSet:
    """One scene's scaled frames, plus the GLib.Bytes backing them (kept alive)."""
    frames: list[Any]
    durations: list[int]
    width: int
    height: int
    animated: bool
    keepalive: list[Any] = field(default_factory=list, repr=False)

def target_size(scale: float) -> tuple[int, int]:
    """Sprite size for a scale, as the browser does: 192x128 x scale."""
    return max(1, round(SPRITE_W * scale)), max(1, round(SPRITE_H * scale))

def _to_pixbuf(image: Image.Image, scale: float, flatten: bool) -> tuple[Any, Any]:
    """Convert one Pillow frame to a NEAREST-scaled GdkPixbuf, returning its GBytes."""
    image = image.convert("RGBA")
    if flatten:  # no compositor: flatten alpha over the fallback background
        image = Image.alpha_composite(Image.new("RGBA", image.size, FALLBACK_BG), image).convert("RGB")
    channels = 3 if flatten else 4
    width, height = image.size
    target_w, target_h = target_size(scale)
    keepalive = GLib.Bytes.new(image.tobytes())
    pixbuf = GdkPixbuf.Pixbuf.new_from_bytes(
        keepalive, GdkPixbuf.Colorspace.RGB, not flatten, 8, width, height, width * channels)
    if (width, height) != (target_w, target_h):
        pixbuf = pixbuf.scale_simple(target_w, target_h, GdkPixbuf.InterpType.NEAREST)
    return pixbuf, keepalive

def load_frames(assets_dir: Path, character: str, scene: str, scale: float, animate: bool,
                flatten: bool = False) -> FrameSet:
    """Load the animated WebP, or the still PNG when motion is off.
    The caller holds only the current FrameSet, so memory stays bounded to one scene.
    """
    width, height = target_size(scale)
    if animate and (webp := assets_dir / character / f"{scene}.webp").is_file():
        frames: list[Any] = []
        durations: list[int] = []
        keepalive: list[Any] = []
        with Image.open(webp) as image:
            count = max(1, int(getattr(image, "n_frames", 1) or 1))
            for index in range(count):
                image.seek(index)
                duration = image.info.get("duration")
                durations.append(int(duration) if isinstance(duration, (int, float)) and duration > 0 else DEFAULT_FRAME_MS)
                pixbuf, ref = _to_pixbuf(image, scale, flatten)
                frames.append(pixbuf)
                keepalive.append(ref)
        return FrameSet(frames, durations, width, height, count > 1, keepalive)
    still = assets_dir / character / f"{scene}.png"
    if not still.is_file():
        raise FileNotFoundError(f"missing sprite {still}")
    with Image.open(still) as image:
        pixbuf, ref = _to_pixbuf(image, scale, flatten)
    return FrameSet([pixbuf], [DEFAULT_FRAME_MS], width, height, False, [ref])

# ----------------------------------------------------------------------------- prefs
@dataclass(slots=True)
class Prefs:
    character: str = "girl"
    scale: float = 1.0
    animation: bool = True
    always_on_top: bool = True
    x: int | None = None
    y: int | None = None

def config_path() -> Path:
    return Path.home() / ".config" / "dsh-pixel-companions" / "desktop.json"

def load_prefs(path: Path | None = None) -> tuple[Prefs, bool]:
    """Read prefs; the bool says whether the file supplied a character.
    Without a saved character the first browser payload may adopt it; afterwards the
    menu owns the look and the payload only drives the scene.
    """
    path, prefs = path or config_path(), Prefs()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return prefs, False
    if not isinstance(raw, dict):
        return prefs, False
    saved_character = raw.get("character") in CHARACTERS
    if saved_character:
        prefs.character = raw["character"]
    scale = raw.get("scale")
    if isinstance(scale, (int, float)) and not isinstance(scale, bool) and MIN_SCALE <= float(scale) <= MAX_SCALE:
        prefs.scale = round(float(scale) * 100) / 100
    prefs.animation = raw.get("animation") is not False
    prefs.always_on_top = raw.get("alwaysOnTop") is not False
    for key in ("x", "y"):
        value = raw.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            setattr(prefs, key, int(value))
    return prefs, saved_character

def save_prefs(prefs: Prefs, path: Path | None = None) -> None:
    path = path or config_path(); path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"character": prefs.character, "scale": prefs.scale, "animation": prefs.animation,
               "alwaysOnTop": prefs.always_on_top, "x": prefs.x, "y": prefs.y}
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)

# ---------------------------------------------------------------------------- window
def submenu(label: str) -> tuple[Gtk.MenuItem, Gtk.Menu]:
    item, menu = Gtk.MenuItem(label=label), Gtk.Menu()
    item.set_submenu(menu)
    return item, menu

def radio(label: str, first: Gtk.RadioMenuItem | None) -> Gtk.RadioMenuItem:
    return Gtk.RadioMenuItem(label=label) if first is None else Gtk.RadioMenuItem.new_with_label_from_widget(first, label)

class CompanionApp:
    """The GTK window and its poll loop; the only part that needs a display."""
    def __init__(self, hub: StateHub, prefs: Prefs, prefs_path: Path, assets_dir: Path,
                 character_locked: bool, lang: str = "en") -> None:
        self._hub, self._prefs, self._prefs_path, self._assets = hub, prefs, prefs_path, assets_dir
        self._character_locked, self._lang = character_locked, lang  # lang is reserved
        self._frames: FrameSet | None = None
        self._key: tuple[str, str, bool, float] | None = None
        self._index, self._elapsed_ms, self._last_tick = 0, 0.0, time.monotonic()
        self._x, self._y = prefs.x or 0, prefs.y or 0
        self._save_timer = self._reshow_timer = None
        # Moving the window must not drag the desk/laptop/lamp along: Deepy swaps to
        # the desk-free `roaming` animation while the window is being moved.
        self._dragging = False
        self._drag_timer: int | None = None
        self._warned, self._transparent, self._flatten = False, False, False
        self._image: Gtk.Image | None = None
        self._window = self._build_window()
        self._menu = self._build_menu()
    def _build_window(self) -> Gtk.Window:
        window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        for name, value in (("title", "Pixel Companion"), ("decorated", False), ("resizable", False),
                            ("skip-taskbar-hint", True), ("skip-pager-hint", True), ("app-paintable", True)):
            window.set_property(name, value)  # frameless, self-painted window
        window.set_keep_above(self._prefs.always_on_top)  # no GObject property for this one
        window.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK)
        screen = window.get_screen()
        visual = screen.get_rgba_visual() if screen is not None and screen.is_composited() else None
        if visual is not None:
            window.set_visual(visual)  # must happen before realize()
        self._transparent = visual is not None and cairo is not None
        self._flatten = not self._transparent  # opaque fallback whenever we cannot clear
        if self._transparent:
            window.connect("draw", self._on_draw)
        else:
            self._image = Gtk.Image()
            window.add(self._image)
        window.connect("button-press-event", self._on_press)
        window.connect("button-release-event", self._on_release)
        window.connect("configure-event", self._on_configure)
        window.connect("destroy", lambda *_: Gtk.main_quit())
        return window
    def _build_menu(self) -> Gtk.Menu:
        menu = Gtk.Menu()
        character_item, character_menu = submenu("Character")
        first: Gtk.RadioMenuItem | None = None
        for character, name in CHARACTER_NAMES.items():
            entry = radio(name, first); first = first or entry
            entry.set_active(self._prefs.character == character)
            entry.connect("toggled", lambda item, value=character: item.get_active() and self._set_look(character=value))
            character_menu.append(entry)
        motion_item = Gtk.CheckMenuItem(label="Motion"); motion_item.set_active(self._prefs.animation)
        motion_item.connect("toggled", lambda item: self._set_look(animation=item.get_active()))
        size_item, size_menu = submenu("Size")
        first = None
        for scale in SCALES:
            label = f"{round(scale * 100)}%"
            entry = radio(label, first); first = first or entry
            entry.set_active(abs(scale - self._prefs.scale) < 1e-6)
            entry.connect("toggled", lambda item, value=scale: item.get_active() and self._set_look(scale=value))
            size_menu.append(entry)
        top_item = Gtk.CheckMenuItem(label="Always on top"); top_item.set_active(self._prefs.always_on_top)
        top_item.connect("toggled", lambda item: self._set_always_on_top(item.get_active()))
        reset_item, hide_item, quit_item = (Gtk.MenuItem(label=label) for label in
                                            ("Reset position", "Hide for 1 hour", "Quit"))
        reset_item.connect("activate", lambda _item: self._reset_position())
        hide_item.connect("activate", lambda _item: self._hide_for_hour())
        quit_item.connect("activate", lambda _item: self._quit())
        for item in (character_item, motion_item, size_item, top_item, Gtk.SeparatorMenuItem(),
                     reset_item, hide_item, quit_item):
            menu.append(item)
        menu.show_all()
        return menu
    def run(self) -> None:
        width, height = target_size(self._prefs.scale)
        self._window.set_default_size(width, height); self._window.resize(width, height)
        if self._prefs.x is not None and self._prefs.y is not None:
            self._x, self._y = self._clamp(self._prefs.x, self._prefs.y, width, height)
        else:
            self._x, self._y = self._default_position(width, height)
        self._window.move(self._x, self._y)
        self._ensure_frames(self._hub.effective_scene())
        self._window.show_all()
        self._last_tick = time.monotonic()
        log(f"window ready; right-click for the menu (language {self._lang})")
        GLib.timeout_add(POLL_MS, self._tick)
        Gtk.main()
        self._save_now()
    def _screen_bounds(self) -> tuple[int, int, int, int] | None:
        """Union of all monitor rectangles; avoids the deprecated Gdk.Screen getters."""
        display = self._window.get_display()
        if display is None:
            return None
        geometries = [display.get_monitor(i).get_geometry() for i in range(display.get_n_monitors())]
        if not geometries:
            return None
        return (min(item.x for item in geometries), min(item.y for item in geometries),
                max(item.x + item.width for item in geometries), max(item.y + item.height for item in geometries))

    def _default_position(self, width: int, height: int) -> tuple[int, int]:
        bounds = self._screen_bounds()
        if bounds is None:
            return 0, 0
        return max(0, bounds[2] - width - 48), max(0, bounds[3] - height - 96)

    def _clamp(self, x: float, y: float, width: int, height: int) -> tuple[int, int]:
        bounds = self._screen_bounds()
        if bounds is None:
            return max(0, int(x)), max(0, int(y))
        left, top, right, bottom = bounds
        return (min(max(left, int(x)), max(left, right - width)),
                min(max(top, int(y)), max(top, bottom - height)))
    def _current(self) -> Any:
        frames = self._frames
        return frames.frames[self._index % len(frames.frames)] if frames is not None and frames.frames else None
    def _roaming_available(self) -> bool:
        """Deepy ships an optional desk-free roaming animation; Whale Girl does not."""
        if self._prefs.character != "whale":
            return False
        base = self._assets / "whale"
        return (base / ("roaming.webp" if self._prefs.animation else "roaming.png")).is_file()

    def _scene_to_show(self) -> str:
        """The scene the window should animate right now (roaming while moved)."""
        if self._dragging and self._roaming_available():
            return "roaming"
        return self._hub.effective_scene()

    def _mark_drag(self) -> None:
        """Treat the window as moving; the WM may never deliver a release event."""
        self._dragging = True
        if self._drag_timer is not None:
            GLib.source_remove(self._drag_timer)
        self._drag_timer = GLib.timeout_add(400, self._end_drag)

    def _end_drag(self) -> bool:
        self._dragging = False
        self._drag_timer = None
        return False

    def _ensure_frames(self, scene: str, elapsed_ms: float = 0.0) -> None:
        key = (self._prefs.character, scene, self._prefs.animation, float(self._prefs.scale))
        if key == self._key:
            self._advance(elapsed_ms)
            return
        self._key = key
        try:
            frames = load_frames(self._assets, self._prefs.character, scene, float(self._prefs.scale),
                                 self._prefs.animation, flatten=self._flatten)
        except (OSError, ValueError) as exc:
            if not self._warned:
                log(f"cannot load sprite ({exc}); keeping the previous frame"); self._warned = True
            return
        self._frames = frames  # releases the previous scene here
        self._index, self._elapsed_ms = 0, 0.0
        if self._window.get_size() != (frames.width, frames.height):
            self._window.resize(frames.width, frames.height)
            self._x, self._y = self._clamp(self._x, self._y, frames.width, frames.height)
            self._window.move(self._x, self._y)
        self._draw_current()
    def _advance(self, elapsed_ms: float) -> None:
        frames = self._frames
        if frames is None or not frames.animated or len(frames.frames) < 2:
            return
        self._elapsed_ms += max(0.0, elapsed_ms)
        changed, guard = False, 0
        while self._elapsed_ms >= frames.durations[self._index] and guard < 64:
            self._elapsed_ms -= frames.durations[self._index]
            self._index, changed, guard = (self._index + 1) % len(frames.frames), True, guard + 1
        if changed:
            self._draw_current()
    def _draw_current(self) -> None:
        if self._transparent:
            self._window.queue_draw()
        elif self._image is not None and (pixbuf := self._current()) is not None:
            self._image.set_from_pixbuf(pixbuf)
    def _on_draw(self, _widget: Gtk.Widget, cr: Any) -> bool:
        if cairo is None:  # connected only when pycairo exists
            return False
        cr.set_source_rgba(0.0, 0.0, 0.0, 0.0)
        cr.set_operator(cairo.OPERATOR_SOURCE)
        cr.paint()  # clear everything: alpha survives only with an RGBA visual
        if (pixbuf := self._current()) is not None:
            cr.set_operator(cairo.OPERATOR_OVER)
            Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0)
            cr.paint()
        return False
    def _tick(self) -> bool:
        now = time.monotonic()
        elapsed_ms, self._last_tick = (now - self._last_tick) * 1000.0, now
        character = self._hub.snapshot()[1]
        if not self._character_locked and character in CHARACTERS and character != self._prefs.character:
            self._prefs.character, self._character_locked = character, True
            self._save_prefs()
        self._ensure_frames(self._scene_to_show(), elapsed_ms)
        return True
    def _on_press(self, _widget: Gtk.Widget, event: Gdk.EventButton) -> bool:
        if event.button == 3:
            self._menu.popup_at_pointer(event)
            return True
        if event.button != 1:
            return False
        self._mark_drag()
        try:
            self._window.begin_move_drag(event.button, int(event.x_root), int(event.y_root), int(event.time))
        except (AttributeError, TypeError, GLib.Error):  # backend without a WM move grab
            pass
        return True
    def _on_release(self, _widget: Gtk.Widget, _event: Gdk.EventButton) -> bool:
        self._end_drag()
        return False

    def _on_configure(self, _widget: Gtk.Widget, event: Gdk.EventConfigure) -> bool:
        if self._dragging:
            self._mark_drag()  # a moved window keeps the roaming visual until it stops
        self._x, self._y = int(event.x), int(event.y)
        if self._save_timer is not None:
            GLib.source_remove(self._save_timer)
        self._save_timer = GLib.timeout_add(350, self._save_now)
        return False
    def _save_now(self) -> bool:
        self._save_timer = None
        self._save_prefs()
        return False
    def _save_prefs(self) -> None:
        self._prefs.x, self._prefs.y = self._x, self._y
        try:
            save_prefs(self._prefs, self._prefs_path)
        except OSError as exc:
            log(f"cannot write preferences: {exc}")
    def _set_look(self, **changes: Any) -> None:
        """Menu actions own the look; any real change reloads the current scene."""
        changes = {key: value for key, value in changes.items() if value is not None}
        if all(getattr(self._prefs, key) == value for key, value in changes.items()):
            return
        if "character" in changes:
            self._character_locked = True
        for key, value in changes.items():
            setattr(self._prefs, key, value)
        self._save_prefs()
        self._ensure_frames(self._hub.effective_scene())
    def _set_always_on_top(self, enabled: bool) -> None:
        self._prefs.always_on_top = bool(enabled); self._window.set_keep_above(self._prefs.always_on_top)
        self._save_prefs()
    def _reset_position(self) -> None:
        self._prefs.x = self._prefs.y = None
        self._x, self._y = self._default_position(*target_size(self._prefs.scale))
        self._window.move(self._x, self._y); self._save_prefs()
    def _hide_for_hour(self) -> None:
        self._window.hide(); self._reshow_timer = GLib.timeout_add_seconds(3600, self._reshow)
    def _reshow(self) -> bool:
        self._reshow_timer = None
        self._window.show(); self._window.present()
        return False
    def _quit(self) -> None:
        self._save_prefs()
        Gtk.main_quit()

# ------------------------------------------------------------------------------- cli
def resolve_assets(value: Path | None) -> Path:
    default = Path(__file__).resolve().parent.parent / "assets"
    return (value.expanduser() if value is not None else default).resolve()

def display_available() -> bool:
    """True when GDK has a display; on a truly headless host this is None."""
    try:
        return Gdk.Display.get_default() is not None
    except Exception:  # pragma: no cover - broken backend
        return False

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="companion.py",
                                     description="Frameless desktop window for the dsh pixel companion.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"localhost bridge port (default {DEFAULT_PORT})")
    parser.add_argument("--assets", type=Path, default=None, help="asset directory (default: the repository's assets/)")
    parser.add_argument("--scale", type=float, default=None,
                        help=f"sprite scale, {MIN_SCALE} to {MAX_SCALE} (default: saved value or 1.0)")
    parser.add_argument("--no-animation", action="store_true", help="draw the still PNG instead of the animated WebP")
    parser.add_argument("--lang", choices=LANGUAGES, default="en", help="reserved UI language; the window draws no text")
    parser.add_argument("--stale-ms", type=int, default=DEFAULT_STALE_MS, help="staleness window in ms (testing hook)")
    parser.add_argument("--self-test", action="store_true", help="run the headless self-test and exit")
    args = parser.parse_args(argv)
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    if args.stale_ms <= 0:
        parser.error("--stale-ms must be positive")
    if args.scale is not None and not (MIN_SCALE <= args.scale <= MAX_SCALE):
        parser.error(f"--scale must be between {MIN_SCALE} and {MAX_SCALE}")
    if args.scale is not None:
        args.scale = round(args.scale * 100) / 100
    return args

class SelfTestFailure(RuntimeError):
    pass

def run_self_test(args: argparse.Namespace) -> int:
    """Headless acceptance test: assets, HTTP bridge, staleness."""
    started, checks = time.monotonic(), 0
    def expect(condition: bool, message: str) -> None:
        nonlocal checks
        if not condition:
            raise SelfTestFailure(message)
        checks += 1
    try:
        assets = resolve_assets(args.assets)
        expect(assets.is_dir(), f"assets directory not found: {assets}")
        evidence = Path(tempfile.mkdtemp(prefix="dsh-pixel-companions-selftest-"))
        decodes = stills = written = 0
        for character in CHARACTERS:
            for scene in SCENES:
                for scale in (0.5, 1.0, 2.0):
                    frames = load_frames(assets, character, scene, scale, True)
                    expected = target_size(scale)
                    expect(frames.frames and all((p.get_width(), p.get_height()) == expected for p in frames.frames),
                           f"{character}/{scene}@{scale}: missing frames or wrong size")
                    expect(len(frames.durations) == len(frames.frames) and all(d > 0 for d in frames.durations),
                           f"{character}/{scene}@{scale}: bad frame durations")
                    decodes += 1
                    if scale != 1.0:
                        continue
                    still = load_frames(assets, character, scene, 1.0, False)
                    expect(len(still.frames) == 1 and (still.frames[0].get_width(), still.frames[0].get_height()) == expected,
                           f"{character}/{scene}: still PNG missing or wrong size")
                    stills += 1
                    output = evidence / f"{character}-{scene}.png"
                    frames.frames[0].savev(str(output), "png", [], [])
                    expect(output.is_file() and output.stat().st_size > 0, f"{character}/{scene}: cannot write {output}")
                    written += 1
        # Optional bonus animation: only Deepy ships it, and only when we move.
        roaming = assets / "whale" / "roaming.webp"
        if roaming.is_file():
            for animate in (True, False):
                frames = load_frames(assets, "whale", "roaming", 1.0, animate)
                expected = target_size(1.0)
                expect(frames.frames and all((p.get_width(), p.get_height()) == expected for p in frames.frames),
                       "whale/roaming: missing frames or wrong size")
                expect(len(frames.durations) == len(frames.frames) and all(d > 0 for d in frames.durations),
                       "whale/roaming: bad frame durations")
                decodes += 1
                if not animate:
                    stills += 1

        hub = StateHub()
        server = CompanionServer(hub, port=0)
        server.start()
        try:
            connection = http.client.HTTPConnection("127.0.0.1", server.port, timeout=5)
            def fetch(method: str, path: str, body: bytes | None = None,
                      headers: dict[str, str] | None = None) -> tuple[int, dict[str, str], bytes]:
                connection.request(method, path, body=body, headers=headers or {})
                response = connection.getresponse()
                data = response.read()
                return response.status, {name.lower(): value for name, value in response.getheaders()}, data
            status, headers, body = fetch("GET", "/health")
            expect(status == 200 and json.loads(body) == {"ok": True, "v": PROTOCOL_VERSION}
                   and headers.get("access-control-allow-origin") == "*", "GET /health failed")
            for path in ("/state", "/health"):
                status, headers, body = fetch("OPTIONS", path)
                expect(status == 204 and body == b"" and headers.get("access-control-allow-origin") == "*"
                       and headers.get("access-control-allow-methods") == "GET, POST, OPTIONS"
                       and headers.get("access-control-allow-headers") == "content-type"
                       and headers.get("access-control-max-age") == "600", f"preflight {path} failed")
            payload = json.dumps({"v": 1, "scene": "typing", "character": "whale", "scale": 1.2,
                                  "animation": False, "updatedAt": 1780000000000, "unknown": "ignored"}).encode()
            status, headers, body = fetch("POST", "/state", payload, {"Content-Type": "application/json"})
            expect(status == 204 and body == b"" and hub.effective_scene() == "typing"
                   and hub.snapshot()[1] == "whale"
                   and headers.get("access-control-allow-origin") == "*", "valid POST /state failed")
            for bad in (b"{not json", json.dumps({"v": 1, "scene": "dancing"}).encode()):
                expect(fetch("POST", "/state", bad, {"Content-Type": "application/json"})[0] == 400,
                       "invalid POST /state was not rejected")
            expect(fetch("GET", "/missing")[0] == 404, "unknown path was not 404")
            expect(fetch("GET", "/health")[0] == 200, "bridge did not survive the bad requests")
            connection.close()
        finally:
            server.stop()
        clock = [1000.0]
        fake = StateHub(clock=lambda: clock[0])
        expect(fake.effective_scene() == "offline", "no payload should show offline")
        fake.publish("working", "girl")
        expect(fake.effective_scene() == "working", "fresh payload was not used")
        clock[0] += DEFAULT_STALE_MS / 1000.0
        expect(fake.effective_scene() == "working", "payload exactly 10 s old should be fresh")
        clock[0] += 0.001
        expect(fake.effective_scene() == "offline", "payload older than 10 s should be offline")
        clock[0] += 30.0
        expect(fake.effective_scene() == "offline", "offline should persist until new data")
        fake.publish("success", "whale")
        expect(fake.effective_scene() == "success" and fake.snapshot()[1] == "whale",
               "new payload should revive the scene")
        elapsed = time.monotonic() - started
        expect(elapsed < 20.0, f"self-test took too long: {elapsed:.1f}s")
        print(f"ok: self-test passed in {elapsed:.2f}s - {decodes} animated decodes, {stills} still decodes, "
              f"{written} evidence PNGs, {checks} checks; evidence: {evidence}")
        return 0
    except SelfTestFailure as exc:
        print(f"self-test FAILED: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 - report any failure clearly
        print(f"self-test ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1

def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.self_test:
        return run_self_test(args)
    assets = resolve_assets(args.assets)
    if not assets.is_dir():
        log(f"assets directory not found: {assets}")
        return 2
    if not display_available():
        log("no display available; the desktop window needs X11 or Wayland.")
        log("use a graphical session or X forwarding; `--self-test` runs headless.")
        return 2
    hub = StateHub(stale_ms=args.stale_ms)
    try:
        server = CompanionServer(hub, args.port)
    except OSError as exc:
        log(f"cannot listen on 127.0.0.1:{args.port}: {exc}")
        log("is another companion already running? use --port to change the bridge.")
        return 1
    prefs_file = config_path()
    prefs, character_saved = load_prefs(prefs_file)
    if args.scale is not None:
        prefs.scale = float(args.scale)
    if args.no_animation:
        prefs.animation = False
    server.start()
    log(f"bridge listening on http://127.0.0.1:{server.port} (127.0.0.1 only)")
    try:
        CompanionApp(hub=hub, prefs=prefs, prefs_path=prefs_file, assets_dir=assets,
                     character_locked=character_saved, lang=args.lang).run()
    except Exception as exc:  # noqa: BLE001 - the window is the only display path
        log(f"cannot create the desktop window: {exc}")
        return 1
    finally:
        server.stop()
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
