/**
 * Bridge between the session-scoped composer slot and the frame-wide overlay.
 *
 * The companion is drawn in `shell.overlay` so it can float anywhere on the page,
 * but only `conversation.input.dock` receives the per-session `SessionSnapshot`,
 * `InputState`, the Chat snapshot and the composer actions. A hidden entry
 * registered in that dock slot publishes those facts here; the overlay reads
 * them. When no conversation is mounted the last facts stay with
 * `connected: false` and the overlay falls back to idle/sleeping behaviour.
 */
import { useEffect, useRef, useState } from 'react'
import { assistantText, cleanReport, lastAssistantNode, lastResponse, liveBits } from './signals.ts'

export type InputPhase = 'plain' | 'adjudicating' | 'claimed' | 'submitting' | 'sending'

export interface CompanionFacts {
  sessionId: string | undefined
  connected: boolean
  running: boolean
  /** Timestamp when the current run started (0 when not running). */
  runningAt: number
  /** Timestamp of the last session/turn activity; drives the sleep timer. */
  idleAt: number
  phase: InputPhase
  promptError: boolean
  lastAgentError: string | null
  openState: string
  /** Timestamp when the last run stopped, and whether that stop carried an error. */
  stopAt: number
  stopError: boolean
  /**
   * Live assistant work, as bits: 1 = a tool call is running, 2 = reasoning is
   * streaming (the model is thinking), 4 = answer text is streaming.
   */
  live: number
  /** One-line preview of the last answer, shown under the companion after a turn. */
  report: string
  /** Full final answer text for the details panel (bounded by `MAX_DETAIL`). */
  detail: string
}

const INITIAL: CompanionFacts = {
  sessionId: undefined,
  connected: false,
  running: false,
  runningAt: 0,
  idleAt: Date.now(),
  phase: 'plain',
  promptError: false,
  lastAgentError: null,
  openState: 'cold',
  stopAt: 0,
  stopError: false,
  live: 0,
  report: '',
  detail: '',
}

/** Composer verbs the pet's message box needs; supplied by the composer slot. */
export interface ComposerActions {
  setDraft(text: string): void
  submit(): void
}

export type MessageSender = (text: string) => void

let facts: CompanionFacts = INITIAL
let sender: MessageSender | null = null
let senderReady = false
const listeners = new Set<() => void>()
const senderListeners = new Set<() => void>()

/** True when any published field actually changed. */
function changed(next: CompanionFacts, previous: CompanionFacts): boolean {
  for (const key of Object.keys(next) as (keyof CompanionFacts)[]) {
    if (!Object.is(next[key], previous[key])) return true
  }
  return false
}

/** Merge new facts and re-render every subscribed overlay, but only on a real change. */
export function publishFacts(patch: Partial<CompanionFacts>): void {
  const next = { ...facts, ...patch }
  if (!changed(next, facts)) return
  facts = next
  for (const listener of [...listeners]) listener()
}

