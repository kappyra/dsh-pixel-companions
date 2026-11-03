# 开发

[English](../development.md) | 中文 | [Русский](../ru/development.md) | [Tiếng Việt](../vi/development.md) | [日本語](../ja/development.md) | [한국어](../ko/development.md)

## 目录结构

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

## 命令

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build` 分两步，每一步也可以单独运行：

- `node tools/build-assets.mjs` 扫描 `assets/` 并重写 `src/client/assets.generated.ts`
  （约 11 KiB），写入形如
  `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>` 的插件
  素材路由引用。查询串是文件 SHA-1 的前 8 个十六进制字符，因此改变的精灵会得到新 URL。
  如果某个角色/场景缺少 `.webp` 或 `.png`，它会失败。
- `node tools/build-client.mjs` 用 esbuild 打包 TypeScript，保持 `react` external，
  把输出包装进 `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })`，
  并写入 `client.js`（约 94 KiB）。esbuild 的 `--check`（`node --check`）解析是构建的
  一部分。

`npm run assets` 只运行第一步；当你只需要刷新引用时使用它。

## 浏览器 bundle 的形态

Harness 通过页面的模块加载器加载每个浏览器插件：

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

因此 `react` 绝不打包：编译后的代码调用 `require('react')`，加载器从 shell 的 vendor
bundle 中应答（验证过的版本中为 React 18.3.1）。打包第二份 React 会破坏 hooks。

## 精灵如何交付

精灵**不再内嵌**在 bundle 中。`package.json` 导出了 `"./assets/*": "./assets/*"`，因此
Harness 素材路由会从包自身提供美术资源：
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`。

- `src/client/assets.generated.ts` 保存这些引用，而不是图像字节。
- `src/client/asset-url.ts` 在加载器提供 `require.asset(...)` 辅助函数时用它解析引用，
  否则回退到原始的文档相对引用。
- 浏览器按需为当前角色/场景获取精灵（场景变化时也获取另一个），而不是在启动时解析 134 张
  内嵌图片。
- 每个 URL 对其内容哈希而言是不可变的，因此浏览器可以长期缓存；当文件变化时，
  `?v=<sha1-8>` 查询串会使该缓存失效。

已提交的 JS bundle 保持在约 94 KiB；美术资源作为普通文件放在 `assets/` 下。素材变化后
运行 `npm run build` 才会更新清单和 bundle。

## 槽位条目如何工作

`src/client/index.ts` 注入三个条目：

| 槽位 | 条目 | 注册参数 |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge`（渲染 `null`） | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion`（可拖动 overlay） | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow`（设置 → 通用） | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock` 是唯一接收按会话 `SessionSnapshot`、`InputState`、Chat
snapshot 和输入框动作的槽位，因此 `CompanionBridge` 把这些事实（外加
`useSessionStatus` 的待处理交互标志）发布到 `src/client/bridge.ts` 的模块 store 中。
bridge 对事实做浅比较，只在字段变化时发布；输入等用户活动会刷新闲置计时器（打草稿最多每 5 秒一次），但不改变场景。
它还会为每个已完成的助手节点提取一次完整回答到 `CompanionFacts.detail`（上限 8000
字符），并在轮次运行期间冻结 `report` 和 `detail`，在停止时发布；`detail` 只留在页面中，
绝不会通过桌面 bridge 发送。卸载时 `useDisconnectOnUnmount` 发布 `connected: false` 并
保留最后的事实；overlay 随后回退到闲置/睡眠行为。

`shell.overlay` 横跨整个窗口，因此 `Companion` 可以浮在每个页面的所有列之上。它通过
`useCompanionFacts()` 读取 store，也订阅 `useSessionStatus`（因此待批准的交互在对话之外
仍然可见），用 `deriveScene` 推导场景，并在拖动后的位置绘制精灵。overlay 层可点击穿透；
只有精灵、它的齿轮按钮和设置面板接收指针事件。当标签页隐藏时，1 秒时钟和桌面健康探测/
心跳会暂停；完成报告通过 `role="status"` / `aria-live="polite"` 向屏幕阅读器播报。

`settings.general.item` 是宿主标准的「设置 → 通用」列表。`SizeSettingsRow` 只渲染伴侣
大小控件（标题、描述、滑块、−/+ 按钮、实时读数和 50/100/150/200% 预设按钮）。它与宠物
弹层共用 `src/client/prefs.ts`（`usePrefs` / `updatePrefs` / `updatePrefsSoon`），因此
任一界面都会立即更新另一处，并且两者都以 180 ms 防抖和 `pagehide` 刷新持久化到
`localStorage` 的 `kappy.pixel-companions.ui.v1` 中。

高频的滑块拖动调用 `updatePrefsSoon`，把更新合并为每个动画帧最多一次
（`requestAnimationFrame`，16 ms 超时回退）；预设按钮和 −/+ 点击使用 `updatePrefs`，
它会跳过无变化的补丁。overlay 只在缩放后的精灵真正离开视口时才重新限制保存的位置，
场景预览网格和桌面预览卡包裹在 `React.memo` 中，桌面镜像约做 140 ms 防抖。

## 修改行为

- 场景规则：`src/client/state.ts`，测试在 `tests/state.test.ts`。
- 纯 Chat snapshot/报告投影：`src/client/signals.ts`，测试在
  `tests/signals.test.ts`。
- 字幕、设置文案和六语言列表：`src/client/text.ts`，测试在
  `tests/text.test.ts`。
- Overlay 标记、指针拖动、设置面板、样式：`src/client/Pet.tsx`。
- 事实 store、草稿差异比较和 bridge 生命周期：`src/client/bridge.ts`。
- 共享的客户端本地偏好（`usePrefs` / `updatePrefs` / `updatePrefsSoon`）：
  `src/client/prefs.ts`。
