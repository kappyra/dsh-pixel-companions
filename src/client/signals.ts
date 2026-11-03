/**
 * Pure projections over Chat snapshots and answer previews.
 *
 * Kept free of React so they can be unit-tested in Node without a DOM.
 */
import type { AssistantStream } from './state.ts'

/** Bits describing live assistant work: 1 tool running, 2 reasoning, 4 answer text. */
export const LIVE_TOOL = 1
export const LIVE_REASONING = 2
export const LIVE_ANSWER = 4

/** Read the live-work bitfield from a Chat snapshot. */
export function liveBits(snapshot: unknown): number {
  const legacy = (snapshot as { legacy?: { runningCalls?: readonly unknown[]; partial?: { blocks?: readonly unknown[] } | null } })?.legacy
  let bits = Array.isArray(legacy?.runningCalls) && legacy.runningCalls.length > 0 ? LIVE_TOOL : 0
  const blocks = legacy?.partial?.blocks
  if (Array.isArray(blocks)) {
    let reasoning = false
    let answer = false
    for (const block of blocks) {
      const entry = block as { kind?: string; text?: string }
      if (typeof entry.text !== 'string' || entry.text.length === 0) continue
      if (entry.kind === 'reasoning') reasoning = true
      if (entry.kind === 'text') answer = true
    }
    // Once visible answer text streams, the model is writing, not thinking:
    // the reasoning block of the same step stays in `partial.blocks`.
    if (answer) bits |= LIVE_ANSWER
    else if (reasoning) bits |= LIVE_REASONING
  }
  return bits
}

/** The assistant stream category implied by the live bits. */
export function streamOf(bits: number): AssistantStream {
  if ((bits & LIVE_ANSWER) !== 0) return 'answer'
  if ((bits & LIVE_REASONING) !== 0) return 'reasoning'
  return null
}

/** Collapse a bounded answer preview into one clean line for the report pill. */
export function cleanReport(raw: string): string {
  const firstLine = raw
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? ''
  const plain = firstLine
    .replace(/`{1,3}/g, '')
    .replace(/[*_#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 120 ? plain.slice(0, 119).trimEnd() + '…' : plain
}

/** Preview of the newest loaded turn's answer. */
export function lastResponse(snapshot: unknown): string {
  const navigation = (snapshot as { navigation?: { items?: () => readonly unknown[] } })?.navigation
  const items = typeof navigation?.items === 'function' ? navigation.items() : []
  const last = Array.isArray(items) && items.length > 0 ? (items[items.length - 1] as { response?: string }) : undefined
  return cleanReport(typeof last?.response === 'string' ? last.response : '')
}

/** Longest full answer kept in memory for the details panel. */
export const MAX_DETAIL = 8000

/** Final assistant node of the loaded transcript, identity-stable for equality checks. */
export function lastAssistantNode(snapshot: unknown): unknown | null {
  const nodes = (snapshot as { legacy?: { nodes?: readonly unknown[] } })?.legacy?.nodes
  if (!Array.isArray(nodes)) return null
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index] as { kind?: string } | null
    if (node?.kind === 'assistant') return node
  }
  return null
}

/** Plain text of an assistant node, joining its text blocks; bounded for safety. */
export function assistantText(node: unknown): string {
  const blocks = (node as { blocks?: readonly unknown[] } | null)?.blocks
  if (!Array.isArray(blocks)) return ''
  const parts: string[] = []
  for (const block of blocks) {
    const entry = block as { kind?: string; text?: string }
    if (entry.kind !== 'text' || typeof entry.text !== 'string') continue
    const text = entry.text.trim()
    if (text.length > 0) parts.push(text)
  }
  const text = parts.join('\n\n').trim()
  return text.length > MAX_DETAIL ? text.slice(0, MAX_DETAIL).trimEnd() + '…' : text
}

/** Allowed companion scale range, shared by the settings slider and persistence. */
export const MIN_SCALE = 0.5
export const MAX_SCALE = 2
/** Slider step, in scale units (5%). */
export const SCALE_STEP = 0.05
/** One-click size presets, in percent. */
export const SIZE_PRESETS = [50, 100, 150, 200]

/** Clamp a user-chosen scale to the supported range with 1% precision. */
export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100))
}
