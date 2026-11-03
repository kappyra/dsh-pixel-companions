# 面向 DeepSeek Harness 的像素伴侣

[English](README.md) | 中文 | [Русский](README.ru.md) | [Tiếng Việt](README.vi.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

我做这个插件，是为了让我自己的 dsh 会话不那么冷冰冰。它是一个动画像素伴侣，浮在
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）Web 界面的
**整个上方**，跟随 agent 的所作所为：输入、工作、等你确认、完成、睡觉。我把它渲染在横跨
整个窗口的 overlay 中，因此在每个页面——对话、设置、插件——都可见，并且可以在窗口内拖到
任意位置。我把它保持为一个普通的可选 dsh **bundle**：不 fork 界面、不修改内核、不拦截
提示或回复。我是 kappyra，这是我给 dsh 做的一个副项目。

![预览](demo/preview.webp)

我画了两个角色，每个都有 15 个动画场景：

- **Lumi** —— 工位上的像素女孩。
- **Deepy** —— 像素鲸鱼。

**素材。** Deepy 用的是我挑的 v3 哑光像素（matte pixel）风格；Whale Girl 保留素材包的 v2 风格。
所有精灵均为 192×128、透明背景。

我的伴侣是官方横跨整个窗口的 `shell.overlay` 槽位的浏览器侧贡献。`conversation.input.dock`
中一个隐藏的 bridge 条目会把会话事实发布到插件自己的模块 store，overlay 读取它们。齿轮
按钮会打开一个小设置弹层，我把它存在仅限本浏览器的 `localStorage` 中（见「配置」）。

## 功能

- **每个页面都浮着。** 我把 overlay 放在所有列之上，因此伴侣在对话、设置和插件页都保持
  可见——不只在输入框旁。
- **随处拖动。** 鼠标左键、触摸或触控笔都能把伴侣移到窗口任意位置。我加了一个很小的
  拖动阈值来区分拖动与点击；位置会被限制在视口内，在窗口缩放时重新限制，并以
  `position: {x, y}` 持久化到 `kappy.pixel-companions.ui.v1`（首次拖动前为 `null`）。
  在拖动之前，我把它自动放在输入框区域上方的右下角，并跟随窗口缩放。
- **跟随模型自己的工作。** 我跟踪正在运行的工具调用、正在流式输出的推理、正在流式输出
  的回答文本，或没有实时流的运行中轮次——绝不来自提示文本，也绝不由你自己的输入触发。见
  [docs/zh/scenes.md](docs/zh/scenes.md)。
- **悬停消息框。** 我加了悬停消息框：鼠标悬停在伴侣上——或完成报告上——即可输入消息并
  发送到当前会话；发送后你的输入框草稿会恢复。报告可见时它直接堆叠在报告下方，报告关闭后
  则回到伴侣下方。它需要已打开的对话，并在拖动或设置面板打开时隐藏。
- **粘性完成报告。** 我把报告做成粘性的：一轮结束后，最终回答的第一行和**详情**按钮会一直
  显示在伴侣下方，直到鼠标悬停到伴侣上或新的一轮开始。**详情**会在可滚动的面板中以纯文本
  打开完整回答；悬停伴侣会关闭报告，面板可通过 ✕、Escape 或点击外部关闭。
- **30 个动画 WebP 场景**（每个角色 15 个）加上用于关闭动画和减少动态效果时的静止
  PNG；Deepy 在拖动时还有一份无书桌的 `roaming` 动画。我从插件自己的素材路由提供精灵，
  并按场景按需获取，因此 JS bundle 保持很小。
- **六种界面语言。** 我把场景字幕和所有设置标签翻译成了 English、Русский、中文、
  Tiếng Việt、日本語、한국어；首次运行会在 `navigator.language` 匹配其中之一时跟随它，
  否则使用英语。
- **自带设置。** 我把一切都放在伴侣的齿轮弹层里：角色、**大小**滑块（50–200%，5% 步进，
  带 −/+ 按钮、实时百分比和 50/100/150/200% 预设按钮）、语言、动画开/关、显示开/关、
  重置位置、15 个场景手动预览网格、自动和关闭。同一个大小控件也注册在
  **设置 → 通用 → 伴侣大小**中。我按真实的缩放像素尺寸渲染伴侣（100% 时为 152×98），
  因此点击区域、字幕/齿轮、报告/输入列和详情面板都会跟随所选大小。
- **可选的桌面窗口。** 我也把同一个伴侣做成了桌面窗口：它可以在浏览器之外运行于同一台
  机器上的无边框、始终置顶 Python 窗口，由仅限本地的 bridge 提供状态；设置行会预览该
  窗口，并在未运行时给出附带启动命令的警告。默认关闭。见
  [docs/zh/desktop.md](docs/zh/desktop.md)。
- **从构造上就是安全的。** 我把 overlay 层做成可点击穿透；只有伴侣、它的齿轮和面板接收
  指针事件。插件不拥有任何 Host 代码，除了自己的素材路由和可选的本地桌面 bridge 外不
  发起网络调用，只读取公开的槽位 props。
- **可选且可逆。** 在「设置 → 插件」中禁用我的插件或移除 bundle；界面恢复原样。

## 要求

- 一个 dsh Web 配置档（`dsh web`）——我只面向官方 Web 客户端。
- `PATH` 中有 `pnpm`，因为 `dsh plugin` 会把包操作转发给 pnpm。
- 只有从源码重新构建时才需要 Node.js 22.6+；已安装的包中已经包含 `client.js`，用户
  不需要工具链。

## 安装

我把这个包做成预构建的 bundle：`client.js` 和 `assets/` 下的素材都已提交，因此安装不需要
构建步骤。

### 从本地检出安装

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

`link:` 让配置档指向你的工作副本，因此之后对 `assets/` 或 `src/` 的修改（执行
`npm run build` 后）会立即生效。

### 从 Git 地址或压缩包安装

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or, after `npm pack` in the checkout:
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

然后**重新加载 Web 页面**。添加 bundle 会在配置档中启用它；伴侣会出现在每个页面的右下角
附近——对话、设置、插件——在页面间切换不会重新加载它，因此它能跨页面导航保留。如果页面
已经在运行，客户端 HMR 通常在一两秒内换入新 bundle；重新加载总是安全的。

完整流程（插件页、启用、禁用、卸载、诊断）：
[docs/zh/installation.md](docs/zh/installation.md)。日常使用——拖动、悬停消息框、粘性报告与
详情、大小、语言和桌面窗口——见 [docs/zh/usage.md](docs/zh/usage.md)。

## 配置

我把所有设置都放在从伴侣或其齿轮按钮（⚙）打开的面板中：

| 控件 | 作用 | 存储位置 |
| --- | --- | --- |
| 角色 | Lumi 或 Deepy | `kappy.pixel-companions.ui.v1` |
| 大小 | 50–200% 滑块，5% 步进，带 −/+ 按钮、实时读数和 50/100/150/200% 预设按钮；精灵按真实像素尺寸渲染 | 同一键 |
| 伴侣大小（设置 → 通用） | 与齿轮弹层相同的滑块、−/+ 按钮、读数和预设按钮；两处编辑同一个共享偏好并保持同步 | 同一键 |
| 语言 | English、Русский、中文、Tiếng Việt、日本語、한국어 | 同一键 |
| 动画 | 动画 WebP 或静止 PNG | 同一键 |
| 显示 | 显示或隐藏伴侣 | 同一键 |
| 桌面窗口 | 把场景镜像到可选的桌面窗口；状态为 Off / Not running / Connected | 同一键 |
| 重置位置 | 把伴侣恢复到自动右下角默认位置 | 同一键 |
| 测试场景 | 强制显示 15 个场景之一，或回到自动（**自动**） | 仅会话状态 |
| 关闭 | 关闭面板；**Escape** 或点击外部也可关闭 | — |

我把面板锚定在伴侣上，让它自动翻到伴侣的上方或下方，并限制在视口内。偏好和拖动后的位置
按浏览器、按配置档保存，绝不写入 Host 设置服务；我的插件不添加单独的设置页面——它的大小
行会出现在「设置 → 通用」中。

## 桌面窗口（可选）

我也把同一个伴侣做成了桌面窗口：它可以在浏览器之外运行于同一台机器上的无边框、始终
置顶、逐像素透明的窗口。它默认关闭。

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

在齿轮面板中勾选**桌面窗口**；该行会显示 **Connected**、**Not running** 或 **Off**。
只有场景 id、角色、缩放和动画标志会经过本地 bridge——没有提示文本、草稿、消息、会话
id、文件路径或模型输出。见 [docs/zh/desktop.md](docs/zh/desktop.md)。

## 场景

| 观察到的信号 | 场景 | 诚实的含义 |
| --- | --- | --- |
| 提交提示（`input.phase` = sending/submitting/adjudicating） | `typing` | 消息正在提交 |
| 工具调用正在运行 | `working` | 工具正在执行 |
| 助手正在流式输出推理 | `thinking` | 模型正在推理 |
| 助手正在流式输出回答文本 | `typing` | 模型正在撰写回答 |
| 轮次运行中、没有实时流（请求进行中） | `thinking` | 正在等待模型 |
| 无实时信号的运行 > 75 秒 | `tired` | 长任务，不是模型疲劳 |
| 无实时信号的运行 > 180 秒 | `coffee` | 仅装饰 |
| 等待批准 / 提问 | `waiting` | 在等你 |
| `promptError`、`lastAgentError` 或 `openState = error` | `error` | 真实错误信号 |
| 运行 → 无错误地停止 | `success`（粘性） | 与报告一起保留，直到悬停伴侣或新的一轮开始；可能包含取消 |
| 110 秒无活动 | `sleeping` | 仅显示的闲置计时器 |
| 其他情况 | `idle` | — |

我把规则做成与语言无关；只有伴侣下方的字幕是本地化的。`thinking` 表示助手正在推理——
在输入框中打草稿不会改变任何东西。在客户端为它们公布带类型的信号之前，`planning`、`reading`、
`searching`、`debugging` 和 `offline` **仅用于手动预览**；插件绝不从提示词中猜测它们。
完整规则：[docs/zh/scenes.md](docs/zh/scenes.md)。

## 兼容性

我在运行中的 dsh `0.2.2-alpha.2` Web 配置档上验证过：bundle 可以安装，Client 模块通过
Harness 模块加载器加载，两个条目注册到 `shell.overlay`（伴侣）和
`conversation.input.dock`（隐藏 bridge），所提供 bundle 的字节与仓库一致，组件用真实
槽位 props 渲染。[docs/zh/compatibility.md](docs/zh/compatibility.md) 列出了所依赖的
确切 API、bridge → overlay 数据流和六语言词典。视觉检查（明暗主题、拖动手感、精确
摆放位置）留给你在自己的窗口中确认。

## 开发

```sh
npm install            # esbuild, dev-only
npm run build          # build the asset manifest, then bundle client.js
npm test               # unit tests (Node 22.6+)
```

浏览器代码：`src/client/bridge.ts`（事实 store）、`Pet.tsx`（overlay、拖动与 roaming、
隐藏 bridge、悬停框、报告）、`state.ts`（场景规则）、`signals.ts` 和 `asset-url.ts`
（纯辅助函数与素材路由解析）、`text.ts`（六种语言）、`desktop.ts`（可选的桌面 bridge）。
我在 [docs/zh/development.md](docs/zh/development.md) 里记录了流水线、打包和完整目录结构。

## 许可证与素材

- 我以 **MIT 发布插件代码** —— 见 [LICENSE](LICENSE)。
- 我为这个项目创作了 `assets/`、`source-art/`、`demo/` 以及插件所提供副本中的**吉祥物
  素材**，它随项目一起分发。它不适用代码的 MIT 授权；我保留其权利。见
  [ASSETS_NOTICE.md](ASSETS_NOTICE.md)。
- DeepSeek 和 DeepSeek Harness 是其各自所有者的商标。这是一个非官方社区插件，与
  DeepSeek 无关联，也未获其背书。它只使用 Harness 文档化的公开插件 API。

## 诊断

| 症状 | 检查 |
| --- | --- |
| 任何地方都没有伴侣 | 设置 → 插件：bundle 是否启用？重新加载页面。不需要打开对话。 |
| 伴侣可见但不动 | 可能选中了静止 PNG（动画关闭），或系统要求减少动态效果。 |
| 拖动时伴侣不动 | 松开前先移动几个像素（有拖动阈值），并且拖动精灵本身，而不是空白 overlay。 |
| 调整窗口或更换显示器后伴侣跑到屏幕外 | 齿轮 → **重置位置**；它会回到自动右下角默认位置。 |
| 精灵太大或太小 | 在齿轮弹层或**设置 → 通用 → 伴侣大小**中点击 **50/100/150/200%** 预设按钮，或拖动**大小**滑块（50–200%）；保存的位置会自动重新限制，**重置位置**会恢复自动右下角位置。 |
| 找不到大小控件 | 它在**设置 → 通用 → 伴侣大小**以及伴侣的 ⚙ 弹层中；两处编辑同一个偏好。如果两处都不显示，需要强制刷新（页面仍在运行旧的 client bundle）。 |
| 语言不对 | 齿轮 → **语言**。首次运行跟随浏览器语言；否则为英语。 |
| 设置弹层被裁切 | 面板会翻转并被限制在视口内；先**重置位置**，再报告窗口大小。 |
| 桌面窗口一直 offline 或是不透明的方块 | 页面打开且已勾选**桌面窗口**；为透明安装 `python3-cairo`；检查 `curl http://127.0.0.1:37421/health`。见 [docs/zh/desktop.md](docs/zh/desktop.md)。 |
| 修改素材后精灵陈旧或 404 | 运行 `npm run build` —— 每个精灵 URL 都带 `?v=` 内容哈希 —— 然后重新加载页面。 |
| `client.js` 加载失败 | 配置档必须能提供这个包；再次运行 `dsh plugin --profile web add`，并检查 `$DSH_HOME/profiles/web/.plugin-manager/logs/` 下的 pnpm 日志。 |

更多见 [docs/zh/troubleshooting.md](docs/zh/troubleshooting.md)。
