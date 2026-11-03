# 兼容性说明

[English](../compatibility.md) | 中文 | [Русский](../ru/compatibility.md) | [Tiếng Việt](../vi/compatibility.md) | [日本語](../ja/compatibility.md) | [한국어](../ko/compatibility.md)

项目最初是一个源码检出原型：两个 workspace 包，复制进 `deepseek-harness` 克隆并用
tsdown/tsc 构建。这个仓库是**可安装形态**，已在运行中的 Harness 安装上验证。伴侣后来从
输入框 dock 移到横跨整个窗口的 overlay，并获得了可拖动摆放、六种界面语言和可选的桌面窗口；
这些改动将在下文说明，并在依赖用户窗口的地方标注。

## 已验证环境

| 项目 | 值 |
| --- | --- |
| Harness 版本 | `0.2.2-alpha.2`（提交 `d21f653`），已安装 CLI，`web` 配置档 |
| 页面 React | `18.3.1`（shell vendor bundle，共享模块表） |
| 验证方式 | 通过插件管理器安装，Client 模块已加载，槽位条目处于活动状态 |

针对可安装 bundle 实际检查过的内容：

- 包能安装到配置档，并报告 `application: applied`；bundle 被追加到
  `dsh.profile.bundles`。
- bundle 作为
  `{"id":"dsh-pixel-companions","immediately":true,...}` 出现在组合后的 Web 启动图中，
  其通过 `/plugins/??dsh-pixel-companions/client.js&rev=…` 提供的字节与仓库中的
  `client.js` 一致。
- Client 模块通过模块加载器加载，实时界面中两个条目都处于活动状态：`shell.overlay` →
  `kappy-pixel-companions`（order 50）和 `conversation.input.dock` →
  `kappy-pixel-companions.bridge`（order 80）。
- `node tools/build-client.mjs` 能重现已提交的 `client.js`（约 94 KiB），且
  `npm test` 运行 28 个测试——8 个场景规则、8 个纯辅助函数测试（含 `clampScale` 范围
  处理）、5 个翻译完整性测试和 7 个反应映射测试——全部通过。
- Harness 素材路由会把生成的精灵引用
  （`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`）
  以 `200 image/webp` / `image/png` 提供；`src/client/assets.generated.ts` 约 11 KiB。
- 性能/逻辑检查：`publishFacts` 会做浅比较并跳过未变化的快照；输入最多每 5 秒刷新一次闲置计时器，且不改变场景；标签页隐藏时 1 秒时钟和桌面探测/心跳暂停，恢复可见时继续；回答预览在运行
  期间冻结，只在停止时发布一次；报告药丸带有 `role="status"` 和 `aria-live="polite"`。
  用户活动（打草稿、点击/拖动）会刷新闲置计时器，但不改变场景。
- 大小变化性能：两个滑块都经过 `updatePrefsSoon`，把偏好更新合并为每个动画帧最多一次
  （`requestAnimationFrame`，16 ms 超时回退），而预设按钮和 −/+ 点击仍立即生效；
  `updatePrefs` 会忽略无变化的补丁；overlay 只在缩放后的精灵真正离开视口时才重新限制
  保存的位置；场景预览网格和桌面预览卡已记忆化；桌面镜像约做 140 ms 防抖，因此滑块
  拖动在停止后只发送一次（场景/外观变化仍会及时镜像）。
- 场景映射也用页面确切的 React 版本（`18.3.1`）和真实槽位 prop 形状求值过（闲置、运行、
  发送、待处理交互、错误、打开错误、工具调用、推理流、回答流）；每条规则都产生了预期的
  字幕和素材。
- 无头 UI 测试覆盖了完成与悬停行为：输入的草稿保持 `Idle`，推理流显示 `Thinking`，回答
  流显示 `Typing`，运行中的工具显示 `Working`，结束的轮次显示粘性单行报告，其详情按钮
  打开有长度上限的纯文本面板，悬停伴侣会在 320 ms 停留后关闭报告，新的一轮会重新打开它，
  悬停消息框会发送消息并恢复之前的草稿。
- 素材已做无头检查：全部 134 个精灵文件都能以 192×128 RGBA 透明格式解码，每个动画
  WebP 至少有 2 帧；无头拖动测试显示 Deepy 在拖动时切换到 `roaming`、松开后回到场景
  （Whale Girl 不变）。
