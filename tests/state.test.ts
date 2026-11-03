import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveScene, type ObservedStatus } from '../src/client/state.ts'

const base: ObservedStatus = {
  running: false,
  inputPhase: 'plain',
  pendingInteraction: false,
  error: false,
  openError: false,
  assistantStream: null,
  toolRunning: false,
  runningMs: 0,
  idleMs: 0,
  flash: null,
}
function s(patch: Partial<ObservedStatus>) { return deriveScene({ ...base, ...patch }) }

test('idle until long inactivity', () => {
  assert.equal(s({}), 'idle')
  assert.equal(s({ idleMs: 120000 }), 'sleeping')
})

test('pending user approval supersedes running state', () => {
  assert.equal(s({ running: true, pendingInteraction: true }), 'waiting')
  assert.equal(s({ running: true, toolRunning: true, pendingInteraction: true }), 'waiting')
})

test('composer submission is a brief typing state, drafting is not', () => {
  assert.equal(s({ inputPhase: 'sending' }), 'typing')
  assert.equal(s({ inputPhase: 'submitting' }), 'typing')
  assert.equal(s({ inputPhase: 'adjudicating' }), 'typing')
  // The user typing a draft has no signal in ObservedStatus: it must stay idle.
  assert.equal(s({}), 'idle')
})

test('thinking follows the assistant reasoning stream, not the user', () => {
  assert.equal(s({ running: true, assistantStream: 'reasoning' }), 'thinking')
  assert.equal(s({ running: true, assistantStream: 'answer' }), 'typing')
  assert.equal(s({ running: true, assistantStream: null }), 'thinking')  // request in flight
})

test('a running tool call shows working and wins over the stream', () => {
  assert.equal(s({ running: true, toolRunning: true }), 'working')
  assert.equal(s({ running: true, toolRunning: true, assistantStream: 'answer' }), 'working')
})

test('long runs only fall back to tired/coffee without a live signal', () => {
  assert.equal(s({ running: true, runningMs: 90000 }), 'tired')
  assert.equal(s({ running: true, runningMs: 200000 }), 'coffee')
  assert.equal(s({ running: true, runningMs: 200000, assistantStream: 'reasoning' }), 'thinking')
  assert.equal(s({ running: true, runningMs: 200000, toolRunning: true }), 'working')
})

test('error and flash priority', () => {
  assert.equal(s({ flash: 'success' }), 'success')
  assert.equal(s({ error: true, flash: 'success' }), 'error')
  assert.equal(s({ openError: true }), 'error')
  assert.equal(s({ running: true, assistantStream: 'reasoning', flash: 'success' }), 'thinking')
})

test('finished turn keeps the success flash until it expires', () => {
  assert.equal(s({ running: false, flash: 'success' }), 'success')
  assert.equal(s({ running: false, flash: 'error' }), 'error')
})
