import assert from 'node:assert/strict'
import test from 'node:test'
import { matchImportedTurnTiming } from '../lib/turn-timing.js'

const round = (turn, text, id, duration = 6) => [
  { type: 'turn/start', time: 100, data: { turn } },
  { type: 'user/message', time: 101, data: { id, source: { kind: 'user' }, content: [{ type: 'text', text }] } },
  { type: 'turn/end', time: 100 + duration, data: { turn, reason: { kind: 'completed' } } },
]

test('replaces only synthetic durations, with no guess when matching is ambiguous', () => {
  const turns = matchImportedTurnTiming([
    ...round(1, 'first prompt', 'msg-u1'),
    ...round(2, 'repeated prompt', 'msg-u3'),
    ...round(3, 'native continuation', 'native-3'),
    ...round(4, 'already timed', 'msg-u8', 12000),
  ], [
    { text: 'first prompt', durationMs: 87322 },
    { text: 'repeated prompt', durationMs: 1200 },
    { text: 'repeated prompt', durationMs: 4567 },
    { text: 'native continuation', durationMs: 1700 },
  ])
  assert.deepEqual(turns, { 1: 87322, 2: null })
})
