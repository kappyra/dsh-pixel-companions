import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_ANSWER, LIVE_REASONING, LIVE_TOOL, MAX_DETAIL, MAX_SCALE, MIN_SCALE, assistantText, clampScale, cleanReport, lastAssistantNode, lastResponse, liveBits, streamOf } from '../src/client/signals.ts'

function snapshot(payload: unknown[]) {
  return { legacy: { partial: { blocks: payload }, runningCalls: [] }, navigation: { items: () => [] } }
}

test('live bits: idle, reasoning, answer and tool', () => {
  assert.equal(liveBits(snapshot([])), 0)
  assert.equal(liveBits({}), 0)
  assert.equal(streamOf(liveBits(snapshot([{ kind: 'reasoning', text: 'hmm' }]))), 'reasoning')
  assert.equal(streamOf(liveBits(snapshot([{ kind: 'text', text: 'hello' }]))), 'answer')
  assert.equal(liveBits({ legacy: { partial: null, runningCalls: [{ name: 'bash' }] } }), LIVE_TOOL)
})

test('answer text wins over the reasoning block of the same step', () => {
  const bits = liveBits(snapshot([{ kind: 'reasoning', text: 'plan' }, { kind: 'text', text: 'writing' }]))
  assert.equal(bits & LIVE_ANSWER, LIVE_ANSWER)
  assert.equal(bits & LIVE_REASONING, 0)
  assert.equal(streamOf(bits), 'answer')
})

test('empty and non-text blocks do not count', () => {
  assert.equal(liveBits(snapshot([{ kind: 'reasoning', text: '' }, { kind: 'tool-call', text: 'x' }])), 0)
})

test('cleanReport keeps one plain line and clips long answers', () => {
  assert.equal(cleanReport('**Done.**\nsecond line'), 'Done.')
  assert.equal(cleanReport('\n\n  `code` and _em_  \n'), 'code and em')
  const long = 'x'.repeat(300)
  const clipped = cleanReport(long)
  assert.equal(clipped.length, 120)
  assert.ok(clipped.endsWith('…'))
  assert.equal(cleanReport(''), '')
})

test('lastResponse reads the newest loaded turn preview', () => {
  assert.equal(lastResponse({ navigation: { items: () => [] } }), '')
  assert.equal(lastResponse({}), '')
  const snapshot = { navigation: { items: () => [{ response: 'first' }, { response: '# Final answer' }] } }
  assert.equal(lastResponse(snapshot), 'Final answer')
})

test('lastAssistantNode finds the newest assistant node', () => {
  assert.equal(lastAssistantNode({}), null)
  assert.equal(lastAssistantNode({ legacy: { nodes: [] } }), null)
  const first = { kind: 'user', blocks: [] }
  const answer = { kind: 'assistant', blocks: [{ kind: 'text', text: 'hi' }] }
  const snapshot = { legacy: { nodes: [first, answer, { kind: 'tool', blocks: [] }] } }
  assert.equal(lastAssistantNode(snapshot), answer)
})

test('assistantText joins text blocks, skips reasoning, and caps at MAX_DETAIL', () => {
  assert.equal(assistantText(null), '')
  assert.equal(assistantText({ blocks: [] }), '')
  const node = { blocks: [{ kind: 'reasoning', text: 'plan' }, { kind: 'text', text: 'Hello' }, { kind: 'text', text: ' world ' }] }
  assert.equal(assistantText(node), 'Hello\n\nworld')
  const huge = { blocks: [{ kind: 'text', text: 'a'.repeat(MAX_DETAIL + 100) }] }
  const capped = assistantText(huge)
  assert.equal(capped.length, MAX_DETAIL + 1)
  assert.ok(capped.endsWith('…'))
})

test('clampScale keeps the companion between 50% and 200% with 1% precision', () => {
  assert.equal(MIN_SCALE, 0.5)
  assert.equal(MAX_SCALE, 2)
  assert.equal(clampScale(0.1), 0.5)
  assert.equal(clampScale(0.83), 0.83)
  assert.equal(clampScale(2.5), 2)
  assert.equal(clampScale(1.234), 1.23)
  assert.equal(clampScale(Number.NaN), 1)
  assert.equal(clampScale(Number.POSITIVE_INFINITY), 1)
})
