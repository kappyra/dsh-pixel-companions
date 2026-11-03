# Assets and reuse

## Code

The plugin code in this repository — `index.js`, `client.js` (generated),
`src/**`, `tools/**`, `tests/**`, `demo/index.html`, `cordis.patch.yml`, the locale
files, and the icon — is released under the MIT license in [LICENSE](LICENSE).

## Artwork

The mascot artwork — everything under `assets/` and `source-art/`, the rendered
previews under `demo/`, and the sprite files the plugin loads through the Harness asset
route from `assets/` (referenced by `src/client/assets.generated.ts`) — was created for
this project, including AI-assisted generation and animation work. It is distributed with
the project so the plugin works out of the box.

The artwork is **not** covered by the MIT grant that applies to the code. The project
owner retains all rights to it. Do not reuse the mascot artwork in another product
without permission; if you fork the plugin, replace `assets/` with artwork you own and
run `npm run build`.

## Trademarks

DeepSeek and DeepSeek Harness are trademarks of their respective owner. This is an
unofficial community plugin; it is not affiliated with, sponsored by, or endorsed by
DeepSeek. The plugin only uses the public DeepSeek Harness Web plugin APIs (slot
registration, locale metadata, and the browser module loader).

## Third-party code

The build uses [`esbuild`](https://esbuild.github.io/) (MIT) as a development
dependency only. The generated `client.js` contains no third-party code: React is
resolved at runtime from the Harness page's own module table and is never bundled.
