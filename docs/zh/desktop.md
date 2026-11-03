# 桌面窗口

[English](../desktop.md) | 中文 | [Русский](../ru/desktop.md) | [Tiếng Việt](../vi/desktop.md) | [日本語](../ja/desktop.md) | [한국어](../ko/desktop.md)

`desktop/companion.py` 是一个**可选的独立桌面窗口**，可以在浏览器之外显示同一个像素伴侣。
它无边框、始终置顶、逐像素透明，可用鼠标左键拖动，并带有右键菜单。它是一个纯 Python 3
程序（通过 PyGObject 使用 GTK 3、Pillow，以及一个很小的 localhost HTTP bridge）；它不是
Harness 插件，也不改变 Web 界面。

窗口只是精灵，Web 页面才是大脑。浏览器半边属于普通 bundle，在你于伴侣设置面板中打开
**桌面窗口**之前一直闲置。默认关闭，因此没有桌面应用时页面根本不会探测本地端口。两半必须
运行在同一台机器上：bridge 只绑定 `127.0.0.1`，且没有身份验证。

状态现在跟踪助手自己的工作——运行中的工具调用、流式输出的推理或回答文本，或进行中的
请求——桌面镜像显示相同的场景；bridge 协议没有改变。浏览器会粘性保留已完成轮次的
`success` 场景和报告，因此只要页面保留它，桌面窗口就会镜像 `success`；报告行及其详情
面板仅在浏览器中提供。

## 要求

- 与浏览器页面同一台机器上的 Python 3.10+。
- 带 PyGObject、Cairo 绑定和 Pillow 的 GTK 3：

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
```

`python3-cairo` 是让窗口逐像素透明的关键。没有它（或没有合成窗口管理器）时，窗口仍能运行，
但会把精灵画在纯深色背景上。`desktop/requirements.txt` 列出了 pip 用的 `PyGObject>=3.42`
和 `Pillow>=10`；PyGObject 通常来自发行版，而不是 pip。

精灵帧来自仓库的 `assets/` 目录（`assets/girl/`、`assets/whale/`）；在检出中不需要额外
下载。

## 运行

在仓库根目录：

```sh
python3 desktop/companion.py
# or
./desktop/run.sh
```

| 参数 | 含义 |
| --- | --- |
| `--port PORT` | bridge 端口，默认 `37421`。此版本的页面始终探测 `37421`，因此请保留默认值。 |
| `--assets DIR` | 素材目录；默认为仓库的 `assets/`。 |
| `--scale 0.5\|…\|2.0` | 初始精灵缩放，`0.5` 到 `2.0` 之间的任意值（四舍五入到 1%）；超出范围会以用法错误退出。之后由右键菜单掌管外观。 |
| `--no-animation` | 以静止 PNG 启动，而不是动画 WebP。 |
| `--lang en\|ru\|zh\|vi\|ja\|ko` | 保留参数。窗口不绘制文字，因此视觉上没有变化。 |
| `--stale-ms MS` | 过期窗口，单位毫秒；测试钩子，默认 `10000`。 |
| `--self-test` | 运行无头验收测试后退出；不需要显示器。 |

窗口启动时是 `offline`，直到页面发送第一份状态。偏好（外观、位置、置顶）保存在
`~/.config/dsh-pixel-companions/desktop.json`：

```json
{"character": "girl", "scale": 1, "animation": true, "alwaysOnTop": true, "x": 1200, "y": 600}
```

首次运行时，如果该文件还没有保存角色，第一份浏览器载荷可以选择角色；之后菜单是权威，
载荷只驱动场景。保存的 `scale` 接受 `0.5` 到 `2.0` 之间的任意值（四舍五入到 1%）；旧的
`0.8` / `1` / `1.2` 值仍可加载。

## 启用浏览器一侧

1. 确认 bundle 已在**设置 → 插件**中启用，并且 Web 页面已打开（通常是
   `http://127.0.0.1:3080`）。
2. 启动桌面窗口（也可以在之后启动；页面每 10 秒重新探测一次）。
3. 打开伴侣的齿轮面板，勾选**桌面窗口**。

