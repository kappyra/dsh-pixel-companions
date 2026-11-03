/**
 * Pixel Companions: a draggable, read-only companion over the whole Web GUI.
 *
 * Two surfaces:
 *  - `CompanionBridge` is registered in `conversation.input.dock`, renders
 *    nothing, and publishes the session facts it receives into the bridge store.
 *  - `Companion` is registered in the frame-wide `shell.overlay`, reads those
 *    facts (plus the global session status), and draws the companion wherever the
 *    user dragged it. It never touches the composer or the prompt.
 */
import * as React from 'react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { assetUrl } from './asset-url.ts'
import { COMPANION_ASSETS } from './assets.generated.ts'
import {
  readSender,
  useCompanionFacts,
  useDisconnectOnUnmount,
  useFactsPublisher,
  useSenderPublisher,
  useSenderReady,
  type ComposerActions,
  type InputPhase,
} from './bridge.ts'
import { LIVE_TOOL, MAX_SCALE, MIN_SCALE, SIZE_PRESETS, SCALE_STEP, clampScale, streamOf } from './signals.ts'
import { useDesktopBridge, type DesktopStatus } from './desktop.ts'
import { deriveScene, type Character, type Scene } from './state.ts'
import { updatePrefs, updatePrefsSoon, usePrefs, type Position, type Preferences } from './prefs.ts'
import { LANGUAGES, SCENE_LABELS, UI_TEXT, type Language } from './text.ts'

/** Layout box of the companion, in CSS pixels; the sprite scales inside it. */
const PET_W = 152
const PET_H = 98
/** Preferred settings panel size; it is clamped to the viewport. */
const PANEL_W = 245
const PANEL_H = 360
/** Pointer travel before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD = 3
/** How long the stop flash keeps the success/error scene. */
const FLASH_MS = 4800

/** Automatic position when the user has never dragged the companion. */
const SCENE_ORDER: Scene[] = [
  'idle', 'typing', 'thinking', 'planning', 'reading', 'searching',
  'working', 'success', 'waiting', 'error', 'tired', 'coffee',
  'sleeping', 'debugging', 'offline',
]
const DEFAULT_INSET_RIGHT = 96
const DEFAULT_INSET_BOTTOM = 150

/** Keeps one render failure from blanking the plugin's slot entries. */
class PetErrorBoundary extends React.Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[dsh-pixel-companions] surface failed', error)
  }

  render() {
    return this.state.failed ? null : (this.props.children ?? null)
  }
}

function viewport(): { width: number; height: number } {
  return {
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }
}

/** Keep the companion fully inside the window. */
function clampPosition(position: Position, width = PET_W, height = PET_H): Position {
  const screen = viewport()
  return {
    // 4 px keeps the gear reachable; 22 px leaves room for the caption above the pet.
    x: Math.min(Math.max(4, Math.round(position.x)), Math.max(4, screen.width - width - 4)),
    y: Math.min(Math.max(22, Math.round(position.y)), Math.max(22, screen.height - height - 4)),
  }
}

/** Default spot: bottom right, where the composer usually sits. */
function autoPosition(width = PET_W, height = PET_H): Position {
  const screen = viewport()
  return clampPosition(
    { x: screen.width - width - DEFAULT_INSET_RIGHT, y: screen.height - height - DEFAULT_INSET_BOTTOM },
    width,
    height,
  )
}

/** One labelled row of the settings panel. */
function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="pxc-row">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

/**
 * Hidden composer-slot entry: publishes the facts the overlay cannot read by
 * itself. It renders nothing, so it adds no layout to the composer stack.
 */
function CompanionBridgeInner({
  session,
  input,
  useSessionStatus,
  useChat,
  inputActions,
}: {
  session: { sessionId: unknown; running: boolean; promptError: unknown; lastAgentError: string | null; openState: string }
  input: { phase: InputPhase; draft: string }
  useSessionStatus: (selector: (snapshot: Map<unknown, { pendingInteraction?: unknown }>) => unknown) => unknown
  useChat?: (selector: (snapshot: unknown) => unknown, equal?: (a: unknown, b: unknown) => boolean) => unknown
  inputActions?: ComposerActions
}) {
  const status = useSessionStatus((snapshot) => snapshot.get(session.sessionId)) as
    | { pendingInteraction?: unknown }
    | undefined
  useFactsPublisher({ session, input, pending: status?.pendingInteraction !== undefined, useChat })
  useSenderPublisher(inputActions, input.draft)
  useDisconnectOnUnmount()
  return null
}

