# Scenes

English | [中文](zh/scenes.md) | [Русский](ru/scenes.md) | [Tiếng Việt](vi/scenes.md) | [日本語](ja/scenes.md) | [한국어](ko/scenes.md)

The companion shows exactly one scene at a time. A scene is chosen from live facts the Web
client already publishes; nothing is inferred from prompt text, no model call is made, and
the user's own typing does not change the scene. The rules live in `src/client/state.ts`
(`deriveScene`) and are covered by `tests/state.test.ts`. The scene captions are localized
in six languages (`src/client/text.ts`, `SCENE_LABELS`); the rules themselves are
language-independent.

## Inputs

| Fact | Source | Meaning |
| --- | --- | --- |
| `running` | `SessionSnapshot.running` via the facts bridge | A turn is running on the Host |
| `pendingInteraction` | `useSessionStatus(…)` → `status.pendingInteraction` | An approval or question waits for the user |
| `inputPhase` | `InputState.phase` via the facts bridge | `plain`, `adjudicating`, `claimed`, `submitting`, `sending` |
| `toolRunning` | `ChatSnapshot.legacy.runningCalls` non-empty, via the bridge | A tool call is executing right now |
| `assistantStream` | `ChatSnapshot.legacy.partial.blocks[].kind` plus a non-empty `text` (`reasoning` or `text`), via the bridge | What the assistant is streaming right now |
| `error` | `SessionSnapshot.promptError` or `lastAgentError` | A send or agent error was reported |
| `openError` | `SessionSnapshot.openState === 'error'` | The session history failed to open |
| `runningMs` | time since `running` became true | Duration of the current run |
| `idleMs` | time since the last session/turn change | Used for the sleep timer |
| `flash` | local 4.8 s timer after a failed stop | Error flash; successful stops are sticky instead |

The live bits reach the overlay as `CompanionFacts.live` (1 = tool call running, 2 =
reasoning streaming, 4 = answer text streaming) and are published within the same frame as
the Chat snapshot, so live scene changes are effectively immediate. The 1 s clock is only
used for the elapsed-time tiers and the sleep timer.

The facts are published by the hidden bridge entry in `conversation.input.dock` and read
by the overlay. When no conversation is mounted, the last facts are retained with
`connected: false` and `running: false`, so the overlay falls back to idle/sleeping
behaviour. A pending interaction is still visible on non-conversation pages because the
overlay also subscribes to `useSessionStatus` itself.

## Rule order

The first matching rule wins:

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

The `flash` rule for `success` still exists in `deriveScene`, but the overlay no longer
produces a timed success flash: a successful stop is applied as a sticky `success`
completion (below). Only the error flash keeps its 4.8 s window. The live bits are not
clock-bound, so only the elapsed-time tiers (`tired` / `coffee`) and the sleep timer have
roughly 1 s granularity.

## Sticky completion and the details panel

A successful stop is sticky: the overlay holds `success` and its one-line report until the
user hovers the companion (a 320 ms dwell keeps a pointer passing over on its way to the
report from dismissing it) or a new turn starts. Hovering dismisses the card and the scene
returns to `idle`/`sleeping`; a newly finished turn re-opens it. The companion does not fall
asleep while a finished result is waiting to be seen.

The report row shows the preview plus a localized **Details** button. It opens a scrollable
panel with the full final answer as plain text — React-escaped, no HTML or markdown
rendering, line breaks preserved, capped at 8000 characters and ellipsised — positioned
above or below the companion and clamped to the viewport. It closes with ✕, Escape, or an
outside press and is hidden when the completion is dismissed. The report text keeps
`role="status"` / `aria-live="polite"`, the button exposes `aria-expanded`, and the panel is
a `role="dialog"` titled **Report** (localized in all six languages). While the panel is
open it replaces the report/input card; closing it restores the card.

The report and the hover message box share one viewport-clamped column anchored under (or
above) the companion. While the report is visible the input sits directly beneath it, with
the details button staying in the report row; hovering the report keeps it open and reveals
the input. Hovering the companion dismisses the report after the 320 ms dwell, after which
the input sits directly under the companion. Leaving the report hides the input again while
the report stays until the sprite is hovered or a new turn starts. The column and the
details panel follow the companion's chosen size (the **Size** slider ranges from 50% to
200%, with 50/100/150/200% preset chips; the same control is also in **Settings → General →
Companion size**).

## Movement visual (`roaming`)

`roaming` is a movement visual, not a scene: it is not in `SCENES`, is never returned by
`deriveScene`, and has no caption or rule. While the user drags Deepy, the overlay draws
his optional desk-free `roaming` animation instead of the current scene, so the desk,
laptop, lamp and floor never travel with him; on release the current scene returns. Whale
Girl has no roaming asset and keeps her scene sprite while moving. The desktop window does
the same while its window is being moved. The 15-state rules above are unchanged.

## What each scene claims

| Scene | Safe reading |
| --- | --- |
| `idle` | Nothing observed |
| `typing` | A submission is in flight, or the assistant is streaming answer text |
| `working` | A tool call is executing |
| `thinking` | The assistant is streaming reasoning, or a model request is in flight — never the user typing |
| `tired` | A long run with no live signal — an analogy, not model fatigue |
| `coffee` | A very long run with no live signal — cosmetic |
| `waiting` | Something is waiting for the user |
| `success` | A run stopped without an observed error — includes cancellations; sticky until you hover the companion or a new turn starts |
| `error` | A real error signal |
| `sleeping` | No session change for 110 s — display only |
| `planning`, `reading`, `searching`, `debugging`, `offline` | Manual preview only; the client has no typed signal for them yet |

`thinking` is about the assistant's own work, never about the user composing a message:
typing a draft changes nothing, and the companion stays `idle` until the assistant actually
works. Never present `tired`, `coffee`, `sleeping`, or `success` as facts about the model.
They are presentation metaphors over coarse client state.

## Manual preview

The gear panel lists all 15 scenes as thumbnails, with captions in the selected UI
language. Selecting one forces that scene until **Auto** is pressed or the session
changes; the forced scene is never persisted. The panel also has **Close** (Escape closes
it too).

## Adding or renaming a scene

1. Add the scene to `SCENES` in `src/client/state.ts` and to a rule in `deriveScene`.
2. Add its caption to `SCENE_LABELS` in `src/client/text.ts` for all six languages.
3. Add `assets/girl/<scene>.{webp,png}` and `assets/whale/<scene>.{webp,png}` (192×128,
   transparent background; 16 frames at 120 ms for the WebP).
4. `npm run build` — the asset manifest and the client bundler pick the new files up.
5. Extend `tests/state.test.ts` for the new rule.

## Reduced motion

When `prefers-reduced-motion: reduce` matches, or the user turns **Motion** off, the still
PNG for the scene is drawn instead of the animated WebP. The check runs on every scene
change, so an OS-level change is picked up without a reload.