该行显示当前状态：

| 状态 | 含义 |
| --- | --- |
| **Off** | 已禁用。页面完全不探测桌面端口。 |
| **Not running** | 已启用，但 `127.0.0.1:37421` 上没有应答。 |
| **Connected** | 桌面窗口应答了上次探测；场景正在镜像。 |

当**桌面窗口**开启时，该行正下方会显示一张预览卡：棋盘格背景的小舞台按桌面窗口的实际渲染
方式显示当前精灵（相同角色、场景、动画状态和像素化缩放），标题为**桌面窗口预览**。它会
显示绿色的 **已连接**，或琥珀色的 **⚠ 未运行 — 请运行 `desktop/companion.py`**。这张卡仅
作展示——没有按钮，也没有协议改动——并在该选项关闭时消失；悬停该行也会显示启动提示。

启用并连接后，页面每 10 秒探测一次 `GET /health`，在场景或外观变化时发送状态，并发送
4 秒心跳。窗口会在收到发送后约 120 ms 内跟上变化。保持页面打开才能获得实时状态：如果超过
10 秒没有收到状态（页面关闭、正在重新加载、网络被阻止），窗口会显示 `offline` 并继续运行。

## 右键菜单

- **Character** —— Lumi（`girl`）或 Deepy（`whale`）。
- **Motion** —— 动画 WebP，或静止 PNG。
- **Size** —— 50%、75%、100%、125%、150%、200%。
- **Always on top** —— 切换窗口的置顶提示。
- **Reset position** —— 回到右下角默认位置。
- **Hide for 1 hour** —— 隐藏窗口；一小时后自动重新出现。
- **Quit** —— 保存偏好并退出。

在精灵上任意位置按住左键拖动即可移动窗口；位置会被保存。窗口被移动时，Deepy 会切换到他
没有书桌的 `roaming` 动画，松开后回到镜像的场景；Whale Girl 继续使用她的场景精灵。这只是
移动视觉——bridge 协议和 15 个场景的集合都没有改变。窗口无边框且没有托盘图标；右键
**Quit** 关闭它。

## 本地 bridge 与隐私边界

基础 URL：`http://127.0.0.1:37421`。bridge 是一个只绑定回环地址的小型 HTTP 服务器。

| 请求 | 响应 |
| --- | --- |
| `GET /health` | `200` `{"ok":true,"v":1}` |
| `POST /state` | `204`，无正文 |
| `OPTIONS /state`、`OPTIONS /health` | `204`，带 CORS 头（`Access-Control-Allow-Origin: *`，方法 `GET, POST, OPTIONS`） |
| 未知路径 | `404` |
| 格式错误的 JSON、未知场景、缺失/无效的长度、正文超过 8 KB | `400` |

`POST /state` 载荷（最多 8 KB；未知字段被忽略）：

```json
{"v": 1, "scene": "typing", "character": "girl", "scale": 1, "animation": true, "updatedAt": 1780000000000}
```

`scene` 是 15 个场景 id 之一（`idle`、`typing`、`thinking`、`planning`、`reading`、
`searching`、`working`、`success`、`waiting`、`error`、`tired`、`coffee`、`sleeping`、
`debugging`、`offline`）。每次发送只使用 `scene`；`character` 只在首次运行、尚未保存角色时
被采纳；`scale` 和 `animation` 由桌面菜单掌管；`updatedAt` 仅供参考。

跨过 bridge 的只有呈现状态——**绝不发送提示文本、草稿文本、消息、会话 id、文件路径或模型
输出**。bridge：

- 只绑定 `127.0.0.1`，没有身份验证、没有 cookie，也没有 TLS；
- 拒绝超过 8 KB 的请求正文，以及场景 id 未知的正文；
- 从不记录请求载荷，也不提供任何文件；
- 仅为了让本地页面能发送，才通过 CORS 允许浏览器来源。

## 过期与离线行为

