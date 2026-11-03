# Using Pixel Companions

English | [中文](zh/usage.md) | [Русский](ru/usage.md) | [Tiếng Việt](vi/usage.md) | [日本語](ja/usage.md) | [한국어](ko/usage.md)

I wrote this page as the day-to-day guide for my plugin. If the plugin is not installed yet, start with
[installation.md](installation.md); the whole install is one `dsh plugin` command and a
page reload. Everything below happens in the browser; the optional desktop window is
covered at the end.

## First run

After the bundle is installed and the page is reloaded, the companion appears near the
bottom-right of the window, above the composer area. It is drawn in the official
frame-wide `shell.overlay` slot, so it stays visible in a conversation, in Settings and on
the Plugins page, and it survives page navigation. You do not need an open conversation:
with no session the companion simply idles and sleeps.

The small caption above the sprite names the scene in your language. Hover the sprite to
show the gear button (⚙) and, when a conversation is open, the message box.

## Move it

Drag the sprite itself with the left mouse button, a finger, or a pen. A press that moves
less than a few pixels is a click, not a drag: one click reacts to the current scene, a
quick second click gets the stronger reaction, and a right-click opens the settings panel
(the gear button and Shift+F10 do the same).

The position is kept inside the window, re-checked when the window resizes or the
companion changes size, and saved in this browser's `localStorage` under
`kappy.pixel-companions.ui.v1`; a page reload restores it. If the companion ends up
somewhere awkward, open the gear panel and choose **Reset position** to return it to the
automatic bottom-right spot.

## Interactions

The companion reacts to your attention, but a reaction never changes the session, the
error signal, or the completion report.

- One left-click: a gentle, context-aware reaction — petting, a startled look, a pleading
  face while it waits, a cheer when the turn is done, and so on.
- Double left-click: the stronger reaction — annoyed while typing or working, disturbed
  while reading or debugging, shy when idle, angry when woken from sleep.
- Right-click: opens the settings panel; the gear button and Shift+F10 do the same.
- Error: the companion cries. One click comforts it into a cute teary expression, and the
  tear tracks stay until the error clears.
- Ten minutes of real agent work: it looks exhausted; clicking gives an emotional
  reaction, double-clicking gets an angry one.
- Reactions are temporary and return to the agent's scene. With reduced motion or motion
  off they use still PNG frames, and the dialogue under the sprite is localized in all six
  languages.

## Send a quick message

With a conversation open, hover the companion or the completion report: the message box
appears directly under the report (or under the companion when no report is visible). Type
up to 2000 characters and press **Enter** or the ➤ button to send it to the current
session. **Escape** clears the box and closes it.

Your main composer draft is restored after sending, and typing here never changes the
companion's scene. The box is hidden while dragging and while the settings panel is open;
it needs an open conversation.

## Read the answer report

When a turn finishes, the companion switches to its done scene and keeps a **sticky**
report under it: the first line of the final answer plus a **Details** button. It stays
until you hover the companion (about 0.3 s of dwell) or a new turn starts, so you never
miss it while looking away.

**Details** opens a scrollable panel with the full final answer as plain text: line breaks
preserved, at most 8000 characters, no HTML or Markdown rendering. Close it with the ✕
button, **Escape**, or a click outside. While the panel is open it replaces the
report/input card. The answer text stays in the page; only the scene is mirrored to the
optional desktop window.

## Change its size

There are two entry points for the same preference, and they stay in sync:

- the gear panel's **Size** slider;
- **Settings → General → Companion size**.

The slider runs from 50% to 200% in 5% steps; there are − / + buttons, a live percentage
and 50/100/150/200% preset chips. The sprite renders at its real scaled pixel size (152×98
at 100%), and the hit area, caption, report column and details panel follow it. Changing
the size re-clamps the saved position automatically.

## Character, language, motion, visibility

The gear panel also holds the character (**Lumi** or **Deepy**), the interface language,
motion on/off (animated WebP or a still PNG), a visibility switch, and a 15-scene preview
grid with **Auto** for testing. The first run follows `navigator.language`; the language you
pick also switches the companion's captions. Turning motion off is the quickest way to
save battery on a laptop.

## Optional desktop window

The same sprite can also float outside the browser in a small always-on-top GTK window on
the same machine. It is off by default and needs Python 3 with GTK 3 and Pillow:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py
```

Tick **Desktop window** in the gear panel; the row shows **Connected**, **Not running**, or
**Off**. The bridge listens on `127.0.0.1:37421` only and carries the scene, character,
scale and animation flag — never prompts, drafts, messages, session ids or model output.
Right-click the desktop window for its menu (character, size, always on top, reset position,
hide for an hour, quit). The page must stay open for live updates. Full guide:
[desktop.md](desktop.md).

## Turn it off

- Hide the sprite without uninstalling: gear panel → **Visible** off, or **Settings →
  Plugins**.
- Disable the bundle: Settings → Plugins, or remove it from `dsh.profile.bundles`.
- Uninstall completely: `dsh plugin --profile web remove dsh-pixel-companions`. The UI
  returns to stock; no files outside the profile are touched.
- The desktop window is a separate process: quit it from its right-click menu.

## What it does and does not see

The companion reads only public slot props: the session's running state, the current
input phase, pending interactions, error flags, and the settled assistant answer that is
already shown in the conversation. It never reads prompt text or your composer draft, and
it makes no network calls beyond its own asset route and the opt-in localhost desktop
bridge. Details and reports stay in the page. If you never enable the desktop window, the
page never contacts the desktop port.

## Keyboard and accessibility

The sprite and the gear are regular focusable buttons: **Tab** reaches them, **Enter** or
**Space** opens the settings panel. **Escape** closes the panel and the details view, and an
outside click does the same. The slider and selects are keyboard operable, the report is
announced with `aria-live`, and the details panel is a labelled dialog.

Troubleshooting: [troubleshooting.md](troubleshooting.md). Scene rules:
[scenes.md](scenes.md).
