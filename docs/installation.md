# Installation

English | [中文](zh/installation.md) | [Русский](ru/installation.md) | [Tiếng Việt](vi/installation.md) | [日本語](ja/installation.md) | [한국어](ko/installation.md)

`dsh-pixel-companions` is a dsh **bundle package**. It has a Host half that does nothing
and a browser half (`client.js`) that draws the companion in the frame-wide
`shell.overlay` slot, so it must be installed into a dsh profile and served by a running
`dsh web` process.

The built `client.js` and the artwork under `assets/` are committed in the repository; the
Harness asset route serves those files from the installed package, so installing needs
**no build step** and no Node toolchain.

## Requirements

- The `dsh` CLI with an initialized Web profile (`dsh web`). The profile directory is
  `$DSH_HOME/profiles/web`, where `$DSH_HOME` defaults to `~/.dsh`.
- `pnpm` on `PATH`. `dsh plugin` forwards its arguments to pnpm in the profile directory.
- Node.js 22.6+ only to rebuild the bundle from source.
- The optional desktop window needs Python 3.10+ with GTK 3 and Pillow on the same
  machine; see [desktop.md](desktop.md).

## Install from a local checkout

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

- `link:` installs the checkout as a pnpm link instead of copying it, so edits in the
  checkout are served without reinstalling.
- An absolute directory also works: `dsh plugin --profile web add /path/to/dsh-pixel-companions`.
- Adding a bundle appends its package name to `dsh.profile.bundles` in the profile's
  `package.json`, which is what enables it.

## Install from a Git address or a tarball

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or
npm pack
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

A Git install fetches the committed `client.js`; no build runs on the installing machine.
The package declares no install scripts, so pnpm should not ask for build-script approval.

## Activate

`dsh plugin` writes the profile; it does not restart a running Host. On the shipped Web
profile the `dsh-hmr` transport follows profile changes and the page picks the new bundle
up, usually within a second or two. If it does not:

1. Reload the Web page (hard reload if in doubt).
2. If the companion still does not appear, restart the Web process (`Ctrl+C`, then
   `dsh web`) and reload.

After the reload the companion appears near the bottom-right of the window, above the
composer area. It lives in the frame-wide overlay, so it is visible on **every page** of
the Web GUI — conversation, Settings, Plugins — and it survives page navigation: moving
between pages does not unmount it, only a full reload re-runs the bundle. An open
conversation is not required; with no session mounted the companion falls back to its
idle/sleeping behaviour. Drag it anywhere in the window with the left mouse button, touch,
or a pen; the gear button beside it opens the settings panel.

## Verify

- **Settings → Plugins → Plugin list** shows an entry named `Pixel companions` with this
  description (from `locale/*.json`).
- The companion is visible on every page (conversation, Settings, Plugins), not only
  above the composer.
- Dragging it moves it; releasing near a window edge keeps it on-screen; a page reload
  restores the dragged position.
- The gear opens the settings panel with Character, Scale, Language, Motion, Visible,
  Reset position, the 15-scene preview grid, Auto, and Close.
- The Host composed your bundle: `dsh --profile web --dump-config` lists a row for
  `dsh-pixel-companions`.
- The hidden facts bridge adds no visible DOM to the composer; only the overlay draws.
- *(Optional)* With the desktop window running and **Desktop window** enabled, the gear
  panel row reads **Connected** and the window mirrors the current scene.

## Optional: desktop window

The companion can also be mirrored to a standalone desktop window on the same machine. It
is a separate Python process, not another bundle — nothing extra is installed into the
profile:

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

Then tick **Desktop window** in the companion's gear panel. It is off by default, so the
page never probes the desktop port until you enable it. The page must stay open for live
state, and both halves must run on the same host (the bridge is loopback-only). Full guide:
[desktop.md](desktop.md).

## Disable, uninstall, upgrade

- **Disable** without uninstalling: toggle the bundle in Settings → Plugins, or remove it
  from `dsh.profile.bundles` in `$DSH_HOME/profiles/web/package.json`. The companion
  disappears from every page.
- **Uninstall**: `dsh plugin --profile web remove dsh-pixel-companions`, or the Plugins
  page.
- **Upgrade a linked checkout**: `git pull`, then `npm install && npm run build` and
  reload; the HMR transport swaps the rebuilt `client.js`. A `package.json` change needs
  a Host restart.
- **Uninstall a Git install**: `dsh plugin --profile web remove dsh-pixel-companions`
  removes the dependency and the bundle entry.

## Plugins page instead of the CLI

The Web Plugins page installs through the same pnpm path:

1. Sidebar → **Plugins**.
2. **Add plugin** (or the arrow → **Install a third-party plugin**).
3. Enter the same spec you would pass to `dsh plugin add`.
4. **Install**, then **Enable now**.

## Troubleshooting a failed activation

- pnpm output and an install log are kept under
  `$DSH_HOME/profiles/web/.plugin-manager/logs/`.
- A failed run restores the profile's `package.json` and lockfile.
- If the page reports a bundle that "loaded without registering" the Client module, check
  that `client.js` starts with
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` and that the package name
  in `package.json` still equals the module id.