窗口记住最后收到的状态及其到达时间。如果超过 10 秒没有新状态，`effective_scene` 会变成
`offline`；窗口继续渲染（动画开启时也继续播放该场景的动画），直到新的发送到达。页面一侧
与此对应：如果健康探测或发送失败，设置行会回退为 **Not running**。

刚好 10.000 秒仍算新鲜；切换发生在其后。`--self-test` 会用注入的时钟检查这个边界。

## 验证

无头部分已经验证：

```sh
python3 -m py_compile desktop/companion.py
python3 desktop/companion.py --self-test
```

自检会解码两个角色 × 全部 15 个场景（0.5、1.0 和 2.0 缩放），外加 Deepy 可选的
`roaming` 动画，检查帧尺寸和时长，把 30 张首帧 PNG 写入仓库之外的临时目录作为视觉证据，
在临时端口启动 bridge 并测试 `GET /health`、两个 CORS 预检、有效的 `POST /state`、格式
错误/未知场景的正文（`400`）和未知路径（`404`），然后检查 10 秒过期规则。它会打印
`ok:` 摘要（`ok: … 92 animated decodes, 31 still decodes, 30 evidence PNGs, 260 checks`），
失败时以非零状态退出。

roaming 切换测试也通过（`whale: moving→roaming, released→idle; girl: no roaming`）。
浏览器侧载荷已在无头 React 渲染中验证（`scene=typing` → `success`），请求正文中没有草稿
或会话数据；无头浏览器拖动测试显示鲸鱼在拖动时切换到 `roaming`、松开后回到场景（女孩
不变）。

没有图形会话时无法验证：实际窗口、在没有 Cairo 桥接的机器上的逐像素透明（在那里预期是不透明
回退）、置顶和拖动行为，以及 Wayland 窗口定位。

## 限制

- 需要图形会话（X11 或 Wayland）。无头服务器或纯 WSL 没有显示器；使用 X 转发或虚拟显示器，
  或运行 `--self-test`。
- Wayland 合成器可能忽略请求的窗口位置，某些后端会拒绝移动窗口的请求；X11 会话最可预测。
- 没有托盘图标、没有通知、没有窗口装饰、没有文字。关闭要通过右键 **Quit**（或
  **Hide for 1 hour**）。
- 页面必须保持打开才能有实时状态。窗口只是显示目标，不是第二个客户端。
- 仅限同一台机器：bridge 只在回环地址上且没有身份验证，因此不要暴露该端口。除了那点小载荷，
  窗口无法访问对话。
- 通过 HTTPS 提供的页面通常会把 `http://127.0.0.1` 请求当作混合内容阻止；请使用普通的
  `http://127.0.0.1:3080` 页面。

## 诊断

| 症状 | 检查 |
| --- | --- |
| 窗口始终不出现 | 有可用的显示器吗？先运行 `python3 desktop/companion.py --self-test`；在服务器上使用 X 转发或虚拟显示器。 |
| `cannot listen on 127.0.0.1:37421` | 另一个伴侣实例正在运行。退出它（页面使用 37421，因此保留默认端口最省事）。 |
| 显示为纯深色矩形而不是透明 | 安装 `python3-cairo`，使用合成窗口管理器，并运行 X11 或带合成的 Wayland 会话。这是预期的不透明回退，不是崩溃。 |
| 场景一直停在 `offline` | 页面是否打开、bundle 是否启用、**Desktop window** 是否勾选？检查 `curl http://127.0.0.1:37421/health`，并确认页面和窗口使用同一端口。 |
| 窗口开着但设置显示 **Not running** | 页面无法访问 bridge：检查端口、本地防火墙、占用 37421 的其他进程，或通过 HTTPS 提供的页面（混合内容）。 |
| 在 Wayland 上无法移动窗口 | 合成器可能忽略移动请求；试试 X11 会话，或在精灵的其他位置拖动。 |
| 窗口出现在错误的显示器/屏幕外 | 使用右键菜单的 **Reset position**；某些 Wayland 合成器完全忽略定位。 |

更多见 [installation.md](installation.md)、[development.md](development.md) 和
[troubleshooting.md](troubleshooting.md)。
