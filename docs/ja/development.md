# 開発

[English](../development.md) | [中文](../zh/development.md) | [Русский](../ru/development.md) | [Tiếng Việt](../vi/development.md) | 日本語 | [한국어](../ko/development.md)

## ディレクトリ構造

```text
package.json              bundle manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml          inserts the ui-pixel-companions row
index.js                  Host half (empty apply; the Client module does the work)
client.js                 generated browser bundle (committed, ~94 KiB)
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
src/client/assets.generated.ts  generated asset-route refs (committed, ~11 KiB)
assets/girl/*.webp|png    canonical art (pack v2 style, 15 scenes + 18 reactions)
assets/whale/*.webp|png   canonical v3 matte art (15 scenes + 18 reactions)
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

## コマンド

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build` は 2 つのステップからなり、それぞれ単独でも実行できます：

- `node tools/build-assets.mjs` は `assets/` を走査し、`src/client/assets.generated.ts`
  （約 5 KiB）を
  `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>` 形式の
  プラグインアセットルート参照で書き換えます。クエリはそのファイルの SHA-1 の先頭 8 桁の
  16 進数なので、スプライトが変われば新しい URL になります。キャラクター/シーンに
  `.webp` と `.png` のどちらかが欠けていると失敗します。
- `node tools/build-client.mjs` は TypeScript を esbuild でバンドルし、`react` を external に
  保ち、出力を `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })` で
  包んで `client.js`（約 72 KiB）を書き出します。esbuild の `--check`（`node --check`）に
  よるパースもビルドの一部です。

`npm run assets` は最初のステップだけを実行します。参照だけを更新したいときに使って
ください。

## ブラウザバンドルの形

Harness はすべてのブラウザプラグインをページのモジュールローダー経由で読み込みます：

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

そのため `react` がバンドルされることはありません。コンパイル済みコードは
`require('react')` を呼び、ローダーがシェルのベンダーバンドル（検証済みリリースでは
React 18.3.1）からそれに応答します。2 つ目の React をバンドルするとフックが壊れます。

## スプライトの配信方法