/**
 * The companion itself: draggable, with a settings popover anchored to it.
 * @param props - slot standard props; only `useSessionStatus` is used.
 */
function CompanionInner({ useSessionStatus }: { useSessionStatus: (selector: (snapshot: any) => unknown) => unknown }) {
  const facts = useCompanionFacts()
  const prefs = usePrefs()
  const [open, setOpen] = useState(false)
  const [manualScene, setManualScene] = useState<Scene | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [windowSize, setWindowSize] = useState(viewport)
  const [position, setPosition] = useState<Position | null>(prefs.position)
  /** True while the user moves the companion; Deepy then uses the desk-free roaming animation. */
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  /** The finished turn stays on screen until the user hovers the companion. */
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  /** Local user interaction wakes the companion even when the session did not change. */
  const [wakeAt, setWakeAt] = useState(0)
  const [draftMessage, setDraftMessage] = useState('')
  const messageRef = useRef<HTMLInputElement | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reportRef = useRef<HTMLDivElement | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const gearRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean; toggle: boolean; current: Position } | null>(null)

  const status = useSessionStatus((snapshot: any) =>
    facts.sessionId === undefined ? undefined : snapshot.get(facts.sessionId),
  ) as { pendingInteraction?: unknown } | undefined
  const pending = status?.pendingInteraction !== undefined

  const save = useCallback((patch: Partial<Preferences>) => updatePrefs(patch), [])

  // One slow clock drives the run-duration tiers, the stop flash, and sleeping.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Keep the companion on screen when the window changes size.
  // Opening the settings panel hides the browser-only detail view.
  useEffect(() => {
    if (open) setDetailOpen(false)
  }, [open])

  // A new finished turn re-opens the completion card and closes a stale panel.
  useEffect(() => {
    if (facts.stopAt === 0) return
    setCompletionDismissed(false)
    setDetailOpen(false)
  }, [facts.stopAt])

  // Escape and an outside press close the detail panel.
  useEffect(() => {
    if (!detailOpen) return undefined
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setDetailOpen(false)
    }
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null
      if (target === null) return
      if (detailRef.current?.contains(target) === true) return
      if (reportRef.current?.contains(target) === true) return
      setDetailOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [detailOpen])

  // Drop pending hover/dismiss timers when the companion unmounts.
  useEffect(
    () => () => {
      if (hoverTimer.current !== undefined) clearTimeout(hoverTimer.current)
      if (dismissTimer.current !== undefined) clearTimeout(dismissTimer.current)
    },
    [],
  )

  // Escape closes the settings panel.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // A press outside the panel, its gear, or the pet closes the panel.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target === null) return
      if (panelRef.current?.contains(target) === true) return
      if (gearRef.current?.contains(target) === true) return
      if (target.closest !== undefined && target.closest('.pxc-pet') !== null) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const petW = Math.max(48, Math.round(PET_W * prefs.scale))
  const petH = Math.max(32, Math.round(PET_H * prefs.scale))
  const spot = position === null ? autoPosition(petW, petH) : clampPosition(position, petW, petH)

  // Keep the sprite inside the window when its size changes or the window resizes.
  useEffect(() => {
    const onResize = () => {
      setWindowSize(viewport())
      setPosition((current) => (current === null ? null : clampPosition(current, petW, petH)))
    }
    setPosition((current) => {
      if (current === null) return null
      const next = clampPosition(current, petW, petH)
      return next.x === current.x && next.y === current.y ? current : next
    })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [petW, petH])
  const copy = UI_TEXT[prefs.language]
  // Success is sticky now, so only the error flash keeps its short window.
  const flash = facts.stopAt !== 0 && facts.stopError && now - facts.stopAt < FLASH_MS ? 'error' : null
  const autoScene = deriveScene({
    running: facts.running,
    inputPhase: facts.phase,
    pendingInteraction: pending,
    error: Boolean(facts.promptError || (facts.lastAgentError !== null && !facts.running)),
    openError: facts.openState === 'error',
    assistantStream: streamOf(facts.live),
    toolRunning: (facts.live & LIVE_TOOL) !== 0,
    runningMs: facts.running ? Math.max(0, now - facts.runningAt) : 0,
    idleMs: Math.max(0, now - Math.max(facts.idleAt, wakeAt)),
    flash,
  })
  // A finished turn is sticky: `success` and its report stay until the user hovers
  // the companion (or a new turn starts). An empty answer keeps the old timed flash.
  const completionActive =
    facts.stopAt !== 0 &&
    !facts.running &&
    !pending &&
    !facts.stopError &&
    facts.openState !== 'error' &&
    facts.report !== '' &&
    !completionDismissed

  // The detail panel cannot outlive the completion it describes.
  useEffect(() => {
    if (!completionActive) setDetailOpen(false)
  }, [completionActive])

  const scene = manualScene ?? (completionActive ? 'success' : autoScene)
  const assets = COMPANION_ASSETS[prefs.character][scene]
  // `roaming` is an optional bonus animation of the character alone: fixed furniture
  // (desk, laptop, lamp, floor) must never travel with a moving companion.
  const roaming = (COMPANION_ASSETS as Record<string, Record<string, { webp: string; png: string } | undefined>>)[
    prefs.character
  ]?.roaming
  const moving = dragging && roaming !== undefined
  const shown = moving ? roaming : assets
  const reduced =
    typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  const src = assetUrl(prefs.animation && !reduced ? shown.webp : shown.png)
  const caption = SCENE_LABELS[scene][prefs.language]
  const characterName = prefs.character === 'girl' ? 'Lumi' : 'Deepy'
  const desktopStatus = useDesktopBridge(prefs.desktop, {
    scene,
    character: prefs.character,
    scale: prefs.scale,
    animation: prefs.animation,
  })
  const desktopLabel = !prefs.desktop
    ? copy.desktopOff
    : desktopStatus === 'connected'
      ? copy.desktopConnected
      : copy.desktopAbsent

  const startDrag = (event: ReactPointerEvent<HTMLElement>, toggle: boolean) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    setWakeAt(Date.now())
    dragRef.current = { dx: event.clientX - spot.x, dy: event.clientY - spot.y, moved: false, toggle, current: spot }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (drag === null) return
    const next = clampPosition({ x: event.clientX - drag.dx, y: event.clientY - drag.dy }, petW, petH)
    if (!drag.moved) {
      if (Math.abs(next.x - spot.x) < DRAG_THRESHOLD && Math.abs(next.y - spot.y) < DRAG_THRESHOLD) return
      drag.moved = true
      setDragging(true)
    }
    drag.current = next
    setPosition(next)
    event.preventDefault()
  }

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // The pointer was already released.
    }
    if (drag === null) return
    if (drag.moved) {
      save({ position: drag.current })
      return
    }
    // A press without travel is a click; only the companion itself toggles the panel.
    if (drag.toggle) setOpen((value) => !value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((value) => !value)
    }
  }

  const cancelHoverHide = useCallback(() => {
    if (hoverTimer.current !== undefined) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = undefined
    }
  }, [])

  const scheduleHoverHide = useCallback(() => {
    cancelHoverHide()
    if (messageRef.current !== null && document.activeElement === messageRef.current) return
    hoverTimer.current = setTimeout(() => setHovering(false), 260)
  }, [cancelHoverHide])

  const cancelCompletionDismiss = useCallback(() => {
    if (dismissTimer.current !== undefined) {
      clearTimeout(dismissTimer.current)
      dismissTimer.current = undefined
    }
  }, [])

  const scheduleCompletionDismiss = useCallback(() => {
    if (!completionActive) return
    cancelCompletionDismiss()
    // A short dwell lets a pointer pass over the companion on its way to the
    // report without dismissing it.
    dismissTimer.current = setTimeout(() => setCompletionDismissed(true), 320)
  }, [completionActive, cancelCompletionDismiss])

  /** Hovering the report keeps it open and reveals the message box right under it. */
  const onEnterReport = () => {
    cancelCompletionDismiss()
    cancelHoverHide()
    setHovering(true)
  }

  const onEnterPet = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return
    cancelHoverHide()
    setHovering(true)
    scheduleCompletionDismiss()
  }

  const onLeavePet = () => {
    scheduleHoverHide()
    cancelCompletionDismiss()
  }

  const submitMessage = (event: React.FormEvent) => {
    event.preventDefault()
    const text = draftMessage.trim()
    if (text.length === 0) return
    const send = readSender()
    if (send === null) return
    send(text)
    setDraftMessage('')
    setHovering(false)
  }

  const panelWidth = Math.min(PANEL_W, windowSize.width - 16)
  const panelHeight = Math.min(PANEL_H, windowSize.height - 16)
  const belowRoom = windowSize.height - (spot.y + petH)
  const panelTop = belowRoom >= panelHeight + 12 ? spot.y + petH + 8 : Math.max(8, spot.y - panelHeight - 8)
  const panelLeft = Math.min(Math.max(8, spot.x + petW - panelWidth), Math.max(8, windowSize.width - panelWidth - 8))
  // One viewport-clamped stack holds the completion report and the hover message
  // box: the input sits directly under the report while it is visible, and moves
  // back under the companion as soon as the report is dismissed.
  const stackWidth = Math.min(280, windowSize.width - 16)
  const stackLeft = Math.max(8, Math.min(spot.x + petW / 2 - stackWidth / 2, windowSize.width - stackWidth - 8)) - spot.x
  const stackBelow = windowSize.height - (spot.y + petH) >= 48
  const stackStyle = {
    left: stackLeft,
    width: stackWidth,
    top: stackBelow ? petH + 6 : 'auto',
    bottom: stackBelow ? 'auto' : petH + 6,
  } as CSSProperties
  const detailWidth = Math.min(360, windowSize.width - 16)
  const detailMaxHeight = Math.max(160, Math.min(420, Math.round(windowSize.height * 0.55)))
  const detailLeft = Math.min(
    Math.max(8, spot.x + petW / 2 - detailWidth / 2),
    Math.max(8, windowSize.width - detailWidth - 8),
  )
  const detailBelow = windowSize.height - (spot.y + petH) >= 160
  const detailTop = detailBelow ? spot.y + petH + 8 : Math.max(8, spot.y - detailMaxHeight - 8)
  const detailStyle = {
    left: detailLeft,
    top: detailTop,
    width: detailWidth,
    maxHeight: detailMaxHeight,
  } as CSSProperties
  const senderReady = useSenderReady()
  const reportVisible = completionActive && !open && facts.report !== ''
  const detailVisible = detailOpen && completionActive && !open && facts.detail !== ''
  const composerVisible = prefs.enabled && !open && !dragging && hovering && facts.connected && senderReady

  return (
    <div className="pxc-layer">
      <style>{STYLES}</style>
      {prefs.enabled ? (
        <div className="pxc-float" style={{ left: spot.x, top: spot.y, width: petW, height: petH }}>
          <span className="pxc-caption">{caption}</span>
          <img
            className="pxc-pet"
            style={{ width: petW, height: petH }}
            src={src}
            alt={`${characterName}: ${caption}`}
            draggable={false}
            role="button"
            tabIndex={0}
            aria-label={copy.settingsAria}
            aria-expanded={open}
            onPointerDown={(event) => startDrag(event, true)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerEnter={onEnterPet}
            onPointerLeave={onLeavePet}
            onKeyDown={onKeyDown}
          />
          <button
            className="pxc-gear"
            type="button"
            ref={gearRef}
            aria-label={copy.settingsAria}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            ⚙
          </button>
          {!detailVisible && (
          <div className="pxc-stack" style={stackStyle}>
          {reportVisible && (
            <div
              className="pxc-report"
              ref={reportRef}
              onPointerEnter={onEnterReport}
              onPointerLeave={scheduleHoverHide}
            >
              <span className="pxc-report-text" title={facts.report} role="status" aria-live="polite">
                {facts.report}
              </span>
              {facts.detail !== '' && (
                <button
                  type="button"
                  className="pxc-report-more"
                  aria-expanded={detailOpen}
                  onClick={() => setDetailOpen((value) => !value)}
                >
                  {copy.reportDetails}
                </button>
              )}
            </div>
          )}
          {composerVisible && (
            <form
              className="pxc-composer"
              onSubmit={submitMessage}
              onPointerEnter={cancelHoverHide}
              onPointerLeave={scheduleHoverHide}
            >
              <input
                ref={messageRef}
                className="pxc-input"
                value={draftMessage}
                placeholder={copy.messagePlaceholder}
                aria-label={copy.messagePlaceholder}
                maxLength={2000}
                onFocus={cancelHoverHide}
                onChange={(event) => setDraftMessage(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraftMessage('')
                    setHovering(false)
                  }
                }}
              />
              <button
                type="submit"
                className="pxc-send"
                title={copy.send}
                aria-label={copy.send}
                disabled={draftMessage.trim().length === 0}
              >
                ➤
              </button>
            </form>
          )}
          </div>
          )}
        </div>
      ) : (
        <button
          className="pxc-show"
          type="button"
          style={{ left: spot.x, top: spot.y }}
          title={copy.showCompanion}
          aria-label={copy.showCompanion}
          onClick={() => save({ enabled: true })}
          onPointerDown={(event) => startDrag(event, true)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        >
          🐳
        </button>
      )}
      {open && (
        <div
          className="pxc-panel"
          ref={panelRef}
          role="dialog"
          aria-label={copy.settingsAria}
          style={{ left: panelLeft, top: panelTop, width: panelWidth, maxHeight: panelHeight }}
        >
          <strong className="pxc-status">{copy.settingsTitle}</strong>
          <Row label={copy.character} htmlFor="pxc-character">
            <select
              className="pxc-select"
              id="pxc-character"
              value={prefs.character}
              onChange={(event) => save({ character: event.currentTarget.value as Character })}
            >
              <option value="girl">Lumi</option>
              <option value="whale">Deepy</option>
            </select>
          </Row>
          <Row label={copy.scale} htmlFor="pxc-scale">
            <div className="pxc-sizer">
              <button
                type="button"
                className="pxc-step"
                aria-label={copy.smaller}
                onClick={() => save({ scale: clampScale(prefs.scale - SCALE_STEP) })}
              >
                −
              </button>
              <input
                id="pxc-scale"
                className="pxc-range"
                type="range"
                min={Math.round(MIN_SCALE * 100)}
                max={Math.round(MAX_SCALE * 100)}
                step={Math.round(SCALE_STEP * 100)}
                value={Math.round(prefs.scale * 100)}
                aria-label={copy.scale}
                aria-valuetext={`${Math.round(prefs.scale * 100)}%`}
                onChange={(event) => updatePrefsSoon({ scale: clampScale(Number(event.currentTarget.value) / 100) })}
              />
              <button
                type="button"
                className="pxc-step"
                aria-label={copy.bigger}
                onClick={() => save({ scale: clampScale(prefs.scale + SCALE_STEP) })}
              >
                +
              </button>
              <span className="pxc-size-value">{Math.round(prefs.scale * 100)}%</span>
            </div>
          </Row>
          <div className="pxc-presets" role="group" aria-label={copy.scale}>
            {SIZE_PRESETS.map((percent) => {
              const active = Math.round(prefs.scale * 100) === percent
              return (
                <button
                  key={percent}
                  type="button"
                  className={'pxc-preset' + (active ? ' is-on' : '')}
                  aria-pressed={active}
                  onClick={() => save({ scale: clampScale(percent / 100) })}
                >
                  {percent}%
                </button>
              )
            })}
          </div>
          <Row label={copy.language} htmlFor="pxc-language">
            <select
              className="pxc-select"
              id="pxc-language"
              value={prefs.language}
              onChange={(event) => save({ language: event.currentTarget.value as Language })}
            >
              {LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label={copy.motion} htmlFor="pxc-animation">
            <input
              className="pxc-check"
              id="pxc-animation"
              type="checkbox"
              checked={prefs.animation}
              onChange={(event) => save({ animation: event.currentTarget.checked })}
            />
          </Row>
          <Row label={copy.visible} htmlFor="pxc-visible">
            <input
              className="pxc-check"
              id="pxc-visible"
              type="checkbox"
              checked={prefs.enabled}
              onChange={(event) => save({ enabled: event.currentTarget.checked })}
            />
          </Row>
          <div className="pxc-row" title={copy.desktopHint}>
            <label htmlFor="pxc-desktop">{copy.desktopWindow}</label>
            <div className="pxc-desktop">
              <span className={'pxc-desktop-status' + (desktopStatus === 'connected' && prefs.desktop ? ' is-on' : '')}>
                {desktopLabel}
              </span>
              <input
                className="pxc-check"
                id="pxc-desktop"
                type="checkbox"
                checked={prefs.desktop}
                onChange={(event) => save({ desktop: event.currentTarget.checked })}
              />
            </div>
          </div>
          {prefs.desktop && <DesktopPreviewCard src={src} copy={copy} status={desktopStatus} />}
          <div className="pxc-row">
            <span>{copy.testScene}</span>
            <button type="button" className="pxc-button" onClick={() => setManualScene(null)}>
              {copy.auto}
            </button>
          </div>
          <ScenePreviewGrid
            character={prefs.character}
            language={prefs.language}
            manualScene={manualScene}
            onPick={setManualScene}
            ariaLabel={copy.previewAria}
          />
          <div className="pxc-row">
            <button
              type="button"
              className="pxc-button"
              onClick={() => {
                setPosition(null)
                save({ position: null })
              }}
            >
              {copy.resetPosition}
            </button>
            <button type="button" className="pxc-button" onClick={() => setOpen(false)}>
              {copy.close}
            </button>
          </div>
        </div>
      )}
      {detailVisible && (
        <section
          className="pxc-detail"
          ref={detailRef}
          role="dialog"
          aria-label={copy.reportTitle}
          style={detailStyle}
        >
          <header className="pxc-detail-head">
            <strong className="pxc-detail-title">{copy.reportTitle}</strong>
            <button
              type="button"
              className="pxc-detail-close"
              aria-label={copy.close}
              onClick={() => setDetailOpen(false)}
            >
              ✕
            </button>
          </header>
          <pre className="pxc-detail-body">{facts.detail}</pre>
        </section>
      )}
    </div>
  )
}

/** Panel card that mirrors what the desktop window shows. */
const DesktopPreviewCard = React.memo(function DesktopPreviewCard(props: {
  src: string
  copy: (typeof UI_TEXT)['en']
  status: DesktopStatus
}) {
  const { src, copy, status } = props
  return (
    <div className="pxc-desktop-preview" role="group" aria-label={copy.desktopPreview}>
      <div className="pxc-desktop-stage">
        <img className="pxc-desktop-shot" src={src} alt="" aria-hidden="true" draggable={false} />
      </div>
      <div className="pxc-desktop-copy">
        <span className="pxc-desktop-preview-title">{copy.desktopPreview}</span>
        {status === 'connected' ? (
          <span className="pxc-desktop-status is-on">{copy.desktopConnected}</span>
        ) : (
          <span className="pxc-desktop-warn">⚠ {copy.desktopWarning}</span>
        )}
      </div>
    </div>
  )
})

/** Fifteen thumbnail buttons; memoized so size drags never reconcile them. */
const ScenePreviewGrid = React.memo(function ScenePreviewGrid(props: {
  character: Character
  language: Language
  manualScene: Scene | null
  onPick: (scene: Scene) => void
  ariaLabel: string
}) {
  const { character, language, manualScene, onPick, ariaLabel } = props
  return (
    <div className="pxc-preview" role="group" aria-label={ariaLabel}>
      {SCENE_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          data-active={manualScene === key}
          title={SCENE_LABELS[key][language]}
          aria-label={SCENE_LABELS[key][language]}
          onClick={() => onPick(key)}
        >
          <img alt="" src={COMPANION_ASSETS[character][key].png} />
        </button>
      ))}
    </div>
  )
})

