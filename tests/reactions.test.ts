import test from 'node:test'
import assert from 'node:assert/strict'
import { COMPANION_ASSETS } from '../src/client/assets.generated.ts'
import {
  REACTION_IDS,
  doubleReaction,
  isPersistentReaction,
  persistentReaction,
  singleReaction,
  type ReactionContext,
} from '../src/client/reactions.ts'
import type { Scene } from '../src/client/state.ts'

const context = (overrides: Partial<ReactionContext> = {}): ReactionContext => ({
  scene: 'idle',
  error: false,
  overwork: false,
  comforted: false,
  ...overrides,
})

test('every reaction ships an animated WebP and a PNG fallback for both characters', () => {
  assert.equal(REACTION_IDS.length, 18)
  for (const character of ['girl', 'whale'] as const) {
    for (const reaction of REACTION_IDS) {
      const assets = COMPANION_ASSETS[character][reaction]
      assert.ok(assets, `${character}/${reaction} is missing`)
      assert.match(assets.webp, new RegExp(`/assets/${character}/${reaction}\\.webp\\?v=[0-9a-f]{8}$`))
      assert.match(assets.png, new RegExp(`/assets/${character}/${reaction}\\.png\\?v=[0-9a-f]{8}$`))
    }
  }
})

test('the 15 base scenes and roaming stay available', () => {
  for (const character of ['girl', 'whale'] as const) {
    for (const scene of ['idle', 'typing', 'thinking', 'planning', 'reading', 'searching', 'working',
      'success', 'waiting', 'error', 'tired', 'coffee', 'sleeping', 'debugging', 'offline']) {
      assert.ok(COMPANION_ASSETS[character][scene] !== undefined, `${character}/${scene}`)
    }
  }
  assert.ok(COMPANION_ASSETS.whale.roaming !== undefined)
  assert.equal(COMPANION_ASSETS.girl.roaming, undefined)
})

test('error state: crying, comfort, then lingering tears while the error persists', () => {
  const crying = context({ scene: 'error', error: true })
  assert.equal(persistentReaction(crying), 'error_cry')
  assert.equal(singleReaction(crying), 'error_consoled')
  assert.equal(doubleReaction(crying), 'error_sniffle')
  const comforted = context({ scene: 'error', error: true, comforted: true })
  assert.equal(persistentReaction(comforted), 'error_sniffle')
})

test('overwork: exhausted while running, cry on single click, angry on double', () => {
  const overwork = context({ scene: 'coffee', overwork: true })
  assert.equal(persistentReaction(overwork), 'overwork_exhausted')
  assert.equal(singleReaction(overwork), 'overwork_cry')
  assert.equal(doubleReaction(overwork), 'work_angry')
})

test('single-click reactions follow the interaction map', () => {
  const expected: Partial<Record<Scene, string>> = {
    idle: 'idle_petted',
    thinking: 'thinking_startled',
    waiting: 'waiting_pleading',
    success: 'success_cheered',
    coffee: 'coffee_delighted',
    offline: 'offline_worried',
    sleeping: 'sleep_bothered',
  }
  for (const [scene, reaction] of Object.entries(expected)) {
    assert.equal(singleReaction(context({ scene: scene as Scene })), reaction, scene)
  }
  for (const scene of ['typing', 'working', 'reading', 'debugging', 'planning', 'searching', 'tired'] as Scene[]) {
    assert.equal(singleReaction(context({ scene })), null, scene)
  }
})

test('double-click reactions follow the interaction map', () => {
  const expected: Partial<Record<Scene, string>> = {
    idle: 'idle_shy',
    sleeping: 'sleep_angry',
    working: 'work_angry',
    typing: 'typing_annoyed',
    debugging: 'debugging_frustrated',
    reading: 'reading_disturbed',
  }
  for (const [scene, reaction] of Object.entries(expected)) {
    assert.equal(doubleReaction(context({ scene: scene as Scene })), reaction, scene)
  }
  for (const scene of ['thinking', 'waiting', 'success', 'coffee', 'offline', 'planning', 'searching', 'tired'] as Scene[]) {
    assert.equal(doubleReaction(context({ scene })), null, scene)
  }
})

test('only error and overwork reactions persist', () => {
  const persistent = new Set(['error_cry', 'error_sniffle', 'overwork_exhausted'])
  for (const reaction of REACTION_IDS) {
    assert.equal(isPersistentReaction(reaction), persistent.has(reaction), reaction)
  }
})
