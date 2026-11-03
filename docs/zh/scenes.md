# 场景

[English](../scenes.md) | 中文 | [Русский](../ru/scenes.md) | [Tiếng Việt](../vi/scenes.md) | [日本語](../ja/scenes.md) | [한국어](../ko/scenes.md)

伴侣一次只显示一个场景。场景由 Web 客户端已经公布的实时事实选择；不从提示文本推断任何内容，
也不发起模型调用，用户自己的输入不会改变场景。规则位于 `src/client/state.ts`
（`deriveScene`），并由 `tests/state.test.ts` 覆盖。场景字幕有六种语言的本地化
（`src/client/text.ts`，`SCENE_LABELS`）；规则本身与语言无关。

## 输入

| 事实 | 来源 | 含义 |
| --- | --- | --- |
| `running` | 经事实 bridge 的 `SessionSnapshot.running` | Host 上有一轮正在运行 |
| `pendingInteraction` | `useSessionStatus(…)` → `status.pendingInteraction` | 有批准或提问在等待用户 |
| `inputPhase` | 经事实 bridge 的 `InputState.phase` | `plain`、`adjudicating`、`claimed`、`submitting`、`sending` |
| `toolRunning` | 经 bridge 的 `ChatSnapshot.legacy.runningCalls` 非空 | 当前有工具调用正在执行 |
| `assistantStream` | 经 bridge 的 `ChatSnapshot.legacy.partial.blocks[].kind` 以及非空 `text`（`reasoning` 或 `text`） | 助手当前正在流式输出的内容 |
| `error` | `SessionSnapshot.promptError` 或 `lastAgentError` | 报告了发送或 agent 错误 |
| `openError` | `SessionSnapshot.openState === 'error'` | 会话历史打开失败 |
| `runningMs` | `running` 变为 true 之后的时间 | 当前运行的时长 |
| `idleMs` | 上次会话/轮次变化之后的时间 | 用于睡眠计时器 |
| `flash` | 失败停止后的本地 4.8 秒计时器 | 错误闪光；成功停止改为粘性显示 |

这些实时位以 `CompanionFacts.live` 的形式到达 overlay（1 = 工具调用运行中，2 = 推理流式
输出中，4 = 回答文本流式输出中），并与 Chat snapshot 在同一帧内发布，因此实时场景变化
实际上是即时的。1 秒时钟只用于经过时间档位和睡眠计时器。

这些事实由 `conversation.input.dock` 中的隐藏 bridge 条目发布，由 overlay 读取。没有挂载
对话时，最后的事实会保留并标记 `connected: false` 和 `running: false`，因此 overlay 会
回退到闲置/睡眠行为。待处理交互在非对话页面仍然可见，因为 overlay 自己也订阅了
`useSessionStatus`。

## 规则顺序

第一条匹配的规则生效：

```text
openError                          -> error
pendingInteraction                 -> waiting
inputPhase sending/submitting/adjudicating -> typing
toolRunning                        -> working
assistantStream === 'reasoning'    -> thinking
assistantStream === 'answer'       -> typing
running:
    runningMs > 180 000            -> coffee
    runningMs >  75 000            -> tired
    otherwise                      -> thinking   (request in flight, no live stream)
flash === 'error' or error         -> error
flash === 'success'                -> success
idleMs > 110 000                   -> sleeping
otherwise                          -> idle
```

`deriveScene` 中仍然存在 `success` 的 `flash` 规则，但 overlay 不再产生定时的成功闪光：
成功停止会作为粘性的 `success` 完成状态应用（见下文）。只有错误闪光保留 4.8 秒窗口。
实时位不受时钟约束，因此只有经过时间档位（`tired` / `coffee`）和睡眠计时器约有 1 秒
粒度。

## 粘性完成与详情面板

成功停止是粘性的：overlay 会保持 `success` 及其单行报告，直到用户悬停伴侣（320 ms 的
停留时间可避免指针在前往报告途中掠过时将其关闭）或新的一轮开始。悬停会关闭卡片，场景
回到 `idle`/`sleeping`；新完成的轮次会重新打开它。在完成结果等待被查看时，伴侣不会进入
睡眠。