/** Subscribe the overlay to the published facts. */
export function useCompanionFacts(): CompanionFacts {
  const [value, setValue] = useState(facts)
  useEffect(() => {
    const listener = () => setValue(facts)
    listeners.add(listener)
    listener()
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return value
}

/** Publish (or clear) the verb that sends a message through the pet. */
export function publishSender(next: MessageSender | null): void {
  sender = next
  const ready = next !== null
  if (ready === senderReady) return
  senderReady = ready
  for (const listener of [...senderListeners]) listener()
}

/** Whether the pet has a composer send verb right now (re-renders on presence only). */
export function useSenderReady(): boolean {
  const [ready, setReady] = useState(senderReady)
  useEffect(() => {
    const listener = () => setReady(senderReady)
    senderListeners.add(listener)
    listener()
    return () => {
      senderListeners.delete(listener)
    }
  }, [])
  return ready
}

/** Read the current pet-message verb outside React. */
export function readSender(): MessageSender | null {
  return sender
}

/** Chat hook shape the bridge needs; optional so the plugin still works without Chat. */
type UseChat = ((selector: (snapshot: unknown) => unknown, equal?: (a: unknown, b: unknown) => boolean) => unknown) | undefined

/**
 * Publish one run's facts and live state.
 *
 * The values are derived during render and published in an effect, so the
 * overlay receives them within the same frame as the Chat snapshot that caused
 * them (typically well under 100 ms after a token arrives).
 */
export function useFactsPublisher(props: {
  session: { sessionId: unknown; running: boolean; promptError: unknown; lastAgentError: string | null; openState: string }
  input: { phase: InputPhase; draft: string }
  pending: boolean
  useChat: UseChat
}): void {
  const { session, input, pending, useChat } = props
  const previous = useRef<CompanionFacts | null>(null)
  const activity = useRef({ draft: input.draft, pending })
  const live = useChat === undefined ? 0 : (useChat((snapshot) => liveBits(snapshot), (a, b) => a === b) as number)
  const report = useChat === undefined ? '' : (useChat((snapshot) => lastResponse(snapshot), (a, b) => a === b) as string)
  const assistant = useChat === undefined ? null : (useChat((snapshot) => lastAssistantNode(snapshot), (a, b) => a === b) as unknown)
  // Extracting the answer text is only redone when the settled assistant node changes.
  const answer = useRef<{ node: unknown; text: string }>({ node: undefined, text: '' })

  // Render stays pure: all transition bookkeeping happens while publishing.
  useEffect(() => {
    const timestamp = Date.now()
    const was = previous.current
    if (assistant !== answer.current.node) answer.current = { node: assistant, text: assistantText(assistant) }
    const settled = session.running ? { report: was?.report ?? '', detail: was?.detail ?? '' } : null
    const next: CompanionFacts = {
      sessionId: String(session.sessionId),
      connected: true,
      running: session.running,
      runningAt: session.running ? (was?.runningAt || timestamp) : 0,
      idleAt: was?.idleAt ?? timestamp,
      phase: input.phase,
      promptError: Boolean(session.promptError),
      lastAgentError: session.lastAgentError ?? null,
      openState: session.openState,
      stopAt: was?.stopAt ?? 0,
      stopError: was?.stopError ?? false,
      live,
      // While a turn runs the overlay has no use for the answer preview, and a
      // preview that streams would re-render it per token: hold the previous values
      // and publish the settled answer once the run stops.
      report: settled === null ? (report || cleanReport(answer.current.text)) : settled.report,
      detail: settled === null ? answer.current.text : settled.detail,
    }
    if (was === null) {
      next.idleAt = timestamp
    } else if (session.running !== was.running) {
      next.idleAt = timestamp
      if (session.running) {
        next.runningAt = timestamp
        next.stopAt = 0
        next.stopError = false
      } else {
        next.stopAt = timestamp
        next.stopError = Boolean(next.promptError || next.lastAgentError)
      }
    } else if (session.running && next.runningAt === 0) {
      next.runningAt = timestamp
    }
    // The user typing or a new interaction is activity too: it keeps the companion
    // awake without changing the scene (drafting is never an assistant state).
    // Throttle the wake to once per 5 s so ordinary typing does not publish a new
    // snapshot (and re-render the overlay) on every keystroke.
    const becameActive = activity.current.draft !== input.draft || activity.current.pending !== pending
    activity.current = { draft: input.draft, pending }
    if (becameActive && timestamp - (was?.idleAt ?? 0) > 5000) next.idleAt = timestamp
    previous.current = next
    publishFacts(next)
  })
}

/** Publish the pet's message verb for as long as the composer slot is mounted. */
export function useSenderPublisher(actions: ComposerActions | undefined, draft: string): void {
  useEffect(() => {
    if (actions === undefined) {
      publishSender(null)
      return undefined
    }
    const send: MessageSender = (text) => {
      const trimmed = text.trim()
      if (trimmed.length === 0) return
      const previous = draft
      try {
        actions.setDraft(trimmed)
        actions.submit()
      } catch {
        return
      }
      // Put the user's own draft back once the pet message has been queued.
      if (previous.trim().length > 0) {
        globalThis.setTimeout(() => {
          try {
            actions.setDraft(previous)
          } catch {
            // The composer may be in a locked admission phase; the draft stays lost.
          }
        }, 0)
      }
    }
    publishSender(send)
    return () => publishSender(null)
  }, [actions, draft])
}

/** Clear the connected flag and live state when the conversation unmounts. */
export function useDisconnectOnUnmount(): void {
  useEffect(
    () => () => {
      publishSender(null)
      publishFacts({
        connected: false,
        running: false,
        runningAt: 0,
        idleAt: Date.now(),
        phase: 'plain',
        live: 0,
        report: '',
        detail: '',
      })
    },
    [],
  )
}