/** Slot entry: the facts bridge, isolated behind an error boundary. */
export function CompanionBridge(props: Record<string, unknown>) {
  return (
    <PetErrorBoundary>
      <CompanionBridgeInner {...props} />
    </PetErrorBoundary>
  )
}

/** Slot entry: the overlay companion, isolated behind an error boundary. */
export function Companion(props: Record<string, unknown>) {
  return (
    <PetErrorBoundary>
      <CompanionInner {...props} />
    </PetErrorBoundary>
  )
}

const STYLES = `
.pxc-layer{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:inherit;isolation:isolate}
.pxc-float{position:absolute;pointer-events:none}
.pxc-pet{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;cursor:grab;user-select:none;-webkit-user-drag:none;touch-action:none;pointer-events:auto;filter:drop-shadow(0 4px 8px rgba(52,83,159,.16));transition:filter 160ms ease}
.pxc-pet:active{cursor:grabbing}
.pxc-pet:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:4px;border-radius:12px}
.pxc-caption{position:absolute;left:50%;top:-18px;transform:translateX(-50%);max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:550;letter-spacing:.02em;opacity:.82;color:var(--dsw-alias-label-secondary,#bdc8e4);pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.pxc-gear{position:absolute;top:-8px;right:-8px;width:25px;height:25px;display:grid;place-items:center;cursor:pointer;pointer-events:auto;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.25));background:var(--dsw-alias-bg-layer-1,rgba(17,25,49,.85));color:var(--dsw-alias-label-secondary,#bdc8e4);font:inherit;font-size:12px;line-height:1;border-radius:999px;box-shadow:0 3px 9px rgba(0,0,0,.12);opacity:0;transition:opacity 140ms ease}
.pxc-float:hover .pxc-gear,.pxc-gear:focus-visible,.pxc-gear[aria-expanded=true]{opacity:1}
.pxc-stack{position:absolute;display:flex;flex-direction:column;gap:6px;pointer-events:none;box-sizing:border-box}
.pxc-report{pointer-events:auto;display:flex;align-items:center;gap:8px;box-sizing:border-box;padding:4px 5px 4px 10px;border-radius:10px;background:var(--dsw-alias-bg-overlay,#141e36);border:1px solid var(--dsw-alias-border-l2,#62739d);color:var(--dsw-alias-label-primary,#eff3fe);font-size:11px;line-height:1.45;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.pxc-report-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pxc-report-more{flex:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.35));background:var(--dsw-alias-bg-layer-1,rgba(17,25,49,.85));color:inherit;font:inherit;font-size:10px;line-height:18px;height:19px;padding:0 7px;border-radius:8px}
.pxc-report-more:hover{color:var(--dsw-alias-brand-primary,#8ca9fe)}
.pxc-report-more:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:2px}
.pxc-detail{position:fixed;pointer-events:auto;display:flex;flex-direction:column;box-sizing:border-box;z-index:55;overflow:hidden;border-radius:14px;background:var(--dsw-alias-bg-overlay,#141e36);color:var(--dsw-alias-label-primary,#eff3fe);border:1px solid var(--dsw-alias-border-l2,#62739d);box-shadow:0 16px 40px rgba(0,0,0,.28)}
.pxc-detail-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:11px}
.pxc-detail-title{font-weight:650}
.pxc-detail-close{cursor:pointer;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;padding:3px;border-radius:6px}
.pxc-detail-close:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:1px}
.pxc-detail-body{margin:0;padding:10px;overflow:auto;font:inherit;font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word;min-height:0}
.pxc-composer{pointer-events:auto;display:flex;align-items:center;gap:5px;box-sizing:border-box;width:100%;padding:4px 5px 4px 9px;border-radius:12px;background:var(--dsw-alias-bg-overlay,#141e36);border:1px solid var(--dsw-alias-border-l2,#62739d);box-shadow:0 8px 22px rgba(0,0,0,.24)}
.pxc-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary,#eff3fe);font:inherit;font-size:12px;line-height:1.6}
.pxc-input::placeholder{color:var(--dsw-alias-label-secondary,#9aa8c7);opacity:.85}
.pxc-send{flex:none;display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:8px;cursor:pointer;background:var(--dsw-alias-brand-primary,#5f85fa);color:#fff;font:inherit;font-size:12px;line-height:1}
.pxc-send:disabled{opacity:.45;cursor:default}
.pxc-send:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:2px}
.pxc-show{position:absolute;pointer-events:auto;cursor:grab;width:34px;height:34px;display:grid;place-items:center;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.25));background:var(--dsw-alias-bg-layer-1,rgba(17,25,49,.85));color:var(--dsw-alias-label-primary,#eff3fe);font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,.16)}
.pxc-panel{position:fixed;pointer-events:auto;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box;z-index:50;border-radius:16px;background:var(--dsw-alias-bg-overlay,#141e36);color:var(--dsw-alias-label-primary,#eff3fe);border:1px solid var(--dsw-alias-border-l2,#62739d);box-shadow:0 14px 35px rgba(0,0,0,.22)}
.pxc-row{display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:12px}
.pxc-row label{flex:1}
.pxc-sizer{display:flex;align-items:center;gap:5px;flex:none}
.pxc-step{width:20px;height:20px;display:grid;place-items:center;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.35));background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;border-radius:7px}
.pxc-step:hover{color:var(--dsw-alias-brand-primary,#8ca9fe)}
.pxc-step:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:2px}
.pxc-range{width:72px;cursor:pointer;accent-color:var(--dsw-alias-brand-primary,#5f85fa)}
.pxc-presets{display:flex;flex-wrap:wrap;gap:4px}
.pxc-preset{cursor:pointer;border:1px solid transparent;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:inherit;font:inherit;font-size:10px;line-height:18px;height:20px;padding:0 7px;border-radius:7px;opacity:.85}
.pxc-preset:hover{opacity:1;color:var(--dsw-alias-brand-primary,#8ca9fe)}
.pxc-preset.is-on{border-color:var(--dsw-alias-brand-primary,#8ca9fe);background:rgba(100,125,190,.18);opacity:1;font-weight:600}
.pxc-preset:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:1px}
.pxc-size-value{min-width:36px;text-align:right;font-size:11px;opacity:.82;font-variant-numeric:tabular-nums}
.pxc-select{max-width:126px;background:transparent;border:1px solid var(--dsw-alias-border-l2,#62739d);border-radius:8px;padding:4px;color:inherit;font:inherit;font-size:12px}
.pxc-check{accent-color:var(--dsw-alias-brand-primary,#5f85fa)}
.pxc-preview{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
.pxc-preview button{cursor:pointer;border:1px solid transparent;background:transparent;color:inherit;padding:3px;border-radius:6px;font-size:10px}
.pxc-preview button[data-active=true]{border-color:var(--dsw-alias-brand-primary,#8ca9fe);background:rgba(100,125,190,.18)}
.pxc-preview img{width:100%;image-rendering:pixelated;vertical-align:middle}
.pxc-status{font-weight:650;font-size:11px}
.pxc-desktop{display:flex;align-items:center;gap:7px}
.pxc-desktop-preview{display:flex;align-items:center;gap:9px;padding:7px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.25));background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}
.pxc-desktop-stage{flex:none;width:92px;height:62px;display:grid;place-items:center;border-radius:9px;border:1px dashed var(--dsw-alias-border-l2,rgba(145,166,210,.35));background-image:linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,.05) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,.05) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.05) 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0}
.pxc-desktop-shot{max-width:100%;max-height:100%;object-fit:contain;image-rendering:pixelated}
.pxc-desktop-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.pxc-desktop-preview-title{font-size:11px;font-weight:600;line-height:1.35;color:var(--dsw-alias-label-primary,#eff3fe)}
.pxc-desktop-warn{font-size:10px;line-height:1.4;color:var(--dsw-alias-state-warn-primary,#e0a94a)}
.pxc-desktop-status{font-size:11px;opacity:.7;white-space:nowrap}
.pxc-desktop-status.is-on{color:var(--dsw-alias-state-success-primary,#4ac48a);opacity:1}
.pxc-button{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(145,166,210,.25));background:var(--dsw-alias-bg-layer-1,rgba(17,25,49,.85));color:inherit;font:inherit;font-size:11px;line-height:22px;height:25px;padding:0 8px;border-radius:10px;box-shadow:0 3px 9px rgba(0,0,0,.05)}
.pxc-button:focus-visible,.pxc-select:focus-visible,.pxc-check:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7698ff);outline-offset:3px}
@media(prefers-reduced-motion:reduce){.pxc-pet{filter:none;transition:none}}
`
