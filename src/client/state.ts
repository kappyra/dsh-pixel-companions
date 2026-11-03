/** Presentation-only statuses derived from observed DSH UI facts. */
export const SCENES = [
  'idle', 'typing', 'thinking', 'planning', 'reading', 'searching',
  'working', 'success', 'waiting', 'error', 'tired', 'coffee',
  'sleeping', 'debugging', 'offline',
] as const
export type Scene = (typeof SCENES)[number]
export type Character = 'girl' | 'whale'
/** What the assistant is streaming right now: hidden reasoning, visible answer text, or nothing. */
export type AssistantStream = 'reasoning' | 'answer' | null

export interface ObservedStatus {
  /** A turn is running on the Host. */
  running: boolean
  /** Composer submit plane; only the submission phases are used. */
  inputPhase: 'plain' | 'adjudicating' | 'claimed' | 'submitting' | 'sending'
  /** An approval or question waits for the user. */
  pendingInteraction: boolean
  /** A send or agent error was observed. */
  error: boolean
  /** The session history failed to open. */
  openError: boolean
  /** Live assistant stream: reasoning (the model is thinking) or answer text. */
  assistantStream: AssistantStream
  /** A tool call is executing right now. */
  toolRunning: boolean
  runningMs: number
  idleMs: number
  flash: 'success' | 'error' | null
}

/**
 * Map observed client facts to one scene.
 *
 * `assistantStream` and `toolRunning` describe the model's own work, so the
 * companion shows `thinking` only while the assistant streams reasoning — never
 * because the user is typing in the composer. Everything else is a coarse
 * fallback for the moments when no live signal is published.
 */
export function deriveScene(s: ObservedStatus): Scene {
  if (s.openError) return 'error'
  if (s.pendingInteraction) return 'waiting'
  if (s.inputPhase === 'sending' || s.inputPhase === 'submitting' || s.inputPhase === 'adjudicating') return 'typing'
  if (s.toolRunning) return 'working'
  if (s.assistantStream === 'reasoning') return 'thinking'
  if (s.assistantStream === 'answer') return 'typing'
  if (s.running) {
    if (s.runningMs > 180_000) return 'coffee'
    if (s.runningMs > 75_000) return 'tired'
    // A running turn without a live stream is a model request in flight.
    return 'thinking'
  }
  if (s.flash === 'error' || s.error) return 'error'
  if (s.flash === 'success') return 'success'
  if (s.idleMs > 110_000) return 'sleeping'
  return 'idle'
}
