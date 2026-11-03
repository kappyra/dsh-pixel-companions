# 安装

[English](../installation.md) | 中文 | [Русский](../ru/installation.md) | [Tiếng Việt](../vi/installation.md) | [日本語](../ja/installation.md) | [한국어](../ko/installation.md)

`dsh-pixel-companions` 是一个 dsh **bundle 包**。它有一个什么都不做的 Host 半边，以及一个
在横跨整个窗口的 `shell.overlay` 槽位中绘制伴侣的浏览器半边（`client.js`），因此必须安装
到 dsh 配置档中，并由运行中的 `dsh web` 进程提供。

构建好的 `client.js` 和 `assets/` 下的素材都已提交到仓库；Harness 素材路由会从已安装的
包中提供这些文件，因此安装**不需要构建步骤**，也不需要 Node 工具链。

## 要求

- 已初始化 Web 配置档的 `dsh` CLI（`dsh web`）。配置档目录是
  `$DSH_HOME/profiles/web`，其中 `$DSH_HOME` 默认为 `~/.dsh`。
- `PATH` 中有 `pnpm`。`dsh plugin` 会在配置档目录中把参数转发给 pnpm。
- 只有从源码重新构建 bundle 时才需要 Node.js 22.6+。
- 可选的桌面窗口需要同一台机器上的 Python 3.10+、GTK 3 和 Pillow；见
  [desktop.md](desktop.md)。

## 从本地检出安装

```sh
git clone https://github.com/kappyra/dsh-pixel-companions.git
cd dsh-pixel-companions
dsh plugin --profile web add link:"$PWD"
```

- `link:` 会把检出安装为 pnpm link，而不是复制，因此检出中的修改无需重新安装即可生效。
- 绝对目录同样可用：`dsh plugin --profile web add /path/to/dsh-pixel-companions`。
- 添加 bundle 会把包名追加到配置档 `package.json` 的 `dsh.profile.bundles` 中，这就是
  启用它的方式。

## 从 Git 地址或压缩包安装

```sh
dsh plugin --profile web add github:kappyra/dsh-pixel-companions
# or
npm pack
dsh plugin --profile web add /path/to/dsh-pixel-companions-0.1.0.tgz
```

Git 安装会取出已提交的 `client.js`；安装机器上不会运行构建。这个包没有声明安装脚本，
因此 pnpm 不应要求批准构建脚本。

## 激活

`dsh plugin` 只写入配置档，不会重启正在运行的 Host。在随附的 Web 配置档中，`dsh-hmr`
传输会跟随配置档变化，页面通常会在一两秒内加载新 bundle。如果没有：

1. 重新加载 Web 页面（不确定时使用强制刷新）。
2. 如果伴侣仍未出现，重启 Web 进程（`Ctrl+C`，然后 `dsh web`）并重新加载。

重新加载后，伴侣会出现在窗口右下角附近、输入框区域上方。它位于横跨整个窗口的 overlay 中，
因此在 Web 界面的**每个页面**都可见——对话、设置、插件——并且能跨页面导航保留：在页面间
切换不会卸载它，只有完整重新加载才会重新运行 bundle。不需要打开对话；没有挂载会话时，
伴侣会回退到闲置/睡眠行为。用鼠标左键、触摸或触控笔可以把它拖到窗口任意位置；旁边的齿轮
按钮会打开设置面板。

## 验证

- **设置 → 插件 → 插件列表**会显示名为 `Pixel companions` 的条目及其描述（来自
  `locale/*.json`）。
- 伴侣在每个页面（对话、设置、插件）都可见，而不只在输入框上方。
- 拖动它会移动；在窗口边缘附近松手会让它保持在屏幕内；刷新页面会恢复拖动后的位置。
- 齿轮会打开设置面板，其中包含角色、缩放、语言、动画、显示、重置位置、15 场景预览
  网格、自动和关闭。
- Host 已组合你的 bundle：`dsh --profile web --dump-config` 会列出
  `dsh-pixel-companions` 一行。
- 隐藏的事实 bridge 不会给输入框添加任何可见 DOM；只有 overlay 绘制内容。
- *（可选）* 在桌面窗口运行且启用**桌面窗口**后，齿轮面板中该行显示 **Connected**，
  窗口镜像当前场景。

## 可选的桌面窗口

伴侣也可以镜像到同一台机器上的独立桌面窗口。它是一个独立的 Python 进程，不是另一个
bundle——不会向配置档安装任何额外内容：

```sh
sudo apt install python3-gi gir1.2-gtk-3.0 python3-cairo
python3 -m pip install --user Pillow
python3 desktop/companion.py        # or ./desktop/run.sh
```

然后在伴侣的齿轮面板中勾选**桌面窗口**。它默认关闭，因此在启用之前页面不会探测桌面端口。
页面必须保持打开才能获得实时状态，并且两半必须运行在同一台主机上（bridge 仅限回环地址）。
完整指南：[desktop.md](desktop.md)。

## 禁用、卸载、升级

- **禁用**但不卸载：在「设置 → 插件」中切换该 bundle，或从
  `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 中移除它。伴侣会从
  所有页面消失。
- **卸载**：`dsh plugin --profile web remove dsh-pixel-companions`，或使用插件页面。
- **升级 link 安装的检出**：`git pull`，然后 `npm install && npm run build` 并重新加载；
  HMR 传输会换上重新构建的 `client.js`。`package.json` 的改动需要重启 Host。
- **卸载 Git 安装**：`dsh plugin --profile web remove dsh-pixel-companions` 会移除依赖
  和 bundle 条目。

## 用插件页面代替 CLI

Web 插件页面通过相同的 pnpm 路径安装：

1. 侧边栏 → **插件**。
2. **添加插件**（或箭头 → **安装第三方插件**）。
3. 输入与传给 `dsh plugin add` 相同的 spec。
4. **安装**，然后**立即启用**。

## 激活失败时的诊断

- pnpm 输出和安装日志保存在
  `$DSH_HOME/profiles/web/.plugin-manager/logs/` 下。
- 失败的运行会恢复配置档的 `package.json` 和 lockfile。
- 如果页面报告某个 bundle“loaded without registering”Client 模块，请检查
  `client.js` 是否以
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions"` 开头，以及 `package.json`
  中的包名是否仍等于模块 id。
