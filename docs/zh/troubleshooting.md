# 诊断

[English](../troubleshooting.md) | 中文 | [Русский](../ru/troubleshooting.md) | [Tiếng Việt](../vi/troubleshooting.md) | [日本語](../ja/troubleshooting.md) | [한국어](../ko/troubleshooting.md)

## 伴侣不见了

1. **bundle 是否启用？** 设置 → 插件 → 插件列表。条目名为 *Pixel companions*。如果显示
   `disabled`，请启用它。
2. **它被隐藏了吗？** 设置面板有**显示**开关。关闭时，伴侣的位置上只留一个小 🐳 按钮；
   点击它即可让伴侣回来。
3. **重新加载页面。** 新安装的 bundle 通常在一两秒内热替换，但重新加载总是安全的。伴侣
   渲染在横跨整个窗口的 overlay 中，因此不需要打开对话：它在每个页面都出现，包括设置和
   插件页。
4. **重启 Host。** 对 `dsh web` 进程按 `Ctrl+C` 后重新启动；`package.json` 的改动
   （例如版本提升）需要重启。
5. **检查配置档。** `dsh --profile web --dump-config` 应列出名为
   `dsh-pixel-companions` 的一行。如果缺失，说明 bundle 未登记：再次运行
   `dsh plugin --profile web add link:"$PWD"`。

## 伴侣可见但不动

- 设置面板中**动画**关闭，或操作系统要求减少动态效果
  （`prefers-reduced-motion: reduce`）。两者都会按设计绘制静止 PNG。
- 场景本身可能就是看起来静止的场景（`sleeping`、`waiting`）；检查精灵上方的字幕。

## 拖动时伴侣不动

- 拖动**精灵本身**（伴侣隐藏时则拖动 🐳 按钮），而不是它周围的空白区域；overlay 层按
  设计可点击穿透。
- 按住并移动超过 3 像素的拖动阈值再松开。更短的按压会被当作点击，改为打开设置面板。
- 鼠标、触摸和触控笔都可用；鼠标副键不会开始拖动。
- 如果位置陈旧或指针像卡住了，打开齿轮并选择**重置位置**，然后重试。

## 伴侣太大或太小

打开**设置 → 通用 → 伴侣大小**，或伴侣的 ⚙ 弹层；两处显示相同的控件并编辑同一个偏好。
最快的办法是点击 Size 行下方的 **50/100/150/200%** 预设按钮；需要微调时使用**大小**滑块
（50–200%，5% 步进，带 −/+ 按钮和实时百分比）。精灵按真实缩放像素尺寸渲染，因此点击区域、
字幕/齿轮、报告/输入列和详情面板都会跟随它。大小变化时保存的位置会自动重新限制；如果
伴侣跑到了不合适的位置，**重置位置**会恢复自动右下角位置。如果两处控件都不显示，说明页面
仍在运行旧的 client bundle——请强制刷新（如果 bundle 刚刚更新，也重启 `dsh web`）。

## 悬停消息框不出现

只有当对话已挂载、输入框可用且伴侣可见时，鼠标悬停在伴侣上才会打开单行输入框。拖动伴侣
或设置面板打开时它会隐藏，触摸设备上也不会打开。把指针移到精灵上并保持在那里；输入框会
显示在伴侣下方（或上方），并被限制在视口内。完成报告可见时，输入框位于同一个受限列中、
直接在报告下方：悬停报告会显示输入框并保持报告打开，而报告行及其**详情**按钮本身不会
打开消息框。悬停精灵会开始 320 ms 的停留计时，以关闭粘性完成状态；关闭后输入框回到伴侣
下方。离开报告会再次隐藏输入框，报告则会一直保留，直到悬停精灵或新的一轮开始。

## 消息框把我的草稿弄丢了

消息框通过输入框发送（`setDraft` + `submit`），并在排队后立即恢复你之前的输入框草稿。
如果那一刻输入框正处于提交或准入阶段而被锁定，恢复可能失败，草稿可能会丢失；空草稿会按
空处理。需要的话请重新输入；从消息框发送不会改变会话历史。

## 完成报告不见了

报告是粘性的：成功的一轮结束后，单行预览（第一个非空行、≤ 120 字符、去掉 markdown 标记）
会一直保留，直到你悬停伴侣或新的一轮开始。停留 320 ms 会关闭它；悬停报告行本身不会。
关闭之后，下一个完成的轮次会重新打开它。空回答不显示任何内容，**详情**按钮只在已确定的
助手回答提供文本时出现；出现时，它会以有长度上限的纯文本打开完整回答。

## 调整显示器或窗口大小后伴侣跑到屏幕外

位置会被限制在视口内，并在缩放时重新限制，但保存的位置在更换显示器、改变缩放比例或
窗口非常小之后仍可能不合适。打开齿轮并选择**重置位置**；伴侣会回到自动右下角位置，
并重新跟随窗口缩放。清除 `localStorage` 中的 `position` 字段有同样的效果。

## 设置面板被裁切或打开到屏幕外

面板锚定在伴侣上，会根据可用空间翻到它的上方或下方，并被限制在视口内：

- 如果伴侣在角落，先把它拖向中间再打开面板。
- **重置位置**会让它回到默认位置。
- 在异常小的窗口中面板会滚动；如果仍然无法使用，请调整窗口大小或报告窗口尺寸。

## 修改素材后精灵陈旧或 404

精灵 URL 带有内容哈希（`?v=<sha1-8>`），清单在构建时生成。替换 `assets/` 下的文件后，
运行 `npm run build` 以重新生成 `src/client/assets.generated.ts` 和 `client.js`，然后
重新加载页面。如果仍显示旧素材，请强制刷新以丢弃缓存的文档。出现 404 说明已安装的包中
不再包含 `assets/` 树——请重新安装 bundle。