报告行显示预览以及本地化的**详情**按钮。它打开一个可滚动面板，以纯文本显示完整最终回答
——经过 React 转义，不渲染 HTML 或 markdown，保留换行，最多 8000 字符并带省略号——定位
在伴侣上方或下方，并限制在视口内。面板可通过 ✕、Escape 或点击外部关闭，并在完成状态被
关闭时隐藏。报告文本保留 `role="status"` / `aria-live="polite"`，按钮暴露
`aria-expanded`，面板是 `role="dialog"`，标题为**报告**（六种语言均已本地化）。面板打开时会替换报告/输入卡片；关闭后卡片恢复。

报告和悬停消息框共用一个限制在视口内、锚定在伴侣下方（或上方）的列。报告可见时，输入框
直接位于报告下方，详情按钮仍留在报告行内；悬停报告会保持它打开并显示输入框。悬停伴侣会在
320 ms 停留后关闭报告，之后输入框直接位于伴侣下方。离开报告会再次隐藏输入框，而报告会
一直保留，直到悬停精灵或新的一轮开始。这个列和详情面板都会跟随伴侣所选的大小（**大小**
滑块范围为 50% 到 200%，并有 50/100/150/200% 预设按钮；同一个控件也在**设置 → 通用 →
伴侣大小**中）。

## 移动视觉（`roaming`）

`roaming` 是移动视觉，不是场景：它不在 `SCENES` 中，`deriveScene` 永远不会返回它，也没有
字幕或规则。用户拖动 Deepy 时，overlay 会改为绘制他可选的、没有书桌的 `roaming` 动画，
因此书桌、笔记本电脑、台灯和地板不会跟着他移动；松开后回到当前场景。Whale Girl 没有
roaming 素材，移动时继续使用她的场景精灵。桌面窗口在被移动时也是如此。上面的 15 状态
规则不变。

## 每个场景声称什么

| 场景 | 安全的解读 |
| --- | --- |
| `idle` | 没有观察到任何东西 |
| `typing` | 有提交正在进行，或助手正在流式输出回答文本 |
| `working` | 有工具调用正在执行 |
| `thinking` | 助手正在流式输出推理，或模型请求正在进行中——绝不是用户输入 |
| `tired` | 没有实时信号的长运行——这是比喻，不是模型疲劳 |
| `coffee` | 没有实时信号的超长运行——仅装饰 |
| `waiting` | 有东西在等用户 |
| `success` | 一轮无观察到的错误地停止——包括取消；粘性保留，直到悬停伴侣或新的一轮开始 |
| `error` | 真实的错误信号 |
| `sleeping` | 110 秒没有会话变化——仅显示 |
| `planning`、`reading`、`searching`、`debugging`、`offline` | 仅手动预览；客户端目前没有它们的带类型信号 |

`thinking` 指的是助手自己的工作，绝不是用户正在撰写消息：输入草稿不会改变任何东西，
伴侣会保持 `idle`，直到助手真正开始工作。绝不要把 `tired`、`coffee`、`sleeping` 或
`success` 呈现为关于模型的事实。它们是对粗略客户端状态的呈现比喻。

## 手动预览

齿轮面板以缩略图列出全部 15 个场景，字幕使用当前选中的界面语言。选择一个会强制显示该
场景，直到按下**自动**或会话发生变化；强制的场景从不持久化。面板还有**关闭**（Escape
也可以关闭）。

## 添加或重命名场景

1. 把场景加入 `src/client/state.ts` 的 `SCENES`，并在 `deriveScene` 中加一条规则。
2. 在 `src/client/text.ts` 的 `SCENE_LABELS` 中为全部六种语言添加它的字幕。
3. 添加 `assets/girl/<scene>.{webp,png}` 和 `assets/whale/<scene>.{webp,png}`
   （192×128，透明背景；WebP 为 16 帧、每帧 120 毫秒）。
4. `npm run build` —— 素材清单和 client 打包器会自动纳入新文件。
5. 为新规则扩展 `tests/state.test.ts`。

## 减少动态效果

当 `prefers-reduced-motion: reduce` 匹配，或用户关闭**动画**时，会绘制该场景的静止 PNG
而不是动画 WebP。检查会在每次场景变化时运行，因此操作系统级的变化无需重新加载即可被
捕捉。