スプライトはバンドルに**埋め込まれません**。`package.json` が `"./assets/*": "./assets/*"` をエクスポートするため、Harness のアセットルートが
パッケージ自身のアートワークを
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>` で配信します。

- `src/client/assets.generated.ts` は画像のバイト列ではなく、それらの参照を保持します。
- `src/client/asset-url.ts` は、存在すればローダーの `require.asset(...)` ヘルパー経由で
  1 つの参照を解決し、そうでなければドキュメント相対の生の参照にフォールバックします。
- ブラウザは起動時に 62 枚の埋め込み画像をパースする代わりに、現在のキャラクター/シーン
  （および変化したときはもう一方のシーン）のスプライトをオンデマンドで取得します。
- 各 URL はコンテンツハッシュに対して不変なので、ブラウザは長期キャッシュできます。
  `?v=<sha1-8>` クエリはファイルが変わったときにそのキャッシュを更新します。

コミット済みの JS バンドルは約 72 KiB のままで、アートワークは `assets/` 以下の普通の
ファイルとして同梱されます。アートワークを変更した後に `npm run build` を実行することが、
マニフェストとバンドルを更新する手段です。

## スロットエントリの仕組み

`src/client/index.ts` は 3 つのエントリを注入します：

| スロット | エントリ | 登録 |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge`（`null` を描画） | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion`（ドラッグ可能なオーバーレイ） | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow`（設定 → 一般） | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock` は、セッションごとの `SessionSnapshot`、`InputState`、Chat
スナップショット、コンポーザーのアクションを受け取る唯一のスロットです。そのため
`CompanionBridge` はそれらのファクト（および `useSessionStatus` の承認待ちフラグ）を
`src/client/bridge.ts` のモジュールストアへ公開します。ブリッジはファクトを浅く差分し、
フィールドが変わったときだけ公開します。入力などのユーザーアクティビティは、シーンを変えずに
アイドルタイマーを更新します（下書きの入力は最大 5 秒に 1 回）。また、確定したアシスタント
ノードごとに完全な回答を一度だけ `CompanionFacts.detail`（8000 文字に制限）へ抽出し、
ターン実行中は `report` と `detail` の両方を凍結して停止時に公開します。`detail` はページ内に
とどまり、デスクトップブリッジを渡ることはありません。アンマウント時には
`useDisconnectOnUnmount` が `connected: false` を公開し、最後のファクトを保持します。
その後オーバーレイは待機/休眠の挙動にフォールバックします。

`shell.overlay` はフレーム全体用なので、`Companion` はすべてのページですべての列の上に
浮かべます。ストアは `useCompanionFacts()` で読み、あわせて `useSessionStatus` も購読し
（会話の外でも承認待ちが見えるのはこのためです）、`deriveScene` でシーンを導出し、ドラッグ
された位置にスプライトを描画します。オーバーレイ層はクリック透過で、ポインタイベントを
受け取るのはスプライト、その歯車ボタン、設定パネルだけです。タブが隠れている間は 1 秒
クロックとデスクトップのヘルスプローブ/ハートビートが停止し、完了レポートは
`role="status"` / `aria-live="polite"` で通知されます。

`settings.general.item` はホスト標準の一般設定リストです。`SizeSettingsRow` は
コンパニオンのサイズ操作（タイトル、説明、スライダー、−/+ ボタン、リアルタイム表示、
50/100/150/200% のプリセット）だけを描画します。ペットのポップオーバーと
`src/client/prefs.ts`（`usePrefs` / `updatePrefs` / `updatePrefsSoon`）を共有するため、
どちらの画面でも即座にもう一方が更新され、両方とも `kappy.pixel-companions.ui.v1` の
`localStorage` に 180 ms のデバウンスと `pagehide` 時のフラッシュ付きで永続化されます。

高頻度のスライダードラッグは `updatePrefsSoon` を呼び、更新をアニメーションフレームごとに
最大 1 回へまとめます（`requestAnimationFrame`、16 ms のタイムアウトによるフォールバック）。
プリセットと −/+ のクリックは `updatePrefs` を使い、無変化のパッチはスキップします。
オーバーレイは、スケール後のスプライトが実際にビューポートから出たときにだけ保存位置を
再クランプします。シーンプレビューのグリッドとデスクトッププレビューのカードは
`React.memo` で包まれ、デスクトップへのミラーリングは約 140 ms にデバウンスされます。

## 編集の手引き

- シーンルール：`src/client/state.ts`、テストは `tests/state.test.ts`。
- 純粋な Chat スナップショット/レポートの射影：`src/client/signals.ts`、テストは
  `tests/signals.test.ts`。
- キャプション、設定の文言、6 言語のリスト：`src/client/text.ts`、テストは
  `tests/text.test.ts`。
- オーバーレイのマークアップ、ポインタによるドラッグ、設定パネル、スタイル：
  `src/client/Pet.tsx`。
- ファクトストア、下書きの差分、ブリッジのライフサイクル：`src/client/bridge.ts`。
- 共有されたクライアントローカルの設定（`usePrefs` / `updatePrefs` /
  `updatePrefsSoon`）：`src/client/prefs.ts`。
- 設定 → 一般のサイズ行：`src/client/SizeSettingsRow.tsx`。
- アセットルートの解決：`src/client/asset-url.ts`。
- オプションのデスクトップブリッジ（`useDesktopBridge`、ポート、プローブ/ハートビートの
  タイミング）：`src/client/desktop.ts`。
- デスクトップウィンドウ、右クリックメニュー、設定、HTTP ブリッジ：
  `desktop/companion.py`。
- スロット登録とモジュール id：`src/client/index.ts`。

変更したら、`npm run build` を実行してからページを再読み込みします。プロファイルが
`link:` インストールを使っている場合、再ビルドされた `client.js` が直接配信され、HMR
トランスポートがそれを差し替えます。設定とドラッグした `position` は `localStorage` の
`kappy.pixel-companions.ui.v1` にあり、初回起動の状態を再現するにはそのキーを消去します。
`position` が `null` のときの自動位置は右下で、ウィンドウの右端から 96 px、下端から
150 px の位置です。リサイズ時に再クランプされ、**位置をリセット**すると `position` は
`null` に戻ります。

## アートワークの編集

`assets/` が正であり、現在は v3 のアートワーク更新を保持しています。キャラクターごとに
15 のシーンスプライト（アニメーション WebP + 静止 PNG、透明付き 192×128 RGBA）に加え、
Deepy 用のオプションの `assets/whale/roaming.{webp,png}` 移動用ビジュアルがあります。
マニフェストとバンドルは通常のビルド経由でのみ再生成してください：

1. `assets/<character>/<scene>.webp`（アニメーション）と
   `assets/<character>/<scene>.png`（静止）を置き換えるか追加します。どちらも透明背景の
   192×128 です。
2. `npm run build` を実行します。`tools/build-assets.mjs` がコンテンツハッシュ付きの参照を
   書き換え、`tools/build-client.mjs` が `client.js` を再ビルドします。
3. `assets/`、再生成された `src/client/assets.generated.ts`、`client.js` をコミットします。

`src/client/assets.generated.ts` と `client.js` を手で編集しないでください。ビルドがそれらを
所有しています。

スプライトは埋め込まれずアセットルートから配信されるため、コミット済みの `client.js` は
約 72 KiB のままです。画像はパッケージからシーンごとに取得され、不変としてキャッシュ
されます。`?v=<sha1-8>` のハッシュはファイル内容に応じて変わるので、ブラウザは名前を変え
なくても新しいアートワークを拾います。

**注意：** `tools/build_assets.py` と `source-art/` の 8 つの GIF は、**以前の v3 前**の
アートワーク生成を再現します。v3 更新後は `assets/` が正なので、そのジェネレーターを実行
するとアートが巻き戻ります。巻き戻すつもりがない限り実行しないでください。通常の変更は
`npm run build` だけを通してください。

## テスト

`npm test` はすべての `tests/*.test.ts` を Node のテストランナーで実行します：

- `tests/state.test.ts` — `deriveScene` とシーンルールの 8 テスト。
- `tests/signals.test.ts` — `liveBits`、`streamOf`、`cleanReport`、`lastResponse`、
  `lastAssistantNode`、`assistantText`、`MAX_DETAIL` の上限、`clampScale` の範囲処理の
  8 テスト。
- `tests/text.test.ts` — 4 テスト：すべてのシーンが 6 言語すべてでキャプションを持つこと、
  すべての UI 文字列が 6 言語すべてに存在すること、シーンごとにキャプションが異なること、
  `languageFromTag` のマッピングとフォールバック。

合計 20 テストです。デスクトップ側の半分は独自のヘッドレス `--self-test` を維持しています
（0.5、1.0、2.0 のスケールで 92 のアニメーションデコード、31 の静止デコード、260 の
チェック）。

## パッケージング

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files` にはビルド済みの `client.js`、`assets/`、ソース、ツール、demo、desktop、
ドキュメント（英語と `docs/zh/`）、`README.md`、`README.zh.md`、6 つの `locale/*.json` が
含まれます。`source-art/`、`node_modules/`、テスト専用の成果物は含まれません。`assets/`
ツリーは必ず同梱する必要があります。アセットルートがインストール済みパッケージから配信する
ためです。tarball は `dsh plugin --profile web add <tgz>` でインストールします。

## リリースチェックリスト

1. `npm run build` と `npm test`（20 テスト）。
2. `python3 -m py_compile desktop/companion.py` と
   `python3 desktop/companion.py --self-test`。
3. `npm pack --dry-run`：`client.js`、`assets/**`、`locale/*.json`（6 言語）、
   `icon.svg`、`README.md`、`README.zh.md`、`docs/**`、`desktop/**`、`LICENSE`、
   `ASSETS_NOTICE.md` が含まれていること。
4. tarball または `link:` のチェックアウトを `web` プロファイルへインストールし、再読み込み
   します。コンパニオンが会話ページ、設定、プラグインページに表示され、スプライトが
   アセットルートから読み込まれる（ネットワークパネルに 404 がない）ことを確認します。
5. コンパニオンをドラッグし、ページを再読み込みして位置が復元されることを確認します。
   ウィンドウをリサイズしてクランプされたままであることを確認し、**位置をリセット**を
   使ってみます。
6. 設定パネルを開き、6 言語、アニメーションのオン/オフ、表示のオン/オフ、サイズスライダーと
   50/100/150/200% のプリセットチップ、15 シーンのプレビュー、Escape で閉じる動作、両方の
   テーマモードを確認します。**設定 → 一般**を開き、**コンパニオンの大きさ**の行が同じ操作を
   表示し、ポップオーバーと同期していることを確認します。
7. オプションのデスクトップウィンドウ：`python3 desktop/companion.py` を実行し、
   **デスクトップウィンドウ**にチェックを入れ、行が**接続済み**になること、ウィンドウが
   シーンをミラーリングすること、右クリックメニュー（キャラクター、アニメーション、サイズ、
   常に手前、リセット、隠す、終了）が動作することを確認します。
8. `package.json` の `version` を上げ、`package.json`、再生成された `client.js`、
   `src/client/assets.generated.ts`、および変更したドキュメントをまとめてコミットします。
