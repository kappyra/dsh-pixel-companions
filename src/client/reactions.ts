/**
 * Interactive reactions layered over the normal scene machine.
 *
 * A reaction is cosmetic and transient: it never changes the session facts, the
 * error signalling, or the sticky completion report. The base scene keeps
 * driving everything else, and the overlay returns to it when the reaction ends.
 */
import type { Scene } from './state.ts'

/** Every reaction animation shipped by the v4 pack, one pair per character. */
export const REACTION_IDS = [
  'error_cry',
  'error_consoled',
  'error_sniffle',
  'overwork_exhausted',
  'overwork_cry',
  'work_angry',
  'sleep_bothered',
  'sleep_angry',
  'typing_annoyed',
  'debugging_frustrated',
  'idle_petted',
  'idle_shy',
  'thinking_startled',
  'waiting_pleading',
  'success_cheered',
  'coffee_delighted',
  'reading_disturbed',
  'offline_worried',
] as const

export type ReactionId = (typeof REACTION_IDS)[number]

/** The v4 pack renders a 2640 ms loop for every reaction. */
export const REACTION_MS = 2640
/** A second left-click within this window is a double-click, not another single. */
export const DOUBLE_CLICK_MS = 240
/** Ignore rapid repeats so a reaction cannot restart itself in a loop. */
export const REACTION_COOLDOWN_MS = 160
/** Continuous agent work that counts as overwork (10 minutes). */
export const OVERWORK_MS = 600_000

export interface ReactionContext {
  /** The scene the companion is currently showing (manual preview included). */
  scene: Scene
  /** The base scene is the error state. */
  error: boolean
  /** The real agent has been running for at least ten minutes. */
  overwork: boolean
  /** The user already comforted this error. */
  comforted: boolean
}

/**
 * The reaction that stays on screen while its base condition persists, or null
 * when the base scene's own animation should be shown.
 */
export function persistentReaction(context: ReactionContext): ReactionId | null {
  if (context.error) return context.comforted ? 'error_sniffle' : 'error_cry'
  if (context.overwork) return 'overwork_exhausted'
  return null
}

/** One left-click: a gentle, context-aware reaction (null means no change). */
export function singleReaction(context: ReactionContext): ReactionId | null {
  if (context.error) return 'error_consoled'
  if (context.overwork) return 'overwork_cry'
  switch (context.scene) {
    case 'idle':
      return 'idle_petted'
    case 'thinking':
      return 'thinking_startled'
    case 'waiting':
      return 'waiting_pleading'
    case 'success':
      return 'success_cheered'
    case 'coffee':
      return 'coffee_delighted'
    case 'offline':
      return 'offline_worried'
    case 'sleeping':
      return 'sleep_bothered'
    default:
      return null
  }
}

/** Double left-click: the stronger, "interrupted" reaction (null means no change). */
export function doubleReaction(context: ReactionContext): ReactionId | null {
  if (context.error) return 'error_sniffle'
  if (context.overwork) return 'work_angry'
  switch (context.scene) {
    case 'sleeping':
      return 'sleep_angry'
    case 'working':
      return 'work_angry'
    case 'typing':
      return 'typing_annoyed'
    case 'debugging':
      return 'debugging_frustrated'
    case 'reading':
      return 'reading_disturbed'
    case 'idle':
      return 'idle_shy'
    default:
      return null
  }
}

/** Whether a reaction is held until its base condition changes instead of timing out. */
export function isPersistentReaction(id: ReactionId): boolean {
  return id === 'error_cry' || id === 'error_sniffle' || id === 'overwork_exhausted'
}