## 桌面窗口打不开

桌面应用是独立的 Python 进程，不属于 bundle。请在检出中运行
`python3 desktop/companion.py`（或 `./desktop/run.sh`）启动它。

- **没有显示器。** 窗口需要 X11 或 Wayland。在服务器上使用 `ssh -X`、带 XWayland 的
  Wayland 会话或虚拟显示器；纯 WSL 主机需要 X 服务器。运行
  `python3 desktop/companion.py --self-test` 可以检查所有不需要屏幕的部分。
- **端口已被占用。** `cannot listen on 127.0.0.1:37421` 表示另一个伴侣实例正在运行。
  退出它；页面始终探测 37421，因此保留默认端口最省事。
- **缺少 GTK 或 Pillow。** 脚本会以 PyGObject/GTK 消息或 Pillow `ImportError` 退出：
  请安装 `python3-gi gir1.2-gtk-3.0` 和 `python3 -m pip install --user Pillow`。

## 桌面窗口是不透明的深色方块

没有 Cairo 绑定或合成窗口管理器时，窗口会按设计把精灵画在纯深色背景上。请安装
`python3-cairo`，使用合成窗口管理器/会话，然后重启窗口。

## 桌面窗口一直停在 `offline`

- 页面必须保持打开，并且齿轮面板中的**桌面窗口**必须勾选；该行显示 **Off**、
  **Not running** 或 **Connected**。开启时，该行下方的预览卡会重复显示状态并给出启动
  命令，悬停该行也会显示同样的提示。
- 检查 bridge：`curl http://127.0.0.1:37421/health` 应返回 `{"ok":true,"v":1}`。如果
  失败，说明窗口没有运行，或另一个进程占用了端口。
- 页面和窗口必须运行在同一台机器上；bridge 仅限回环地址。
- 通过 HTTPS 提供的页面通常会把 `http://127.0.0.1:37421` 当作混合内容阻止。请使用普通的
  `http://127.0.0.1:3080` 页面；CORS 已由 bridge 处理。
- 超过 10 秒没有发送后，窗口会切换到 `offline`，并继续播放离线场景动画，直到状态恢复。

## 桌面窗口难以移动或出现在错误的显示器上

- 在精灵上任意位置按住左键拖动。Wayland 合成器可能忽略请求的位置，或拒绝移动请求；
  试试 X11 会话。
- 右键菜单中的**重置位置**会让它回到右下角默认位置。
- 桌面偏好保存在 `~/.config/dsh-pixel-companions/desktop.json`；删除该文件可以重置外观、
  位置和置顶状态。

## 语言不对

打开齿轮并使用**语言**选择器：English、Русский、中文、Tiếng Việt、日本語、한국어。
首次运行会在 `navigator.language` 匹配其中之一时跟随它，否则以英语开始。选择按浏览器
保存；场景字幕和面板文案会一起切换。要回到由浏览器推导的首次运行语言，请清除
`kappy.pixel-companions.ui.v1` 键。

## 出现两个伴侣

两个不同的插件注册到了 `shell.overlay`（或旧的输入框 dock）。一个配置档中只应启用一个
伴侣插件：在「设置 → 插件」中检查是否还有另一个宠物或装饰插件，并禁用它。

## 插件列表显示包 id 而不是标题

locale 元数据没有解析。确认已安装包中存在匹配的 `locale/<language>.json`（`en`、
`ru`、`zh`、`vi`、`ja`、`ko`）并包含 `meta.title` 和 `meta.description`，且
`package.json` 导出了 `"./locale/*.json"`。link 安装的检出会立即显示文件改动；抓取的包
需要重新安装。

## `client.js` 加载失败

症状：插件列表报告模块加载失败，或浏览器控制台显示
`loaded without registering "dsh-pixel-companions"`。

1. 确认提供的 bundle 以
   `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` 开头——id 必须等于
   `package.json` 中的包名。
2. 确认包已安装到配置档：
   `ls $DSH_HOME/profiles/web/node_modules/dsh-pixel-companions`。
3. 查看 `$DSH_HOME/profiles/web/.plugin-manager/logs/` 下的安装日志。
4. 重新安装：先 `dsh plugin --profile web remove dsh-pixel-companions`，再
   `dsh plugin --profile web add link:"$PWD"`。

## 场景一直停在 `error`

`lastAgentError` 是一个会话事实：失败的轮次之后，会话会持续报告它，直到下一轮开始。
在那段时间里宠物显示 `error`（轮次停止时会有一次性闪光）。这是有意为之；成功的轮次会
让它回到正常场景。

## 重置偏好

插件把设置（包括拖动后的 `position`）保存在 `localStorage` 的
`kappy.pixel-companions.ui.v1` 下。设置面板中的**重置位置**只清除位置；要把每个偏好都
恢复默认，请在浏览器开发者工具（Application → Local Storage）中清除该键并重新加载。

## 阅读浏览器控制台

Harness 会把抛出异常的插件组件报告为
`slot entry crashed in 'shell.overlay'`（伴侣）或
`slot entry crashed in 'conversation.input.dock'`（隐藏的事实 bridge）。这条消息表示
组件在渲染时抛出了异常，而不是 bundle 加载失败。报告时请附上它，以及 Harness 版本
（`dsh --version`）。

## 完全卸载

```sh
dsh plugin --profile web remove dsh-pixel-companions
```

然后重新加载页面。配置档的 `package.json`、lockfile 和 bundle 列表都会移除这个包；
不会留下任何 Host 设置，因为插件从不写入任何设置。