- 设置 → 通用 的大小行：`src/client/SizeSettingsRow.tsx`。
- 素材路由解析：`src/client/asset-url.ts`。
- 可选的桌面 bridge（`useDesktopBridge`、端口、探测/心跳间隔）：
  `src/client/desktop.ts`。
- 桌面窗口、右键菜单、偏好和 HTTP bridge：`desktop/companion.py`。
- 槽位注册和模块 id：`src/client/index.ts`。

修改后：`npm run build`，然后重新加载页面。如果配置档使用 `link:` 安装，重新构建的
`client.js` 会直接提供，HMR 传输会换入它。偏好和拖动后的 `position` 位于
`localStorage` 的 `kappy.pixel-companions.ui.v1` 下；清除该键可复现首次运行状态。当
`position` 为 `null` 时，自动位置是右下角，距窗口右边缘 96 px、距底部边缘 150 px，并在
缩放时重新限制；**重置位置**会把 `position` 设回 `null`。

## 编辑素材

`assets/` 是规范的，目前包含 v3 素材更新和 v4 反应：每个角色 15 个场景精灵和 18 个反应
动画（动画 WebP + 静止 PNG，192×128 RGBA、透明），外加 Deepy 可选的
`assets/whale/roaming.{webp,png}` 移动视觉。只通过
正常构建来重新生成清单和 bundle：

1. 替换或添加 `assets/<character>/<scene>.webp`（动画）和
   `assets/<character>/<scene>.png`（静止），两者都是 192×128、透明背景。
2. 运行 `npm run build` —— `tools/build-assets.mjs` 重写带内容哈希的引用，
   `tools/build-client.mjs` 重新构建 `client.js`。
3. 提交 `assets/`、重新生成的 `src/client/assets.generated.ts` 和 `client.js`。

不要手工编辑 `src/client/assets.generated.ts` 或 `client.js`；它们由构建生成。

由于精灵由素材路由提供而不是内嵌，已提交的 `client.js` 保持在约 94 KiB；图像按场景从包中
获取并不可变缓存。`?v=<sha1-8>` 哈希会随文件内容变化，因此浏览器无需重命名就能获得新
素材。

**注意：** `tools/build_assets.py` 和 `source-art/` 中的八个 GIF 重现的是**更早的
pre-v3** 素材生成流程。v3 更新后 `assets/` 是规范的，运行那个生成器会还原素材。除非你
打算还原，否则不要运行它；正常改动只走 `npm run build`。

## 测试

`npm test` 使用 Node 的测试运行器运行每个 `tests/*.test.ts`：

- `tests/state.test.ts` —— 8 个针对 `deriveScene` 和场景规则的测试。
- `tests/signals.test.ts` —— 8 个针对 `liveBits`、`streamOf`、`cleanReport`、
  `lastResponse`、`lastAssistantNode`、`assistantText`、`MAX_DETAIL` 上限和
  `clampScale` 范围处理的测试。
- `tests/text.test.ts` —— 5 个测试：每个场景在六种语言中都有字幕、每个 UI 字符串在六种
  语言中都存在、每条互动台词在六种语言中都存在、每个场景的字幕互不相同，以及
  `languageFromTag` 的映射/回退。
- 反应映射套件 —— 7 个测试，覆盖单击/双击映射、持久状态以及两个角色各自的精灵对。

合计 28 个测试。桌面半边保留自己的无头 `--self-test`（92 个动画解码，覆盖 0.5、1.0 和
2.0 缩放，31 个静止解码、260 项检查）。

## 打包

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files` 包含构建好的 `client.js`、`assets/`、源码、工具、demo、desktop、文档（英文和
`docs/zh/`）、`README.md`、`README.zh.md`，以及六个 `locale/*.json` 文件；不包含
`source-art/`、`node_modules/` 或仅测试用的产物。`assets/` 树必须随包发布：素材路由从
已安装的包中提供它。压缩包用 `dsh plugin --profile web add <tgz>` 安装。

## 发布检查清单

1. `npm run build` 和 `npm test`（28 个测试）。
2. `python3 -m py_compile desktop/companion.py` 和
   `python3 desktop/companion.py --self-test`。
3. `npm pack --dry-run`：确认存在 `client.js`、`assets/**`、`locale/*.json`（六种
   语言）、`icon.svg`、`README.md`、`README.zh.md`、`docs/**`、`desktop/**`、
   `LICENSE`、`ASSETS_NOTICE.md`。
4. 把压缩包或 `link:` 检出安装到 `web` 配置档并重新加载。确认伴侣出现在对话页、设置页
   和插件页，并且精灵从素材路由加载（网络面板中没有 404）。
5. 拖动伴侣，重新加载页面，确认位置被恢复；缩放窗口，确认它保持在窗口内；使用
   **重置位置**。
6. 打开设置面板检查六种语言、动画开/关、显示开/关、大小滑块和 50/100/150/200% 预设按钮、
   15 场景预览、Escape 关闭以及明暗两种主题。打开**设置 → 通用**，确认**伴侣大小**行显示
   相同的控件，并与弹层保持同步。
7. 可选桌面窗口：运行 `python3 desktop/companion.py`，勾选**桌面窗口**，确认该行显示
   **Connected**、窗口镜像场景，右键菜单（角色、动画、大小、置顶、重置、隐藏、退出）
   工作正常。
8. 提升 `package.json` 中的 `version`；提交 `package.json`、重新生成的 `client.js`、
   `src/client/assets.generated.ts` 和所有改动过的文档一起提交。