- 可选的桌面半边已做无头检查：
  `python3 -m py_compile desktop/companion.py` 成功；
  `python3 desktop/companion.py --self-test` 报告
  `ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks`（场景在
  0.5、1.0 和 2.0 缩放下解码）；实时 `curl` 检查覆盖 `/health`、CORS 预检、
  `POST /state`、`400` 和 `404`；同一端口上的第二个实例以 `1` 退出。roaming 切换测试
  通过（`whale: moving→roaming, released→idle; girl: no roaming`）。浏览器载荷也已在
  无头 React 渲染中验证（`scene=typing` → `success`），正文中没有草稿或会话数据。

标记为由用户确认（它们依赖宿主窗口，未在本仓库中重新验证）：拖动/指针交互、overlay 在
所有列之上的摆放、设置面板的翻转与限制、明暗主题外观，以及六种界面语言的切换。请在
自己的 `dsh web` 窗口中确认；见
[installation.md](installation.md#验证)。

## 依赖的 API 契约

已从已安装包的类型声明中确认：

| 来源 | 用途 |
| --- | --- |
| `shell.overlay`（横跨整个窗口的 overlay 槽位） | 伴侣本身：注册 `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }`。overlay 层可点击穿透；只有伴侣、它的齿轮按钮和设置面板接收指针事件。 |
| `conversation.input.dock`（隐藏的事实 bridge） | 唯一接收按会话 props 的槽位：注册 `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }`。它渲染 `null`（无 DOM、无布局间隙），只发布事实。 |
| `settings.general.item`（设置 → 通用 列表槽位） | 注册伴侣大小设置行：`{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }`。它渲染与宠物弹层相同的滑块/预设按钮，并编辑共享的偏好 store；这是宿主标准的通用列表槽位，没有新 API。 |
| 槽位所有者 props `{ session: SessionSnapshot, input: InputState }` | 会话事实和输入框状态，由隐藏 bridge 接收 |
| 伴侣事实 store（`src/client/bridge.ts`） | 模块级的 `CompanionFacts` 以及 `publishFacts`、`useCompanionFacts`、`useFactsPublisher`、`useDisconnectOnUnmount`；对快照做浅比较并携带 `connected` |
| `useSessionStatus(selector)`，遍历 `ReadonlyMap<SessionId, SessionStatus>` | `pendingInteraction`（批准 / 提问）；overlay 也会订阅，因此用户在其他非对话页面时，待批准的交互仍然可见 |
| `SessionSnapshot.running`、`.promptError`、`.lastAgentError`、`.openState`、`.sessionId` | 运行状态、错误状态 |
| `InputState.phase`（`plain` / `adjudicating` / `claimed` / `submitting` / `sending`）、`.draft` | 提交阶段用于短暂的 `typing` 场景；悬停消息框会快照 `.draft` 以便发送后恢复 |
| `useChat(selector)` → `ChatSnapshot` | 助手的实时工作：`legacy.runningCalls`（工具运行中）和 `legacy.partial.blocks[].kind` 的 `reasoning` / `text` 且 `text` 非空（流式输出中）；在同一帧内作为 1/2/4 的 `live` 位发布 |
| `ChatSnapshot.navigation.items()[].response` | 单行完成预览：第一个非空行、去掉 markdown 标记、≤ 120 字符；在报告行中粘性保留，直到被关闭或新的一轮开始；为空时回退到清理后的 detail |
| `ChatSnapshot.legacy.nodes[]`（最新的 `kind === 'assistant'`）及其 `blocks[].kind === 'text'` | 详情面板的完整已确定回答文本，每个已确定的助手节点只提取一次，上限 8000 字符（`MAX_DETAIL`），作为 `CompanionFacts.detail` 发布；仅留在页面中，绝不通过桌面 bridge 发送 |
| `inputActions.setDraft(text)` / `inputActions.submit()` | 悬停消息框通过输入框发送，然后尽力恢复用户之前的草稿 |
| `localStorage` 键 `kappy.pixel-companions.ui.v1` | 角色、`scale`（50–200%，1% 精度；旧的 0.8 / 1 / 1.2 值会被接受并限制到范围内）、语言、动画、显示、桌面开关，以及拖动后的 `position: {x, y}`（首次拖动前为 `null`）；按浏览器、按配置档保存，绝不写入 Host 设置 |
| 页面 `fetch` 到本地桌面 bridge（`src/client/desktop.ts` → `http://127.0.0.1:37421`） | 可选的桌面镜像：`GET /health`、`POST /state`、CORS 预检；不依赖新的 Harness API，桌面半边是独立的 Python 进程，不是插件 |
| `window.__ModuleLoader__.load({ id, factory })`，`factory(require)` 返回 `{ inject, apply }` | 浏览器 bundle 格式 |
| 从共享模块表 `require('react')` | React，绝不打包 |
| 模块加载器的 `require.asset(reference)`，以及 `package.json` 的 `"./assets/*": "./assets/*"` | 把生成的带内容哈希的精灵引用映射为页面 URL；当解析器不存在时，`src/client/asset-url.ts` 回退到原始的文档相对引用 |
| `$PWD/profiles/web/node_modules` bundle 解析与 `/plugins/<package>/…` 提供 | 包分发，包括插件素材路由 |

Chat snapshot 字段、navigation response 和输入框动作都已经是公开的槽位 props/hooks；
大小行使用宿主已有的 `settings.general.item` 列表槽位；素材路由使用模块加载器已有的
`require.asset` 和包的 `exports` 映射。没有使用新的 Harness API，15 个场景的集合也没有
改变。

## Bridge → overlay 数据流

1. 隐藏的 `conversation.input.dock` 条目（`src/client/Pet.tsx` 中的
   `CompanionBridge`，使用 `src/client/bridge.ts`）接收当前的 `SessionSnapshot`、
   `InputState`、Chat snapshot（实时位、回答预览和最新的已确定助手节点）、
   `useSessionStatus` 的待处理交互标志，以及输入框动作。
2. 它把这些合并进模块级的伴侣事实 store，并通知订阅者。事实包含运行开始/停止时间戳、
   `live` 位（1 工具、2 推理、4 回答）、单行 `report` 和完整 `detail`；实时位与 Chat
   snapshot 在同一帧内更新，`report`/`detail` 在轮次运行期间冻结，只在停止时发布一次。
3. `shell.overlay` 组件（`Companion`）通过 `useCompanionFacts()` 读取 store，同时也
   订阅 `useSessionStatus`，然后用 `src/client/state.ts` 中的 `deriveScene` 推导场景。
4. 对话卸载时，bridge 发布 `connected: false` 和 `running: false`，并保留最后的事实。
   overlay 随后回退到闲置/睡眠行为，而不是声称一个没有会话在发布的运行状态。
5. 场景选择不读取任何提示文本，也不发起模型调用；草稿只被快照，以便悬停消息框在通过
   输入框发送后恢复它。
6. 完成状态是粘性的：`success` 和报告行会保留，直到用户悬停伴侣（320 ms 停留）或新的一轮
   开始；当 navigation 预览为空时，报告回退到清理后的 `detail`。详情按钮打开一个限制在
   视口内的 `role="dialog"`，以 React 转义的纯文本显示完整回答（保留换行，上限 8000
   字符），可通过 ✕、Escape 或点击外部关闭。报告文本保留 `role="status"` /
   `aria-live="polite"`，按钮暴露 `aria-expanded`。

## 六语言词典

所有界面文案都在 `src/client/text.ts` 中，而不是 Host 的 locale 文件：

- `LANGUAGES` —— 六种语言及其显示标签：English、Русский、中文、Tiếng Việt、日本語、
  한국어。
- `languageFromTag(tag)` —— 把 BCP 47 标签（例如 `navigator.language`）解析为语言 id，
  默认英语。
- `SCENE_LABELS` —— 每个场景在六种语言中的字幕。
- `UI_TEXT` —— 所有设置和消息框标签，包括「重置位置」「关闭」，以及悬停输入框的占位符和
  「发送」控件。

`locale/*.json` 仍是「设置 → 插件」中显示的插件清单元数据（`meta.title` /
`meta.description`），现在同样覆盖六种语言。场景字幕和界面文案已在六种语言中改写为自然、
准确的措辞，插件清单的标题/描述也做了同样的重写。翻译完整性由 `tests/text.test.ts`
覆盖。

## 相对原型所做的改动

1. **一个可安装包，而不是两个 workspace 包。** `-ui` 和 `-bundle` 的拆分只在 DSH 源码
   检出中有意义；`cordis.patch.yml`、`index.js`、`package.json`（`dsh.bundle` +
   `dsh.client`）和 locale 元数据现在都位于仓库根目录。
2. **为已提交的 client bundle 提供无依赖构建。** `tools/build-assets.mjs` 写入带内容哈希的
   素材路由引用，`tools/build-client.mjs` 用 esbuild 打包 TypeScript、保持 `react`
   external，并把结果包装进模块加载器注册。生成的 `client.js` 已提交，因此安装不需要
   工具链。
3. **真实主题 token。** `--dsw-alias-border-l3` 和 `--dsw-specific-input-major` 不是
   随附的 token；插件改用 `--dsw-alias-border-l2`、`--dsw-alias-bg-layer-1`、
   `--dsw-alias-bg-overlay` 和 `--dsw-alias-brand-primary`，每项都带字面量回退，因此
   overlay 及其面板跟随宿主主题，而不是硬编码的深色调色板。
4. **横跨整个窗口的 overlay，而不是输入框 dock 中的视觉元素。** 伴侣移到
   `shell.overlay`（在所有列之上、每个页面可见）。只有隐藏的事实 bridge 留在
   `conversation.input.dock`，因此不会给输入框增加布局间隙。
5. **可点击穿透的 overlay 层。** overlay 层是 `pointer-events: none`；只有伴侣、它的
   齿轮和面板接受指针输入，因此页面其余部分仍像以前一样滚动和选择。
6. **随处拖动摆放。** 很小的拖动阈值区分拖动与点击；位置被限制在视口内，在窗口缩放时
   重新限制，并以 `position: {x, y}` 存储在 `kappy.pixel-companions.ui.v1` 中（首次
   拖动前为 `null`，因此在此之前自动右下角默认位置会持续跟随缩放）。
7. **六种界面语言。** `src/client/text.ts` 保存词典和 `languageFromTag`；首次运行跟随
   `navigator.language`，否则使用英语。设置面板可以实时切换语言。
8. **插件清单元数据。** `locale/en.json`、`locale/ru.json`、`locale/zh.json`、
   `locale/ja.json` 以及新增的 `locale/vi.json` / `locale/ko.json` 都带有
   `meta.title` / `meta.description`，并且导出了 `icon.svg`，因此「设置 → 插件列表」
   按名称显示插件，而不是按包 id。
9. **移除了源码检出安装器。** `install-to-dsh.sh` 和 `packages/experimental/**` 树已
   删除；文档化的安装方式是配置档 bundle。
10. **可选的桌面窗口。** `desktop/companion.py` 在无边框、始终置顶、逐像素透明的 GTK 3
    窗口中绘制同一个精灵，并通过仅限回环的 HTTP bridge（`src/client/desktop.ts`）从页面
    接收呈现状态。它默认关闭，不携带提示、草稿、消息或会话数据，也不需要新的 Harness
    API。
11. **素材、反应与 roaming 移动视觉。** `assets/` 现在包含 30 个 girl + 30 个 whale 场景
    精灵（每个角色 15 个场景 + 18 个反应动画），外加可选的
    `assets/whale/roaming.{webp,png}` 对。拖动 Deepy
    时——无论在 overlay 还是桌面窗口中——无书桌的 `roaming` 动画会替代场景，固定家具不会
    跟着移动，松开后场景恢复。`roaming` 不是场景：15 状态机、`deriveScene`、bridge 载荷
    和桌面协议都没有改变，也没有新增 Harness API。
12. **实时状态、悬停消息框、粘性完成与详情。** 场景现在跟随助手自己的工作——运行中的工具
    调用、流式输出的推理、流式输出的回答文本，或没有实时流的运行中轮次——因此 `thinking`
    绝不由用户打草稿触发。完成的轮次是粘性的：`success`、单行报告和本地化的**详情**按钮
    会保留，直到用户悬停伴侣或新的一轮开始；悬停会关闭它们，详情会以有长度上限的纯文本
    打开完整回答。伴侣还带有一个单行输入框，通过输入框发送并恢复之前的草稿。报告和悬停消息框
    共用一个限制在视口内的列，完成状态关闭前输入框直接位于报告下方。这些使用现有的 Chat
    snapshot、输入框动作和 `useSessionStatus` props；没有改变 Harness API，15 个场景的
    集合也没有改变。场景字幕和界面文案已在六种语言中改写。
13. **素材路由交付与性能优化。** 精灵不再内嵌：清单保存
    `plugins/dsh-pixel-companions/assets/...?v=<sha1-8>` 引用，由 Harness 素材路由提供，
    并通过 `require.asset` 解析，失败时回退到原始引用。已提交的 `client.js` 从约 3.3 MB
    降到约 94 KiB；精灵按场景获取并不可变缓存，内容哈希会使缓存失效。bridge 对事实做浅
    比较；标签页隐藏时 1 秒时钟和桌面探测/心跳暂停；回答预览只在停止时发布一次；用户活动会刷新闲置计时器但不改变场景（输入最多每 5 秒一次）；报告药丸通过 `role="status"` / `aria-live="polite"`
    播报。没有新增 Harness API；15 个场景的集合、场景规则、悬停框、报告、桌面 bridge 和
    桌面应用都没有改变。
14. **连续伴侣大小。** 浏览器的大小行是 50–200% 的范围滑块，5% 步进，带 −/+ 按钮、实时
    百分比和 50/100/150/200% 预设按钮（当前预设用 `aria-pressed` 标记，滑块保留用于微调）；
    精灵按真实缩放像素尺寸渲染（100% 时 152×98，50% 时 76×49，200% 时 304×196），
    因此点击区域、字幕和齿轮、视口限制、报告/输入列锚点以及详情面板都会跟随它。存储值
    接受 1% 精度，加载时限制到 50–200；旧的 0.8 / 1 / 1.2 值继续有效，滑块变化以 180 ms
    防抖持久化，并在卸载时刷新。桌面应用接受 0.5–2.0 的 `--scale`（四舍五入到 1%），其
    Size 菜单提供 50 / 75 / 100 / 125 / 150 / 200%。同一个大小控件也注册在宿主的
    「设置 → 通用」列表中（`settings.general.item`，id `pixel-companions-size`，order
    40），带有本地化的**伴侣大小**标题和描述。两个界面共用客户端本地偏好 store
    （`src/client/prefs.ts`，`usePrefs` / `updatePrefs`），因此任一处修改都会立即更新另一
    处，并以 180 ms 防抖和 `pagehide` 刷新持久化到同一个 `localStorage` 键。没有新增
    Harness API，也没有协议或场景改变。

## 已知限制

- 已提交的 JS bundle 约 94 KiB。134 个精灵文件（66 个 girl + 68 个 whale：每个角色
  15 个场景和 18 个反应，包含可选的 roaming 对）由插件素材路由单独提供并不可变缓存；
  文件变化时 `?v=<sha1-8>` 会使缓存
  失效。这让启动开销很低，但也意味着 `assets/` 树必须随包发布。
- 场景映射无法区分“完成”与“停止/取消”：客户端目前只把 `running` 暴露为布尔值。因此
  `success` 场景的含义是“无错误地停止”。
- 待处理交互之所以在其他页面可见，只是因为 overlay 自己订阅了 `useSessionStatus`；
  事实 bridge 在对话之外会被卸载，保留的事实标记为 `connected: false`。
- 完成状态是粘性的，而不是定时的：报告行和 `success` 场景会保留，直到用户悬停伴侣
  （320 ms 停留）或新的一轮开始；悬停报告行本身不会关闭它。空回答不显示任何内容，只有
  已确定的助手节点提供了文本时才会出现详情按钮。面板只渲染纯文本——上限 8000 字符——
  并且 `detail` 留在页面中，绝不跨过桌面 bridge。悬停消息框需要已挂载的对话，并尽力恢复
  之前的草稿：如果输入框在提交准入阶段被锁定，那份草稿可能会丢失。
- 没有图形会话时无法验证桌面窗口：实际窗口、在没有 Cairo 桥接的机器上的逐像素透明
  （在那里预期是不透明回退）、置顶/拖动/菜单渲染，以及 Wayland 定位，在这里都未验证。
  它的 bridge 需要页面保持打开，且两半运行在同一台主机上；这是没有身份验证的回环流量，
  因此不要暴露该端口。
- 通过 HTTPS 提供的页面通常会把回环 bridge 当作混合内容阻止；请使用普通的
  `http://127.0.0.1:3080` 页面。
- 两个槽位表面都包裹在 React 错误边界中：渲染失败会记录
  `[dsh-pixel-companions] surface failed` 并渲染空内容，而不是让槽位条目崩溃，因此
  Harness 界面的其余部分继续工作。
- 可选的桌面 bridge 在探测前会检查 `fetch` 是否存在；没有它的浏览器会报告
  **Not running**，而不是抛出异常。
- 伴侣对 Web 客户端发布的内容作出反应；如果 Host 改变 `SessionSnapshot`、`InputState`、
  `shell.overlay` 或槽位注册形状，这里就需要相应更新。槽位、props 和模块格式都是公开
  插件 API，因此破坏会体现在插件自己的代码中，而不是 Harness 界面中。
