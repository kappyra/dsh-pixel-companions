/**
 * Client-local companion preferences, shared by the overlay surface and the
 * Settings → General row.
 *
 * One module-level store keeps both places in sync; writes are debounced and
 * flushed when the page goes away.
 */
import { useEffect, useState } from 'react'
import { clampScale } from './signals.ts'
import { LANGUAGES, languageFromTag, type Language } from './text.ts'
import type { Character } from './state.ts'

const STORE_KEY = 'kappy.pixel-companions.ui.v1'
const WRITE_DELAY_MS = 180

export interface Position {
  x: number
  y: number
}

export interface Preferences {
  character: Character
  enabled: boolean
  animation: boolean
  scale: number
  language: Language
  position: Position | null
  /** Mirror the companion into the optional desktop window. */
  desktop: boolean
}

/** Read and sanitize the persisted preferences. */
function load(): Preferences {
  const defaults: Preferences = {
    character: 'girl',
    enabled: true,
    animation: true,
    scale: 1,
    language: languageFromTag(globalThis.navigator?.language),
    position: null,
    desktop: false,
  }
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null') as Partial<Preferences> | null
    if (!parsed || typeof parsed !== 'object') return defaults
    const stored = parsed.position
    const position =
      stored !== null && typeof stored === 'object' && Number.isFinite(stored.x) && Number.isFinite(stored.y)
        ? { x: stored.x, y: stored.y }
        : null
    return {
      character: parsed.character === 'whale' ? 'whale' : 'girl',
      enabled: parsed.enabled !== false,
      animation: parsed.animation !== false,
      scale: typeof parsed.scale === 'number' ? clampScale(parsed.scale) : 1,
      language: LANGUAGES.some((language) => language.id === parsed.language) ? (parsed.language as Language) : defaults.language,
      position,
      desktop: parsed.desktop === true,
    }
  } catch {
    return defaults
  }
}

let current: Preferences = load()
let writeTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
/** Shared hand-off between module generations (HMR) so a pagehide write never serializes a stale copy. */
const shared = globalThis as unknown as { __pxcPrefs?: Preferences; __pxcPrefsFlushBound?: boolean }
shared.__pxcPrefs = current

/** Write the current preferences immediately. */
function write(): void {
  if (writeTimer !== undefined) {
    clearTimeout(writeTimer)
    writeTimer = undefined
  }
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(shared.__pxcPrefs ?? current))
  } catch {
    // Storage can be unavailable (private mode, quota); the session keeps the value.
  }
}

/** Coalesce slider drags into one write. */
function scheduleWrite(): void {
  if (typeof setTimeout !== 'function') return
  if (writeTimer !== undefined) clearTimeout(writeTimer)
  writeTimer = setTimeout(write, WRITE_DELAY_MS)
}

if (typeof window !== 'undefined' && shared.__pxcPrefsFlushBound !== true) {
  shared.__pxcPrefsFlushBound = true
  window.addEventListener('pagehide', write)
}

/** Read the current preferences outside React. */
export function getPrefs(): Preferences {
  return current
}

/** Apply a patch only when at least one field really changes. */
function apply(patch: Partial<Preferences>): void {
  let changed = false
  for (const key of Object.keys(patch) as (keyof Preferences)[]) {
    if (!Object.is(patch[key], current[key])) {
      changed = true
      break
    }
  }
  if (!changed) return
  current = { ...current, ...patch }
  shared.__pxcPrefs = current
  for (const listener of [...listeners]) listener()
  scheduleWrite()
}

let pendingFrame: number | undefined
let pendingPatch: Partial<Preferences> | null = null

/** Drop a queued slider frame so a direct change wins immediately. */
function cancelPending(): void {
  if (pendingFrame !== undefined) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pendingFrame)
    pendingFrame = undefined
  }
  pendingPatch = null
}

/** Merge a patch immediately, notify every mounted surface, and persist shortly after. */
export function updatePrefs(patch: Partial<Preferences>): void {
  cancelPending()
  apply(patch)
}

/**
 * Coalesce high-frequency patches (a slider drag) to at most one update per
 * animation frame, so one drag step never renders more than once.
 */
export function updatePrefsSoon(patch: Partial<Preferences>): void {
  pendingPatch = { ...pendingPatch, ...patch }
  if (pendingFrame !== undefined) return
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? (callback: () => void) => requestAnimationFrame(callback)
      : (callback: () => void) => Number(setTimeout(callback, 16))
  pendingFrame = schedule(() => {
    pendingFrame = undefined
    const next = pendingPatch
    pendingPatch = null
    if (next !== null) apply(next)
  })
}

/** Subscribe a surface to the shared preferences. */
export function usePrefs(): Preferences {
  const [value, setValue] = useState(current)
  useEffect(() => {
    const listener = () => setValue(current)
    listeners.add(listener)
    listener()
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return value
}
