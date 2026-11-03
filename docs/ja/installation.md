# インストール

[English](../installation.md) | [中文](../zh/installation.md) | [Русский](../ru/installation.md) | [Tiếng Việt](../vi/installation.md) | 日本語 | [한국어](../ko/installation.md)

`dsh-pixel-companions` は dsh の**バンドルパッケージ**です。何もしない Host 側の半分と、
フレーム全体用 `shell.overlay` スロットにコンパニオンを描画するブラウザ側の半分
（`client.js`）を持ちます。そのため、dsh プロファイルへインストールし、実行中の
`dsh web` プロセスから配信する必要があります。

ビルド済みの `client.js` と `assets/` 以下のアートワークはリポジトリにコミットされています。
Harness のアセットルートがインストール済みパッケージからそれらのファイルを配信するため、
インストールに**ビルド手順**は不要で、Node ツールチェーンも要りません。

## 動作要件

- 初期化済みの Web プロファイルを持つ `dsh` CLI（`dsh web`）。プロファイルディレクトリは
  `$DSH_HOME/profiles/web` で、`$DSH_HOME` の既定値は `~/.dsh` です。
- `PATH` 上の `pnpm`。`dsh plugin` は引数をプロファイルディレクトリ内で pnpm に転送します。
- Node.js 22.6+ はバンドルをソースから再ビルドする場合にのみ必要です。
- オプションのデスクトップウィンドウには、同じマシン上で GTK 3 と Pillow を備えた
  Python 3.10+ が必要です。詳しくは [desktop.md](desktop.md) を参照してください。

## ローカルチェックアウトからインストール

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

- `link:` はチェックアウトをコピーせず pnpm リンクとしてインストールするため、
  チェックアウト内の編集は再インストールなしで配信されます。
- 絶対パスでも動作します：`dsh plugin --profile web add /path/to/dsh-pixel-companions`。
- バンドルを追加すると、プロファイルの `package.json` にある `dsh.profile.bundles` へ
  パッケージ名が追記されます。これが有効化の実体です。

## Git アドレスまたは tarball からインストール

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or
npm pack
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Git からのインストールはコミット済みの `client.js` を取得するだけで、インストール先の
マシンではビルドが走りません。パッケージはインストールスクリプトを宣言していないため、
pnpm がビルドスクリプトの承認を求めることはありません。

## 有効化

`dsh plugin` はプロファイルを書き換えますが、実行中の Host を再起動しません。出荷時の
Web プロファイルでは `dsh-hmr` トランスポートがプロファイルの変更に追随し、通常は
1〜2 秒以内にページが新しいバンドルを取り込みます。そうならない場合は：

1. Web ページを再読み込みします（迷ったらハードリロード）。
2. それでもコンパニオンが現れない場合は、Web プロセスを再起動して（`Ctrl+C` のあと
   `dsh web`）から再読み込みします。

再読み込み後、コンパニオンはウィンドウの右下付近、コンポーザー領域の上に現れます。
フレーム全体を覆うオーバーレイに存在するため、Web GUI の**すべてのページ**（会話・設定・
プラグイン）で表示され、ページ移動をまたいで残ります。ページ間を移動してもアンマウント
されず、バンドルが再実行されるのは完全なリロードのときだけです。開いている会話は必要
ありません。セッションがマウントされていない場合、コンパニオンは待機/休眠の挙動に
フォールバックします。マウスの左ボタン、タッチ、ペンでウィンドウ内のどこへでもドラッグ
でき、その横の歯車ボタンが設定パネルを開きます。

## 検証

- **設定 → プラグイン → プラグイン一覧**に、`locale/*.json` 由来のこの説明を持つ
  `Pixel companions` というエントリが表示されます。
- コンパニオンがコンポーザーの上だけでなく、すべてのページ（会話・設定・プラグイン）で
  見えます。
- ドラッグすると動き、ウィンドウの端付近で離しても画面内に残ります。ページを再読み込み
  すると、ドラッグ後の位置が復元されます。
- 歯車を開くと、キャラクター、サイズ、言語、アニメーション、表示、位置をリセット、
  15 シーンのプレビューグリッド、自動、閉じるを備えた設定パネルが開きます。
- Host がバンドルを構成に含めています：`dsh --profile web --dump-config` に
  `dsh-pixel-companions` の行が表示されます。
- 非表示のファクトブリッジはコンポーザーに可視 DOM を追加しません。描画するのは
  オーバーレイだけです。
- *（オプション）* デスクトップウィンドウを起動し、**デスクトップウィンドウ**を有効に
  すると、歯車パネルの行が**接続済み**になり、ウィンドウが現在のシーンをミラーリング
  します。

## オプション：デスクトップウィンドウ

コンパニオンは、同じマシン上のスタンドアロンのデスクトップウィンドウへミラーリングすること
もできます。これは別のバンドルではなく独立した Python プロセスで、プロファイルに余分な
ものは何もインストールされません：

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

そのうえで、コンパニオンの歯車パネルで**デスクトップウィンドウ**にチェックを入れます。
既定ではオフなので、有効にするまでページがデスクトップのポートを調べることはありません。
ライブ状態のためにはページを開いたままにする必要があり、両方の半分は同じホスト上で
動かす必要があります（ブリッジはループバック専用です）。詳しいガイド：
[desktop.md](desktop.md)。

## 無効化・アンインストール・アップグレード

- **アンインストールせずに無効化**：設定 → プラグインでバンドルを切り替えるか、
  `$DSH_HOME/profiles/web/package.json` の `dsh.profile.bundles` から削除します。
  コンパニオンはすべてのページから消えます。
- **アンインストール**：`dsh plugin --profile web remove dsh-pixel-companions`、または
  プラグインページから行います。
- **リンクしたチェックアウトのアップグレード**：`git pull` のあと
  `npm install && npm run build` を実行して再読み込みします。HMR トランスポートが
  再ビルドされた `client.js` を差し替えます。`package.json` の変更には Host の再起動が
  必要です。
- **Git インストールのアンインストール**：`dsh plugin --profile web remove dsh-pixel-companions`
  で依存関係とバンドルエントリが削除されます。

## CLI の代わりにプラグインページを使う

Web のプラグインページも同じ pnpm の経路でインストールします：

1. サイドバー → **プラグイン**。
2. **プラグインを追加**（または矢印 → **サードパーティプラグインをインストール**）。
3. `dsh plugin add` に渡すのと同じ spec を入力します。
4. **インストール**、続いて**今すぐ有効化**。

## アクティベーション失敗時のトラブルシューティング

- pnpm の出力とインストールログは
  `$DSH_HOME/profiles/web/.plugin-manager/logs/` に保持されます。
- 失敗した実行はプロファイルの `package.json` とロックファイルを復元します。
- ページが「loaded without registering」バンドル（Client モジュールを登録せずに読み込まれた
  バンドル）を報告する場合は、`client.js` が
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` で始まっていること、および
  `package.json` のパッケージ名がモジュール id と等しいままであることを確認してください。
