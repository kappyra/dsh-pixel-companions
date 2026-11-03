/** Browser extension: a draggable companion over the Web GUI, never touching the input or prompt. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { Companion, CompanionBridge } from './Pet.tsx'
import { SizeSettingsRow } from './SizeSettingsRow.tsx'

export const inject = ['slots']

export function apply(ctx: Context): void {
  // Hidden composer-slot entry: publishes the per-session facts the overlay cannot read.
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'kappy-pixel-companions.bridge',
    order: 80,
  }, CompanionBridge))

  // Frame-wide floating layer: the companion can be dragged anywhere on the page.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'kappy-pixel-companions',
    order: 50,
  }, Companion))

  // Settings → General: the same size control where users look for preferences.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'pixel-companions-size',
    order: 40,
  }, SizeSettingsRow))
}
