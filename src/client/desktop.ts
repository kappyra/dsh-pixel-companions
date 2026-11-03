/**
 * Local bridge to the optional desktop companion window.
 *
 * The desktop window (`desktop/companion.py`) is a separate process, so it gets
 * the live scene from this page: it listens on 127.0.0.1 and this module pushes a
 * tiny JSON state when the scene or look changes, with a heartbeat while the
 * window is up. No prompt, draft text, message, session id or file path is ever
 * sent — only the scene id, the character id, the scale and the animation flag.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Character, Scene } from './state.ts'

/** Default port of the local desktop companion. Keep in sync with desktop/companion.py. */
export const DESKTOP_ENDPOINT = 'http://127.0.0.1:37421'
/** How often the page checks whether the desktop window is running. */
const PROBE_MS = 10_000
/** Heartbeat so the window can tell a closed page from an idle one. */
const BEAT_MS = 4_000

/** Reachability of the desktop window from this page. */
export type DesktopStatus = 'unknown' | 'connected' | 'absent'

export interface DesktopState {
  scene: Scene
  character: Character
  scale: number
  animation: boolean
}

/**
 * Keep the optional desktop window fed with the current scene.
 * @param enabled - user preference for mirroring to the desktop window.
 * @param state - what to show: scene, character, scale, animation.
 * @returns whether a desktop window answered the last probe.
 */
export function useDesktopBridge(enabled: boolean, state: DesktopState): DesktopStatus {
  const [status, setStatus] = useState<DesktopStatus>('unknown')
  const { scene, character, scale, animation } = state
  // The probe loop must not restart on every scene change: keep the payload in a
  // ref and expose one stable sender.
  const stateRef = useRef(state)
  stateRef.current = state

  const push = useCallback(async (): Promise<boolean> => {
    if (typeof fetch !== 'function') return false
    const current = stateRef.current
    const body = JSON.stringify({ v: 1, scene: current.scene, character: current.character, scale: current.scale, animation: current.animation, updatedAt: Date.now() })
    try {
      const response = await fetch(DESKTOP_ENDPOINT + '/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        cache: 'no-store',
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  // Probe the window and send a heartbeat while it answers.
  useEffect(() => {
    if (!enabled || typeof fetch !== 'function') {
      setStatus('absent')
      return undefined
    }
    let cancelled = false
    let alive = false
    const visible = () => document.visibilityState !== 'hidden'
    const probe = () => {
      if (!visible()) return
      fetch(DESKTOP_ENDPOINT + '/health', { cache: 'no-store' })
        .then((response) => {
          alive = response.ok
          if (!cancelled) setStatus(response.ok ? 'connected' : 'absent')
        })
        .catch(() => {
          alive = false
          if (!cancelled) setStatus('absent')
        })
    }
    const beat = () => {
      if (!alive || !visible()) return
      void push().then((ok) => {
        if (ok) return
        alive = false
        if (!cancelled) setStatus('absent')
      })
    }
    probe()
    const probeTimer = setInterval(probe, PROBE_MS)
    const beatTimer = setInterval(beat, BEAT_MS)
    const onVisibility = () => {
      if (visible()) probe()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearInterval(probeTimer)
      clearInterval(beatTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, push])

  // Push immediately when the scene or the look changes.
  useEffect(() => {
    if (!enabled || status !== 'connected') return undefined
    const timer = setTimeout(() => {
      void push().then((ok) => {
        if (!ok) setStatus('absent')
      })
    }, 140)
    return () => clearTimeout(timer)
  }, [enabled, status, push, scene, character, scale, animation])

  return status
}
